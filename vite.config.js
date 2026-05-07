import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: '/3D-problem/', // 必须和你的仓库名一致
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  base: '/3D-problem/', // 必须确保这一行存在，且前后都有斜杠
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
