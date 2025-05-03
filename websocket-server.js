// 前端WebSocket服务器
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 捕获未处理的错误
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  logToFile('ERROR', `未捕获的异常: ${err.message}\n${err.stack}`);
});

// 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  logToFile('ERROR', `未处理的Promise拒绝: ${reason}`);
});

// 创建日志目录
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 日志文件路径
const LOG_FILE = path.join(LOG_DIR, `websocket-server-${new Date().toISOString().split('T')[0]}.log`);

// 写入日志到文件
function logToFile(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  fs.appendFile(LOG_FILE, logMessage, (err) => {
    if (err) {
      console.error('写入日志文件失败:', err);
    }
  });
}

// 添加CORS头信息的函数
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  // 设置CORS头信息
  setCorsHeaders(res);
  
  // 处理OPTIONS请求（预检请求）
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // 记录访问日志
  logToFile('INFO', `HTTP请求: ${req.method} ${req.url} 来自 ${req.socket.remoteAddress}`);
  
  // 根据请求路径和方法处理不同的请求
  if (req.url === '/status' && req.method === 'GET') {
    // 提供状态API
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'running',
      clients: clients.length,
      uptime: process.uptime(),
      messageHistory: messageHistory.length,
      startTime: serverStartTime
    }));
  } else if (req.url === '/history' && req.method === 'GET') {
    // 提供消息历史API
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(messageHistory));
  } else if (req.url === '/broadcast' && req.method === 'POST') {
    // 处理POST请求，用于广播消息
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
      
      // 防止过大的请求
      if (body.length > 1e6) {
        body = '';
        res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '请求体太大' }));
        req.connection.destroy();
      }
    });
    
    req.on('end', () => {
      try {
        // 尝试解析JSON数据
        const data = JSON.parse(body);
        
        // 将消息添加到历史记录
        const messageObj = {
          content: body,
          time: new Date().toISOString(),
          id: Date.now(),
          clientId: 'HTTP_API'
        };
        
        messageHistory.push(messageObj);
        
        // 限制历史记录的大小
        if (messageHistory.length > MAX_HISTORY) {
          messageHistory = messageHistory.slice(messageHistory.length - MAX_HISTORY);
        }
        
        // 广播消息给所有连接的客户端
        broadcast(body, null);
        
        // 返回成功响应
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          message: '消息已广播',
          clients: clients.length
        }));
        
        console.log(`消息已通过HTTP API广播到 ${clients.length} 个客户端`);
        logToFile('INFO', `消息已通过HTTP API广播: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
      } catch (error) {
        console.error('解析POST数据时出错:', error);
        logToFile('ERROR', `解析POST数据时出错: ${error.message}`);
        
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          error: '无效的JSON格式',
          details: error.message
        }));
      }
    });
  } else {
    // 默认响应
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('灌溉系统WebSocket服务器正在运行\n');
  }
});

// 端口配置
const PORT = process.env.PORT || 9001;

console.log('正在启动WebSocket服务器...');
logToFile('INFO', '正在启动WebSocket服务器...');

// 创建WebSocket服务器实例
const wss = new WebSocket.Server({ server });

console.log('WebSocket服务器实例创建成功');
logToFile('INFO', 'WebSocket服务器实例创建成功');

// 存储所有连接的客户端
let clients = [];

// 存储消息历史
let messageHistory = [];
const MAX_HISTORY = 100;

// 服务器启动时间
const serverStartTime = new Date().toISOString();

// 当WebSocket服务器实例发生错误时
wss.on('error', (error) => {
  console.error('WebSocket服务器错误:', error);
  logToFile('ERROR', `WebSocket服务器错误: ${error.message}`);
});

// 当WebSocket连接建立时
wss.on('connection', function connection(ws, req) {
  const clientIp = req.socket.remoteAddress;
  console.log(`新的客户端已连接，IP地址: ${clientIp}`);
  logToFile('INFO', `新的客户端已连接，IP地址: ${clientIp}`);
  
  // 为客户端分配ID
  const clientId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  ws.clientId = clientId;
  
  // 将新客户端添加到客户端列表
  clients.push(ws);
  console.log(`当前客户端数量: ${clients.length}`);
  logToFile('INFO', `当前客户端数量: ${clients.length}`);
  
  // 向新连接的客户端发送历史消息
  if (messageHistory.length > 0) {
    try {
      ws.send(JSON.stringify({
        type: 'history',
        data: messageHistory
      }));
      console.log('已发送历史消息给新客户端');
      logToFile('INFO', `已发送历史消息给客户端 ${clientId}`);
    } catch (error) {
      console.error('发送历史消息时出错:', error);
      logToFile('ERROR', `发送历史消息给客户端 ${clientId} 时出错: ${error.message}`);
    }
  }
  
  // 监听客户端消息
  ws.on('message', function incoming(message) {
    try {
      const msgStr = message.toString();
      console.log(`收到消息 (来自 ${clientIp}):`, msgStr);
      logToFile('INFO', `收到消息 (来自 ${clientIp}, 客户端ID: ${clientId}): ${msgStr.substring(0, 200)}${msgStr.length > 200 ? '...' : ''}`);
      
      // 将消息添加到历史记录中
      const messageObj = {
        content: msgStr,
        time: new Date().toISOString(),
        id: Date.now(),
        clientId: clientId
      };
      
      messageHistory.push(messageObj);
      
      // 限制历史记录的大小
      if (messageHistory.length > MAX_HISTORY) {
        messageHistory = messageHistory.slice(messageHistory.length - MAX_HISTORY);
      }
      
      // 处理JSON消息
      try {
        const jsonMessage = JSON.parse(msgStr);
        
        // 可以在这里添加对特定消息类型的处理
        if (jsonMessage.type === 'saveTask') {
          console.log('收到灌溉任务:', jsonMessage.data);
          logToFile('INFO', `收到灌溉任务: ${JSON.stringify(jsonMessage.data)}`);
          
          // 发送确认消息给发送者
          try {
            ws.send(JSON.stringify({
              type: 'response',
              status: 'success',
              message: '任务已接收',
              taskId: jsonMessage.data.taskId,
              time: new Date().toISOString()
            }));
          } catch (error) {
            console.error('发送确认消息时出错:', error);
            logToFile('ERROR', `发送确认消息给客户端 ${clientId} 时出错: ${error.message}`);
          }
        }
      } catch (jsonError) {
        // 不是JSON消息，忽略错误
      }
      
      // 向所有连接的客户端广播消息
      broadcast(msgStr, ws);
      
    } catch (error) {
      console.error('处理消息时出错:', error);
      logToFile('ERROR', `处理客户端 ${clientId} 消息时出错: ${error.message}`);
    }
  });
  
  // 监听错误事件
  ws.on('error', function(error) {
    console.error(`客户端 ${clientIp} (ID: ${clientId}) 发生错误:`, error);
    logToFile('ERROR', `客户端 ${clientIp} (ID: ${clientId}) 发生错误: ${error.message}`);
  });
  
  // 当连接关闭时
  ws.on('close', function(code, reason) {
    console.log(`客户端 ${clientIp} (ID: ${clientId}) 已断开连接，代码: ${code}，原因: ${reason || '无'}`);
    logToFile('INFO', `客户端 ${clientIp} (ID: ${clientId}) 已断开连接，代码: ${code}，原因: ${reason || '无'}`);
    
    // 从客户端列表中移除断开连接的客户端
    const index = clients.indexOf(ws);
    if (index !== -1) {
      clients.splice(index, 1);
      console.log(`客户端已移除，当前客户端数量: ${clients.length}`);
      logToFile('INFO', `客户端已移除，当前客户端数量: ${clients.length}`);
    }
  });
  
  // 发送欢迎消息
  try {
    ws.send(JSON.stringify({
      type: 'system',
      data: {
        message: '已连接到灌溉系统WebSocket服务器',
        clientId: clientId,
        time: new Date().toISOString()
      }
    }));
    console.log(`已发送欢迎消息给客户端 ${clientId}`);
    logToFile('INFO', `已发送欢迎消息给客户端 ${clientId}`);
  } catch (error) {
    console.error('发送欢迎消息时出错:', error);
    logToFile('ERROR', `发送欢迎消息给客户端 ${clientId} 时出错: ${error.message}`);
  }
});

// 广播消息到所有客户端（除了发送者）
function broadcast(message, sender) {
  let successCount = 0;
  let failCount = 0;
  
  clients.forEach(client => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        console.error(`向客户端 ${client.clientId} 广播消息时出错:`, error);
        logToFile('ERROR', `向客户端 ${client.clientId} 广播消息时出错: ${error.message}`);
        failCount++;
      }
    }
  });
  
  console.log(`广播消息完成: 成功 ${successCount} 个客户端, 失败 ${failCount} 个客户端`);
  logToFile('INFO', `广播消息完成: 成功 ${successCount} 个客户端, 失败 ${failCount} 个客户端`);
  
  return { success: successCount, fail: failCount };
}

// 定时发送心跳以保持连接
setInterval(() => {
  const timestamp = new Date().toISOString();
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'heartbeat',
          time: timestamp
        }));
      } catch (error) {
        console.error(`向客户端 ${client.clientId} 发送心跳时出错:`, error);
        logToFile('ERROR', `向客户端 ${client.clientId} 发送心跳时出错: ${error.message}`);
      }
    }
  });
}, 30000); // 每30秒发送一次心跳

// 启动服务器
server.listen(PORT, () => {
  console.log(`WebSocket服务器已在端口 ${PORT} 上启动`);
  console.log(`WebSocket地址: ws://localhost:${PORT}`);
  console.log('服务器启动时间:', new Date().toISOString());
  
  logToFile('INFO', `WebSocket服务器已在端口 ${PORT} 上启动`);
  logToFile('INFO', `WebSocket地址: ws://localhost:${PORT}`);
  logToFile('INFO', `服务器启动时间: ${new Date().toISOString()}`);
}).on('error', (error) => {
  console.error('HTTP服务器错误:', error);
  logToFile('ERROR', `HTTP服务器错误: ${error.message}`);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请尝试其他端口或关闭占用该端口的应用`);
    logToFile('ERROR', `端口 ${PORT} 已被占用，请尝试其他端口或关闭占用该端口的应用`);
  }
}); 