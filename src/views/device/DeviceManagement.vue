<template>
  <div class="device-management">
    <div class="content-card">
      <div class="card-header">
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            placeholder="搜索设备编号"
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
          <el-button type="primary" @click="handleAddDevice">
            <el-icon><Plus /></el-icon>添加设备
          </el-button>
        </div>
      </div>

      <el-table
        :data="deviceList"
        border
        style="width: 100%"
        v-loading="loading"
        :empty-text="emptyText"
      >
        <el-table-column prop="deviceId" label="设备编号" width="150" />
        <el-table-column prop="deviceType" label="设备类型" width="150">
          <template #default="scope">
            {{ getDeviceTypeName(scope.row.deviceType) }}
          </template>
        </el-table-column>
        <el-table-column prop="deviceManagerNumber" label="地块/基本灌溉单元编号" width="200" />
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="scope">
            <el-button 
              size="small" 
              type="primary" 
              @click="handleEditDevice(scope.row)"
              :disabled="!hasEditPermission"
            >
              编辑
            </el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="handleViewData(scope.row)"
            >
              查看数据
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleDeleteDevice(scope.row)"
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

    <!-- 设备表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑设备' : '添加设备'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="deviceFormRef"
        :model="deviceForm"
        :rules="deviceRules"
        label-width="140px"
        label-position="right"
      >
        <el-form-item label="设备类型" prop="deviceType">
          <el-select v-model="deviceForm.deviceType" placeholder="请选择设备类型" style="width: 100%">
            <el-option
              v-for="item in deviceTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="设备编号" prop="deviceId">
          <el-input v-model="deviceForm.deviceId" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="选择类型" prop="locationType">
          <el-radio-group v-model="deviceForm.locationType" @change="handleLocationTypeChange">
            <el-radio :label="1">地块</el-radio>
            <el-radio :label="2">基本灌溉单元</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="deviceForm.locationType === 1 ? '地块' : '基本灌溉单元'" prop="deviceManagerNumber">
          <el-select 
            v-model="deviceForm.deviceManagerNumber" 
            :placeholder="deviceForm.locationType === 1 ? '请选择地块' : '请选择基本灌溉单元'" 
            filterable
            style="width: 100%"
            :loading="locationOptionsLoading"
          >
            <el-option
              v-for="item in locationOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitDeviceForm" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 设备数据对话框 -->
    <el-dialog
      v-model="dataDialogVisible"
      title="设备数据"
      width="800px"
      destroy-on-close
    >
      <div v-loading="dataLoading">
        <div v-if="deviceData.length > 0">
          <el-table
            :data="deviceData"
            border
            style="width: 100%"
            height="400px"
          >
            <el-table-column prop="timestamp" label="时间" width="180" />
            <el-table-column prop="value" label="数值" width="120" />
            <el-table-column prop="unit" label="单位" width="100" />
            <el-table-column prop="type" label="数据类型" />
          </el-table>
        </div>
        <div v-else class="empty-data">
          暂无设备数据
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { Search, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

// 设备列表数据
const deviceList = ref([])
const loading = ref(false)
const emptyText = ref('暂无数据')
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')

// 对话框相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const deviceFormRef = ref(null)
const submitLoading = ref(false)

// 设备数据对话框相关
const dataDialogVisible = ref(false)
const dataLoading = ref(false)
const deviceData = ref([])
const currentDevice = ref(null)

// 设备表单
const deviceForm = reactive({
  id: '',
  deviceId: '',
  deviceType: '',
  deviceManagerNumber: '',
  locationType: 1 // 默认选择地块
})

// 设备类型选项
const deviceTypeOptions = [
  { value: 0, label: '阀门' },
  { value: 1, label: '水闸' },
  { value: 2, label: '施肥机' }
]

// 地块/基本灌溉单元选项
const locationOptions = ref([])
const locationOptionsLoading = ref(false)

// 处理位置类型变化
const handleLocationTypeChange = () => {
  deviceForm.deviceManagerNumber = '' // 清空已选择的值
  getLocationOptions() // 重新获取选项
}

// 获取地块/基本灌溉单元选项
const getLocationOptions = async () => {
  locationOptionsLoading.value = true
  locationOptions.value = []
  
  try {
    let url = deviceForm.locationType === 1 
      ? '/api/field/list/field'  // 获取地块列表
      : '/api/field/list/unit'        // 获取灌溉单元列表
    
    const response = await axios.get(url)
    
    if (response.data.code === 200) {
      if (deviceForm.locationType === 1) {
        // 地块选项
        locationOptions.value = (response.data.value || [])
          .map(item => ({
            value: item.fieldId,
            label: `${item.fieldId}`
          }))
      } else {
        // 基本灌溉单元选项
        locationOptions.value = (response.data.value || [])
          .filter(item => item.fieldUnitId) // 只保留有灌溉单元编号的记录
          .map(item => ({
            value: item.fieldUnitId,
            label: `${item.fieldUnitId}`
          }))
      }
    } else {
      ElMessage.error(response.data.msg || '获取选项列表失败')
    }
  } catch (error) {
    console.error('获取选项列表出错:', error)
    ElMessage.error('获取选项列表失败，请稍后重试')
  } finally {
    locationOptionsLoading.value = false
  }
}

// 表单验证规则
const deviceRules = {
  deviceId: [
    { required: true, message: '请输入设备编号', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  deviceType: [
    { required: true, message: '请选择设备类型', trigger: 'change' }
  ],
  locationType: [
    { required: true, message: '请选择类型', trigger: 'change' }
  ],
  deviceManagerNumber: [
    { required: true, message: '请选择地块/基本灌溉单元', trigger: 'change' }
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

// 获取设备类型名称
const getDeviceTypeName = (type) => {
  const option = deviceTypeOptions.find(item => item.value === type)
  return option ? option.label : '未知类型'
}

// 加载设备列表
const loadDeviceList = async () => {
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
    
    const response = await axios.get('/api/device/query/page', { params })
    
    if (response.data.code === 200) {
      deviceList.value = response.data.value.records || []
      total.value = response.data.value.total || 0
      
      // 如果没有数据
      if (deviceList.value.length === 0) {
        emptyText.value = searchQuery.value ? '没有找到匹配的设备' : '暂无设备数据'
      }
    } else {
      ElMessage.error(response.data.msg || '获取设备列表失败')
      deviceList.value = []
      total.value = 0
      emptyText.value = '获取数据失败'
    }
  } catch (error) {
    console.error('获取设备列表出错:', error)
    ElMessage.error('获取设备列表失败，请稍后重试')
    deviceList.value = []
    total.value = 0
    emptyText.value = '获取数据失败'
  } finally {
    loading.value = false
  }
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
  loadDeviceList()
}

// 处理分页大小变化
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1 // 重置到第一页
  loadDeviceList()
}

// 处理当前页变化
const handleCurrentChange = (val) => {
  currentPage.value = val
  loadDeviceList()
}

// 处理添加设备
const handleAddDevice = () => {
  isEdit.value = false
  deviceForm.id = ''
  deviceForm.deviceId = ''
  deviceForm.deviceType = ''
  deviceForm.deviceManagerNumber = ''
  deviceForm.locationType = 1 // 默认选择地块
  dialogVisible.value = true
  
  // 获取地块选项
  getLocationOptions()
}

// 处理编辑设备
const handleEditDevice = (row) => {
  isEdit.value = true
  deviceForm.id = row.id
  deviceForm.deviceId = row.deviceId
  deviceForm.deviceType = row.deviceType
  deviceForm.deviceManagerNumber = row.deviceManagerNumber
  
  // 根据deviceManagerNumber判断是地块还是基本灌溉单元
  // 这里需要根据实际情况调整判断逻辑
  deviceForm.locationType = row.isField ? 1 : 2
  
  dialogVisible.value = true
  
  // 获取选项
  getLocationOptions()
}

// 处理删除设备
const handleDeleteDevice = (row) => {
  ElMessageBox.confirm(
    `确定要删除设备 "${row.deviceId}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      const response = await axios.delete('/api/device/delete', {
        params: { deviceId: row.id }
      })
      
      if (response.data.code === 200) {
        ElMessage.success('删除成功')
        loadDeviceList()
      } else {
        ElMessage.error(response.data.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除设备出错:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }).catch(() => {
    // 取消删除
  })
}

// 查看设备数据
const handleViewData = async (row) => {
  currentDevice.value = row
  dataDialogVisible.value = true
  dataLoading.value = true
  deviceData.value = []
  
  try {
    const response = await axios.get(`/api/device/data/${row.id}`)
    
    if (response.data.code === 200) {
      deviceData.value = response.data.value || []
    } else {
      ElMessage.error(response.data.msg || '获取设备数据失败')
    }
  } catch (error) {
    console.error('获取设备数据出错:', error)
    ElMessage.error('获取设备数据失败，请稍后重试')
  } finally {
    dataLoading.value = false
  }
}

// 提交设备表单
const submitDeviceForm = async () => {
  if (!deviceFormRef.value) return
  
  await deviceFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      
      try {
        // 构建提交的数据
        const submitData = {
          id: deviceForm.id,
          deviceId: deviceForm.deviceId,
          deviceType: deviceForm.deviceType,
          deviceManagerNumber: deviceForm.deviceManagerNumber,
          isField: deviceForm.locationType === 1 // 添加标识是地块还是基本灌溉单元
        }
        
        let response
        
        if (isEdit.value) {
          // 编辑设备
          response = await axios.put('/api/device/update', submitData)
        } else {
          // 添加设备
          response = await axios.post('/api/device/add', submitData)
        }
        
        if (response.data.code === 200) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          dialogVisible.value = false
          loadDeviceList()
        } else {
          ElMessage.error(response.data.msg || (isEdit.value ? '更新失败' : '添加失败'))
        }
      } catch (error) {
        console.error(isEdit.value ? '更新设备出错:' : '添加设备出错:', error)
        ElMessage.error(isEdit.value ? '更新失败，请稍后重试' : '添加失败，请稍后重试')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

// 监听位置类型变化
watch(() => deviceForm.locationType, () => {
  if (dialogVisible.value) {
    getLocationOptions()
  }
})

// 页面加载时获取设备列表
onMounted(() => {
  loadDeviceList()
})
</script>

<style scoped>
.device-management {
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

.empty-data {
  padding: 30px 0;
  text-align: center;
  color: #909399;
  font-size: 14px;
}
</style> 