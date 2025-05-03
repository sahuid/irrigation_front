<template>
  <div class="websocket-test">
    <div class="content-card">
      <div class="header-section">
        <h2>WebSocket 测试</h2>
        <el-tag type="info" effect="dark">双WebSocket连接模式</el-tag>
      </div>
      
      <el-divider />
      
      <div class="websocket-config">
        <h3>WebSocket 连接配置</h3>
        
        <h4>前端WebSocket服务</h4>
        <div class="config-form">
          <div class="form-item">
            <label>前端WebSocket地址：</label>
            <el-input 
              v-model="frontendWsUrl" 
              placeholder="例如: ws://localhost:9001"
              disabled
            >
              <template #append>
                <el-button @click="copyFrontendUrl">
                  复制
                </el-button>
              </template>
            </el-input>
          </div>
          
          <p class="note">
            <i class="el-icon-info"></i> 
            前端WebSocket服务器需要单独启动，运行 <code>node websocket-server.js</code> 命令。
          </p>
        </div>
        
        <el-divider></el-divider>
        
        <h4>后端WebSocket连接</h4>
        <div class="config-form">
          <div class="form-item">
            <label>后端WebSocket地址：</label>
            <el-input 
              v-model="backendWsUrl" 
              placeholder="例如: ws://localhost:9000/api/chat"
            >
              <template #append>
                <el-button @click="copyBackendUrl">
                  复制
                </el-button>
              </template>
            </el-input>
          </div>
          
          <div class="connection-buttons">
            <el-button 
              type="primary" 
              @click="connectToBackend" 
              :disabled="isConnectedBackend || !backendWsUrl"
              :loading="isConnectingBackend"
            >
              连接到后端
            </el-button>
            <el-button 
              type="danger" 
              @click="disconnectFromBackend" 
              :disabled="!isConnectedBackend"
            >
              断开连接
            </el-button>
          </div>
        </div>
      </div>
      
      <el-divider />
      
      <div class="status-section">
        <h3>连接状态</h3>
        <div class="status-container">
          <div class="status-item">
            <label>前端WebSocket：</label>
            <el-tag :type="isConnectedFrontend ? 'success' : 'danger'">
              {{ isConnectedFrontend ? '服务器运行中' : '服务器未运行' }}
            </el-tag>
          </div>
          <div class="status-item">
            <label>后端WebSocket：</label>
            <el-tag :type="isConnectedBackend ? 'success' : 'danger'">
              {{ isConnectedBackend ? '已连接' : '未连接' }}
            </el-tag>
          </div>
        </div>
      </div>
      
      <el-divider />
      
      <div class="data-selector-section">
        <h3>数据选择器</h3>
        
        <el-tabs v-model="dataSelectorActiveTab">
          <el-tab-pane label="分组管理" name="groups">
            <div class="data-selector-content">
              <div class="table-operations">
                <el-button type="primary" @click="loadGroupData">加载分组数据</el-button>
                <el-input 
                  v-model="groupSearchKeyword" 
                  placeholder="搜索分组" 
                  style="width: 200px; margin-left: 10px;" 
                  clearable
                />
              </div>
              
              <el-table 
                :data="filteredGroups" 
                style="width: 100%" 
                @selection-change="handleGroupSelectionChange"
                border
                v-loading="loadingGroups"
              >
                <el-table-column type="selection" width="55" />
                <el-table-column prop="id" label="ID" width="100" />
                <el-table-column prop="groupName" label="分组名称" />
                <el-table-column label="关联地块数" width="120">
                  <template #default="scope">
                    {{ scope.row.fieldList ? scope.row.fieldList.length : 0 }}
                  </template>
                </el-table-column>
                <el-table-column prop="groupSize" label="面积(m²)" width="120">
                  <template #default="scope">
                    {{ scope.row.groupSize || '0' }}
                  </template>
                </el-table-column>
                <el-table-column prop="createTime" label="创建时间" width="180" />
              </el-table>
              
              <div class="export-actions">
                <el-button 
                  type="success" 
                  @click="exportSelectedGroups" 
                  :disabled="selectedGroups.length === 0"
                >
                  导出选中分组
                </el-button>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="地块管理" name="fields">
            <div class="data-selector-content">
              <div class="table-operations">
                <el-button type="primary" @click="loadFieldData">加载地块数据</el-button>
                <el-input 
                  v-model="fieldSearchKeyword" 
                  placeholder="搜索地块" 
                  style="width: 200px; margin-left: 10px;" 
                  clearable
                />
              </div>
              
              <el-table 
                :data="filteredFields" 
                style="width: 100%" 
                @selection-change="handleFieldSelectionChange"
                border
                v-loading="loadingFields"
              >
                <el-table-column type="selection" width="55" />
                <el-table-column prop="id" label="ID" width="100" />
                <el-table-column prop="fieldName" label="地块名称" />
                <el-table-column prop="fieldSize" label="面积(m²)" width="100">
                  <template #default="scope">
                    {{ scope.row.fieldSize || '0' }}
                  </template>
                </el-table-column>
                <el-table-column label="灌溉单元数" width="120">
                  <template #default="scope">
                    {{ (scope.row.irrigationUnit && scope.row.irrigationUnit.length) || 0 }}
                  </template>
                </el-table-column>
                <el-table-column prop="createTime" label="创建时间" width="180" />
              </el-table>
              
              <div class="export-actions">
                <el-button 
                  type="success" 
                  @click="exportSelectedFields" 
                  :disabled="selectedFields.length === 0"
                >
                  导出选中地块
                </el-button>
              </div>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="灌溉任务生成器" name="taskGenerator">
            <div class="task-generator">
              <h4>创建灌溉任务</h4>
              <el-form :model="taskForm" label-width="120px">
                <el-form-item label="任务ID">
                  <el-input v-model="taskForm.taskId" placeholder="任务ID将自动生成">
                    <template #append>
                      <el-button @click="generateTaskId">生成ID</el-button>
                    </template>
                  </el-input>
                </el-form-item>
                
                <el-form-item label="选择地块">
                  <el-select 
                    v-model="taskForm.fieldId" 
                    placeholder="请选择地块"
                    filterable
                    @change="handleFieldChange"
                  >
                    <el-option
                      v-for="field in fields"
                      :key="field.id"
                      :label="`${field.fieldName || ''} (${field.fieldId || 'ID无'})`"
                      :value="field.id"
                    />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="选择灌溉单元">
                  <el-select 
                    v-model="taskForm.fieldUnitIds" 
                    placeholder="请选择灌溉单元"
                    multiple
                    :disabled="!taskForm.fieldId || !availableUnits.length"
                  >
                    <el-option
                      v-for="unit in availableUnits"
                      :key="unit.id"
                      :label="`${unit.fieldName || ''} (${unit.fieldUnitId || 'ID无'})`"
                      :value="unit.id"
                    />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="开始时间">
                  <el-date-picker
                    v-model="taskForm.startTime"
                    type="datetime"
                    placeholder="选择开始时间"
                    format="YYYY-MM-DD HH:mm:ss"
                  />
                </el-form-item>
                
                <el-divider />
                
                <el-form-item label="灌溉水量(m³)">
                  <el-input-number v-model="taskForm.water" :min="0" :step="10" :precision="0" />
                </el-form-item>
                
                <el-form-item label="氮肥用量(kg)">
                  <el-input-number v-model="taskForm.fertilizerN" :min="0" :precision="1" />
                </el-form-item>
                
                <el-form-item label="磷肥用量(kg)">
                  <el-input-number v-model="taskForm.fertilizerP" :min="0" :precision="1" />
                </el-form-item>
                
                <el-form-item label="钾肥用量(kg)">
                  <el-input-number v-model="taskForm.fertilizerK" :min="0" :precision="1" />
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="generateTaskJson">生成任务JSON</el-button>
                  <el-button @click="resetTaskForm">重置表单</el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>
        </el-tabs>
        
        <div v-if="exportedJson" class="json-preview">
          <div class="preview-header">
            <h4>生成的JSON数据：</h4>
            <div class="preview-actions">
              <el-button 
                type="primary" 
                size="small" 
                @click="sendJsonToWebSocket" 
                :disabled="!isConnectedFrontend"
              >
                发送到WebSocket
              </el-button>
              <el-button 
                type="info" 
                size="small" 
                @click="copyJson"
              >
                复制JSON
              </el-button>
            </div>
          </div>
          <pre>{{ exportedJson }}</pre>
        </div>
      </div>
      
      <el-divider />
      
      <div class="message-section">
        <div class="send-section">
          <h3>发送消息</h3>
          <el-tabs v-model="sendTabActive" type="card">
            <el-tab-pane label="向前端发送" name="frontend">
              <div class="tab-content">
                <el-input
                  v-model="frontendMessageToSend"
                  type="textarea"
                  :rows="5"
                  placeholder="请输入要发送到前端WebSocket服务器的消息"
                />
                <div class="message-controls">
                  <el-button
                    type="primary"
                    @click="sendFrontendMessage"
                    :disabled="!isConnectedFrontend || !frontendMessageToSend.trim()"
                  >
                    发送消息
                  </el-button>
                  <el-button
                    type="warning"
                    @click="formatFrontendMessage"
                    :disabled="!frontendMessageToSend.trim()"
                  >
                    格式化JSON
                  </el-button>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="向后端发送" name="backend">
              <div class="tab-content">
                <el-input
                  v-model="backendMessageToSend"
                  type="textarea"
                  :rows="5"
                  placeholder="请输入要发送到后端WebSocket的消息"
                />
                <div class="message-controls">
                  <el-button
                    type="primary"
                    @click="sendBackendMessage"
                    :disabled="!isConnectedBackend || !backendMessageToSend.trim()"
                  >
                    发送消息
                  </el-button>
                  <el-button
                    type="success"
                    @click="generateTaskTemplate"
                  >
                    生成任务模板
                  </el-button>
                  <el-button
                    type="warning"
                    @click="formatBackendMessage"
                    :disabled="!backendMessageToSend.trim()"
                  >
                    格式化JSON
                  </el-button>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
        
        <div class="receive-section">
          <h3>消息历史</h3>
          <el-tabs v-model="receiveTabActive" type="card">
            <el-tab-pane label="前端消息" name="frontend">
              <div class="messages-container" ref="frontendMessagesContainer">
                <div 
                  v-for="(msg, index) in frontendMessages" 
                  :key="index" 
                  :class="['message-item', msg.type]"
                >
                  <div class="message-header">
                    <span class="message-type">{{ getFrontendMessageType(msg) }}</span>
                    <span class="message-time">{{ msg.time }}</span>
                  </div>
                  <pre class="message-content">{{ msg.content }}</pre>
                </div>
                <div v-if="frontendMessages.length === 0" class="empty-message">
                  暂无消息
                </div>
              </div>
              <div class="messages-controls">
                <el-button type="info" @click="clearFrontendMessages">清空消息</el-button>
              </div>
            </el-tab-pane>
            <el-tab-pane label="后端消息" name="backend">
              <div class="messages-container" ref="backendMessagesContainer">
                <div 
                  v-for="(msg, index) in backendMessages" 
                  :key="index" 
                  :class="['message-item', msg.type]"
                >
                  <div class="message-header">
                    <span class="message-type">{{ msg.type === 'sent' ? '已发送' : '已接收' }}</span>
                    <span class="message-time">{{ msg.time }}</span>
                  </div>
                  <pre class="message-content">{{ msg.content }}</pre>
                </div>
                <div v-if="backendMessages.length === 0" class="empty-message">
                  暂无消息
                </div>
              </div>
              <div class="messages-controls">
                <el-button type="info" @click="clearBackendMessages">清空消息</el-button>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
      
      <el-divider />
      
      <div class="apifox-guide">
        <h3>Apifox 连接指南</h3>
        <p>现在有两种方式与WebSocket交互：</p>
        
        <h4>方式1：使用Apifox连接前端WebSocket服务器</h4>
        <ol>
          <li>在Apifox中创建WebSocket请求</li>
          <li>使用前端WebSocket地址 <code>ws://localhost:9001</code> 作为连接地址</li>
          <li>连接成功后，在Apifox中发送消息到前端WebSocket服务器</li>
          <li>所有连接到前端WebSocket服务器的客户端都将收到消息</li>
        </ol>
        
        <h4>方式2：使用Apifox连接后端WebSocket</h4>
        <ol>
          <li>在Apifox中创建WebSocket请求</li>
          <li>使用后端WebSocket地址作为连接地址</li>
          <li>连接成功后，可以在Apifox中直接与后端通信</li>
        </ol>
        
        <h4>任务数据格式示例</h4>
        <div class="task-format-example">
          <p>向后端WebSocket发送添加灌溉任务的JSON格式：</p>
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
          <p>说明：</p>
          <ul>
            <li><code>type</code>: 必须为 "saveTask"，表示保存灌溉任务</li>
            <li><code>taskId</code>: 任务唯一标识符</li>
            <li><code>fieldId</code>: 地块ID</li>
            <li><code>fieldUnitIds</code>: 灌溉单元ID数组</li>
            <li><code>startTime</code>: 开始时间，格式为 "YYYY-MM-DD HH:MM:SS"</li>
            <li><code>water</code>: 灌溉水量，单位为立方米</li>
            <li><code>fertilizerN</code>: 氮肥用量</li>
            <li><code>fertilizerP</code>: 磷肥用量</li>
            <li><code>fertilizerK</code>: 钾肥用量</li>
          </ul>
          <el-button 
            type="primary" 
            size="small" 
            @click="copyTaskFormat"
          >
            复制任务格式
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import { 
  connectWebSocket, 
  disconnectWebSocket, 
  sendMessage, 
  resetErrorState
} from '@/utils/websocketManager';

