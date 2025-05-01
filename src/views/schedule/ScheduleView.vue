<template>
  <div class="schedule-view">
    <div class="content-card">
      <div class="header-section">
        <h2>灌溉调度方案</h2>
        <div class="action-buttons">
          <el-button type="primary" @click="openScheduleDialog">整体性调度方案</el-button>
          <el-button type="success" @click="openDifferentialDialog">差异性调度方案</el-button>
        </div>
      </div>
      
      <el-divider />
      
      <div v-if="scheduleResult" class="schedule-result">
        <div class="result-header">
          <h3>调度方案详情</h3>
        </div>
        <pre class="result-content">{{ scheduleResult }}</pre>
      </div>
      
      <div v-else class="empty-state">
        <el-empty description="暂无调度方案数据" />
      </div>
      
      <!-- 生成调度方案对话框 -->
      <el-dialog
        v-model="dialogVisible"
        title="整体性调度方案"
        width="500px"
        destroy-on-close
      >
        <el-form
          ref="formRef"
          :model="scheduleForm"
          :rules="rules"
          label-width="120px"
          label-position="right"
        >
          <el-form-item label="地块" prop="fieldId">
            <el-select 
              v-model="scheduleForm.fieldId" 
              placeholder="请选择地块"
              style="width: 100%"
              filterable
              @change="handleFieldChange"
            >
              <el-option
                v-for="field in fieldOptions"
                :key="field.id"
                :label="field.fieldId"
                :value="field.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="分组" prop="groupId">
            <el-select 
              v-model="scheduleForm.groupId" 
              placeholder="请选择分组"
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="group in groupOptions"
                :key="group.id"
                :label="group.groupName"
                :value="group.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="任务" prop="taskId">
            <el-select 
              v-model="scheduleForm.taskId" 
              placeholder="请选择任务"
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="task in taskOptions"
                :key="task.id"
                :label="task.taskId"
                :value="task.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="灌溉参数" prop="argumentId">
            <el-select 
              v-model="scheduleForm.argumentId" 
              placeholder="请选择灌溉参数"
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="arg in argumentOptions"
                :key="arg.id"
                :label="`水肥比(${arg.water_and_fertilizer}:1) 流速(${arg.current_speed}L)`"
                :value="arg.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="肥料类型" prop="fertilizerType">
            <el-radio-group v-model="scheduleForm.fertilizerType">
              <el-radio :label="1">顺序肥</el-radio>
              <el-radio :label="2">混合肥</el-radio>
            </el-radio-group>
            <div class="form-tip">
              顺序肥：按照设定顺序依次施肥；混合肥：同时混合施肥
            </div>
          </el-form-item>
          
          <el-form-item label="施肥顺序" prop="sortType" v-if="scheduleForm.fertilizerType === 1">
            <div class="fertilizer-sort-simple">
              <p class="sort-instruction">请拖动调整施肥顺序：</p>
              <div class="sort-items">
                <div 
                  v-for="(item, index) in fertilizersOrder" 
                  :key="item.value"
                  class="sort-item"
                >
                  <div class="sort-content">
                    <span class="order-num">{{ index + 1 }}</span>
                    <span class="sort-label">{{ item.label }}</span>
                  </div>
                  <div class="item-actions">
                    <el-button 
                      type="primary" 
                      circle 
                      plain
                      size="small"
                      :disabled="index === 0" 
                      @click="moveItemUp(index)"
                      title="上移"
                    >↑</el-button>
                    <el-button 
                      type="primary" 
                      circle 
                      plain
                      size="small"
                      :disabled="index === fertilizersOrder.length - 1" 
                      @click="moveItemDown(index)"
                      title="下移"
                    >↓</el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-form-item>
          
          <el-form-item v-else>
            <div class="mixed-fertilizer-info">
              <el-alert
                title="混合肥模式下，将同时混合并施加氮肥、磷肥和钾肥"
                type="info"
                description="混合肥模式无需设置施肥顺序，系统将根据任务中设定的肥料用量进行混合计算"
                show-icon
                :closable="false"
              />
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="generateSchedule" :loading="generating">
              生成
            </el-button>
          </span>
        </template>
      </el-dialog>
      
      <!-- 差异性调度方案对话框 -->
      <el-dialog
        v-model="differentialDialogVisible"
        title="差异性调度方案"
        width="500px"
        destroy-on-close
      >
        <el-form
          ref="differentialFormRef"
          :model="differentialForm"
          :rules="rules"
          label-width="120px"
          label-position="right"
        >
          <el-form-item label="地块" prop="fieldId">
            <el-select 
              v-model="differentialForm.fieldId" 
              placeholder="请选择地块"
              style="width: 100%"
              filterable
              @change="handleDifferentialFieldChange"
            >
              <el-option
                v-for="field in fieldOptions"
                :key="field.id"
                :label="field.fieldId"
                :value="field.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="分组" prop="groupId">
            <el-select 
              v-model="differentialForm.groupId" 
              placeholder="请选择分组"
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="group in groupOptions"
                :key="group.id"
                :label="group.groupName"
                :value="group.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="任务" prop="taskId">
            <el-select 
              v-model="differentialForm.taskId" 
              placeholder="请选择任务"
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="task in taskOptions"
                :key="task.id"
                :label="task.taskId"
                :value="task.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="灌溉参数" prop="argumentId">
            <el-select 
              v-model="differentialForm.argumentId" 
              placeholder="请选择灌溉参数"
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="arg in argumentOptions"
                :key="arg.id"
                :label="`水肥比(${arg.water_and_fertilizer}:1) 流速(${arg.current_speed}L)`"
                :value="arg.id"
              />
            </el-select>
          </el-form-item>
          
          <el-form-item label="肥料类型" prop="fertilizerType">
            <el-radio-group v-model="differentialForm.fertilizerType">
              <el-radio :label="1">顺序肥</el-radio>
              <el-radio :label="2">混合肥</el-radio>
            </el-radio-group>
            <div class="form-tip">
              顺序肥：按照设定顺序依次施肥；混合肥：同时混合施肥
            </div>
          </el-form-item>
          
          <el-form-item label="施肥顺序" prop="sortType" v-if="differentialForm.fertilizerType === 1">
            <div class="fertilizer-sort-simple">
              <p class="sort-instruction">请拖动调整施肥顺序：</p>
              <div class="sort-items">
                <div 
                  v-for="(item, index) in differentialFertilizersOrder" 
                  :key="item.value"
                  class="sort-item"
                >
                  <div class="sort-content">
                    <span class="order-num">{{ index + 1 }}</span>
                    <span class="sort-label">{{ item.label }}</span>
                  </div>
                  <div class="item-actions">
                    <el-button 
                      type="primary" 
                      circle 
                      plain
                      size="small"
                      :disabled="index === 0" 
                      @click="differentialMoveItemUp(index)"
                      title="上移"
                    >↑</el-button>
                    <el-button 
                      type="primary" 
                      circle 
                      plain
                      size="small"
                      :disabled="index === differentialFertilizersOrder.length - 1" 
                      @click="differentialMoveItemDown(index)"
                      title="下移"
                    >↓</el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-form-item>
          
          <el-form-item v-else>
            <div class="mixed-fertilizer-info">
              <el-alert
                title="混合肥模式下，将同时混合并施加氮肥、磷肥和钾肥"
                type="info"
                description="混合肥模式无需设置施肥顺序，系统将根据任务中设定的肥料用量进行混合计算"
                show-icon
                :closable="false"
              />
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="differentialDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="generateDifferentialSchedule" :loading="differentialGenerating">
              生成
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// API基础URL
const API_BASE_URL = '/api'

