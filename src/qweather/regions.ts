import { resolveCountryAlias } from './countries.js';
import { resolveProvinceAlias } from './provinces.js';

/**
 * Try country alias first, then China province alias.
 * The two namespaces are disjoint by construction (no Chinese province name
 * is also a country name), so order is for readability rather than precedence.
 */
export function resolveRegionAlias(input: string): string | null {
  return resolveCountryAlias(input) ?? resolveProvinceAlias(input);
}
