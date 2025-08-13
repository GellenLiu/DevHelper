import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import Index from '../components/Index.vue'
import ConfigView from '../views/ConfigView.vue'

export const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Index',
    component: Index
  },
  {
    path: '/config',
    name: 'Config',
    component: ConfigView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router