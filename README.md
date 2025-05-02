# irrigation_front

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## WebSocket测试功能使用指南

系统现在支持两种WebSocket连接模式：
1. 前端WebSocket服务器：可以被Apifox连接，用于测试
2. 后端WebSocket连接：连接到实际的后端系统

### 启动前端WebSocket服务器

1. 确保已经安装了依赖
   ```bash
   npm install ws --save
   ```

2. 启动WebSocket服务器
   ```bash
   node websocket-server.js
   ```
   
3. 服务器将在9001端口启动
   ```
   WebSocket服务器已在端口 9001 上启动
   WebSocket地址: ws://localhost:9001
   ```

### 使用Apifox连接前端WebSocket

1. 打开Apifox，创建新的WebSocket请求
2. 连接地址使用：`ws://localhost:9001`
3. 连接成功后，前端将显示连接状态
4. 现在可以从Apifox发送消息到前端WebSocket服务器
5. 所有连接到同一服务器的客户端都将收到消息

### 使用WebSocket测试页面

1. 启动前端应用
   ```bash
   npm run dev
   ```

2. 访问WebSocket测试页面
   - 导航到对应的WebSocket测试路由

3. 页面功能：
   - 连接状态显示：显示前端WebSocket服务器和后端WebSocket连接状态
   - 消息发送：可以向前端WebSocket服务器或后端WebSocket发送消息
   - 消息接收：显示从前端或后端收到的消息
   - JSON格式化：自动格式化JSON消息
   - 任务模板生成：生成标准任务格式的JSON

### 功能说明

1. **前端WebSocket服务器**
   - 作为一个中间服务，可以被Apifox或其他WebSocket客户端连接
   - 收到的消息会广播给所有连接的客户端
   - 保存消息历史记录

2. **后端WebSocket连接**
   - 直接连接到后端WebSocket服务
   - 可以发送任务数据和接收响应
   - 支持任务模板生成

### 注意事项

- 前端WebSocket服务器需要单独启动（`node websocket-server.js`）
- 需要管理员权限运行或确保Node.js缓存目录有写入权限
- 确保端口（9001）未被其他应用占用
