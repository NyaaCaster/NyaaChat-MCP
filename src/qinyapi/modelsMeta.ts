export interface ModelMeta {
  contextK: number;
  maxOutputK: number;
}

// Normalize a model name / keyword for fuzzy substring matching.
// Lowercases, turns '.' and whitespace into '-', collapses repeats.
// e.g. "4.8" -> "4-8", "Opus 4.8" -> "opus-4-8".
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Chinese / shorthand nicknames users say instead of brand names. Replaced with a
// space-padded canonical token so it survives later whitespace tokenization.
// Order matters: longer aliases first so "克劳德" wins over bare "克".
const CLAUDE_ALIASES = /克劳德|克总|小克|克/g;
const GEMINI_ALIASES = /哈基米/g;
const GROK_ALIASES = /马叔叔|老马|小马哥|车神/g;
const DEEPSEEK_ALIASES = /DS|ds|D老师|D指导|鲸鱼娘|鱼娘娘/g;

// For model queries: nicknames map to the brand prefix that appears in model ids
// (grok-*, deepseek-*), space-padded so a trailing version sticks as its own token
// (e.g. "dsv4" → " deepseek v4" → [deepseek, v4] → matches deepseek-v4 / -v4-pro).
// "哈基米" is special: it means the tavern's default gemini specifically
// (gemini-2.5-pro), per the product rule "哈基米/2.5 只测默认组 gemini-2.5-pro".
function expandModelAliases(q: string): string {
  return q
    .replace(CLAUDE_ALIASES, ' claude ')
    .replace(GEMINI_ALIASES, ' gemini-2.5-pro ')
    .replace(GROK_ALIASES, ' grok ')
    .replace(DEEPSEEK_ALIASES, ' deepseek ');
}

// For group queries: nicknames map to the brand token that appears in group
// names, with no padding (group matching does substring, not tokenization).
// grok/deepseek nicknames both point at "DS&Grok组" (normalized "ds&grok").
function expandGroupAliases(q: string): string {
  return q
    .replace(CLAUDE_ALIASES, 'claude')
    .replace(GEMINI_ALIASES, 'gemini')
    .replace(GROK_ALIASES, 'grok')
    .replace(DEEPSEEK_ALIASES, 'ds');
}

// A model matches a query if EVERY whitespace-separated token of the
// (alias-expanded) query is a substring of the normalized model name.
// e.g. "小克4.8" -> "claude 4.8" -> tokens [claude, 4-8]; "claude-opus-4-8" contains both.
export function modelMatches(modelName: string, query: string): boolean {
  const tokens = expandModelAliases(query)
    .split(/\s+/)
    .map((t) => normalize(t))
    .filter(Boolean);
  if (tokens.length === 0) return false;
  const target = normalize(modelName);
  return tokens.every((t) => target.includes(t));
}

// A group matches a query after alias expansion + dropping the trailing "组".
// Matches on equality or either-way substring so "小克" hits both claude-named
// groups while "小克按次" pins claude按次组.
export function groupMatches(groupName: string, query: string): boolean {
  const prep = (s: string) =>
    normalize(s)
      .replace(/组$/, '')
      .replace(/-+$/g, '');
  const name = prep(groupName);
  const q = prep(expandGroupAliases(query));
  if (!q) return false;
  return name === q || name.includes(q) || q.includes(name);
}

// Static, well-known context / max-output sizes (in K tokens).
// Only a fallback for when the gateway's /v1/models metadata is unavailable.
// Matched by checking whether the normalized model name contains a key.
const KNOWN_META: Array<{ match: string; meta: ModelMeta }> = [
  { match: 'claude-opus-4', meta: { contextK: 200, maxOutputK: 64 } },
  { match: 'claude-sonnet-4', meta: { contextK: 200, maxOutputK: 64 } },
  { match: 'gemini-2-5-pro', meta: { contextK: 1000, maxOutputK: 64 } },
  { match: 'gemini-3-1-pro', meta: { contextK: 1000, maxOutputK: 64 } },
  { match: 'gemini-3-5-flash', meta: { contextK: 1000, maxOutputK: 64 } },
  { match: 'grok-420', meta: { contextK: 128, maxOutputK: 32 } },
];

export function knownMeta(modelName: string): ModelMeta | null {
  const norm = normalize(modelName);
  for (const { match, meta } of KNOWN_META) {
    if (norm.includes(match)) return meta;
  }
  return null;
}
