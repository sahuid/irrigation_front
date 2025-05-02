// 前端WebSocket服务器
const WebSocket = require('ws');
const http = require('http');

// 捕获未处理的错误
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

// 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('WebSocket服务器正在运行\n');
});

// 端口配置
const PORT = process.env.PORT || 9001;

console.log('正在启动WebSocket服务器...');

// 创建WebSocket服务器实例
const wss = new WebSocket.Server({ server });

console.log('WebSocket服务器实例创建成功');

// 存储所有连接的客户端
let clients = [];

// 存储消息历史
let messageHistory = [];
const MAX_HISTORY = 100;

// 当WebSocket服务器实例发生错误时
wss.on('error', (error) => {
  console.error('WebSocket服务器错误:', error);
});

// 当WebSocket连接建立时
wss.on('connection', function connection(ws, req) {
  const clientIp = req.socket.remoteAddress;
  console.log(`新的客户端已连接，IP地址: ${clientIp}`);
  
  // 将新客户端添加到客户端列表
  clients.push(ws);
  console.log(`当前客户端数量: ${clients.length}`);
  
  // 向新连接的客户端发送历史消息
  if (messageHistory.length > 0) {
    try {
      ws.send(JSON.stringify({
        type: 'history',
        data: messageHistory
      }));
      console.log('已发送历史消息给新客户端');
    } catch (error) {
      console.error('发送历史消息时出错:', error);
    }
  }
  
  // 监听客户端消息
  ws.on('message', function incoming(message) {
    try {
      const msgStr = message.toString();
      console.log(`收到消息 (来自 ${clientIp}):`, msgStr);
      
      // 将消息添加到历史记录中
      const messageObj = {
        content: msgStr,
        time: new Date().toISOString(),
        id: Date.now()
      };
      
      messageHistory.push(messageObj);
      
      // 限制历史记录的大小
      if (messageHistory.length > MAX_HISTORY) {
        messageHistory = messageHistory.slice(messageHistory.length - MAX_HISTORY);
      }
      
      // 向所有连接的客户端广播消息
      broadcast(msgStr, ws);
      
    } catch (error) {
      console.error('处理消息时出错:', error);
    }
  });
  
  // 监听错误事件
  ws.on('error', function(error) {
    console.error(`客户端 ${clientIp} 发生错误:`, error);
  });
  
  // 当连接关闭时
  ws.on('close', function(code, reason) {
    console.log(`客户端 ${clientIp} 已断开连接，代码: ${code}，原因: ${reason || '无'}`);
    // 从客户端列表中移除断开连接的客户端
    const index = clients.indexOf(ws);
    if (index !== -1) {
      clients.splice(index, 1);
      console.log(`客户端已移除，当前客户端数量: ${clients.length}`);
    }
  });
  
  // 发送欢迎消息
  try {
    ws.send(JSON.stringify({
      type: 'system',
      data: {
        message: '已连接到前端WebSocket服务器',
        time: new Date().toISOString()
      }
    }));
    console.log('已发送欢迎消息给新客户端');
  } catch (error) {
    console.error('发送欢迎消息时出错:', error);
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
        console.error('向客户端广播消息时出错:', error);
        failCount++;
      }
    }
  });
  
  console.log(`广播消息完成: 成功 ${successCount} 个客户端, 失败 ${failCount} 个客户端`);
}

// 启动服务器
server.listen(PORT, () => {
  console.log(`WebSocket服务器已在端口 ${PORT} 上启动`);
  console.log(`WebSocket地址: ws://localhost:${PORT}`);
  console.log('服务器启动时间:', new Date().toISOString());
}).on('error', (error) => {
  console.error('HTTP服务器错误:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请尝试其他端口或关闭占用该端口的应用`);
  }
}); 