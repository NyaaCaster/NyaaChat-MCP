// 更新 qinyapi 模型清单：用 .env 里各分组的 apikey 调 GET /v1/models，
// 把拉到的真实模型列表「就地」写回 src/qinyapi/groups.ts 的对应 models 数组。
//
// 设计要点：
// - 单一事实源是 groups.ts 本身：分组顺序、分组名、keyEnv、端点都从文件读取，
//   脚本不发明任何分组，只刷新已存在分组的 models 数组。
// - 只替换 `models: [...]`，分组名/keyEnv/注释/整体结构原样保留 → diff 最小、你照常手维护。
// - key 只从 .env 读取，绝不打印 key 值。
// - 拉取失败 / 缺 key 的分组「保持原样不动」，绝不把已有清单清空。
// - 加 --dry-run 只预览改动、不落盘。
//
// 用法：
//   node scripts/update-qiny-models.mjs            # 拉取并写回
//   node scripts/update-qiny-models.mjs --dry-run  # 只预览，不写文件
// 写回后请跑 `npm run typecheck` 复核语法。

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const GROUPS_FILE = join(ROOT, 'src', 'qinyapi', 'groups.ts');
const ENV_FILE = join(ROOT, '.env');
const TIMEOUT_MS = 30000;
const DRY_RUN = process.argv.includes('--dry-run');

// 极简 .env 解析：KEY=VALUE，忽略空行与 # 注释，按第一个 = 切分，不剥引号。
function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const eq = s.indexOf('=');
    if (eq < 0) continue;
    env[s.slice(0, eq).trim()] = s.slice(eq + 1).trim();
  }
  return env;
}

function modelsUrlFrom(baseUrl) {
  return baseUrl.replace(/\/chat\/completions\/?$/, '/models');
}

