import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 配置axios - 移除/api前缀
axios.defaults.baseURL = process.env.VUE_APP_API_URL || ''  // 移除了'/api'

// 请求拦截器
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
axios.interceptors.response.use(
  response => {
    return response
  },
  error => {
    if (error.response && error.response.status === 401) {
      // 未授权，清除token并跳转到登录页
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus, {
  locale: zhCn
})
app.use(router)

// 忽略ResizeObserver循环错误
const ignoreResizeObserverErrors = () => {
  const originalError = window.console.error;
  window.console.error = (...args) => {
    if (args[0]?.includes?.('ResizeObserver loop') || 
        args[0]?.toString?.().includes?.('ResizeObserver loop')) {
      return;
    }
    originalError(...args);
  };
};

// 安装错误处理器
ignoreResizeObserverErrors();

// 全局错误处理
window.addEventListener('error', function(e) {
  if (e && e.message && e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }
}, true);

app.mount('#app')
