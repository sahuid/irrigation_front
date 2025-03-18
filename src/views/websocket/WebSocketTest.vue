<template>
  <div class="websocket-test">
    <div class="content-card">
      <div class="header-section">
        <h2>WebSocket 测试</h2>
        <el-tag :type="isConnected ? 'success' : 'danger'" effect="dark">
          {{ isConnected ? '已连接' : '未连接' }}
        </el-tag>
      </div>
      
      <el-divider />
      
      <div class="chat-section">
        <div class="chat-display" ref="chatDisplayRef">
          <div v-if="messages.length === 0" class="no-messages">
            暂无消息记录
          </div>
          <div v-for="(message, index) in messages" :key="index" class="message-item">
            <div class="message-direction">{{ message.type === 'sent' ? '发送' : '接收' }}:</div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>
        
        <div class="chat-input">
          <el-input
            v-model="messageToSend"
            placeholder="请输入消息"
            :disabled="!isConnected"
            @keyup.enter="sendMessage"
          >
            <template #append>
              <el-button @click="sendMessage" :disabled="!isConnected || !messageToSend.trim()">
                发送
              </el-button>
            </template>
          </el-input>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

// WebSocket 连接
let ws = null
const isConnected = ref(false)

// 消息相关
const messageToSend = ref('')
const messages = ref([])
const chatDisplayRef = ref(null)

// 建立 WebSocket 连接
const connectWebSocket = () => {
  try {
    ws = new WebSocket('ws://localhost:9000/api/chat')
    
    ws.onopen = () => {
      isConnected.value = true
      addMessage('WebSocket 连接已建立', 'received')
    }
    
    ws.onmessage = (event) => {
      addMessage(event.data, 'received')
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error)
      ElMessage.error('WebSocket 连接错误')
      isConnected.value = false
    }
    
    ws.onclose = () => {
      isConnected.value = false
      addMessage('WebSocket 连接已关闭', 'received')
    }
  } catch (error) {
    console.error('建立 WebSocket 连接失败:', error)
    ElMessage.error('建立 WebSocket 连接失败')
    isConnected.value = false
  }
}

// 发送消息
const sendMessage = () => {
  if (!isConnected.value || !ws || !messageToSend.value.trim()) return
  
  try {
    ws.send(messageToSend.value)
    addMessage(messageToSend.value, 'sent')
    messageToSend.value = ''
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败')
  }
}

// 添加消息到消息列表
const addMessage = (content, type) => {
  messages.value.push({
    content,
    type
  })
  
  // 滚动到底部
  nextTick(() => {
    if (chatDisplayRef.value) {
      chatDisplayRef.value.scrollTop = chatDisplayRef.value.scrollHeight
    }
  })
}

// 组件挂载时自动连接
onMounted(() => {
  connectWebSocket()
})

// 组件卸载时关闭连接
onUnmounted(() => {
  if (ws) {
    ws.close()
  }
})
</script>

<style scoped>
.websocket-test {
  padding: 20px;
}

.content-card {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.chat-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chat-display {
  height: 300px;
  overflow-y: auto;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.no-messages {
  text-align: center;
  color: #909399;
  padding: 20px;
}

.message-item {
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
}

.message-direction {
  font-weight: bold;
  min-width: 40px;
}

.message-content {
  word-break: break-word;
}

.chat-input {
  margin-top: 10px;
}

h2 {
  margin: 0;
}
</style> 