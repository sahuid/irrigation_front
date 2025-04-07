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
        <el-table-column prop="id" label="分组ID" width="120" />
        <el-table-column prop="groupName" label="分组名称" width="250" />
        <el-table-column label="关联地块数" width="150">
          <template #default="scope">
            {{ scope.row.fieldList ? scope.row.fieldList.length : 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="groupRange" label="位置信息" width="300">
          <template #default="scope">
            <span v-if="scope.row.groupRange">
              {{ typeof scope.row.groupRange === 'string' ? scope.row.groupRange : JSON.stringify(scope.row.groupRange) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="400">
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
              type="info" 
              @click="handleAddIrrigationUnit(scope.row)"
              :disabled="!hasAddIrrigationUnitPermission"
            >
              添加灌溉单元
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
        <el-form-item label="位置信息" prop="groupRange">
          <div class="location-table">
            <div class="location-table-header">
              <div>
                <el-button type="primary" size="small" @click="addGroupLocationPoint">
                  <el-icon><Plus /></el-icon>添加位置点
                </el-button>
                <el-button type="warning" size="small" @click="resetGroupLocationInfo">
                  重置位置
                </el-button>
              </div>
              <span class="location-hint">至少需要3个点才能形成有效的范围</span>
            </div>
            <el-table :data="groupForm.groupRange" border style="width: 100%">
              <el-table-column label="序号" type="index" width="60" />
              <el-table-column label="经度" prop="longitude">
                <template #default="scope">
                  <el-input-number 
                    v-model="scope.row.longitude" 
                    :controls="false" 
                    :precision="6"
                    style="width: 100%"
                  />
                </template>
              </el-table-column>
              <el-table-column label="纬度" prop="latitude">
                <template #default="scope">
                  <el-input-number 
                    v-model="scope.row.latitude" 
                    :controls="false" 
                    :precision="6"
                    style="width: 100%"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="scope">
                  <el-button 
                    type="danger" 
                    size="small" 
                    @click="removeGroupLocationPoint(scope.$index)"
                    circle
                    icon="Delete"
                  />
                </template>
              </el-table-column>
            </el-table>
          </div>
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
      width="900px"
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
        <el-table-column prop="fieldUnitId" label="灌溉单元编号" width="120" />
        <el-table-column prop="fieldName" label="地块名称" width="150" />
        <el-table-column prop="fieldSize" label="灌溉面积" width="100" />
        <el-table-column prop="fieldRange" label="地块范围" width="120" />
        <el-table-column prop="groupId" label="分组ID" width="80" />
      </el-table>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeFieldDialog">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加灌溉单元对话框 -->
    <el-dialog
      v-model="irrigationUnitDialogVisible"
      title="添加灌溉单元到分组"
      width="800px"
    >
      <div class="dialog-action-bar">
        <el-button 
          type="primary" 
          @click="addSelectedUnitsToGroup" 
          :disabled="selectedUnits.length === 0"
          :loading="batchAddingLoading"
        >
          批量添加选中的灌溉单元
        </el-button>
      </div>
      
      <el-table
        :data="irrigationUnitList"
        border
        style="width: 100%"
        v-loading="irrigationUnitLoading"
        height="400px"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="fieldUnitId" label="灌溉单元编号" width="180" />
        <el-table-column prop="fieldName" label="名称" width="180" />
        <el-table-column prop="fieldSize" label="灌溉面积" width="120" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button 
              size="small" 
              type="primary" 
              @click="handleAddUnitToGroup(scope.row)"
              :loading="scope.row.adding"
            >
              添加
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, onUnmounted } from 'vue'
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
  groupName: '',
  groupRange: []
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

const hasAddIrrigationUnitPermission = computed(() => {
  // 这里可以根据用户角色判断是否有添加灌溉单元的权限
  return true
})

// 加载分组列表
const loadGroupList = async () => {
  loading.value = true
  emptyText.value = '加载中...'
  
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    
    // 如果有搜索关键字，添加到请求参数中
    if (searchQuery.value) {
      params.query = searchQuery.value
    }
    
    const response = await axios.get('/api/group/query/page', { params })
    
    if (response.data.code === 200) {
      const records = response.data.value.records || []
      
      // 检查第一条记录的位置信息格式
      if (records.length > 0) {
        console.log('获取到的第一条记录的位置信息:', records[0].groupRange, typeof records[0].groupRange)
      }
      
      groupList.value = records
      total.value = response.data.value.total || 0
      
      // 如果没有数据
      if (groupList.value.length === 0) {
        emptyText.value = searchQuery.value ? '没有找到匹配的分组' : '暂无分组数据'
      }
    } else {
      ElMessage.error(response.data.msg || '获取分组列表失败')
      groupList.value = []
      total.value = 0
      emptyText.value = '获取数据失败'
    }
  } catch (error) {
    console.error('获取分组列表出错:', error)
    ElMessage.error('获取分组列表失败，请稍后重试')
    groupList.value = []
    total.value = 0
    emptyText.value = '获取数据失败'
  } finally {
    loading.value = false
  }
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
  loadGroupList()
}

// 处理分页大小变化
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1 // 重置到第一页
  loadGroupList()
}

// 处理当前页变化
const handleCurrentChange = (val) => {
  currentPage.value = val
  loadGroupList()
}

// 处理添加分组
const handleAddGroup = () => {
  isEdit.value = false
  groupForm.id = ''
  groupForm.groupName = ''
  groupForm.groupRange = []
  dialogVisible.value = true
}

// 处理编辑分组
const handleEditGroup = (row) => {
  isEdit.value = true
  groupForm.id = row.id
  groupForm.groupName = row.groupName
  
  // 处理位置信息
  try {
    if (typeof row.groupRange === 'string') {
      groupForm.groupRange = JSON.parse(row.groupRange)
    } else if (Array.isArray(row.groupRange)) {
      groupForm.groupRange = row.groupRange
    } else {
      groupForm.groupRange = []
    }
  } catch (e) {
    console.error('解析位置信息出错:', e, '原始数据:', row.groupRange)
    groupForm.groupRange = []
  }
  
  dialogVisible.value = true
}

// 处理删除分组
const handleDeleteGroup = (row) => {
  ElMessageBox.confirm(
    `确定要删除分组 "${row.groupName}" 吗？这将同时解除与所有地块的关联。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
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

// 查看地块
const handleViewFields = async (row) => {
  fieldDialogVisible.value = true
  fieldLoading.value = true
  
  try {
    // 直接使用分组中的fieldList数据，不需要额外请求
    if (row.fieldList && row.fieldList.length > 0) {
      groupFields.value = row.fieldList
    } else {
      groupFields.value = []
    }
  } catch (error) {
    console.error('处理地块列表出错:', error)
    ElMessage.error('获取地块列表失败，请稍后重试')
    groupFields.value = []
  } finally {
    fieldLoading.value = false
  }
}

// 关闭地块对话框
const closeFieldDialog = () => {
  fieldDialogVisible.value = false
  groupFields.value = []
}

// 提交分组表单
const submitGroupForm = async () => {
  if (!groupFormRef.value) return
  
  await groupFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      
      try {
        // 检查是否有位置点
        if (groupForm.groupRange.length < 3) {
          ElMessage.warning('请至少添加3个位置点以形成有效的范围')
          submitLoading.value = false
          return
        }
        
        // 构造提交的数据
        const submitData = {
          ...groupForm,
          groupRange: groupForm.groupRange // 直接使用位置点数组
        }
        
        let response
        
        if (isEdit.value) {
          // 编辑分组
          response = await axios.put('/api/group/update', submitData)
        } else {
          // 添加分组
          response = await axios.post('/api/group/add', submitData)
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

// 添加灌溉单元对话框相关
const irrigationUnitDialogVisible = ref(false)
const irrigationUnitList = ref([])
const irrigationUnitLoading = ref(false)
const currentGroupForUnit = ref(null)
const selectedUnits = ref([])
const batchAddingLoading = ref(false)

// 处理表格选择变化
const handleSelectionChange = (selection) => {
  selectedUnits.value = selection
}

// 获取灌溉单元列表
const getIrrigationUnitList = async () => {
  irrigationUnitLoading.value = true
  
  try {
    const response = await axios.get('/api/field/list')
    
    if (response.data.code === 200) {
      // 为每个灌溉单元添加loading状态
      const units = (response.data.value || [])
        .filter(unit => unit.fieldUnitId) // 只保留有灌溉单元编号的记录
        .map(unit => ({
          ...unit,
          adding: false
        }))
      irrigationUnitList.value = units
    } else {
      ElMessage.error(response.data.msg || '获取灌溉单元列表失败')
      irrigationUnitList.value = []
    }
  } catch (error) {
    console.error('获取灌溉单元列表出错:', error)
    ElMessage.error('获取灌溉单元列表失败，请稍后重试')
    irrigationUnitList.value = []
  } finally {
    irrigationUnitLoading.value = false
  }
}

// 添加灌溉单元到分组
const handleAddUnitToGroup = async (unit) => {
  // 设置当前行的loading状态
  const index = irrigationUnitList.value.findIndex(item => item.id === unit.id)
  if (index !== -1) {
    irrigationUnitList.value[index].adding = true
  }
  
  try {
    const postData = {
      fieldId: [unit.id], // 修改为数组格式
      groupId: currentGroupForUnit.value.id
    }
    
    const response = await axios.post('/api/field/to/group', postData)
    
    if (response.data.code === 200) {
      ElMessage.success('添加灌溉单元成功')
      // 从列表中移除已添加的灌溉单元
      irrigationUnitList.value = irrigationUnitList.value.filter(item => item.id !== unit.id)
      // 清空选中的单元
      selectedUnits.value = selectedUnits.value.filter(item => item.id !== unit.id)
    } else {
      ElMessage.error(response.data.msg || '添加灌溉单元失败')
    }
  } catch (error) {
    console.error('添加灌溉单元出错:', error)
    ElMessage.error('添加灌溉单元失败，请稍后重试')
  } finally {
    // 重置loading状态
    if (index !== -1 && irrigationUnitList.value[index]) {
      irrigationUnitList.value[index].adding = false
    }
  }
}

// 批量添加选中的灌溉单元到分组
const addSelectedUnitsToGroup = async () => {
  if (selectedUnits.value.length === 0) return
  
  batchAddingLoading.value = true
  
  try {
    const postData = {
      fieldId: selectedUnits.value.map(unit => unit.id),
      groupId: currentGroupForUnit.value.id
    }
    
    const response = await axios.post('/api/field/to/group', postData)
    
    if (response.data.code === 200) {
      ElMessage.success(`成功添加 ${selectedUnits.value.length} 个灌溉单元`)
      
      // 从列表中移除已添加的灌溉单元
      const selectedIds = selectedUnits.value.map(unit => unit.id)
      irrigationUnitList.value = irrigationUnitList.value.filter(item => !selectedIds.includes(item.id))
      
      // 清空选中的单元
      selectedUnits.value = []
    } else {
      ElMessage.error(response.data.msg || '批量添加灌溉单元失败')
    }
  } catch (error) {
    console.error('批量添加灌溉单元出错:', error)
    ElMessage.error('批量添加灌溉单元失败，请稍后重试')
  } finally {
    batchAddingLoading.value = false
  }
}

// 处理添加灌溉单元
const handleAddIrrigationUnit = (row) => {
  currentGroupForUnit.value = row
  irrigationUnitDialogVisible.value = true
  selectedUnits.value = []
  getIrrigationUnitList()
}

// 位置点处理函数
const addGroupLocationPoint = () => {
  groupForm.groupRange.push({
    longitude: 116.4074,
    latitude: 39.9042
  })
}

const removeGroupLocationPoint = (index) => {
  groupForm.groupRange.splice(index, 1)
}

const resetGroupLocationInfo = () => {
  groupForm.groupRange = []
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

.content-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 20px;
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

.empty-members {
  padding: 30px 0;
}

.dialog-search-box {
  margin-bottom: 20px;
}

.dialog-action-bar {
  margin-bottom: 15px;
  display: flex;
  justify-content: flex-end;
}

.location-table {
  margin-bottom: 20px;
}

.location-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.location-hint {
  color: #909399;
  font-size: 12px;
}
</style> 