// Vercel Edge Function proxy for NVIDIA AI API (catch-all)
// This file handles routes like /api/ai-proxy/* so requests to
// /api/ai-proxy/v1/... are forwarded to NVIDIA.

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const API_KEY = process.env.NVIDIA_API_KEY;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'NVIDIA_API_KEY not configured on server' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    // Keep everything after /api/ai-proxy
    const path = url.pathname.replace('/api/ai-proxy', '') || '/v1/chat/completions';
    const targetUrl = `${NVIDIA_API_BASE}${path}${url.search}`;

    const body = await req.text();

    const headers = new Headers(req.headers as any);
    headers.set('content-type', 'application/json');
    headers.set('authorization', `Bearer ${API_KEY}`);

    if (req.headers.get && req.headers.get('anthropic-version')) {
      headers.set('anthropic-version', req.headers.get('anthropic-version')!);
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
    });

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';

    const forwardHeaders: Record<string, string> = {
      'content-type': contentType,
    };

    return new Response(responseText, {
      status: response.status,
      headers: forwardHeaders,
    });
  } catch (error) {
    console.error('AI Proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Proxy error',
      detail: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export const config = {
  runtime: 'edge',
};
