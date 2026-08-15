<template>
  <div class="section-panel">
    <div class="section-header">
      <div class="header-row">
        <div>
          <h3>默认阈值</h3>
          <p>这些值会在创建算法任务时自动带入，任务中可单独修改。</p>
        </div>
        <Segmented
          v-model:value="draft.custom_enabled"
          :options="modeOptions"
          :disabled="isView"
        />
      </div>
    </div>

    <div v-if="!draft.custom_enabled" class="param-cards">
      <div v-for="field in paramFields" :key="field.key" class="param-card">
        <div class="param-card-main">
          <div class="param-card-text">
            <div class="param-card-title">{{ field.label }}</div>
            <div class="param-card-desc">{{ field.desc }}</div>
          </div>
          <div class="param-card-input">
            <InputNumber
              v-if="field.type === 'number'"
              v-model:value="draft.detection_config[field.key]"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              class="param-input"
              :disabled="isView"
            />
            <Select
              v-else
              v-model:value="draft.detection_config[field.key]"
              :options="field.options"
              class="param-input"
              :disabled="isView"
            />
            <div v-if="field.range" class="param-range">{{ field.range }}</div>
          </div>
        </div>
      </div>
    </div>

    <CustomAlgorithmParamsEditor
      v-else
      ref="paramsEditorRef"
      mode="define"
      v-model:value="draft.algorithm_params"
      v-model:descriptions="draft.algorithm_param_descriptions"
      :disabled="isView"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { InputNumber, Segmented, Select } from 'ant-design-vue';
import CustomAlgorithmParamsEditor from '@/views/algorithm-task/components/TaskFormWidgets/CustomAlgorithmParamsEditor.vue';
import type { ModelDraft } from '../../../modelDraft.types';
import { THRESHOLD_MODE_OPTIONS } from '../../../modelDraft.types';

defineOptions({ name: 'ModelDefaultThresholdSection' });

defineProps<{ isView?: boolean }>();

const draft = defineModel<ModelDraft>('draft', { required: true });

const paramsEditorRef = ref<InstanceType<typeof CustomAlgorithmParamsEditor> | null>(null);

function flushPendingParamsEdit() {
  return paramsEditorRef.value?.flushPendingEdit?.() ?? true;
}

defineExpose({ flushPendingParamsEdit });

const modeOptions = THRESHOLD_MODE_OPTIONS.map(item => ({
  label: item.label,
  value: item.value,
}));

type DetectionFieldKey =
  | 'conf'
  | 'iou'
  | 'imgsz'
  | 'min_box_area'
  | 'max_detections'
  | 'extract_interval';

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
    label: '置信度',
    desc: '最低检测得分。',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    range: '0 到 1',
  },
  {
    key: 'iou',
    label: 'IOU',
    desc: '非极大值抑制重叠阈值。',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    range: '0 到 1',
  },
  {
    key: 'imgsz',
    label: '输入尺寸',
    desc: '推理输入图片尺寸。',
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
    label: '最小框面积',
    desc: '忽略过小检测目标。',
    type: 'number',
    min: 0,
    step: 1,
    range: '>= 0',
  },
  {
    key: 'max_detections',
    label: '最大检测数',
    desc: '每帧最多保留的检测目标数量。',
    type: 'number',
    min: 1,
    step: 1,
    range: '>= 1',
  },
  {
    key: 'extract_interval',
    label: '抽帧间隔',
    desc: '每 N 帧执行一次检测。',
    type: 'number',
    min: 1,
    step: 1,
    range: '>= 1',
  },
];

</script>

<style lang="less" scoped>
.section-panel {
  max-width: 760px;
}

.section-header {
  margin-bottom: 16px;

  h3 {
    margin: 0 0 6px;
    color: rgba(0, 0, 0, 0.9);
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  }

  p {
    margin: 0;
    color: rgba(0, 0, 0, 0.6);
    font-size: 14px;
    line-height: 1.5;
  }
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

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
}
</style>
