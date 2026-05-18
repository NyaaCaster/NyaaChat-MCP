import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  formatDisplayName,
  geoLookupOne,
  qweatherGet,
  readCreds,
  type QWeatherCreds,
} from '../qweather/client.js';
import { resolveRegionAlias } from '../qweather/regions.js';

const COORDS_PATTERN = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
const LOCATION_ID_PATTERN = /^\d{6,12}$/;

interface WeatherNowResponse {
  code: string;
  updateTime?: string;
  fxLink?: string;
  now?: {
    obsTime?: string;
    temp?: string;
    feelsLike?: string;
    text?: string;
    wind360?: string;
    windDir?: string;
    windScale?: string;
    windSpeed?: string;
    humidity?: string;
    precip?: string;
    pressure?: string;
    vis?: string;
    cloud?: string;
    dew?: string;
  };
}

async function resolveLocation(
  creds: QWeatherCreds,
  raw: string,
): Promise<{ query: string; displayName: string }> {
  const trimmed = raw.trim();
  if (COORDS_PATTERN.test(trimmed) || LOCATION_ID_PATTERN.test(trimmed)) {
    return { query: trimmed, displayName: trimmed };
  }
  const cityHint = resolveRegionAlias(trimmed) ?? trimmed;
  const hit = await geoLookupOne(creds, cityHint);
  const displayName =
    cityHint !== trimmed
      ? `${trimmed} → ${formatDisplayName(hit)}`
      : formatDisplayName(hit);
  return { query: hit.id, displayName };
}

function formatWeather(displayName: string, data: WeatherNowResponse): string {
  const n = data.now ?? {};
  const lines: string[] = [`${displayName} 当前天气（观测于 ${n.obsTime ?? '未知'}）：`];
  if (n.text) lines.push(`  天气：${n.text}`);
  if (n.temp) {
    const feels = n.feelsLike ? `（体感 ${n.feelsLike}°C）` : '';
    lines.push(`  气温：${n.temp}°C${feels}`);
  }
  if (n.windDir || n.windScale || n.windSpeed) {
    const dir = n.windDir ?? '';
    const scale = n.windScale ? ` ${n.windScale} 级` : '';
    const speed = n.windSpeed ? `（${n.windSpeed} km/h）` : '';
    lines.push(`  风：${dir}${scale}${speed}`.trimEnd());
  }
  if (n.humidity) lines.push(`  湿度：${n.humidity}%`);
  if (n.precip !== undefined) lines.push(`  过去1小时降水：${n.precip} mm`);
  if (n.pressure) lines.push(`  气压：${n.pressure} hPa`);
  if (n.vis) lines.push(`  能见度：${n.vis} km`);
  if (n.cloud) lines.push(`  云量：${n.cloud}%`);
  if (n.dew) lines.push(`  露点：${n.dew}°C`);
  if (data.fxLink) lines.push(`  详情：${data.fxLink}`);
  return lines.join('\n');
}

export function registerWeatherTool(server: McpServer): void {
  server.registerTool(
    'get_weather',
    {
      title: '实时天气',
      description:
        'Get current weather for a location via QWeather. ' +
        'Accepts: a country name (e.g. "中国", "美国", "Japan"), ' +
        'a city name in any language (e.g. "北京", "Shanghai", "Tokyo"), ' +
        '"longitude,latitude" coordinates (e.g. "116.41,39.92"), ' +
        'or a QWeather LocationID. ' +
        'Country names are mapped to a representative city (e.g. 美国→纽约). ' +
        'Defaults to Beijing when omitted. ' +
        'Returns plain Chinese text with temperature, weather description, wind, humidity, etc.',
      inputSchema: {
        location: z
          .string()
          .optional()
          .describe(
            'Country name, city name, "longitude,latitude" coordinates, or QWeather LocationID. ' +
              'Omit to query Beijing by default.',
          ),
      },
    },
    async ({ location }) => {
      const creds = readCreds();
      if (!creds) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text:
                'QWeather 未配置：请在 .env 中设置 QWEATHER_API_HOST 和 QWEATHER_API_KEY。',
            },
          ],
        };
      }

      const raw = location?.trim() || creds.defaultLocation;
      const usedDefault = !location?.trim();

      try {
        const { query, displayName } = await resolveLocation(creds, raw);
        const data = await qweatherGet<WeatherNowResponse>(
          creds,
          '/v7/weather/now',
          { location: query, lang: 'zh' },
        );
        if (data.code !== '200') {
          throw new Error(`QWeather 返回业务错误 code=${data.code}`);
        }
        const tag = usedDefault ? `${displayName} [默认]` : displayName;
        return { content: [{ type: 'text', text: formatWeather(tag, data) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `获取天气失败（location="${raw}"）：${msg}`,
            },
          ],
        };
      }
    },
  );
}
