// 关帝灵签 100 签的等级映射（项目内置版本）。
// 等级分布大致参照传统比例：上上 10 / 上吉 20 / 中吉 30 / 中平 25 / 下下 15。
// 具体到每签的等级是项目内置分配，不一定与某个特定祠庙流派的版本完全一致；
// 项目不内置签诗 / 签解，那部分留给 LLM 用文化常识发挥（避免给错版本误导用户）。
export type QianGrade = '上上' | '上吉' | '中吉' | '中平' | '下下';

const RAW: Record<QianGrade, readonly number[]> = {
  上上: [1, 13, 27, 33, 41, 50, 58, 67, 78, 91],
  上吉: [4, 7, 10, 16, 20, 24, 30, 36, 39, 45, 48, 53, 60, 64, 70, 75, 82, 87, 95, 99],
  中吉: [
    2, 5, 6, 9, 14, 17, 19, 23, 26, 31, 34, 35, 38, 43, 46, 49, 51, 54, 57, 62,
    65, 69, 72, 73, 76, 80, 84, 88, 92, 96,
  ],
  中平: [
    3, 8, 12, 15, 18, 21, 25, 28, 32, 37, 40, 44, 47, 52, 56, 59, 63, 66, 71, 74,
    79, 83, 86, 89, 93,
  ],
  下下: [11, 22, 29, 42, 55, 61, 68, 77, 81, 85, 90, 94, 97, 98, 100],
};

const GRADE_BY_NUMBER: Record<number, QianGrade> = (() => {
  const map: Record<number, QianGrade> = {};
  (Object.keys(RAW) as QianGrade[]).forEach((grade) => {
    for (const n of RAW[grade]) map[n] = grade;
  });
  for (let i = 1; i <= 100; i++) {
    if (!(i in map)) throw new Error(`签 ${i} 未分配等级`);
  }
  return map;
})();

export function gradeOf(num: number): QianGrade {
  return GRADE_BY_NUMBER[num];
}

export const GRADE_HINT: Record<QianGrade, string> = {
  上上: '吉祥如意，谋望可成，宜进取。',
  上吉: '诸事顺遂，得贵人相助，宜把握时机。',
  中吉: '稳中有进，须循规矩，不可强求。',
  中平: '平淡无奇，安守本分，待时而动。',
  下下: '诸事不利，宜静守谨慎，避险为上。',
};
