<template>
  <div class="app-container">
    <router-view v-if="!isAuthenticated" />
    
    <el-container v-else>
      <el-aside width="220px" class="sidebar">
        <div class="logo-container">
          <img src="@/assets/logo.png" alt="Logo" class="logo-img" />
          <h1 class="logo-text">灌溉调度系统</h1>
        </div>
        <el-menu
          router
          :default-active="activeMenu"
          class="el-menu-vertical"
          background-color="transparent"
          text-color="#b4c0d3"
          active-text-color="#ffffff">
          <el-menu-item index="/field" class="menu-item">
            <el-icon><Document /></el-icon>
            <span>地块管理</span>
          </el-menu-item>
          <el-menu-item index="/group" class="menu-item">
            <el-icon><FolderOpened /></el-icon>
            <span>分组管理</span>
          </el-menu-item>
          <el-menu-item index="/device" class="menu-item">
            <el-icon><Monitor /></el-icon>
            <span>设备管理</span>
          </el-menu-item>
          <el-menu-item index="/argument" class="menu-item">
            <el-icon><Setting /></el-icon>
            <span>灌溉参数</span>
          </el-menu-item>
          <el-menu-item index="/task" class="menu-item">
            <el-icon><Timer /></el-icon>
            <span>任务决策管理</span>
          </el-menu-item>
          <el-menu-item index="/schedule" class="menu-item">
            <el-icon><Calendar /></el-icon>
            <span>调度方案</span>
          </el-menu-item>
          <el-menu-item index="/websocket" class="menu-item">
            <el-icon><Connection /></el-icon>
            <span>WebSocket 测试</span>
          </el-menu-item>
        </el-menu>
        <div class="sidebar-footer">
          <span>智能灌溉系统</span>
        </div>
      </el-aside>
      <el-container class="main-container">
        <el-header class="main-header">
          <div class="header-left">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
              <el-breadcrumb-item>{{ getCurrentPageName() }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <el-dropdown @command="handleCommand">
              <span class="user-dropdown">
                <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"></el-avatar>
                <span class="user-name">{{ username }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                  <el-dropdown-item command="settings">系统设置</el-dropdown-item>
                  <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main class="main-content">
          <router-view />
        </el-main>
        <el-footer class="main-footer">
          智能灌溉调度系统 - 提供高效精准的农田灌溉解决方案
        </el-footer>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
/* eslint-disable no-unused-vars */
import { ref, computed, reactive, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Document, 
  Timer, 
  Monitor, 
  Connection, 
  Calendar, 
  FolderOpened,  // 导入文件夹图标
  Setting  // 导入设置图标
} from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => route.path)

// 用户信息
const isAuthenticated = computed(() => !!localStorage.getItem('isLogin'))
const username = computed(() => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      return user.username || '管理员'
    } catch (e) {
      return '管理员'
    }
  }
  return '管理员'
})

// 获取当前页面名称
const getCurrentPageName = () => {
  const routeMap = {
    '/field': '地块管理',
    '/group': '分组管理',
    '/task': '任务决策管理',
    '/device': '设备管理',
    '/argument': '灌溉参数',
    '/schedule': '调度方案',
    '/websocket': 'WebSocket 测试'
  }
  return routeMap[route.path] || '首页'
}

// 处理下拉菜单命令
const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm(
      '确定要退出登录吗?',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(() => {
      // 清除登录信息
      localStorage.removeItem('isLogin')
      localStorage.removeItem('user')
      // 跳转到登录页
      router.push('/login')
    }).catch(() => {
      // 取消操作
    })
  } else if (command === 'profile') {
    // 跳转到个人信息页面
    // router.push('/profile')
  } else if (command === 'settings') {
    // 跳转到系统设置页面
    // router.push('/settings')
  }
}

// 创建一个临时变量以使用 ref
const tempRef = ref(null)

// 在应用加载时检查登录状态
onMounted(() => {
  const isAuthenticated = !!localStorage.getItem('isLogin')
  if (!isAuthenticated && router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
})
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  background-color: #f5f7fa;
}

#app {
  height: 100%;
}

.app-container {
  height: 100%;
  overflow: hidden;
  display: flex;
}

.el-container {
  width: 100%;
  height: 100%;
}

/* 侧边栏样式 */
.sidebar {
  background: linear-gradient(180deg, #1e3c72 0%, #2a5298 100%);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s;
}

.logo-container {
  display: flex;
  align-items: center;
  padding: 20px;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-img {
  width: 32px;
  height: 32px;
  margin-right: 10px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.el-menu-vertical {
  border-right: none !important;
  background-color: transparent !important;
}

.menu-item {
  margin: 8px 0;
  border-radius: 4px;
  margin-left: 8px;
  margin-right: 8px;
}

.menu-item:hover, .menu-item.is-active {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.sidebar-footer {
  margin-top: auto;
  padding: 15px;
  text-align: center;
  font-size: 12px;
  color: #b4c0d3;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 主容器样式 */
.main-container {
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.main-header {
  background-color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.user-name {
  margin-left: 8px;
  font-size: 14px;
  color: #606266;
}

.main-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  height: calc(100% - 120px); /* 减去头部和底部的高度 */
}

.main-footer {
  text-align: center;
  color: #909399;
  font-size: 12px;
  padding: 15px 0;
  background-color: #ffffff;
  border-top: 1px solid #e4e7ed;
}

/* 内容卡片通用样式 */
.content-card {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.content-card:hover {
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.08);
}

/* 表格样式优化 */
.el-table {
  border-radius: 8px;
  overflow: hidden;
}

.el-table th {
  background-color: #f5f7fa !important;
  color: #606266 !important;
  font-weight: 600 !important;
}

.el-table--striped .el-table__body tr.el-table__row--striped td {
  background-color: #fafafa;
}

/* 按钮样式优化 */
.el-button {
  border-radius: 4px;
  font-weight: 500;
}

.el-button--primary {
  background-color: #1e3c72;
  border-color: #1e3c72;
}

.el-button--primary:hover, .el-button--primary:focus {
  background-color: #2a5298;
  border-color: #2a5298;
}

/* 表单样式优化 */
.el-form-item__label {
  font-weight: 500;
}

.el-input__inner, .el-textarea__inner {
  border-radius: 4px;
}

/* 分页样式优化 */
.el-pagination {
  margin-top: 20px;
  justify-content: flex-end;
}
</style>