// 数据选择器相关
const dataSelectorActiveTab = ref('groups');
const groupSearchKeyword = ref('');
const fieldSearchKeyword = ref('');
const selectedGroups = ref([]);
const selectedFields = ref([]);
const exportedJson = ref(null);
const loadingGroups = ref(false);
const loadingFields = ref(false);

// 数据存储
const groups = ref([]);
const fields = ref([]);

// 过滤数据
const filteredGroups = computed(() => {
  if (!groupSearchKeyword.value) return groups.value;
  
  return groups.value.filter(group => 
    group.groupName && group.groupName.toLowerCase().includes(groupSearchKeyword.value.toLowerCase())
  );
});

const filteredFields = computed(() => {
  if (!fieldSearchKeyword.value) return fields.value;
  
  return fields.value.filter(field => 
    field.fieldName && field.fieldName.toLowerCase().includes(fieldSearchKeyword.value.toLowerCase())
  );
});

// 连接相关
const frontendWsUrl = ref('ws://localhost:9001');
const backendWsUrl = ref('ws://localhost:9000/api/chat');
const isConnectedFrontend = ref(false);
const isConnectedBackend = ref(false);
const isConnectingBackend = ref(false);

// 消息相关
const sendTabActive = ref('frontend');
const receiveTabActive = ref('frontend');
const frontendMessageToSend = ref('');
const backendMessageToSend = ref('');
const frontendMessages = ref([]);
const backendMessages = ref([]);
const frontendMessagesContainer = ref(null);
const backendMessagesContainer = ref(null);

