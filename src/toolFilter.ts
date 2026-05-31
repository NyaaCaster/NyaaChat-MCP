/**
 * Per-connection tool filtering.
 *
 * MCP clients (e.g. SillyTavern's MCP plugin) only forward the request URL,
 * HTTP headers and the JSON-RPC body to the server — arbitrary sibling fields
 * in the `mcpServers` config entry never reach us. So we let users control
 * which tools a connection exposes via channels that ARE transmitted:
 *
 *   1. `X-MCP-Tools` header — a JSON object {toolName: boolean} (closest to a
 *      literal on/off map). Mixed/any-true → allowlist of the true keys;
 *      all-false → denylist (everything except the false keys). A non-object
 *      value (comma string / JSON array) degrades to a comma allowlist.
 *   2. `?tools=a,b,c`   — allowlist (only these).
 *   3. `?disable=x,y`   — denylist (all except these).
 *
 * Precedence: header > tools > disable. None present → undefined (all enabled,
 * backward-compatible with the existing config). Unknown names are dropped with
 * a warning; if filtering leaves nothing, we warn and fall back to all enabled
 * so a single typo can't silently disable every tool.
 *
 * This module is pure (no express / SDK deps) so it can be unit-tested directly.
 */

export const X_MCP_TOOLS_HEADER = 'x-mcp-tools';

export interface ToolFilterInput {
  /** Raw `X-MCP-Tools` header value, if present. */
  header?: string;
  /** Raw `?tools=` query value, if present. */
  tools?: string;
  /** Raw `?disable=` query value, if present. */
  disable?: string;
}

function splitNames(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Keep only names that exist; warn on unknowns. Returns the valid subset. */
function validate(names: string[], all: ReadonlySet<string>): string[] {
  const valid: string[] = [];
  const unknown: string[] = [];
  for (const n of names) {
    if (all.has(n)) valid.push(n);
    else unknown.push(n);
  }
  if (unknown.length > 0) {
    console.warn(`[mcp] tool filter: ignoring unknown tool name(s): ${unknown.join(', ')}`);
  }
  return valid;
}

/**
 * Resolve the set of enabled tool names for a connection.
 * Returns `undefined` to mean "all tools enabled".
 */
export function resolveEnabledTools(
  input: ToolFilterInput,
  all: readonly string[],
): Set<string> | undefined {
  const allSet = new Set(all);

  // --- 1. X-MCP-Tools header ---
  const header = input.header?.trim();
  if (header) {
    let parsed: unknown;
    let parseOk = true;
    try {
      parsed = JSON.parse(header);
    } catch {
      parseOk = false;
    }

    if (parseOk && parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const map = parsed as Record<string, unknown>;
      const trueKeys = validate(
        Object.keys(map).filter((k) => map[k] === true),
        allSet,
      );
      const falseKeys = validate(
        Object.keys(map).filter((k) => map[k] === false),
        allSet,
      );
      if (trueKeys.length > 0) {
        // Allowlist: only the explicitly-true tools.
        return finalize(new Set(trueKeys), all);
      }
      if (falseKeys.length > 0) {
        // Denylist: everything except the explicitly-false tools.
        const set = new Set(all);
        for (const k of falseKeys) set.delete(k);
        return finalize(set, all);
      }
      // Empty object or no usable booleans → no constraint.
      return undefined;
    }

    // Not a JSON object: treat the raw string as a comma allowlist.
    const names = validate(splitNames(header), allSet);
    return finalize(new Set(names), all);
  }

  // --- 2. ?tools= allowlist ---
  const tools = input.tools?.trim();
  if (tools) {
    const names = validate(splitNames(tools), allSet);
    return finalize(new Set(names), all);
  }

  // --- 3. ?disable= denylist ---
  const disable = input.disable?.trim();
  if (disable) {
    const names = validate(splitNames(disable), allSet);
    const set = new Set(all);
    for (const n of names) set.delete(n);
    return finalize(set, all);
  }

  // --- 4. nothing specified → all enabled ---
  return undefined;
}

/** Empty result → warn and fall back to all enabled (undefined). */
function finalize(set: Set<string>, all: readonly string[]): Set<string> | undefined {
  if (set.size === 0) {
    console.warn(
      '[mcp] tool filter resolved to an empty set; falling back to all tools enabled',
    );
    return undefined;
  }
  if (set.size === all.length) return undefined; // all enabled anyway
  return set;
}
