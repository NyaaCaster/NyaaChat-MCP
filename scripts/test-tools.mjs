import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../dist/server.js';

const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

const server = createMcpServer();
await server.connect(serverTransport);

const client = new Client({ name: 'test-client', version: '0.0.1' }, { capabilities: {} });
await client.connect(clientTransport);

const cases = [
  // === roll_dice ===
  { name: 'roll_dice', args: { expression: '3d6+2' }, label: '基础 3d6+2' },
  { name: 'roll_dice', args: { expression: '1d100' }, label: '单 d100' },
  { name: 'roll_dice', args: { expression: '2d8-1' }, label: '减常数 2d8-1' },
  { name: 'roll_dice', args: { expression: '4d6+1d4+3' }, label: '多组叠加' },
  { name: 'roll_dice', args: { expression: '8d6' }, label: '火球术 8d6' },
  { name: 'roll_dice', args: { expression: '' }, label: '空表达式（应错）', expectError: true },
  { name: 'roll_dice', args: { expression: '200d6' }, label: '超上限（应错）', expectError: true },
  { name: 'roll_dice', args: { expression: 'foo' }, label: '语法错（应错）', expectError: true },

  // === roll_dnd ===
  { name: 'roll_dnd', args: { expression: '1d20+5' }, label: '基础检定 +5' },
  { name: 'roll_dnd', args: { expression: '1d20+3', type: 'save', dc: 13 }, label: '豁免 vs DC13' },
  { name: 'roll_dnd', args: { expression: '1d20+5', advantage: 'advantage', type: 'attack', dc: 15 }, label: '优势攻击 vs DC15' },
  { name: 'roll_dnd', args: { expression: '1d20+3', advantage: 'disadvantage' }, label: '劣势检定' },
  { name: 'roll_dnd', args: { expression: '1d20+5+1d4', type: 'attack', dc: 15 }, label: '祝福攻击 +5+1d4' },
  { name: 'roll_dnd', args: { expression: '1d20+3-1d4', type: 'save' }, label: '罡风豁免 +3-1d4' },
  { name: 'roll_dnd', args: { expression: '1d20', type: 'save', dc: 10 }, label: '死亡豁免 DC10' },
  { name: 'roll_dnd', args: { expression: '2d20+5' }, label: '错误：双 d20', expectError: true },
  { name: 'roll_dnd', args: { expression: '1d6+5' }, label: '错误：非 d20', expectError: true },
  { name: 'roll_dnd', args: { expression: '1d20+1+2+3+4' }, label: '错误：超 3 项', expectError: true },

  // === roll_coc ===
  { name: 'roll_coc', args: { skill: 65 }, label: '标准技能检定 skill=65' },
  { name: 'roll_coc', args: { skill: 65, bonus: 1 }, label: '奖励骰 ×1' },
  { name: 'roll_coc', args: { skill: 65, bonus: 2 }, label: '奖励骰 ×2' },
  { name: 'roll_coc', args: { skill: 65, penalty: 1 }, label: '惩罚骰 ×1' },
  { name: 'roll_coc', args: { skill: 30 }, label: '低技能（验大失败 96-100 阈值显示）' },
  { name: 'roll_coc', args: { skill: 80 }, label: '高技能（验大失败 =100）' },
  { name: 'roll_coc', args: { skill: 50, bonus: 1, penalty: 1 }, label: '错误：bonus+penalty 同时给', expectError: true },

  // === flip_coin ===
  { name: 'flip_coin', args: {}, label: '默认 1 枚硬币' },
  { name: 'flip_coin', args: { count: 5 }, label: '5 枚硬币' },
  { name: 'flip_coin', args: { count: 100 }, label: '100 枚硬币（上限）' },
  { name: 'flip_coin', args: { count: 0 }, label: '错误：count=0', expectError: true },
  { name: 'flip_coin', args: { count: 101 }, label: '错误：超上限', expectError: true },

  // === cast_iching ===
  { name: 'cast_iching', args: {}, label: '易经起卦' },
  { name: 'cast_iching', args: {}, label: '易经起卦（再来一次）' },

  // === draw_tarot ===
  { name: 'draw_tarot', args: {}, label: '默认三张牌阵' },
  { name: 'draw_tarot', args: { spread: 'single' }, label: '单张牌' },
  { name: 'draw_tarot', args: { spread: 'three', question: '今年的事业运势？' }, label: '三张牌阵带问题' },
  { name: 'draw_tarot', args: { spread: 'celtic' }, label: '凯尔特十字（10 张）' },
  { name: 'draw_tarot', args: { spread: 'invalid' }, label: '错误：未知 spread', expectError: true },

  // === draw_qian ===
  { name: 'draw_qian', args: {}, label: '抽签' },
  { name: 'draw_qian', args: {}, label: '抽签（再来一次）' },
  { name: 'draw_qian', args: {}, label: '抽签（第三次）' },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  try {
    const r = await client.callTool({ name: c.name, arguments: c.args });
    const text = r.content?.[0]?.text ?? '(no text)';
    const isErr = !!r.isError;
    const expected = !!c.expectError;
    const ok = isErr === expected;
    if (ok) pass++; else fail++;
    console.log(`\n[${ok ? 'PASS' : 'FAIL'}] ${c.name}: ${c.label}`);
    console.log(`  args: ${JSON.stringify(c.args)}`);
    console.log(`  isError: ${isErr} (expected ${expected})`);
    console.log(text.split('\n').map(l => '  ' + l).join('\n'));
  } catch (e) {
    fail++;
    console.log(`\n[FAIL] ${c.name}: ${c.label} — protocol error: ${e.message}`);
  }
}

console.log(`\n=== ${pass} pass / ${fail} fail / ${cases.length} total ===`);

await client.close();
await server.close();
process.exit(fail > 0 ? 1 : 0);
