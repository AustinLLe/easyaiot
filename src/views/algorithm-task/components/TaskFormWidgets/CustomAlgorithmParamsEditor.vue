<template>
  <div class="custom-params-editor">
    <div class="custom-params-header">
      <span class="custom-params-title">扩展参数</span>
      <Button
        v-if="mode === 'define'"
        type="link"
        size="small"
        class="add-param-link"
        :disabled="disabled"
        @click="addRow"
      >
        <PlusOutlined />
        新建
      </Button>
    </div>

    <div v-if="mode === 'inherit' && !effectiveKeys.length" class="inherit-empty">
      该模型未在算法管理中配置扩展参数，请先在「算法管理 → 阈值配置 → 扩展」中维护。
    </div>

    <div v-else-if="rows.length" class="param-cards">
      <div v-for="(row, index) in rows" :key="row.id" class="param-card">
        <div class="param-card-main" :class="{ 'param-card-main--define': mode === 'define' }">
          <template v-if="mode === 'define'">
            <Input
              v-model:value="row.key"
              placeholder="参数名"
              class="param-field param-name-field"
              :disabled="disabled"
              @change="syncParams"
            />
            <Input
              v-model:value="row.description"
              placeholder="参数描述"
              class="param-field param-desc-field"
              :disabled="disabled"
              @change="syncParams"
            />
            <Input
              v-model:value="row.value"
              placeholder="参数值"
              class="param-field param-value-field"
              :disabled="disabled"
              @change="syncParams"
            />
            <Button
              type="text"
              size="small"
              danger
              class="param-delete-btn"
              :disabled="disabled"
              @click="removeRow(index)"
            >
              <DeleteOutlined />
            </Button>
          </template>
          <template v-else>
            <div class="param-card-text">
              <div class="param-card-title">{{ row.key }}</div>
              <div class="param-card-desc">
                {{ row.description || '继承自算法管理，仅可修改参数值' }}
              </div>
            </div>
            <div class="param-card-input">
              <Input
                v-model:value="row.value"
                placeholder="参数值"
                class="param-value-input"
                :disabled="disabled"
                @change="syncParams"
              />
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { Button, Input } from 'ant-design-vue';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';

defineOptions({ name: 'CustomAlgorithmParamsEditor' });

const props = withDefaults(defineProps<{
  disabled?: boolean;
  /** define=模型管理可新建；inherit=算法任务仅继承模型已定义参数 */
  mode?: 'define' | 'inherit';
  /** inherit 模式下固定的参数名列表（来自模型详情） */
  paramKeys?: string[];
}>(), {
  mode: 'define',
  paramKeys: () => [],
});

interface ParamRow {
  id: string;
  key: string;
  value: string;
  description: string;
}

const modelValue = defineModel<Record<string, number | string | boolean>>('value', {
  default: () => ({}),
});

const descriptions = defineModel<Record<string, string>>('descriptions', {
  default: () => ({}),
});

const rows = ref<ParamRow[]>([]);
let rowSeq = 0;

const effectiveKeys = computed(() =>
  (props.paramKeys ?? []).map(key => key.trim()).filter(Boolean),
);

function nextRowId() {
  rowSeq += 1;
  return `param_row_${Date.now()}_${rowSeq}`;
}

function rowsFromParams(
  params: Record<string, number | string | boolean>,
  descMap: Record<string, string>,
  keys?: string[],
) {
  const orderedKeys = keys?.length ? keys : Object.keys(params || {});
  return orderedKeys.map((key) => {
    const value = params?.[key];
    return {
      id: nextRowId(),
      key,
      value: value == null ? '' : String(value),
      description: descMap[key] ?? '',
    };
  });
}

function syncParams() {
  const next: Record<string, string> = {};
  const nextDesc: Record<string, string> = {};
  rows.value.forEach((row) => {
    const key = row.key.trim();
    if (!key)
      return;
    next[key] = row.value;
    const desc = row.description.trim();
    if (props.mode === 'define' && desc)
      nextDesc[key] = desc;
  });
  modelValue.value = next;
  if (props.mode === 'define')
    descriptions.value = nextDesc;
}

function addRow() {
  if (props.disabled || props.mode === 'inherit')
    return;
  rows.value.push({ id: nextRowId(), key: '', value: '', description: '' });
}

function removeRow(index: number) {
  if (props.mode === 'inherit')
    return;
  rows.value.splice(index, 1);
  syncParams();
}

function rebuildRows() {
  if (props.mode === 'inherit') {
    rows.value = rowsFromParams(modelValue.value || {}, descriptions.value || {}, effectiveKeys.value);
    syncParams();
    return;
  }
  rows.value = rowsFromParams(modelValue.value || {}, descriptions.value || {});
}

watch(
  () => [modelValue.value, descriptions.value, props.mode, effectiveKeys.value.join('|')] as const,
  ([params, descMap, mode, _keysSig], [_prevParams, _prevDesc, prevMode]) => {
    const hasDraftRow = mode === 'define' && rows.value.some(row => !row.key.trim());
    if (hasDraftRow)
      return;

    if (mode === 'inherit') {
      const keys = effectiveKeys.value;
      if (keys.length) {
        const merged: Record<string, number | string | boolean> = {};
        keys.forEach((key) => {
          const current = params?.[key];
          merged[key] = current !== undefined && current !== '' ? current : '';
        });
        const currentKeys = Object.keys(modelValue.value || {}).sort().join('|');
        const mergedKeys = Object.keys(merged).sort().join('|');
        if (currentKeys !== mergedKeys || prevMode !== mode)
          modelValue.value = merged;
      }
      rows.value = rowsFromParams(modelValue.value || {}, descMap || {}, keys);
      return;
    }

    const currentKeys = rows.value.map(r => r.key).filter(Boolean).sort().join('|');
    const incomingKeys = Object.keys(params || {}).sort().join('|');
    const currentDescKeys = Object.keys(descMap || {}).sort().join('|');
    const rowDescKeys = rows.value
      .filter(r => r.key.trim())
      .map(r => `${r.key}:${r.description}`)
      .sort()
      .join('|');
    if (currentKeys === incomingKeys && currentDescKeys === rowDescKeys && prevMode === mode)
      return;
    rows.value = rowsFromParams(params || {}, descMap || {});
  },
  { immediate: true, deep: true },
);

watch(
  () => props.paramKeys,
  () => {
    if (props.mode === 'inherit')
      rebuildRows();
  },
  { deep: true },
);
</script>

<style lang="less" scoped>
.custom-params-editor {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #f0f0f0;
}

.custom-params-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.custom-params-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
}

.inherit-empty {
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.45);
  background: #fafafa;
  border: 1px dashed #e8e8e8;
  border-radius: 6px;
}

.add-param-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  height: auto;
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

.param-card-main--define {
  align-items: center;
  gap: 8px;
}

.param-field {
  min-width: 0;
}

.param-name-field {
  flex: 0 0 120px;
}

.param-desc-field {
  flex: 1;
}

.param-value-field {
  flex: 0 0 120px;
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
  word-break: break-all;
}

.param-card-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.6;
}

.param-card-input {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  gap: 4px;
  width: 140px;
}

.param-value-input {
  flex: 1;
  min-width: 0;
}

.param-delete-btn {
  flex-shrink: 0;
}

@media (max-width: 560px) {
  .param-card-main {
    flex-direction: column;
  }

  .param-card-main--define {
    align-items: stretch;
  }

  .param-name-field,
  .param-desc-field,
  .param-value-field {
    flex: 1 1 auto;
    width: 100%;
  }

  .param-card-input {
    width: 100%;
  }
}
</style>
