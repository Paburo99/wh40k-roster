import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // NVIDIA_API_KEY comes from .env (no VITE_ prefix, so it is never bundled
  // into client code) and is attached to proxied AI requests server-side.
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.NVIDIA_API_KEY ?? ''
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png', 'icons.svg'],
        manifest: {
          name: 'Tabletop Roster',
          short_name: 'Roster',
          description: 'Build and manage your tabletop army rosters',
          theme_color: '#0a0908',
          background_color: '#0a0908',
          display: 'standalone',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // App shell only; the multi-MB game data JSON is runtime-cached below.
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          // Never serve index.html for API/proxy requests.
          navigateFallbackDenylist: [/^\/api\//, /^\/nvapi\//],
          runtimeCaching: [
            {
              urlPattern: /\/data\/.*\.json$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'game-data',
                expiration: { maxEntries: 16 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts-css' },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-files',
                expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
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
