import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { rollDie } from '../dice/roller.js';

export function registerFlipCoinTool(server: McpServer): void {
  server.registerTool(
    'flip_coin',
    {
      title: '硬币',
      description:
        'Flip one or more fair coins. Each coin independently lands "正" (heads) or "反" (tails). ' +
        'Returns the sequence of results plus a tally. Useful for quick yes/no decisions, ' +
        'binary outcomes, or as a building block (e.g. three-coin I Ching, but use cast_iching for that). ' +
        'Limit: count between 1 and 100.',
      inputSchema: {
        count: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Number of coins to flip (1-100). Defaults to 1.'),
      },
    },
    async ({ count }) => {
      const n = count ?? 1;
      const flips: string[] = [];
      let heads = 0;
      for (let i = 0; i < n; i++) {
        const r = rollDie(2);
        if (r === 1) {
          flips.push('正');
          heads++;
        } else {
          flips.push('反');
        }
      }
      const tails = n - heads;

      const lines: string[] = [];
      if (n === 1) {
        lines.push(`硬币：${flips[0]}`);
      } else {
        lines.push(`硬币 ×${n}`);
        lines.push(`  序列：${flips.join(' ')}`);
        lines.push(`  统计：正 ${heads} / 反 ${tails}`);
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );
}
