import { createRouter, createWebHistory } from 'vue-router'
import FieldManagement from '../views/field/FieldManagement.vue'
import TaskManagement from '../views/task/TaskManagement.vue'
import DeviceManagement from '../views/device/DeviceManagement.vue'
import GroupManagement from '../views/group/GroupManagement.vue'
import WebSocketTest from '../views/websocket/WebSocketTest.vue'
import ScheduleView from '../views/schedule/ScheduleView.vue'
import MonitorView from '../views/monitor/MonitorView.vue'
import LoginView from '../views/auth/LoginView.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/field',
    meta: { requiresAuth: true }
  },
  {
    path: '/field',
    name: 'Field',
    component: FieldManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/task',
    name: 'Task',
    component: TaskManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/device',
    name: 'Device',
    component: DeviceManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/group',
    name: 'Group',
    component: GroupManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/schedule',
    name: 'Schedule',
    component: ScheduleView,
    meta: { requiresAuth: true }
  },
  {
    path: '/monitor',
    name: 'Monitor',
    component: MonitorView,
    meta: { requiresAuth: true }
  },
  {
    path: '/websocket',
    name: 'WebSocket',
    component: WebSocketTest,
    meta: { requiresAuth: true }
  },
  // 捕获所有未匹配的路由，重定向到登录页或首页
  {
    path: '/:pathMatch(.*)*',
    // eslint-disable-next-line no-unused-vars
    redirect: to => {
      const isAuthenticated = !!localStorage.getItem('isLogin')
      return isAuthenticated ? '/' : '/login'
    }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('isLogin')
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    // 需要登录但未登录，重定向到登录页
    next({ name: 'Login' })
  } else if (to.name === 'Login' && isAuthenticated) {
    // 已登录用户访问登录页，重定向到首页
    next({ path: '/' })
  } else {
    // 其他情况正常放行
    next()
  }
})

export default router 