// WebSocket 实例
let backendSocket = null; // 后端WebSocket仍然保留原始实现

// 灌溉任务生成器相关
const taskForm = reactive({
  taskId: `TASK_${Date.now()}`,
  fieldId: '',
  fieldUnitIds: [],
  startTime: new Date(),
  water: 100,
  fertilizerN: 10,
  fertilizerP: 20,
  fertilizerK: 30
});

const availableUnits = ref([]);

// 错误控制相关
// 删除未使用的变量
// const wsErrorShown = ref(false); // 添加标记变量，记录是否已经显示了WebSocket错误
// const lastErrorTime = ref(0); // 记录上次显示错误的时间

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

// 在组件挂载时安装错误处理器
onMounted(() => {
  ignoreResizeObserverErrors();
  // 加载初始数据
  loadGroupData();
  loadFieldData();
  
  // 初始化WebSocket管理服务
  resetErrorState();
  
  // 将初始连接延迟一下，避免页面刚加载就显示错误
  setTimeout(() => {
    // 使用WebSocket管理服务连接到前端WebSocket
    connectToFrontend();
  
    // 尝试每隔15秒重新连接前端WebSocket
    const reconnectInterval = setInterval(() => {
      if (!isConnectedFrontend.value) {
        console.log('尝试重新连接到前端WebSocket服务器...');
        connectToFrontend();
      }
    }, 15000);
    
    // 清理定时器
    onUnmounted(() => {
      clearInterval(reconnectInterval);
    });
  }, 1000);
});

