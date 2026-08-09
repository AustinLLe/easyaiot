<template>
  <div class="custom-params-editor">
    <div class="custom-params-header">
      <span class="custom-params-title">扩展参数</span>
      <Button
        v-if="mode === 'define'"
        type="link"
        size="small"
        class="add-param-link"
        :disabled="disabled || !!editingRowId"
        @click="addRow"
      >
        <PlusOutlined />
        新建
      </Button>
    </div>

    <div v-if="mode === 'inherit' && !effectiveKeys.length" class="inherit-empty">
      该模型未在算法管理中配置扩展参数，请先在「算法管理 → 阈值配置 → 扩展」中维护。
    </div>

    <div v-else-if="rows.length" class="param-table" :class="mode === 'define' ? 'param-table--define' : 'param-table--inherit'">
      <div class="param-table-head">
        <span class="col-name">参数名</span>
        <span class="col-desc">描述</span>
        <span class="col-value">参数值</span>
        <span v-if="mode === 'define'" class="col-action">操作</span>
      </div>

      <div
        v-for="(row, index) in rows"
        :key="row.id"
        class="param-table-row"
        :class="{ 'param-table-row--editing': mode === 'define' && isRowEditing(row.id) }"
      >
        <template v-if="mode === 'define'">
          <div class="col-name">
            <Input
              v-if="isRowEditing(row.id)"
              v-model:value="row.key"
              placeholder="参数名"
              :disabled="disabled"
            />
            <span v-else class="cell-text">{{ row.key || '-' }}</span>
          </div>
          <div class="col-desc">
            <Input
              v-if="isRowEditing(row.id)"
              v-model:value="row.description"
              placeholder="参数描述"
              :disabled="disabled"
            />
            <span v-else class="cell-text cell-text-muted">{{ row.description || '-' }}</span>
          </div>
          <div class="col-value">
            <Input
              v-if="isRowEditing(row.id)"
              v-model:value="row.value"
              placeholder="参数值"
              :disabled="disabled"
            />
            <span v-else class="cell-text">{{ row.value || '-' }}</span>
          </div>
          <div class="col-action">
            <template v-if="isRowEditing(row.id)">
              <Button
                type="link"
                size="small"
                danger
                class="action-link"
                :disabled="disabled"
                @click="removeRow(index)"
              >
                删除
              </Button>
              <Button
                type="link"
                size="small"
                class="action-link action-save"
                :disabled="disabled"
                @click="saveRow(row.id)"
              >
                保存
              </Button>
            </template>
            <Button
              v-else
              type="link"
              size="small"
              class="action-link"
              :disabled="disabled || !!editingRowId"
              @click="startEditRow(row.id)"
            >
              编辑
            </Button>
          </div>
        </template>

        <template v-else>
          <div class="col-name">
            <span class="cell-text">{{ row.key }}</span>
          </div>
          <div class="col-desc">
            <span class="cell-text cell-text-muted">
              {{ row.description || '继承自算法管理，仅可修改参数值' }}
            </span>
          </div>
          <div class="col-value">
            <Input
              v-model:value="row.value"
              placeholder="参数值"
              :disabled="disabled"
              @change="syncParams"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Button, Input } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { useMessage } from '@/hooks/web/useMessage';

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

const { createMessage } = useMessage();

const rows = ref<ParamRow[]>([]);
const editingRowId = ref<string | null>(null);
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

function isRowEditing(id: string) {
  return editingRowId.value === id;
}

function clearEditingState() {
  editingRowId.value = null;
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

function startEditRow(id: string) {
  const row = rows.value.find(item => item.id === id);
  if (!row)
    return;
  editingRowId.value = id;
}

function saveRow(id: string, options?: { silent?: boolean }) {
  const row = rows.value.find(item => item.id === id);
  if (!row) {
    clearEditingState();
    return true;
  }

  const key = row.key.trim();
  if (!key) {
    if (!options?.silent)
      createMessage.warning('参数名不能为空');
    return false;
  }

  const duplicated = rows.value.some(item => item.id !== id && item.key.trim() === key);
  if (duplicated) {
    if (!options?.silent)
      createMessage.warning(`参数名「${key}」已存在`);
    return false;
  }

  row.key = key;
  row.description = row.description.trim();
  clearEditingState();
  syncParams();
  return true;
}

/** 底部保存前调用：将未点行内保存的编辑行写入 draft */
function flushPendingEdit(options?: { silent?: boolean }) {
  if (!editingRowId.value)
    return true;
  return saveRow(editingRowId.value, options);
}

defineExpose({ flushPendingEdit });

function addRow() {
  if (props.disabled || props.mode === 'inherit' || editingRowId.value)
    return;
  const item: ParamRow = { id: nextRowId(), key: '', value: '', description: '' };
  rows.value.push(item);
  startEditRow(item.id);
}

function removeRow(index: number) {
  if (props.mode === 'inherit')
    return;
  const row = rows.value[index];
  rows.value.splice(index, 1);
  if (row && editingRowId.value === row.id)
    clearEditingState();
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
  ([params, descMap, mode, _keysSig], oldTuple) => {
    const prevMode = oldTuple?.[2];
    if (mode === 'define' && editingRowId.value)
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

onBeforeUnmount(() => {
  if (props.mode === 'define' && editingRowId.value)
    flushPendingEdit({ silent: true });
});
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

.param-table {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.param-table-head,
.param-table-row {
  display: grid;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}

.param-table--define .param-table-head,
.param-table--define .param-table-row {
  grid-template-columns: 120px minmax(120px, 320px) 120px 100px;
}

.param-table--inherit .param-table-head,
.param-table--inherit .param-table-row {
  grid-template-columns: 120px minmax(0, 1fr) 140px;
}

.param-table-head {
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.param-table-row {
  border-bottom: 1px solid #f0f0f0;
  min-height: 44px;
}

.param-table-row:last-child {
  border-bottom: none;
}

.param-table-row--editing {
  background: #fafcff;
}

.col-name,
.col-desc,
.col-value,
.col-action {
  min-width: 0;
}

.col-action {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding-left: 8px;
  white-space: nowrap;
}

.cell-text {
  display: block;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.5;
  word-break: break-all;
}

.cell-text-muted {
  color: rgba(0, 0, 0, 0.45);
}

.action-link {
  padding: 0 4px;
  height: auto;
}

.action-save {
  color: #1677ff;
}

@media (max-width: 720px) {
  .param-table-head,
  .param-table-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .param-table-head .col-action {
    display: none;
  }

  .col-action {
    justify-content: flex-start;
  }
}
</style>
