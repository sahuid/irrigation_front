<template>
  <div class="field-management">
    <div class="content-card">
      <div class="filter-section">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索地块编号或灌溉单元编号"
          prefix-icon="Search"
          clearable
          @clear="getFieldList"
          @input="handleSearch"
          style="width: 300px;"
        />
        <el-button type="primary" @click="handleAddField" icon="Plus">新增地块</el-button>
      </div>
      
      <el-table 
        :data="fieldList" 
        border 
        style="width: 100%" 
        v-loading="loading"
        :header-cell-style="{background:'#f5f7fa', color:'#606266'}"
        row-key="id"
        stripe
        :empty-text="emptyText"
      >
        <el-table-column prop="fieldId" label="地块编号" width="120" />
        <el-table-column prop="fieldUnitId" label="灌溉单元编号" width="150" />
        <el-table-column label="地块位置" min-width="300">
          <template #default="scope">
            <div v-if="scope.row.fieldRange" class="location-text-display">
              <el-tooltip :content="scope.row.fieldRange" placement="top" :show-after="200">
                <div class="location-text">
                  {{ truncateText(scope.row.fieldRange, 100) }}
                </div>
              </el-tooltip>
              <el-button 
                type="primary" 
                link
                size="small"
                @click="showLocationDetails(scope.row.fieldRange)"
              >
                查看详情
              </el-button>
            </div>
            <span v-else class="no-location">
              <el-icon><WarningFilled /></el-icon> 无位置信息
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="280">
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
            >
              添加到分组
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
      
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="currentPage"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        class="pagination"
        background
      />
    </div>
    
    <!-- 地块表单对话框 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="600px" destroy-on-close>
      <el-form :model="fieldForm" :rules="rules" ref="fieldFormRef" label-width="120px" status-icon>
        <el-form-item label="地块编号" prop="fieldId">
          <el-input v-model="fieldForm.fieldId" placeholder="请输入地块编号"></el-input>
        </el-form-item>
        <el-form-item label="灌溉单元编号" prop="fieldUnitId">
          <el-input v-model="fieldForm.fieldUnitId" placeholder="请输入灌溉单元编号"></el-input>
        </el-form-item>
        
        <el-divider>地块位置信息</el-divider>
        
        <el-form-item label="位置信息" prop="fieldRange">
          <el-input
            v-model="fieldForm.fieldRange"
            type="textarea"
            :rows="5"
            placeholder="请输入地块位置信息"
          ></el-input>
          <div class="form-help-text">
            请输入地块位置信息，可以是任意格式的文本
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 位置信息详情对话框 -->
    <el-dialog 
      title="地块位置详情" 
      v-model="locationDialogVisible" 
      width="700px"
      destroy-on-close
    >
      <div class="location-detail-text">{{ currentLocationText }}</div>
    </el-dialog>

    <!-- 添加到分组对话框 -->
    <el-dialog
      v-model="groupDialogVisible"
      title="添加到分组"
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
        <el-form-item label="地块" prop="fieldId">
          <el-input v-model="selectedFieldName" disabled />
        </el-form-item>
        <el-form-item label="选择分组" prop="groupId">
          <el-select v-model="groupForm.groupId" placeholder="请选择分组" style="width: 100%">
            <el-option 
              v-for="group in groupOptions" 
              :key="group.value" 
              :label="group.label" 
              :value="group.value" 
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { WarningFilled } from '@element-plus/icons-vue'

// 定义API基础URL - 使用相对路径，依赖代理配置
const API_BASE_URL = '/api'

// 数据列表
const fieldList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const emptyText = ref('暂无数据')

// 位置信息详情对话框
const locationDialogVisible = ref(false)
const currentLocationText = ref('')

// 搜索和筛选
const searchKeyword = ref('')

// 表单相关
const fieldFormRef = ref(null)
const dialogVisible = ref(false)
const dialogTitle = ref('新增地块')
const fieldForm = reactive({
  id: '',
  fieldId: '',
  fieldUnitId: '',
  fieldRange: ''
})

// 表单验证规则
const rules = {
  fieldId: [{ required: true, message: '请输入地块编号', trigger: 'blur' }],
  fieldUnitId: [{ required: true, message: '请输入灌溉单元编号', trigger: 'blur' }]
}

// 添加到分组相关
const groupDialogVisible = ref(false)
const groupFormRef = ref(null)
const groupSubmitLoading = ref(false)
const selectedFieldName = ref('')
const groupOptions = ref([])

const groupForm = reactive({
  fieldId: '',
  groupId: ''
})

const groupRules = {
  groupId: [
    { required: true, message: '请选择分组', trigger: 'change' }
  ]
}

// 权限控制
const hasEditPermission = ref(true) // 可以根据用户角色动态设置
const hasDeletePermission = ref(true) // 可以根据用户角色动态设置

// 初始化数据
onMounted(() => {
  getFieldList()
})

