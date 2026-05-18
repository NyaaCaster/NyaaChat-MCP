const REQUEST_TIMEOUT_MS = 6000;

export interface QWeatherCreds {
  host: string;
  key: string;
  defaultLocation: string;
}

export interface GeoLocation {
  id: string;
  name: string;
  adm1?: string;
  adm2?: string;
  country?: string;
  lat?: string;
  lon?: string;
  tz?: string;
  utcOffset?: string;
  isDst?: string;
}

interface GeoLookupResponse {
  code: string;
  location?: GeoLocation[];
}

export function readCreds(): QWeatherCreds | null {
  const host = process.env.QWEATHER_API_HOST?.trim();
  const key = process.env.QWEATHER_API_KEY?.trim();
  const defaultLocation =
    process.env.QWEATHER_API_DEFAULT_LOCATION?.trim() || '116.41,39.92';
  if (!host || !key) return null;
  return { host, key, defaultLocation };
}

export async function qweatherGet<T>(
  creds: QWeatherCreds,
  path: string,
  query: Record<string, string>,
): Promise<T> {
  const qs = new URLSearchParams(query).toString();
  const url = `https://${creds.host}${path}?${qs}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-QW-Api-Key': creds.key,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = (await res.text()).trim().slice(0, 200);
    throw new Error(`QWeather HTTP ${res.status}${body ? `: ${body}` : ''}`);
  }
  return (await res.json()) as T;
}

export async function geoLookupOne(
  creds: QWeatherCreds,
  query: string,
): Promise<GeoLocation> {
  const data = await qweatherGet<GeoLookupResponse>(creds, '/geo/v2/city/lookup', {
    location: query,
    lang: 'zh',
    number: '1',
  });
  if (data.code !== '200' || !data.location?.length) {
    throw new Error(`QWeather GeoAPI 未找到地点 "${query}"（code=${data.code}）`);
  }
  return data.location[0];
}

export function formatDisplayName(loc: GeoLocation): string {
  const parts = [loc.adm1, loc.adm2, loc.name]
    .filter((p): p is string => Boolean(p))
    .filter((p, i, arr) => arr.indexOf(p) === i);
  return parts.join(' / ') || loc.name;
}
