import 'dotenv/config';
import { timingSafeEqual } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from './server.js';

const PORT = Number(process.env.MCP_PORT ?? 3094);
const HOST = process.env.MCP_HOST ?? '0.0.0.0';
const API_KEY = process.env.MCP_API_KEY?.trim() || null;
const MCP_PATH = '/mcp';

function checkAuth(req: Request): boolean {
  if (!API_KEY) return true;
  const header = req.headers.authorization;
  if (!header) return false;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  if (!match) return false;
  const provided = Buffer.from(match[1]);
  const expected = Buffer.from(API_KEY);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (checkAuth(req)) {
    next();
    return;
  }
  res.status(401).json({
    jsonrpc: '2.0',
    error: { code: -32001, message: 'Unauthorized: missing or invalid Authorization header' },
    id: null,
  });
}

const app = express();
app.use(express.json({ limit: '4mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: SERVER_NAME, version: SERVER_VERSION });
});

app.use(MCP_PATH, requireAuth);

app.post(MCP_PATH, async (req: Request, res: Response) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on('close', () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('[mcp] request failed:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

const methodNotAllowed = (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed.' },
    id: null,
  });
};
app.get(MCP_PATH, methodNotAllowed);
app.delete(MCP_PATH, methodNotAllowed);

const httpServer = app.listen(PORT, HOST, () => {
  const authState = API_KEY
    ? `auth=enabled (Bearer, ${API_KEY.length} chars)`
    : 'auth=DISABLED — set MCP_API_KEY to require Bearer token';
  console.log(
    `[${SERVER_NAME}] v${SERVER_VERSION} listening on http://${HOST}:${PORT}${MCP_PATH} | ${authState}`,
  );
  if (!API_KEY) {
    console.warn(`[${SERVER_NAME}] WARNING: MCP_API_KEY is not set — endpoint is open to the public.`);
  }
});

const shutdown = (signal: string) => {
  console.log(`[${SERVER_NAME}] received ${signal}, shutting down...`);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