// 组件卸载时断开连接
onUnmounted(() => {
  disconnectFromFrontend();
  disconnectFromBackend();
});

// 加载分组数据
const loadGroupData = async () => {
  loadingGroups.value = true;
  groups.value = [];
  
  try {
    const response = await axios.get('/api/group/query/page', {
      params: {
        page: 1,
        pageSize: 100 // 获取较多数据
      }
    });
    
    if (response.data.code === 200) {
      groups.value = response.data.value.records || [];
      ElMessage.success('已加载分组数据');
    } else {
      ElMessage.error(response.data.msg || '获取分组数据失败');
    }
  } catch (error) {
    console.error('获取分组数据出错:', error);
    ElMessage.error('获取分组数据失败，请稍后重试');
  } finally {
    loadingGroups.value = false;
  }
};

// 加载地块数据
const loadFieldData = async () => {
  loadingFields.value = true;
  fields.value = [];
  
  try {
    const response = await axios.get('/api/field/query/page', {
      params: {
        page: 1,
        pageSize: 100 // 获取较多数据
      }
    });
    
    if (response.data.code === 200) {
      fields.value = response.data.value.records || [];
      ElMessage.success('已加载地块数据');
    } else {
      ElMessage.error(response.data.msg || '获取地块数据失败');
    }
  } catch (error) {
    console.error('获取地块数据出错:', error);
    ElMessage.error('获取地块数据失败，请稍后重试');
  } finally {
    loadingFields.value = false;
  }
};

