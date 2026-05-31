// 一次性预热 qinyapi 模型「能力」静态表。
//
// 能力（视觉 / 工具调用 / 格式化输出）只能靠实测发请求得到、消耗 token；本脚本把
// 全清单一次性测出来，就地写回 src/qinyapi/capsTable.ts 的 STATIC_CAPS。此后
// qinyapi_health_check 命中静态表即零成本，不再重复探测。
//
// 待测清单推导（与需求一致）：
//   1. loadQinyConfig() 展开所有 (组, 模型) 对（仅含 .env 配了 key 的组）；
//   2. 剔除 isBanned(model) 命中的黑名单模型；
//   3. 剔除 STATIC_CAPS 已存在的 `组|模型`（增量，不重测）；
//   4. 余下即待测清单。
// 连接失败的对「不写入」，留待下次重跑。尺寸（上下文/最大输出）不在此脚本职责内，
// 由 modelsMeta.ts 的 knownMeta() 静态维护。
//
// 复用 src 内的探测逻辑（不复制）：probeConnectivity / probeCapabilities。
// key 只从 .env 读取（经 dotenv），绝不打印 key 值。
//
// 用法（tsx 运行，无需先 build）：
//   npx tsx scripts/probe-all-caps.ts --dry-run        # 只列待测清单与规模，不发请求
//   npx tsx scripts/probe-all-caps.ts --group 默认组    # 只测某组，便于分批控制花费
//   npx tsx scripts/probe-all-caps.ts                  # 全量实测并写回 capsTable.ts
// 写回后请运行 `npm run typecheck` 复核。

import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadQinyConfig } from '../src/qinyapi/config.js';
import { isBanned } from '../src/qinyapi/banlist.js';
import { probeConnectivity, probeCapabilities } from '../src/qinyapi/probe.js';
import { cacheKey } from '../src/qinyapi/cache.js';
import { STATIC_CAPS, type StaticCaps } from '../src/qinyapi/capsTable.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CAPS_FILE = join(HERE, '..', 'src', 'qinyapi', 'capsTable.ts');
const CONCURRENCY = 5;
const DRY_RUN = process.argv.includes('--dry-run');

function groupFilterArg(): string | null {
  const i = process.argv.indexOf('--group');
  return i >= 0 ? (process.argv[i + 1]?.trim() ?? null) : null;
}

interface Pair {
  group: string;
  key: string; // apikey（仅内存使用，绝不打印）
  model: string;
  cacheKey: string;
}

function tsKey(k: string): string {
  return `'${k.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// 合并已有 + 新测，按 key 排序，重写 STATIC_CAPS 对象字面量块（header/接口/函数保留）。
function renderBlock(merged: Record<string, StaticCaps>): string {
  const keys = Object.keys(merged).sort();
  const body = keys
    .map((k) => {
      const c = merged[k];
      return `  ${tsKey(k)}: { vision: ${c.vision}, tool: ${c.tool}, format: ${c.format} },`;
    })
    .join('\n');
  return `export const STATIC_CAPS: Record<string, StaticCaps> = {\n${body}\n};`;
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main(): Promise<void> {
  const config = loadQinyConfig();
  if (!config) {
    console.error('qinyapi 未配置：请在 .env 设置各分组 key（QINYAPI_KEY_*）后重试。');
    process.exit(1);
  }

  const gFilter = groupFilterArg();

  // 推导待测清单。
  const pairs: Pair[] = [];
  let bannedCount = 0;
  let haveCount = 0;
  for (const g of config.groups) {
    if (gFilter && g.name !== gFilter && !g.name.includes(gFilter)) continue;
    for (const m of g.models) {
      if (isBanned(m)) {
        bannedCount++;
        continue;
      }
      const ck = cacheKey(g.name, m);
      if (ck in STATIC_CAPS) {
        haveCount++;
        continue;
      }
      pairs.push({ group: g.name, key: g.key, model: m, cacheKey: ck });
    }
  }

  console.log(`端点：${config.baseUrl}`);
  if (gFilter) console.log(`分组过滤：包含「${gFilter}」`);
  console.log(
    `已跳过：黑名单 ${bannedCount} 个、已有数据 ${haveCount} 个；待测 ${pairs.length} 对。`,
  );
  console.log(`预估请求数：约 ${pairs.length * 5} 次（每对 connectivity + vision + tool + format±1）。\n`);

  if (pairs.length === 0) {
    console.log('没有需要测试的模型。');
    return;
  }

  if (DRY_RUN) {
    console.log('[dry-run] 待测清单：');
    for (const p of pairs) console.log(`  - ${p.cacheKey}`);
    console.log('\n[dry-run] 未发任何请求、未写文件。');
    return;
  }

  let done = 0;
  const total = pairs.length;
  const probed = await runPool(pairs, CONCURRENCY, async (p) => {
    const conn = await probeConnectivity(config.baseUrl, p.key, p.model);
    let caps: StaticCaps | null = null;
    if (conn.ok) {
      const c = await probeCapabilities(config.baseUrl, p.key, p.model);
      caps = { vision: c.vision, tool: c.tool, format: c.format };
    }
    done++;
    const mark = (b: boolean) => (b ? '✅' : '❌');
    const line = conn.ok
      ? `👁${mark(caps!.vision)} 🔧${mark(caps!.tool)} 📄${mark(caps!.format)}`
      : `连接失败（不写入）：${conn.error ?? ''}`;
    console.log(`[${done}/${total}] ${p.cacheKey}  ${line}`);
    return { key: p.cacheKey, caps };
  });

  const newEntries: Record<string, StaticCaps> = {};
  let written = 0;
  let connFail = 0;
  for (const r of probed) {
    if (r.caps) {
      newEntries[r.key] = r.caps;
      written++;
    } else {
      connFail++;
    }
  }

  const merged: Record<string, StaticCaps> = { ...STATIC_CAPS, ...newEntries };
  const src = await readFile(CAPS_FILE, 'utf8');
  const re = /export const STATIC_CAPS: Record<string, StaticCaps> = \{[\s\S]*?\n\};/;
  if (!re.test(src)) {
    console.error('未在 capsTable.ts 定位到 STATIC_CAPS 块，结构可能已变化，已中止写回。');
    process.exit(1);
  }
  const updated = src.replace(re, () => renderBlock(merged));
  await writeFile(CAPS_FILE, updated, 'utf8');

  console.log(
    `\n✅ 新增 ${written} 条、连接失败跳过 ${connFail} 条；STATIC_CAPS 现共 ${Object.keys(merged).length} 条。`,
  );
  console.log('请运行 `npm run typecheck` 复核 capsTable.ts。');
}

main().catch((err) => {
  console.error('运行失败：', err);
  process.exit(1);
});
