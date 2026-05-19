import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { rollDie } from '../dice/roller.js';
import { GRADE_HINT, gradeOf } from '../divination/qian-data.js';

export function registerDrawQianTool(server: McpServer): void {
  server.registerTool(
    'draw_qian',
    {
      title: '抽签',
      description:
        'Draw a Guan Yu fortune stick (关帝灵签) numbered 1-100. ' +
        'Each stick is mapped to one of five fortune grades: 上上 / 上吉 / 中吉 / 中平 / 下下. ' +
        'The grade distribution roughly follows the traditional ratio (10/20/30/25/15) but the ' +
        'exact stick-to-grade mapping is project-internal — the tool does NOT return the canonical ' +
        'four-line poem or detailed interpretation, since those vary by tradition and the project ' +
        'declines to ship a possibly-wrong version. The LLM is expected to use its own cultural ' +
        'knowledge to weave a reading from the stick number, grade, and optional question. ' +
        'No input parameters required (a question can be supplied for narrative context).',
      inputSchema: {},
    },
    async () => {
      const num = rollDie(100);
      const grade = gradeOf(num);
      const hint = GRADE_HINT[grade];

      const out = [
        `关帝灵签 · 第 ${num} 签`,
        `等级：${grade}`,
        `通用指引：${hint}`,
        '',
        '（项目内置摘录版：仅返回签号与等级，签诗 / 签解请由 LLM 依文化背景演绎；',
        '具体签号到签诗的对应关系版本众多，本项目不内置以避免误导。）',
      ];

      return { content: [{ type: 'text', text: out.join('\n') }] };
    },
  );
}