// 表单相关
const dialogVisible = ref(false)
const differentialDialogVisible = ref(false)
const formRef = ref(null)
const generating = ref(false)
const scheduleResult = ref('')
const differentialGenerating = ref(false)

// 表单数据
const scheduleForm = reactive({
  fieldId: null,
  groupId: null,
  taskId: null,
  argumentId: null,
  sortType: [1, 2, 3], // 默认顺序：氮肥、磷肥、钾肥
  fertilizerType: 1 // 默认肥料类型：顺序肥
})

// 选项数据
const fieldOptions = ref([])
const groupOptions = ref([])
const taskOptions = ref([])
const argumentOptions = ref([])

// 肥料顺序列表
const fertilizersData = [
  { value: 1, label: '氮肥' },
  { value: 2, label: '磷肥' },
  { value: 3, label: '钾肥' }
]

// 当前显示的肥料顺序
const fertilizersOrder = ref([
  { value: 1, label: '氮肥' },
  { value: 2, label: '磷肥' },
  { value: 3, label: '钾肥' }
])

// 表单验证规则
const rules = {
  fieldId: [{ required: true, message: '请选择地块', trigger: 'change' }],
  groupId: [{ required: true, message: '请选择分组', trigger: 'change' }],
  taskId: [{ required: true, message: '请选择任务', trigger: 'change' }],
  argumentId: [{ required: true, message: '请选择灌溉参数', trigger: 'change' }],
  sortType: [{
    type: 'array',
    required: true,
    message: '请设置施肥顺序',
    trigger: 'change',
    validator: (rule, value, callback) => {
      if (scheduleForm.fertilizerType === 1 && (!value || value.length === 0)) {
        callback(new Error('请设置施肥顺序'));
      } else {
        callback();
      }
    }
  }],
  fertilizerType: [{ required: true, message: '请选择肥料类型', trigger: 'change' }]
}

