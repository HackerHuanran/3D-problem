import { createRouter, createWebHistory } from 'vue-router'
import ProblemsView from '@/components/ProblemsView.vue'
import ProblemDetailView from '@/components/ProblemDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/3D-problem/',
      name: 'problems',
      component: ProblemsView
    },
    {
      path: '/3D-problem/detail/:id',
      name: 'problem-detail',
      component: ProblemDetailView
    }
  ],
})

export default router
