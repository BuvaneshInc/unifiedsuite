import http from 'node:http';
import { Readable } from 'node:stream';
import worker from './dist/index.js';

// In-Memory Cloudflare KV & R2 Mocks for Local Edge Execution
const kvStore = new Map();
const mockEnv = {
  KV_SYNC: {
    async put(key, value) {
      kvStore.set(key, value);
      console.log(`[Edge KV] PUT ${key} (${value.length} bytes)`);
    },
    async get(key) {
      return kvStore.get(key) || null;
    },
    async list({ prefix = '' }) {
      const keys = Array.from(kvStore.keys())
        .filter(k => k.startsWith(prefix))
        .map(name => ({ name }));
      return { keys };
    }
  },
  MODEL_CACHE: {
    async get(key) {
      return null; // Model cache mock
    }
  }
};

const port = process.env.PORT || 8787;

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const fullUrl = `http://${req.headers.host || 'localhost:' + port}${req.url}`;
    const webReq = new Request(fullUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? Readable.toWeb(req) : null,
      duplex: 'half'
    });

    const webRes = await worker.fetch(webReq, mockEnv);

    res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
    const buf = await webRes.arrayBuffer();
    res.end(Buffer.from(buf));
  } catch (err) {
    console.error('[Edge Error]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(port, () => {
  console.log(`[Foundry CDN Edge] Local edge server listening on http://0.0.0.0:${port}`);
});
