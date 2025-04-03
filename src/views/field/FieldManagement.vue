<template>
  <div class="field-management">
    <div class="content-card">
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索地块编号或名称"
          clearable
          @clear="getFieldList"
          @keyup.enter="getFieldList"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button @click="getFieldList">搜索</el-button>
          </template>
        </el-input>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>添加地块
        </el-button>
      </div>

      <el-table
        :data="fieldList"
        border
        style="width: 100%"
        v-loading="loading"
        :empty-text="loading ? '加载中...' : (fieldList.length === 0 ? '暂无数据' : '')"
        row-key="id"
        :tree-props="{ children: 'subField' }"
        default-expand-all
      >
        <el-table-column prop="fieldId" label="地块编号" width="120" />
        <el-table-column prop="fieldName" label="地块名称" width="150" />
        <el-table-column prop="fieldUnitId" label="灌溉单元编号" width="150">
          <template #default="scope">
            {{ scope.row.fieldUnitId || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="fieldSize" label="灌溉面积" width="120">
          <template #default="scope">
            {{ scope.row.fieldSize || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="fieldRange" label="位置信息" width="120">
          <template #default="scope">
            <el-button 
              size="small" 
              type="info" 
              @click="showLocation(scope.row.fieldRange)"
              v-if="scope.row.fieldRange"
            >
              <el-icon><Location /></el-icon>查看
            </el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="350">
          <template #default="scope">
            <el-button 
              size="small" 
              type="primary" 
              @click="handleEditField(scope.row)"
              :disabled="!hasEditPermission"
            >
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="handleAddToGroup(scope.row)"
              v-if="!scope.row.fieldParent"
            >
              添加到分组
            </el-button>
            <el-button 
              size="small" 
              type="info" 
              @click="handleSetIrrigationUnit(scope.row)"
              v-if="!scope.row.fieldParent"
            >
              设置灌溉单元
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleDeleteField(scope.row)"
              :disabled="!hasDeletePermission"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="currentPage"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
        />
      </div>
    </div>

    <!-- 表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="fieldForm"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="地块编号" prop="fieldId">
          <el-input v-model="fieldForm.fieldId" :disabled="isEdit && fieldForm.fieldParent" />
        </el-form-item>
        <el-form-item label="地块名称" prop="fieldName">
          <el-input v-model="fieldForm.fieldName" />
        </el-form-item>
        <el-form-item label="灌溉面积" prop="fieldSize">
          <el-input-number v-model="fieldForm.fieldSize" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="位置信息" prop="fieldRange">
          <el-input v-model="fieldForm.fieldRange" placeholder="经纬度坐标，如: (1,1,2,2,3,3)" />
        </el-form-item>
        <el-form-item v-if="isEdit && fieldForm.fieldParent" label="灌溉单元编号" prop="fieldUnitId">
          <el-input v-model="fieldForm.fieldUnitId" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="formLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 位置信息对话框 -->
    <el-dialog
      v-model="locationDialogVisible"
      title="位置信息详情"
      width="400px"
    >
      <div>
        <p>坐标: {{ currentLocation }}</p>
        <!-- 这里可以添加地图组件 -->
      </div>
    </el-dialog>
    
    <!-- 添加到分组对话框 -->
    <el-dialog
      v-model="groupDialogVisible"
      title="添加到分组"
      width="500px"
    >
      <el-form
        ref="groupFormRef"
        :model="groupForm"
        :rules="groupRules"
        label-width="120px"
      >
        <el-form-item label="地块名称">
          <el-input v-model="selectedFieldName" disabled />
        </el-form-item>
        <el-form-item label="选择分组" prop="groupId">
          <el-select v-model="groupForm.groupId" placeholder="请选择分组" style="width: 100%">
            <el-option
              v-for="item in groupOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="groupDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAddToGroup" :loading="groupSubmitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 设置基本灌溉单元对话框 -->
    <el-dialog
      v-model="irrigationUnitDialogVisible"
      title="设置基本灌溉单元"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="irrigationUnitFormRef"
        :model="irrigationUnitForm"
        :rules="irrigationUnitRules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="地块信息">
          <el-input :value="selectedFieldInfo" disabled />
        </el-form-item>
        <el-form-item label="灌溉单元编号" prop="fieldUnitId">
          <el-input v-model="irrigationUnitForm.fieldUnitId" placeholder="请输入灌溉单元编号" />
        </el-form-item>
        <el-form-item label="灌溉面积" prop="fieldSize">
          <el-input-number v-model="irrigationUnitForm.fieldSize" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="位置信息" prop="fieldRange">
          <el-input v-model="irrigationUnitForm.fieldRange" placeholder="经纬度坐标，如: (1,1,2,2,3,3)" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="irrigationUnitDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitIrrigationUnitForm" :loading="irrigationUnitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Search, Plus, Location } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const API_BASE_URL = '/api'

// 搜索关键字
const searchKeyword = ref('')

// 表格数据
const fieldList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 位置信息详情对话框
const locationDialogVisible = ref(false)
const currentLocation = ref('')

// 表单对话框
const dialogVisible = ref(false)
const dialogTitle = ref('添加地块')
const formLoading = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

// 添加到分组对话框
const groupDialogVisible = ref(false)
const groupForm = reactive({
  fieldId: '',
  groupId: ''
})
const groupFormRef = ref(null)
const groupSubmitLoading = ref(false)
const selectedFieldName = ref('')
const groupOptions = ref([])

// 设置基本灌溉单元对话框
const irrigationUnitDialogVisible = ref(false)
const irrigationUnitFormRef = ref(null)
const irrigationUnitLoading = ref(false)
const selectedFieldInfo = ref('')

// 灌溉单元表单
const irrigationUnitForm = reactive({
  fieldId: '',
  fieldName: '',
  fieldUnitId: '',
  fieldSize: 0,
  fieldRange: '',
  fieldParent: null
})

// 表单数据
const fieldForm = reactive({
  id: null,
  fieldId: '',
  fieldName: '',
  fieldSize: 0,
  fieldRange: '',
  fieldUnitId: '',
  fieldParent: null
})

// 表单验证规则
const rules = {
  fieldId: [
    { required: true, message: '请输入地块编号', trigger: 'blur' }
  ],
  fieldName: [
    { required: true, message: '请输入地块名称', trigger: 'blur' }
  ],
  fieldSize: [
    { required: true, message: '请输入灌溉面积', trigger: 'blur' }
  ]
}

// 灌溉单元表单验证规则
const irrigationUnitRules = {
  fieldUnitId: [
    { required: true, message: '请输入灌溉单元编号', trigger: 'blur' }
  ],
  fieldSize: [
    { required: true, message: '请输入灌溉面积', trigger: 'blur' }
  ],
  fieldRange: [
    { required: true, message: '请输入位置信息', trigger: 'blur' }
  ]
}

// 分组表单验证规则
const groupRules = {
  groupId: [
    { required: true, message: '请选择分组', trigger: 'change' }
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

// 获取地块列表
const getFieldList = async () => {
  loading.value = true
  
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      query: searchKeyword.value
    }
    
    const response = await axios.get(`${API_BASE_URL}/field/query/page`, { params })
    
    if (response.data.code === 200) {
      fieldList.value = response.data.value.records || []
      total.value = response.data.value.total || 0
    } else {
      ElMessage.error(response.data.msg || '获取地块列表失败')
    }
  } catch (error) {
    console.error('获取地块列表出错:', error)
    ElMessage.error('获取地块列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 处理分页大小变化
const handleSizeChange = (val) => {
  pageSize.value = val
  getFieldList()
}

// 处理当前页变化
const handleCurrentChange = (val) => {
  currentPage.value = val
  getFieldList()
}

// 显示位置信息
const showLocation = (location) => {
  currentLocation.value = location
  locationDialogVisible.value = true
}

// 添加地块
const handleAdd = () => {
  isEdit.value = false
  dialogTitle.value = '添加地块'
  
  // 重置表单
  fieldForm.id = null
  fieldForm.fieldId = ''
  fieldForm.fieldName = ''
  fieldForm.fieldSize = 0
  fieldForm.fieldRange = ''
  fieldForm.fieldUnitId = ''
  fieldForm.fieldParent = null
  
  dialogVisible.value = true
}

// 编辑地块
const handleEditField = (row) => {
  isEdit.value = true
  dialogTitle.value = row.fieldParent ? '编辑灌溉单元' : '编辑地块'
  
  // 填充表单数据
  fieldForm.id = row.id
  fieldForm.fieldId = row.fieldId
  fieldForm.fieldName = row.fieldName
  fieldForm.fieldSize = row.fieldSize
  fieldForm.fieldRange = row.fieldRange
  fieldForm.fieldUnitId = row.fieldUnitId
  fieldForm.fieldParent = row.fieldParent
  
  dialogVisible.value = true
}

// 删除地块
const handleDeleteField = (row) => {
  ElMessageBox.confirm(
    `确定要删除${row.fieldParent ? '灌溉单元' : '地块'} "${row.fieldName || row.fieldId}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/field/delete`, {
        params: { fieldId: row.id }
      })
      
      if (response.data.code === 200) {
        ElMessage.success('删除成功')
        getFieldList()
      } else {
        ElMessage.error(response.data.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除地块出错:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }).catch(() => {
    // 取消删除
  })
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      formLoading.value = true
      
      try {
        let response
        
        if (isEdit.value) {
          // 编辑地块
          response = await axios.put(`${API_BASE_URL}/field/update`, fieldForm)
        } else {
          // 添加地块
          response = await axios.post(`${API_BASE_URL}/field/add`, fieldForm)
        }
        
        if (response.data.code === 200) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          dialogVisible.value = false
          getFieldList()
        } else {
          ElMessage.error(response.data.msg || (isEdit.value ? '更新失败' : '添加失败'))
        }
      } catch (error) {
        console.error(isEdit.value ? '更新地块出错:' : '添加地块出错:', error)
        ElMessage.error(isEdit.value ? '更新失败，请稍后重试' : '添加失败，请稍后重试')
      } finally {
        formLoading.value = false
      }
    }
  })
}

// 加载分组选项
const loadGroupOptions = async () => {
  try {
    const response = await axios.get('/api/group/list')
    
    if (response.data.code === 200) {
      const groups = response.data.value || []
      groupOptions.value = groups.map(group => ({
        value: group.id,  // 使用id作为值
        label: group.groupName  // 使用groupName作为标签
      }))
    }
  } catch (error) {
    console.error('加载分组选项出错:', error)
    ElMessage.error('加载分组选项失败')
  }
}

// 处理添加到分组
const handleAddToGroup = (row) => {
  // 使用地块的id而不是地块编号
  groupForm.fieldId = row.id
  selectedFieldName.value = row.fieldName || row.fieldId
  groupForm.groupId = ''
  groupDialogVisible.value = true
  
  // 加载分组选项
  loadGroupOptions()
}

// 提交添加到分组
const submitAddToGroup = async () => {
  if (!groupFormRef.value) return
  
  await groupFormRef.value.validate(async (valid) => {
    if (valid) {
      groupSubmitLoading.value = true
      
      try {
        // 确保发送的数据符合后端API的要求
        const postData = {
          fieldId: groupForm.fieldId, // 这里使用的是地块的id
          groupId: groupForm.groupId
        }
        
        const response = await axios.post('/api/field/to/group', postData)
        
        if (response.data.code === 200) {
          ElMessage.success('添加到分组成功')
          groupDialogVisible.value = false
        } else {
          ElMessage.error(response.data.msg || '添加到分组失败')
        }
      } catch (error) {
        console.error('添加到分组出错:', error)
        ElMessage.error('添加到分组失败，请稍后重试')
      } finally {
        groupSubmitLoading.value = false
      }
    }
  })
}

// 处理设置基本灌溉单元
const handleSetIrrigationUnit = (row) => {
  // 设置表单初始值
  irrigationUnitForm.fieldId = row.fieldId
  irrigationUnitForm.fieldName = row.fieldName
  irrigationUnitForm.fieldUnitId = ''
  irrigationUnitForm.fieldSize = 0
  irrigationUnitForm.fieldRange = ''
  irrigationUnitForm.fieldParent = row.id // 使用当前地块的id作为父级id
  
  // 设置显示信息
  selectedFieldInfo.value = `${row.fieldName || ''} (${row.fieldId})`
  
  // 显示对话框
  irrigationUnitDialogVisible.value = true
}

// 提交灌溉单元表单
const submitIrrigationUnitForm = async () => {
  if (!irrigationUnitFormRef.value) return
  
  await irrigationUnitFormRef.value.validate(async (valid) => {
    if (valid) {
      irrigationUnitLoading.value = true
      
      try {
        // 发送请求添加灌溉单元
        const response = await axios.post(`${API_BASE_URL}/field/add`, irrigationUnitForm)
        
        if (response.data.code === 200) {
          ElMessage.success('设置灌溉单元成功')
          irrigationUnitDialogVisible.value = false
          getFieldList() // 刷新列表
        } else {
          ElMessage.error(response.data.msg || '设置灌溉单元失败')
        }
      } catch (error) {
        console.error('设置灌溉单元出错:', error)
        ElMessage.error('设置灌溉单元失败，请稍后重试')
      } finally {
        irrigationUnitLoading.value = false
      }
    }
  })
}

// 页面加载时获取地块列表
onMounted(() => {
  getFieldList();
});
</script>

<style scoped>
.field-management {
  width: 100%;
}

.content-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 20px;
}

.search-box {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.search-box .el-input {
  width: 300px;
  margin-right: 10px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 树形表格样式 */
:deep(.el-table__row--level-0) {
  font-weight: bold;
  background-color: #f5f7fa;
}

:deep(.el-table__row--level-1) {
  font-size: 0.95em;
  color: #606266;
}

:deep(.el-table__expand-icon) {
  margin-right: 5px;
}
</style>