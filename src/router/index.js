// src/router/index.js
// 页面跳转由 App.vue 的状态控制，不需要路由
// 保留此文件是因为 main.js 中 app.use(router) 需要它

import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: []  // 空路由，不拦截任何跳转
})

export default router
