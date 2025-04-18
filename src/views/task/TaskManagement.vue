<template>
  <div class="task-management">
    <div class="content-card">
      <div class="filter-section">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索地块编号或任务编号"
          prefix-icon="Search"
          clearable
          @clear="getTaskList"
          @input="handleSearch"
          style="width: 300px;"
        />
        <el-button type="primary" @click="handleAddTask" icon="Plus">新增任务</el-button>
      </div>
      
      <el-table 
        :data="taskList" 
        border 
        style="width: 100%" 
        v-loading="loading"
        :header-cell-style="{background:'#f5f7fa', color:'#606266'}"
        row-key="id"
        stripe
      >
        <el-table-column prop="taskId" label="任务编号" width="120" />
        <el-table-column prop="fieldId" label="地块编号" width="120" />
        <el-table-column prop="fieldUnitId" label="灌溉单元编号" width="150" />
        <el-table-column prop="startTime" label="开始时间" width="180">
          <template #default="scope">
            {{ formatStartTimeForDisplay(scope.row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="water" label="水量(m³)" width="100">
          <template #default="scope">
            {{ scope.row.water }}
          </template>
        </el-table-column>
        <el-table-column prop="fertilizerN" label="氮肥(kg)" width="100">
          <template #default="scope">
            {{ scope.row.fertilizerN }}
          </template>
        </el-table-column>
        <el-table-column prop="fertilizerP" label="磷肥(kg)" width="100">
          <template #default="scope">
            {{ scope.row.fertilizerP }}
          </template>
        </el-table-column>
        <el-table-column prop="fertilizerK" label="钾肥(kg)" width="100">
          <template #default="scope">
            {{ scope.row.fertilizerK }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleEdit(scope.row)" icon="Edit">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row)" icon="Delete">删除</el-button>
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
    
    <!-- 任务表单对话框 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="500px" destroy-on-close>
      <el-form :model="taskForm" :rules="rules" ref="taskFormRef" label-width="120px" status-icon>
        <el-form-item label="任务编号" prop="taskId">
          <el-input v-model="taskForm.taskId" placeholder="请输入任务编号"></el-input>
        </el-form-item>
        <el-form-item label="地块编号" prop="fieldId">
          <el-select 
            v-model="taskForm.fieldId" 
            placeholder="请选择地块"
            style="width: 100%"
            filterable
            @change="handleFieldChange"
          >
            <el-option
              v-for="field in fieldOptions"
              :key="field.id"
              :label="field.fieldId"
              :value="field.fieldId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="灌溉单元编号" prop="fieldUnitId">
          <el-select 
            v-model="taskForm.fieldUnitId" 
            placeholder="请选择灌溉单元"
            style="width: 100%"
            filterable
            :disabled="!taskForm.fieldId"
          >
            <el-option
              v-for="unit in fieldUnitOptions"
              :key="unit.id"
              :label="unit.fieldUnitId"
              :value="unit.fieldUnitId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间" prop="startTimeDate">
          <el-config-provider :locale="locale">
            <el-date-picker
              v-model="taskForm.startTimeDate"
              type="datetime"
              placeholder="选择开始时间"
              style="width: 100%"
              format="YYYY年MM月DD日 HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              :clearable="false"
              :shortcuts="dateShortcuts"
            />
          </el-config-provider>
        </el-form-item>
        <el-form-item label="水量(m³)" prop="water">
          <el-input-number v-model="taskForm.water" :min="0" :precision="2" style="width: 100%"></el-input-number>
        </el-form-item>
        <el-form-item label="氮肥(kg)" prop="fertilizerN">
          <el-input-number v-model="taskForm.fertilizerN" :min="0" :precision="2" style="width: 100%"></el-input-number>
        </el-form-item>
        <el-form-item label="磷肥(kg)" prop="fertilizerP">
          <el-input-number v-model="taskForm.fertilizerP" :min="0" :precision="2" style="width: 100%"></el-input-number>
        </el-form-item>
        <el-form-item label="钾肥(kg)" prop="fertilizerK">
          <el-input-number v-model="taskForm.fertilizerK" :min="0" :precision="2" style="width: 100%"></el-input-number>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

// 定义API基础URL - 使用相对路径，依赖代理配置
const API_BASE_URL = '/api'

// Element Plus 本地化配置
const locale = zhCn

// 数据列表
const taskList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 搜索和筛选
const searchKeyword = ref('')

// 地块选项
const fieldOptions = ref([])
// 灌溉单元选项
const fieldUnitOptions = ref([])

// 表单相关
const taskFormRef = ref(null)
const dialogVisible = ref(false)
const dialogTitle = ref('新增任务')
const taskForm = reactive({
  id: '',
  taskId: '',
  fieldId: '',
  fieldUnitId: '',
  startTimeDate: '', // 用于日期选择器
  startTime: '',
  water: 0,
  fertilizerN: 0,
  fertilizerP: 0,
  fertilizerK: 0
})

// 表单验证规则
const rules = {
  taskId: [{ required: true, message: '请输入任务编号', trigger: 'blur' }],
  fieldId: [{ required: true, message: '请选择地块编号', trigger: 'change' }],
  fieldUnitId: [{ required: true, message: '请输入灌溉单元编号', trigger: 'blur' }],
  startTimeDate: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  water: [{ required: true, message: '请输入水量', trigger: 'blur' }],
  fertilizerN: [{ required: true, message: '请输入氮肥量', trigger: 'blur' }],
  fertilizerP: [{ required: true, message: '请输入磷肥量', trigger: 'blur' }],
  fertilizerK: [{ required: true, message: '请输入钾肥量', trigger: 'blur' }]
}

// 日期选择器快捷选项
const dateShortcuts = [
  {
    text: '此刻',
    value: () => {
      return new Date()
    }
  },
  {
    text: '明天此刻',
    value: () => {
      const date = new Date()
      date.setTime(date.getTime() + 3600 * 1000 * 24)
      return date
    }
  },
  {
    text: '一周后',
    value: () => {
      const date = new Date()
      date.setTime(date.getTime() + 3600 * 1000 * 24 * 7)
      return date
    }
  }
]

// 对话框状态监控
const dialogVisibleChanged = (newVal) => {
  if (newVal && !isEdit.value) {
    // 当对话框打开且是新增模式时，设置当前时间
    const now = new Date()
    taskForm.startTimeDate = now.toISOString().slice(0, 19).replace('T', ' ')
    console.log('对话框打开，已设置当前时间:', taskForm.startTimeDate)
  }
}

// 监控对话框状态
const isEdit = ref(false)

// 监听对话框显示状态
watch(dialogVisible, dialogVisibleChanged)

// 初始化数据
onMounted(() => {
  getTaskList()
  loadFieldOptions()
})

// 格式化开始时间 (原始格式转换为显示格式)
const formatStartTimeForDisplay = (timeStr) => {
  if (!timeStr) return '';
  
  try {
    // 尝试检测日期格式
    if (timeStr.includes('T') && timeStr.includes('+')) {
      // ISO格式: 2025-03-10T00:00:00.000+00:00
      const date = new Date(timeStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-');
    } else if (timeStr.includes('/')) {
      // 原始格式: 2025/03/10/08/00
      const parts = timeStr.split('/');
      if (parts.length === 5) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')} ${parts[3].padStart(2, '0')}:${parts[4].padStart(2, '0')}:00`;
      }
    }
    
    // 如果无法识别格式，直接返回原始字符串
    return timeStr;
  } catch (e) {
    console.error('日期格式化错误:', e);
    return timeStr;
  }
};

// 获取任务列表
const getTaskList = async () => {
  loading.value = true;
  try {
    const response = await axios.get(`${API_BASE_URL}/task/query/page`, {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value || undefined
      }
    });
    if (response.data && response.data.code === 200) {
      console.log('API原始数据:', response.data);
      // 打印第一条记录的开始时间，以便检查格式
      if (response.data.value.records && response.data.value.records.length > 0) {
        console.log('第一条记录的开始时间:', response.data.value.records[0].startTime);
      }
      taskList.value = response.data.value.records || [];
      total.value = response.data.value.total || 0;
    } else {
      ElMessage.error(response.data?.msg || '获取任务列表失败');
    }
  } catch (error) {
    console.error('获取任务列表出错:', error);
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
    { id: 1, fieldId: "test", fieldUnitId: "test", taskId: "test", water: 1, fertilizerN: 1, fertilizerP: 1, fertilizerK: 1, startTime: "2025/03/10/08/00" },
    { id: 2, fieldId: "test2", fieldUnitId: "test2", taskId: "test2", water: 2, fertilizerN: 2, fertilizerP: 2, fertilizerK: 2, startTime: "2025/03/23/03/35" }
  ];
  
  taskList.value = mockData;
  total.value = mockData.length;
};

// 搜索处理
const handleSearch = () => {
  getTaskList()
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  getTaskList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  getTaskList()
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
    return Promise.resolve()
  } catch (error) {
    console.error('获取地块列表出错:', error)
    ElMessage.error('获取地块列表失败，请稍后重试')
    return Promise.reject(error)
  }
}

// 根据地块ID获取灌溉单元列表
const loadFieldUnitOptions = async (fieldId) => {
  if (!fieldId) {
    fieldUnitOptions.value = []
    return
  }
  
  try {
    // 查询该地块下的灌溉单元
    const response = await axios.get(`${API_BASE_URL}/field/getUnitByField`, {
      params: { id: fieldId }
    })
    
    if (response.data.code === 200) {
      fieldUnitOptions.value = response.data.value || []
    } else {
      ElMessage.error(response.data.msg || '获取灌溉单元列表失败')
    }
  } catch (error) {
    console.error('获取灌溉单元列表出错:', error)
    ElMessage.error('获取灌溉单元列表失败，请稍后重试')
  }
}

// 处理地块选择变化
const handleFieldChange = (fieldId) => {
  // 清空已选择的灌溉单元
  taskForm.fieldUnitId = ''
  
  // 查找地块对象以获取数据库ID(用于加载灌溉单元)
  const selectedField = fieldOptions.value.find(field => field.fieldId === fieldId);
  
  if (selectedField) {
    // 使用地块数据库ID查询灌溉单元
    loadFieldUnitOptions(selectedField.id);
  } else {
    fieldUnitOptions.value = [];
  }
}

// 新增任务
const handleAddTask = () => {
  dialogTitle.value = '新增任务'
  isEdit.value = false
  taskForm.id = ''
  taskForm.taskId = ''
  taskForm.fieldId = ''
  taskForm.fieldUnitId = ''
  
  // 设置当前时间作为默认开始时间
  const now = new Date()
  const timeStr = now.toISOString().slice(0, 19).replace('T', ' ')
  taskForm.startTimeDate = timeStr
  taskForm.startTime = timeStr
  
  taskForm.water = 0
  taskForm.fertilizerN = 0
  taskForm.fertilizerP = 0
  taskForm.fertilizerK = 0
  
  // 确保已加载地块列表
  if (fieldOptions.value.length === 0) {
    loadFieldOptions()
  }
  
  // 清空灌溉单元列表
  fieldUnitOptions.value = []
  
  dialogVisible.value = true
}

// 编辑任务
const handleEdit = (row) => {
  dialogTitle.value = '编辑任务'
  isEdit.value = true
  taskForm.id = row.id
  taskForm.taskId = row.taskId
  
  // 确保已加载地块列表
  if (fieldOptions.value.length === 0) {
    loadFieldOptions().then(() => {
      // 根据fieldId查找对应的地块ID
      setFieldIdByFieldCode(row.fieldId);
    });
  } else {
    // 立即设置地块ID
    setFieldIdByFieldCode(row.fieldId);
  }
  
  taskForm.fieldUnitId = row.fieldUnitId
  
  // 处理日期格式
  if (row.startTime) {
    try {
      if (row.startTime.includes('/')) {
        // 如果是 "2025/03/12/20/00" 格式，转换为 "2025-03-12 20:00:00" 格式
        const parts = row.startTime.split('/');
        if (parts.length === 5) {
          taskForm.startTimeDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')} ${parts[3].padStart(2, '0')}:${parts[4].padStart(2, '0')}:00`;
          console.log('已处理旧格式的日期:', taskForm.startTimeDate);
        } else {
          taskForm.startTimeDate = row.startTime;
        }
      } else {
        // 其他格式直接使用
        taskForm.startTimeDate = row.startTime;
      }
      
      // 验证日期是否有效
      const dateObj = new Date(taskForm.startTimeDate);
      if (isNaN(dateObj.getTime()) || dateObj.getFullYear() > 2100) {
        // 无效日期，使用当前时间
        const now = new Date();
        taskForm.startTimeDate = now.toISOString().slice(0, 19).replace('T', ' ');
        console.log('检测到无效日期，已重置为当前时间:', taskForm.startTimeDate);
      }
    } catch (e) {
      console.error('处理日期时出错:', e);
      // 出错时使用当前时间
      const now = new Date();
      taskForm.startTimeDate = now.toISOString().slice(0, 19).replace('T', ' ');
    }
  } else {
    taskForm.startTimeDate = '';
  }
  
  taskForm.startTime = taskForm.startTimeDate
  taskForm.water = row.water
  taskForm.fertilizerN = row.fertilizerN
  taskForm.fertilizerP = row.fertilizerP
  taskForm.fertilizerK = row.fertilizerK
  dialogVisible.value = true
}

// 根据地块的fieldId找到对应的id
const setFieldIdByFieldCode = (fieldCode) => {
  const field = fieldOptions.value.find(f => f.fieldId === fieldCode);
  if (field) {
    taskForm.fieldId = field.fieldId;
    // 加载该地块下的灌溉单元
    loadFieldUnitOptions(field.id);
  } else {
    taskForm.fieldId = '';
    fieldUnitOptions.value = [];
  }
}

// 删除任务
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除任务"${row.taskId}"吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      // 使用 /task/delete 接口，传递 taskId 参数，使用数据库ID
      const response = await axios.delete(`${API_BASE_URL}/task/delete`, {
        params: { taskId: row.id }
      })
      
      if (response.data.code === 200) {
        ElMessage.success('删除成功')
        getTaskList()
      } else {
        ElMessage.error(response.data.msg || '删除失败')
      }
    } catch (error) {
      console.error('删除任务出错:', error)
      ElMessage.error('网络错误，请稍后重试')
    }
  }).catch(() => {})
}

