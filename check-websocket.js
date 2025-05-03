// 检查WebSocket服务器状态的脚本
const http = require('http');
const WebSocket = require('ws');

// 配置
const HOST = 'localhost';
const HTTP_PORT = 9001;
const WS_URL = `ws://${HOST}:${HTTP_PORT}`;

console.log('===============================');
console.log('灌溉系统WebSocket服务器状态检查');
console.log('===============================');

// 检查HTTP服务器状态
function checkHttpStatus() {
  return new Promise((resolve, reject) => {
    console.log(`\n[1] 检查HTTP服务器状态 (http://${HOST}:${HTTP_PORT})...`);
    
    const req = http.get(`http://${HOST}:${HTTP_PORT}/status`, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ HTTP服务器正在运行');
          console.log('状态码:', res.statusCode);
          
          try {
            // 尝试解析为JSON
            const status = JSON.parse(data);
            console.log('服务器信息:');
            console.log('- 状态:', status.status);
            console.log('- 客户端数量:', status.clients);
            console.log('- 消息历史数量:', status.messageHistory);
            console.log('- 运行时间:', Math.floor(status.uptime / 60), '分钟');
            console.log('- 启动时间:', status.startTime);
            
            resolve(status);
          } catch (error) {
            console.log('服务器响应:', data);
            resolve(true);
          }
        } else {
          console.log('❌ HTTP服务器返回错误状态码:', res.statusCode);
          console.log('响应内容:', data);
          reject(new Error(`HTTP服务器返回错误状态码: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 无法连接到HTTP服务器');
      console.log('错误详情:', error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log('❌ HTTP请求超时');
      reject(new Error('HTTP请求超时'));
    });
    
    req.setTimeout(5000); // 5秒超时
  });
}

// 测试WebSocket连接
function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log(`\n[2] 测试WebSocket连接 (${WS_URL})...`);
    
    const ws = new WebSocket(WS_URL);
    let messageReceived = false;
    
    // 连接打开时
    ws.on('open', () => {
      console.log('✅ WebSocket连接成功建立');
      
      // 发送测试消息
      setTimeout(() => {
        console.log('发送测试消息...');
        try {
          ws.send(JSON.stringify({
            type: 'test',
            message: 'Hello from check-websocket.js',
            time: new Date().toISOString()
          }));
        } catch (error) {
          console.log('❌ 发送消息失败:', error.message);
        }
      }, 1000);
      
      // 如果10秒内没有收到消息，则自动关闭连接
      setTimeout(() => {
        if (!messageReceived) {
          console.log('⚠️ 警告: 未收到服务器响应消息');
          ws.close();
        }
      }, 10000);
    });
    
    // 收到消息时
    ws.on('message', (data) => {
      messageReceived = true;
      console.log('✅ 收到服务器消息');
      
      try {
        const message = JSON.parse(data);
        console.log('消息类型:', message.type);
        console.log('消息内容:', JSON.stringify(message, null, 2));
      } catch (error) {
        console.log('消息内容:', data.toString());
      }
      
      // 收到消息后等待1秒关闭连接
      setTimeout(() => {
        ws.close();
      }, 1000);
    });
    
    // 发生错误时
    ws.on('error', (error) => {
      console.log('❌ WebSocket连接错误:', error.message);
      reject(error);
    });
    
    // 连接关闭时
    ws.on('close', (code, reason) => {
      if (code !== 1000) {
        console.log(`WebSocket连接关闭，代码: ${code}，原因: ${reason || '无'}`);
      } else {
        console.log('WebSocket连接正常关闭');
      }
      
      if (messageReceived) {
        resolve(true);
      } else {
        reject(new Error('未收到服务器消息'));
      }
    });
  });
}

// 测试广播API
function testBroadcastAPI() {
  return new Promise((resolve, reject) => {
    console.log(`\n[3] 测试广播API (http://${HOST}:${HTTP_PORT}/broadcast)...`);
    
    // 创建POST请求选项
    const options = {
      hostname: HOST,
      port: HTTP_PORT,
      path: '/broadcast',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // 创建测试数据
    const testData = {
      type: 'test',
      message: 'Testing broadcast API',
      source: 'check-websocket.js',
      time: new Date().toISOString()
    };
    
    // 将数据转换为JSON字符串
    const postData = JSON.stringify(testData);
    
    // 创建POST请求
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 广播API测试成功');
          console.log('状态码:', res.statusCode);
          
          try {
            // 尝试解析响应为JSON
            const response = JSON.parse(responseData);
            console.log('响应内容:');
            console.log('- 成功:', response.success);
            console.log('- 消息:', response.message);
            console.log('- 客户端数量:', response.clients);
            
            resolve(response);
          } catch (error) {
            console.log('服务器响应:', responseData);
            resolve(true);
          }
        } else {
          console.log('❌ 广播API返回错误状态码:', res.statusCode);
          console.log('响应内容:', responseData);
          reject(new Error(`广播API返回错误状态码: ${res.statusCode}`));
        }
      });
    });
    
    // 处理请求错误
    req.on('error', (error) => {
      console.log('❌ 无法连接到广播API');
      console.log('错误详情:', error.message);
      reject(error);
    });
    
    // 设置超时
    req.on('timeout', () => {
      req.destroy();
      console.log('❌ 广播API请求超时');
      reject(new Error('广播API请求超时'));
    });
    
    req.setTimeout(5000); // 5秒超时
    
    // 发送请求数据
    req.write(postData);
    req.end();
  });
}

// 运行测试
async function runTests() {
  let httpStatus = false;
  let wsConnection = false;
  let broadcastAPI = false;
  
  try {
    // 检查HTTP状态
    httpStatus = await checkHttpStatus();
  } catch (error) {
    console.log('HTTP状态检查失败');
  }
  
  if (httpStatus) {
    try {
      // 测试WebSocket连接
      wsConnection = await testWebSocketConnection();
    } catch (error) {
      console.log('WebSocket连接测试失败');
    }
    
    try {
      // 测试广播API
      broadcastAPI = await testBroadcastAPI();
    } catch (error) {
      console.log('广播API测试失败');
    }
  }
  
  // 总结
  console.log('\n===============================');
  console.log('测试结果总结');
  console.log('===============================');
  console.log('HTTP服务器状态检查:', httpStatus ? '✅ 通过' : '❌ 失败');
  console.log('WebSocket连接测试:', wsConnection ? '✅ 通过' : '❌ 失败');
  console.log('广播API测试:', broadcastAPI ? '✅ 通过' : '❌ 失败');
  console.log('总体状态:', (httpStatus && wsConnection) ? '✅ 服务器运行正常' : '❌ 服务器存在问题');
  console.log('===============================');
  
  process.exit(httpStatus && wsConnection ? 0 : 1);
}

// 执行测试
runTests().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
}); 