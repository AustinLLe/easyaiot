<template>
  <div class="section-panel">
    <div class="section-header">
      <div class="header-row">
        <div>
          <h3>阈值配置</h3>
          <p>配置算法默认检测参数，新建算法任务时可继承这些设置。</p>
        </div>
        <Segmented
          v-model:value="draft.custom_enabled"
          :options="modeOptions"
          :disabled="isView"
          @change="handleModeChange"
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
              v-else-if="field.type === 'select'"
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
      mode="define"
      v-model:value="draft.algorithm_params"
      v-model:descriptions="draft.algorithm_param_descriptions"
      :disabled="isView"
    />
  </div>
</template>

<script lang="ts" setup>
import { InputNumber, Segmented, Select } from 'ant-design-vue';
import CustomAlgorithmParamsEditor from '@/views/algorithm-task/components/TaskFormWidgets/CustomAlgorithmParamsEditor.vue';
import type { ModelDraft } from '../../../modelDraft.types';
import { THRESHOLD_MODE_OPTIONS } from '../../../modelDraft.types';

defineOptions({ name: 'ModelDefaultThresholdSection' });

defineProps<{
  isView?: boolean;
}>();

const draft = defineModel<ModelDraft>('draft', { required: true });

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
  {
    key: 'extract_interval',
    label: '抽帧间隔',
    desc: '每隔多少帧检测一次',
    type: 'number',
    min: 1,
    step: 1,
    range: '范围: ≥1',
  },
];

function handleModeChange(enabled: boolean | string) {
  if (enabled !== true) {
    draft.value.algorithm_params = {};
    draft.value.algorithm_param_descriptions = {};
  }
}
</script>

<style lang="less" scoped>
.section-panel {
  max-width: 760px;
}

.section-header {
  margin-bottom: 16px;

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: rgba(0, 0, 0, 0.45);
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
