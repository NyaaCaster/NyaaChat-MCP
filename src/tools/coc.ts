import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { rollDie } from '../dice/roller.js';

interface RollOutcome {
  ones: number;
  tensRolls: number[];
  chosenTens: number;
  result: number;
}

function combine(tens: number, ones: number): number {
  if (tens === 0 && ones === 0) return 100;
  return tens * 10 + ones;
}

function rollD100WithBonusPenalty(bonus: number, penalty: number): RollOutcome {
  const ones = rollDie(10) - 1;
  const totalTens = 1 + bonus + penalty;
  const tensRolls: number[] = [];
  for (let i = 0; i < totalTens; i++) {
    tensRolls.push(rollDie(10) - 1);
  }

  const candidates = tensRolls.map((t) => ({ tens: t, value: combine(t, ones) }));

  let chosen: { tens: number; value: number };
  if (bonus > 0) {
    chosen = candidates.reduce((best, cur) => (cur.value < best.value ? cur : best));
  } else if (penalty > 0) {
    chosen = candidates.reduce((worst, cur) => (cur.value > worst.value ? cur : worst));
  } else {
    chosen = candidates[0];
  }

  return {
    ones,
    tensRolls,
    chosenTens: chosen.tens,
    result: chosen.value,
  };
}

interface SuccessLevel {
  label: string;
  threshold: string;
}

function judge(result: number, skill: number): SuccessLevel {
  const hardThreshold = Math.floor(skill / 2);
  const extremeThreshold = Math.floor(skill / 5);
  const fumbleMin = skill < 50 ? 96 : 100;

  if (result === 1) return { label: '大成功', threshold: '=1' };
  if (result >= fumbleMin) {
    return {
      label: '大失败',
      threshold: skill < 50 ? '≥96（技能<50）' : '=100',
    };
  }
  if (result <= extremeThreshold) return { label: '极难成功', threshold: `≤${extremeThreshold}` };
  if (result <= hardThreshold) return { label: '困难成功', threshold: `≤${hardThreshold}` };
  if (result <= skill) return { label: '普通成功', threshold: `≤${skill}` };
  return { label: '失败', threshold: `>${skill}` };
}

export function registerRollCocTool(server: McpServer): void {
  server.registerTool(
    'roll_coc',
    {
      title: 'CoC 检定',
      description:
        'Roll a Call of Cthulhu 7th edition skill check (d100 percentile, lower is better). ' +
        'Result is judged against the skill value with these levels: ' +
        'Critical Success (=1), Extreme Success (≤skill/5), Hard Success (≤skill/2), ' +
        'Regular Success (≤skill), Failure (>skill), Fumble (=100 when skill≥50, else 96-100). ' +
        'Bonus dice roll extra tens dice and take the most favorable (lowest) combined result. ' +
        'Penalty dice roll extra tens dice and take the least favorable (highest). ' +
        'Bonus and penalty are mutually exclusive. ' +
        'For damage/sanity-loss rolls or other non-percentile dice, use roll_dice instead.',
      inputSchema: {
        skill: z
          .number()
          .int()
          .min(1)
          .max(200)
          .describe('Skill value to test against, typically 1-99 (allowed up to 200 for buffed skills).'),
        bonus: z
          .number()
          .int()
          .min(0)
          .max(2)
          .optional()
          .describe('Number of bonus dice (0-2). Mutually exclusive with penalty.'),
        penalty: z
          .number()
          .int()
          .min(0)
          .max(2)
          .optional()
          .describe('Number of penalty dice (0-2). Mutually exclusive with bonus.'),
      },
    },
    async ({ skill, bonus, penalty }) => {
      const b = bonus ?? 0;
      const p = penalty ?? 0;

      if (b > 0 && p > 0) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `CoC 检定失败：奖励骰（bonus=${b}）与惩罚骰（penalty=${p}）不能同时使用。`,
            },
          ],
        };
      }

      const outcome = rollD100WithBonusPenalty(b, p);
      const level = judge(outcome.result, skill);

      const hardT = Math.floor(skill / 2);
      const extremeT = Math.floor(skill / 5);
      const fumbleDesc = skill < 50 ? '96-100' : '=100';

      const modifierTag =
        b > 0 ? `奖励骰 ×${b}` : p > 0 ? `惩罚骰 ×${p}` : '无加成';

      const tensDisplay = outcome.tensRolls
        .map((t) => `${t}${t === outcome.chosenTens ? '*' : ''}`)
        .join(', ');

      const resultDisplay = outcome.result === 100 ? '100' : String(outcome.result).padStart(2, '0');

      const lines = [
        `CoC 技能检定（技能值 ${skill}，${modifierTag}）`,
        `  十位骰：${tensDisplay}${outcome.tensRolls.length > 1 ? `  → 取 ${outcome.chosenTens}` : ''}`,
        `  个位骰：${outcome.ones}`,
        `  最终：${resultDisplay}`,
        `  判定：${level.label}（${level.threshold}）`,
        `  阈值参考：普通 ≤${skill} / 困难 ≤${hardT} / 极难 ≤${extremeT} / 大成功 =1 / 大失败 ${fumbleDesc}`,
      ];

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );
}
