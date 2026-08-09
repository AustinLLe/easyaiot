<template>
  <BasicModal
    v-model:open="open"
    :title="modalTitle"
    :width="1200"
    :centered="true"
    :canFullscreen="true"
    :defaultFullscreen="false"
    :showOkBtn="false"
    :showCancelBtn="false"
    :useWrapper="false"
    :destroyOnClose="false"
    :closeFunc="confirmUnsavedExit"
  >
    <div class="algorithm-task-create-modal">
      <div class="create-body">
        <aside class="create-nav">
          <div class="nav-title">配置步骤</div>
          <div
            v-for="(item, index) in sectionList"
            :key="item.key"
            :class="getStepClass(item.key, index)"
            @click="handleStepClick(item.key)"
          >
            <span class="step-icon">
              <component :is="item.icon" />
            </span>
            <span class="step-label">{{ item.label }}</span>
          </div>
        </aside>

        <section class="create-content">
          <component
            :is="currentSectionComponent"
            v-if="currentSectionComponent"
            :key="activeSection"
            v-model:payload="taskPayload"
          />
        </section>
      </div>

      <div class="create-footer">
        <a-button type="link" size="small" @click="handleCancel">{{ readonly ? '关闭' : '取消' }}</a-button>
        <div class="footer-actions">
          <a-button v-if="!isFirstSection" size="small" @click="handlePrev">上一步</a-button>
          <a-button v-if="!isLastSection" size="small" type="primary" @click="handleNext">下一步</a-button>
          <a-button
            v-else-if="!readonly"
            size="small"
            type="primary"
            :loading="submitting"
            @click="handleSave"
          >
            保存
          </a-button>
        </div>
      </div>
    </div>
  </BasicModal>
</template>

