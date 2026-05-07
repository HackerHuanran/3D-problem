import { createRouter, createWebHistory } from 'vue-router'
import ProblemsView from '@/components/ProblemsView.vue'
import ProblemDetailView from '@/components/ProblemDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      // 修改这里：指向你 components 文件夹下真实的组件名
      component: () => import('../components/ProblemsView.vue') 
    },
    {
      path: '/detail/:id',
      name: 'problem-detail',
      // 修改这里：指向你 components 文件夹下真实的组件名
      component: () => import('../components/ProblemDetailView.vue')
    }
  ],
})

export default router
