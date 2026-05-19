import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { rollDie } from '../dice/roller.js';
import { SPREADS, TAROT_DECK, type TarotCard } from '../divination/tarot-data.js';

function shuffleAndDraw(n: number): TarotCard[] {
  // Fisher-Yates 部分洗牌：只洗到前 n 张即可。
  const deck = [...TAROT_DECK];
  for (let i = 0; i < n; i++) {
    const j = i + (rollDie(deck.length - i) - 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n);
}

function isReversed(): boolean {
  return rollDie(2) === 2;
}

export function registerDrawTarotTool(server: McpServer): void {
  server.registerTool(
    'draw_tarot',
    {
      title: '塔罗牌',
      description:
        'Draw cards from a 78-card Rider-Waite-Smith tarot deck. ' +
        'Three spreads supported: ' +
        '"single" (1 card, core insight); ' +
        '"three" (3 cards: past / present / future); ' +
        '"celtic" (10-card Celtic Cross). ' +
        'Each card has a 50% chance of being reversed. Cards are drawn without replacement. ' +
        'Returns each position with the card name (Chinese + English) and 3 keywords for the drawn orientation. ' +
        'Optional `question` field is echoed back to provide narrative context to the LLM.',
      inputSchema: {
        spread: z
          .enum(['single', 'three', 'celtic'])
          .optional()
          .describe('Spread layout. Default: "three".'),
        question: z
          .string()
          .max(200)
          .optional()
          .describe('Optional question or theme of the reading; echoed back to provide context.'),
      },
    },
    async ({ spread, question }) => {
      const layout = SPREADS[spread ?? 'three'];
      const cards = shuffleAndDraw(layout.size);

      const out: string[] = [];
      const spreadNames = { single: '单张牌', three: '三张牌阵', celtic: '凯尔特十字' } as const;
      out.push(`塔罗 · ${spreadNames[spread ?? 'three']}（${layout.size} 张）`);
      if (question) out.push(`所问：${question}`);
      out.push('');

      for (let i = 0; i < layout.size; i++) {
        const card = cards[i];
        const reversed = isReversed();
        const orientation = reversed ? '逆位' : '正位';
        const keywords = reversed ? card.reversed : card.upright;
        out.push(`${layout.positions[i]}：${card.nameZh} ${card.nameEn}（${orientation}）`);
        out.push(`  关键词：${keywords.join('、')}`);
      }

      return { content: [{ type: 'text', text: out.join('\n') }] };
    },
  );
}
