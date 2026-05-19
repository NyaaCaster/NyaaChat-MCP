import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { parseDndExpression } from '../dice/parser.js';
import { rollDice, rollDie } from '../dice/roller.js';

const ADVANTAGE_LABELS = {
  normal: '普通',
  advantage: '优势',
  disadvantage: '劣势',
} as const;

const TYPE_LABELS = {
  attack: '攻击',
  save: '豁免',
  check: '检定',
  raw: '掷骰',
} as const;

type Advantage = keyof typeof ADVANTAGE_LABELS;
type CheckType = keyof typeof TYPE_LABELS;

function formatModifier(value: number): string {
  if (value === 0) return '';
  return value > 0 ? `+${value}` : `${value}`;
}

export function registerRollDndTool(server: McpServer): void {
  server.registerTool(
    'roll_dnd',
    {
      title: 'DnD 检定',
      description:
        'Roll a D&D 5e d20 check, save, or attack roll. ' +
        'Expression must contain exactly one 1d20 main die plus up to 3 additional terms ' +
        '(constant modifiers and/or extra small dice for effects like Bless/Bane/Bardic Inspiration). ' +
        'Examples: "1d20+5" (basic check), "1d20+5+1d4" (Bless), "1d20+3-1d4" (Bane). ' +
        'For multi-die damage rolls or non-d20 expressions, use roll_dice. ' +
        'Advantage/disadvantage rolls 2d20 and takes the higher/lower. ' +
        'When type is "attack", natural 20 marks a critical hit and natural 1 marks a critical miss. ' +
        'When dc is provided, success/failure is computed against it.',
      inputSchema: {
        expression: z
          .string()
          .min(1)
          .describe(
            'A 1d20 expression with optional modifiers, e.g. "1d20+5", "1d20-2+1d4". ' +
              'Must contain exactly one 1d20; up to 3 extra terms total (constants + extra dice).',
          ),
        advantage: z
          .enum(['normal', 'advantage', 'disadvantage'])
          .optional()
          .describe(
            'Roll mode for the d20: "advantage" rolls 2d20 takes higher, ' +
              '"disadvantage" rolls 2d20 takes lower, "normal" (default) rolls a single d20.',
          ),
        dc: z
          .number()
          .int()
          .optional()
          .describe('Difficulty Class to compare the final total against (optional).'),
        type: z
          .enum(['attack', 'save', 'check', 'raw'])
          .optional()
          .describe(
            'Roll type. "attack" marks natural 20/1 as critical hit/miss; ' +
              '"save" / "check" / "raw" do not flag criticals. Default: "check".',
          ),
      },
    },
    async ({ expression, advantage, dc, type }) => {
      try {
        const parsed = parseDndExpression(expression);
        const adv: Advantage = advantage ?? 'normal';
        const checkType: CheckType = type ?? 'check';

        const d20Rolls: number[] = [];
        let chosen: number;
        if (adv === 'normal') {
          chosen = rollDie(20);
          d20Rolls.push(chosen);
        } else {
          d20Rolls.push(rollDie(20), rollDie(20));
          chosen = adv === 'advantage' ? Math.max(...d20Rolls) : Math.min(...d20Rolls);
        }

        const extraRolls = parsed.extraDice.map((d) => ({
          term: d,
          rolls: rollDice(d.count, d.sides),
        }));

        let total = chosen + parsed.modifier;
        for (const e of extraRolls) {
          const sum = e.rolls.reduce((a, b) => a + b, 0);
          total += e.term.sign * sum;
        }

        const lines: string[] = [];
        lines.push(`DnD ${TYPE_LABELS[checkType]}（${ADVANTAGE_LABELS[adv]}）`);

        if (adv === 'normal') {
          lines.push(`  d20: ${chosen}`);
        } else {
          lines.push(`  d20: ${d20Rolls.join(', ')}  → 取 ${chosen}`);
        }

        if (parsed.modifier !== 0) {
          lines.push(`  修正：${formatModifier(parsed.modifier)}`);
        }
        for (const e of extraRolls) {
          const expr = `${e.term.count}d${e.term.sides}`;
          const sign = e.term.sign === -1 ? '-' : '+';
          const sum = e.rolls.reduce((a, b) => a + b, 0);
          const detail = e.rolls.length === 1 ? `${e.rolls[0]}` : `[${e.rolls.join(', ')}] = ${sum}`;
          lines.push(`  ${sign}${expr}: ${detail}`);
        }

        if (dc !== undefined) {
          const result = total >= dc ? '成功' : '失败';
          lines.push(`  最终：${total} vs DC ${dc} → ${result}`);
        } else {
          lines.push(`  最终：${total}`);
        }

        if (chosen === 20) {
          if (checkType === 'attack') {
            lines.push('  natural: 20  → 大成功（暴击）');
          } else {
            lines.push('  natural: 20');
          }
        } else if (chosen === 1) {
          if (checkType === 'attack') {
            lines.push('  natural: 1  → 大失败（必失）');
          } else {
            lines.push('  natural: 1');
          }
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `DnD 检定失败（expression="${expression}"）：${msg}`,
            },
          ],
        };
      }
    },
  );
}
