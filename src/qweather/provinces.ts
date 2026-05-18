/**
 * China province-level region → standard capital city map.
 *
 * Why this exists: QWeather GeoAPI does not have province-level entries, so a
 * raw "广西" lookup returns the first fuzzy match (实测落到 "桂林 / 全州" 而非
 * 南宁). Pre-resolving province names to their conventional 省会/首府 produces
 * the expected behavior for chat queries like "广西天气" / "四川时间".
 *
 * Coverage: all 34 province-level administrative divisions:
 *   4 直辖市 (self-mapping), 23 省 (省会), 5 自治区 (首府),
 *   2 特别行政区 (self-mapping), 台湾 (台北).
 *
 * Picks follow standard administrative convention — no editorial choice
 * involved like the country table. e.g. 山东→济南 (not 青岛, even though
 * 青岛 is more famous), since 济南 is the official 省会.
 */

interface ProvinceEntry {
  aliases: string[];
  city: string;
}

const PROVINCES: ProvinceEntry[] = [
  // 4 直辖市 — self-mapping (保留入表方便统一 alias 处理)
  { aliases: ['北京', '北京市'], city: '北京' },
  { aliases: ['上海', '上海市'], city: '上海' },
  { aliases: ['天津', '天津市'], city: '天津' },
  { aliases: ['重庆', '重庆市'], city: '重庆' },

  // 23 省 → 省会
  { aliases: ['河北', '河北省'], city: '石家庄' },
  { aliases: ['山西', '山西省'], city: '太原' },
  { aliases: ['辽宁', '辽宁省'], city: '沈阳' },
  { aliases: ['吉林', '吉林省'], city: '长春' },
  { aliases: ['黑龙江', '黑龙江省'], city: '哈尔滨' },
  { aliases: ['江苏', '江苏省'], city: '南京' },
  { aliases: ['浙江', '浙江省'], city: '杭州' },
  { aliases: ['安徽', '安徽省'], city: '合肥' },
  { aliases: ['福建', '福建省'], city: '福州' },
  { aliases: ['江西', '江西省'], city: '南昌' },
  { aliases: ['山东', '山东省'], city: '济南' },
  { aliases: ['河南', '河南省'], city: '郑州' },
  { aliases: ['湖北', '湖北省'], city: '武汉' },
  { aliases: ['湖南', '湖南省'], city: '长沙' },
  { aliases: ['广东', '广东省'], city: '广州' },
  { aliases: ['海南', '海南省'], city: '海口' },
  { aliases: ['四川', '四川省'], city: '成都' },
  { aliases: ['贵州', '贵州省'], city: '贵阳' },
  { aliases: ['云南', '云南省'], city: '昆明' },
  { aliases: ['陕西', '陕西省'], city: '西安' },
  { aliases: ['甘肃', '甘肃省'], city: '兰州' },
  { aliases: ['青海', '青海省'], city: '西宁' },
  { aliases: ['台湾', '台湾省', 'Taiwan'], city: '台北' },

  // 5 自治区 → 首府
  {
    aliases: ['内蒙古', '内蒙', '内蒙古自治区'],
    city: '呼和浩特',
  },
  {
    aliases: ['广西', '广西自治区', '广西壮族自治区'],
    city: '南宁',
  },
  {
    aliases: ['西藏', '西藏自治区', 'Tibet'],
    city: '拉萨',
  },
  {
    aliases: ['宁夏', '宁夏自治区', '宁夏回族自治区'],
    city: '银川',
  },
  {
    aliases: ['新疆', '新疆自治区', '新疆维吾尔自治区'],
    city: '乌鲁木齐',
  },

  // 2 特别行政区 — self-mapping
  {
    aliases: ['香港', '香港特别行政区', 'Hong Kong', 'HK', 'HongKong'],
    city: '香港',
  },
  {
    aliases: ['澳门', '澳门特别行政区', 'Macao', 'Macau'],
    city: '澳门',
  },
];

const LOOKUP = new Map<string, string>();
for (const { aliases, city } of PROVINCES) {
  for (const a of aliases) {
    LOOKUP.set(a.trim().toLowerCase(), city);
  }
}

export function resolveProvinceAlias(input: string): string | null {
  return LOOKUP.get(input.trim().toLowerCase()) ?? null;
}
