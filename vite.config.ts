import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // NVIDIA_API_KEY comes from .env (no VITE_ prefix, so it is never bundled
  // into client code) and is attached to proxied AI requests server-side.
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.NVIDIA_API_KEY ?? ''
  return {
    plugins: [react()],
    // Vercel serve from root
    base: '/',
    server: {
      proxy: {
        // NVIDIA Build API blocks browser CORS; in dev, proxy the AI assistant
        // through vite. Outside dev, run scripts/ai-proxy.mjs instead.
        '/nvapi': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/nvapi/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // A key entered in the app's AI settings takes precedence.
              if (apiKey && !proxyReq.getHeader('authorization')) {
                proxyReq.setHeader('authorization', `Bearer ${apiKey}`)
              }
            })
          },
        },
      },
    },
  }
})
