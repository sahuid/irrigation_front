/**
 * WebSocket连接管理服务
 * 提供统一的WebSocket连接管理和错误处理
 */
import { ElMessage } from 'element-plus';

// WebSocket实例
let websocket = null;

// 连接状态
let isConnected = false;

// 错误控制
let wsErrorShown = false;
let lastErrorTime = 0;

// 消息处理回调函数
let messageHandler = null;

// 状态改变回调函数
let statusChangeHandler = null;

/**
 * 初始化并连接到WebSocket服务器
 * @param {string} url WebSocket服务器地址
 * @param {function} onMessage 消息处理回调函数
 * @param {function} onStatusChange 状态改变回调函数
 * @param {boolean} showConnectionStatus 是否显示连接状态消息
 * @returns {boolean} 连接是否成功初始化
 */
export function connectWebSocket(url, onMessage, onStatusChange, showConnectionStatus = false) {
  try {
    console.log('正在连接到WebSocket服务器:', url);
    
    // 保存回调函数
    messageHandler = onMessage;
    statusChangeHandler = onStatusChange;
    
    // 如果已经存在连接，先关闭
    if (websocket) {
      websocket.close();
      websocket = null;
    }
    
    // 创建新的WebSocket连接
    websocket = new WebSocket(url);
    
    // 连接成功时
    websocket.onopen = () => {
      console.log('WebSocket连接成功');
      isConnected = true;
      wsErrorShown = false; // 重置错误显示标记
      
      if (showConnectionStatus) {
        ElMessage.success('已连接到WebSocket服务器');
      }
      
      // 通知状态变化
      if (statusChangeHandler) {
        statusChangeHandler(true);
      }
    };
    
    // 接收消息时
    websocket.onmessage = (event) => {
      console.log('收到WebSocket消息:', event.data);
      
      // 处理消息
      if (messageHandler) {
        messageHandler(event.data);
      }
    };
    
    // 连接错误时
    websocket.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
      
      // 只有当错误提示未显示或上次显示已超过30秒时才显示错误消息
      const now = Date.now();
      if (!wsErrorShown && showConnectionStatus && (now - lastErrorTime > 30000)) {
        ElMessage.error('连接到WebSocket服务器时出错，请确保服务器已启动');
        wsErrorShown = true;
        lastErrorTime = now;
      }
      
      isConnected = false;
      
      // 通知状态变化
      if (statusChangeHandler) {
        statusChangeHandler(false);
      }
    };
    
    // 连接关闭时
    websocket.onclose = () => {
      console.log('WebSocket连接已关闭');
      
      if (isConnected && showConnectionStatus) {
        ElMessage.info('WebSocket连接已关闭');
      }
      
      isConnected = false;
      
      // 通知状态变化
      if (statusChangeHandler) {
        statusChangeHandler(false);
      }
    };
    
    return true;
  } catch (error) {
    console.error('创建WebSocket连接时出错:', error);
    
    // 只有当错误提示未显示或上次显示已超过30秒时才显示错误消息
    const now = Date.now();
    if (!wsErrorShown && showConnectionStatus && (now - lastErrorTime > 30000)) {
      ElMessage.error(`创建WebSocket连接时出错: ${error.message}`);
      wsErrorShown = true;
      lastErrorTime = now;
    }
    
    isConnected = false;
    
    // 通知状态变化
    if (statusChangeHandler) {
      statusChangeHandler(false);
    }
    
    return false;
  }
}

/**
 * 断开WebSocket连接
 */
export function disconnectWebSocket() {
  if (websocket) {
    websocket.close();
    websocket = null;
  }
  
  isConnected = false;
  
  // 通知状态变化
  if (statusChangeHandler) {
    statusChangeHandler(false);
  }
}

/**
 * 发送消息到WebSocket服务器
 * @param {string|object} message 要发送的消息
 * @returns {boolean} 发送是否成功
 */
export function sendMessage(message) {
  if (!isConnected || !websocket) {
    console.warn('WebSocket未连接，无法发送消息');
    return false;
  }
  
  try {
    // 如果传入的是对象，转换为JSON字符串
    if (typeof message === 'object') {
      message = JSON.stringify(message);
    }
    
    websocket.send(message);
    return true;
  } catch (error) {
    console.error('发送WebSocket消息时出错:', error);
    return false;
  }
}

/**
 * 获取当前连接状态
 * @returns {boolean} 是否已连接
 */
export function isWebSocketConnected() {
  return isConnected;
}

/**
 * 重置错误提示状态
 * 可以在组件加载时调用此方法重置错误显示状态
 */
export function resetErrorState() {
  wsErrorShown = false;
  lastErrorTime = 0;
}

/**
 * 检查WebSocket服务器状态
 * @param {string} checkUrl 检查服务器状态的URL
 * @param {function} callback 检查结果回调函数
 * @param {boolean} silent 是否静默检查（不显示错误提示）
 */
export async function checkServerStatus(checkUrl, callback, silent = false) {
  try {
    // 使用fetch API检查服务器状态
    const response = await fetch(checkUrl, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      mode: 'cors',
      cache: 'no-cache',
      timeout: 5000 
    });
    
    if (response.ok) {
      const data = await response.json();
      isConnected = true;
      wsErrorShown = false; // 重置错误显示标记
      
      if (!silent) {
        ElMessage.success('WebSocket服务器正在运行');
      }
      
      if (callback) {
        callback(true, data);
      }
    } else {
      isConnected = false;
      
      if (!silent) {
        ElMessage.error('WebSocket服务器响应异常');
      }
      
      if (callback) {
        callback(false);
      }
    }
  } catch (error) {
    isConnected = false;
    
    if (!silent) {
      // 只有当错误提示未显示或上次显示已超过60秒时才显示错误消息
      const now = Date.now();
      if (!wsErrorShown || (now - lastErrorTime > 60000)) {
        ElMessage.error('无法连接到WebSocket服务器，请确保服务器已启动');
        wsErrorShown = true;
        lastErrorTime = now;
      }
    }
    
    console.error('WebSocket服务器检查错误:', error);
    
    if (callback) {
      callback(false, error);
    }
  }
} 