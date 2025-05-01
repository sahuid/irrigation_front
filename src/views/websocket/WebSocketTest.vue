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
      
      <div class="apifox-guide">
        <h3>Apifox 连接指南</h3>
        <div class="guide-content">
          <div class="websocket-url">
            <span>WebSocket URL: </span>
            <el-tag type="info">{{ websocketUrl }}</el-tag>
            <el-button type="primary" size="small" @click="copyWebsocketUrl" style="margin-left: 10px;">
              复制
            </el-button>
          </div>
          <p>1. 在Apifox中创建WebSocket请求，使用上方URL进行连接</p>
          <p>2. 发送JSON格式的任务数据，包含以下字段：</p>
          <div class="code-block">
            <pre>{
  "type": "saveTask",
  "data": {
    "taskId": "任务ID",
    "fieldId": "地块ID",
    "fieldUnitIds": ["灌溉单元ID1", "灌溉单元ID2"],
    "startTime": "2023-06-01 08:00:00",
    "water": 100,
    "fertilizerN": 10,
    "fertilizerP": 20,
    "fertilizerK": 30
  }
}</pre>
          </div>
          <p>3. 系统将保存任务数据并返回结果</p>
        </div>
      </div>
      
      <el-divider />
      
      <div class="chat-section">
        <div class="chat-display" ref="chatDisplayRef">
          <div v-if="messages.length === 0" class="no-messages">
            暂无消息记录
          </div>
          <div v-for="(message, index) in messages" :key="index" class="message-item" :class="message.type">
            <div class="message-header">
              <span class="message-direction">{{ message.type === 'sent' ? '发送' : '接收' }}</span>
              <span class="message-time">{{ message.time }}</span>
            </div>
            <div class="message-content" v-if="isJsonString(message.content)">
              <pre>{{ formatJson(message.content) }}</pre>
            </div>
            <div class="message-content" v-else>{{ message.content }}</div>
          </div>
        </div>
        
        <div class="chat-input">
          <el-input
            v-model="messageToSend"
            type="textarea"
            :rows="4"
            placeholder="请输入JSON消息，例如任务数据"
            :disabled="!isConnected"
            @keyup.ctrl.enter="sendMessage"
          />
          <div class="button-group">
            <el-tooltip content="使用Ctrl+Enter快速发送">
              <el-button 
                type="primary" 
                @click="sendMessage" 
                :disabled="!isConnected || !messageToSend.trim()"
              >
                发送消息
              </el-button>
            </el-tooltip>
            <el-button
              type="success"
              @click="sendTaskTemplate"
              :disabled="!isConnected"
            >
              发送任务模板
            </el-button>
          </div>
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
const websocketUrl = ref('ws://localhost:9000/api/chat')

// 消息相关
const messageToSend = ref('')
const messages = ref([])
const chatDisplayRef = ref(null)

// 建立 WebSocket 连接
const connectWebSocket = () => {
  try {
    ws = new WebSocket(websocketUrl.value)
    
    ws.onopen = () => {
      isConnected.value = true
      addMessage('WebSocket 连接已建立', 'received')
    }
    
    ws.onmessage = (event) => {
      addMessage(event.data, 'received')
      
      // 尝试解析消息，检查是否是任务保存响应
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'taskSaved') {
          ElMessage.success('任务保存成功！')
        }
      } catch (e) {
        // 非JSON消息，不做处理
      }
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

// 判断字符串是否为JSON格式
const isJsonString = (str) => {
  try {
    JSON.parse(str)
    return true
  } catch (e) {
    return false
  }
}

// 格式化JSON字符串
const formatJson = (jsonString) => {
  try {
    const obj = JSON.parse(jsonString)
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return jsonString
  }
}

// 复制WebSocket URL
const copyWebsocketUrl = () => {
  navigator.clipboard.writeText(websocketUrl.value)
    .then(() => ElMessage.success('WebSocket URL已复制到剪贴板'))
    .catch(err => {
      console.error('复制失败:', err)
      ElMessage.error('复制失败')
    })
}

// 发送任务模板
const sendTaskTemplate = () => {
  const taskTemplate = {
    type: "saveTask",
    data: {
      taskId: "TASK_" + new Date().getTime(),
      fieldId: "F001",
      fieldUnitIds: ["FU001", "FU002"],
      startTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      water: 100,
      fertilizerN: 10,
      fertilizerP: 20,
      fertilizerK: 30
    }
  }
  
  messageToSend.value = JSON.stringify(taskTemplate, null, 2)
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
  const now = new Date()
  const timeString = now.toLocaleTimeString()
  
  messages.value.push({
    content,
    type,
    time: timeString
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

.apifox-guide {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
}

.apifox-guide h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #409EFF;
}

.guide-content {
  font-size: 14px;
  color: #606266;
}

.guide-content p {
  margin: 8px 0;
}

.websocket-url {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.code-block {
  background-color: #282c34;
  border-radius: 4px;
  padding: 10px;
  margin: 10px 0;
  color: #abb2bf;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
}

.chat-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chat-display {
  height: 350px;
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
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  max-width: 90%;
  border-radius: 4px;
  padding: 10px;
}

.message-item.sent {
  align-self: flex-end;
  background-color: #ecf5ff;
}

.message-item.received {
  align-self: flex-start;
  background-color: #f4f4f5;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
}

.message-direction {
  font-weight: bold;
  color: #409EFF;
}

.message-time {
  color: #909399;
}

.message-content {
  word-break: break-word;
}

.message-content pre {
  margin: 0;
  white-space: pre-wrap;
}

.chat-input {
  margin-top: 10px;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

h2, h3 {
  margin: 0;
}
</style> 