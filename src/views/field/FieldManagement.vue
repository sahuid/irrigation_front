<template>
  <div class="field-management">
    <div class="content-card">
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索地块编号或名称"
          clearable
          @clear="getFieldList"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
        <div class="action-box">
          <el-upload
            class="excel-upload"
            action="/api/field/import"
            :on-success="handleImportSuccess"
            :on-error="handleImportError"
            :before-upload="beforeUploadFile"
            :show-file-list="false"
            :headers="uploadHeaders"
            name="file"
            accept=".xlsx,.xls"
          >
            <el-button type="success">
              <el-icon><Upload /></el-icon>导入 Excel
            </el-button>
          </el-upload>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>添加地块
          </el-button>
          <el-button @click="downloadTemplate">
            <el-icon><Download /></el-icon>下载模板
          </el-button>
        </div>
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
            <span v-if="scope.row.fieldParent">
              {{ scope.row.fieldSize || '-' }}
            </span>
            <span v-else>
              {{ calculateTotalArea(scope.row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="fieldRange" label="位置信息" width="300">
          <template #default="scope">
            <span v-if="scope.row.fieldRange && 
                       (!Array.isArray(scope.row.fieldRange) || scope.row.fieldRange.length > 0) && 
                       !(typeof scope.row.fieldRange === 'string' && (scope.row.fieldRange === '[]' || scope.row.fieldRange.trim() === ''))">
              {{ typeof scope.row.fieldRange === 'string' ? scope.row.fieldRange : JSON.stringify(scope.row.fieldRange) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="250">
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

    <!-- 表单对话框 - 父级地块 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      destroy-on-close
      v-if="!isEditingIrrigationUnit"
    >
      <el-form
        ref="formRef"
        :model="fieldForm"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="地块编号" prop="fieldId">
          <el-input v-model="fieldForm.fieldId" />
        </el-form-item>
        <el-form-item label="地块名称" prop="fieldName">
          <el-input v-model="fieldForm.fieldName" />
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
    
    <!-- 表单对话框 - 灌溉单元 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      destroy-on-close
      v-if="isEditingIrrigationUnit"
    >
      <el-form
        ref="formRef"
        :model="fieldForm"
        :rules="irrigationUnitEditRules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="灌溉单元编号" prop="fieldUnitId">
          <el-input v-model="fieldForm.fieldUnitId" />
        </el-form-item>
        <el-form-item label="灌溉面积" prop="fieldSize">
          <el-input-number v-model="fieldForm.fieldSize" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="位置信息" prop="fieldRange">
          <div class="location-table">
            <div class="location-table-header">
              <div>
                <el-button type="primary" size="small" @click="addLocationPoint">
                  <el-icon><Plus /></el-icon>添加位置点
                </el-button>
                <el-button type="warning" size="small" @click="resetLocationInfo">
                  重置位置
                </el-button>
              </div>
              <span class="location-hint">至少需要3个点才能形成有效的灌溉单元范围</span>
            </div>
            <div class="batch-input-container">
              <el-input
                v-model="batchCoordinates"
                type="textarea"
                :rows="3"
                placeholder="请输入批量坐标格式如：{87.29547234,44.21764995},{87.29537416,44.21707246}，第一个是经度，第二个是纬度"
              />
              <el-button 
                type="primary" 
                @click="parseBatchCoordinates" 
                style="margin-top: 8px;"
              >
                解析坐标
              </el-button>
            </div>
            <el-table :data="fieldForm.fieldRange" border style="width: 100%">
              <el-table-column label="序号" type="index" width="60" />
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
              <el-table-column label="操作" width="80">
                <template #default="scope">
                  <el-button 
                    type="danger" 
                    size="small" 
                    @click="removeLocationPoint(scope.$index)"
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
          <el-button type="primary" @click="submitForm" :loading="formLoading">
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
          <div class="location-table">
            <div class="location-table-header">
              <div>
                <el-button type="primary" size="small" @click="addIrrigationUnitPoint">
                  <el-icon><Plus /></el-icon>添加位置点
                </el-button>
                <el-button type="warning" size="small" @click="resetIrrigationUnitLocationInfo">
                  重置位置
                </el-button>
              </div>
              <span class="location-hint">至少需要3个点才能形成有效的灌溉单元范围</span>
            </div>
            <div class="batch-input-container">
              <el-input
                v-model="batchIrrigationUnitCoordinates"
                type="textarea"
                :rows="3"
                placeholder="请输入批量坐标格式如：{87.29547234,44.21764995},{87.29537416,44.21707246}，第一个是经度，第二个是纬度"
              />
              <el-button 
                type="primary" 
                @click="parseIrrigationUnitBatchCoordinates" 
                style="margin-top: 8px;"
              >
                解析坐标
              </el-button>
            </div>
            <el-table :data="irrigationUnitForm.fieldRange" border style="width: 100%">
              <el-table-column label="序号" type="index" width="60" />
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
              <el-table-column label="操作" width="80">
                <template #default="scope">
                  <el-button 
                    type="danger" 
                    size="small" 
                    @click="removeIrrigationUnitPoint(scope.$index)"
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
import { Search, Plus, Upload, Download } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { parseCoordinateString } from '@/utils/coordinateParser'

// API基础URL
const API_BASE_URL = '/api'

// 表格数据
const fieldList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchKeyword = ref('')

// 对话框控制
const dialogVisible = ref(false)
const dialogTitle = ref('添加地块')
const formLoading = ref(false)
const isEdit = ref(false)
const isEditingIrrigationUnit = ref(false)
const formRef = ref(null)

// 灌溉单元表单
const irrigationUnitForm = reactive({
  fieldId: '',
  fieldName: '',
  fieldUnitId: '',
  fieldSize: 0,
  fieldRange: [],
  fieldParent: null
})

// 表单数据
const fieldForm = reactive({
  id: '',
  fieldId: '',
  fieldName: '',
  fieldSize: 0,
  fieldRange: [],
  irrigationUnit: []
})

// 表单验证规则
const rules = {
  fieldId: [
    { required: true, message: '请输入地块编号', trigger: 'blur' }
  ],
  fieldName: [
    { required: true, message: '请输入地块名称', trigger: 'blur' }
  ]
}

// 灌溉单元编辑表单验证规则
const irrigationUnitEditRules = {
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

// 设置基本灌溉单元对话框
const irrigationUnitDialogVisible = ref(false)
const irrigationUnitFormRef = ref(null)
const irrigationUnitLoading = ref(false)
const selectedFieldInfo = ref('')

// 上传相关
const uploadHeaders = computed(() => {
  return {
    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
  }
})

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
      const records = response.data.value.records || []
      
      // 检查第一条记录的 fieldRange 格式
      if (records.length > 0) {
        console.log('获取到的第一条记录的位置信息:', records[0].fieldRange, typeof records[0].fieldRange)
      }
      
      fieldList.value = records
      total.value = response.data.value.total || 0
    } else {
      ElMessage.error(response.data.msg || '获取地块列表失败')
      fieldList.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取地块列表出错:', error)
    ElMessage.error('获取地块列表失败，请稍后重试')
    fieldList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
  getFieldList()
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

// 处理添加地块
const handleAdd = () => {
  isEdit.value = false
  isEditingIrrigationUnit.value = false
  dialogTitle.value = '添加地块'
  
  // 重置表单
  fieldForm.id = ''
  fieldForm.fieldId = ''
  fieldForm.fieldName = ''
  fieldForm.fieldSize = 0
  fieldForm.fieldRange = []
  fieldForm.irrigationUnit = []
  
  dialogVisible.value = true
}

// 处理编辑地块
const handleEditField = (row) => {
  isEdit.value = true
  isEditingIrrigationUnit.value = !!row.fieldParent
  dialogTitle.value = row.fieldParent ? '编辑灌溉单元' : '编辑地块'
  
  // 填充表单数据
  fieldForm.id = row.id
  fieldForm.fieldId = row.fieldId
  fieldForm.fieldName = row.fieldName
  
  // 只有灌溉单元需要设置面积，地块的面积由子灌溉单元决定
  if (isEditingIrrigationUnit.value) {
    fieldForm.fieldSize = row.fieldSize || 0
  } else {
    fieldForm.fieldSize = 0 // 地块面积由子灌溉单元决定，此处设为0
  }
  
  // 处理位置信息
  console.log('编辑地块时的原始位置信息:', row.fieldRange, typeof row.fieldRange)
  try {
    if (typeof row.fieldRange === 'string') {
      fieldForm.fieldRange = JSON.parse(row.fieldRange)
      console.log('解析后的位置信息:', fieldForm.fieldRange)
    } else if (Array.isArray(row.fieldRange)) {
      fieldForm.fieldRange = row.fieldRange
    } else {
      fieldForm.fieldRange = []
    }
  } catch (e) {
    console.error('解析位置信息出错:', e, '原始数据:', row.fieldRange)
    fieldForm.fieldRange = []
  }
  
  fieldForm.irrigationUnit = row.irrigationUnit || []
  
  dialogVisible.value = true
}

// 处理删除地块
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

// 计算地块的总面积（所有子灌溉单元面积的总和）
const calculateTotalArea = (field) => {
  if (!field.subField || field.subField.length === 0) {
    return '0' // 如果没有子灌溉单元，返回0
  }
  
  // 计算所有子灌溉单元面积的总和
  const totalArea = field.subField.reduce((sum, unit) => {
    const unitArea = parseFloat(unit.fieldSize) || 0
    return sum + unitArea
  }, 0)
  
  return totalArea.toFixed(2) // 保留两位小数
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      formLoading.value = true
      
      try {
        // 构造提交的数据
        const submitData = {
          ...fieldForm
        }
        
        // 如果是添加或编辑地块（非灌溉单元），则不需要位置信息和面积
        if (!isEditingIrrigationUnit.value) {
          submitData.fieldRange = [] // 地块不需要位置信息
          submitData.fieldSize = 0   // 地块的面积由子灌溉单元决定
        } else {
          // 检查灌溉单元至少有3个位置点
          if (fieldForm.fieldRange.length < 3) {
            ElMessage.warning('请至少输入3个位置点以形成灌溉单元范围')
            formLoading.value = false
            return
          }
        }
        
        let response
        if (isEdit.value) {
          // 编辑地块
          response = await axios.put('/api/field/update', submitData)
        } else {
          // 添加地块
          response = await axios.post('/api/field/add', submitData)
        }
        
        if (response.data.code === 200) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          dialogVisible.value = false
          getFieldList()
        } else {
          ElMessage.error(response.data.msg || (isEdit.value ? '更新失败' : '添加失败'))
        }
      } catch (error) {
        console.error('提交表单出错:', error)
        ElMessage.error(isEdit.value ? '更新失败，请稍后重试' : '添加失败，请稍后重试')
      } finally {
        formLoading.value = false
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
  irrigationUnitForm.fieldRange = []
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
        // 确保至少有3个点
        if (irrigationUnitForm.fieldRange.length < 3) {
          ElMessage.warning('请至少添加3个位置点以形成灌溉单元范围')
          irrigationUnitLoading.value = false
          return
        }
        
        // 构造提交数据
        const submitData = {
          ...irrigationUnitForm,
          fieldRange: irrigationUnitForm.fieldRange // 直接使用位置点数组
        }
        
        // 发送请求添加灌溉单元
        const response = await axios.post(`${API_BASE_URL}/field/add`, submitData)
        
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

// 处理导入成功
const handleImportSuccess = (response) => {
  if (response.code === 200) {
    ElMessage.success('导入成功')
    getFieldList()
  } else {
    ElMessage.error(`导入失败: ${response.msg || '未知错误'}`)
  }
}

// 处理导入错误
const handleImportError = (error) => {
  console.error('Excel导入错误:', error)
  ElMessage.error('导入失败，请检查文件格式或网络连接')
}

// 处理下载模板
const downloadTemplate = () => {
  try {
    // 下载地块和灌溉单元导入模板
    const downloadUrl = `${API_BASE_URL}/field/template/download`
    
    // 使用 axios 的 get 方法下载文件
    axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'blob'
    }).then(response => {
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', '地块导入模板.xlsx')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      ElMessage.success('模板下载成功')
    }).catch(error => {
      console.error('下载模板出错:', error)
      ElMessage.error('下载模板失败，请稍后重试')
    })
  } catch (error) {
    console.error('下载模板出错:', error)
    ElMessage.error('下载模板失败，请稍后重试')
  }
}

// 上传前验证文件
const beforeUploadFile = (file) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                  file.type === 'application/vnd.ms-excel'
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isExcel) {
    ElMessage.error('只能上传Excel文件!')
    return false
  }
  
  if (!isLt5M) {
    ElMessage.error('文件大小不能超过5MB!')
    return false
  }
  
  ElMessage.info('文件上传中，请稍候...')
  return true
}

// 添加位置点
const addLocationPoint = () => {
  // 添加一个新的位置点
  fieldForm.fieldRange.push({
    longitude: 116.4074,
    latitude: 39.9042
  })
}

// 删除指定索引的位置点
const removeLocationPoint = (index) => {
  // 从数组中删除指定索引的位置点
  fieldForm.fieldRange.splice(index, 1)
}

// 添加灌溉单元位置点
const addIrrigationUnitPoint = () => {
  // 添加一个新的位置点到灌溉单元表单
  irrigationUnitForm.fieldRange.push({
    longitude: 116.4074,
    latitude: 39.9042
  })
}

// 删除指定索引的灌溉单元位置点
const removeIrrigationUnitPoint = (index) => {
  // 从灌溉单元数组中删除指定索引的位置点
  irrigationUnitForm.fieldRange.splice(index, 1)
}

// 重置表单中的位置信息
const resetLocationInfo = () => {
  fieldForm.fieldRange = []
}

// 重置灌溉单元表单中的位置信息
const resetIrrigationUnitLocationInfo = () => {
  irrigationUnitForm.fieldRange = []
}

// 批量坐标输入
const batchCoordinates = ref('')
const batchIrrigationUnitCoordinates = ref('')

// 解析批量输入的坐标点并添加到灌溉单元
const parseBatchCoordinates = () => {
  if (!batchCoordinates.value) {
    ElMessage.warning('请先输入坐标数据')
    return
  }
  
  const coordinates = parseCoordinateString(batchCoordinates.value)
  
  if (coordinates.length === 0) {
    ElMessage.error('未能解析到有效的坐标点，请检查输入格式')
    return
  }
  
  // 清空现有坐标点
  fieldForm.fieldRange = []
  
  // 添加解析出的坐标点
  fieldForm.fieldRange = coordinates
  
  ElMessage.success(`成功解析并添加了 ${coordinates.length} 个坐标点`)
  
  // 清空输入框
  batchCoordinates.value = ''
  
  // 清除表单验证错误
  if (formRef.value) {
    formRef.value.clearValidate('fieldRange')
  }
}

// 解析批量输入的坐标点并添加到灌溉单元表单
const parseIrrigationUnitBatchCoordinates = () => {
  if (!batchIrrigationUnitCoordinates.value) {
    ElMessage.warning('请先输入坐标数据')
    return
  }
  
  const coordinates = parseCoordinateString(batchIrrigationUnitCoordinates.value)
  
  if (coordinates.length === 0) {
    ElMessage.error('未能解析到有效的坐标点，请检查输入格式')
    return
  }
  
  // 清空现有坐标点
  irrigationUnitForm.fieldRange = []
  
  // 添加解析出的坐标点
  irrigationUnitForm.fieldRange = coordinates
  
  ElMessage.success(`成功解析并添加了 ${coordinates.length} 个坐标点`)
  
  // 清空输入框
  batchIrrigationUnitCoordinates.value = ''
  
  // 清除表单验证错误
  if (irrigationUnitFormRef.value) {
    irrigationUnitFormRef.value.clearValidate('fieldRange')
  }
}

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

/* 位置信息相关样式 */
.field-range-tips {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.field-range-tips p {
  margin: 5px 0;
  color: #606266;
  font-size: 14px;
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

/* 位置信息表格样式 */
.location-table {
  margin-bottom: 10px;
}

.location-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.batch-input-container {
  margin-bottom: 15px;
}

.location-hint {
  color: #909399;
  font-size: 14px;
}

.action-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.excel-upload {
  margin-right: 10px;
}
</style>