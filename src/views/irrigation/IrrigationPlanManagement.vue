<template>
  <div class="irrigation-plan">
    <div class="page-header">
      <h2>灌溉计划管理</h2>
      <el-button type="primary" @click="handleAddPlan">新增计划</el-button>
    </div>
    
    <el-table :data="planList" border style="width: 100%" v-loading="loading">
      <el-table-column prop="planId" label="计划编号" width="120" />
      <el-table-column prop="planName" label="计划名称" width="180" />
      <el-table-column prop="fieldName" label="农田名称" width="180" />
      <el-table-column prop="startTime" label="开始时间" width="180" />
      <el-table-column prop="endTime" label="结束时间" width="180" />
      <el-table-column prop="waterAmount" label="灌溉水量(m³)" width="120" />
      <el-table-column prop="status" label="状态">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)">
            {{ scope.row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250">
        <template #default="scope">
          <el-button type="primary" size="small" @click="handleEdit(scope.row)" :disabled="scope.row.status === '已完成' || scope.row.status === '进行中'">编辑</el-button>
          <el-button type="success" size="small" @click="handleStart(scope.row)" :disabled="scope.row.status !== '待执行'">开始</el-button>
          <el-button type="warning" size="small" @click="handleStop(scope.row)" :disabled="scope.row.status !== '进行中'">停止</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope.row)" :disabled="scope.row.status === '进行中'">删除</el-button>
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
    />
    
    <!-- 灌溉计划表单对话框 -->
    <el-dialog :title="dialogTitle" v-model="dialogVisible" width="600px">
      <el-form :model="planForm" :rules="rules" ref="planFormRef" label-width="100px">
        <el-form-item label="计划名称" prop="planName">
          <el-input v-model="planForm.planName" placeholder="请输入计划名称"></el-input>
        </el-form-item>
        <el-form-item label="农田" prop="fieldId">
          <el-select v-model="planForm.fieldId" placeholder="请选择农田" style="width: 100%">
            <el-option 
              v-for="field in fieldOptions" 
              :key="field.fieldId" 
              :label="field.fieldName" 
              :value="field.fieldId">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="灌溉时间" prop="irrigationTime">
          <el-date-picker
            v-model="planForm.irrigationTime"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="灌溉水量" prop="waterAmount">
          <el-input-number v-model="planForm.waterAmount" :min="0" :precision="2" :step="1" style="width: 100%">
            <template #suffix>m³</template>
          </el-input-number>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input type="textarea" v-model="planForm.remark" placeholder="请输入备注信息" :rows="3"></el-input>
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 数据列表
const planList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 农田选项
const fieldOptions = ref([])

// 表单相关
const planFormRef = ref(null)
const dialogVisible = ref(false)
const dialogTitle = ref('新增灌溉计划')
const planForm = reactive({
  planId: '',
  planName: '',
  fieldId: '',
  irrigationTime: [],
  waterAmount: 0,
  remark: '',
  status: '待执行'
})

// 表单验证规则
const rules = {
  planName: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  fieldId: [{ required: true, message: '请选择农田', trigger: 'change' }],
  irrigationTime: [{ required: true, message: '请选择灌溉时间', trigger: 'change' }],
  waterAmount: [{ required: true, message: '请输入灌溉水量', trigger: 'blur' }]
}

// 获取状态对应的类型
const getStatusType = (status) => {
  switch (status) {
    case '待执行': return 'info'
    case '进行中': return 'success'
    case '已完成': return ''
    case '已取消': return 'danger'
    default: return 'info'
  }
}

// 初始化数据
onMounted(() => {
  getFieldOptions()
  getPlanList()
})

// 获取农田选项
const getFieldOptions = () => {
  // 这里将来会替换为实际的API调用
  fieldOptions.value = [
    { fieldId: 'F001', fieldName: '东区水稻田' },
    { fieldId: 'F002', fieldName: '西区麦田' },
    { fieldId: 'F003', fieldName: '南区玉米地' }
  ]
}

// 获取灌溉计划列表
const getPlanList = () => {
  loading.value = true
  // 这里将来会替换为实际的API调用
  setTimeout(() => {
    planList.value = [
      { 
        planId: 'P001', 
        planName: '水稻田春季灌溉', 
        fieldId: 'F001',
        fieldName: '东区水稻田', 
        startTime: '2023-04-10 08:00:00', 
        endTime: '2023-04-10 16:00:00', 
        waterAmount: 120, 
        status: '已完成',
        remark: '春季第一次灌溉'
      },
      { 
        planId: 'P002', 
        planName: '麦田定期灌溉', 
        fieldId: 'F002',
        fieldName: '西区麦田', 
        startTime: '2023-04-15 09:00:00', 
        endTime: '2023-04-15 14:00:00', 
        waterAmount: 85, 
        status: '待执行',
        remark: '定期灌溉计划'
      },
      { 
        planId: 'P003', 
        planName: '玉米地应急灌溉', 
        fieldId: 'F003',
        fieldName: '南区玉米地', 
        startTime: '2023-04-12 10:00:00', 
        endTime: '2023-04-12 15:00:00', 
        waterAmount: 95, 
        status: '进行中',
        remark: '应对干旱天气'
      }
    ]
    total.value = 3
    loading.value = false
  }, 500)
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  getPlanList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  getPlanList()
}

// 新增计划
const handleAddPlan = () => {
  dialogTitle.value = '新增灌溉计划'
  planForm.planId = ''
  planForm.planName = ''
  planForm.fieldId = ''
  planForm.irrigationTime = []
  planForm.waterAmount = 0
  planForm.remark = ''
  planForm.status = '待执行'
  dialogVisible.value = true
}

// 编辑计划
const handleEdit = (row) => {
  dialogTitle.value = '编辑灌溉计划'
  planForm.planId = row.planId
  planForm.planName = row.planName
  planForm.fieldId = row.fieldId
  planForm.irrigationTime = [new Date(row.startTime), new Date(row.endTime)]
  planForm.waterAmount = row.waterAmount
  planForm.remark = row.remark || ''
  planForm.status = row.status
  dialogVisible.value = true
}

// 开始灌溉
const handleStart = (row) => {
  ElMessageBox.confirm(`确定要开始执行"${row.planName}"灌溉计划吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info'
  }).then(() => {
    // 这里将来会替换为实际的API调用
    ElMessage.success('灌溉计划已开始执行')
    row.status = '进行中'
  }).catch(() => {})
}

// 停止灌溉
const handleStop = (row) => {
  ElMessageBox.confirm(`确定要停止"${row.planName}"灌溉计划吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 这里将来会替换为实际的API调用
    ElMessage.success('灌溉计划已停止')
    row.status = '已完成'
  }).catch(() => {})
}

// 删除计划
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除"${row.planName}"灌溉计划吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 这里将来会替换为实际的API调用
    ElMessage.success('删除成功')
    getPlanList()
  }).catch(() => {})
}

// 提交表单
const submitForm = () => {
  planFormRef.value.validate((valid) => {
    if (valid) {
      // 这里将来会替换为实际的API调用
      if (planForm.planId) {
        // 编辑
        ElMessage.success('编辑成功')
      } else {
        // 新增
        ElMessage.success('添加成功')
      }
      dialogVisible.value = false
      getPlanList()
    }
  })
}
</script>

<style scoped>
.irrigation-plan {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.pagination {
  margin-top: 20px;
  text-align: right;
}
</style> 