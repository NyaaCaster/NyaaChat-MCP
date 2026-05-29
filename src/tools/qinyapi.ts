import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadQinyConfig, type QinyConfig, type QinyGroup } from '../qinyapi/config.js';
import { groupMatches, modelMatches } from '../qinyapi/modelsMeta.js';
import { cacheKey, readCache, writeEntry, type CacheEntry } from '../qinyapi/cache.js';
import { probeCapabilities, probeConnectivity } from '../qinyapi/probe.js';

const DEFAULT_MODEL = 'gemini-2.5-pro';
const RECOMMEND_TEXT = '酒馆推荐用默认组gemini-2.5-pro模型';
const NAME_ERROR =
  '分组名或模型名错误，或该分组与模型本喵不提供查询，请自行测试。';

interface Pair {
  group: QinyGroup;
  model: string;
}

function capLine(caps: CacheEntry | null): string {
  if (!caps) return '  能力：❓未知（连接失败，无法探测）';
  const mark = (ok: boolean) => (ok ? '✅' : '❌');
  return `  能力：👁视觉${mark(caps.vision)}  🔧工具${mark(caps.tool)}  📄格式化${mark(caps.format)}`;
}

function ctxLine(caps: CacheEntry | null): string {
  const ctx = caps?.contextK != null ? `${caps.contextK}K` : '未知';
  const out = caps?.maxOutputK != null ? `${caps.maxOutputK}K` : '未知';
  return `  📥上下文：${ctx}   📤最大输出：${out}`;
}

function err(text: string) {
  return { isError: true as const, content: [{ type: 'text' as const, text }] };
}

function text(t: string) {
  return { content: [{ type: 'text' as const, text: t }] };
}

function catalog(config: QinyConfig): string {
  const lines = ['📋 可查询的令牌分组与模型：', ''];
  for (const g of config.groups) {
    lines.push(`- **${g.name}**`);
    for (const m of g.models) lines.push(`  - ${m}`);
  }
  return lines.join('\n');
}

export function registerQinyHealthTool(server: McpServer): void {
  server.registerTool(
    'qinyapi_health_check',
    {
      title: 'qinyapi 模型健康测试',
      description:
        'Health-check qinyapi token groups + models. ' +
        'Reports: connectivity & latency (probed live every call), and — cached after the ' +
        'first probe — vision 👁 / tool-calling 🔧 / formatted-output 📄 support, context length (K) ' +
        'and max output length (K). All status markers are emoji (no images / SVG).\n' +
        'Params: `group` (token group name), `model` (model name or nickname), `list` (true = just ' +
        'list every group + model, no testing).\n' +
        'Nicknames (fuzzy): 哈基米 → gemini-2.5-pro; 克劳德/小克/克总/克 → claude. Group names tolerate ' +
        'a missing "组" suffix and the same nicknames (e.g. "小克按次" → claude按次组).\n' +
        'Resolution rules:\n' +
        '- "aws的4.8能用吗" → group="aws组", model="4.8".\n' +
        '- "4.8能用吗" (no group) → model="4.8", tests every group that has it.\n' +
        '- "哈基米/2.5是不是挂了" → only 默认组 gemini-2.5-pro is tested.\n' +
        '- "有没有能用的模型" → call with no args; only 默认组 gemini-2.5-pro is tested + a recommendation.\n' +
        '- "能查询哪些模型" → call with list=true.\n' +
        'If the group / model does not exist (or is not offered), an error message is returned.',
      inputSchema: {
        group: z
          .string()
          .optional()
          .describe('令牌分组名，如 "aws组"、"默认组"、"小克按次"（可省 "组" 字、可用昵称）。省略则在所有分组中匹配。'),
        model: z
          .string()
          .optional()
          .describe(
            '模型名或昵称，如 "claude-opus-4-8"、"4.8"、"2.5"、"哈基米"、"小克"。省略且未给 group 时只测默认组 gemini-2.5-pro。',
          ),
        list: z
          .boolean()
          .optional()
          .describe('为 true 时只列出全部可查询的分组与模型（markdown 无序列表），不做健康测试。'),
      },
    },
    async ({ group, model, list }) => {
      const config = loadQinyConfig();
      if (!config) {
        return err('qinyapi 未配置：请在 .env 中设置 QINYAPI_BASE_URL 与 QINYAPI_GROUP_<n>_NAME/_KEY/_MODELS。');
      }

      if (list) return text(catalog(config));

      const groupQuery = group?.trim();
      const modelQuery = model?.trim();

      let recommend = false;
      let effectiveModel = modelQuery;
      if (!groupQuery && !modelQuery) {
        effectiveModel = DEFAULT_MODEL;
        recommend = true;
      }

      // Candidate groups (a nickname like "小克" can match several).
      let candidateGroups: QinyGroup[];
      if (groupQuery) {
        candidateGroups = config.groups.filter((g) => groupMatches(g.name, groupQuery));
        if (candidateGroups.length === 0) return err(NAME_ERROR);
      } else {
        candidateGroups = config.groups;
      }

      // Resolve (group, model) pairs.
      const pairs: Pair[] = [];
      for (const g of candidateGroups) {
        if (effectiveModel) {
          for (const m of g.models) {
            if (modelMatches(m, effectiveModel)) pairs.push({ group: g, model: m });
          }
        } else {
          for (const m of g.models) pairs.push({ group: g, model: m });
        }
      }

      if (pairs.length === 0) return err(NAME_ERROR);

      const cache = await readCache();
      const now = new Date().toISOString();

      const results = await Promise.all(
        pairs.map(async ({ group: g, model: m }) => {
          const conn = await probeConnectivity(config.baseUrl, g.key, m);
          const key = cacheKey(g.name, m);
          let caps: CacheEntry | null = cache[key] ?? null;
          let newEntry: { key: string; entry: CacheEntry } | null = null;
          if (!caps && conn.ok) {
            const c = await probeCapabilities(config.baseUrl, g.key, m);
            caps = { ...c, probedAt: now };
            newEntry = { key, entry: caps };
          }
          return { g, m, conn, caps, newEntry };
        }),
      );

      // Persist newly probed entries sequentially to avoid clobbering the JSON file.
      for (const r of results) {
        if (r.newEntry) await writeEntry(r.newEntry.key, r.newEntry.entry);
      }

      const blocks = results.map((r) => {
        const head = `【${r.g.name} / ${r.m}】`;
        const conn = r.conn.ok
          ? `  连接：✅ 响应 ${r.conn.latencyMs}ms`
          : `  连接：❌ ${r.conn.error ?? '失败'}`;
        return [head, conn, capLine(r.caps), ctxLine(r.caps)].join('\n');
      });

      let out = blocks.join('\n\n');
      if (recommend) out += `\n\n${RECOMMEND_TEXT}`;
      return text(out);
    },
  );
}
