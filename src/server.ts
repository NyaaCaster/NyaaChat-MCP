import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTimeTool } from './tools/time.js';
import { registerWeatherTool } from './tools/weather.js';
import { registerRollDiceTool } from './tools/dice.js';
import { registerRollDndTool } from './tools/dnd.js';
import { registerRollCocTool } from './tools/coc.js';
import { registerFlipCoinTool } from './tools/coin.js';
import { registerCastIchingTool } from './tools/iching.js';
import { registerDrawTarotTool } from './tools/tarot.js';
import { registerDrawQianTool } from './tools/qian.js';
import { registerQinyHealthTool } from './tools/qinyapi.js';
import { registerWebSearchTool } from './tools/websearch.js';

export const SERVER_NAME = 'nyaachat-mcp';
export const SERVER_VERSION = '0.1.0';

/**
 * Canonical tool registry. `name` MUST match the identifier each
 * register*Tool passes to `server.registerTool('<name>', …)` — it's the public
 * tool name used in tools/list and by the per-connection tool filter
 * (see src/toolFilter.ts). Order here is the order tools are registered.
 */
const TOOL_REGISTRY: ReadonlyArray<{ name: string; register: (s: McpServer) => void }> = [
  { name: 'get_current_time', register: registerTimeTool },
  { name: 'get_weather', register: registerWeatherTool },
  { name: 'roll_dice', register: registerRollDiceTool },
  { name: 'roll_dnd', register: registerRollDndTool },
  { name: 'roll_coc', register: registerRollCocTool },
  { name: 'flip_coin', register: registerFlipCoinTool },
  { name: 'cast_iching', register: registerCastIchingTool },
  { name: 'draw_tarot', register: registerDrawTarotTool },
  { name: 'draw_qian', register: registerDrawQianTool },
  { name: 'qinyapi_health_check', register: registerQinyHealthTool },
  { name: 'web_search', register: registerWebSearchTool },
];

/** All registrable tool names, in registration order. */
export const ALL_TOOL_NAMES: readonly string[] = TOOL_REGISTRY.map((t) => t.name);

export interface CreateServerOptions {
  /**
   * Restrict which tools are registered. When provided, only tools whose name
   * is in the set are registered (per-connection filtering). Omit / undefined
   * to register all tools.
   */
  enabledTools?: Set<string>;
}

export function createMcpServer(opts: CreateServerOptions = {}): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { logging: {} } },
  );

  const { enabledTools } = opts;
  for (const tool of TOOL_REGISTRY) {
    if (enabledTools && !enabledTools.has(tool.name)) continue;
    tool.register(server);
  }

  return server;
}
