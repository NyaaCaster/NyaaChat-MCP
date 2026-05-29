// qinyapi 令牌分组「目录」——非密钥部分，纳入版本管理。
// 这里只有分组名、模型列表，以及该组 apikey 对应的环境变量名（keyEnv）。
// 真正的 apikey 放在 .env 的 QINYAPI_KEY_* 中（不入库）。
// 分组名与模型名一律原样保留，请勿改动字面值。

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
    models: [
      'gemini-2.5-pro',
      'gemini-3.1-pro-preview',
      'gemini-3.5-flash-low',
      'gemini-3.5-flash',
      'grok-420-fast',
    ],
  },
  {
    name: 'gemini官逆组',
    keyEnv: 'QINYAPI_KEY_GEMINI_OFFICIAL',
    models: ['gemini-3.5-flash'],
  },
  {
    name: 'claude官逆组',
    keyEnv: 'QINYAPI_KEY_CLAUDE_OFFICIAL',
    models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8'],
  },
  {
    name: 'claude按次组',
    keyEnv: 'QINYAPI_KEY_CLAUDE_METERED',
    models: [
      '官逆按次官逆按次claude-sonnet-4-6',
      '官逆按次claude-opus-4-6',
      '官逆按次claude-opus-4-7',
      '官逆按次claude-opus-4-8',
    ],
  },
  {
    name: 'kiro组',
    keyEnv: 'QINYAPI_KEY_KIRO',
    models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8'],
  },
  {
    name: 'aws组',
    keyEnv: 'QINYAPI_KEY_AWS',
    models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8'],
  },
];
