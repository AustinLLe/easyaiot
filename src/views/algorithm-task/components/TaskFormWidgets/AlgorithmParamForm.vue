<template>
  <div class="algorithm-param-form">
    <div
      v-for="field in basicFields"
      :key="field.key"
      class="param-row"
    >
      <div class="param-label">
        <div class="param-title">{{ field.label }}</div>
        <div v-if="field.hint" class="param-hint">{{ field.hint }}</div>
      </div>
      <div class="param-control">
        <a-input-number
          :value="getFieldValue(field)"
          :min="field.min"
          :max="field.max"
          :step="field.step ?? (field.type === 'integer' ? 1 : 0.01)"
          :disabled="!customEnabled"
          style="width: 120px"
          @update:value="(val) => setFieldValue(field, val)"
        />
        <div v-if="field.min != null && field.max != null" class="param-range">
          范围: {{ field.min }}~{{ field.max }}
        </div>
      </div>
    </div>

    <div v-if="advancedFields.length" class="more-section">
      <a-button type="link" class="more-toggle" @click="showAdvanced = !showAdvanced">
        <DownOutlined :class="{ rotated: showAdvanced }" />
        更多阈值
      </a-button>

      <div v-show="showAdvanced">
        <div
          v-for="field in advancedFields"
          :key="field.key"
          class="param-row"
        >
          <div class="param-label">
            <div class="param-title">{{ field.label }}</div>
            <div v-if="field.hint" class="param-hint">{{ field.hint }}</div>
          </div>
          <div class="param-control">
            <a-input-number
              :value="getFieldValue(field)"
              :min="field.min"
              :max="field.max"
              :step="field.step ?? (field.type === 'integer' ? 1 : 0.01)"
              :disabled="!customEnabled"
              style="width: 120px"
              @update:value="(val) => setFieldValue(field, val)"
            />
            <div v-if="field.min != null && field.max != null" class="param-range">
              范围: {{ field.min }}~{{ field.max }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { DownOutlined } from '@ant-design/icons-vue';
import type { AlgorithmParamConfigDraft } from '../../algorithmTaskDraft.types';
import type { AlgorithmParamField, AlgorithmParamSchema } from '../../utils/paramUtils';
import { getFieldStore } from '../../utils/paramUtils';

defineOptions({ name: 'AlgorithmParamForm' });

const props = defineProps<{
  schema: AlgorithmParamSchema;
  config: AlgorithmParamConfigDraft;
  customEnabled: boolean;
}>();

const emit = defineEmits<{
  'update:config': [value: AlgorithmParamConfigDraft];
}>();

const showAdvanced = ref(false);

const basicFields = computed(() =>
  props.schema.fields.filter(field => field.group !== 'advanced'),
);

const advancedFields = computed(() =>
  props.schema.fields.filter(field => field.group === 'advanced'),
);

function getFieldValue(field: AlgorithmParamField) {
  if (getFieldStore(field) === 'detection_config')
    return props.config.detection_config[field.key as keyof typeof props.config.detection_config] as number;
  return props.config.algorithm_params[field.key] as number;
}

function setFieldValue(field: AlgorithmParamField, value: number | null) {
  if (value == null)
    return;

  const next: AlgorithmParamConfigDraft = {
    ...props.config,
    detection_config: { ...props.config.detection_config },
    algorithm_params: { ...props.config.algorithm_params },
  };

  if (getFieldStore(field) === 'detection_config')
    (next.detection_config as Record<string, unknown>)[field.key] = value;
  else
    next.algorithm_params[field.key] = value;

  emit('update:config', next);
}
</script>

<style lang="less" scoped>
.algorithm-param-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.param-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.param-label {
  flex: 1;
  min-width: 0;
}

.param-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.param-hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.param-control {
  flex-shrink: 0;
  text-align: right;
}

.param-range {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.more-section {
  margin-top: 4px;
}

.more-toggle {
  padding-left: 0;

  .rotated {
    transform: rotate(180deg);
  }
}
</style>
