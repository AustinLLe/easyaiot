<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="threshold-edit-overlay"
      @mousedown.self="handleCancel"
    >
      <div class="threshold-edit-dialog" role="dialog" aria-modal="true">
        <div class="threshold-edit-header">
          <span class="threshold-edit-title">模型与检测参数</span>
          <button type="button" class="threshold-edit-close" @click="handleCancel">×</button>
        </div>

        <div class="threshold-edit-body">
          <!-- 检测模型 -->
          <div class="model-row">
            <span class="model-label">检测模型：</span>
            <span class="model-name">{{ modelDisplayName }}</span>
          </div>

          <!-- 参与检测类别 -->
          <div class="class-section">
            <div class="class-section-title">参与检测类别</div>
            <ClassWhitelistSelect
              v-model:value="localConfig.detection_config.class_whitelist"
              :options="classOptions"
            />
          </div>

          <div class="mode-row">
            <Segmented
              v-model:value="localConfig.custom_enabled"
              :options="modeOptions"
              @change="handleModeChange"
            />
          </div>

          <div class="param-panel">
            <div v-if="!localConfig.custom_enabled" class="param-cards">
              <div
                v-for="field in paramFields"
                :key="field.key"
                class="param-card"
              >
                <div class="param-card-main">
                  <div class="param-card-text">
                    <div class="param-card-title">{{ field.label }}</div>
                    <div class="param-card-desc">{{ field.desc }}</div>
                  </div>
                  <div class="param-card-input">
                    <InputNumber
                      v-if="field.type === 'number'"
                      v-model:value="localConfig.detection_config[field.key]"
                      :min="field.min"
                      :max="field.max"
                      :step="field.step"
                      class="param-input"
                    />
                    <Select
                      v-else-if="field.type === 'select'"
                      v-model:value="localConfig.detection_config[field.key]"
                      :options="field.options"
                      class="param-input"
                    />
                    <div v-if="field.range" class="param-range">{{ field.range }}</div>
                  </div>
                </div>
              </div>
            </div>

            <CustomAlgorithmParamsEditor
              v-else
              mode="inherit"
              :param-keys="modelExtensionKeys"
              v-model:value="localConfig.algorithm_params"
              v-model:descriptions="modelExtensionDescriptions"
            />
          </div>
        </div>

        <div class="threshold-edit-footer">
          <Button @click="handleCancel">取消</Button>
          <Button type="primary" @click="handleSave">保存</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { Button, InputNumber, Segmented, Select } from 'ant-design-vue';
import ClassWhitelistSelect from './ClassWhitelistSelect.vue';
import CustomAlgorithmParamsEditor from './CustomAlgorithmParamsEditor.vue';
import type {
  AlgorithmParamConfigDraft,
  DetectionConfigDraft,
  ThresholdTableRow,
} from '../../algorithmTaskDraft.types';
import { THRESHOLD_MODE_OPTIONS } from '../../algorithmTaskDraft.types';
import {
  applyPresetToConfig,
  getAlgorithmParamSchema,
  getModelClassOptions,
} from '../../utils/paramUtils';
import {
  fetchModelExtensionProfile,
  getExtensionParamKeys,
  mergeExtensionParamsForTask,
} from '../../utils/paramUtils';

defineOptions({ name: 'AlgorithmThresholdEditModal' });

const props = defineProps<{
  row: ThresholdTableRow | null;
  config: AlgorithmParamConfigDraft | null;
  globalDetectionConfig?: DetectionConfigDraft;
}>();

const emit = defineEmits<{
  save: [config: AlgorithmParamConfigDraft];
  cancel: [];
}>();

const visible = defineModel<boolean>('open', { default: false });

type DetectionFieldKey =
  | 'conf'
  | 'iou'
  | 'imgsz'
  | 'min_box_area'
  | 'max_detections';

interface ParamFieldDef {
  key: DetectionFieldKey;
  label: string;
  desc: string;
  type: 'number' | 'select';
  min?: number;
  max?: number;
  step?: number;
  range?: string;
  options?: Array<{ label: string; value: number }>;
}

const paramFields: ParamFieldDef[] = [
  {
    key: 'conf',
    label: '置信度阈值',
    desc: '低了误报多，高了可能漏检',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    range: '范围: 0~1',
  },
  {
    key: 'iou',
    label: '重叠框过滤',
    desc: '用来过滤重复框',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    range: '范围: 0~1',
  },
  {
    key: 'imgsz',
    label: '推理尺寸',
    desc: '越大越准但越慢',
    type: 'select',
    options: [
      { label: '320', value: 320 },
      { label: '416', value: 416 },
      { label: '640', value: 640 },
      { label: '1280', value: 1280 },
    ],
  },
  {
    key: 'min_box_area',
    label: '最小目标面积',
    desc: '过滤远处小目标',
    type: 'number',
    min: 0,
    step: 1,
    range: '范围: ≥0',
  },
  {
    key: 'max_detections',
    label: '单帧最大目标数',
    desc: '防止目标过多影响性能',
    type: 'number',
    min: 1,
    step: 1,
    range: '范围: ≥1',
  },
];

const localConfig = ref<AlgorithmParamConfigDraft>(
  createInitialConfig(null, null),
);

const modelExtensionKeys = ref<string[]>([]);
const modelExtensionTemplate = ref<Record<string, number | string | boolean>>({});
const modelExtensionDescriptions = ref<Record<string, string>>({});

const modeOptions = THRESHOLD_MODE_OPTIONS.map(item => ({
  label: item.label,
  value: item.value,
}));

const modelDisplayName = computed(() => props.row?.model_name || '—');
const classOptions = computed(() => getModelClassOptions(props.row?.model_id));

