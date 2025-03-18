<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <img src="@/assets/logo.png" alt="Logo" class="login-logo" />
        <h1 class="login-title">智能灌溉调度系统</h1>
      </div>
      
      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="登录" name="login">
          <el-form 
            ref="loginFormRef" 
            :model="loginForm" 
            :rules="loginRules" 
            label-position="top"
            @keyup.enter="handleLogin"
          >
            <el-form-item label="用户名" prop="username">
              <el-input 
                v-model="loginForm.username" 
                placeholder="请输入用户名" 
                prefix-icon="User"
              />
            </el-form-item>
            
            <el-form-item label="密码" prop="password">
              <el-input 
                v-model="loginForm.password" 
                type="password" 
                placeholder="请输入密码" 
                prefix-icon="Lock"
                show-password
              />
            </el-form-item>
            
            <div class="forgot-password">
              <el-link type="primary" :underline="false">忘记密码?</el-link>
            </div>
            
            <el-form-item>
              <el-button 
                type="primary" 
                class="login-button" 
                :loading="loading" 
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="注册" name="register">
          <el-form 
            ref="registerFormRef" 
            :model="registerForm" 
            :rules="registerRules" 
            label-position="top"
            @keyup.enter="handleRegister"
          >
            <el-form-item label="用户名" prop="username">
              <el-input 
                v-model="registerForm.username" 
                placeholder="请输入用户名" 
                prefix-icon="User"
              />
            </el-form-item>
            
            <el-form-item label="密码" prop="password">
              <el-input 
                v-model="registerForm.password" 
                type="password" 
                placeholder="请输入密码" 
                prefix-icon="Lock"
                show-password
              />
            </el-form-item>
            
            <el-form-item>
              <el-button 
                type="primary" 
                class="login-button" 
                :loading="loading" 
                @click="handleRegister"
              >
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
    
    <div class="login-footer">
      <p>智能灌溉调度系统 &copy; 2023 - 提供高效精准的农田灌溉解决方案</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
// eslint-disable-next-line no-unused-vars
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// eslint-disable-next-line no-unused-vars
const router = useRouter()
const activeTab = ref('login')
const loading = ref(false)
const loginFormRef = ref(null)
const registerFormRef = ref(null)

// 登录表单
const loginForm = reactive({
  username: '',
  password: ''
})

// 注册表单
const registerForm = reactive({
  username: '',
  password: ''
})

// 登录表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 注册表单验证规则
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      
      // 准备登录请求参数
      const loginData = {
        userAccount: loginForm.username,
        userPassword: loginForm.password
      }
      
      // 发送登录请求
      axios.post('/api/user/login', loginData)
        .then(response => {
          // 检查响应状态码是否为200
          if (response.data.code === 200) {
            // 登录成功
            // 获取用户详细信息
            return axios.get('/api/user/me')
              .then(userResponse => {
                if (userResponse.data.code === 200) {
                  const userInfo = userResponse.data.value || {}
                  
                  // 保存用户信息
                  localStorage.setItem('user', JSON.stringify({
                    id: userInfo.id,
                    username: userInfo.userName || loginForm.username,
                    account: userInfo.userAccount,
                    role: userInfo.userRole || 0,
                    avatar: userInfo.userPicture,
                    createTime: userInfo.createTime,
                    updateTime: userInfo.updateTime
                  }))
                  
                  // 设置登录状态
                  localStorage.setItem('isLogin', 'true')
                  
                  loading.value = false
                  ElMessage.success('登录成功')
                  
                  // 使用window.location强制页面完全重新加载，而不是使用Vue路由
                  window.location.href = '/'
                } else {
                  throw new Error(userResponse.data.msg || '获取用户信息失败')
                }
              })
          } else {
            loading.value = false
            // 登录失败
            ElMessage.error(response.data.msg || '登录失败，请检查用户名和密码')
          }
        })
        .catch(error => {
          loading.value = false
          console.error('登录请求错误:', error)
          ElMessage.error(error.message || '登录失败，请稍后重试')
        })
    }
  })
}

// 注册处理
const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  await registerFormRef.value.validate((valid) => {
    if (valid) {
      loading.value = true
      
      // 准备注册请求参数
      const registerData = {
        userAccount: registerForm.username,
        userPassword: registerForm.password
      }
      
      // 发送注册请求
      axios.post('/api/user/register', registerData)
        .then(response => {
          loading.value = false
          
          // 检查响应状态码是否为200
          if (response.data.code === 200) {
            // 注册成功
            ElMessage.success('注册成功，请登录')
            activeTab.value = 'login'
            
            // 清空注册表单
            registerForm.username = ''
            registerForm.password = ''
          } else {
            // 注册失败
            ElMessage.error(response.data.msg || '注册失败，请稍后重试')
          }
        })
        .catch(error => {
          loading.value = false
          console.error('注册请求错误:', error)
          ElMessage.error('注册失败，请稍后重试')
        })
    }
  })
}
</script>

<style scoped>
/* 修复全局样式冲突 */
.login-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  overflow-y: auto;
  padding: 20px;
  min-height: 100vh;
  box-sizing: border-box;
}

.login-box {
  width: 400px;
  max-width: 100%;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 30px;
  margin-bottom: 20px;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.login-logo {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
}

.login-title {
  font-size: 24px;
  color: #303133;
  margin: 0;
}

.login-tabs {
  margin-top: 20px;
}

.forgot-password {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  padding: 12px 0;
  font-size: 16px;
}

.login-footer {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  text-align: center;
  margin-top: 20px;
}

/* 覆盖Element Plus样式 */
:deep(.el-tabs__nav) {
  width: 100%;
}

:deep(.el-tabs__item) {
  flex: 1;
  text-align: center;
}

:deep(.el-form-item__label) {
  padding-bottom: 8px;
  font-weight: 500;
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #1e3c72 inset;
}

:deep(.el-button--primary) {
  background-color: #1e3c72;
  border-color: #1e3c72;
}

:deep(.el-button--primary:hover) {
  background-color: #2a5298;
  border-color: #2a5298;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .login-box {
    width: 100%;
    padding: 20px;
  }
}
</style> 