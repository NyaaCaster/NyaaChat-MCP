import { QINY_DEFAULT_BASE_URL, QINY_GROUP_CATALOG } from './groups.js';

export interface QinyGroup {
  name: string;
  key: string;
  models: string[];
}

export interface QinyConfig {
  baseUrl: string;
  groups: QinyGroup[];
}

// Merge the version-controlled catalog (groups.ts) with secret apikeys from the
// environment. A catalog group is only available if its keyEnv var is set.
export function loadQinyConfig(): QinyConfig | null {
  const baseUrl = process.env.QINYAPI_BASE_URL?.trim() || QINY_DEFAULT_BASE_URL;

  const groups: QinyGroup[] = [];
  for (const g of QINY_GROUP_CATALOG) {
    const key = process.env[g.keyEnv]?.trim();
    if (!key) continue;
    groups.push({ name: g.name, key, models: g.models });
  }

  if (groups.length === 0) return null;
  return { baseUrl, groups };
}
