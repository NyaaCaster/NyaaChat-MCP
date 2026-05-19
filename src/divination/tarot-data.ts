// Rider-Waite-Smith 78 张牌。每张牌正逆位各 3 个关键词，约 6KB 内联。
// 工具只给牌名 + 关键词，解读交给 LLM 用角色口吻完成。
export interface TarotCard {
  id: number;
  nameZh: string;
  nameEn: string;
  arcana: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  upright: readonly string[];
  reversed: readonly string[];
}

export const TAROT_DECK: readonly TarotCard[] = [
  // === Major Arcana 22 张 ===
  { id: 0,  arcana: 'major', nameZh: '愚者',     nameEn: 'The Fool',           upright: ['开始', '自由', '冒险'],          reversed: ['鲁莽', '犹豫', '不切实际'] },
  { id: 1,  arcana: 'major', nameZh: '魔术师',   nameEn: 'The Magician',       upright: ['行动', '创造', '意志'],          reversed: ['操控', '拖延', '自欺'] },
  { id: 2,  arcana: 'major', nameZh: '女祭司',   nameEn: 'The High Priestess', upright: ['直觉', '神秘', '静观'],          reversed: ['压抑', '误读', '隐瞒'] },
  { id: 3,  arcana: 'major', nameZh: '皇后',     nameEn: 'The Empress',        upright: ['丰饶', '母性', '孕育'],          reversed: ['依赖', '停滞', '失衡'] },
  { id: 4,  arcana: 'major', nameZh: '皇帝',     nameEn: 'The Emperor',        upright: ['权威', '秩序', '稳固'],          reversed: ['专横', '僵化', '失控'] },
  { id: 5,  arcana: 'major', nameZh: '教皇',     nameEn: 'The Hierophant',     upright: ['传统', '信念', '教导'],          reversed: ['墨守', '反叛', '迷失'] },
  { id: 6,  arcana: 'major', nameZh: '恋人',     nameEn: 'The Lovers',         upright: ['契合', '抉择', '联结'],          reversed: ['失和', '三角', '价值偏差'] },
  { id: 7,  arcana: 'major', nameZh: '战车',     nameEn: 'The Chariot',        upright: ['胜利', '决心', '自律'],          reversed: ['失控', '内耗', '偏航'] },
  { id: 8,  arcana: 'major', nameZh: '力量',     nameEn: 'Strength',           upright: ['勇气', '内在力', '温柔克刚'],    reversed: ['怯弱', '滥用力量', '放任'] },
  { id: 9,  arcana: 'major', nameZh: '隐者',     nameEn: 'The Hermit',         upright: ['内省', '引导', '独处'],          reversed: ['孤立', '拒绝建议', '迷茫'] },
  { id: 10, arcana: 'major', nameZh: '命运之轮', nameEn: 'Wheel of Fortune',   upright: ['转机', '命运', '周期'],          reversed: ['逆转', '失运', '抗拒变化'] },
  { id: 11, arcana: 'major', nameZh: '正义',     nameEn: 'Justice',            upright: ['公正', '因果', '抉择'],          reversed: ['偏颇', '推诿', '失衡'] },
  { id: 12, arcana: 'major', nameZh: '倒吊人',   nameEn: 'The Hanged Man',     upright: ['暂停', '牺牲', '换视角'],        reversed: ['拖延', '无谓牺牲', '困住'] },
  { id: 13, arcana: 'major', nameZh: '死神',     nameEn: 'Death',              upright: ['结束', '转化', '重生'],          reversed: ['抗拒', '停滞', '错失蜕变'] },
  { id: 14, arcana: 'major', nameZh: '节制',     nameEn: 'Temperance',         upright: ['调和', '平衡', '耐心'],          reversed: ['失衡', '冲突', '急躁'] },
  { id: 15, arcana: 'major', nameZh: '恶魔',     nameEn: 'The Devil',          upright: ['束缚', '欲望', '阴影'],          reversed: ['解脱', '觉醒', '释放'] },
  { id: 16, arcana: 'major', nameZh: '高塔',     nameEn: 'The Tower',          upright: ['剧变', '崩塌', '突破幻象'],      reversed: ['勉强支撑', '灾难前夜', '拒绝面对'] },
  { id: 17, arcana: 'major', nameZh: '星星',     nameEn: 'The Star',           upright: ['希望', '治愈', '灵感'],          reversed: ['失望', '信念动摇', '干涸'] },
  { id: 18, arcana: 'major', nameZh: '月亮',     nameEn: 'The Moon',           upright: ['迷雾', '潜意识', '不安'],        reversed: ['澄清', '释怀', '真相浮现'] },
  { id: 19, arcana: 'major', nameZh: '太阳',     nameEn: 'The Sun',            upright: ['喜悦', '成功', '活力'],          reversed: ['暂时阴霾', '自满', '延迟'] },
  { id: 20, arcana: 'major', nameZh: '审判',     nameEn: 'Judgement',          upright: ['觉醒', '召唤', '重判'],          reversed: ['自责', '拖延决断', '错过觉醒'] },
  { id: 21, arcana: 'major', nameZh: '世界',     nameEn: 'The World',          upright: ['圆满', '成就', '完成'],          reversed: ['未竟', '拖延圆满', '收尾困难'] },

  // === Minor Arcana — Wands 权杖 14 张 ===
  { id: 22, arcana: 'minor', suit: 'wands', nameZh: '权杖一',     nameEn: 'Ace of Wands',        upright: ['灵感', '新机', '契机'],         reversed: ['延误', '熄火', '方向不明'] },
  { id: 23, arcana: 'minor', suit: 'wands', nameZh: '权杖二',     nameEn: 'Two of Wands',        upright: ['规划', '远眺', '抉择'],         reversed: ['犹豫', '局限', '失策'] },
  { id: 24, arcana: 'minor', suit: 'wands', nameZh: '权杖三',     nameEn: 'Three of Wands',      upright: ['远见', '扩展', '出航'],         reversed: ['失算', '受阻', '视野狭窄'] },
  { id: 25, arcana: 'minor', suit: 'wands', nameZh: '权杖四',     nameEn: 'Four of Wands',       upright: ['庆祝', '安居', '和谐'],         reversed: ['不稳', '挫折', '家事不和'] },
  { id: 26, arcana: 'minor', suit: 'wands', nameZh: '权杖五',     nameEn: 'Five of Wands',       upright: ['竞争', '冲突', '磨合'],         reversed: ['内讧', '止争', '避战'] },
  { id: 27, arcana: 'minor', suit: 'wands', nameZh: '权杖六',     nameEn: 'Six of Wands',        upright: ['凯旋', '认可', '荣耀'],         reversed: ['自负', '落空', '口碑下滑'] },
  { id: 28, arcana: 'minor', suit: 'wands', nameZh: '权杖七',     nameEn: 'Seven of Wands',      upright: ['坚守', '捍卫', '抗压'],         reversed: ['退让', '寡不敌众', '疲于招架'] },
  { id: 29, arcana: 'minor', suit: 'wands', nameZh: '权杖八',     nameEn: 'Eight of Wands',      upright: ['迅速', '进展', '消息'],         reversed: ['拖沓', '失序', '卡住'] },
  { id: 30, arcana: 'minor', suit: 'wands', nameZh: '权杖九',     nameEn: 'Nine of Wands',       upright: ['警惕', '防御', '坚毅'],         reversed: ['多疑', '僵持', '被动'] },
  { id: 31, arcana: 'minor', suit: 'wands', nameZh: '权杖十',     nameEn: 'Ten of Wands',        upright: ['重负', '超载', '责任'],         reversed: ['卸下', '认清边界', '放手'] },
  { id: 32, arcana: 'minor', suit: 'wands', nameZh: '权杖侍从',   nameEn: 'Page of Wands',       upright: ['探索', '热忱', '学徒'],         reversed: ['浮躁', '三分钟热度', '空话'] },
  { id: 33, arcana: 'minor', suit: 'wands', nameZh: '权杖骑士',   nameEn: 'Knight of Wands',     upright: ['冲劲', '行动', '远征'],         reversed: ['鲁莽', '拖延', '无定性'] },
  { id: 34, arcana: 'minor', suit: 'wands', nameZh: '权杖王后',   nameEn: 'Queen of Wands',      upright: ['自信', '魅力', '生机'],         reversed: ['嫉妒', '控制欲', '虚荣'] },
  { id: 35, arcana: 'minor', suit: 'wands', nameZh: '权杖国王',   nameEn: 'King of Wands',       upright: ['领导', '远见', '果断'],         reversed: ['专断', '暴躁', '草率'] },

  // === Minor Arcana — Cups 圣杯 14 张 ===
  { id: 36, arcana: 'minor', suit: 'cups', nameZh: '圣杯一',      nameEn: 'Ace of Cups',         upright: ['心动', '恩典', '灵性'],         reversed: ['情感受阻', '枯竭', '封闭'] },
  { id: 37, arcana: 'minor', suit: 'cups', nameZh: '圣杯二',      nameEn: 'Two of Cups',         upright: ['联结', '契合', '伙伴'],         reversed: ['失和', '分离', '错配'] },
  { id: 38, arcana: 'minor', suit: 'cups', nameZh: '圣杯三',      nameEn: 'Three of Cups',       upright: ['庆祝', '友谊', '团聚'],         reversed: ['过度', '八卦', '浮华散场'] },
  { id: 39, arcana: 'minor', suit: 'cups', nameZh: '圣杯四',      nameEn: 'Four of Cups',        upright: ['倦怠', '沉思', '视而不见'],     reversed: ['重燃兴趣', '接受邀请', '觉察'] },
  { id: 40, arcana: 'minor', suit: 'cups', nameZh: '圣杯五',      nameEn: 'Five of Cups',        upright: ['失落', '悲伤', '未竟'],         reversed: ['释怀', '重启', '看见剩余'] },
  { id: 41, arcana: 'minor', suit: 'cups', nameZh: '圣杯六',      nameEn: 'Six of Cups',         upright: ['怀旧', '纯真', '旧友'],         reversed: ['沉溺过去', '分离', '向前看'] },
  { id: 42, arcana: 'minor', suit: 'cups', nameZh: '圣杯七',      nameEn: 'Seven of Cups',       upright: ['选择', '幻象', '迷雾'],         reversed: ['厘清', '抉择', '落地'] },
  { id: 43, arcana: 'minor', suit: 'cups', nameZh: '圣杯八',      nameEn: 'Eight of Cups',       upright: ['离弃', '启程', '寻心'],         reversed: ['徘徊', '将走未走', '逃避'] },
  { id: 44, arcana: 'minor', suit: 'cups', nameZh: '圣杯九',      nameEn: 'Nine of Cups',        upright: ['满足', '愿成', '小确幸'],       reversed: ['浅尝', '虚荣', '未真满足'] },
  { id: 45, arcana: 'minor', suit: 'cups', nameZh: '圣杯十',      nameEn: 'Ten of Cups',         upright: ['圆满', '家庭', '和乐'],         reversed: ['失谐', '家事不顺', '价值落空'] },
  { id: 46, arcana: 'minor', suit: 'cups', nameZh: '圣杯侍从',    nameEn: 'Page of Cups',        upright: ['灵感', '敏感', '讯息'],         reversed: ['任性', '情绪化', '幼稚'] },
  { id: 47, arcana: 'minor', suit: 'cups', nameZh: '圣杯骑士',    nameEn: 'Knight of Cups',      upright: ['浪漫', '邀约', '追梦'],         reversed: ['摇摆', '虚情', '拖延'] },
  { id: 48, arcana: 'minor', suit: 'cups', nameZh: '圣杯王后',    nameEn: 'Queen of Cups',       upright: ['共情', '温柔', '直觉'],         reversed: ['情绪化', '过度依附', '混乱'] },
  { id: 49, arcana: 'minor', suit: 'cups', nameZh: '圣杯国王',    nameEn: 'King of Cups',        upright: ['沉稳', '包容', '智慧'],         reversed: ['阴沉', '操控', '逃避情感'] },

  // === Minor Arcana — Swords 宝剑 14 张 ===
  { id: 50, arcana: 'minor', suit: 'swords', nameZh: '宝剑一',    nameEn: 'Ace of Swords',       upright: ['真相', '突破', '清晰'],         reversed: ['混乱', '谬误', '沟通失败'] },
  { id: 51, arcana: 'minor', suit: 'swords', nameZh: '宝剑二',    nameEn: 'Two of Swords',       upright: ['僵局', '回避', '抉择'],         reversed: ['打破僵局', '直面', '释怀'] },
  { id: 52, arcana: 'minor', suit: 'swords', nameZh: '宝剑三',    nameEn: 'Three of Swords',     upright: ['心痛', '背叛', '决裂'],         reversed: ['愈合', '原谅', '释怀'] },
  { id: 53, arcana: 'minor', suit: 'swords', nameZh: '宝剑四',    nameEn: 'Four of Swords',      upright: ['休整', '沉静', '复元'],         reversed: ['倦怠', '僵化', '拒绝休息'] },
  { id: 54, arcana: 'minor', suit: 'swords', nameZh: '宝剑五',    nameEn: 'Five of Swords',      upright: ['胜之不武', '争吵', '分裂'],     reversed: ['和解', '止损', '放下争胜'] },
  { id: 55, arcana: 'minor', suit: 'swords', nameZh: '宝剑六',    nameEn: 'Six of Swords',       upright: ['离开', '过渡', '平静水路'],     reversed: ['滞留', '未走', '被困'] },
  { id: 56, arcana: 'minor', suit: 'swords', nameZh: '宝剑七',    nameEn: 'Seven of Swords',     upright: ['算计', '隐瞒', '巧取'],         reversed: ['坦白', '被识破', '物归原主'] },
  { id: 57, arcana: 'minor', suit: 'swords', nameZh: '宝剑八',    nameEn: 'Eight of Swords',     upright: ['困缚', '自限', '盲点'],         reversed: ['自由', '觉察', '打破束缚'] },
  { id: 58, arcana: 'minor', suit: 'swords', nameZh: '宝剑九',    nameEn: 'Nine of Swords',      upright: ['焦虑', '失眠', '恶念'],         reversed: ['缓解', '求助', '曙光'] },
  { id: 59, arcana: 'minor', suit: 'swords', nameZh: '宝剑十',    nameEn: 'Ten of Swords',       upright: ['终结', '谷底', '重伤'],         reversed: ['重生', '见底反弹', '创伤愈合'] },
  { id: 60, arcana: 'minor', suit: 'swords', nameZh: '宝剑侍从',  nameEn: 'Page of Swords',      upright: ['警觉', '求知', '锐利'],         reversed: ['多嘴', '苛刻', '草率言论'] },
  { id: 61, arcana: 'minor', suit: 'swords', nameZh: '宝剑骑士',  nameEn: 'Knight of Swords',    upright: ['急行', '果断', '直冲'],         reversed: ['鲁莽', '伤人', '暴走'] },
  { id: 62, arcana: 'minor', suit: 'swords', nameZh: '宝剑王后',  nameEn: 'Queen of Swords',     upright: ['清醒', '独立', '明辨'],         reversed: ['冷漠', '苛刻', '孤傲'] },
  { id: 63, arcana: 'minor', suit: 'swords', nameZh: '宝剑国王',  nameEn: 'King of Swords',      upright: ['理性', '公正', '智识'],         reversed: ['专断', '冷酷', '操控言辞'] },

  // === Minor Arcana — Pentacles 星币 14 张 ===
  { id: 64, arcana: 'minor', suit: 'pentacles', nameZh: '星币一',     nameEn: 'Ace of Pentacles',    upright: ['机遇', '财源', '根基'],     reversed: ['落空', '贪求', '根基不稳'] },
  { id: 65, arcana: 'minor', suit: 'pentacles', nameZh: '星币二',     nameEn: 'Two of Pentacles',    upright: ['平衡', '兼顾', '灵活'],     reversed: ['失衡', '分心', '手忙脚乱'] },
  { id: 66, arcana: 'minor', suit: 'pentacles', nameZh: '星币三',     nameEn: 'Three of Pentacles',  upright: ['协作', '匠艺', '初成'],     reversed: ['分歧', '品控差', '各行其是'] },
  { id: 67, arcana: 'minor', suit: 'pentacles', nameZh: '星币四',     nameEn: 'Four of Pentacles',   upright: ['守成', '谨慎', '积累'],     reversed: ['吝啬', '恐惧', '失财'] },
  { id: 68, arcana: 'minor', suit: 'pentacles', nameZh: '星币五',     nameEn: 'Five of Pentacles',   upright: ['困窘', '匮乏', '外排'],     reversed: ['复元', '求助见曙', '转机'] },
  { id: 69, arcana: 'minor', suit: 'pentacles', nameZh: '星币六',     nameEn: 'Six of Pentacles',    upright: ['给予', '分享', '施受'],     reversed: ['不公', '操控施恩', '单向'] },
  { id: 70, arcana: 'minor', suit: 'pentacles', nameZh: '星币七',     nameEn: 'Seven of Pentacles',  upright: ['沉淀', '评估', '等待'],     reversed: ['不耐', '失策', '收益不足'] },
  { id: 71, arcana: 'minor', suit: 'pentacles', nameZh: '星币八',     nameEn: 'Eight of Pentacles',  upright: ['勤勉', '专注', '精进'],     reversed: ['敷衍', '失神', '品质滑坡'] },
  { id: 72, arcana: 'minor', suit: 'pentacles', nameZh: '星币九',     nameEn: 'Nine of Pentacles',   upright: ['自得', '优裕', '独立'],     reversed: ['浮华', '孤独', '虚荣'] },
  { id: 73, arcana: 'minor', suit: 'pentacles', nameZh: '星币十',     nameEn: 'Ten of Pentacles',    upright: ['富足', '家业', '传承'],     reversed: ['家道纠纷', '失财', '价值落空'] },
  { id: 74, arcana: 'minor', suit: 'pentacles', nameZh: '星币侍从',   nameEn: 'Page of Pentacles',   upright: ['学徒', '务实', '起步'],     reversed: ['浮躁', '拖延', '眼高手低'] },
  { id: 75, arcana: 'minor', suit: 'pentacles', nameZh: '星币骑士',   nameEn: 'Knight of Pentacles', upright: ['稳健', '责任', '坚毅'],     reversed: ['呆板', '停滞', '苛细'] },
  { id: 76, arcana: 'minor', suit: 'pentacles', nameZh: '星币王后',   nameEn: 'Queen of Pentacles',  upright: ['丰饶', '务实', '照料'],     reversed: ['占有', '物欲', '疏于自身'] },
  { id: 77, arcana: 'minor', suit: 'pentacles', nameZh: '星币国王',   nameEn: 'King of Pentacles',   upright: ['富足', '掌局', '慷慨'],     reversed: ['守财', '僵化', '拜金'] },
];

if (TAROT_DECK.length !== 78) {
  throw new Error(`Tarot deck must have 78 cards, got ${TAROT_DECK.length}`);
}

export interface SpreadDef {
  size: number;
  positions: readonly string[];
}

export const SPREADS: Record<'single' | 'three' | 'celtic', SpreadDef> = {
  single: { size: 1, positions: ['核心'] },
  three: { size: 3, positions: ['过去', '现在', '未来'] },
  celtic: {
    size: 10,
    positions: [
      '当下处境',     // 1
      '横亘的挑战',   // 2 (cross)
      '潜意识根基',   // 3
      '过去',         // 4
      '可能的未来',   // 5
      '近期发展',     // 6
      '自身态度',     // 7
      '外在影响',     // 8
      '希望与恐惧',   // 9
      '最终结果',     // 10
    ],
  },
};
