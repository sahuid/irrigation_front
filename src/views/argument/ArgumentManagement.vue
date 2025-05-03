<template>
  <div class="argument-management">
    <div class="content-card">
      <div class="card-header">
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            placeholder="搜索参数信息"
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
          <el-button type="primary" @click="handleAddArgument">
            <el-icon><Plus /></el-icon>添加灌溉参数
          </el-button>
        </div>
      </div>

      <el-table
        :data="argumentList"
        border
        style="width: 100%"
        v-loading="loading"
        :empty-text="emptyText"
      >
        <el-table-column prop="id" label="ID" width="100" />
        <el-table-column prop="water_and_fertilizer" label="水肥比(a:1)" width="150">
          <template #default="scope">
            {{ scope.row.water_and_fertilizer }}:1
          </template>
        </el-table-column>
        <el-table-column prop="head_water_consumption" label="头纯水耗水量" width="150" />
        <el-table-column prop="current_speed" label="流速(L)" width="150" />
        <el-table-column prop="tail_water_consumption" label="尾纯水耗水量" width="150" />
        <el-table-column prop="fieldId" label="地块编号" width="150" />
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="scope">
            <el-button 
              size="small" 
              type="primary" 
              @click="handleEditArgument(scope.row)"
              :disabled="!hasEditPermission"
            >
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleDeleteArgument(scope.row)"
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

    <!-- 灌溉参数表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑灌溉参数' : '添加灌溉参数'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="argumentFormRef"
        :model="argumentForm"
        :rules="argumentRules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item v-if="isEdit" label="ID" prop="id">
          <el-input v-model="argumentForm.id" disabled />
        </el-form-item>
        <el-form-item label="水肥比" prop="water_and_fertilizer">
          <div class="input-with-text">
            <el-input-number 
              v-model="argumentForm.water_and_fertilizer" 
              :min="1" 
              :precision="0" 
              style="width: 100%"
            />
            <span class="input-text">:1</span>
          </div>
        </el-form-item>
        <el-form-item label="头纯水耗水量" prop="head_water_consumption">
          <div class="input-with-text">
            <el-input-number 
              v-model="argumentForm.head_water_consumption" 
              :min="0" 
              :precision="2" 
              style="width: 100%"
            />
            <span class="input-text">h/s</span>
          </div>
        </el-form-item>
        <el-form-item label="流速" prop="current_speed">
          <div class="input-with-text">
            <el-input-number 
              v-model="argumentForm.current_speed" 
              :min="0" 
              :precision="2" 
              style="width: 100%"
            />
            <span class="input-text">L</span>
          </div>
        </el-form-item>
        <el-form-item label="尾纯水耗水量" prop="tail_water_consumption">
          <div class="input-with-text">
            <el-input-number 
              v-model="argumentForm.tail_water_consumption" 
              :min="0" 
              :precision="2" 
              style="width: 100%"
            />
            <span class="input-text">h/s</span>
          </div>
        </el-form-item>
        <el-form-item label="地块编号" prop="fieldId">
          <el-select 
            v-model="argumentForm.fieldId" 
            placeholder="请选择地块"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="field in fieldOptions"
              :key="field.id"
              :label="field.fieldId"
              :value="field.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitArgumentForm" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// API基础URL
const API_BASE_URL = '/api'

// 参数列表数据
const argumentList = ref([])
const loading = ref(false)
const emptyText = ref('暂无数据')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')

// 地块选项
const fieldOptions = ref([])

// 对话框相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const argumentFormRef = ref(null)
const submitLoading = ref(false)

// 参数表单
const argumentForm = reactive({
  id: '',
  water_and_fertilizer: 1,
  head_water_consumption: 0,
  current_speed: 0,
  tail_water_consumption: 0,
  fieldId: null
})

