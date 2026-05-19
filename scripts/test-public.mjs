#!/usr/bin/env node
// 公网验收：通过 http://h.hony-wen.com:3094/mcp 调本次新增的 7 个工具。
// 用法：MCP_API_KEY=xxx node scripts/test-public.mjs
// 注意：MCP_API_KEY 不要写入文件，命令行临时传入。

const URL = process.env.MCP_URL || 'http://h.hony-wen.com:3094/mcp';
const KEY = process.env.MCP_API_KEY;
if (!KEY) {
  console.error('需要设置 MCP_API_KEY 环境变量');
  process.exit(1);
}

let nextId = 1;
async function call(name, args) {
  const body = {
    jsonrpc: '2.0',
    id: nextId++,
    method: 'tools/call',
    params: { name, arguments: args },
  };
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });
  const ct = res.headers.get('content-type') ?? '';
  const raw = await res.text();
  if (!res.ok) {
    return { httpStatus: res.status, raw };
  }
  // streamable-http 返回的是 SSE：解析出 data: 那行。
  if (ct.includes('text/event-stream')) {
    const dataLine = raw.split('\n').find((l) => l.startsWith('data: '));
    if (!dataLine) return { httpStatus: res.status, raw };
    const json = JSON.parse(dataLine.slice('data: '.length));
    return { httpStatus: res.status, json };
  }
  return { httpStatus: res.status, json: JSON.parse(raw) };
}

const cases = [
  { name: 'roll_dice', args: { expression: '4d6+2' }, label: '骰子 4d6+2' },
  {
    name: 'roll_dnd',
    args: { expression: '1d20+5+1d4', advantage: 'advantage', type: 'attack', dc: 15 },
    label: 'DnD 优势攻击+祝福 vs DC15',
  },
  {
    name: 'roll_coc',
    args: { skill: 65, bonus: 1 },
    label: 'CoC 技能 65 + 奖励骰',
  },
  { name: 'flip_coin', args: { count: 5 }, label: '硬币 ×5' },
  { name: 'cast_iching', args: {}, label: '易经起卦' },
  {
    name: 'draw_tarot',
    args: { spread: 'three', question: '本次部署能否顺利？' },
    label: '塔罗三张牌',
  },
  { name: 'draw_qian', args: {}, label: '关帝灵签' },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  console.log('━'.repeat(72));
  console.log(`▶ ${c.name}: ${c.label}`);
  try {
    const r = await call(c.name, c.args);
    if (r.httpStatus !== 200 || !r.json) {
      fail++;
      console.log(`  [FAIL] HTTP ${r.httpStatus} | raw: ${r.raw?.slice(0, 200)}`);
      continue;
    }
    if (r.json.error) {
      fail++;
      console.log(`  [FAIL] JSON-RPC error: ${JSON.stringify(r.json.error)}`);
      continue;
    }
    const result = r.json.result;
    const text = result?.content?.[0]?.text ?? '(no text)';
    if (result?.isError) {
      fail++;
      console.log(`  [FAIL] tool isError=true`);
    } else {
      pass++;
      console.log('  [PASS]');
    }
    console.log(text.split('\n').map((l) => '    ' + l).join('\n'));
  } catch (e) {
    fail++;
    console.log(`  [FAIL] exception: ${e.message}`);
  }
}

console.log('━'.repeat(72));
console.log(`\n=== ${pass} pass / ${fail} fail / ${cases.length} total ===`);
process.exit(fail > 0 ? 1 : 0);