// 连接到前端WebSocket服务器
const connectToFrontend = () => {
  // 处理接收到的消息
  const handleMessage = (message) => {
    console.log('收到前端WebSocket消息:', message);
    try {
      // 尝试解析为JSON
      const data = JSON.parse(message);
      
      if (data.type === 'system') {
        // 系统消息
        addFrontendMessage('system', JSON.stringify(data.data, null, 2));
      } else if (data.type === 'history') {
        // 历史消息
        data.data.forEach(msg => {
          addFrontendMessage('history', msg.content);
        });
      } else {
        // 其他消息
        addFrontendMessage('received', message);
      }
    } catch (error) {
      // 普通文本消息
      addFrontendMessage('received', message);
    }
  };
  
  // 处理状态变化
  const handleStatusChange = (status) => {
    isConnectedFrontend.value = status;
  };
  
  // 使用WebSocket管理服务连接
  connectWebSocket(frontendWsUrl.value, handleMessage, handleStatusChange, true);
};

// 断开与前端WebSocket服务器的连接
const disconnectFromFrontend = () => {
  disconnectWebSocket();
  isConnectedFrontend.value = false;
};

// 发送消息到前端WebSocket服务器
const sendFrontendMessage = () => {
  if (!isConnectedFrontend.value || !frontendMessageToSend.value.trim()) return;
  
  try {
    // 使用WebSocket管理服务发送消息
    if (sendMessage(frontendMessageToSend.value)) {
      // 添加到消息列表
      addFrontendMessage('sent', frontendMessageToSend.value);
      
      // 清空输入框
      frontendMessageToSend.value = '';
    } else {
      ElMessage.error('发送消息到前端WebSocket服务器时出错');
    }
  } catch (error) {
    console.error('发送前端消息时出错:', error);
    ElMessage.error('发送消息到前端WebSocket服务器时出错');
  }
};

// 连接到后端WebSocket
const connectToBackend = async () => {
  if (isConnectedBackend.value || !backendWsUrl.value) return;
  
  try {
    isConnectingBackend.value = true;
    
    // 连接到后端WebSocket
    backendSocket = new WebSocket(backendWsUrl.value);
    
    // 监听后端连接打开
    backendSocket.onopen = () => {
      isConnectedBackend.value = true;
      ElMessage.success('已成功连接到后端WebSocket');
    };
    
    // 监听后端消息
    backendSocket.onmessage = (event) => {
      const message = event.data;
      
      // 添加到消息列表
      addBackendMessage('received', message);
    };
    
    // 监听后端连接错误
    backendSocket.onerror = (error) => {
      console.error('后端WebSocket连接错误:', error);
      ElMessage.error('连接到后端WebSocket时出错');
      disconnectFromBackend();
    };
    
    // 监听后端连接关闭
    backendSocket.onclose = () => {
      if (isConnectedBackend.value) {
        ElMessage.info('后端WebSocket连接已关闭');
        disconnectFromBackend();
      }
    };
    
  } catch (error) {
    console.error('创建WebSocket连接时出错:', error);
    ElMessage.error(`创建WebSocket连接时出错: ${error.message}`);
    disconnectFromBackend();
  } finally {
    isConnectingBackend.value = false;
  }
};

// 断开与后端的连接
const disconnectFromBackend = () => {
  // 关闭后端Socket
  if (backendSocket) {
    backendSocket.close();
    backendSocket = null;
  }
  
  // 更新状态
  isConnectedBackend.value = false;
  
  ElMessage.info('已断开后端WebSocket连接');
};

