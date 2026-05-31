import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Backend SearXNG metasearch endpoint. The NyaaChat frontend reaches the same
 * instance through an nginx reverse proxy (browser CORS), but this MCP server
 * is server-side and can hit it directly. Configurable via SEARXNG_URL; the
 * default points at NyaaCaster's cloud instance and works out of the box.
 */
const SEARXNG_URL =
  process.env.SEARXNG_URL?.trim() || 'http://j.hony-wen.com:1441/search';
const REQUEST_TIMEOUT_MS = (() => {
  const raw = Number(process.env.SEARXNG_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 8000;
})();
const DEFAULT_COUNT = 5;
const MAX_COUNT = 10;

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

/**
 * Query SearXNG and return at most `count` normalized hits plus any instant
 * answers. Throws on HTTP error / timeout / non-JSON / empty results — the
 * caller maps that to an MCP isError response.
 */
async function searchWeb(query: string, opts: SearchOptions): Promise<SearchOutcome> {
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

export function registerWebSearchTool(server: McpServer): void {
  server.registerTool(
    'web_search',
    {
      title: '网络搜索',
      description:
        'General-purpose web search via a self-hosted SearXNG metasearch instance. ' +
        'Aggregates results from multiple engines (Google, Bing, DuckDuckGo, Wikipedia, etc.) ' +
        'and returns the top hits as plain text: title, URL, and snippet for each. ' +
        'Use it to fetch real-time / up-to-date information the model does not know. ' +
        'Supports result count, language, time range, and category filters.',
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
            'Result language, e.g. "zh-CN", "en", "ja". Omit to use the instance default (all languages).',
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
            'SearXNG category filter, e.g. "general", "news", "science", "it", "images". ' +
              'Omit for the default (general).',
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

      try {
        const outcome = await searchWeb(trimmed, {
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
              ? `搜索超时（${Math.round(REQUEST_TIMEOUT_MS / 1000)}s 内未返回）`
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
