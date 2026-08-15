<template>
  <div class="algorithm-task-wrapper">
    <header class="page-header">
      <div>
        <span class="eyebrow">ALGORITHM TASKS</span>
        <h1>算法任务</h1>
        <p>创建并管理实时、抓拍与轮巡检测任务。</p>
      </div>
    </header>
<div id="algorithm-task">
    <!-- 表格模式 -->
    <BasicTable v-if="viewMode === 'table'" @register="registerTable">
      <template #toolbar>
        <div class="toolbar-buttons">
          <a-button v-auth="['algorithm:task:create']" type="primary" @click="handleCreateTask">
            <PlusOutlined />
            新建算法任务
          </a-button>
          <a-button @click="handleToggleViewMode" type="default">
            <template #icon>
              <SwapOutlined />
            </template>
            切换视图
          </a-button>
        </div>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'action'">
          <TableAction :actions="getTableActions(record)" />
        </template>
      </template>
    </BasicTable>

    <!-- 卡片模式 -->
    <div v-else class="algorithm-task-card-list-wrapper p-2">
      <div class="p-4" style="margin-bottom: 10px">
        <BasicForm @register="registerForm" @reset="handleSubmit"/>
      </div>
      <div class="p-2">
        <Spin :spinning="loading">
          <List
            :split="false"
            :grid="{ gutter: 15, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 3 }"
            :data-source="taskList"
            :pagination="paginationProp"
          >
            <template #header>
              <div class="list-header">
                <div class="list-header__actions">
                  <a-button v-auth="['algorithm:task:create']" type="primary" @click="handleCreateTask">
                    <PlusOutlined />
                    新建算法任务
                  </a-button>
                  <a-button @click="handleToggleViewMode" type="default">
                    <template #icon>
                      <SwapOutlined />
                    </template>
                    切换视图
                  </a-button>
                </div>
              </div>
            </template>
            <template #renderItem="{ item }">
              <ListItem class="task-card-item">
                <article class="task-capability-card">
                  <div class="card-top">
                    <span
                      class="card-type-badge"
                      :class="`card-type-badge--${item.task_type || 'realtime'}`"
                    >
                      {{ getTaskTypeShortLabel(item.task_type) }}
                    </span>
                    <div class="card-head">
                      <div class="card-title-row">
                        <h3 class="card-title" :title="item.task_name || item.id">
                          {{ item.task_name || item.id }}
                        </h3>
                        <i class="card-status" :class="{ enabled: item.is_enabled }">
                          {{ item.is_enabled ? '运行中' : '已停止' }}
                        </i>
                      </div>
                      <div class="task-meta">
                        <div
                          v-if="item.device_names && item.device_names.length > 0"
                          class="task-meta__line"
                        >
                          <span class="task-meta__label">关联摄像头</span>
                          <button
                            type="button"
                            class="task-meta__value"
                            @click.stop="handleCopyDeviceNames(item)"
                          >
                            <span>{{ getDeviceNamesDisplay(item) }}</span>
                            <Icon icon="tdesign:copy-filled" :size="13" />
                          </button>
                        </div>
                        <div class="task-meta__line">
                          <span class="task-meta__label">关联模型</span>
                          <span class="task-meta__text">{{ item.model_names || '--' }}</span>
                        </div>
                        <div class="task-meta__line">
                          <span class="task-meta__label">预计内存</span>
                          <span class="task-meta__text">
                            {{ Number(item.estimated_memory_mib || 0).toFixed(2) }} MiB
                          </span>
                        </div>
                        <div
                          v-if="item.algorithm_services && item.algorithm_services.length > 0 && !item.model_names"
                          class="task-meta__line"
                        >
                          <span class="task-meta__label">关联算法服务</span>
                          <span class="task-meta__text">
                            {{ item.algorithm_services.map(s => s.service_name).join(', ') }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="card-action-row">
                    <button
                      v-auth="[item.is_enabled ? 'algorithm:task:stop' : 'algorithm:task:start']"
                      type="button"
                      class="card-action-btn"
                      :title="item.is_enabled ? '停止' : '启动'"
                      @click="onCardToggleTask(item)"
                    >
                      <Icon
                        :icon="item.is_enabled ? 'ant-design:pause-circle-outlined' : 'ant-design:play-circle-outlined'"
                        :size="15"
                      />
                      <span>{{ item.is_enabled ? '停止' : '启动' }}</span>
                    </button>
                    <button
                      v-auth="['algorithm:task:view']"
                      type="button"
                      class="card-action-btn"
                      title="详情"
                      @click="onCardView(item)"
                    >
                      <Icon icon="ant-design:eye-outlined" :size="15" />
                      <span>详情</span>
                    </button>
                    <button
                      v-auth="['algorithm:task:update']"
                      type="button"
                      class="card-action-btn"
                      :class="{ 'card-action-btn--disabled': item.is_enabled }"
                      :title="item.is_enabled ? '任务运行中，无法编辑' : '编辑'"
                      @click="onCardEdit(item)"
                    >
                      <Icon icon="ant-design:edit-outlined" :size="15" />
                      <span>编辑</span>
                    </button>
                    <button
                      v-auth="['algorithm:task:heartbeat']"
                      type="button"
                      class="card-action-btn"
                      title="心跳"
                      @click="onCardHeartbeat(item)"
                    >
                      <Icon icon="ant-design:heart-outlined" :size="15" />
                      <span>心跳</span>
                    </button>
                    <Popconfirm
                      title="是否确认删除？"
                      ok-text="是"
                      cancel-text="否"
                      :disabled="item.is_enabled"
                      @confirm="onCardDelete(item)"
                    >
                      <button
                        v-auth="['algorithm:task:delete']"
                        type="button"
                        class="card-action-btn card-action-btn--danger"
                        :class="{ 'card-action-btn--disabled': item.is_enabled }"
                        :title="item.is_enabled ? '任务运行中，无法删除' : '删除'"
                      >
                        <Icon icon="material-symbols:delete-outline-rounded" :size="15" />
                        <span>删除</span>
                      </button>
                    </Popconfirm>
                  </div>
                </article>
              </ListItem>
            </template>
          </List>
        </Spin>
      </div>
    </div>

    <!-- 新建算法任务向导 -->
    <AlgorithmTaskCreateModal
      v-model:open="createVisible"
      :mock-task-id="editingMockId"
      :editing-task-id="editingTaskId"
      :initial-draft="editingDraft"
      :readonly="wizardReadonly"
      @success="handleSuccess"
    />

    <!-- 服务管理 -->
    <ServiceManageDrawer @register="registerServiceModal" @success="handleSuccess" />
    
    <!-- 区域检测配置 -->
    <DeviceRegionDetectionDrawer @register="registerRegionModal" />
    
    <!-- 抓拍空间 -->
    <SnapSpaceDrawer @register="registerSnapSpaceModal" />
    
    <!-- 视频播放模态框 -->
    <DialogPlayer @register="registerPlayerModal" />
    
    <!-- 摄像头选择模态框 -->
    <BasicModal
      v-model:open="cameraSelectVisible"
      title="选择摄像头"
      @ok="handleConfirmCamera"
      @cancel="cameraSelectVisible = false"
    >
      <div v-if="cameraStreams.length === 0" style="text-align: center; padding: 20px;">
        <Empty description="暂无可用推流地址" />
      </div>
      <RadioGroup v-else v-model:value="selectedCameraIndex" style="width: 100%;">
        <Radio
          v-for="(stream, index) in cameraStreams"
          :key="stream.device_id"
          :value="index"
          style="display: block; margin-bottom: 12px;"
        >
          <div style="display: flex; align-items: center; gap: 12px;">
            <!-- 封面图 -->
            <div v-if="stream.cover_image_path" style="width: 80px; height: 60px; flex-shrink: 0;">
              <img
                :src="stream.cover_image_path"
                alt="封面图"
                style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;"
              />
            </div>
            <div v-else style="width: 80px; height: 60px; flex-shrink: 0; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">
              无封面
            </div>
            <!-- 设备信息 -->
            <div style="flex: 1;">
              <div style="font-weight: 500;">{{ stream.device_name }}</div>
              <div style="font-size: 12px; color: #999; margin-top: 4px;">
                {{ stream.ai_http_stream || stream.pusher_http_url || stream.http_stream || stream.pusher_rtmp_url || stream.rtmp_stream || '无推流地址' }}
              </div>
            </div>
          </div>
        </Radio>
      </RadioGroup>
    </BasicModal>
  </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import {
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons-vue';
import { List, Popconfirm, Spin, Empty, RadioGroup, Radio, Modal } from 'ant-design-vue';
import { BasicModal, useModal } from '@/components/Modal';
import { BasicForm, useForm } from '@/components/Form';
import { BasicTable, TableAction, useTable } from '@/components/Table';
import { useMessage } from '@/hooks/web/useMessage';
import { usePermission } from '@/hooks/web/usePermission';
import { Icon } from '@/components/Icon';
import { copyText } from '@/utils/copyTextToClipboard';
import {
  deleteAlgorithmTask,
  startAlgorithmTask,
  stopAlgorithmTask,
  updateAlgorithmTask,
  listAlgorithmTasks,
  getTaskStreams,
  watchTaskStream,
  getAlgorithmTaskMemoryAdmission,
  type AlgorithmTask,
  type AlgorithmTaskMemoryAdmission,
  type CameraStreamInfo,
} from '@/api/device/algorithm_task';
import {
  deleteMockAlgorithmTask,
  fetchAlgorithmTaskListMerged,
  getMockDraftByTaskId,
  isMockAlgorithmTask,
  setMockTaskEnabled,
} from './utils/stores';
import {
  getWizardDraftByTaskId,
  getWizardSubmitPayloadByTaskId,
  removeWizardDraft,
} from './utils/stores';
import { enrichTaskWithMode } from './utils/stores';
import {
  buildDraftFromAlgorithmTask,
  buildDraftFromStoredPayload,
} from './components/AlgorithmTaskCreate/useDraft';
import type { AlgorithmTaskDraft } from './algorithmTaskDraft.types';
import AlgorithmTaskCreateModal from './components/AlgorithmTaskCreate/index.vue';
import ServiceManageDrawer from './components/ServiceManage/index.vue';
import DeviceRegionDetectionDrawer from './components/DeviceRegion/index.vue';
import SnapSpaceDrawer from './components/SnapSpaceDrawer/index.vue';
import DialogPlayer from '@/components/VideoPlayer/DialogPlayer.vue';
import { getBasicColumns, getFormConfig, normalizeIsEnabledFilter } from './Data';

const ListItem = List.Item;

defineOptions({ name: 'ALGORITHM_TASK' });

const { createMessage } = useMessage();
const { runWithPermission } = usePermission();

const onCardToggleTask = (item: AlgorithmTask) => {
  if (item.is_enabled)
    runWithPermission('algorithm:task:stop', () => handleStop(item));
  else
    runWithPermission('algorithm:task:start', () => handleStart(item));
};
const onCardEdit = (item: AlgorithmTask) => {
  if (item.is_enabled) {
    createMessage.warning('任务运行中，无法编辑，请先停止任务');
    return;
  }
  runWithPermission('algorithm:task:update', () => handleEdit(item));
};
const onCardHeartbeat = (item: AlgorithmTask) => runWithPermission('algorithm:task:heartbeat', () => handleManageServices(item));
const onCardDelete = (item: AlgorithmTask) => runWithPermission('algorithm:task:delete', () => handleDelete(item));
const onCardView = (item: AlgorithmTask) => runWithPermission('algorithm:task:view', () => handleView(item));

// 视图模式（默认表格）
const viewMode = ref<'table' | 'card'>('table');

// 卡片模式相关
const taskList = ref<AlgorithmTask[]>([]);
const loading = ref(false);
const [registerServiceModal, { openModal: openServiceModal }] = useModal();
const [registerRegionModal, { openModal: openRegionModal }] = useModal();
const [registerSnapSpaceModal, { openModal: openSnapSpaceModal }] = useModal();
const createVisible = ref(false);
const wizardReadonly = ref(false);
const editingMockId = ref<number | null>(null);
const editingTaskId = ref<number | null>(null);
const editingDraft = ref<AlgorithmTaskDraft | null>(null);
const [registerPlayerModal, { openModal: openPlayerModal }] = useModal();

// 摄像头选择和播放相关
const cameraSelectVisible = ref(false);
const cameraStreams = ref<CameraStreamInfo[]>([]);
const selectedCameraIndex = ref<number>(0);
const currentTask = ref<AlgorithmTask | null>(null);
let aiStreamWatchTimer: ReturnType<typeof window.setInterval> | null = null;

// 分页相关
const page = ref(1);
const pageSize = ref(8);
const total = ref(0);

// 搜索参数
const searchParams = ref<{
  search?: string;
  task_type?: 'realtime' | 'snap' | 'patrol';
  is_enabled?: boolean;
}>({});

// 表格模式配置
const [registerTable, { reload }] = useTable({
  canResize: false,
  resizeHeightOffset: 36,
  showIndexColumn: false,
  title: '',
  api: fetchAlgorithmTaskListMerged,
  beforeFetch: (params) => {
    return {
      pageNo: params.page,
      pageSize: params.pageSize,
      search: params.search || undefined,
      task_type: params.task_type || undefined,
      is_enabled: normalizeIsEnabledFilter(params.is_enabled),
    };
  },
  columns: getBasicColumns(),
  useSearchForm: true,
  pagination: true,
  formConfig: getFormConfig(),
  fetchSetting: {
    listField: 'data',
    totalField: 'total',
  },
  rowKey: 'id',
  actionColumn: {
    width: 280,
    title: '操作',
    dataIndex: 'action',
    align: 'center',
    fixed: 'right',
  },
});

// 检查任务是否有摄像头列表
const hasCameras = (record: AlgorithmTask) => {
  return (record.device_ids && record.device_ids.length > 0) || 
         (record.device_names && record.device_names.length > 0);
};

// 检查任务是否有算法模型列表
const hasModels = (record: AlgorithmTask) => {
  return record.model_ids && Array.isArray(record.model_ids) && record.model_ids.length > 0;
};

// 复制摄像头名称
const handleCopyDeviceNames = (item: AlgorithmTask) => {
  if (!item.device_names || item.device_names.length === 0) {
    createMessage.warning('无摄像头名称可复制');
    return;
  }
  const deviceNamesText = item.device_names.join(', ');
  copyText(deviceNamesText, '摄像头名称已复制到剪贴板');
};

import type { ActionItem } from '@/components/Table';

// 获取表格操作按钮（启动 / 查看 / 编辑 / 心跳 / 删除）
const getTableActions = (record: AlgorithmTask): ActionItem[] => {
  const actions: ActionItem[] = [];

  if (record.is_enabled) {
    actions.push({
      label: '停止',
      auth: 'algorithm:task:stop',
      onClick: () => handleStop(record),
    });
  }
  else {
    actions.push({
      label: '启动',
      auth: 'algorithm:task:start',
      onClick: () => handleStart(record),
    });
  }

  actions.push({
    label: '详情',
    auth: 'algorithm:task:view',
    onClick: () => handleView(record),
  });

  actions.push({
    label: '编辑',
    auth: 'algorithm:task:update',
    disabled: record.is_enabled,
    onClick: () => {
      if (record.is_enabled) {
        createMessage.warning('任务运行中，无法编辑，请先停止任务');
        return;
      }
      handleEdit(record);
    },
  });

  actions.push({
    label: '心跳',
    auth: 'algorithm:task:heartbeat',
    onClick: () => handleManageServices(record),
  });

  actions.push({
    label: '删除',
    auth: 'algorithm:task:delete',
    disabled: record.is_enabled,
    popConfirm: {
      title: '确定删除此算法任务？',
      confirm: () => handleDelete(record),
    },
  });

  return actions;
};

// 切换视图模式
const handleToggleViewMode = () => {
  viewMode.value = viewMode.value === 'table' ? 'card' : 'table';
  if (viewMode.value === 'card') {
    loadTasks();
  }
};

// 卡片模式加载任务
const loadTasks = async () => {
  loading.value = true;
  try {
    // 转换搜索参数中的布尔值为整数
    const params: any = {
      pageNo: page.value,
      pageSize: pageSize.value,
      ...searchParams.value
    };
    params.is_enabled = normalizeIsEnabledFilter(params.is_enabled);
    const response = await fetchAlgorithmTaskListMerged(params);
    if (response.code === 0) {
      taskList.value = response.data || [];
      total.value = response.total || 0;
    } else {
      createMessage.error(response.msg || '加载算法任务列表失败');
      taskList.value = [];
      total.value = 0;
    }
  } catch (error) {
    console.error('加载算法任务列表失败', error);
    createMessage.error('加载算法任务列表失败');
    taskList.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

// 分页变化
const handlePageChange = (p: number, pz: number) => {
  page.value = p;
  pageSize.value = pz;
  loadTasks();
};

const handlePageSizeChange = (_current: number, size: number) => {
  pageSize.value = size;
  page.value = 1;
  loadTasks();
};

// 分页配置
const paginationProp = ref({
  showSizeChanger: false,
  showQuickJumper: true,
  pageSize,
  current: page,
  total,
  showTotal: (total: number) => `总 ${total} 条`,
  onChange: handlePageChange,
  onShowSizeChange: handlePageSizeChange,
});

// 根据任务类型获取图片
function getTaskTypeShortLabel(taskType?: string) {
  const map: Record<string, string> = {
    realtime: '实时',
    snap: '抓拍',
    patrol: '轮巡',
  };
  return map[taskType ?? ''] ?? '未知';
}

function getDeviceNamesDisplay(item: AlgorithmTask) {
  if (!item.device_names || item.device_names.length === 0)
    return '-';
  if (item.device_names.length > 1)
    return `${item.device_names[0]}...`;
  return item.device_names[0];
}

// 表单提交
async function handleSubmit() {
  const params = await validate();
  searchParams.value = params || {};
  page.value = 1;
  if (viewMode.value === 'card') {
    await loadTasks();
  } else {
    reload();
  }
}

const [registerForm, { validate }] = useForm({
  schemas: [
    {
      field: 'search',
      label: '任务名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入任务名称',
      },
    },
    {
      field: 'task_type',
      label: '任务类型',
      component: 'Select',
      componentProps: {
        placeholder: '请选择任务类型',
        options: [
          { value: '', label: '全部' },
          { value: 'realtime', label: '实时算法任务' },
          { value: 'snap', label: '抓拍算法任务' },
          { value: 'patrol', label: '轮巡算法任务' },
        ],
      },
    },
    {
      field: 'is_enabled',
      label: '运行状态',
      component: 'Select',
      componentProps: {
        placeholder: '请选择运行状态',
        options: [
          { value: '', label: '全部' },
          { value: 1, label: '运行中' },
          { value: 0, label: '已停止' },
        ],
      },
    },
  ],
  labelWidth: 80,
  baseColProps: { span: 4 },
  actionColOptions: {
    span: 12,
    style: { textAlign: 'right' },
  },
  autoSubmitOnEnter: true,
  submitFunc: handleSubmit,
});

function handleCreateTask() {
  wizardReadonly.value = false;
  editingMockId.value = null;
  editingTaskId.value = null;
  editingDraft.value = null;
  createVisible.value = true;
}

function openWizardEditor(record: AlgorithmTask, draft: AlgorithmTaskDraft) {
  wizardReadonly.value = false;
  editingMockId.value = null;
  editingTaskId.value = record.id;
  editingDraft.value = draft;
  createVisible.value = true;
}

function openWizardViewer(record: AlgorithmTask, draft: AlgorithmTaskDraft) {
  wizardReadonly.value = true;
  editingMockId.value = isMockAlgorithmTask(record.id) ? record.id : null;
  editingTaskId.value = isMockAlgorithmTask(record.id) ? null : record.id;
  editingDraft.value = draft;
  createVisible.value = true;
}

const handleView = (record: AlgorithmTask) => {
  const enriched = enrichTaskWithMode(record);

  if (isMockAlgorithmTask(record.id)) {
    const draft = getMockDraftByTaskId(record.id);
    if (!draft) {
      createMessage.error('未找到 mock 任务配置');
      return;
    }
    openWizardViewer(enriched, draft);
    return;
  }

  const storedDraft = getWizardDraftByTaskId(record.id);
  const storedPayload = getWizardSubmitPayloadByTaskId(record.id);
  const draft = storedDraft
    ?? buildDraftFromStoredPayload(storedPayload)
    ?? buildDraftFromAlgorithmTask(enriched);
  openWizardViewer(enriched, draft);
};

const handleEdit = (record: AlgorithmTask) => {
  if (record.is_enabled) {
    createMessage.warning('任务运行中，无法编辑，请先停止任务');
    return;
  }
  wizardReadonly.value = false;
  const enriched = enrichTaskWithMode(record);

  if (isMockAlgorithmTask(record.id)) {
    const draft = getMockDraftByTaskId(record.id);
    if (!draft) {
      createMessage.error('未找到 mock 任务配置');
      return;
    }
    editingMockId.value = record.id;
    editingTaskId.value = null;
    editingDraft.value = draft;
    createVisible.value = true;
    return;
  }

  const storedDraft = getWizardDraftByTaskId(record.id);
  const storedPayload = getWizardSubmitPayloadByTaskId(record.id);
  const draft = storedDraft
    ?? buildDraftFromStoredPayload(storedPayload)
    ?? buildDraftFromAlgorithmTask(enriched);
  openWizardEditor(enriched, draft);
};

const handleManageServices = (record: AlgorithmTask) => {
  openServiceModal(true, { taskId: record.id });
};

const handleOpenRegionDetection = (record?: AlgorithmTask) => {
  // 校验：只有在停用状态下才能配置区域检测
  if (record && record.is_enabled) {
    createMessage.warning('任务运行中，无法配置，请先停止任务');
    return;
  }
  if (record) {
    // 传入任务ID，只显示该任务关联的摄像头
    openRegionModal(true, { taskId: record.id });
  } else {
    // 兼容旧逻辑：不传入任务ID，显示所有摄像头
    openRegionModal(true);
  }
};

const handleOpenSnapSpace = (record: AlgorithmTask) => {
  if (!record.device_ids || record.device_ids.length === 0) {
    createMessage.warning('任务未关联摄像头');
    return;
  }
  openSnapSpaceModal(true, { 
    taskId: record.id,
    deviceIds: record.device_ids,
    deviceNames: record.device_names || []
  });
};

const handleDelete = async (record: AlgorithmTask) => {
  if (record.is_enabled) {
    createMessage.warning('任务运行中，无法删除，请先停止任务');
    return;
  }
  if (isMockAlgorithmTask(record.id)) {
    if (deleteMockAlgorithmTask(record.id)) {
      createMessage.success('删除成功');
      handleSuccess();
    }
    else {
      createMessage.error('删除失败');
    }
    return;
  }
  try {
    const response = await deleteAlgorithmTask(record.id);
    if (response.code === 0) {
      removeWizardDraft(record.id);
      createMessage.success('删除成功');
      handleSuccess();
    } else {
      createMessage.error(response.msg || '删除失败');
    }
  } catch (error) {
    console.error('删除算法任务失败', error);
    createMessage.error('删除失败');
  }
};

const handleStart = async (record: AlgorithmTask) => {
  if (isMockAlgorithmTask(record.id)) {
    if (setMockTaskEnabled(record.id, true)) {
      createMessage.success('启动成功（前端 mock）');
      handleSuccess();
    }
    return;
  }
  try {
    const admissionResponse = await getAlgorithmTaskMemoryAdmission(record.id);
    const admission = ((admissionResponse as any)?.data?.task_id
      ? (admissionResponse as any).data
      : admissionResponse) as AlgorithmTaskMemoryAdmission;
    if (admission.blocked) {
      createMessage.error(admission.message || '当前系统可分配内存严重不足，已禁止启用该算法任务。');
      return;
    }
    if (Number(record.estimated_memory_mib || 0) === 0 && !(await confirmMultipleAlgorithmWarning(record.id))) return;
    if (admission.warning && !(await confirmMemoryAdmission(admission))) return;
    const response = await startAlgorithmTask(record.id, admission.warning);
    // 由于 isTransformResponse: true，成功时返回的是任务对象（data.data），而不是包含 code 的响应对象
    if (response && (response as any).id) {
      // 检查是否有 already_running 字段
      if ((response as any).already_running) {
        createMessage.warning('任务运行中');
      } else {
        createMessage.success('启动成功');
      }
      handleSuccess();
    } else if (response && typeof response === 'object' && 'code' in response) {
      // 如果返回的是完整响应对象（包含 code）
      if ((response as any).code === 0) {
        const data = (response as any).data || response;
        if (data && data.already_running) {
          createMessage.warning('任务运行中');
        } else {
          createMessage.success('启动成功');
        }
        handleSuccess();
      } else {
        createMessage.error((response as any).msg || '启动失败');
      }
    } else {
      createMessage.error('启动失败');
    }
  } catch (error) {
    console.error('启动算法任务失败', error);
    const body = (error as any)?.response?.data;
    const decision = body?.data as AlgorithmTaskMemoryAdmission | undefined;
    if (decision?.warning && !decision.blocked) {
      if (await confirmMemoryAdmission(decision)) {
        try {
          await startAlgorithmTask(record.id, true);
          createMessage.success('启动成功');
          handleSuccess();
          return;
        } catch (retryError) {
          createMessage.error((retryError as any)?.response?.data?.msg || '启动失败');
          return;
        }
      }
      return;
    }
    createMessage.error(body?.msg || '启动失败');
  }
};

const handleStop = async (record: AlgorithmTask) => {
  if (isMockAlgorithmTask(record.id)) {
    if (setMockTaskEnabled(record.id, false)) {
      createMessage.success('已停止（前端 mock）');
      handleSuccess();
    }
    return;
  }
  try {
    const response = await stopAlgorithmTask(record.id);
    // 由于 isTransformResponse: true，成功时返回的是任务对象，而不是包含 code 的响应对象
    if (response && (response as any).id) {
      createMessage.success('停止成功');
      handleSuccess();
    } else if (response && typeof response === 'object' && 'code' in response) {
      // 如果返回的是完整响应对象（包含 code）
      if ((response as any).code === 0) {
        createMessage.success('停止成功');
        handleSuccess();
      } else {
        createMessage.error((response as any).msg || '停止失败');
      }
    } else {
      createMessage.error('停止失败');
    }
  } catch (error) {
    console.error('停止算法任务失败', error);
    createMessage.error('停止失败');
  }
};

const handleToggleEnabled = async (record: AlgorithmTask) => {
  try {
    // 将布尔值转换为整数：true -> 1, false -> 0
    const newValue = record.is_enabled ? 0 : 1;
    if (newValue && !(await confirmMultipleAlgorithmWarning(record.id))) return;
    const response = await updateAlgorithmTask(record.id, {
      is_enabled: newValue,
    });
    if (response.code === 0) {
      createMessage.success('更新成功');
      handleSuccess();
    } else {
      createMessage.error(response.msg || '更新失败');
    }
  } catch (error) {
    console.error('更新算法任务状态失败', error);
    createMessage.error('更新失败');
  }
};

const confirmMultipleAlgorithmWarning = async (startingTaskId: number): Promise<boolean> => {
  try {
    const response = await listAlgorithmTasks({ pageNo: 1, pageSize: 1000, is_enabled: true });
    const enabledTasks = (response as any)?.data ?? [];
    if (!enabledTasks.some((task: AlgorithmTask) => task.id !== startingTaskId)) return true;
  } catch {
    // The backend remains authoritative; do not block an operator because the
    // advisory count request is temporarily unavailable.
    return true;
  }
  return await new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '多算法任务风险提示',
      content: '本测试服务器难以稳定承载两个及以上算法任务同时运行，继续操作可能造成内存耗尽并影响主服务。',
      okText: '仍要继续',
      cancelText: '取消',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
};

const confirmMemoryAdmission = (admission: AlgorithmTaskMemoryAdmission): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '内存不足警告',
      content: admission.message || '当前系统内存不足，继续启动该算法任务可能导致内存占用超出可用阈值!',
      okText: '继续启用',
      cancelText: '放弃',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
};

const handleSuccess = () => {
  editingMockId.value = null;
  editingTaskId.value = null;
  editingDraft.value = null;
  if (viewMode.value === 'table') {
    reload();
  } else {
    loadTasks();
  }
};

// 播放推流
const handlePlayStream = async (record: AlgorithmTask) => {
  if (!record.is_enabled) {
    createMessage.warning('任务未运行，无法播放推流');
    return;
  }
  
  try {
    // 获取推流地址列表
    // 注意：由于 isTransformResponse: true，响应转换器会直接返回 data.data
    // 所以 response 可能是数组，也可能是包含 code 的完整响应对象
    const response = await getTaskStreams(record.id);
    console.log('获取推流地址响应:', response);
    
    // 处理响应：可能是数组，也可能是包含 code 的对象
    let streams: CameraStreamInfo[] = [];
    if (Array.isArray(response)) {
      // 直接是数组
      streams = response;
      console.log('响应是数组，摄像头数量:', streams.length);
    } else if (response && typeof response === 'object' && 'code' in response) {
      // 完整响应对象
      if (response.code === 0 && response.data && Array.isArray(response.data)) {
        streams = response.data;
        console.log('响应是对象，摄像头数量:', streams.length);
      } else {
        console.warn('响应code不为0或data不是数组:', response);
        createMessage.warning(response.msg || '该任务未关联摄像头或暂无推流地址');
        return;
      }
    } else {
      console.warn('响应格式不正确:', response);
      createMessage.warning('该任务未关联摄像头或暂无推流地址');
      return;
    }
    
    if (streams.length === 0) {
      createMessage.warning('该任务未关联摄像头或暂无推流地址');
      return;
    }
    
    cameraStreams.value = streams;
    currentTask.value = record;
    
    // 过滤出有推流地址的摄像头（优先检查AI HTTP流地址）
    const availableStreams = cameraStreams.value.filter(s => 
      s.ai_http_stream || s.pusher_rtmp_url || s.rtmp_stream || s.pusher_http_url || s.http_stream
    );
    
    if (availableStreams.length === 0) {
      createMessage.warning('该任务关联的摄像头暂无推流地址');
      return;
    }
    
    // 如果只有一个摄像头，直接播放
    if (availableStreams.length === 1) {
      playCameraStream(availableStreams[0]);
    } else {
      // 多个摄像头，显示选择对话框
      cameraStreams.value = availableStreams;
      selectedCameraIndex.value = 0;
      cameraSelectVisible.value = true;
    }
  } catch (error) {
    console.error('获取推流地址失败', error);
    createMessage.error('获取推流地址失败');
  }
};

// 确认选择摄像头并播放
const handleConfirmCamera = () => {
  if (cameraStreams.value.length > 0 && selectedCameraIndex.value >= 0) {
    const selectedStream = cameraStreams.value[selectedCameraIndex.value];
    playCameraStream(selectedStream);
    cameraSelectVisible.value = false;
  }
};

// 将RTMP地址转换为HTTP FLV地址
const convertRtmpToHttp = (rtmpUrl: string): string | null => {
  if (!rtmpUrl || !rtmpUrl.startsWith('rtmp://')) {
    return null;
  }
  
  try {
    // 解析RTMP地址：rtmp://server:port/path
    const url = new URL(rtmpUrl);
    const server = url.hostname;
    const port = url.port || '1935';
    let path = url.pathname.substring(1); // 去掉开头的 /
    
    // 如果路径为空，使用默认路径
    if (!path) {
      path = 'live';
    }
    
    // 添加.flv后缀（如果还没有）
    if (!path.endsWith('.flv')) {
      path = `${path}.flv`;
    }
    
    // 生成HTTP FLV地址（默认使用8080端口）
    return `http://${server}:8080/${path}`;
  } catch (error) {
    console.error('RTMP地址转换失败:', error);
    return null;
  }
};

const stopAiStreamWatch = () => {
  if (aiStreamWatchTimer) {
    window.clearInterval(aiStreamWatchTimer);
    aiStreamWatchTimer = null;
  }
};

const renewAiStreamWatch = async (stream: CameraStreamInfo) => {
  if (!currentTask.value || !stream.ai_http_stream)
    return;
  await watchTaskStream(currentTask.value.id, stream.device_id, stream.ai_stream_watch_ttl || 30);
};

const startAiStreamWatch = async (stream: CameraStreamInfo) => {
  stopAiStreamWatch();
  if (!stream.ai_http_stream || !currentTask.value)
    return;
  await renewAiStreamWatch(stream);
  aiStreamWatchTimer = window.setInterval(() => {
    renewAiStreamWatch(stream).catch((error) => {
      console.warn('AI输出流续租失败:', error);
    });
  }, 10000);
};

// 播放摄像头推流
const playCameraStream = async (stream: CameraStreamInfo) => {
  // 优先使用AI HTTP流地址
  // 其次使用推送器的HTTP地址
  // 再次使用推送器的RTMP地址，转换为HTTP地址
  // 然后使用摄像头的HTTP地址
  // 最后使用摄像头的RTMP地址，转换为HTTP地址
  let httpStream: string | null = null;
  
  // 1. 优先使用AI HTTP流地址
  if (stream.ai_http_stream) {
    httpStream = stream.ai_http_stream;
    try {
      await startAiStreamWatch(stream);
    } catch (error) {
      console.warn('AI输出流启动续租失败:', error);
    }
  }
  
  // 2. 如果没有，使用推送器的HTTP地址
  if (!httpStream && stream.pusher_http_url) {
    httpStream = stream.pusher_http_url;
  }
  
  // 3. 如果还没有，使用推送器的RTMP地址，转换为HTTP地址
  if (!httpStream && stream.pusher_rtmp_url) {
    httpStream = convertRtmpToHttp(stream.pusher_rtmp_url);
  }
  
  // 4. 如果还没有，使用摄像头的HTTP地址
  if (!httpStream && stream.http_stream) {
    httpStream = stream.http_stream;
  }
  
  // 5. 最后使用摄像头的RTMP地址，转换为HTTP地址
  if (!httpStream && stream.rtmp_stream) {
    httpStream = convertRtmpToHttp(stream.rtmp_stream);
  }
  
  if (!httpStream) {
    createMessage.warning(`摄像头 ${stream.device_name} 暂无推流地址`);
    return;
  }
  if (httpStream !== stream.ai_http_stream) {
    stopAiStreamWatch();
  }
  
  // 打开播放器
  openPlayerModal(true, {
    id: stream.device_id,
    http_stream: httpStream,
    onClose: stopAiStreamWatch,
  });
};


onMounted(() => {
  if (viewMode.value === 'card') {
    loadTasks();
  }
});

onUnmounted(() => {
  stopAiStreamWatch();
});
</script>

<style scoped lang="less">
#algorithm-task {
  height: 100%;
  overflow: hidden;

  .toolbar-buttons {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.algorithm-task-card-list-wrapper {
  height: 100%;
  overflow: auto;
  box-sizing: border-box;

  :deep(.ant-form) {
    background: transparent;
  }

  :deep(.ant-input),
  :deep(.ant-input-affix-wrapper),
  :deep(.ant-select-selector),
  :deep(.ant-picker) {
    background-color: #fff !important;
  }

  @card-brand: #2457a7;
  @card-border: #e1e7f0;
  @card-muted: #778397;

  :deep(.ant-list-header) {
    padding-top: 0;
    padding-bottom: 12px;
    background: transparent;
    border-block-end: 0;
  }

  :deep(.ant-list) {
    padding: 0;
    background: transparent;
  }

  :deep(.ant-list-grid .ant-row) {
    row-gap: 15px;
  }

  :deep(.task-card-item) {
    margin: 0;
    padding: 0;
    border-block-end: none !important;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;

    &__title {
      padding-left: 4px;
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
      color: rgb(0 0 0 / 88%);
    }

    &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }

  .task-capability-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    min-height: 0;
    padding: 19px;
    background: #fff;
    border: 1px solid @card-border;
    border-radius: 15px;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;

    &:hover {
      border-color: #cfd8e6;
      box-shadow: 0 6px 18px rgb(36 87 167 / 6%);
    }
  }

  .card-top {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-width: 0;
  }

  .card-type-badge {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    color: @card-brand;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    background: rgb(36 87 167 / 7%);

    &--snap {
      color: #14845c;
      background: rgb(20 132 92 / 8%);
    }

    &--patrol {
      color: #6b4fbb;
      background: rgb(107 79 187 / 8%);
    }
  }

  .card-head {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .card-title {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.35;
    color: #26354e;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-status {
    flex-shrink: 0;
    padding: 3px 7px;
    border-radius: 5px;
    background: #f1f3f7;
    color: #7e899a;
    font-size: 10px;
    font-style: normal;
    line-height: 1.4;

    &.enabled {
      background: #e9f7f0;
      color: #14845c;
    }

    &:not(.enabled) {
      background: #fdeeee;
      color: #c94b55;
    }
  }

  .task-meta {
    display: grid;
    gap: 8px;
  }

  .task-meta__line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }

  .task-meta__label {
    flex-shrink: 0;
    color: @card-muted;
    font-size: 12px;
    line-height: 1.5;
  }

  .task-meta__text {
    min-width: 0;
    overflow: hidden;
    color: #435169;
    font-size: 12px;
    line-height: 1.5;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-meta__value {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 0;
    color: #435169;
    font-size: 12px;
    line-height: 1.5;
    text-align: left;
    cursor: pointer;
    background: none;
    border: 0;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :deep(.app-iconify) {
      flex-shrink: 0;
      color: @card-brand;
    }

    &:hover {
      color: @card-brand;
    }
  }

  .card-action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: center;
    justify-content: flex-end;
    padding-top: 12px;
    margin-top: 4px;
    border-top: 1px solid #edf0f5;
  }

  .card-action-btn {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    padding: 0;
    color: @card-brand;
    font-size: 12px;
    line-height: 1;
    cursor: pointer;
    background: none;
    border: 0;

    &:hover:not(.card-action-btn--disabled) {
      opacity: 0.82;
    }

    &--danger {
      color: @card-brand;
    }

    &--disabled {
      color: rgba(0, 0, 0, 0.25);
      cursor: not-allowed;
      opacity: 1;
    }
  }

  :deep(.ant-popconfirm) {
    display: inline-flex;
  }
}
</style>

<style lang="less" scoped>
.algorithm-task-wrapper {
  height: 100vh;
  padding: 28px 24px 24px;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  .page-header {
    flex-shrink: 0;
    margin-bottom: 22px;
  }

  .eyebrow {
    color: #2457a7;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
  }

  .page-header h1 {
    margin: 7px 0 6px;
    color: #17233d;
    font-size: 28px;
    line-height: 1.2;
  }

  .page-header p {
    margin: 0;
    color: #7d889a;
    font-size: 14px;
  }

  #algorithm-task {
    flex: 1;
    min-height: 0;
  }
}
</style>