// 表单验证规则
const argumentRules = {
  water_and_fertilizer: [
    { required: true, message: '请输入水肥比', trigger: 'blur' }
  ],
  head_water_consumption: [
    { required: true, message: '请输入头纯水耗水量', trigger: 'blur' }
  ],
  current_speed: [
    { required: true, message: '请输入流速', trigger: 'blur' }
  ],
  tail_water_consumption: [
    { required: true, message: '请输入尾纯水耗水量', trigger: 'blur' }
  ],
  fieldId: [
    { required: true, message: '请输入地块编号', trigger: 'blur' }
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

// 加载参数列表
const loadArgumentList = async () => {
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
    
    const response = await axios.get(`${API_BASE_URL}/argument/query/page`, { params })
    
    if (response.data.code === 200) {
      argumentList.value = response.data.value.records || []
      total.value = response.data.value.total || 0
      
      // 如果没有数据
      if (argumentList.value.length === 0) {
        emptyText.value = searchQuery.value ? '没有找到匹配的参数' : '暂无参数数据'
      }
    } else {
      ElMessage.error(response.data.msg || '获取参数列表失败')
      argumentList.value = []
      total.value = 0
      emptyText.value = '获取数据失败'
    }
  } catch (error) {
    console.error('获取参数列表出错:', error)
    ElMessage.error('获取参数列表失败，请稍后重试')
    argumentList.value = []
    total.value = 0
    emptyText.value = '获取数据失败'
  } finally {
    loading.value = false
  }
}

// 获取地块列表
const loadFieldOptions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/field/list/field`)
    if (response.data.code === 200) {
      fieldOptions.value = response.data.value || []
    } else {
      ElMessage.error(response.data.msg || '获取地块列表失败')
    }
  } catch (error) {
    console.error('获取地块列表出错:', error)
    ElMessage.error('获取地块列表失败，请稍后重试')
  }
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
  loadArgumentList()
}

// 处理分页大小变化
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1 // 重置到第一页
  loadArgumentList()
}

// 处理当前页变化
const handleCurrentChange = (val) => {
  currentPage.value = val
  loadArgumentList()
}

// 处理添加参数
const handleAddArgument = () => {
  isEdit.value = false
  argumentForm.id = ''
  argumentForm.water_and_fertilizer = 1
  argumentForm.head_water_consumption = 0
  argumentForm.current_speed = 0
  argumentForm.tail_water_consumption = 0
  argumentForm.fieldId = null
  // 确保打开对话框时已经加载了地块选项
  loadFieldOptions()
  dialogVisible.value = true
}

// 处理编辑参数
const handleEditArgument = (row) => {
  isEdit.value = true
  argumentForm.id = row.id
  argumentForm.water_and_fertilizer = row.water_and_fertilizer
  argumentForm.head_water_consumption = row.head_water_consumption
  argumentForm.current_speed = row.current_speed
  argumentForm.tail_water_consumption = row.tail_water_consumption
  argumentForm.fieldId = row.fieldId
  // 确保打开对话框时已经加载了地块选项
  loadFieldOptions()
  dialogVisible.value = true
}

// 处理删除参数
const handleDeleteArgument = (row) => {
  ElMessageBox.confirm(
    `确定要删除该灌溉参数吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/argument/delete`, null, {
        params: { id: row.id }
      })
      
      if (response.data.code === 200) {
        ElMessage.success('删除成功')
        loadArgumentList()
      } else {
        ElMessage.error(response.data.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除参数出错:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }).catch(() => {
    // 取消删除
  })
}

// 提交参数表单
const submitArgumentForm = async () => {
  if (!argumentFormRef.value) return
  
  await argumentFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      
      try {
        let response
        
        if (isEdit.value) {
          // 编辑参数 - 修改为POST请求，与后端接口匹配
          response = await axios.post(`${API_BASE_URL}/argument/update`, argumentForm)
        } else {
          // 添加参数
          response = await axios.post(`${API_BASE_URL}/argument/add`, argumentForm)
        }
        
        if (response.data.code === 200) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          dialogVisible.value = false
          loadArgumentList()
        } else {
          ElMessage.error(response.data.msg || (isEdit.value ? '更新失败' : '添加失败'))
        }
      } catch (error) {
        console.error(isEdit.value ? '更新参数出错:' : '添加参数出错:', error)
        ElMessage.error(isEdit.value ? '更新失败，请稍后重试' : '添加失败，请稍后重试')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 页面加载时获取参数列表和地块列表
onMounted(() => {
  loadArgumentList()
  loadFieldOptions()
})
</script>

<style scoped>
.argument-management {
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

.input-with-text {
  display: flex;
  align-items: center;
}

.input-text {
  margin-left: 10px;
  color: #606266;
}
</style> 