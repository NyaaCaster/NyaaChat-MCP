import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  formatDisplayName,
  geoLookupOne,
  readCreds,
} from '../qweather/client.js';
import { resolveRegionAlias } from '../qweather/regions.js';

const TIME_API_URL = 'https://www.timeapi.io/api/v1/time/current/zone';
const DEFAULT_TIMEZONE = 'Asia/Shanghai';
const REQUEST_TIMEOUT_MS = 5000;
const IANA_PATTERN = /^[A-Za-z]+\/[A-Za-z0-9_+\-/]+$/;

interface TimeApiResponse {
  date_time: string;
  date: string;
  time: string;
  day_of_week: string;
  dst_active: boolean;
  timezone: string;
  utc_offset_seconds: number;
}

function formatUtcOffset(seconds: number): string {
  const sign = seconds >= 0 ? '+' : '-';
  const abs = Math.abs(seconds);
  const hh = String(Math.floor(abs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  return `UTC${sign}${hh}:${mm}`;
}

async function fetchCurrentTime(timezone: string): Promise<TimeApiResponse> {
  const url = `${TIME_API_URL}?timezone=${encodeURIComponent(timezone)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = (await res.text()).trim();
    throw new Error(`timeapi.io HTTP ${res.status}${body ? `: ${body}` : ''}`);
  }
  return (await res.json()) as TimeApiResponse;
}

interface ResolvedTimezone {
  tz: string;
  trace: string;
}

async function resolveAsPlace(input: string): Promise<ResolvedTimezone> {
  const creds = readCreds();
  if (!creds) {
    throw new Error(
      `"${input}" 不是 IANA 时区名，且 QWeather 未配置无法回退到地名查询。` +
        `请改用 IANA 名（如 Asia/Shanghai），或在 .env 中配置 QWEATHER_API_HOST/QWEATHER_API_KEY。`,
    );
  }
  const cityHint = resolveRegionAlias(input) ?? input;
  const hit = await geoLookupOne(creds, cityHint);
  if (!hit.tz) {
    throw new Error(`QWeather 返回的位置 "${formatDisplayName(hit)}" 缺少 tz 字段`);
  }
  const arrow = cityHint !== input ? ` → ${cityHint}` : '';
  return {
    tz: hit.tz,
    trace: `${input}${arrow} → ${formatDisplayName(hit)} (${hit.tz})`,
  };
}

export function registerTimeTool(server: McpServer): void {
  server.registerTool(
    'get_current_time',
    {
      title: '真实时间',
      description:
        'Get the actual current date and time. ' +
        'Accepts: an IANA timezone (e.g. "Asia/Shanghai", "America/New_York"), ' +
        'a country name (e.g. "中国", "美国", "Japan" — mapped to a representative city), ' +
        'or a city name in any language (e.g. "北京", "Tokyo", "纽约"). ' +
        'When omitted, defaults to Beijing time (Asia/Shanghai, UTC+8). ' +
        'Time is fetched from timeapi.io; non-IANA inputs are resolved via QWeather GeoAPI.',
      inputSchema: {
        timezone: z
          .string()
          .optional()
          .describe(
            'IANA timezone (e.g. "Asia/Shanghai"), country name (e.g. "中国", "美国"), ' +
              'or city name in any language (e.g. "北京", "Tokyo"). ' +
              'Omit for Beijing time (UTC+8) by default.',
          ),
      },
    },
    async ({ timezone }) => {
      const raw = timezone?.trim() || DEFAULT_TIMEZONE;
      const usedDefault = !timezone?.trim();

      let tz: string;
      let trace: string | null = null;

      if (IANA_PATTERN.test(raw)) {
        tz = raw;
      } else {
        try {
          const resolved = await resolveAsPlace(raw);
          tz = resolved.tz;
          trace = resolved.trace;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `无法解析"${raw}"为时区：${msg}`,
              },
            ],
          };
        }
      }

      try {
        const data = await fetchCurrentTime(tz);
        const offset = formatUtcOffset(data.utc_offset_seconds);
        const header = trace
          ? `Resolved: ${trace}\nCurrent time in ${data.timezone} (${offset}):`
          : `Current time in ${data.timezone} (${offset})${usedDefault ? ' [default]' : ''}:`;
        const lines = [
          header,
          `  Date:        ${data.date} (${data.day_of_week})`,
          `  Time:        ${data.time}`,
          `  ISO:         ${data.date_time}`,
          `  DST active:  ${data.dst_active ? 'yes' : 'no'}`,
        ];
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `获取时间失败（tz="${tz}"）：${msg}`,
            },
          ],
        };
      }
    },
  );
}
