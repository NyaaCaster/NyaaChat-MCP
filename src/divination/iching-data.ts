// Binary index 0-63 → I Ching hexagram. Index encoding: lower trigram in low 3 bits,
// upper trigram in high 3 bits. Trigram bits (bit0=lowest line, bit2=top line of trigram):
// 坤 0, 震 1, 坎 2, 兑 3, 艮 4, 离 5, 巽 6, 乾 7. Each entry's `seq` is the King Wen sequence (1-64).
// The Unicode hexagram character is at U+4DC0 + (seq - 1).
export interface Hexagram {
  seq: number;
  name: string;
}

export const HEXAGRAMS: readonly Hexagram[] = [
  { seq: 2,  name: '坤' },   // 0
  { seq: 24, name: '复' },   // 1
  { seq: 7,  name: '师' },   // 2
  { seq: 19, name: '临' },   // 3
  { seq: 15, name: '谦' },   // 4
  { seq: 36, name: '明夷' }, // 5
  { seq: 46, name: '升' },   // 6
  { seq: 11, name: '泰' },   // 7
  { seq: 16, name: '豫' },   // 8
  { seq: 51, name: '震' },   // 9
  { seq: 40, name: '解' },   // 10
  { seq: 54, name: '归妹' }, // 11
  { seq: 62, name: '小过' }, // 12
  { seq: 55, name: '丰' },   // 13
  { seq: 32, name: '恒' },   // 14
  { seq: 34, name: '大壮' }, // 15
  { seq: 8,  name: '比' },   // 16
  { seq: 3,  name: '屯' },   // 17
  { seq: 29, name: '坎' },   // 18
  { seq: 60, name: '节' },   // 19
  { seq: 39, name: '蹇' },   // 20
  { seq: 63, name: '既济' }, // 21
  { seq: 48, name: '井' },   // 22
  { seq: 5,  name: '需' },   // 23
  { seq: 45, name: '萃' },   // 24
  { seq: 17, name: '随' },   // 25
  { seq: 47, name: '困' },   // 26
  { seq: 58, name: '兑' },   // 27
  { seq: 31, name: '咸' },   // 28
  { seq: 49, name: '革' },   // 29
  { seq: 28, name: '大过' }, // 30
  { seq: 43, name: '夬' },   // 31
  { seq: 23, name: '剥' },   // 32
  { seq: 27, name: '颐' },   // 33
  { seq: 4,  name: '蒙' },   // 34
  { seq: 41, name: '损' },   // 35
  { seq: 52, name: '艮' },   // 36
  { seq: 22, name: '贲' },   // 37
  { seq: 18, name: '蛊' },   // 38
  { seq: 26, name: '大畜' }, // 39
  { seq: 35, name: '晋' },   // 40
  { seq: 21, name: '噬嗑' }, // 41
  { seq: 64, name: '未济' }, // 42
  { seq: 38, name: '睽' },   // 43
  { seq: 56, name: '旅' },   // 44
  { seq: 30, name: '离' },   // 45
  { seq: 50, name: '鼎' },   // 46
  { seq: 14, name: '大有' }, // 47
  { seq: 20, name: '观' },   // 48
  { seq: 42, name: '益' },   // 49
  { seq: 59, name: '涣' },   // 50
  { seq: 61, name: '中孚' }, // 51
  { seq: 53, name: '渐' },   // 52
  { seq: 37, name: '家人' }, // 53
  { seq: 57, name: '巽' },   // 54
  { seq: 9,  name: '小畜' }, // 55
  { seq: 12, name: '否' },   // 56
  { seq: 25, name: '无妄' }, // 57
  { seq: 6,  name: '讼' },   // 58
  { seq: 10, name: '履' },   // 59
  { seq: 33, name: '遁' },   // 60
  { seq: 13, name: '同人' }, // 61
  { seq: 44, name: '姤' },   // 62
  { seq: 1,  name: '乾' },   // 63
];

export function hexagramSymbol(seq: number): string {
  return String.fromCodePoint(0x4dc0 + seq - 1);
}