// 添加前端消息到列表
const addFrontendMessage = (type, content) => {
  try {
    // 尝试格式化JSON
    if (typeof content === 'string') {
      try {
        const formattedContent = JSON.parse(content);
        content = JSON.stringify(formattedContent, null, 2);
      } catch (e) {
        // 如果不是JSON则保持原样
      }
    }
    
    frontendMessages.value.push({
      type, // 'sent', 'received', 'system', 'history'
      content,
      time: new Date().toLocaleTimeString()
    });
    
    // 滚动到最新消息
    nextTick(() => {
      if (frontendMessagesContainer.value) {
        frontendMessagesContainer.value.scrollTop = frontendMessagesContainer.value.scrollHeight;
      }
    });
  } catch (error) {
    console.error('添加前端消息时出错:', error);
  }
};

// 添加后端消息到列表
const addBackendMessage = (type, content) => {
  try {
    // 尝试格式化JSON
    if (typeof content === 'string') {
      try {
        const formattedContent = JSON.parse(content);
        content = JSON.stringify(formattedContent, null, 2);
      } catch (e) {
        // 如果不是JSON则保持原样
      }
    }
    
    backendMessages.value.push({
      type, // 'sent' 或 'received'
      content,
      time: new Date().toLocaleTimeString()
    });
    
    // 滚动到最新消息
    nextTick(() => {
      if (backendMessagesContainer.value) {
        backendMessagesContainer.value.scrollTop = backendMessagesContainer.value.scrollHeight;
      }
    });
  } catch (error) {
    console.error('添加后端消息时出错:', error);
  }
};

// 发送消息到后端
const sendBackendMessage = () => {
  if (!isConnectedBackend.value || !backendMessageToSend.value.trim()) return;
  
  try {
    // 发送消息到后端
    backendSocket.send(backendMessageToSend.value);
    
    // 添加到消息列表
    addBackendMessage('sent', backendMessageToSend.value);
    
    // 清空输入框
    backendMessageToSend.value = '';
  } catch (error) {
    console.error('发送后端消息时出错:', error);
    ElMessage.error('发送消息到后端时出错');
  }
};

// 格式化前端JSON消息
const formatFrontendMessage = () => {
  try {
    if (!frontendMessageToSend.value.trim()) return;
    
    const obj = JSON.parse(frontendMessageToSend.value);
    frontendMessageToSend.value = JSON.stringify(obj, null, 2);
    ElMessage.success('JSON格式化成功');
  } catch (e) {
    ElMessage.error('无效的JSON格式');
  }
};

// 格式化后端JSON消息
const formatBackendMessage = () => {
  try {
    if (!backendMessageToSend.value.trim()) return;
    
    const obj = JSON.parse(backendMessageToSend.value);
    backendMessageToSend.value = JSON.stringify(obj, null, 2);
    ElMessage.success('JSON格式化成功');
  } catch (e) {
    ElMessage.error('无效的JSON格式');
  }
};

// 生成任务模板
const generateTaskTemplate = () => {
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
  };
  
  backendMessageToSend.value = JSON.stringify(taskTemplate, null, 2);
  ElMessage.success('已生成任务模板');
};

// 获取前端消息类型文本
const getFrontendMessageType = (msg) => {
  switch (msg.type) {
    case 'sent':
      return '已发送';
    case 'received':
      return '已接收';
    case 'system':
      return '系统消息';
    case 'history':
      return '历史消息';
    default:
      return msg.type;
  }
};

// 复制前端WebSocket URL
const copyFrontendUrl = () => {
  navigator.clipboard.writeText(frontendWsUrl.value)
    .then(() => ElMessage.success('前端WebSocket URL已复制到剪贴板'))
    .catch(err => {
      console.error('复制失败:', err);
      ElMessage.error('复制失败');
    });
};

// 复制后端URL
const copyBackendUrl = () => {
  navigator.clipboard.writeText(backendWsUrl.value)
    .then(() => ElMessage.success('后端WebSocket URL已复制到剪贴板'))
    .catch(err => {
      console.error('复制失败:', err);
      ElMessage.error('复制失败');
    });
};

// 清空前端消息
const clearFrontendMessages = () => {
  frontendMessages.value = [];
};

// 清空后端消息
const clearBackendMessages = () => {
  backendMessages.value = [];
};

// 处理数据选择器相关操作
const handleGroupSelectionChange = (selected) => {
  selectedGroups.value = selected;
};

const handleFieldSelectionChange = (selected) => {
  selectedFields.value = selected;
};

