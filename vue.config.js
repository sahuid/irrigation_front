const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: 8080, // 前端开发服务器端口
    proxy: {
      '/api': {
        target: 'http://localhost:9000', // 后端服务器地址
        changeOrigin: true, // 支持跨域
        // pathRewrite: {
        //   '^/api': '' // 如果后端接口不包含 /api 前缀，则需要重写路径
        // }
      }
    }
  }
})
