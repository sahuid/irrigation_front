<template>
  <div class="task-management">
    <div class="content-card">
      <div class="filter-section">
        <div class="search-inputs">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索地块编号或任务编号"
            prefix-icon="Search"
            clearable
            @clear="getTaskList"
            style="width: 200px; margin-right: 10px;"
          />
          <el-input
            v-model="searchTaskId"
            placeholder="任务编号"
            clearable
            @clear="getTaskList"
            style="width: 150px; margin-right: 10px;"
          />
          <el-date-picker
            v-model="searchStartTime"
            type="datetime"
            placeholder="开始时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            clearable
            @clear="getTaskList"
            style="width: 220px; margin-right: 10px;"
          />
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </div>
        <div class="action-buttons">
          <el-button type="primary" @click="handleAddTask" icon="Plus">新增任务</el-button>
          <el-button type="success" @click="handleAddDiffTask" icon="Plus">新增差异性任务</el-button>
        </div>
      </div>
      
      <div class="type-filter">
        <span class="filter-label">任务类型：</span>
        <el-radio-group v-model="taskTypeFilter" size="small" @change="handleTypeFilterChange">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="normal">整体性任务</el-radio-button>
          <el-radio-button label="diff">差异性任务</el-radio-button>
        </el-radio-group>
      </div>
      
      <el-table 
        :data="filteredTaskList" 
        border 
        style="width: 100%" 
        v-loading="loading"
        :header-cell-style="{background:'#f5f7fa', color:'#606266'}"
        row-key="id"
        stripe
        @expand-change="handleExpandChange"
      >
        <el-table-column type="expand" width="50">
          <template #default="{ row }">
            <div v-if="row.type === 1 && loadingDiffListTaskIds.includes(row.id)" class="loading-diff-params">
              <el-skeleton :rows="3" animated />
            </div>
            <div v-else-if="row.type === 1 && row.diffList && row.diffList.length > 0" class="expanded-diff-params">
              <h4 class="expanded-diff-title">灌溉单元参数列表</h4>
              <el-table
                :data="row.diffList"
                border
                size="small"
                style="width: 100%"
              >
                <el-table-column prop="fieldUnitId" label="灌溉单元编号" width="150" />
                <el-table-column prop="water" label="水量(m³)" width="120" />
                <el-table-column prop="fertilizerN" label="氮肥(kg)" width="120" />
                <el-table-column prop="fertilizerP" label="磷肥(kg)" width="120" />
                <el-table-column prop="fertilizerK" label="钾肥(kg)" width="120" />
                <el-table-column label="操作" width="100">
                  <template #default="scope">
                    <el-button 
                      type="primary" 
                      size="small" 
                      @click="handleEditUnitParam(row, scope.row)" 
                      icon="Edit"
                    >
                      编辑
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <div v-else-if="row.type === 1" class="no-diff-params">
              <el-empty description="暂无灌溉单元参数" :image-size="60" />
            </div>
            <div v-else class="not-diff-task">
              <div class="info-message">整体性任务无需查看灌溉单元参数</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="taskId" label="任务编号" width="120" />
        <el-table-column prop="fieldId" label="地块编号" width="120" />
        <el-table-column label="任务类型" width="120">
          <template #default="scope">
            <el-tag 
              :type="scope.row.type === 1 ? 'success' : 'primary'" 
              effect="plain"
            >
              {{ scope.row.type === 1 ? '差异性任务' : '整体性任务' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="灌溉单元编号" width="180">
          <template #default="scope">
            <span>{{ Array.isArray(scope.row.fieldUnitIds) ? scope.row.fieldUnitIds.join(', ') : scope.row.fieldUnitId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="180">
          <template #default="scope">
            {{ formatStartTimeForDisplay(scope.row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="water" label="水量(m³)" width="100">
          <template #default="scope">
            {{ scope.row.type === 1 ? calculateTotalForTask(scope.row, 'water') : scope.row.water }}
          </template>
        </el-table-column>
        <el-table-column prop="fertilizerN" label="氮肥(kg)" width="100">
          <template #default="scope">
            {{ scope.row.type === 1 ? calculateTotalForTask(scope.row, 'fertilizerN') : scope.row.fertilizerN }}
          </template>
        </el-table-column>
        <el-table-column prop="fertilizerP" label="磷肥(kg)" width="100">
          <template #default="scope">
            {{ scope.row.type === 1 ? calculateTotalForTask(scope.row, 'fertilizerP') : scope.row.fertilizerP }}
          </template>
        </el-table-column>
        <el-table-column prop="fertilizerK" label="钾肥(kg)" width="100">
          <template #default="scope">
            {{ scope.row.type === 1 ? calculateTotalForTask(scope.row, 'fertilizerK') : scope.row.fertilizerK }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="360" fixed="right">
          <template #default="scope">
            <div class="operation-buttons">
              <el-button type="primary" size="small" @click="handleEdit(scope.row)" icon="Edit">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(scope.row)" icon="Delete">删除</el-button>
              <el-button type="success" size="small" @click="handleToGroup(scope.row)" icon="SetUp">一键分组</el-button>
              <el-button 
                v-if="scope.row.type === 1" 
                type="warning" 
                size="small" 
                @click="handleSetUnitParams(scope.row)" 
                icon="Setting"
              >
                设参数
              </el-button>
            </div>
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
        <el-form-item label="灌溉单元编号" prop="fieldUnitIds">
          <div>
            <el-table
              :data="fieldUnitOptions"
              border
              size="small"
              style="width: 100%"
              max-height="250px"
              v-loading="!taskForm.fieldId"
              empty-text="请先选择地块"
            >
              <el-table-column type="selection" width="55" :selectable="isUnitSelectable" />
              <el-table-column prop="fieldUnitId" label="灌溉单元编号" />
              <el-table-column width="80">
                <template #default="scope">
                  <el-button
                    type="primary"
                    size="small"
                    plain
                    :disabled="taskForm.fieldUnitIds.includes(scope.row.fieldUnitId)"
                    @click="toggleUnitSelection(scope.row)"
                  >
                    {{ taskForm.fieldUnitIds.includes(scope.row.fieldUnitId) ? '已选' : '选择' }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <div style="margin-top: 10px;" v-if="taskForm.fieldUnitIds.length > 0">
              <div style="margin-bottom: 8px; font-size: 14px; color: #606266;">已选灌溉单元：</div>
              <div class="selected-units">
                <el-tag
                  v-for="(unitId, index) in taskForm.fieldUnitIds"
                  :key="index"
                  closable
                  @close="taskForm.fieldUnitIds.splice(index, 1)"
                  style="margin-right: 6px; margin-bottom: 6px;"
                >
                  {{ unitId }}
                </el-tag>
              </div>
            </div>
          </div>
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
        <!-- 仅在整体性任务表单中显示肥料和水量字段 -->
        <template v-if="!taskForm.isDiff">
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
        </template>
        <div v-else class="form-info-message">
          <el-alert
            title="差异性任务无需设置肥料与水量参数"
            type="info"
            :closable="false"
            show-icon
            description="差异性任务将根据实际情况智能分配灌溉参数"
          />
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 一键分组对话框 -->
    <el-dialog
      v-model="groupDialogVisible"
      title="将任务灌溉单元添加到分组"
      width="500px"
      destroy-on-close
    >
      <el-form :model="groupForm" ref="groupFormRef" label-width="120px">
        <el-form-item label="选择分组" prop="groupId">
          <el-select v-model="groupForm.groupId" placeholder="请选择分组" style="width: 100%;">
            <el-option
              v-for="group in groupOptions"
              :key="group.id"
              :label="group.groupName"
              :value="group.id"
            />
          </el-select>
        </el-form-item>
        <div style="margin-top: 20px; color: #666; font-size: 14px;">
          <p>将会把任务 <strong>{{ currentTask?.taskId }}</strong> 中的灌溉单元添加到所选分组。</p>
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="groupDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitGroupForm" :loading="groupSubmitLoading">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 设置灌溉单元参数对话框 -->
    <el-dialog
      v-model="unitParamsDialogVisible"
      title="设置差异性任务灌溉单元参数"
      width="700px"
      destroy-on-close
    >
      <div v-if="currentTask" class="task-info">
        <p>任务编号: <strong>{{ currentTask.taskId }}</strong></p>
        <p>地块编号: <strong>{{ currentTask.fieldId }}</strong></p>
      </div>
      
      <!-- 调试信息 -->
      <div class="debug-info" style="margin: 10px 0; padding: 10px; background-color: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; color: #666;">
        <p>灌溉单元数量: {{ unitParamsList.length }}</p>
        <p>当前选择: {{ selectedUnitId || '未选择' }}</p>
      </div>
      
      <div class="unit-params-form" v-loading="unitParamsListLoading">
        <el-form label-width="120px">
          <el-form-item label="选择灌溉单元">
            <el-select 
              v-model="selectedUnitId" 
              placeholder="请选择灌溉单元" 
              style="width: 100%"
              @change="handleUnitChange"
              :loading="unitParamsListLoading"
              :disabled="unitParamsListLoading || unitParamsList.length === 0"
            >
              <el-option 
                v-for="param in unitParamsList" 
                :key="param.fieldUnitId" 
                :label="param.fieldUnitId" 
                :value="param.fieldUnitId" 
              />
            </el-select>
          </el-form-item>
        </el-form>
        
        <div v-if="selectedUnitId" class="unit-params">
          <h3 class="unit-params-title">灌溉单元 {{ selectedUnitId }} 参数设置</h3>
          <el-form label-width="120px">
            <el-form-item label="水量(m³)">
              <el-input-number 
                v-model="currentUnitParams.water" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
              ></el-input-number>
            </el-form-item>
            <el-form-item label="氮肥(kg)">
              <el-input-number 
                v-model="currentUnitParams.fertilizerN" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
              ></el-input-number>
            </el-form-item>
            <el-form-item label="磷肥(kg)">
              <el-input-number 
                v-model="currentUnitParams.fertilizerP" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
              ></el-input-number>
            </el-form-item>
            <el-form-item label="钾肥(kg)">
              <el-input-number 
                v-model="currentUnitParams.fertilizerK" 
                :min="0" 
                :precision="2" 
                style="width: 100%"
              ></el-input-number>
            </el-form-item>
          </el-form>
        </div>
        
        <!-- 无数据提示 -->
        <el-empty 
          v-if="!unitParamsListLoading && unitParamsList.length === 0" 
          description="未找到灌溉单元数据" 
        />
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="unitParamsDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="submitUnitParams" 
            :loading="unitParamsSubmitLoading"
            :disabled="unitParamsList.length === 0"
          >
            保存参数
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
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
const searchTaskId = ref('')
const searchStartTime = ref('')
const taskTypeFilter = ref('all') // 任务类型筛选，默认显示全部

// 筛选后的任务列表
const filteredTaskList = computed(() => {
  // 如果没有选择筛选类型，返回所有数据
  if (taskTypeFilter.value === 'all') {
    return taskList.value;
  }
  
  // 筛选整体性任务 (type=0)
  if (taskTypeFilter.value === 'normal') {
    return taskList.value.filter(task => task.type === 0 || task.type === undefined);
  }
  
  // 筛选差异性任务 (type=1)
  if (taskTypeFilter.value === 'diff') {
    return taskList.value.filter(task => task.type === 1);
  }
  
  return taskList.value;
});

// 地块选项
const fieldOptions = ref([])
// 灌溉单元选项
const fieldUnitOptions = ref([])

// 分组相关
const groupDialogVisible = ref(false)
const groupOptions = ref([])
const groupSubmitLoading = ref(false)
const groupFormRef = ref(null)
const currentTask = ref(null)
const groupForm = reactive({
  groupId: '',
  taskId: ''
})

// 表单相关
const taskFormRef = ref(null)
const dialogVisible = ref(false)
const dialogTitle = ref('新增任务')
const taskForm = reactive({
  id: '',
  taskId: '',
  fieldId: '',
  fieldUnitIds: [],
  startTimeDate: '', // 用于日期选择器
  startTime: '',
  water: 0,
  fertilizerN: 0,
  fertilizerP: 0,
  fertilizerK: 0,
  isDiff: false // 是否是差异性任务
})

// 单元参数相关变量
const unitParamsDialogVisible = ref(false)
const unitParamsList = ref([])
const unitParamsListLoading = ref(false)
const unitParamsSubmitLoading = ref(false)
const selectedUnitId = ref('') // 当前选择的灌溉单元ID
const currentUnitParams = reactive({
  fieldUnitId: '',
  taskId: '',
  water: 0,
  fertilizerN: 0,
  fertilizerP: 0,
  fertilizerK: 0
})

// 用于追踪正在加载diffList的任务ID
const loadingDiffListTaskIds = ref([]);

// 表单验证规则
const rules = {
  taskId: [{ required: true, message: '请输入任务编号', trigger: 'blur' }],
  fieldId: [{ required: true, message: '请选择地块编号', trigger: 'change' }],
  fieldUnitIds: [{ required: true, message: '请选择灌溉单元', trigger: 'change' }],
  startTimeDate: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  water: [{ 
    required: true, 
    message: '请输入水量', 
    trigger: 'blur',
    validator: (rule, value, callback) => {
      // 只有当不是差异性任务时才验证
      if (!taskForm.isDiff && (value === null || value === undefined || value === '')) {
        callback(new Error('请输入水量'));
      } else {
        callback();
      }
    }
  }],
  fertilizerN: [{ 
    required: true, 
    message: '请输入氮肥量', 
    trigger: 'blur',
    validator: (rule, value, callback) => {
      if (!taskForm.isDiff && (value === null || value === undefined || value === '')) {
        callback(new Error('请输入氮肥量'));
      } else {
        callback();
      }
    }
  }],
  fertilizerP: [{ 
    required: true, 
    message: '请输入磷肥量', 
    trigger: 'blur',
    validator: (rule, value, callback) => {
      if (!taskForm.isDiff && (value === null || value === undefined || value === '')) {
        callback(new Error('请输入磷肥量'));
      } else {
        callback();
      }
    }
  }],
  fertilizerK: [{ 
    required: true, 
    message: '请输入钾肥量', 
    trigger: 'blur',
    validator: (rule, value, callback) => {
      if (!taskForm.isDiff && (value === null || value === undefined || value === '')) {
        callback(new Error('请输入钾肥量'));
      } else {
        callback();
      }
    }
  }]
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

// 处理任务数据，确保字段格式一致
const processTaskData = (tasks) => {
  return tasks.map(task => {
    // 处理灌溉单元字段，确保是数组格式
    if (!task.fieldUnitIds) {
      if (task.fieldUnitId) {
        // 将单个fieldUnitId转为数组
        if (typeof task.fieldUnitId === 'string') {
          try {
            // 尝试解析JSON字符串
            const parsed = JSON.parse(task.fieldUnitId);
            if (Array.isArray(parsed)) {
              task.fieldUnitIds = parsed;
            } else {
              task.fieldUnitIds = [task.fieldUnitId];
            }
          } catch (e) {
            // 如果不是JSON格式，考虑是否是逗号分隔的字符串
            if (task.fieldUnitId.includes(',')) {
              task.fieldUnitIds = task.fieldUnitId.split(',').map(id => id.trim());
            } else {
              task.fieldUnitIds = [task.fieldUnitId];
            }
          }
        } else {
          task.fieldUnitIds = [task.fieldUnitId];
        }
      } else {
        task.fieldUnitIds = [];
      }
    } else if (typeof task.fieldUnitIds === 'string') {
      try {
        // 尝试解析JSON字符串格式，如 ["test11","test12","123"]
        const parsed = JSON.parse(task.fieldUnitIds);
        if (Array.isArray(parsed)) {
          task.fieldUnitIds = parsed;
        } else {
          // 如果是逗号分隔的字符串
          task.fieldUnitIds = task.fieldUnitIds.split(',').map(id => id.trim());
        }
      } catch (e) {
        // 如果解析失败，视为逗号分隔的字符串
        task.fieldUnitIds = task.fieldUnitIds.split(',').map(id => id.trim());
      }
    }
    
    // 处理diffList，确保即使为空也有一个数组
    if (!task.diffList) {
      task.diffList = [];
    }
    
    // 对于差异性任务，如果没有diffList数据，可以尝试加载
    if (task.type === 1 && task.diffList.length === 0) {
      // 这里可以考虑添加一个标志，表示此任务的diffList需要加载
      task.diffListNeedsLoading = true;
    }
    
    return task;
  });
};

// 获取任务列表
const getTaskList = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
      taskId: searchTaskId.value || undefined,
      startTime: searchStartTime.value || undefined
    };
    
    // 添加任务类型筛选
    if (taskTypeFilter.value === 'normal') {
      params.type = 0; // 整体性任务
    } else if (taskTypeFilter.value === 'diff') {
      params.type = 1; // 差异性任务
    }
    
    const response = await axios.get(`${API_BASE_URL}/task/query/page`, { params });
    
    if (response.data && response.data.code === 200) {
      console.log('API原始数据:', response.data);
      
      // 打印第一条记录，以便检查数据结构
      if (response.data.value.records && response.data.value.records.length > 0) {
        console.log('数据样例:', response.data.value.records[0]);
      }
      
      // 处理任务数据
      taskList.value = processTaskData(response.data.value.records || []);
      total.value = response.data.value.total || 0;
      
      // 按任务类型排序：整体性任务在前，差异性任务在后
      taskList.value.sort((a, b) => {
        // 如果type不存在，默认为整体性任务(0)
        const typeA = a.type === undefined ? 0 : a.type;
        const typeB = b.type === undefined ? 0 : b.type;
        return typeA - typeB; // 升序排列：0(整体性)在前，1(差异性)在后
      });
      
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
  
  taskList.value = processTaskData(mockData);
  total.value = mockData.length;
};

// 搜索处理
const handleSearch = () => {
  currentPage.value = 1; // 重置为第一页
  getTaskList();
}

// 重置搜索条件
const resetSearch = () => {
  searchKeyword.value = '';
  searchTaskId.value = '';
  searchStartTime.value = '';
  currentPage.value = 1;
  getTaskList();
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
  taskForm.fieldUnitIds = []
  
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
  taskForm.fieldUnitIds = []
  taskForm.isDiff = false // 设置为整体性任务
  
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

// 新增差异性任务
const handleAddDiffTask = () => {
  dialogTitle.value = '新增差异性任务'
  isEdit.value = false
  taskForm.id = ''
  taskForm.taskId = ''
  taskForm.fieldId = ''
  taskForm.fieldUnitIds = []
  taskForm.isDiff = true // 设置为差异性任务
  
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
  
  // 根据任务类型设置是否为差异性任务
  taskForm.isDiff = row.type === 1
  
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
  
  // 处理灌溉单元数据
  if (row.fieldUnitIds && Array.isArray(row.fieldUnitIds)) {
    // 新格式：直接使用数组
    taskForm.fieldUnitIds = row.fieldUnitIds;
  } else if (row.fieldUnitId) {
    // 旧格式：单个值转为数组
    taskForm.fieldUnitIds = [row.fieldUnitId];
  } else {
    // 没有值：空数组
    taskForm.fieldUnitIds = [];
  }
  
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
  
  // 只有整体性任务才设置水量和肥料参数
  if (!taskForm.isDiff) {
    taskForm.water = row.water
    taskForm.fertilizerN = row.fertilizerN
    taskForm.fertilizerP = row.fertilizerP
    taskForm.fertilizerK = row.fertilizerK
  } else {
    // 差异性任务设置默认值
    taskForm.water = 0
    taskForm.fertilizerN = 0
    taskForm.fertilizerP = 0
    taskForm.fertilizerK = 0
  }
  
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
        // 构建基础提交数据
        const submitData = {
          id: taskForm.id,
          taskId: taskForm.taskId,
          fieldId: taskForm.fieldId, // 直接使用地块编号字符串
          fieldUnitIds: taskForm.fieldUnitIds,
          startTime: backendFormat
        }
        
        // 如果不是差异性任务，添加水量和肥料相关字段
        if (!taskForm.isDiff) {
          submitData.water = taskForm.water
          submitData.fertilizerN = taskForm.fertilizerN
          submitData.fertilizerP = taskForm.fertilizerP
          submitData.fertilizerK = taskForm.fertilizerK
        }
        
        console.log('最终提交的数据:', submitData);
        
        if (taskForm.id) {
          // 编辑 - 使用 /task/update 接口
          response = await axios.put(`${API_BASE_URL}/task/update`, submitData)
        } else {
          // 根据是否是差异性任务选择不同的接口
          const apiUrl = taskForm.isDiff ? `${API_BASE_URL}/task/add/diff` : `${API_BASE_URL}/task/add`;
          response = await axios.post(apiUrl, submitData)
        }
        
        if (response.data.code === 200) {
          ElMessage.success(taskForm.id ? '编辑成功' : (taskForm.isDiff ? '添加差异性任务成功' : '添加任务成功'))
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

// 判断灌溉单元是否可选
const isUnitSelectable = (row) => {
  return !taskForm.fieldUnitIds.includes(row.fieldUnitId);
}

// 切换灌溉单元选择状态
const toggleUnitSelection = (row) => {
  if (!taskForm.fieldUnitIds.includes(row.fieldUnitId)) {
    taskForm.fieldUnitIds.push(row.fieldUnitId);
  }
}

// 一键分组
const handleToGroup = (row) => {
  currentTask.value = row;
  groupForm.taskId = row.id;
  groupForm.groupId = '';
  
  // 加载分组列表
  loadGroupOptions();
  
  // 显示对话框
  groupDialogVisible.value = true;
}

// 加载分组列表
const loadGroupOptions = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/group/list`);
    
    if (response.data.code === 200) {
      groupOptions.value = response.data.value || [];
    } else {
      ElMessage.error(response.data.msg || '获取分组列表失败');
    }
  } catch (error) {
    console.error('获取分组列表出错:', error);
    ElMessage.error('获取分组列表失败，请稍后重试');
  }
}

// 提交分组表单
const submitGroupForm = async () => {
  if (!groupForm.groupId) {
    ElMessage.warning('请选择分组');
    return;
  }
  
  groupSubmitLoading.value = true;
  
  try {
    const response = await axios.post(`${API_BASE_URL}/task/to/group`, {
      groupId: groupForm.groupId,
      taskId: groupForm.taskId
    });
    
    if (response.data.code === 200) {
      ElMessage.success(response.data.msg || '一键分组成功');
      groupDialogVisible.value = false;
      
      // 刷新任务列表
      getTaskList();
    } else {
      ElMessage.error(response.data.msg || '一键分组失败');
    }
  } catch (error) {
    console.error('一键分组出错:', error);
    ElMessage.error('网络错误，请稍后重试');
  } finally {
    groupSubmitLoading.value = false;
  }
}

// 处理任务类型筛选变化
const handleTypeFilterChange = () => {
  getTaskList()
}

// 设置灌溉单元参数
const handleSetUnitParams = (row) => {
  console.log('原始任务数据:', row);
  
  // 保存当前任务信息
  currentTask.value = {...row};
  
  // 初始化单元参数列表
  unitParamsList.value = [];
  
  // 清空当前选择
  selectedUnitId.value = '';
  
  // 显示对话框
  unitParamsDialogVisible.value = true;
  
  // 从后端获取灌溉单元列表
  loadTaskFieldUnits(row.id);
}

// 从后端加载任务的灌溉单元列表
const loadTaskFieldUnits = async (taskId) => {
  try {
    // 显示加载状态
    unitParamsListLoading.value = true;
    
    console.log('请求灌溉单元列表, 任务ID:', taskId);
    
    const response = await axios.get(`${API_BASE_URL}/task/get/unit`, {
      params: { taskId }
    });
    
    if (response.data && response.data.code === 200) {
      console.log('获取到灌溉单元列表:', response.data.value);
      
      // 处理接收到的灌溉单元列表
      const fieldUnits = response.data.value || [];
      
      // 为每个灌溉单元创建参数对象
      unitParamsList.value = fieldUnits.map(unitId => ({
        fieldUnitId: String(unitId).trim(),
        taskId: currentTask.value.id,
        water: 0,
        fertilizerN: 0,
        fertilizerP: 0,
        fertilizerK: 0
      }));
      
      console.log('创建的参数列表:', unitParamsList.value);
    } else {
      ElMessage.error(response.data?.msg || '获取灌溉单元列表失败');
      console.error('API返回错误:', response.data);
    }
  } catch (error) {
    console.error('获取灌溉单元列表出错:', error);
    ElMessage.error('网络错误，请稍后重试');
  } finally {
    unitParamsListLoading.value = false;
  }
}

// 处理灌溉单元选择变化
const handleUnitChange = (unitId) => {
  console.log('选择的灌溉单元ID:', unitId);
  
  // 查找当前单元的参数，如果不存在则创建一个新的
  let params = unitParamsList.value.find(item => item.fieldUnitId === unitId);
  
  if (!params) {
    console.log('未找到该单元的参数，创建新参数');
    params = {
      fieldUnitId: unitId,
      taskId: currentTask.value.id,
      water: 0,
      fertilizerN: 0,
      fertilizerP: 0,
      fertilizerK: 0
    };
    unitParamsList.value.push(params);
  } else {
    console.log('找到已有参数:', params);
  }
  
  // 更新当前单元参数
  currentUnitParams.fieldUnitId = params.fieldUnitId;
  currentUnitParams.taskId = params.taskId;
  currentUnitParams.water = params.water;
  currentUnitParams.fertilizerN = params.fertilizerN;
  currentUnitParams.fertilizerP = params.fertilizerP;
  currentUnitParams.fertilizerK = params.fertilizerK;
  
  console.log('当前单元参数已更新:', currentUnitParams);
}

// 提交单位参数
const submitUnitParams = async () => {
  if (!currentTask.value) return;
  
  // 如果当前有选择的单元，先保存当前参数到列表中
  if (selectedUnitId.value) {
    const index = unitParamsList.value.findIndex(item => item.fieldUnitId === selectedUnitId.value);
    if (index !== -1) {
      unitParamsList.value[index] = {
        ...currentUnitParams
      };
    }
  }
  
  // 验证是否选择了灌溉单元
  if (!selectedUnitId.value) {
    ElMessage.warning('请先选择一个灌溉单元');
    return;
  }
  
  // 获取当前选择的单元参数
  const selectedParam = unitParamsList.value.find(p => p.fieldUnitId === selectedUnitId.value);
  if (!selectedParam) {
    ElMessage.warning('未找到选择的灌溉单元参数');
    return;
  }
  
  unitParamsSubmitLoading.value = true;
  
  try {
    // 按照后端需要的格式构造数据
    const submitData = {
      taskId: currentTask.value.id,
      fieldUnitId: selectedParam.fieldUnitId,
      water: selectedParam.water,
      fertilizerN: selectedParam.fertilizerN,
      fertilizerP: selectedParam.fertilizerP,
      fertilizerK: selectedParam.fertilizerK
    };
    
    // 判断是新增还是更新
    let response;
    if (currentTask.value.diffList && currentTask.value.diffList.some(diff => diff.fieldUnitId === selectedParam.fieldUnitId)) {
      // 已存在的参数，使用更新接口
      response = await axios.post(`${API_BASE_URL}/task/diff/update`, submitData);
    } else {
      // 新参数，使用设置接口
      response = await axios.post(`${API_BASE_URL}/task/set/fieldUnit`, submitData);
    }
    
    if (response.data?.code === 200) {
      ElMessage.success('保存灌溉单元参数成功');
      unitParamsDialogVisible.value = false;
      
      // 刷新任务列表中的diffList数据
      if (currentTask.value.id) {
        loadTaskDiffList(currentTask.value.id);
      }
      
      // 刷新整个任务列表
      getTaskList();
    } else {
      ElMessage.error(response.data?.msg || '保存参数失败');
    }
  } catch (error) {
    console.error('保存灌溉单元参数出错:', error);
    ElMessage.error('网络错误，请稍后重试');
  } finally {
    unitParamsSubmitLoading.value = false;
  }
}

// 加载差异性任务的灌溉单元参数
const loadTaskDiffList = async (taskId) => {
  // 避免重复加载
  if (loadingDiffListTaskIds.value.includes(taskId)) {
    return;
  }
  
  loadingDiffListTaskIds.value.push(taskId);
  
  try {
    console.log('加载差异性任务灌溉单元参数, 任务ID:', taskId);
    
    // 从后端获取数据
    const response = await axios.get(`${API_BASE_URL}/task/get/diffs`, {
      params: { taskId }
    });
    
    if (response.data && response.data.code === 200) {
      const diffList = response.data.value || [];
      console.log('获取到灌溉单元参数列表:', diffList);
      
      // 更新任务的diffList
      const taskIndex = taskList.value.findIndex(task => task.id === taskId);
      if (taskIndex !== -1) {
        taskList.value[taskIndex].diffList = diffList;
        taskList.value[taskIndex].diffListNeedsLoading = false;
      }
      
      // 如果当前任务正在展示详情，更新currentTask
      if (currentTask.value && currentTask.value.id === taskId) {
        currentTask.value.diffList = diffList;
      }
    } else {
      console.error('获取灌溉单元参数失败:', response.data);
    }
  } catch (error) {
    console.error('加载灌溉单元参数出错:', error);
  } finally {
    // 从加载列表中移除
    const index = loadingDiffListTaskIds.value.indexOf(taskId);
    if (index !== -1) {
      loadingDiffListTaskIds.value.splice(index, 1);
    }
  }
};

// 监听表格展开操作
const handleExpandChange = (row, expanded) => {
  if (expanded && row.type === 1) {
    // 无论是否需要加载，每次展开都重新获取最新数据
    loadTaskDiffList(row.id);
  }
};

// 计算差异性任务的参数总和
const calculateTotalForTask = (task, paramName) => {
  // 如果没有diffList或者diffList为空，返回0
  if (!task.diffList || task.diffList.length === 0) {
    return task.diffListNeedsLoading ? '-' : 0;
  }
  
  // 计算总和
  return task.diffList.reduce((sum, unit) => {
    return sum + (parseFloat(unit[paramName]) || 0);
  }, 0).toFixed(2);
};

// 编辑灌溉单元参数
const handleEditUnitParam = (task, unitParam) => {
  // 设置当前任务
  currentTask.value = task;
  
  // 加载该任务的灌溉单元列表
  loadTaskFieldUnits(task.id).then(() => {
    // 选择对应的灌溉单元
    selectedUnitId.value = unitParam.fieldUnitId;
    
    // 设置参数值
    currentUnitParams.fieldUnitId = unitParam.fieldUnitId;
    currentUnitParams.taskId = task.id;
    currentUnitParams.water = unitParam.water;
    currentUnitParams.fertilizerN = unitParam.fertilizerN;
    currentUnitParams.fertilizerP = unitParam.fertilizerP;
    currentUnitParams.fertilizerK = unitParam.fertilizerK;
    
    // 打开对话框
    unitParamsDialogVisible.value = true;
  });
};
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

.search-inputs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.type-filter {
  margin-bottom: 20px;
}

.filter-label {
  margin-right: 10px;
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

/* 选中的灌溉单元容器 */
.selected-units {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

/* 表单信息提示样式 */
.form-info-message {
  margin: 10px 0 20px;
}

:deep(.form-info-message .el-alert) {
  padding: 12px 15px;
}

:deep(.form-info-message .el-alert__description) {
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}

/* 任务信息样式 */
.task-info {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 12px 15px;
  margin-bottom: 20px;
  border-left: 4px solid #409EFF;
}

.task-info p {
  margin: 5px 0;
  font-size: 14px;
}

.task-info strong {
  font-weight: 600;
  color: #303133;
}

/* 单元参数表单样式 */
.unit-params-form {
  margin-top: 20px;
}

.unit-params {
  margin-top: 20px;
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 15px;
  border-left: 4px solid #67c23a;
}

.unit-params-title {
  font-size: 16px;
  margin: 0 0 15px 0;
  color: #303133;
  font-weight: 500;
}

/* 展开行样式 */
.expanded-diff-params {
  padding: 15px;
  background-color: #f9f9f9;
}

.expanded-diff-title {
  margin: 0 0 15px 0;
  font-size: 15px;
  color: #303133;
  font-weight: 500;
}

.no-diff-params {
  padding: 20px;
  text-align: center;
}

.not-diff-task {
  padding: 15px;
  text-align: center;
}

.info-message {
  padding: 10px;
  background-color: #f0f9eb;
  border-radius: 4px;
  color: #67c23a;
  font-size: 14px;
}

/* 加载中样式 */
.loading-diff-params {
  padding: 20px;
}

/* 操作按钮容器 */
.operation-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.operation-buttons .el-button {
  margin-left: 0 !important;
  margin-right: 0 !important;
}
</style> 