// 导出选中的分组数据
const exportSelectedGroups = () => {
  if (selectedGroups.value.length === 0) {
    ElMessage.warning('请至少选择一个分组');
    return;
  }
  
  // 创建JSON数据
  const jsonData = {
    type: 'groups',
    data: selectedGroups.value,
    timestamp: new Date().toISOString()
  };
  
  // 将JSON数据格式化为字符串并存储到exportedJson中
  exportedJson.value = JSON.stringify(jsonData, null, 2);
  
  ElMessage.success('已导出选中的分组数据');
};

// 导出选中的地块数据
const exportSelectedFields = () => {
  if (selectedFields.value.length === 0) {
    ElMessage.warning('请至少选择一个地块');
    return;
  }
  
  // 创建JSON数据
  const jsonData = {
    type: 'fields',
    data: selectedFields.value,
    selectedIds: selectedFields.value.map(field => field.id),
    timestamp: new Date().toISOString()
  };
  
  // 将JSON数据格式化为字符串并存储到exportedJson中
  exportedJson.value = JSON.stringify(jsonData, null, 2);
  
  ElMessage.success('已导出选中的地块数据');
};

// 发送JSON数据到WebSocket
const sendJsonToWebSocket = () => {
  if (!isConnectedFrontend.value) {
    ElMessage.warning('未连接到前端WebSocket服务器');
    return;
  }
  
  if (!exportedJson.value) {
    ElMessage.warning('没有可发送的JSON数据');
    return;
  }
  
  try {
    // 使用WebSocket管理服务发送消息
    if (sendMessage(exportedJson.value)) {
      // 添加发送的消息到消息列表
      addFrontendMessage('sent', exportedJson.value);
      
      ElMessage.success('已发送JSON数据到WebSocket');
    } else {
      ElMessage.error('发送JSON数据失败');
    }
  } catch (error) {
    console.error('发送JSON数据到WebSocket时出错:', error);
    ElMessage.error('发送JSON数据失败');
  }
};

// 复制JSON数据
const copyJson = () => {
  if (!exportedJson.value) {
    ElMessage.warning('没有可复制的JSON数据');
    return;
  }
  
  navigator.clipboard.writeText(exportedJson.value)
    .then(() => ElMessage.success('JSON数据已复制到剪贴板'))
    .catch(err => {
      console.error('复制失败:', err);
      ElMessage.error('复制失败');
    });
};

// 复制任务格式
const copyTaskFormat = () => {
  const taskFormat = {
    type: "saveTask",
    data: {
      taskId: "任务ID",
      fieldId: "地块ID",
      fieldUnitIds: ["灌溉单元ID1", "灌溉单元ID2"],
      startTime: "2023-06-01 08:00:00",
      water: 100,
      fertilizerN: 10,
      fertilizerP: 20,
      fertilizerK: 30
    }
  };
  
  navigator.clipboard.writeText(JSON.stringify(taskFormat, null, 2))
    .then(() => ElMessage.success('任务格式已复制到剪贴板'))
    .catch(err => {
      console.error('复制失败:', err);
      ElMessage.error('复制失败');
    });
};

// 生成任务ID
const generateTaskId = () => {
  taskForm.taskId = `TASK_${Date.now()}`;
};

// 处理地块变化
const handleFieldChange = (fieldId) => {
  // 清空已选灌溉单元
  taskForm.fieldUnitIds = [];
  
  if (!fieldId) {
    availableUnits.value = [];
    return;
  }
  
  // 查找选中的地块
  const selectedField = fields.value.find(field => field.id === fieldId);
  
  if (selectedField && selectedField.subField && selectedField.subField.length > 0) {
    // 使用子地块作为灌溉单元
    availableUnits.value = selectedField.subField;
  } else {
    availableUnits.value = [];
    ElMessage.warning('该地块没有关联的灌溉单元');
  }
};