function getGlobalDefaults() {
  return {
    imgsz: props.globalDetectionConfig?.imgsz ?? 416,
    extract_interval: props.globalDetectionConfig?.extract_interval ?? 25,
  };
}

function createInitialConfig(
  row: ThresholdTableRow | null,
  config: AlgorithmParamConfigDraft | null,
): AlgorithmParamConfigDraft {
  if (config)
    return normalizeConfig(config, row);

  const modelId = row?.model_id ?? 0;
  const modelName = row?.model_name ?? '';
  const applied = applyPresetToConfig(
    getAlgorithmParamSchema(modelId, modelName),
    'balanced',
    modelId,
    getGlobalDefaults(),
  );
  return {
    ...applied,
    custom_enabled: false,
    detection_config: {
      ...applied.detection_config,
      class_whitelist: [],
    },
    algorithm_params: {},
  };
}

function normalizeConfig(
  config: AlgorithmParamConfigDraft,
  row: ThresholdTableRow | null,
): AlgorithmParamConfigDraft {
  const cloned = cloneConfig(config);
  const defaults = getGlobalDefaults();

  if (row)
    cloned.detection_config.model_id = row.model_id;

  if (cloned.detection_config.imgsz == null)
    cloned.detection_config.imgsz = defaults.imgsz;
  if (cloned.detection_config.extract_interval == null)
    cloned.detection_config.extract_interval = defaults.extract_interval;

  if (Object.keys(cloned.algorithm_params || {}).length)
    cloned.custom_enabled = true;

  return cloned;
}

watch(
  () => [visible.value, props.config, props.row] as const,
  async ([open, config, row]) => {
    if (!open)
      return;
    localConfig.value = createInitialConfig(row, config);
    await loadModelExtension(row?.model_id);
    if (localConfig.value.custom_enabled)
      applyModelExtensionParams(localConfig.value.algorithm_params);
  },
);

async function loadModelExtension(modelId?: number) {
  if (!modelId) {
    modelExtensionKeys.value = [];
    modelExtensionTemplate.value = {};
    modelExtensionDescriptions.value = {};
    return;
  }
  const profile = await fetchModelExtensionProfile(modelId);
  modelExtensionKeys.value = getExtensionParamKeys(profile);
  modelExtensionTemplate.value = { ...profile.algorithm_params };
  modelExtensionDescriptions.value = { ...profile.algorithm_param_descriptions };
}

function applyModelExtensionParams(current?: Record<string, number | string | boolean>) {
  if (!modelExtensionKeys.value.length) {
    localConfig.value.algorithm_params = {};
    return;
  }
  localConfig.value.algorithm_params = mergeExtensionParamsForTask(
    modelExtensionTemplate.value,
    current,
  );
}

function cloneConfig(config: AlgorithmParamConfigDraft): AlgorithmParamConfigDraft {
  const customEnabled = config.custom_enabled === true;
  return {
    preset: config.preset,
    custom_enabled: customEnabled,
    detection_config: {
      ...config.detection_config,
      class_whitelist: [...(config.detection_config.class_whitelist || [])],
      imgsz: config.detection_config.imgsz ?? 416,
      extract_interval: config.detection_config.extract_interval ?? 25,
    },
    algorithm_params: customEnabled
      ? { ...config.algorithm_params }
      : {},
  };
}

function handleModeChange(enabled: boolean | string) {
  if (enabled !== true) {
    localConfig.value.algorithm_params = {};
    return;
  }
  applyModelExtensionParams(localConfig.value.algorithm_params);
}

function handleCancel() {
  visible.value = false;
  emit('cancel');
}

function handleSave() {
  const config = cloneConfig(localConfig.value);
  if (config.custom_enabled && modelExtensionKeys.value.length) {
    config.algorithm_params = mergeExtensionParamsForTask(
      modelExtensionTemplate.value,
      config.algorithm_params,
    );
  }
  emit('save', config);
  visible.value = false;
}
</script>

<style lang="less" scoped>
.threshold-edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.threshold-edit-dialog {
  display: flex;
  flex-direction: column;
  width: min(720px, 100%);
  height: min(680px, calc(100vh - 48px));
  max-height: calc(100vh - 48px);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.threshold-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.threshold-edit-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.threshold-edit-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;

  &:hover {
    color: rgba(0, 0, 0, 0.88);
  }
}

.threshold-edit-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
}

.threshold-edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

/* 检测模型行 */
.model-row {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  font-size: 14px;
  line-height: 1.5;
}

.model-label {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.65);
}

.model-name {
  color: rgba(0, 0, 0, 0.88);
  font-weight: 500;
}

/* 类别勾选 */
.class-section {
  margin-bottom: 16px;
}

.mode-row {
  margin-bottom: 16px;
}

.param-panel {
  min-height: 480px;
}

.class-section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
}

.class-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
}

.class-checkbox-item {
  margin: 0 !important;

  :deep(.ant-checkbox) {
    .ant-checkbox-inner {
      width: 16px;
      height: 16px;
      border-radius: 2px;
    }
  }

  :deep(.ant-checkbox-checked) {
    .ant-checkbox-inner {
      background-color: #1677ff;
      border-color: #1677ff;
    }
  }
}

.class-hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

/* 参数卡片 */
.param-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-card {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fff;
}

.param-card-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
}

.param-card-text {
  flex: 1;
  min-width: 0;
}

.param-card-title {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.4;
}

.param-card-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.6;
}

.param-card-input {
  flex-shrink: 0;
  width: 120px;
  text-align: right;
}

.param-input {
  width: 120px !important;
}

.param-range {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

@media (max-width: 560px) {
  .param-card-main {
    flex-direction: column;
  }

  .param-card-input {
    width: 100%;
    text-align: left;
  }

  .param-input {
    width: 100% !important;
  }
}
</style>
