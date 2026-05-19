import { randomInt } from 'node:crypto';

export function rollDie(sides: number): number {
  if (!Number.isInteger(sides) || sides < 1) {
    throw new Error(`骰面数必须为正整数，收到 ${sides}`);
  }
  return randomInt(1, sides + 1);
}

export function rollDice(count: number, sides: number): number[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`骰子数量必须为正整数，收到 ${count}`);
  }
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    result.push(rollDie(sides));
  }
  return result;
}
