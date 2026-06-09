import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

type Backend = 'tavily' | 'searxng';

/**
 * web_search backend switch (env WEB_SEARCH_BACKEND): "tavily" or "searxng".
 * Anything else (including unset) falls back to searxng, which needs no
 * credentials and keeps the pre-Tavily behavior.
 */
const BACKEND: Backend =
  process.env.WEB_SEARCH_BACKEND?.trim().toLowerCase() === 'tavily' ? 'tavily' : 'searxng';

const DEFAULT_COUNT = 5;
const MAX_COUNT = 10;

function readTimeoutMs(name: string): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : 8000;
}

interface SearchHit {
  url: string;
  title: string;
  content: string;
  engine: string;
}

interface SearchOutcome {
  hits: SearchHit[];
  answers: string[];
  total: number;
}

interface SearchOptions {
  count: number;
  language?: string;
  timeRange?: string;
  categories?: string;
}

// ============================== SearXNG backend ==============================

/**
 * Backend SearXNG metasearch endpoint. The NyaaChat frontend reaches the same
 * instance through an nginx reverse proxy (browser CORS), but this MCP server
 * is server-side and can hit it directly. Configurable via SEARXNG_URL; the
 * default points at NyaaCaster's cloud instance and works out of the box.
 */
const SEARXNG_URL =
  process.env.SEARXNG_URL?.trim() || 'http://j.hony-wen.com:1441/search';
const SEARXNG_TIMEOUT_MS = readTimeoutMs('SEARXNG_TIMEOUT_MS');

interface SearxngResult {
  url?: string;
  title?: string;
  content?: string;
  engine?: string;
}

interface SearxngResponse {
  results?: SearxngResult[];
  answers?: unknown[];
  number_of_results?: number;
}

/**
 * Query SearXNG and return at most `count` normalized hits plus any instant
 * answers. Throws on HTTP error / timeout / non-JSON / empty results — the
 * caller maps that to an MCP isError response.
 */
async function searchSearxng(query: string, opts: SearchOptions): Promise<SearchOutcome> {
  const body = new URLSearchParams({ q: query, format: 'json' });
  if (opts.language) body.set('language', opts.language);
  if (opts.timeRange) body.set('time_range', opts.timeRange);
  if (opts.categories) body.set('categories', opts.categories);

  const res = await fetch(SEARXNG_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'NyaaChat-MCP',
    },
    body: body.toString(),
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(SEARXNG_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = (await res.text().catch(() => '')).trim().slice(0, 200);
    throw new Error(`SearXNG HTTP ${res.status}${text ? `: ${text}` : ''}`);
  }

  let data: SearxngResponse;
  try {
    data = (await res.json()) as SearxngResponse;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`SearXNG 响应不是 JSON：${msg}`);
  }

  const raw = Array.isArray(data.results) ? data.results : [];
  const hits: SearchHit[] = raw
    .slice(0, opts.count)
    .map((r) => ({
      url: typeof r?.url === 'string' ? r.url : '',
      title: typeof r?.title === 'string' ? r.title : '',
      content: typeof r?.content === 'string' ? r.content : '',
      engine: typeof r?.engine === 'string' ? r.engine : '?',
    }))
    .filter((r) => r.url && (r.title || r.content));

  if (hits.length === 0) {
    throw new Error('搜索结果为空');
  }

  const answers = Array.isArray(data.answers)
    ? data.answers.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
    : [];

  return { hits, answers, total: data.number_of_results ?? raw.length };
}

// ============================== Tavily backend ===============================

const TAVILY_URL = 'https://api.tavily.com/search';
const TAVILY_TIMEOUT_MS = readTimeoutMs('TAVILY_TIMEOUT_MS');
// 432/433 = key/plan quota exhausted; usually resets monthly, so park the key
// for a day rather than hammering it. 429 is transient rate limiting.
const QUOTA_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;

interface TavilyKeyState {
  key: string;
  disabledUntil: number;
}

