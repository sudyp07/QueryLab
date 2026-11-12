import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/QueryLab/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['sql-wasm.wasm', 'favicon.svg'],
      manifest: {
        name: 'QueryLab | Database Learning Laboratory',
        short_name: 'QueryLab',
        description: 'Private, offline SQL and document database learning in your browser.',
        theme_color: '#101b32', background_color: '#f5f7fb', display: 'standalone',
        start_url: '/QueryLab/', scope: '/QueryLab/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,wasm,woff2}'],
        maximumFileSizeToCacheInBytes: 7 * 1024 * 1024,
        navigateFallback: '/QueryLab/index.html',
        navigateFallbackDenylist: [/^\/QueryLab\/api\//]
      }
    })
  ],
  worker: { format: 'es' },
  test: { environment: 'node', include: ['src/tests/**/*.test.ts'] }
});