// 拉取单个 key 下的模型 id 列表；失败/超时重试一次。
async function fetchModels(url, key) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const text = await res.text();
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return { ok: false, error: 'non-JSON response' };
      }
      const ids = (json?.data ?? []).map((m) => m?.id).filter((x) => typeof x === 'string');
      return { ok: true, models: ids };
    } catch (err) {
      if (attempt === 1) return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { ok: false, error: 'unknown' };
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// 按 groups.ts 现有风格格式化 models 数组：空 → []；单个 → 单行；多个 → 每行一个（6 空格缩进）。
function fmtArray(models) {
  if (models.length === 0) return '[]';
  if (models.length === 1) return `['${esc(models[0])}']`;
  return '[\n' + models.map((m) => `      '${esc(m)}',`).join('\n') + '\n    ]';
}

function modelIdsInArrayLiteral(literal) {
  return [...literal.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
}

function diff(oldArr, newArr) {
  const o = new Set(oldArr);
  const n = new Set(newArr);
  return {
    added: newArr.filter((x) => !o.has(x)),
    removed: oldArr.filter((x) => !n.has(x)),
  };
}

async function main() {
  const src = await readFile(GROUPS_FILE, 'utf8');
  const env = parseEnv(await readFile(ENV_FILE, 'utf8'));

  const baseUrl = env.QINYAPI_BASE_URL?.trim() || matchBaseUrl(src);
  const url = modelsUrlFrom(baseUrl);

  // 匹配每个分组：name → keyEnv →（可选注释行）→ models 数组字面量。
  // models 数组内只有带引号的字符串，不含 ']'，故 [\s\S]*? 收到第一个 ] 即整段数组。
  const groupRe =
    /name: '([^']+)',\n\s*keyEnv: '([^']+)',\n(?:\s*\/\/[^\n]*\n)*\s*models: (\[[\s\S]*?\])/g;

  const groups = [];
  for (const m of src.matchAll(groupRe)) {
    groups.push({ name: m[1], keyEnv: m[2], oldLiteral: m[3] });
  }
  if (groups.length === 0) {
    console.error('未在 groups.ts 中解析到任何分组，模式可能已变化，已中止。');
    process.exit(1);
  }

  console.log(`端点：${url}`);
  console.log(`解析到 ${groups.length} 个分组，开始拉取……\n`);

  // 按 keyEnv 去重拉取（共用 key 的分组只请求一次）。
  const uniqueKeyEnvs = [...new Set(groups.map((g) => g.keyEnv))];
  const results = new Map();
  await Promise.all(
    uniqueKeyEnvs.map(async (keyEnv) => {
      const key = env[keyEnv]?.trim();
      if (!key) {
        results.set(keyEnv, { ok: false, error: '缺 key', noKey: true });
        return;
      }
      results.set(keyEnv, await fetchModels(url, key));
    }),
  );

  // 同步替换：仅对拉取成功的分组替换其 models 数组，其余保持原样。
  let idx = 0;
  let changed = 0;
  const report = [];
  const updated = src.replace(groupRe, (whole, name, keyEnv, oldLiteral) => {
    idx++;
    const r = results.get(keyEnv);
    const oldModels = modelIdsInArrayLiteral(oldLiteral);
    if (!r || !r.ok) {
      report.push({ name, keyEnv, status: r?.noKey ? '跳过(缺 key)' : `跳过(${r?.error ?? '错误'})`, old: oldModels.length });
      return whole; // 不动
    }
    const newModels = r.models;
    const { added, removed } = diff(oldModels, newModels);
    if (added.length || removed.length) changed++;
    report.push({ name, keyEnv, status: added.length || removed.length ? '更新' : '无变化', old: oldModels.length, new: newModels.length, added, removed });
    return whole.replace(oldLiteral, fmtArray(newModels));
  });

  // 打印汇总（只打印分组名/模型 id/数量，绝不打印 key）。
  for (const r of report) {
    const head = `【${r.name}】(${r.keyEnv}) ${r.status}`;
    if (r.status === '更新') {
      console.log(`${head}  ${r.old} → ${r.new}`);
      if (r.added.length) console.log(`    + 新增 ${r.added.length}：${r.added.join(', ')}`);
      if (r.removed.length) console.log(`    - 移除 ${r.removed.length}：${r.removed.join(', ')}`);
    } else if (r.status === '无变化') {
      console.log(`${head}  (${r.old})`);
    } else {
      console.log(`${head}  保留原 ${r.old} 个`);
    }
  }

  // 全局新增模型（可能需要顺手维护黑名单 banlist.ts / 尺寸表 knownMeta）。
  const allOld = new Set(groups.flatMap((g) => modelIdsInArrayLiteral(g.oldLiteral)));
  const brandNew = [...new Set(report.flatMap((r) => r.added ?? []))].filter((m) => !allOld.has(m));
  if (brandNew.length) {
    console.log(`\n⚠️ 出现 ${brandNew.length} 个全新模型，按需考虑是否加入 banlist.ts / knownMeta：`);
    console.log(`   ${brandNew.join(', ')}`);
  }

  if (DRY_RUN) {
    console.log(`\n[dry-run] 未写文件。共有 ${changed} 个分组会变化。`);
    return;
  }

  if (updated === src) {
    console.log('\n所有分组无变化，groups.ts 未改动。');
    return;
  }

  await writeFile(GROUPS_FILE, updated, 'utf8');
  console.log(`\n✅ 已更新 ${changed} 个分组到 src/qinyapi/groups.ts。请运行 \`npm run typecheck\` 复核。`);
}

function matchBaseUrl(src) {
  const m = src.match(/QINY_DEFAULT_BASE_URL\s*=\s*'([^']+)'/);
  if (!m) {
    console.error('未在 groups.ts 找到 QINY_DEFAULT_BASE_URL，已中止。');
    process.exit(1);
  }
  return m[1];
}

main().catch((err) => {
  console.error('运行失败：', err);
  process.exit(1);
});