/** Comma-separated keys from TAVILY_API_KEYS, tried in declaration order. */
const tavilyKeys: TavilyKeyState[] = (process.env.TAVILY_API_KEYS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((key) => ({ key, disabledUntil: 0 }));

/** Sticky-until-failure rotation: keep using whichever key last succeeded. */
let tavilyIndex = 0;

interface TavilyResult {
  url?: string;
  title?: string;
  content?: string;
}

interface TavilyResponse {
  answer?: string;
  results?: TavilyResult[];
}

function parseTavilyResponse(data: TavilyResponse): SearchOutcome {
  const raw = Array.isArray(data.results) ? data.results : [];
  const hits: SearchHit[] = raw
    .map((r) => ({
      url: typeof r?.url === 'string' ? r.url : '',
      title: typeof r?.title === 'string' ? r.title : '',
      content: typeof r?.content === 'string' ? r.content : '',
      engine: 'tavily',
    }))
    .filter((r) => r.url && (r.title || r.content));

  if (hits.length === 0) {
    throw new Error('搜索结果为空');
  }

  const answer = typeof data.answer === 'string' ? data.answer.trim() : '';
  return { hits, answers: answer ? [answer] : [], total: hits.length };
}

/**
 * Query Tavily, rotating across configured API keys. Per-key failures
 * (invalid key, quota exhausted, rate limited) disable that key and move on;
 * request-level failures (400 / 5xx / timeout) abort immediately since
 * switching keys would not help.
 */
async function searchTavily(query: string, opts: SearchOptions): Promise<SearchOutcome> {
  if (tavilyKeys.length === 0) {
    throw new Error('Tavily 后端未配置 API key（请在 .env 设置 TAVILY_API_KEYS）');
  }

  const topic =
    opts.categories === 'news' || opts.categories === 'finance' ? opts.categories : 'general';
  const body = JSON.stringify({
    query,
    search_depth: 'basic',
    max_results: opts.count,
    include_answer: 'basic',
    topic,
    ...(opts.timeRange ? { time_range: opts.timeRange } : {}),
  });

  const failures: string[] = [];
  for (let attempt = 0; attempt < tavilyKeys.length; attempt++) {
    const idx = (tavilyIndex + attempt) % tavilyKeys.length;
    const state = tavilyKeys[idx];
    if (state.disabledUntil > Date.now()) {
      failures.push(`key#${idx + 1} 冷却中`);
      continue;
    }

    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.key}`,
      },
      body,
      signal: AbortSignal.timeout(TAVILY_TIMEOUT_MS),
    });

    if (res.ok) {
      tavilyIndex = idx;
      return parseTavilyResponse((await res.json()) as TavilyResponse);
    }

    const detail = (await res.text().catch(() => '')).trim().slice(0, 200);
    if (res.status === 401) {
      state.disabledUntil = Infinity;
      console.warn(`[web_search] Tavily key#${idx + 1} 无效（401），已禁用`);
      failures.push(`key#${idx + 1} 无效（401）`);
      continue;
    }
    if (res.status === 432 || res.status === 433) {
      state.disabledUntil = Date.now() + QUOTA_COOLDOWN_MS;
      console.warn(`[web_search] Tavily key#${idx + 1} 额度耗尽（${res.status}），冷却 24 小时`);
      failures.push(`key#${idx + 1} 额度耗尽（${res.status}）`);
      continue;
    }
    if (res.status === 429) {
      state.disabledUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      console.warn(`[web_search] Tavily key#${idx + 1} 限流（429），冷却 60 秒`);
      failures.push(`key#${idx + 1} 限流（429）`);
      continue;
    }

    throw new Error(`Tavily HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
  }

  throw new Error(`Tavily 所有 API key 均不可用：${failures.join('；')}`);
}

// ================================== Tool ====================================

function formatResults(query: string, outcome: SearchOutcome): string {
  const { hits, answers, total } = outcome;
  // SearXNG's number_of_results is unreliable for some engines/categories
  // (often 0 even when results exist); only surface it when it's plausible.
  const header =
    total > hits.length
      ? `关于 "${query}" 的网络搜索结果（约 ${total} 条，取前 ${hits.length} 条）：`
      : `关于 "${query}" 的网络搜索结果（${hits.length} 条）：`;
  const lines: string[] = [header];
  for (const a of answers) {
    lines.push('', `[即时答案] ${a}`);
  }
  hits.forEach((h, i) => {
    lines.push('', `${i + 1}. ${h.title || '(无标题)'}`);
    lines.push(`   ${h.url}`);
    if (h.content) lines.push(`   ${h.content}`);
    lines.push(`   （来源：${h.engine}）`);
  });
  return lines.join('\n');
}

const DESCRIPTIONS: Record<Backend, string> = {
  searxng:
    'General-purpose web search via a self-hosted SearXNG metasearch instance. ' +
    'Aggregates results from multiple engines (Google, Bing, DuckDuckGo, Wikipedia, etc.) ' +
    'and returns the top hits as plain text: title, URL, and snippet for each. ' +
    'Use it to fetch real-time / up-to-date information the model does not know. ' +
    'Supports result count, language, time range, and category filters.',
  tavily:
    'General-purpose web search via the Tavily search API. ' +
    'Returns the top hits as plain text (title, URL, snippet) plus an AI-generated ' +
    'quick answer when available. ' +
    'Use it to fetch real-time / up-to-date information the model does not know. ' +
    'Supports result count, time range, and topic filters ("news" / "finance" via ' +
    'the categories parameter); the language parameter is ignored by this backend.',
};

export function registerWebSearchTool(server: McpServer): void {
  server.registerTool(
    'web_search',
    {
      title: '网络搜索',
      description: DESCRIPTIONS[BACKEND],
      inputSchema: {
        query: z.string().describe('Search query / keywords. Required.'),
        count: z
          .number()
          .int()
          .optional()
          .describe(
            `Number of results to return. Default ${DEFAULT_COUNT}, clamped to 1..${MAX_COUNT}.`,
          ),
        language: z
          .string()
          .optional()
          .describe(
            'Result language, e.g. "zh-CN", "en", "ja". Only honored by the SearXNG backend; ' +
              'omit to use the default (all languages).',
          ),
        time_range: z
          .enum(['day', 'week', 'month', 'year'])
          .optional()
          .describe(
            'Restrict results to a recent time window. Useful for news / fast-moving topics.',
          ),
        categories: z
          .string()
          .optional()
          .describe(
            'Search category, e.g. "general", "news", "science", "it". ' +
              'On the Tavily backend only "news" / "finance" are meaningful (mapped to topic); ' +
              'anything else means general. Omit for the default (general).',
          ),
      },
    },
    async ({ query, count, language, time_range, categories }) => {
      const trimmed = query?.trim() ?? '';
      if (!trimmed) {
        return {
          isError: true,
          content: [{ type: 'text', text: '网络搜索失败：查询（query）不能为空。' }],
        };
      }

      const resolvedCount = Math.min(
        MAX_COUNT,
        Math.max(1, Math.floor(count ?? DEFAULT_COUNT)),
      );

      const search = BACKEND === 'tavily' ? searchTavily : searchSearxng;
      const timeoutMs = BACKEND === 'tavily' ? TAVILY_TIMEOUT_MS : SEARXNG_TIMEOUT_MS;

      try {
        const outcome = await search(trimmed, {
          count: resolvedCount,
          language: language?.trim() || undefined,
          timeRange: time_range,
          categories: categories?.trim() || undefined,
        });
        return { content: [{ type: 'text', text: formatResults(trimmed, outcome) }] };
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.name === 'TimeoutError'
              ? `搜索超时（${Math.round(timeoutMs / 1000)}s 内未返回）`
              : err.message
            : String(err);
        return {
          isError: true,
          content: [
            { type: 'text', text: `网络搜索失败（query="${trimmed}"）：${msg}` },
          ],
        };
      }
    },
  );
}
