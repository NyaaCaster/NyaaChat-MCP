/**
 * Country/region alias → representative city map.
 *
 * Why this exists: QWeather's /geo/v2/city/lookup performs fuzzy text matching
 * over a city database. Country-level inputs either return nothing or — worse —
 * silently match an unrelated city that contains the country's name in a
 * different language (e.g. "美国" → "美国福克, Utah", "China" → "China, Texas").
 * Pre-resolving these inputs to a deliberate "representative city" prevents
 * those silent-mismatch bugs.
 *
 * Picks favor the chat-context "main city" over the strict political capital
 * (e.g. 美国→纽约 not 华盛顿, 加拿大→多伦多 not 渥太华, 澳大利亚→悉尼 not 堪培拉).
 * That tracks how users actually phrase "美国天气" / "加拿大时间" in a chat.
 */

interface CountryEntry {
  aliases: string[];
  city: string;
}

const COUNTRIES: CountryEntry[] = [
  { aliases: ['中国', 'China', 'PRC'], city: '北京' },
  {
    aliases: ['美国', '美利坚', 'America', 'USA', 'US', 'United States', 'United States of America'],
    city: '纽约',
  },
  { aliases: ['日本', 'Japan'], city: '东京' },
  {
    aliases: ['韩国', '南韩', '大韩民国', 'South Korea', 'Korea', 'ROK'],
    city: '首尔',
  },
  {
    aliases: ['英国', '英格兰', 'UK', 'Britain', 'Great Britain', 'England', 'United Kingdom'],
    city: '伦敦',
  },
  { aliases: ['法国', 'France'], city: '巴黎' },
  { aliases: ['德国', 'Germany'], city: '柏林' },
  { aliases: ['俄罗斯', '俄国', 'Russia'], city: '莫斯科' },
  { aliases: ['意大利', 'Italy'], city: '罗马' },
  { aliases: ['西班牙', 'Spain'], city: '马德里' },
  { aliases: ['加拿大', 'Canada'], city: '多伦多' },
  { aliases: ['澳大利亚', '澳洲', 'Australia'], city: '悉尼' },
  { aliases: ['新西兰', 'New Zealand'], city: '奥克兰' },
  { aliases: ['印度', 'India'], city: '新德里' },
  { aliases: ['泰国', 'Thailand'], city: '曼谷' },
  { aliases: ['越南', 'Vietnam'], city: '河内' },
  { aliases: ['马来西亚', 'Malaysia'], city: '吉隆坡' },
  { aliases: ['印尼', '印度尼西亚', 'Indonesia'], city: '雅加达' },
  { aliases: ['菲律宾', 'Philippines'], city: '马尼拉' },
  { aliases: ['新加坡', 'Singapore'], city: '新加坡' },
  { aliases: ['巴西', 'Brazil'], city: '圣保罗' },
  { aliases: ['墨西哥', 'Mexico'], city: '墨西哥城' },
  { aliases: ['阿根廷', 'Argentina'], city: '布宜诺斯艾利斯' },
  { aliases: ['埃及', 'Egypt'], city: '开罗' },
  { aliases: ['南非', 'South Africa'], city: '约翰内斯堡' },
  { aliases: ['荷兰', 'Netherlands', 'Holland'], city: '阿姆斯特丹' },
  { aliases: ['瑞士', 'Switzerland'], city: '苏黎世' },
  { aliases: ['瑞典', 'Sweden'], city: '斯德哥尔摩' },
  { aliases: ['挪威', 'Norway'], city: '奥斯陆' },
  { aliases: ['土耳其', 'Turkey'], city: '伊斯坦布尔' },
  { aliases: ['沙特', '沙特阿拉伯', 'Saudi Arabia'], city: '利雅得' },
  {
    aliases: ['阿联酋', '阿拉伯联合酋长国', 'UAE', 'United Arab Emirates'],
    city: '迪拜',
  },
];

const LOOKUP = new Map<string, string>();
for (const { aliases, city } of COUNTRIES) {
  for (const a of aliases) {
    LOOKUP.set(a.trim().toLowerCase(), city);
  }
}

export function resolveCountryAlias(input: string): string | null {
  return LOOKUP.get(input.trim().toLowerCase()) ?? null;
}
