import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // The icon artwork already carries its own dark background, so the
    // maskable/apple variants only need enough padding to survive cropping.
    maskable: {
      sizes: [512],
      padding: 0.1,
      resizeOptions: { background: '#0a0908' },
    },
    apple: {
      sizes: [180],
      padding: 0.1,
      resizeOptions: { background: '#0a0908' },
    },
  },
  images: ['public/app-icon.svg'],
})