// 上移肥料顺序
const moveItemUp = (index) => {
  if (index > 0) {
    const temp = fertilizersOrder.value[index]
    fertilizersOrder.value[index] = fertilizersOrder.value[index - 1]
    fertilizersOrder.value[index - 1] = temp
    updateSortTypeFromOrder()
  }
}

// 下移肥料顺序
const moveItemDown = (index) => {
  if (index < fertilizersOrder.value.length - 1) {
    const temp = fertilizersOrder.value[index]
    fertilizersOrder.value[index] = fertilizersOrder.value[index + 1]
    fertilizersOrder.value[index + 1] = temp
    updateSortTypeFromOrder()
  }
}

// 从顺序列表更新表单的sortType数组
const updateSortTypeFromOrder = () => {
  scheduleForm.sortType = fertilizersOrder.value.map(item => item.value)
}

// 从表单的sortType初始化顺序列表
const initOrderFromSortType = () => {
  fertilizersOrder.value = scheduleForm.sortType.map(value => {
    const matchedItem = fertilizersData.find(item => item.value === value)
    return { 
      value, 
      label: matchedItem ? matchedItem.label : `未知(${value})` 
    }
  })
}

// 重置表单时的处理
const resetForm = () => {
  // 默认肥料类型：顺序肥
  scheduleForm.fertilizerType = 1
  // 默认顺序：氮肥、磷肥、钾肥
  scheduleForm.sortType = [1, 2, 3]
  initOrderFromSortType()
}

// 修改打开对话框的行为
const openScheduleDialog = () => {
  dialogVisible.value = true
  resetForm()
}

// 打开差异性调度方案对话框
const openDifferentialDialog = () => {
  differentialDialogVisible.value = true
  resetDifferentialForm()
}

// 监听表单数据变化，更新显示顺序
watch(() => scheduleForm.sortType, () => {
  if (dialogVisible.value && scheduleForm.sortType.length > 0) {
    initOrderFromSortType()
  }
}, { deep: true })

// 加载地块列表
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

// 加载分组列表
const loadGroupOptions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/group/list`)
    if (response.data.code === 200) {
      groupOptions.value = response.data.value || []
    } else {
      ElMessage.error(response.data.msg || '获取分组列表失败')
    }
  } catch (error) {
    console.error('获取分组列表出错:', error)
    ElMessage.error('获取分组列表失败，请稍后重试')
  }
}

// 加载任务列表
const loadTaskOptions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/task/list`)
    if (response.data.code === 200) {
      taskOptions.value = response.data.value || []
    } else {
      ElMessage.error(response.data.msg || '获取任务列表失败')
    }
  } catch (error) {
    console.error('获取任务列表出错:', error)
    ElMessage.error('获取任务列表失败，请稍后重试')
  }
}

