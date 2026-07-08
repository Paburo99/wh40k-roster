import type { VercelRequest, VercelResponse } from '@vercel/node';

// NVIDIA Build API endpoint
const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';

// Get API key from environment (set NVIDIA_API_KEY in Vercel project settings)
const API_KEY = process.env.NVIDIA_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'NVIDIA_API_KEY not configured on server' });
  }

  // Extract the path after /api/ai-proxy
  const path = req.url?.replace('/api/ai-proxy', '') || '/v1/chat/completions';

  try {
    const response = await fetch(`${NVIDIA_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${API_KEY}`,
        ...(req.headers['anthropic-version'] ? { 'anthropic-version': req.headers['anthropic-version'] as string } : {}),
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Forward the status code and headers
    res.status(response.status);
    if (response.headers.get('content-type')) {
      res.setHeader('content-type', response.headers.get('content-type')!);
    }

    return res.json(data);
  } catch (error) {
    console.error('AI Proxy error:', error);
    return res.status(500).json({
      error: 'Proxy error',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

export const config = {
  runtime: 'edge',
};