import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/cos-proxy': {
        target: 'https://7072-problem-d1gg06meg3dd7da6b-1257726828.cos.ap-shanghai.myqcloud.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/cos-proxy/, ''),
      },
    },
  },
})
