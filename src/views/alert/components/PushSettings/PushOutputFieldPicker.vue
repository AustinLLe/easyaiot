<template>
  <div class="output-field-picker">
    <Segmented
      v-model:value="activeGroup"
      :options="groupOptions"
      block
      class="group-segmented"
    />

    <div class="field-list">
      <label class="field-row select-all">
        <Checkbox
          :checked="isAllSelected"
          :indeterminate="isIndeterminate"
          @change="handleToggleAll"
        />
        <span class="field-label">全�?/span>
      </label>

      <label
        v-for="field in currentFields"
        :key="field.key"
        class="field-row"
      >
        <Checkbox
          :checked="selectedSet.has(field.key)"
          @change="(e) => handleToggleField(field.key, e.target.checked)"
        />
        <span class="field-label">{{ field.label }}</span>
        <span class="field-key">{{ field.key }}</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Checkbox, Segmented } from 'ant-design-vue';
import {
  ALGORITHM_OUTPUT_FIELDS,
  ANALYSIS_OUTPUT_FIELDS,
  type PushOutputFieldDef,
} from '../../pushOutputFieldCatalog';

defineOptions({ name: 'PushOutputFieldPicker' });

const algorithmFields = defineModel<string[]>('algorithmFields', { required: true });
const analysisFields = defineModel<string[]>('analysisFields', { required: true });

const activeGroup = ref<'algorithm' | 'analysis'>('algorithm');

const groupOptions = computed(() => [
  { label: `算法信息(${ALGORITHM_OUTPUT_FIELDS.length})`, value: 'algorithm' },
  { label: `分析结果(${ANALYSIS_OUTPUT_FIELDS.length})`, value: 'analysis' },
]);

const currentFields = computed<PushOutputFieldDef[]>(() =>
  activeGroup.value === 'algorithm' ? ALGORITHM_OUTPUT_FIELDS : ANALYSIS_OUTPUT_FIELDS,
);

const selectedSet = computed(() => new Set(
  activeGroup.value === 'algorithm' ? algorithmFields.value : analysisFields.value,
));

const isAllSelected = computed(() =>
  currentFields.value.length > 0
  && currentFields.value.every(field => selectedSet.value.has(field.key)),
);

const isIndeterminate = computed(() =>
  !isAllSelected.value
  && currentFields.value.some(field => selectedSet.value.has(field.key)),
);

function handleToggleField(key: string, checked: boolean) {
  const target = activeGroup.value === 'algorithm' ? algorithmFields : analysisFields;
  const next = new Set(target.value);
  if (checked)
    next.add(key);
  else
    next.delete(key);
  target.value = [...next];
}

function handleToggleAll(e: { target: { checked: boolean } }) {
  const target = activeGroup.value === 'algorithm' ? algorithmFields : analysisFields;
  if (e.target.checked) {
    target.value = currentFields.value.map(field => field.key);
    return;
  }
  target.value = [];
}
</script>

<style lang="less" scoped>
.output-field-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-segmented {
  max-width: 420px;
}

.field-list {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #fafafa;
  }

  &.select-all {
    background: #fafafa;
    font-weight: 500;
  }
}

.field-label {
  flex: 1;
  min-width: 0;
  color: rgba(0, 0, 0, 0.88);
}

.field-key {
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