// 生成任务JSON
const generateTaskJson = () => {
  if (!taskForm.fieldId) {
    ElMessage.warning('请选择地块');
    return;
  }
  
  if (!taskForm.fieldUnitIds || taskForm.fieldUnitIds.length === 0) {
    ElMessage.warning('请选择至少一个灌溉单元');
    return;
  }
  
  // 格式化开始时间
  const formattedStartTime = taskForm.startTime 
    ? new Date(taskForm.startTime).toISOString().replace('T', ' ').substr(0, 19)
    : '';
  
  // 创建任务JSON
  const taskJson = {
    type: 'saveTask',
    data: {
      taskId: taskForm.taskId,
      fieldId: taskForm.fieldId,
      fieldUnitIds: taskForm.fieldUnitIds,
      startTime: formattedStartTime,
      water: taskForm.water,
      fertilizerN: taskForm.fertilizerN,
      fertilizerP: taskForm.fertilizerP,
      fertilizerK: taskForm.fertilizerK
    }
  };
  
  // 将任务JSON设置为导出的JSON
  exportedJson.value = JSON.stringify(taskJson, null, 2);
  
  // 将任务JSON设置到后端消息框中
  backendMessageToSend.value = JSON.stringify(taskJson, null, 2);
  
  // 切换到后端消息选项卡
  sendTabActive.value = 'backend';
  
  ElMessage.success('已生成灌溉任务JSON');
};

// 重置任务表单
const resetTaskForm = () => {
  taskForm.taskId = `TASK_${Date.now()}`;
  taskForm.fieldId = '';
  taskForm.fieldUnitIds = [];
  taskForm.startTime = new Date();
  taskForm.water = 100;
  taskForm.fertilizerN = 10;
  taskForm.fertilizerP = 20;
  taskForm.fertilizerK = 30;
  
  availableUnits.value = [];
};
</script>

<style scoped>
.websocket-test {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.websocket-config {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
}

.websocket-config h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #409EFF;
}

.websocket-config h4 {
  margin: 10px 0;
  color: #606266;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 15px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-item label {
  font-weight: bold;
  color: #606266;
}

.connection-buttons {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.note {
  background-color: #e6f7ff;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 4px solid #1890ff;
  color: #606266;
  font-size: 14px;
  margin: 10px 0;
}

.note code {
  background-color: rgba(0, 0, 0, 0.04);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
}

.status-section {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
}

.status-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-item label {
  font-weight: bold;
  color: #606266;
  min-width: 120px;
}

.message-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.send-section,
.receive-section {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
}

.tab-content {
  padding: 15px 0;
}

.message-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.messages-container {
  height: 300px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  background-color: #f5f7fa;
  margin-bottom: 10px;
}

.message-item {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 4px;
  background-color: #fff;
  border-left: 4px solid #409EFF;
}

.message-item.sent {
  border-left-color: #67C23A;
}

.message-item.received {
  border-left-color: #E6A23C;
}

.message-item.system {
  border-left-color: #F56C6C;
}

.message-item.history {
  border-left-color: #909399;
  opacity: 0.8;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
  color: #909399;
}

.message-content {
  margin: 0;
  white-space: pre-wrap;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  color: #303133;
}

.messages-controls {
  display: flex;
  justify-content: flex-end;
}

.apifox-guide {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
}

.apifox-guide h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #409EFF;
}

.apifox-guide h4 {
  margin: 15px 0 10px;
  color: #606266;
}

.apifox-guide p {
  margin: 8px 0;
  color: #606266;
}

.apifox-guide ol {
  padding-left: 20px;
  color: #606266;
  margin-bottom: 15px;
}

.apifox-guide li {
  margin-bottom: 5px;
}

.apifox-guide code {
  background-color: #e6f7ff;
  padding: 2px 4px;
  border-radius: 3px;
  color: #1890ff;
  font-family: 'Courier New', Courier, monospace;
}

.task-format-example {
  background-color: #fff;
  border-radius: 4px;
  padding: 15px;
  border-left: 4px solid #67C23A;
  margin-top: 10px;
}

.task-format-example pre {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  white-space: pre-wrap;
  overflow-x: auto;
}

.task-format-example ul {
  padding-left: 20px;
  color: #606266;
}

.empty-message {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  color: #909399;
  font-style: italic;
}

h2, h3, h4 {
  margin: 0;
}

.data-selector-section {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
}

.data-selector-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.table-operations {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.export-actions {
  display: flex;
  justify-content: flex-end;
}

.json-preview {
  margin-top: 15px;
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  border-left: 4px solid #67C23A;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.preview-actions {
  display: flex;
  gap: 10px;
}

.task-generator {
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.task-generator h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #409EFF;
}

.task-generator .el-form {
  margin-bottom: 15px;
}

.task-generator .el-form-item {
  margin-bottom: 10px;
}

.task-generator .el-form-item label {
  font-weight: bold;
  color: #606266;
}

.task-generator .el-form-item .el-input,
.task-generator .el-form-item .el-select {
  width: 100%;
}

.task-generator .el-form-item .el-button {
  margin-left: 10px;
}
</style> 