// qinyapi 健康测试「黑名单」——纳入版本管理。
// 来源草稿：.doc/qinyapi-models-test-ban.md（.doc 不入库、不进镜像，故以本文件为准；
// 草稿更新后同步到这里）。命中黑名单的模型在测试前直接拦截：不发任何请求、零成本，
// 返回固定吐槽文本，引导用户改用更新的模型。

export const BAN_MESSAGE =
  '请用更好用的新模型好不好？别让主人Nyaa测试这种老模型浪费钱了~';

// 精确模型 id 匹配（不做模糊归一化，避免误伤新模型）。
export const BANNED_MODELS: ReadonlySet<string> = new Set<string>([
  'claude-3-5-sonnet-20240620',
  'claude-3-5-sonnet-20241022',
  'claude-3-7-sonnet-20250219',
  'claude-3-7-sonnet-20250219-thinking',
  'claude-opus-4-20250514',
  'claude-opus-4-5-20251101',
  'claude-opus-4-5-20251101-thinking',
  'claude-opus-4-6',
  'claude-opus-4-6-thinking',
  'claude-sonnet-4-20250514',
  'claude-sonnet-4-20250514-thinking',
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-5-20250929-thinking',
  'claude-sonnet-4-6',
  'claude-sonnet-4.6',
  'deepseek-r1',
  'deepseek-v3',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-thinking',
  'gemini-2.5-pro-preview-03-25',
  'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-pro-preview-06-05',
  'gemini-2.5-pro-thinking',
  'gemini-3-flash-0.06',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3-pro-preview-11-2025',
  'gemini-3-pro-preview-thinking',
  'gemini-3.1-pro-0.12',
  'gemini-3.1-pro-high-0.12',
  'gemini-3.1-pro-low-0.12',
  'gemini-3.1-pro-preview-thinking',
  'glm-4.7',
  'gpt-5.2',
  'gpt-5.2-codex',
  'gpt-5.2-codex-high',
  'gpt-5.2-codex-low',
  'gpt-5.2-codex-medium',
  'gpt-5.2-high',
  'gpt-5.2-low',
  'gpt-5.2-medium',
  'gpt-5.2-xhigh',
  'gpt-5.3-codex',
  'gpt-5.3-codex-high',
  'gpt-5.3-codex-low',
  'gpt-5.3-codex-medium',
  'gpt-5.3-codex-xhigh',
  'gpt-5.4-high',
  'gpt-5.4-low',
  'gpt-5.4-medium',
  'gpt-5.4-mini',
  'gpt-5.4-mini-high',
  'gpt-5.4-mini-low',
  'gpt-5.4-mini-medium',
  'gpt-5.4-mini-xhigh',
  'gpt-5.4-xhigh',
  'grok-3',
  'grok-3-deepsearch',
  'grok-4',
  'grok-4-0709',
  'grok-420-thinking',
  'kimi-k2-thinking',
  'K次claude-opus-4-5-20251101',
  'K次claude-sonnet-4-5-20250929',
]);

export function isBanned(model: string): boolean {
  return BANNED_MODELS.has(model);
}