// 加载灌溉参数列表
const loadArgumentOptions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/argument/list`)
    if (response.data.code === 200) {
      argumentOptions.value = response.data.value || []
    } else {
      ElMessage.error(response.data.msg || '获取灌溉参数列表失败')
    }
  } catch (error) {
    console.error('获取灌溉参数列表出错:', error)
    ElMessage.error('获取灌溉参数列表失败，请稍后重试')
  }
}

// 处理地块变化
// eslint-disable-next-line no-unused-vars
const handleFieldChange = (fieldId) => {
  // 如果需要基于地块筛选其他选项，可以在这里添加逻辑
}

// 生成调度方案
const generateSchedule = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      generating.value = true
      
      try {
        // 将数组转换为逗号分隔的字符串，避免URL中的方括号
        const sortTypeStr = scheduleForm.sortType.join(',')
        
        const params = {
          fieldId: scheduleForm.fieldId,
          groupId: scheduleForm.groupId,
          taskId: scheduleForm.taskId,
          argumentId: scheduleForm.argumentId,
          sortType: sortTypeStr
        }
        
        // 选择不同的API端点
        const apiEndpoint = scheduleForm.fertilizerType === 1 
          ? `${API_BASE_URL}/work/work`  // 顺序肥
          : `${API_BASE_URL}/work/work/mix` // 混合肥
        
        const response = await axios.get(apiEndpoint, { params })
        
        if (response.data.code === 200) {
          scheduleResult.value = response.data.value
          ElMessage.success('调度方案生成成功')
          dialogVisible.value = false
        } else {
          ElMessage.error(response.data.msg || '生成调度方案失败')
        }
      } catch (error) {
        console.error('生成调度方案出错:', error)
        ElMessage.error('生成调度方案失败，请稍后重试')
      } finally {
        generating.value = false
      }
    }
  })
}

// 差异性调度方案表单相关
const differentialFormRef = ref(null)
const differentialForm = reactive({
  fieldId: null,
  groupId: null,
  taskId: null,
  argumentId: null,
  sortType: [1, 2, 3], // 默认顺序：氮肥、磷肥、钾肥
  fertilizerType: 1 // 默认肥料类型：顺序肥
})

// 差异性肥料顺序列表
const differentialFertilizersOrder = ref([
  { value: 1, label: '氮肥' },
  { value: 2, label: '磷肥' },
  { value: 3, label: '钾肥' }
])

// 差异性调度方案的上移肥料顺序
const differentialMoveItemUp = (index) => {
  if (index > 0) {
    const temp = differentialFertilizersOrder.value[index]
    differentialFertilizersOrder.value[index] = differentialFertilizersOrder.value[index - 1]
    differentialFertilizersOrder.value[index - 1] = temp
    updateDifferentialSortTypeFromOrder()
  }
}

// 差异性调度方案的下移肥料顺序
const differentialMoveItemDown = (index) => {
  if (index < differentialFertilizersOrder.value.length - 1) {
    const temp = differentialFertilizersOrder.value[index]
    differentialFertilizersOrder.value[index] = differentialFertilizersOrder.value[index + 1]
    differentialFertilizersOrder.value[index + 1] = temp
    updateDifferentialSortTypeFromOrder()
  }
}

// 从顺序列表更新差异性表单的sortType数组
const updateDifferentialSortTypeFromOrder = () => {
  differentialForm.sortType = differentialFertilizersOrder.value.map(item => item.value)
}

// 从差异性表单的sortType初始化顺序列表
const initDifferentialOrderFromSortType = () => {
  differentialFertilizersOrder.value = differentialForm.sortType.map(value => {
    const matchedItem = fertilizersData.find(item => item.value === value)
    return { 
      value, 
      label: matchedItem ? matchedItem.label : `未知(${value})` 
    }
  })
}

// 重置差异性表单时的处理
const resetDifferentialForm = () => {
  // 默认肥料类型：顺序肥
  differentialForm.fertilizerType = 1
  // 默认顺序：氮肥、磷肥、钾肥
  differentialForm.sortType = [1, 2, 3]
  initDifferentialOrderFromSortType()
}

// 处理差异性地块变化
// eslint-disable-next-line no-unused-vars
const handleDifferentialFieldChange = (fieldId) => {
  // 如果需要基于地块筛选其他选项，可以在这里添加逻辑
}

// 生成差异性调度方案
const generateDifferentialSchedule = async () => {
  if (!differentialFormRef.value) return
  
  await differentialFormRef.value.validate(async (valid) => {
    if (valid) {
      differentialGenerating.value = true
      
      try {
        // 将数组转换为逗号分隔的字符串，避免URL中的方括号
        const sortTypeStr = differentialForm.sortType.join(',')
        
        const params = {
          fieldId: differentialForm.fieldId,
          groupId: differentialForm.groupId,
          taskId: differentialForm.taskId,
          argumentId: differentialForm.argumentId,
          sortType: sortTypeStr
        }
        
        // 选择不同的API端点
        const apiEndpoint = differentialForm.fertilizerType === 1 
          ? `${API_BASE_URL}/work/work/diff`  // 差异性-顺序肥使用新路径
          : `${API_BASE_URL}/work/work/mix` // 混合肥与整体性保持一致
        
        const response = await axios.get(apiEndpoint, { params })
        
        if (response.data.code === 200) {
          scheduleResult.value = response.data.value
          ElMessage.success('差异性调度方案生成成功')
          differentialDialogVisible.value = false
        } else {
          ElMessage.error(response.data.msg || '生成差异性调度方案失败')
        }
      } catch (error) {
        console.error('生成差异性调度方案出错:', error)
        ElMessage.error('生成差异性调度方案失败，请稍后重试')
      } finally {
        differentialGenerating.value = false
      }
    }
  })
}

// 页面加载时获取数据
onMounted(() => {
  loadFieldOptions()
  loadGroupOptions()
  loadTaskOptions()
  loadArgumentOptions()
})
</script>

<style scoped>
.schedule-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.empty-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.schedule-result {
  margin-top: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-header {
  margin-bottom: 15px;
}

.result-content {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 15px;
  white-space: pre-wrap;
  overflow-x: auto;
  flex: 1;
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.4;
}

.fertilizer-selector {
  display: flex;
  align-items: stretch;
  height: 300px;
}

.fertilizer-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.panel-header {
  height: 40px;
  line-height: 40px;
  background-color: #f5f7fa;
  padding: 0 15px;
  font-weight: 500;
  color: #606266;
  border-bottom: 1px solid #dcdfe6;
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-footer {
  padding: 7px 15px;
  border-top: 1px solid #dcdfe6;
  background-color: #f5f7fa;
}

.helper-text {
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.search-input {
  padding: 8px;
  border-bottom: 1px solid #dcdfe6;
}

.fertilizer-list {
  flex: 1;
  overflow-y: auto;
  padding: 5px 0;
}

.empty-fertilizer {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.fertilizer-item-selectable,
.fertilizer-item-ordered {
  padding: 5px 15px;
  cursor: pointer;
  user-select: none;
}

.fertilizer-item-selectable:hover,
.fertilizer-item-ordered:hover {
  background-color: #f5f7fa;
}

/* 自定义复选框样式 */
.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-inner {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
}

.checkbox-inner.is-checked {
  background-color: #409EFF;
  border-color: #409EFF;
  color: #fff;
}

.checkbox-label {
  font-size: 14px;
  color: #606266;
}

/* 删除之前可能导致问题的样式 */
:deep(.el-checkbox),
:deep(.el-checkbox__label) {
  display: none;
}

.fertilizer-item-ordered {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fertilizer-content {
  display: flex;
  align-items: center;
}

.order-num {
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  background-color: #409EFF;
  color: white;
  border-radius: 50%;
  margin-right: 8px;
  font-size: 12px;
}

.item-actions {
  display: flex;
  gap: 5px;
}

.transfer-actions {
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.fertilizer-sort-simple {
  width: 100%;
  padding: 15px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #f8f9fa;
}

.sort-instruction {
  font-size: 14px;
  color: #606266;
  margin-bottom: 15px;
}

.sort-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sort-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.sort-content {
  display: flex;
  align-items: center;
}

.sort-label {
  font-size: 14px;
  font-weight: 500;
}

.order-num {
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background-color: #409EFF;
  color: white;
  border-radius: 50%;
  margin-right: 10px;
  font-weight: bold;
}

.item-actions {
  display: flex;
  gap: 5px;
}

.mixed-fertilizer-info {
  margin: 10px 0;
}

.action-buttons {
  display: flex;
  gap: 10px;
}
</style> 