// 获取地块列表
const getFieldList = async () => {
  loading.value = true;
  emptyText.value = '加载中...'
  try {
    const response = await axios.get(`${API_BASE_URL}/field/query/page`, {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value || undefined
      }
    });
    if (response.data && response.data.code === 200) {
      fieldList.value = response.data.value.records || [];
      total.value = response.data.value.total || 0;
      
      // 如果没有数据
      if (fieldList.value.length === 0) {
        emptyText.value = searchKeyword.value ? '没有找到匹配的地块' : '暂无地块数据'
      }
    } else {
      ElMessage.error(response.data?.msg || '获取地块列表失败');
      emptyText.value = '加载失败'
    }
  } catch (error) {
    console.error('获取地块列表出错:', error);
    ElMessage.error('网络错误，请稍后重试');
    // 使用模拟数据
    useMockData();
  } finally {
    loading.value = false;
  }
};

// 使用模拟数据（当API请求失败时）
const useMockData = () => {
  const mockData = [
    { 
      id: 1, 
      fieldId: "F001", 
      fieldUnitId: "U001",
      fieldRange: '{"point1":{"lat":30.123,"lng":120.456},"point2":{"lat":30.234,"lng":120.567},"point3":{"lat":30.345,"lng":120.678},"point4":{"lat":30.456,"lng":120.789}}'
    },
    { 
      id: 2, 
      fieldId: "F002", 
      fieldUnitId: "U002",
      fieldRange: '{"point1":{"lat":31.123,"lng":121.456},"point2":{"lat":31.234,"lng":121.567},"point3":{"lat":31.345,"lng":121.678},"point4":{"lat":31.456,"lng":121.789}}'
    }
  ];
  
  fieldList.value = mockData;
  total.value = mockData.length;
};

// 搜索处理
const handleSearch = () => {
  getFieldList()
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  getFieldList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  getFieldList()
}

// 新增地块
const handleAddField = () => {
  dialogTitle.value = '新增地块'
  fieldForm.id = ''
  fieldForm.fieldId = ''
  fieldForm.fieldUnitId = ''
  fieldForm.fieldRange = ''
  dialogVisible.value = true
}

// 编辑地块
const handleEditField = (row) => {
  dialogTitle.value = '编辑地块'
  fieldForm.id = row.id
  fieldForm.fieldId = row.fieldId
  fieldForm.fieldUnitId = row.fieldUnitId
  fieldForm.fieldRange = row.fieldRange
  dialogVisible.value = true
}

// 删除地块
const handleDeleteField = (row) => {
  ElMessageBox.confirm(`确定要删除地块"${row.fieldId}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      // 使用 /field/delete 接口，传递 fieldId 参数
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
      ElMessage.error('网络错误，请稍后重试')
    }
  }).catch(() => {})
}

// 提交表单
const submitForm = async () => {
  fieldFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let response
        const submitData = {
          id: fieldForm.id,
          fieldId: fieldForm.fieldId,
          fieldUnitId: fieldForm.fieldUnitId,
          fieldRange: fieldForm.fieldRange
        }
        
        if (fieldForm.id) {
          // 编辑 - 使用 /field/update 接口
          response = await axios.put(`${API_BASE_URL}/field/update`, submitData)
        } else {
          // 新增
          response = await axios.post(`${API_BASE_URL}/field/add`, submitData)
        }
        
        if (response.data.code === 200) {
          ElMessage.success(fieldForm.id ? '编辑成功' : '添加成功')
          dialogVisible.value = false
          getFieldList()
        } else {
          ElMessage.error(response.data.msg || '操作失败')
        }
      } catch (error) {
        console.error('提交表单出错:', error)
        ElMessage.error('网络错误，请稍后重试')
      }
    }
  })
}

// 截断文本
const truncateText = (text, maxLength) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// 显示位置详情 - 简化为直接显示文本
const showLocationDetails = (locationText) => {
  currentLocationText.value = locationText || '无位置信息';
  locationDialogVisible.value = true;
}

// 加载分组选项
const loadGroupOptions = async () => {
  try {
    const response = await axios.get('/api/group/list')
    
    if (response.data.code === 200) {
      // 根据实际返回的数据结构调整
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
</script>

<style scoped>
.field-management {
  padding: 20px;
}

.content-card {
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.location-text-display {
  display: flex;
  align-items: center;
  gap: 10px;
}

.location-text {
  font-family: monospace;
  background-color: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.location-detail-text {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
}

.form-help-text {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

/* 表格行悬停效果 */
:deep(.el-table__row:hover) {
  background-color: #f0f9eb !important;
}

/* 对话框样式 */
:deep(.el-dialog__header) {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 15px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid #ebeef5;
  padding-top: 15px;
}

:deep(.el-input-number) {
  width: 100%;
}

.no-location {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #909399;
  font-size: 13px;
}
</style>