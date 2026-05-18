# NyaaChat-MCP

为 [NyaaChat](https://github.com/NyaaCaster/NyaaChat) 等基于 LLM 的角色扮演聊天平台提供标准 [MCP](https://modelcontextprotocol.io/) 支持的轻量服务。当前提供两个工具：

- `get_current_time` — 获取实际当前时间
- `get_weather` — 获取实时天气

服务通过 **Streamable HTTP** 单端点对外暴露，兼容 Chatbox / Cherry Studio / SillyTavern 等远程 MCP 客户端。

> 文档分三部分：[LLM 侧接入](#一llm-侧接入) → [角色扮演使用准则](#二角色扮演场景下的数据使用准则) → [技术文档](#三技术文档)。普通使用者只看第一、二部分即可。

---

# 一、LLM 侧接入

## 服务地址

```
http://h.hony-wen.com:3094/mcp
```

公开开放，**Streamable HTTP** 协议（MCP 2025-03-26 标准）。

## 鉴权

所有 `/mcp` 请求都需要在 HTTP header 里携带 API key：

```
Authorization: Bearer xxxxxx
```

> 🔒 **API key 不在仓库中、不会随代码 / 镜像 / 任何文档分发。请直接联系 [@NyaaCast](https://github.com/NyaaCaster) 获取**。Issues、PR、邮件正文等公开渠道都不要贴 key。

请求示例：

```bash
curl -X POST http://h.hony-wen.com:3094/mcp \
  -H "Authorization: Bearer xxxxxx" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

无 key / key 错误时服务返回：

```
HTTP 401
{"jsonrpc":"2.0","error":{"code":-32001,"message":"Unauthorized: missing or invalid Authorization header"},"id":null}
```

## 在 LLM 客户端里添加

### Chatbox / Cherry Studio

设置 → MCP 服务器 → 添加 → 类型选 **Streamable HTTP**：

```
URL:     http://h.hony-wen.com:3094/mcp
Headers: Authorization: Bearer xxxxxx
```

如果界面上没有"Headers"字段而只有单独的"API Key"输入框，多数情况下填 `xxxxxx`，客户端会自动以 `Authorization: Bearer xxxxxx` 形式发出。

### SillyTavern

安装 MCP Connector 扩展，类型选 `streamable-http`，URL 同上，在自定义 header 里加：

```
Authorization: Bearer xxxxxx
```

### 其它通用 MCP 客户端

支持 Streamable HTTP 传输 + 自定义 header（或 Bearer token）的客户端均可直接接入。无需 OAuth、无需注册。

### 健康检查

不需要鉴权，可用于先验证 URL 可达：

```
GET http://h.hony-wen.com:3094/health
→ {"status":"ok","name":"nyaachat-mcp","version":"0.1.0"}
```

## 工具一览

### `get_current_time`

获取真实世界当前时间。**入参 `timezone` 可选**，接受非常宽松的输入：

- IANA 时区名：`Asia/Shanghai`、`America/New_York`
- 国家名：`中国` / `美国` / `Japan` / `USA`
- 省/区名：`广西` / `四川` / `Hong Kong`
- 城市名（任意语言）：`北京` / `Tokyo` / `纽约`
- 省略时默认北京时间（`Asia/Shanghai`）

**返回示例：**
```
Resolved: 美国 → 纽约 → 纽约 (America/New_York)
Current time in America/New_York (UTC-04:00):
  Date:        2026-05-18 (Monday)
  Time:        13:38:22.123456
  ISO:         2026-05-18T13:38:22.123456-04:00
  DST active:  yes
```

### `get_weather`

获取实时天气（**仅实况，无预报**）。**入参 `location` 可选**，与时间工具同形：

- 国家名 / 省份名 / 城市名（任意语言）
- `经度,纬度` 坐标：`116.41,39.92`
- QWeather LocationID：`101010100`
- 省略时默认北京

**返回示例：**
```
广西 → 广西壮族自治区 / 南宁 当前天气（观测于 2026-05-19T02:28+08:00）：
  天气：小雨
  气温：24°C（体感 26°C）
  风：东风 2 级（11 km/h）
  湿度：95%
  过去1小时降水：0.0 mm
  气压：988 hPa
  能见度：9 km
  云量：100%
  露点：24°C
  详情：https://www.qweather.com/weather/nanning-101300101.html
```

> 工具返回的字段是给 LLM 消费的——直接照搬给最终用户会显得机械。在角色扮演 / 对话场景下，建议参考[第二部分](#二角色扮演场景下的数据使用准则)的使用准则做一次"翻译"。

---

# 二、角色扮演场景下的数据使用准则

> 这部分写给**接入本 MCP 的 LLM 角色卡 / 系统提示词**。建议把整段嵌进角色提示，或精简后挂在工具调用结果之前。

## 2.0 为什么要有这套规则

工具返回的字段是给机器消费的。直接念给用户听就是一段播报：

> ❌ "现在是 2026 年 5 月 19 日凌晨 2 点 32 分 15 秒，时区 Asia/Shanghai (UTC+08:00)，DST 未启用。广西壮族自治区南宁市当前阴有小雨，气温 24°C，体感 26°C，湿度 95%，气压 988 hPa，能见度 9 公里，云量 100%。"

而在 NyaaChat 这种角色扮演场景里，用户期望的是一个**会喘气的角色**，把同样的数据用感官化的方式自然地织进对白和动作：

> ✅ *（没睁眼，伸手把你额前的碎发顺到耳后，又把被子往你肩上拉了拉）*
> "……不用对不起。两点多了，看什么书看到这时候。"
> *（被你越过我肩往窗外看时带过来一缕凉气）*
> "外面在下——你听，小雨。云压得这么低，估计后半夜不会停。快睡。"

下面 8 条准则就是把这种"活人感"机械化——任何 LLM 严格遵守都能产出后者而非前者。

## 2.1 时间数字模糊化

凌晨说"两点多"、白天说"下午三四点"、傍晚说"快六点了"。**不报秒、不报毫秒、不报 ISO 时间戳。** 例外：角色人设是精确控（学者 / 军人 / AI 助理 / 强迫症等）时可保留具体数字。

| 工具给的 | 角色嘴里的 |
|---|---|
| `02:32:15.475906` | "两点多" / "深夜了" |
| `2026-05-19 (Tuesday)` | 跳过——熟人深夜不会突然念日期 |
| `Asia/Shanghai UTC+08:00 DST=no` | 永远不出口 |

## 2.2 天气数字感官化

把百分比 / 度数 / 帕斯卡翻成人话。LLM 心里走这套对照：

| 工具给的 | 翻译为口语 |
|---|---|
| 湿度 ≥ 85% | "闷"、"潮"、"被子都黏黏的" |
| 云量 ≥ 90% | "云压得低"、"星星全没了" |
| 能见度 < 5 km | "看不清对面"、"雾乎乎" |
| 风速 ≥ 30 km/h | "风刮得吓人"、"窗户都在响" |
| 气压低 + 湿度高 + 云厚 | "估计要下"、"一时半会儿停不了" |
| 温度 vs 季节常态 | "比往常凉"、"还没真的冷" |

## 2.3 永不出口的字段

下列字段是**给开发调试用**的，任何角色都不应念出来：

- `UTC+08:00` / `Asia/Shanghai` / `America/New_York`（IANA 时区名）
- `DST active: yes/no`
- `ISO 2026-05-19T02:32:15.475906+08:00`
- `观测于 2026-05-19T02:28+08:00`
- `详情：https://www.qweather.com/...`（fxLink）
- `气压 988 hPa`、`露点 24°C`（除非角色是气象专业 / 飞行员等）

## 2.4 每次最多用 1–3 个字段

工具返回 8–10 个字段。角色应**根据当前场景挑 1–3 个**最有意义的，其余全丢：

| 场景 | 用哪几个 |
|---|---|
| 卧室 / 深夜 | 雨、云量、湿度（隐含趋势） |
| 出门前 | 温度、风、雨 |
| 户外活动 | 能见度、风、雨 |
| 安排穿衣 | 温度、风、雨 |
| 询问"现在几点" | 时间（其它一律不主动加） |

## 2.5 Resolution trace 不进角色嘴里

工具返回的 `广西 → 广西壮族自治区 / 南宁` 是给 LLM 看的解析链路，**不是台词**。角色应该挑一个最贴近场景视角的指代：

- 卧室视角："外面"、"窗外"
- 远距离对话："广西那边"、"南宁"
- 用户原本说"广东"但工具落到广州 → 角色用"广州那边……"自然衔接，**不要**说"我把广东解析成了广州"

## 2.6 先回应情感，再嵌入信息

播报型 LLM 的典型病灶是上来就 "现在是 02:32 ..."，把情绪全踩没了。正确顺序：

1. 先用角色方式回应**情感**（用户说"对不起"→"没事 / 不用 / 怎么了"）
2. 再把信息**嵌进动作和对白的缝里**，不是连珠炮播报

> ❌ "现在 02:32，南宁阴天 24°C 湿度 95% 有小雨。"
>
> ✅ "两点多了。*（看了眼窗外）* 外面在下，小雨。"

## 2.7 用角色直觉包装数据缺失

工具能力达不到时，**用角色感受/经验包装**，永不暴露工具内部：

- 只有实况没有预报 → "看这云一时半会儿停不下来"，**不**说"我的工具不支持预报"
- 工具返回 `isError` → "这个时辰我也说不准 / 你听听就知道了 / 一会儿你看看吧"，**不**说"工具调用失败"
- 角色不知道自己在用工具——它只知道自己感觉到了什么

## 2.8 把信息物化成共同感官

最高级的用法：把数据变成**可以让用户自己感知的指引**，而不是单方面播报。

> ❌ "南宁正在下小雨，湿度 95%。"
>
> ✅ "外面在下——**你听**，小雨。"

`你听` / `你看` / `你闻` 这种指向性语句，让用户在角色扮演里自己"感受"到数据，比 LLM 单方面通报更有沉浸感。

## 2.9 实战示例

**场景设定：** 深夜两点多，用户在床上看书没关灯。角色（NPC）转过身帮拉好被子。用户说："怎么都这么晚了，对不起~ 现在到底是什么时候了？（我裹紧被子越过你的肩看看窗外）广西这边会下雨吗？"

**工具调用：**
```
get_current_time({})
→ Asia/Shanghai 2026-05-19 02:32:15

get_weather({location: "广西"})
→ 广西 → 广西壮族自治区 / 南宁
  天气：小雨   云量：100%   湿度：95%
  气温：24°C   风：东风 2 级 11km/h   能见度：9 km
  气压：988 hPa   露点：24°C   过去1小时降水：0.0 mm
```

**应用 8 条规则后生成的回复：**

> *（没睁眼，伸手把你额前的碎发顺到耳后，又把被子往你肩上拉了拉）*
>
> "……不用对不起。"
>
> "两点多了，看什么书看到这时候。"
>
> *（被你越过我肩往窗外看时带过来一缕凉气，半睁眼瞥了一眼那扇还没关严的窗）*
>
> "外面在下——你听，小雨。云压得这么低，估计后半夜不会停。"
>
> "快睡。"

**字段使用统计：**

| 工具给的 10 个字段 | 角色用了 |
|---|---|
| 时间 02:32:15 | "两点多"（§2.1 模糊化） |
| 日期 2026-05-19 Tuesday | 跳过 |
| 时区 Asia/Shanghai / DST | 跳过（§2.3） |
| 天气文字"小雨" | "外面在下，小雨"（§2.2 沿用） |
| 云量 100% | "云压得这么低"（§2.2 感官化） |
| 湿度 95% | 隐含在"估计不会停"的趋势预测里 |
| 气压 988 hPa | 隐含在趋势里（§2.7 经验包装） |
| 温度 24°C / 体感 26°C | 跳过（卧室不关心室外温度） |
| 风 东风 2 级 | 跳过（风弱，不影响场景） |
| 能见度 / 露点 / fxLink | 跳过 |
| Resolution trace | "外面"代替（§2.5） |

10 个字段用了 3 个、隐含 2 个、跳过 5 个；trace 用场景视角替代。

## 2.10 角色卡精简模板（< 200 字）

```
工具回包内的时间/天气数据，按以下规则使用，不要播报：
1. 时间说"两点多"，不报秒/ISO/UTC/IANA。
2. 数字感官化：湿度高→"闷"，云厚→"压得低"，气压低+云厚→"要下"。
3. 每次最多用 1-3 个字段，按场景挑（深夜→雨/云；出门→温度/风/雨）。
4. 永不出口：UTC、IANA 时区名、DST、ISO 时间戳、fxLink、resolution trace。
5. 先回应情感再带信息，把信息插在动作和对白的缝里。
6. 工具能力不足时（如要预报）用角色直觉包装："看这云一时半会儿停不了"。
7. 多用"你听 / 你看"把数据外化成共同感官。
8. 角色不知道自己在用工具，只知道自己感觉到了什么。
```

---

# 三、技术文档

> 这部分写给本项目的开发者 / 自部署者。如果你只是想接入公开服务，看[第一部分](#一llm-侧接入)就够了。

## 3.1 架构

```
LLM 客户端  ──HTTP POST /mcp──▶  Express  ──▶  StreamableHTTPServerTransport
                                                       │
                                              ┌────────┴────────┐
                                              ▼                 ▼
                                       get_current_time     get_weather
                                              │                 │
                                              ▼                 ▼
                                        timeapi.io       QWeather API
                                              ▲                 ▲
                                              │                 │
                                              └────── GeoAPI ───┘
                                                    (地名 → tz / id)
```

- **传输层**：MCP 2025-03-26 标准 [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)，单端点 `/mcp`。
- **会话模式**：无状态（stateless）——每个 POST 独立创建 server + transport，不维护 session id。水平扩展无负担。
- **运行时**：Node 20+，依赖 `@modelcontextprotocol/sdk@^1.29` + Express。
- **上游**：[timeapi.io](https://www.timeapi.io)（无鉴权 HTTP）+ [和风天气](https://dev.qweather.com)（API Key）。

## 3.2 输入解析顺序

两个工具共享同一套解析逻辑：

```
1. 是坐标 / LocationID / IANA 时区名？ → 直接使用
2. 命中国家映射表（~32 国别名）？ → 替换为该国"主城"
3. 命中中国省份映射表（34 省级行政区）？ → 替换为省会/首府
4. 否则 → 调和风 GeoAPI 模糊查询，取首条结果
```

国家映射用"聊天主城"（如 `美国` → 纽约 而非华盛顿）而不是政治首都；省份映射用法定省会/首府。具体条目见 [§3.7](#37-国家--省份映射表)。

## 3.3 目录结构

```
src/
├── index.ts              # HTTP 入口（Express + StreamableHTTPServerTransport）
├── server.ts             # McpServer 工厂，注册所有工具
├── tools/
│   ├── time.ts           # get_current_time（timeapi.io + GeoAPI 兜底）
│   └── weather.ts        # get_weather（/v7/weather/now + GeoAPI 解析）
└── qweather/
    ├── client.ts         # 共享 creds、HTTP wrapper、geoLookupOne
    ├── countries.ts      # 32 国别名 → 主城映射
    ├── provinces.ts      # 34 中国省级行政区 → 省会/首府映射
    └── regions.ts        # 统一 resolveRegionAlias（country ?? province）
Dockerfile
docker-compose.yml
rebuild.ps1 / rebuild.sh
.env.example
```

## 3.4 本地开发

```bash
npm install
cp .env.example .env       # 填写 QWeather 凭证
npm run dev                # tsx watch 热重载
# 或者
npm run build && npm start
```

测试单次工具调用（绕过 MCP 客户端）：

```bash
curl -X POST http://127.0.0.1:3094/mcp \
  -H "Authorization: Bearer $MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call",
       "params":{"name":"get_weather","arguments":{"location":"广西"}}}'
```

## 3.5 Docker 部署

```powershell
# Windows（必须带 -ExecutionPolicy Bypass）
powershell -ExecutionPolicy Bypass -File .\rebuild.ps1
```

```bash
# Linux / macOS
bash ./rebuild.sh
```

`rebuild` 脚本会：停容器 → 无缓存重建 → 清 dangling 镜像 → 启动 → 列出运行状态。

容器内：
- 时区固定 `Asia/Shanghai`（由 `tzdata` + `/etc/localtime` 设置）
- 以 `node` 非 root 用户运行
- `.env` 通过 `env_file` 挂载读取，**不**烘进镜像

## 3.6 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `MCP_PORT` | `3094` | HTTP 监听端口 |
| `MCP_HOST` | `0.0.0.0` | 监听地址 |
| `MCP_API_KEY` | — | 客户端必须用 `Authorization: Bearer <key>` 携带的共享密钥。**留空则禁用鉴权**（仅本地开发用，启动时会打 WARNING）。生成方式：`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `TZ` | `Asia/Shanghai` | 容器与 Node 进程时区 |
| `QWEATHER_API_HOST` | — | 和风天气 API Host（账号专属子域名） |
| `QWEATHER_API_KEY` | — | 和风天气 API Key |
| `QWEATHER_API_DEFAULT_LOCATION` | `116.41,39.92` | 默认位置（坐标或 LocationID） |

> 监听相关变量加 `MCP_` 前缀，避免与 `.env` 里其他常见名（`HOST`、`PORT`、`KEY`）冲突。

## 3.7 国家 / 省份映射表

### 国家（32 条，"聊天主城"非政治首都）

| 国家 / 别名 | 主城 |
|---|---|
| 中国 / China / PRC | 北京 |
| 美国 / USA / US / America / United States | 纽约 |
| 日本 / Japan | 东京 |
| 韩国 / 南韩 / 大韩民国 / Korea / South Korea | 首尔 |
| 英国 / UK / Britain / Great Britain / England / United Kingdom | 伦敦 |
| 法国 / France | 巴黎 |
| 德国 / Germany | 柏林 |
| 俄罗斯 / 俄国 / Russia | 莫斯科 |
| 意大利 / Italy | 罗马 |
| 西班牙 / Spain | 马德里 |
| 加拿大 / Canada | 多伦多 |
| 澳大利亚 / 澳洲 / Australia | 悉尼 |
| 新西兰 / New Zealand | 奥克兰 |
| 印度 / India | 新德里 |
| 泰国 / Thailand | 曼谷 |
| 越南 / Vietnam | 河内 |
| 马来西亚 / Malaysia | 吉隆坡 |
| 印尼 / 印度尼西亚 / Indonesia | 雅加达 |
| 菲律宾 / Philippines | 马尼拉 |
| 新加坡 / Singapore | 新加坡 |
| 巴西 / Brazil | 圣保罗 |
| 墨西哥 / Mexico | 墨西哥城 |
| 阿根廷 / Argentina | 布宜诺斯艾利斯 |
| 埃及 / Egypt | 开罗 |
| 南非 / South Africa | 约翰内斯堡 |
| 荷兰 / Netherlands / Holland | 阿姆斯特丹 |
| 瑞士 / Switzerland | 苏黎世 |
| 瑞典 / Sweden | 斯德哥尔摩 |
| 挪威 / Norway | 奥斯陆 |
| 土耳其 / Turkey | 伊斯坦布尔 |
| 沙特 / 沙特阿拉伯 / Saudi Arabia | 利雅得 |
| 阿联酋 / 阿拉伯联合酋长国 / UAE | 迪拜 |

> 选择"聊天主城"是因为聊天里"美国天气"通常想问纽约而非华盛顿。这是产品决策，可在 `src/qweather/countries.ts` 内调整。

### 中国省级行政区（34 条，省会/首府）

| 类别 | 条目 |
|---|---|
| 直辖市（自映射） | 北京、上海、天津、重庆 |
| 省（→ 省会） | 河北→石家庄、山西→太原、辽宁→沈阳、吉林→长春、黑龙江→哈尔滨、江苏→南京、浙江→杭州、安徽→合肥、福建→福州、江西→南昌、山东→济南、河南→郑州、湖北→武汉、湖南→长沙、广东→广州、海南→海口、四川→成都、贵州→贵阳、云南→昆明、陕西→西安、甘肃→兰州、青海→西宁、台湾→台北 |
| 自治区（→ 首府） | 内蒙古→呼和浩特、广西→南宁、西藏→拉萨、宁夏→银川、新疆→乌鲁木齐 |
| 特别行政区（自映射） | 香港、澳门 |

每条接受三种 alias：裸名（"河北"）、带"省"/"自治区"/"特别行政区"后缀（"河北省"、"广西壮族自治区"）、港澳台另接英文（`Hong Kong` / `Macao` / `Taiwan`）。具体见 `src/qweather/provinces.ts`。

## 3.8 已知边界

- **天气只查实况，不查预报。** 面向"会不会下雨"等未来时态，应靠 LLM 用 §2.7 的策略包装。
- **地理特征名（沙漠/山脉/河流）可能模糊错配。** 如"撒哈拉沙漠" GeoAPI 会落到加州一个叫"棕榈沙漠"的城市。极简表只覆盖国家+省份，未处理地理特征。
- **QWeather 鉴权用老式 API Key**（`X-QW-Api-Key` header）。新版 JWT 鉴权更安全但暂未迁移；和风官方公告 2027-01 起会对 API Key 加每日限流，到时再切。

## 3.9 License

[MIT](./LICENSE)
