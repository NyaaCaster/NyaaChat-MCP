import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTimeTool } from './tools/time.js';
import { registerWeatherTool } from './tools/weather.js';

export const SERVER_NAME = 'nyaachat-mcp';
export const SERVER_VERSION = '0.1.0';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { logging: {} } },
  );

  registerTimeTool(server);
  registerWeatherTool(server);

  return server;
}
