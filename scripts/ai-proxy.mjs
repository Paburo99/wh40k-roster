// Minimal CORS proxy for the NVIDIA Build API. integrate.api.nvidia.com does
// not send CORS headers, so the app cannot call it from the browser directly.
//
// Usage:  node scripts/ai-proxy.mjs [port]   (or npm run ai-proxy)
//
// The key is read from NVIDIA_API_KEY — either from the environment or from
// the app's .env file — or can be entered in the app's AI settings instead
// (a key sent by the app takes precedence). Default port: 8787.

import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function keyFromDotEnv() {
  try {
    const envFile = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env'), 'utf8');
    return envFile.match(/^\s*NVIDIA_API_KEY\s*=\s*("?)(.*?)\1\s*$/m)?.[2] ?? '';
  } catch {
    return '';
  }
}

const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8787);
const KEY = process.env.NVIDIA_API_KEY || keyFromDotEnv();
const UPSTREAM = 'https://integrate.api.nvidia.com';

http
  .createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'authorization, content-type');
    res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.method !== 'POST' || !req.url?.startsWith('/v1/')) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'POST /v1/chat/completions only' }));
      return;
    }
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      const auth = req.headers.authorization ?? (KEY ? `Bearer ${KEY}` : '');
      try {
        const up = await fetch(UPSTREAM + req.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
          body,
        });
        res.writeHead(up.status, { 'content-type': up.headers.get('content-type') ?? 'application/json' });
        res.end(Buffer.from(await up.arrayBuffer()));
      } catch (e) {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: String(e) }));
      }
    });
  })
  .listen(PORT, () => {
    console.log(`AI proxy listening on http://localhost:${PORT} → ${UPSTREAM}`);
    console.log(KEY ? 'Using NVIDIA_API_KEY (environment or .env).' : 'No NVIDIA_API_KEY found — the app must send its own key.');
  });
