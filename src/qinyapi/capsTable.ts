// qinyapi 模型能力「静态表」——纳入版本管理、随镜像分发。
//
// 背景：能力（视觉 / 工具调用 / 格式化输出）只能靠实测发请求得到，消耗 token。
// 为「以后零成本」，由 scripts/probe-all-caps.ts 一次性把全清单实测出来写入本表；
// qinyapi_health_check 优先查本表，命中即不再发探测请求（连接探测仍实时进行）。
//
// 粒度：key = `${组名}|${模型名}`，与 cache.ts 的 cacheKey 完全一致——同一模型在不同
// 分组走不同上游通道，能力可能不同，故按「组×模型」分别记录。
// 只存能力三项；上下文 / 最大输出长度不在此表，运行时统一查 modelsMeta.ts 的 knownMeta()
// （尺寸的单一事实源）。
//
// 维护：groups.ts 新增模型后重跑 scripts/probe-all-caps.ts 增量补测即可；也可手动微调本表。

export interface StaticCaps {
  vision: boolean;
  tool: boolean;
  format: boolean;
}

// 由 scripts/probe-all-caps.ts 就地写回；条目按 key 排序。
export const STATIC_CAPS: Record<string, StaticCaps> = {
  'Claude-aws组|claude-haiku-4-5-20251001': { vision: true, tool: true, format: true },
  'Claude-aws组|claude-opus-4-7': { vision: true, tool: true, format: true },
  'Claude-aws组|claude-opus-4-8': { vision: true, tool: true, format: true },
  'Claude-kiro组|claude-opus-4-7': { vision: true, tool: true, format: true },
  'Claude-kiro组|claude-opus-4-8': { vision: true, tool: true, format: true },
  'Claude-kiro组|claude-opus-4-8-thinking': { vision: true, tool: true, format: false },
  'Claude计次组|K次claude-haiku-4-5-20251001': { vision: true, tool: true, format: true },
  'Claude计次组|K次claude-opus-4-7': { vision: true, tool: true, format: true },
  'Claude计次组|K次claude-opus-4-8': { vision: false, tool: false, format: true },
  'Claude计次组|按次claude-opus-4-8': { vision: true, tool: false, format: false },
  'Codex组|gpt-5.4': { vision: true, tool: true, format: true },
  'Codex组|gpt-5.5': { vision: true, tool: true, format: true },
  'DS&Grok组|MiniMax-M2.5': { vision: false, tool: true, format: false },
  'DS&Grok组|deepseek-v3.2': { vision: true, tool: true, format: true },
  'DS&Grok组|deepseek-v4': { vision: false, tool: true, format: false },
  'DS&Grok组|deepseek-v4-pro': { vision: false, tool: true, format: true },
  'DS&Grok组|glm-5': { vision: false, tool: true, format: false },
  'DS&Grok组|glm-5.1': { vision: false, tool: true, format: false },
  'DS&Grok组|grok-4.3': { vision: true, tool: false, format: false },
  'DS&Grok组|grok-420-fast': { vision: true, tool: false, format: false },
  'DS&Grok组|kimi-k2.5': { vision: true, tool: true, format: false },
  'DS&Grok组|kimi-k2.6': { vision: true, tool: true, format: false },
  'GCP组|gemini-2.5-pro': { vision: true, tool: true, format: true },
  'Gemini官逆组|gemini-3.5-flash': { vision: true, tool: false, format: true },
  '默认组|K次claude-haiku-4-5-20251001': { vision: true, tool: true, format: true },
  '默认组|K次claude-opus-4-7': { vision: true, tool: true, format: true },
  '默认组|MiniMax-M2.5': { vision: false, tool: true, format: false },
  '默认组|claude-haiku-4-5-20251001': { vision: true, tool: true, format: true },
  '默认组|claude-opus-4-7': { vision: true, tool: true, format: true },
  '默认组|claude-opus-4-8': { vision: true, tool: true, format: true },
  '默认组|claude-opus-4-8-thinking': { vision: true, tool: true, format: false },
  '默认组|deepseek-v3.2': { vision: true, tool: true, format: true },
  '默认组|deepseek-v4': { vision: false, tool: true, format: false },
  '默认组|deepseek-v4-pro': { vision: false, tool: true, format: true },
  '默认组|gemini-2.5-flash': { vision: true, tool: true, format: true },
  '默认组|gemini-2.5-pro': { vision: true, tool: true, format: true },
  '默认组|gemini-3.1-pro': { vision: true, tool: true, format: true },
  '默认组|gemini-3.1-pro-high': { vision: true, tool: true, format: true },
  '默认组|gemini-3.1-pro-low': { vision: true, tool: true, format: true },
  '默认组|gemini-3.1-pro-preview': { vision: true, tool: true, format: true },
  '默认组|gemini-3.5-flash': { vision: true, tool: true, format: true },
  '默认组|gemini-3.5-flash-low': { vision: true, tool: true, format: true },
  '默认组|glm-5': { vision: false, tool: true, format: false },
  '默认组|glm-5.1': { vision: false, tool: true, format: false },
  '默认组|gpt-5.4': { vision: true, tool: true, format: true },
  '默认组|gpt-5.5': { vision: true, tool: true, format: true },
  '默认组|gpt-image-2': { vision: true, tool: false, format: true },
  '默认组|grok-4.3': { vision: true, tool: false, format: false },
  '默认组|grok-420-fast': { vision: true, tool: false, format: false },
  '默认组|kimi-k2.5': { vision: true, tool: true, format: false },
  '默认组|kimi-k2.6': { vision: true, tool: true, format: false },
};

export function staticCaps(groupName: string, model: string): StaticCaps | null {
  return STATIC_CAPS[`${groupName}|${model}`] ?? null;
}
