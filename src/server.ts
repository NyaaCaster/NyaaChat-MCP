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

export const SERVER_NAME = 'nyaachat-mcp';
export const SERVER_VERSION = '0.1.0';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { logging: {} } },
  );

  registerTimeTool(server);
  registerWeatherTool(server);
  registerRollDiceTool(server);
  registerRollDndTool(server);
  registerRollCocTool(server);
  registerFlipCoinTool(server);
  registerCastIchingTool(server);
  registerDrawTarotTool(server);
  registerDrawQianTool(server);

  return server;
}