// 提交表单
const submitForm = async () => {
  taskFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 强制使用当前时间，使用24小时制格式
        const now = new Date();
        
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        // 使用24小时制 (HH) 而不是12小时制 (hh)
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        // 使用24小时制的格式: yyyy-MM-dd HH:mm:ss
        const backendFormat = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        console.log('使用24小时制的日期格式:', backendFormat);
        
        // 更新表单时间
        taskForm.startTimeDate = backendFormat;
        
        let response
        const submitData = {
          id: taskForm.id,
          taskId: taskForm.taskId,
          fieldId: taskForm.fieldId, // 直接使用地块编号字符串
          fieldUnitId: taskForm.fieldUnitId,
          startTime: backendFormat,
          water: taskForm.water,
          fertilizerN: taskForm.fertilizerN,
          fertilizerP: taskForm.fertilizerP,
          fertilizerK: taskForm.fertilizerK
        }
        
        console.log('最终提交的日期时间:', submitData.startTime);
        
        if (taskForm.id) {
          // 编辑 - 使用 /task/update 接口
          response = await axios.put(`${API_BASE_URL}/task/update`, submitData)
        } else {
          // 新增 - 使用新的接口路径
          response = await axios.post(`${API_BASE_URL}/task/add`, submitData)
        }
        
        if (response.data.code === 200) {
          ElMessage.success(taskForm.id ? '编辑成功' : '添加成功')
          dialogVisible.value = false
          getTaskList()
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
</script>

<style scoped>
.task-management {
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
</style> 