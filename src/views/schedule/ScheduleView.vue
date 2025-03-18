<template>
  <div class="schedule-view">
    <div class="content-card">
      <div class="header-section">
        <h2>灌溉调度方案</h2>
      </div>
      
      <el-divider />
      
      <div class="empty-state">
        <el-empty description="暂无调度方案数据" />
      </div>
    </div>
  </div>
</template>

<script setup>
// 简化的空白页面
</script>

<style scoped>
.schedule-view {
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

.empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style> 