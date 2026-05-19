import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { rollDie } from '../dice/roller.js';
import { HEXAGRAMS, hexagramSymbol } from '../divination/iching-data.js';

// 三钱法（金钱起卦）：每爻掷三枚硬币，正面=3、反面=2，求和。
// 6 老阴（变阳） / 7 少阳（不变） / 8 少阴（不变） / 9 老阳（变阴）
type LineValue = 6 | 7 | 8 | 9;

interface LineRoll {
  coins: ('正' | '反')[];
  sum: LineValue;
  yin: boolean;
  changing: boolean;
}

const LINE_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

function rollLine(): LineRoll {
  const coins: ('正' | '反')[] = [];
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    const r = rollDie(2);
    if (r === 1) {
      coins.push('正');
      sum += 3;
    } else {
      coins.push('反');
      sum += 2;
    }
  }
  const value = sum as LineValue;
  return {
    coins,
    sum: value,
    yin: value === 6 || value === 8,
    changing: value === 6 || value === 9,
  };
}

function lineLabel(line: LineRoll): string {
  switch (line.sum) {
    case 6: return '老阴 ▬ ▬ ✕';
    case 7: return '少阳 ▬▬▬';
    case 8: return '少阴 ▬ ▬';
    case 9: return '老阳 ▬▬▬ ✕';
  }
}

function linesToIndex(lines: LineRoll[]): number {
  // lines[0] 是初爻（最下），编码到 bit0；lines[5] 是上爻，bit5
  let idx = 0;
  for (let i = 0; i < 6; i++) {
    if (!lines[i].yin) idx |= 1 << i;
  }
  return idx;
}

function transformedLines(lines: LineRoll[]): boolean[] {
  // 之卦的爻：变爻翻转，不变爻保持
  return lines.map((l) => {
    if (l.changing) return !l.yin ? true : false; // 翻转
    return l.yin;
  });
}

function transformedIndex(lines: LineRoll[]): number {
  const flipped = transformedLines(lines);
  let idx = 0;
  for (let i = 0; i < 6; i++) {
    if (!flipped[i]) idx |= 1 << i; // !yin = 阳
  }
  return idx;
}

export function registerCastIchingTool(server: McpServer): void {
  server.registerTool(
    'cast_iching',
    {
      title: '易经起卦',
      description:
        'Cast an I Ching hexagram using the three-coin method (金钱卦). ' +
        'For each of six lines (bottom to top), three coins are flipped: heads=3, tails=2; ' +
        'sum 6 = old yin (changing), 7 = young yang, 8 = young yin, 9 = old yang (changing). ' +
        'Returns the primary hexagram, the changing lines, and the resulting hexagram (之卦) if any line is changing. ' +
        'No input parameters; pure local randomness via crypto.randomInt.',
      inputSchema: {},
    },
    async () => {
      const lines: LineRoll[] = [];
      for (let i = 0; i < 6; i++) lines.push(rollLine());

      const primaryIdx = linesToIndex(lines);
      const primary = HEXAGRAMS[primaryIdx];
      const changingLineIdx = lines
        .map((l, i) => (l.changing ? i : -1))
        .filter((i) => i >= 0);

      const out: string[] = ['易经起卦（三钱法）', ''];
      out.push('爻象（自下而上）：');
      for (let i = 5; i >= 0; i--) {
        const l = lines[i];
        out.push(`  ${LINE_NAMES[i]}：${lineLabel(l)}  [${l.coins.join(' ')}]`);
      }
      out.push('');
      out.push(
        `本卦：第 ${primary.seq} 卦 ${primary.name} ${hexagramSymbol(primary.seq)}`,
      );

      if (changingLineIdx.length === 0) {
        out.push('变爻：无');
      } else {
        const changingNames = changingLineIdx.map((i) => LINE_NAMES[i]).join('、');
        out.push(`变爻：${changingNames}（共 ${changingLineIdx.length} 爻）`);
        const transformedIdx = transformedIndex(lines);
        const transformed = HEXAGRAMS[transformedIdx];
        out.push(
          `之卦：第 ${transformed.seq} 卦 ${transformed.name} ${hexagramSymbol(transformed.seq)}`,
        );
      }

      return { content: [{ type: 'text', text: out.join('\n') }] };
    },
  );
}
