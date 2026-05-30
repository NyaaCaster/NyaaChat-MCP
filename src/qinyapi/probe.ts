import { knownMeta } from './modelsMeta.js';

const PROBE_TIMEOUT_MS = 20000;

// 32x32 solid-red PNG, inline data URL — payload for the vision probe.
// A 1x1 image is rejected as "invalid" by some backends (e.g. Gemini), so use a real size.
const RED_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nGN4K6NCU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULABwYtD3YZdM+AAAAAElFTkSuQmCC';

interface ChatResult {
  status: number;
  ok: boolean;
  json: any;
  text: string;
}

async function chat(
  baseUrl: string,
  key: string,
  body: Record<string, unknown>,
): Promise<ChatResult> {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON body (e.g. gateway error page)
  }
  return { status: res.status, ok: res.ok, json, text };
}

function firstMessage(json: any): { content: string; toolCalls: unknown[] } {
  const msg = json?.choices?.[0]?.message ?? {};
  const content = typeof msg.content === 'string' ? msg.content : '';
  const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
  return { content, toolCalls };
}

export interface Connectivity {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export async function probeConnectivity(
  baseUrl: string,
  key: string,
  model: string,
): Promise<Connectivity> {
  const start = Date.now();
  try {
    const r = await chat(baseUrl, key, {
      model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 8,
      stream: false,
    });
    const latencyMs = Date.now() - start;
    if (r.ok && r.json?.choices?.length) {
      return { ok: true, latencyMs };
    }
    const detail =
      r.json?.error?.message ??
      r.json?.message ??
      r.text.slice(0, 160) ??
      '';
    return { ok: false, latencyMs, error: `HTTP ${r.status}${detail ? `: ${detail}` : ''}` };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeVision(baseUrl: string, key: string, model: string): Promise<boolean> {
  try {
    const r = await chat(baseUrl, key, {
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: '这张图主要是什么颜色？只回答颜色名称。' },
            { type: 'image_url', image_url: { url: RED_PNG } },
          ],
        },
      ],
      max_tokens: 64,
      stream: false,
    });
    // Non-vision backends reject image content with a 4xx ("image is not valid" /
    // "does not support image"). If the request was accepted (HTTP ok), confirm the
    // image was actually processed via token usage: either image_tokens > 0, or the
    // prompt token count exceeds the text-only token count (the image added tokens).
    // "Thinking" models may spend the whole output budget on reasoning and return
    // empty content, so we cannot rely on the reply text alone.
    if (!r.ok) return false;
    const usage = r.json?.usage ?? {};
    const details = usage.prompt_tokens_details ?? {};
    const imageTokens = details.image_tokens;
    if (typeof imageTokens === 'number' && imageTokens > 0) return true;
    const promptTokens = usage.prompt_tokens;
    const textTokens = details.text_tokens;
    if (
      typeof promptTokens === 'number' &&
      typeof textTokens === 'number' &&
      textTokens > 0 &&
      promptTokens - textTokens >= 30
    ) {
      return true;
    }
    const { content } = firstMessage(r.json);
    if (!content.trim()) return false;
    return !/不支持|无法.*图|cannot.*image|not.*support.*image|do(es)? not support/i.test(
      content,
    );
  } catch {
    return false;
  }
}

async function probeTool(baseUrl: string, key: string, model: string): Promise<boolean> {
  try {
    const r = await chat(baseUrl, key, {
      model,
      messages: [{ role: 'user', content: 'What is the weather in Beijing right now?' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get current weather for a city',
            parameters: {
              type: 'object',
              properties: { location: { type: 'string', description: 'City name' } },
              required: ['location'],
            },
          },
        },
      ],
      tool_choice: 'auto',
      // Generous budget: "thinking" models otherwise exhaust tokens before emitting the call.
      max_tokens: 1024,
      stream: false,
    });
    if (!r.ok) return false;
    return firstMessage(r.json).toolCalls.length > 0;
  } catch {
    return false;
  }
}

async function probeFormat(baseUrl: string, key: string, model: string): Promise<boolean> {
  const prompt = '只输出一个 JSON 对象：{"ok": true}，不要任何额外文字或代码块标记。';
  const parseable = (content: string): boolean => {
    const trimmed = content.trim().replace(/^```(?:json)?|```$/g, '').trim();
    try {
      const v = JSON.parse(trimmed);
      return typeof v === 'object' && v !== null;
    } catch {
      return false;
    }
  };
  try {
    const r = await chat(baseUrl, key, {
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 256,
      stream: false,
    });
    if (r.ok && parseable(firstMessage(r.json).content)) return true;
  } catch {
    // fall through to plain-prompt retry
  }
  try {
    const r = await chat(baseUrl, key, {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 256,
      stream: false,
    });
    if (!r.ok) return false;
    return parseable(firstMessage(r.json).content);
  } catch {
    return false;
  }
}

// 上下文 / 最大输出长度来源说明：
// 实测本网关的 GET /v1/models 只返回 id / owned_by / supported_endpoint_types，
// 不含 context_length / max_output_tokens 等尺寸字段，发请求拿不到任何尺寸信息。
// 为「最低成本」，这里不再发那次无效的网络请求，直接查内置静态表 knownMeta（零开销）。
// 该结果会随能力一起入库缓存，后续命中缓存的模型不会重复计算。
function contextOutput(model: string): { contextK: number | null; maxOutputK: number | null } {
  const fb = knownMeta(model);
  return { contextK: fb?.contextK ?? null, maxOutputK: fb?.maxOutputK ?? null };
}

export interface Capabilities {
  vision: boolean;
  tool: boolean;
  format: boolean;
  contextK: number | null;
  maxOutputK: number | null;
}

export async function probeCapabilities(
  baseUrl: string,
  key: string,
  model: string,
): Promise<Capabilities> {
  const [vision, tool, format] = await Promise.all([
    probeVision(baseUrl, key, model),
    probeTool(baseUrl, key, model),
    probeFormat(baseUrl, key, model),
  ]);
  const { contextK, maxOutputK } = contextOutput(model);
  return { vision, tool, format, contextK, maxOutputK };
}
