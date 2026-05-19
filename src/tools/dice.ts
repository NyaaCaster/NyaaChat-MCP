import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { parseDiceExpression } from '../dice/parser.js';
import { rollDice } from '../dice/roller.js';

function formatTerm(sign: 1 | -1, body: string, isFirst: boolean): string {
  if (isFirst) {
    return sign === -1 ? `-${body}` : body;
  }
  return sign === -1 ? ` - ${body}` : ` + ${body}`;
}

export function registerRollDiceTool(server: McpServer): void {
  server.registerTool(
    'roll_dice',
    {
      title: '骰子',
      description:
        'Roll generic dice using the standard NdM±X notation. ' +
        'Supports any combination of dice groups and constants joined by + or -, ' +
        'e.g. "3d6+2", "1d100", "2d8-1", "4d6+1d4+3". ' +
        'Returns the individual roll values for each dice group plus the final total. ' +
        'Use this for damage rolls, sanity loss, random tables, ability score generation, etc. ' +
        'For D&D-style d20 checks with advantage/DC, use roll_dnd. ' +
        'For CoC d100 skill checks with success levels, use roll_coc. ' +
        'Limits: max 100 dice per group, max 1000 sides per die.',
      inputSchema: {
        expression: z
          .string()
          .min(1)
          .describe(
            'Dice expression in NdM±X form, e.g. "3d6+2", "1d100", "2d8-1", "4d6+1d4+3". ' +
              'Whitespace is ignored. At least one term required.',
          ),
      },
    },
    async ({ expression }) => {
      try {
        const parsed = parseDiceExpression(expression);

        const lines: string[] = [];
        let total = 0;
        let exprDisplay = '';
        let isFirst = true;

        const allItems: Array<
          | { kind: 'dice'; sign: 1 | -1; count: number; sides: number; rolls: number[] }
          | { kind: 'const'; sign: 1 | -1; value: number }
        > = [];

        for (const d of parsed.dice) {
          const rolls = rollDice(d.count, d.sides);
          allItems.push({ kind: 'dice', sign: d.sign, count: d.count, sides: d.sides, rolls });
        }
        for (const c of parsed.constants) {
          allItems.push({ kind: 'const', sign: c.sign, value: c.value });
        }

        for (const item of allItems) {
          if (item.kind === 'dice') {
            const sum = item.rolls.reduce((a, b) => a + b, 0);
            total += item.sign * sum;
            const expr = `${item.count}d${item.sides}`;
            exprDisplay += formatTerm(item.sign, expr, isFirst);
            const detail =
              item.rolls.length === 1
                ? `${item.rolls[0]}`
                : `[${item.rolls.join(', ')}] = ${sum}`;
            lines.push(`  ${item.sign === -1 ? '-' : ''}${expr}: ${detail}`);
          } else {
            total += item.sign * item.value;
            exprDisplay += formatTerm(item.sign, String(item.value), isFirst);
          }
          isFirst = false;
        }

        const header = `${exprDisplay} = ${total}`;
        const text = lines.length > 0 ? `${header}\n${lines.join('\n')}` : header;
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `骰子表达式无效（expression="${expression}"）：${msg}`,
            },
          ],
        };
      }
    },
  );
}
