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

function modelsUrl(baseUrl: string): string {
  return baseUrl.replace(/\/chat\/completions\/?$/, '/models');
}

async function probeContextOutput(
  baseUrl: string,
  key: string,
  model: string,
): Promise<{ contextK: number | null; maxOutputK: number | null }> {
  try {
    const res = await fetch(modelsUrl(baseUrl), {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (res.ok) {
      const json: any = await res.json();
      const list: any[] = Array.isArray(json?.data) ? json.data : [];
      const hit = list.find((m) => m?.id === model);
      if (hit) {
        const ctx =
          hit.context_length ?? hit.context_window ?? hit.max_context_tokens ?? null;
        const out = hit.max_output_tokens ?? hit.max_tokens ?? null;
        const contextK = typeof ctx === 'number' ? Math.round(ctx / 1000) : null;
        const maxOutputK = typeof out === 'number' ? Math.round(out / 1000) : null;
        if (contextK || maxOutputK) {
          const fb = knownMeta(model);
          return {
            contextK: contextK ?? fb?.contextK ?? null,
            maxOutputK: maxOutputK ?? fb?.maxOutputK ?? null,
          };
        }
      }
    }
  } catch {
    // fall through to known-model table
  }
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
  const [vision, tool, format, ctxOut] = await Promise.all([
    probeVision(baseUrl, key, model),
    probeTool(baseUrl, key, model),
    probeFormat(baseUrl, key, model),
    probeContextOutput(baseUrl, key, model),
  ]);
  return { vision, tool, format, contextK: ctxOut.contextK, maxOutputK: ctxOut.maxOutputK };
}
