import 'dotenv/config';
import { timingSafeEqual } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer, SERVER_NAME, SERVER_VERSION } from './server.js';

const PORT = Number(process.env.MCP_PORT ?? 3094);
const HOST = process.env.MCP_HOST ?? '0.0.0.0';
const MCP_PATH = '/mcp';

interface ApiKeyEntry {
  label: string;
  key: string;
}

function loadApiKeys(): ApiKeyEntry[] {
  const entries: ApiKeyEntry[] = [];
  const seen = new Set<string>();

  const legacy = process.env.MCP_API_KEY?.trim();
  if (legacy) {
    entries.push({ label: 'DEFAULT', key: legacy });
    seen.add(legacy);
  }

  for (const [name, raw] of Object.entries(process.env)) {
    if (!name.startsWith('MCP_API_KEY_')) continue;
    const value = raw?.trim();
    if (!value) continue;
    if (seen.has(value)) continue;
    const label = name.slice('MCP_API_KEY_'.length);
    if (!label) continue;
    entries.push({ label, key: value });
    seen.add(value);
  }
  return entries;
}

const API_KEYS = loadApiKeys();

function matchApiKey(provided: string): ApiKeyEntry | null {
  const a = Buffer.from(provided);
  for (const entry of API_KEYS) {
    const b = Buffer.from(entry.key);
    if (a.length !== b.length) continue;
    if (timingSafeEqual(a, b)) return entry;
  }
  return null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiKeyLabel?: string;
    }
  }
}

function checkAuth(req: Request): { ok: true; label: string | null } | { ok: false } {
  if (API_KEYS.length === 0) return { ok: true, label: null };
  const header = req.headers.authorization;
  if (!header) return { ok: false };
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  if (!match) return { ok: false };
  const entry = matchApiKey(match[1]);
  if (!entry) return { ok: false };
  return { ok: true, label: entry.label };
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const result = checkAuth(req);
  if (result.ok) {
    if (result.label) req.apiKeyLabel = result.label;
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

// Some clients (e.g. AstrBot, whose MCP layer connects via the legacy SSE
// client `mcp/client/sse.py`) establish the connection with GET /mcp and send
// messages back via POST /mcp?sessionId=... . We keep that transport working,
// but emit periodic SSE keepalive comments so an idle stream never hits the
// client's read timeout — otherwise the client's SSE reader can spin into a
// CPU-burning busy-loop after ReadTimeout. Streamable HTTP clients (POST
// without a sessionId) are handled in the POST branch below.
const SSE_KEEPALIVE_MS = 15_000;
const sseSessions = new Map<string, SSEServerTransport>();

function logAuth(req: Request, transport: 'sse' | 'streamable-http', method?: string): void {
  if (!req.apiKeyLabel) return;
  const tail = method ? ` (${method})` : '';
  console.log(`[mcp] auth ok via ${req.apiKeyLabel} [${transport}]${tail}`);
}

app.get(MCP_PATH, async (req: Request, res: Response) => {
  logAuth(req, 'sse');

  const server = createMcpServer();
  const transport = new SSEServerTransport(MCP_PATH, res);
  const sessionId = transport.sessionId;
  sseSessions.set(sessionId, transport);

  // SSE comment frames (lines starting with ':') are ignored by clients but
  // keep bytes flowing so the connection's read timeout never fires while idle.
  const keepalive = setInterval(() => {
    if (!res.writableEnded) res.write(': keepalive\n\n');
  }, SSE_KEEPALIVE_MS);
  keepalive.unref();

  const cleanup = () => {
    clearInterval(keepalive);
    if (sseSessions.get(sessionId) === transport) {
      sseSessions.delete(sessionId);
    }
    void transport.close();
    void server.close();
  };
  res.on('close', cleanup);

  try {
    await server.connect(transport);
  } catch (err) {
    console.error('[mcp] sse connect failed:', err);
    cleanup();
    if (!res.headersSent) {
      res.status(500).end();
    }
  }
});

app.post(MCP_PATH, async (req: Request, res: Response) => {
  const sessionId =
    typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;

  const method =
    typeof req.body === 'object' && req.body && 'method' in req.body
      ? String((req.body as { method?: unknown }).method ?? '')
      : '';

  if (sessionId) {
    const transport = sseSessions.get(sessionId);
    if (!transport) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32004, message: 'Unknown sessionId' },
        id: null,
      });
      return;
    }
    logAuth(req, 'sse', method);
    try {
      await transport.handlePostMessage(req, res, req.body);
    } catch (err) {
      console.error('[mcp] sse post failed:', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
    return;
  }

  logAuth(req, 'streamable-http', method);

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

app.delete(MCP_PATH, (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed.' },
    id: null,
  });
});

const httpServer = app.listen(PORT, HOST, () => {
  let authState: string;
  if (API_KEYS.length === 0) {
    authState = 'auth=DISABLED — set MCP_API_KEY (or MCP_API_KEY_<LABEL>) to require Bearer token';
  } else {
    const labels = API_KEYS.map((e) => e.label).join(', ');
    authState = `auth=enabled (${API_KEYS.length} key${API_KEYS.length > 1 ? 's' : ''}: ${labels})`;
  }
  console.log(
    `[${SERVER_NAME}] v${SERVER_VERSION} listening on http://${HOST}:${PORT}${MCP_PATH} | transports=streamable-http+sse | ${authState}`,
  );
  if (API_KEYS.length === 0) {
    console.warn(`[${SERVER_NAME}] WARNING: no API keys configured — endpoint is open to the public.`);
  }
});

const shutdown = (signal: string) => {
  console.log(`[${SERVER_NAME}] received ${signal}, shutting down...`);
  for (const t of sseSessions.values()) {
    void t.close();
  }
  sseSessions.clear();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
