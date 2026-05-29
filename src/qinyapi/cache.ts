import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface CacheEntry {
  vision: boolean;
  tool: boolean;
  format: boolean;
  contextK: number | null;
  maxOutputK: number | null;
  probedAt: string;
}

type CacheShape = Record<string, CacheEntry>;

function cacheFile(): string {
  return (
    process.env.QINYAPI_CACHE_FILE?.trim() ||
    join(process.cwd(), 'data', 'qinyapi-cache.json')
  );
}

export function cacheKey(groupName: string, modelName: string): string {
  return `${groupName}|${modelName}`;
}

export async function readCache(): Promise<CacheShape> {
  try {
    const raw = await readFile(cacheFile(), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as CacheShape;
  } catch {
    // missing / unreadable / malformed — treat as empty cache
  }
  return {};
}

export async function writeEntry(key: string, entry: CacheEntry): Promise<void> {
  try {
    const cache = await readCache();
    cache[key] = entry;
    const file = cacheFile();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(cache, null, 2), 'utf8');
  } catch {
    // best-effort: a failed cache write must not break the health check
  }
}