<script lang="ts" setup>
import { computed, ref, watch, type Component } from 'vue';
import {
  AlertOutlined,
  BorderOutlined,
  ExperimentOutlined,
  InfoCircleOutlined,
  NotificationOutlined,
  SyncOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import { BasicModal } from '@/components/Modal';
import { useMessage } from '@/hooks/web/useMessage';
import type { AlgorithmTaskDraft, AlgorithmTaskSectionKey } from '../../algorithmTaskDraft.types';
import {
  buildApiPayloadFromDraft,
  buildSubmitPayloadFromDraft,
  createDefaultDraft,
  syncLegacyIdsFromDraft,
  validateSectionDraft,
} from './useDraft';
import {
  createAlgorithmTask,
  updateAlgorithmTask,
  type AlgorithmTask,
} from '@/api/device/algorithm_task';
import {
  isMockAlgorithmTask,
  updateMockAlgorithmTask,
} from '../../utils/stores';
import { saveWizardDraft } from '../../utils/stores';
import { setTaskMode } from '../../utils/stores';
import BasicInfoSection from './sections/BasicInfoSection.vue';
import CameraAlgorithmSection from './sections/CameraAlgorithmSection.vue';
import PatrolSection from './sections/PatrolSection.vue';
import ModelDetectionSection from './sections/ModelDetectionSection.vue';
import RegionSection from './sections/RegionSection.vue';
import AlertRuleSection from './sections/AlertRuleSection.vue';
import AlertPushSection from './sections/AlertPushSection.vue';
import { confirmUnsavedAlgorithmTaskExit } from '../../utils/taskUtils';
import { provideAlgorithmTaskReadonly } from './useAlgorithmTaskReadonly';

defineOptions({ name: 'AlgorithmTaskCreateModal' });

const props = defineProps<{
  mockTaskId?: number | null;
  editingTaskId?: number | null;
  initialDraft?: AlgorithmTaskDraft | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  success: [];
}>();

const open = defineModel<boolean>('open', { default: false });

provideAlgorithmTaskReadonly(computed(() => !!props.readonly));

const { createMessage, createWarningModal } = useMessage();
const submitting = ref(false);

const taskPayload = ref<AlgorithmTaskDraft>(createDefaultDraft());
const activeSection = ref<AlgorithmTaskSectionKey>('basic');

const baseSectionList: Array<{
  key: AlgorithmTaskSectionKey;
  label: string;
  icon: Component;
  component: Component;
  patrolOnly?: boolean;
}> = [
  { key: 'basic', label: '基础信息', icon: InfoCircleOutlined, component: BasicInfoSection },
  { key: 'camera', label: '摄像头与算法', icon: VideoCameraOutlined, component: CameraAlgorithmSection },
  { key: 'patrol', label: '轮巡配置', icon: SyncOutlined, component: PatrolSection, patrolOnly: true },
  { key: 'model', label: '算法阈值', icon: ExperimentOutlined, component: ModelDetectionSection },
  { key: 'region', label: '区域选择', icon: BorderOutlined, component: RegionSection },
  { key: 'alert', label: '告警规则', icon: AlertOutlined, component: AlertRuleSection },
  { key: 'alert_push', label: '告警推送', icon: NotificationOutlined, component: AlertPushSection },
];

const sectionList = computed(() => {
  if (taskPayload.value.task_type === 'patrol')
    return baseSectionList;
  return baseSectionList.filter(item => !item.patrolOnly);
});

const sectionIndex = computed(() =>
  sectionList.value.findIndex(item => item.key === activeSection.value),
);

const isFirstSection = computed(() => sectionIndex.value <= 0);
const isLastSection = computed(() => sectionIndex.value >= sectionList.value.length - 1);

const currentSectionComponent = computed(() => sectionList.value[sectionIndex.value]?.component);

const isEditingMock = computed(() =>
  props.mockTaskId != null && isMockAlgorithmTask(props.mockTaskId),
);

const isEditingApiTask = computed(() =>
  props.editingTaskId != null && !isMockAlgorithmTask(props.editingTaskId),
);

const modalTitle = computed(() => {
  if (props.readonly)
    return '任务详情';
  if (isEditingMock.value || isEditingApiTask.value)
    return '编辑算法任务';
  return '创建算法任务';
});

function resetPayload() {
  taskPayload.value = createDefaultDraft();
  activeSection.value = 'basic';
}

function normalizeInitialDraft(draft: AlgorithmTaskDraft): AlgorithmTaskDraft {
  const defaults = createDefaultDraft();
  const next = {
    ...defaults,
    ...draft,
    detection_config: {
      ...defaults.detection_config,
      ...(draft.detection_config ?? {}),
    },
    camera_bindings: Array.isArray(draft.camera_bindings) ? draft.camera_bindings : [],
    device_ids: Array.isArray(draft.device_ids) ? draft.device_ids : [],
    model_ids: Array.isArray(draft.model_ids) ? draft.model_ids : [],
    combo_param_configs: draft.combo_param_configs ?? {},
    model_param_configs: draft.model_param_configs ?? {},
    model_name_map: draft.model_name_map ?? {},
    combo_region_configs: draft.combo_region_configs ?? {},
    model_region_configs: draft.model_region_configs ?? {},
    regions: Array.isArray(draft.regions) ? draft.regions : [],
    alert_rules: Array.isArray(draft.alert_rules) ? draft.alert_rules : [],
    alert_push_configs: Array.isArray(draft.alert_push_configs) ? draft.alert_push_configs : [],
    patrol_config: draft.patrol_config ?? undefined,
  } as AlgorithmTaskDraft;
  next.analysis_mode = next.task_type === 'realtime' && next.analysis_mode === 'dynamic'
    ? 'dynamic'
    : 'static';
  syncLegacyIdsFromDraft(next);
  return next;
}

function validateSection(section: AlgorithmTaskSectionKey) {
  return validateSectionDraft(section, taskPayload.value);
}

function getStepClass(key: AlgorithmTaskSectionKey, index: number) {
  return {
    'step-item': true,
    active: activeSection.value === key,
    pending: index > sectionIndex.value,
  };
}

function handleStepClick(targetKey: AlgorithmTaskSectionKey) {
  if (targetKey === activeSection.value)
    return;
  handleNavClick({ key: targetKey });
}

watch(open, (visible) => {
  if (visible) {
    if (props.initialDraft) {
      const draft = JSON.parse(JSON.stringify(props.initialDraft)) as AlgorithmTaskDraft;
      taskPayload.value = normalizeInitialDraft(draft);
    }
    else {
      resetPayload();
    }
    activeSection.value = 'basic';
    submitting.value = false;
  }
});

watch(
  () => taskPayload.value.task_type,
  (type) => {
    if (type !== 'patrol' && activeSection.value === 'patrol')
      activeSection.value = 'camera';
  },
);

function showValidationError(error: string) {
  createWarningModal({ title: '提示', content: error });
}

function handleNavClick({ key }: { key: string | number }) {
  const targetKey = String(key) as AlgorithmTaskSectionKey;
  const targetIndex = sectionList.value.findIndex(item => item.key === targetKey);
  if (targetIndex < 0)
    return;
  if (props.readonly) {
    activeSection.value = targetKey;
    return;
  }
  const currentIndex = sectionIndex.value;

  if (targetIndex > currentIndex) {
    for (let i = currentIndex; i < targetIndex; i++) {
      const error = validateSection(sectionList.value[i].key);
      if (error) {
        showValidationError(error);
        return;
      }
    }
  }
  else {
    const currentError = validateSection(activeSection.value);
    if (currentError) {
      showValidationError(currentError);
      return;
    }
  }

  activeSection.value = targetKey;
}

function handlePrev() {
  if (isFirstSection.value)
    return;
  activeSection.value = sectionList.value[sectionIndex.value - 1].key;
}

function handleNext() {
  if (!props.readonly) {
    const error = validateSection(activeSection.value);
    if (error) {
      showValidationError(error);
      return;
    }
  }
  if (!isLastSection.value)
    activeSection.value = sectionList.value[sectionIndex.value + 1].key;
}

function validateRequiredSections() {
  const requiredSections: AlgorithmTaskSectionKey[] = ['basic', 'camera'];
  for (const section of requiredSections) {
    const error = validateSection(section);
    if (error)
      return { section, error };
  }
  return null;
}

async function handleSave() {
  const validation = validateRequiredSections();
  if (validation) {
    activeSection.value = validation.section;
    showValidationError(validation.error);
    return;
  }

  submitting.value = true;
  try {
    const fullPayload = buildSubmitPayloadFromDraft(taskPayload.value);
    const apiPayload = buildApiPayloadFromDraft(taskPayload.value);
    const draftSnapshot = JSON.parse(JSON.stringify(taskPayload.value)) as AlgorithmTaskDraft;
    draftSnapshot.task_mode = 'wizard';

    if (isEditingMock.value && props.mockTaskId != null) {
      updateMockAlgorithmTask(props.mockTaskId, draftSnapshot, fullPayload);
      createMessage.success('任务已更新（前端 mock）');
      open.value = false;
      emit('success');
      return;
    }

    if (isEditingApiTask.value && props.editingTaskId != null) {
      const updatePayload = buildApiPayloadFromDraft(taskPayload.value, { forUpdate: true });
      const response = await updateAlgorithmTask(
        props.editingTaskId,
        updatePayload,
      ) as unknown as AlgorithmTask;
      if (response?.id) {
        saveWizardDraft(props.editingTaskId, draftSnapshot, fullPayload);
        setTaskMode(props.editingTaskId, 'wizard');
        createMessage.success('更新成功');
        open.value = false;
        emit('success');
      }
      else {
        createMessage.error((response as { msg?: string })?.msg || '更新失败');
      }
      return;
    }

    const response = await createAlgorithmTask(apiPayload) as unknown as AlgorithmTask;
    if (response?.id) {
      setTaskMode(response.id, 'wizard');
      saveWizardDraft(response.id, draftSnapshot, fullPayload);
      createMessage.success('创建成功');
      open.value = false;
      emit('success');
    }
    else {
      createMessage.error((response as { msg?: string })?.msg || '创建失败');
    }
  }
  catch (error: unknown) {
    console.error('保存算法任务失败', error);
    const err = error as {
      response?: { data?: { msg?: string } };
      data?: { msg?: string };
      msg?: string;
      message?: string;
    };
    const errorMsg =
      err?.response?.data?.msg
      ?? err?.data?.msg
      ?? err?.msg
      ?? (typeof error === 'string' ? error : err?.message)
      ?? '保存失败';
    createMessage.error(errorMsg);
  }
  finally {
    submitting.value = false;
  }
}

async function confirmUnsavedExit(): Promise<boolean> {
  if (props.readonly || isEditingMock.value || isEditingApiTask.value)
    return true;
  return confirmUnsavedAlgorithmTaskExit();
}

async function handleCancel() {
  if (await confirmUnsavedExit())
    open.value = false;
}
</script>

<style lang="less" scoped>
.algorithm-task-create-modal {
  display: flex;
  flex-direction: column;
  height: 560px;
  max-height: calc(100vh - 120px);
}

.create-body {
  display: flex;
  flex: 1;
  min-height: 0;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.create-nav {
  width: 200px;
  flex-shrink: 0;
  padding: 16px 10px;
  background: #fafafa;
  border-right: 1px solid #f0f0f0;
}

.nav-title {
  margin-bottom: 12px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.45);
  letter-spacing: 0.5px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: rgba(0, 0, 0, 0.65);

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &.active {
    background: #e6f4ff;
    color: #1677ff;
    font-weight: 600;

    .step-icon {
      border-color: #1677ff;
      background: #1677ff;
      color: #fff;
    }
  }

  &.pending {
    color: rgba(0, 0, 0, 0.45);
  }
}

.step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 1px solid #d9d9d9;
  border-radius: 50%;
  font-size: 14px;
  background: #fff;
  transition: all 0.2s;
}

.step-label {
  flex: 1;
  line-height: 1.4;
  font-size: 13px;
}

.create-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 16px 20px;
  overflow: auto;
  background: #fff;
}

.create-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  margin: 4px -12px -12px;
  padding: 4px 12px 0;

  :deep(.ant-btn-link) {
    height: 24px;
    padding: 0 4px;
    font-size: 13px;
  }
}

.footer-actions {
  display: flex;
  gap: 6px;

  :deep(.ant-btn-sm) {
    height: 24px;
    padding: 0 10px;
    font-size: 13px;
  }
}
</style>
