<template>
  <div class="group-management">
    <div class="content-card">
      <div class="card-header">
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            placeholder="搜索分组名称"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #append>
              <el-button @click="handleSearch">搜索</el-button>
            </template>
          </el-input>
        </div>
        <div class="action-box">
          <el-button type="primary" @click="handleAddGroup">
            <el-icon><Plus /></el-icon>添加分组
          </el-button>
        </div>
      </div>

      <el-table
        :data="groupList"
        border
        style="width: 100%"
        v-loading="loading"
        :empty-text="emptyText"
      >
        <el-table-column prop="id" label="分组ID" width="80" />
        <el-table-column prop="groupName" label="分组名称" width="150" />
        <el-table-column label="关联地块数" width="120">
          <template #default="scope">
            {{ scope.row.fieldList ? scope.row.fieldList.length : 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="scope">
            <el-button 
              size="small" 
              type="primary" 
              @click="handleEditGroup(scope.row)"
              :disabled="!hasEditPermission"
            >
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="handleViewFields(scope.row)"
            >
              查看地块
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleDeleteGroup(scope.row)"
              :disabled="!hasDeletePermission"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 分组表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分组' : '添加分组'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="groupFormRef"
        :model="groupForm"
        :rules="groupRules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item v-if="isEdit" label="分组ID" prop="id">
          <el-input v-model="groupForm.id" disabled />
        </el-form-item>
        <el-form-item label="分组名称" prop="groupName">
          <el-input v-model="groupForm.groupName" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitGroupForm" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看地块对话框 -->
    <el-dialog
      v-model="fieldDialogVisible"
      title="关联地块列表"
      width="800px"
      destroy-on-close
      :append-to-body="true"
    >
      <el-table
        :data="groupFields"
        border
        style="width: 100%"
        v-loading="fieldLoading"
        height="400px"
      >
        <el-table-column prop="id" label="地块ID" width="80" />
        <el-table-column prop="fieldId" label="地块编号" width="120" />
        <el-table-column prop="fieldUnitId" label="灌溉单元编号" width="150" />
        <el-table-column prop="fieldRange" label="地块范围" />
      </el-table>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeFieldDialog">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick, onUnmounted } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 分组列表数据
const groupList = ref([])
const loading = ref(false)
const emptyText = ref('暂无数据')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')

// 对话框相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const groupFormRef = ref(null)
const submitLoading = ref(false)

// 地块对话框相关
const fieldDialogVisible = ref(false)
const fieldLoading = ref(false)
const groupFields = ref([])

// 分组表单
const groupForm = reactive({
  id: '',
  groupName: ''
})

// 表单验证规则
const groupRules = {
  groupName: [
    { required: true, message: '请输入分组名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ]
}

// 权限控制
const hasEditPermission = computed(() => {
  // 这里可以根据用户角色判断是否有编辑权限
  return true
})

const hasDeletePermission = computed(() => {
  // 这里可以根据用户角色判断是否有删除权限
  return true
})

// 加载分组列表
const loadGroupList = async () => {
  loading.value = true
  emptyText.value = '加载中...'
  
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      query: searchQuery.value
    }
    
    const response = await axios.get('/api/group/query/page', { params })
    
    if (response.data.code === 200) {
      const data = response.data.value || {}
      groupList.value = data.records || []
      total.value = data.total || 0
      
      // 如果没有数据
      if (groupList.value.length === 0) {
        emptyText.value = searchQuery.value ? '没有找到匹配的分组' : '暂无分组数据'
      }
    } else {
      ElMessage.error(response.data.msg || '获取分组列表失败')
      emptyText.value = '加载失败'
    }
  } catch (error) {
    console.error('加载分组列表出错:', error)
    ElMessage.error('加载分组列表失败，请稍后重试')
    emptyText.value = '加载失败'
  } finally {
    loading.value = false
  }
}

// 处理页码变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  loadGroupList()
}

// 处理每页条数变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadGroupList()
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
  loadGroupList()
}

// 处理添加分组
const handleAddGroup = () => {
  isEdit.value = false
  // 重置表单，只保留分组名称字段为空
  groupForm.id = ''
  groupForm.groupName = ''
  dialogVisible.value = true
}

// 处理编辑分组
const handleEditGroup = (row) => {
  isEdit.value = true
  groupForm.id = row.id
  groupForm.groupName = row.groupName
  dialogVisible.value = true
}

// 处理查看地块
const handleViewFields = (row) => {
  // 先清空数据，再设置加载状态
  groupFields.value = []
  fieldLoading.value = true
  fieldDialogVisible.value = true
  
  // 使用nextTick确保DOM更新后再处理数据
  nextTick(() => {
    // 直接使用行数据中的fieldList
    if (row.fieldList && row.fieldList.length > 0) {
      groupFields.value = [...row.fieldList]
    } else {
      ElMessage.info('该分组暂无关联地块')
    }
    fieldLoading.value = false
  })
}

// 关闭地块对话框
const closeFieldDialog = () => {
  fieldDialogVisible.value = false
  // 清空数据，避免内存泄漏
  groupFields.value = []
}

// 处理删除分组
const handleDeleteGroup = (row) => {
  ElMessageBox.confirm(
    `确定要删除分组 "${row.groupName}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      // 使用正确的API路径和参数
      const response = await axios.delete('/api/group/delete', {
        params: { groupId: row.id }
      })
      
      if (response.data.code === 200) {
        ElMessage.success('删除成功')
        loadGroupList()
      } else {
        ElMessage.error(response.data.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除分组出错:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }).catch(() => {
    // 取消删除
  })
}

// 提交分组表单
const submitGroupForm = async () => {
  if (!groupFormRef.value) return
  
  await groupFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      
      try {
        let response
        
        if (isEdit.value) {
          // 编辑分组
          response = await axios.put('/api/group/update', groupForm)
        } else {
          // 添加分组 - 只发送必要的参数
          const addData = {
            groupName: groupForm.groupName
          }
          response = await axios.post('/api/group/add', addData)
        }
        
        if (response.data.code === 200) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          dialogVisible.value = false
          loadGroupList()
        } else {
          ElMessage.error(response.data.msg || (isEdit.value ? '更新失败' : '添加失败'))
        }
      } catch (error) {
        console.error(isEdit.value ? '更新分组出错:' : '添加分组出错:', error)
        ElMessage.error(isEdit.value ? '更新失败，请稍后重试' : '添加失败，请稍后重试')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 页面加载时获取分组列表
onMounted(() => {
  loadGroupList()
})

// 在组件卸载时清理
onUnmounted(() => {
  groupFields.value = []
})
</script>

<style scoped>
.group-management {
  width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-box {
  width: 350px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style> 