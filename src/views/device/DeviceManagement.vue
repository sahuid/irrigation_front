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
        <el-table-column prop="deviceId" label="设备编号" width="120" />
        <el-table-column prop="deviceType" label="设备类型" width="120">
          <template #default="scope">
            <el-tag :type="getDeviceTypeTag(scope.row.deviceType)">
              {{ getDeviceTypeName(scope.row.deviceType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deviceManagerNumber" label="分组/灌溉单元编号" width="180" />
        <el-table-column prop="deviceStatus" label="设备状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.deviceStatus === 1 ? 'success' : 'danger'">
              {{ scope.row.deviceStatus === 1 ? '开' : '关' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
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
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="deviceFormRef"
        :model="deviceForm"
        :rules="deviceRules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="设备编号" prop="deviceId">
          <el-input v-model="deviceForm.deviceId" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="设备类型" prop="deviceType">
          <el-select v-model="deviceForm.deviceType" placeholder="请选择设备类型" style="width: 100%">
            <el-option label="水泵" :value="1" />
            <el-option label="阀门" :value="2" />
            <el-option label="传感器" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联类型" prop="managerType">
          <el-radio-group v-model="deviceForm.managerType">
            <el-radio :label="1">分组</el-radio>
            <el-radio :label="2">灌溉单元</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="关联编号" prop="deviceManagerNumber">
          <el-select 
            v-if="deviceForm.managerType === 1"
            v-model="deviceForm.deviceManagerNumber" 
            placeholder="请选择分组" 
            style="width: 100%"
            filterable
            clearable
          >
            <el-option 
              v-for="group in groupOptions" 
              :key="group.id" 
              :label="group.groupName" 
              :value="group.groupName" 
            />
          </el-select>
          <el-select 
            v-else
            v-model="deviceForm.deviceManagerNumber" 
            placeholder="请选择灌溉单元" 
            style="width: 100%"
            filterable
            clearable
          >
            <el-option 
              v-for="field in fieldOptions" 
              :key="field.id" 
              :label="field.fieldUnitId" 
              :value="field.fieldUnitId" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="设备状态" prop="deviceStatus">
          <el-radio-group v-model="deviceForm.deviceStatus">
            <el-radio :label="1">开</el-radio>
            <el-radio :label="0">关</el-radio>
          </el-radio-group>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue'
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

// 设备表单
const deviceForm = reactive({
  id: null,
  deviceId: '',
  deviceType: 1,
  managerType: 1, // 1: 分组, 2: 灌溉单元
  deviceManagerNumber: '',
  deviceStatus: 1
})

// 表单验证规则
const deviceRules = {
  deviceId: [
    { required: true, message: '请输入设备编号', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  deviceType: [
    { required: true, message: '请选择设备类型', trigger: 'change' }
  ],
  managerType: [
    { required: true, message: '请选择关联类型', trigger: 'change' }
  ],
  deviceManagerNumber: [
    { required: true, message: '请选择或输入关联编号', trigger: 'blur' }
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
  const typeMap = {
    1: '水泵',
    2: '阀门',
    3: '传感器'
  }
  return typeMap[type] || '未知'
}

// 获取设备类型标签样式
const getDeviceTypeTag = (type) => {
  const typeTagMap = {
    1: 'primary',
    2: 'success',
    3: 'warning'
  }
  return typeTagMap[type] || 'info'
}

// 分组选项和灌溉单元选项
const groupOptions = ref([])
const fieldOptions = ref([])

// 加载分组选项
const loadGroupOptions = async () => {
  try {
    const response = await axios.get('/api/group/list')
    
    if (response.data.code === 200) {
      groupOptions.value = response.data.value || []
    } else {
      ElMessage.error(response.data.msg || '获取分组列表失败')
    }
  } catch (error) {
    console.error('加载分组选项出错:', error)
    ElMessage.error('加载分组选项失败，请稍后重试')
  }
}

// 加载灌溉单元选项
const loadFieldOptions = async () => {
  try {
    const response = await axios.get('/api/field/list')
    
    if (response.data.code === 200) {
      fieldOptions.value = response.data.value || []
    } else {
      ElMessage.error(response.data.msg || '获取灌溉单元列表失败')
    }
  } catch (error) {
    console.error('加载灌溉单元选项出错:', error)
    ElMessage.error('加载灌溉单元选项失败，请稍后重试')
  }
}

// 监听关联类型变化，加载相应的选项
watch(() => deviceForm.managerType, (newValue) => {
  if (newValue === 1) {
    // 如果选择分组，加载分组选项
    if (groupOptions.value.length === 0) {
      loadGroupOptions()
    }
  } else {
    // 如果选择灌溉单元，加载灌溉单元选项
    if (fieldOptions.value.length === 0) {
      loadFieldOptions()
    }
  }
})

// 加载设备列表
const loadDeviceList = async () => {
  loading.value = true
  emptyText.value = '加载中...'
  
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      query: searchQuery.value
    }
    
    const response = await axios.get('/api/device/query/page', { params })
    
    if (response.data.code === 200) {
      const data = response.data.value || {}  // 使用value而不是data
      deviceList.value = data.records || []
      total.value = data.total || 0
      
      // 如果没有数据
      if (deviceList.value.length === 0) {
        emptyText.value = searchQuery.value ? '没有找到匹配的设备' : '暂无设备数据'
      }
    } else {
      ElMessage.error(response.data.msg || '获取设备列表失败')  // 使用msg而不是message
      emptyText.value = '加载失败'
    }
  } catch (error) {
    console.error('加载设备列表出错:', error)
    ElMessage.error('加载设备列表失败，请稍后重试')
    emptyText.value = '加载失败'
  } finally {
    loading.value = false
  }
}

// 处理页码变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  loadDeviceList()
}

// 处理每页条数变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadDeviceList()
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
  loadDeviceList()
}

// 处理添加设备
const handleAddDevice = () => {
  isEdit.value = false
  Object.keys(deviceForm).forEach(key => {
    if (key === 'deviceType' || key === 'deviceStatus') {
      deviceForm[key] = 1
    } else if (key === 'managerType') {
      deviceForm[key] = 1 // 默认选择分组
    } else if (key === 'id') {
      deviceForm[key] = null // 确保添加时id为null
    } else {
      deviceForm[key] = ''
    }
  })
  dialogVisible.value = true
  
  // 加载分组选项
  loadGroupOptions()
}

// 处理编辑设备
const handleEditDevice = (row) => {
  isEdit.value = true
  
  // 复制行数据到表单
  Object.keys(deviceForm).forEach(key => {
    if (key in row) {
      deviceForm[key] = row[key]
    }
  })
  
  // 确保id字段被正确设置
  deviceForm.id = row.id
  
  // 加载分组和灌溉单元选项
  loadGroupOptions()
  loadFieldOptions()
  
  // 根据设备的deviceManagerNumber判断关联类型
  nextTick(async () => {
    // 等待选项加载完成后再判断
    await Promise.all([
      new Promise(resolve => {
        if (groupOptions.value.length > 0) resolve()
        else setTimeout(resolve, 500) // 如果选项还没加载，等待一段时间
      }),
      new Promise(resolve => {
        if (fieldOptions.value.length > 0) resolve()
        else setTimeout(resolve, 500)
      })
    ])
    
    if (row.deviceManagerNumber) {
      // 检查是否匹配任何分组名称
      if (groupOptions.value.some(g => g.groupName === row.deviceManagerNumber)) {
        deviceForm.managerType = 1 // 分组
      } 
      // 检查是否匹配任何灌溉单元编号
      else if (fieldOptions.value.some(f => f.fieldUnitId === row.deviceManagerNumber)) {
        deviceForm.managerType = 2 // 灌溉单元
      }
      // 如果都不匹配，默认为灌溉单元
      else {
        deviceForm.managerType = 2
      }
    }
  })
  
  dialogVisible.value = true
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
      const response = await axios.delete(`/api/device/${row.deviceId}`)
      
      if (response.data.code === 200) {
        ElMessage.success('删除成功')
        loadDeviceList()
      } else {
        ElMessage.error(response.data.msg || '删除失败')  // 使用msg而不是message
      }
    } catch (error) {
      console.error('删除设备出错:', error)
      ElMessage.error('删除失败，请稍后重试')
    }
  }).catch(() => {
    // 取消删除
  })
}

// 提交设备表单
const submitDeviceForm = async () => {
  if (!deviceFormRef.value) return
  
  await deviceFormRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      
      try {
        let response
        
        if (isEdit.value) {
          // 编辑设备 - 确保包含id字段
          const updateData = {
            id: deviceForm.id,
            deviceId: deviceForm.deviceId,
            deviceType: deviceForm.deviceType,
            deviceManagerNumber: deviceForm.deviceManagerNumber,
            deviceStatus: deviceForm.deviceStatus
          }
          response = await axios.put('/api/device/update', updateData)
        } else {
          // 添加设备 - 不需要id字段
          const addData = {
            deviceId: deviceForm.deviceId,
            deviceType: deviceForm.deviceType,
            deviceManagerNumber: deviceForm.deviceManagerNumber,
            deviceStatus: deviceForm.deviceStatus
          }
          response = await axios.post('/api/device/add', addData)
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

// 页面加载时获取设备列表
onMounted(() => {
  loadDeviceList()
})
</script>

<style scoped>
.device-management {
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