import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages project site is served from /wh40k-roster/; keep dev server at root.
  base: command === 'build' ? '/wh40k-roster/' : '/',
}))
