export interface DiceTerm {
  count: number;
  sides: number;
  sign: 1 | -1;
}

export interface ConstantTerm {
  value: number;
  sign: 1 | -1;
}

export interface ParsedExpression {
  dice: DiceTerm[];
  constants: ConstantTerm[];
  raw: string;
}

const DICE_LIMITS = {
  maxCount: 100,
  maxSides: 1000,
} as const;

const TERM_PATTERN = /^([+-])?(\d+)(?:[dD](\d+))?$/;

function tokenize(expr: string): string[] {
  const cleaned = expr.replace(/\s+/g, '');
  if (!cleaned) {
    throw new Error('表达式为空');
  }
  const tokens: string[] = [];
  let buf = '';
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if ((ch === '+' || ch === '-') && buf.length > 0) {
      tokens.push(buf);
      buf = ch;
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

export function parseDiceExpression(expr: string): ParsedExpression {
  const tokens = tokenize(expr);
  const dice: DiceTerm[] = [];
  const constants: ConstantTerm[] = [];

  for (const token of tokens) {
    const match = TERM_PATTERN.exec(token);
    if (!match) {
      throw new Error(`无法解析片段 "${token}"`);
    }
    const [, signStr, numStr, sidesStr] = match;
    const sign: 1 | -1 = signStr === '-' ? -1 : 1;
    const num = Number.parseInt(numStr, 10);

    if (sidesStr !== undefined) {
      const sides = Number.parseInt(sidesStr, 10);
      if (num < 1) throw new Error(`骰子数量必须 ≥ 1，收到 ${num}`);
      if (sides < 1) throw new Error(`骰面数必须 ≥ 1，收到 ${sides}`);
      if (num > DICE_LIMITS.maxCount) {
        throw new Error(`骰子数量上限 ${DICE_LIMITS.maxCount}，收到 ${num}`);
      }
      if (sides > DICE_LIMITS.maxSides) {
        throw new Error(`骰面数上限 ${DICE_LIMITS.maxSides}，收到 ${sides}`);
      }
      dice.push({ count: num, sides, sign });
    } else {
      constants.push({ value: num, sign });
    }
  }

  if (dice.length === 0 && constants.length === 0) {
    throw new Error('表达式必须至少包含一项');
  }

  return { dice, constants, raw: expr };
}

export interface DndExpression {
  d20: { sign: 1 };
  modifier: number;
  extraDice: DiceTerm[];
  raw: string;
}

const DND_EXTRA_LIMIT = 3;

export function parseDndExpression(expr: string): DndExpression {
  const parsed = parseDiceExpression(expr);

  const d20Terms = parsed.dice.filter((d) => d.sides === 20);
  if (d20Terms.length !== 1) {
    throw new Error('DnD 检定表达式必须恰好包含一个 d20 主骰');
  }
  const d20 = d20Terms[0];
  if (d20.count !== 1 || d20.sign !== 1) {
    throw new Error('DnD 检定表达式的主骰必须是 +1d20');
  }

  const extraDice = parsed.dice.filter((d) => d !== d20);
  const totalExtraTerms = extraDice.length + parsed.constants.length;
  if (totalExtraTerms > DND_EXTRA_LIMIT) {
    throw new Error(
      `DnD 表达式额外项（常数 + 额外骰）总数上限 ${DND_EXTRA_LIMIT}，收到 ${totalExtraTerms}`,
    );
  }

  const modifier = parsed.constants.reduce((acc, c) => acc + c.sign * c.value, 0);

  return {
    d20: { sign: 1 },
    modifier,
    extraDice,
    raw: expr,
  };
}
