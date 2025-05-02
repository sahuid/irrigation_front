// WebSocket服务器检查脚本
const WebSocket = require('ws');
const http = require('http');

// 端口配置
const PORT = process.env.PORT || 9001;
const WS_URL = `ws://localhost:${PORT}`;
const HTTP_URL = `http://localhost:${PORT}`;

console.log(`正在检查WebSocket服务器 ${WS_URL}...`);

// 检查HTTP服务是否可用
function checkHttp() {
  return new Promise((resolve, reject) => {
    console.log(`发送HTTP请求到 ${HTTP_URL}...`);
    
    const req = http.get(HTTP_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`HTTP响应状态码: ${res.statusCode}`);
        console.log(`HTTP响应内容: ${data.trim()}`);
        
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`HTTP请求失败，状态码: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`HTTP请求错误: ${error.message}`);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('HTTP请求超时'));
    });
  });
}

// 检查WebSocket是否可用
function checkWebSocket() {
  return new Promise((resolve, reject) => {
    console.log(`尝试连接到WebSocket服务器 ${WS_URL}...`);
    
    const ws = new WebSocket(WS_URL);
    let connected = false;
    
    ws.on('open', () => {
      console.log('WebSocket连接成功!');
      connected = true;
      
      // 发送测试消息
      const testMessage = JSON.stringify({
        type: 'test',
        data: {
          message: '测试消息',
          time: new Date().toISOString()
        }
      });
      
      console.log(`发送测试消息: ${testMessage}`);
      ws.send(testMessage);
      
      // 3秒后关闭连接
      setTimeout(() => {
        ws.close();
        resolve(true);
      }, 3000);
    });
    
    ws.on('message', (data) => {
      console.log(`收到WebSocket消息: ${data}`);
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket连接错误: ${error.message}`);
      if (!connected) {
        reject(error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket连接已关闭');
    });
    
    // 设置连接超时
    setTimeout(() => {
      if (!connected) {
        ws.terminate();
        reject(new Error('WebSocket连接超时'));
      }
    }, 5000);
  });
}

// 运行测试
async function runTests() {
  try {
    // 检查HTTP服务
    console.log('======== 检查HTTP服务 ========');
    await checkHttp();
    console.log('✅ HTTP服务检查通过');
    
    // 检查WebSocket服务
    console.log('\n======== 检查WebSocket服务 ========');
    await checkWebSocket();
    console.log('✅ WebSocket服务检查通过');
    
    console.log('\n🎉 所有检查都已通过! WebSocket服务器运行正常。');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ 检查失败: ${error.message}`);
    console.error('请确保WebSocket服务器正在运行，并且端口没有被占用。');
    console.error('使用命令 node websocket-server.js 启动服务器。');
    process.exit(1);
  }
}

runTests(); 