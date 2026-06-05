// qinyapi 令牌分组「目录」——非密钥部分，纳入版本管理。
// 这里只有分组名、模型列表，以及该组 apikey 对应的环境变量名（keyEnv）。
// 真正的 apikey 放在 .env 的 QINYAPI_KEY_* 中（不入库）。
// 分组名与模型名一律原样保留，请勿改动字面值。
//
// 分组来源：.doc/qinyapi-info-byKey.md（官网令牌分组）。
// models 字段为各分组 apikey 实际请求 GET /v1/models 拉取到的模型列表。

export interface QinyGroupCatalog {
  name: string;
  keyEnv: string;
  models: string[];
}

// 默认 OpenAI 兼容端点（完整 chat/completions 路径）；可被 .env 的 QINYAPI_BASE_URL 覆盖。
export const QINY_DEFAULT_BASE_URL = 'https://love.qinyan.icu/v1/chat/completions';

export const QINY_GROUP_CATALOG: QinyGroupCatalog[] = [
  {
    name: '默认组',
    keyEnv: 'QINYAPI_KEY_DEFAULT',
    // 默认分组是全模型聚合组，囊括其余各组的模型（共 98 个）。
    models: [
      'claude-3-7-sonnet-20250219',
      'claude-haiku-4-5',
      'claude-haiku-4-5-20251001',
      'claude-opus-4-5',
      'claude-opus-4-6',
      'claude-opus-4-6-thinking',
      'claude-opus-4-7',
      'claude-opus-4-8',
      'claude-sonnet-4-6',
      'deepseek-r1',
      'deepseek-v3',
      'deepseek-v3.2',
      'deepseek-v4',
      'deepseek-v4-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash-thinking',
      'gemini-2.5-pro',
      'gemini-2.5-pro-preview-03-25',
      'gemini-2.5-pro-preview-05-06',
      'gemini-2.5-pro-preview-06-05',
      'gemini-2.5-pro-thinking',
      'gemini-3-flash',
      'gemini-3-flash-0.06',
      'gemini-3-flash-preview',
      'gemini-3-pro-preview',
      'gemini-3-pro-preview-11-2025',
      'gemini-3-pro-preview-thinking',
      'gemini-3.1-pro',
      'gemini-3.1-pro-0.12',
      'gemini-3.1-pro-high',
      'gemini-3.1-pro-high-0.12',
      'gemini-3.1-pro-low',
      'gemini-3.1-pro-low-0.12',
      'gemini-3.1-pro-preview',
      'gemini-3.1-pro-preview-thinking',
      'gemini-3.5-flash',
      'gemini-3.5-flash-low',
      'glm-4.7',
      'glm-5',
      'glm-5.1',
      'gpt-5.2',
      'gpt-5.2-codex',
      'gpt-5.3-codex',
      'gpt-5.4',
      'gpt-5.4-mini',
      'gpt-5.5',
      'gpt-image-2',
      'grok-3',
      'grok-3-deepsearch',
      'grok-4',
      'grok-4-0709',
      'grok-4.3',
      'grok-420-fast',
      'grok-420-thinking',
      'kimi-k2-thinking',
      'kimi-k2.5',
      'kimi-k2.6',
      'K次claude-opus-4-6',
      'K次claude-opus-4-7',
      'K次claude-opus-4-8',
      'K次claude-sonnet-4-6',
      'MiniMax-M2.5',
      '按次claude-opus-4-8',
    ],
  },
  {
    name: 'Claude-kiro组',
    keyEnv: 'QINYAPI_KEY_KIRO',
    models: [
      'claude-haiku-4-5',
      'claude-haiku-4-5-20251001',
      'claude-opus-4-5',
      'claude-opus-4-6',
      'claude-opus-4-7',
      'claude-opus-4-8',
      'claude-sonnet-4-6',
    ],
  },
  {
    name: 'ClaudeCode组',
    keyEnv: 'QINYAPI_KEY_CLAUDECODE',
    models: [
      'claude-opus-4-6',
      'claude-opus-4-7',
      'claude-opus-4-8',
      'claude-sonnet-4-6',
    ],
  },
  {
    name: 'GCP组',
    keyEnv: 'QINYAPI_KEY_GCP',
    models: [
      'gemini-2.5-pro',
      'gemini-2.5-pro-preview-03-25',
      'gemini-2.5-pro-preview-05-06',
      'gemini-2.5-pro-preview-06-05',
      'gemini-3-flash-preview',
      'gemini-3-pro-preview',
      'gemini-3-pro-preview-11-2025',
      'gemini-3.1-pro-preview',
    ],
  },
  {
    name: 'Codex组',
    keyEnv: 'QINYAPI_KEY_CODEX',
    models: [
      'gpt-5.2',
      'gpt-5.2-codex',
      'gpt-5.3-codex',
      'gpt-5.4',
      'gpt-5.4-mini',
      'gpt-5.5',
    ],
  },
  {
    name: 'Gemini官逆组',
    keyEnv: 'QINYAPI_KEY_GEMINI_OFFICIAL',
    models: ['gemini-3.5-flash'],
  },
  {
    name: 'DS&Grok组',
    keyEnv: 'QINYAPI_KEY_DS_GROK',
    models: [
      'deepseek-r1',
      'deepseek-v3',
      'deepseek-v3.2',
      'deepseek-v4',
      'deepseek-v4-pro',
      'glm-4.7',
      'glm-5',
      'glm-5.1',
      'grok-3',
      'grok-3-deepsearch',
      'grok-4',
      'grok-4-0709',
      'grok-4.3',
      'grok-420-fast',
      'grok-420-thinking',
      'kimi-k2-thinking',
      'kimi-k2.5',
      'kimi-k2.6',
      'MiniMax-M2.5',
    ],
  },
  {
    name: 'Claude官逆组',
    keyEnv: 'QINYAPI_KEY_CLAUDE_OFFICIAL',
    // GET /v1/models 返回空列表（HTTP 200）；该组当前不公开可探测的模型清单。
    models: [],
  },
  {
    name: 'Claude-aws组',
    keyEnv: 'QINYAPI_KEY_AWS',
    models: [
      'claude-opus-4-6',
      'claude-opus-4-7',
      'claude-opus-4-8',
      'claude-sonnet-4-6',
    ],
  },
  {
    name: 'Claude计次组',
    keyEnv: 'QINYAPI_KEY_CLAUDE_METERED',
    models: [
      'K次claude-opus-4-6',
      'K次claude-opus-4-7',
      'K次claude-opus-4-8',
      'K次claude-sonnet-4-6',
      '按次claude-opus-4-8',
    ],
  },
  {
    name: '图片&视频组',
    keyEnv: 'QINYAPI_KEY_IMAGE_VIDEO',
    models: ['gpt-image-2'],
  },
];
