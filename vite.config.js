import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

const COS_PROXY_TARGET = process.env.VITE_TCB_COS_ORIGIN || ''

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: '3D故障库 — 3D打印故障排查',
        short_name: '3D故障库',
        description: '3D打印故障排查指南，收录翘边、拉丝、堵嘴等常见问题的分步解决方案',
        theme_color: '#1d1d1f',
        background_color: '#f5f5f7',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'zh-CN',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,woff2}', 'pwa-192.png', 'pwa-512.png'],
        runtimeCaching: [
          {
            urlPattern: /\/images\/problems\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'problem-images', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/.*\.cos\.ap-shanghai\.myqcloud\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'cos-images', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('@cloudbase/js-sdk') || id.includes('node_modules/@cloudbase')) {
            return 'vendor-tcb'
          }
        },
      },
    },
  },
  server: {
    proxy: COS_PROXY_TARGET ? {
      '/cos-proxy': {
        target: COS_PROXY_TARGET,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/cos-proxy/, ''),
      },
    } : {},
  },
})
