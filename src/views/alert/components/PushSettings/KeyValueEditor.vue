<template>
  <div class="key-value-editor">
    <Button class="add-btn" html-type="button" @click="addRow">
      <PlusOutlined />
      新增
    </Button>

    <div v-if="rows.length" class="kv-table">
      <div class="kv-table-head">
        <span class="col-key">key</span>
        <span class="col-value">value</span>
        <span class="col-action">操作</span>
      </div>

      <div v-for="(row, index) in rows" :key="index" class="kv-table-row">
        <label :for="`kv-key-${index}`" class="sr-only">key</label>
        <Input
          :id="`kv-key-${index}`"
          v-model:value="row.key"
          placeholder="请输入 key 值"
          class="col-key"
          :disabled="row.locked"
        />
        <label :for="`kv-value-${index}`" class="sr-only">value</label>
        <Input
          :id="`kv-value-${index}`"
          v-model:value="row.value"
          placeholder="请输入 value 值"
          class="col-value"
          :disabled="row.locked"
        />
        <div class="col-action">
          <Button type="link" danger size="small" html-type="button" @click="removeRow(index)">删除</Button>
          <Button
            v-if="!row.locked"
            type="link"
            size="small"
            html-type="button"
            @click="confirmRow(index)"
          >
            完成
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { PlusOutlined } from '@ant-design/icons-vue';
import { Button, Input } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';

defineOptions({ name: 'KeyValueEditor' });

const rows = defineModel<Array<{ key: string; value: string; locked?: boolean }>>('rows', { required: true });
const { createMessage } = useMessage();

function addRow() {
  rows.value = [...rows.value, { key: '', value: '', locked: false }];
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index);
}

function confirmRow(index: number) {
  const row = rows.value[index];
  if (!row?.key?.trim()) {
    createMessage.warning('请填写 key');
    return;
  }
  if (!row.value?.trim()) {
    createMessage.warning('请填写 value');
    return;
  }
  row.locked = true;
  rows.value = [...rows.value];
}
</script>

<style lang="less" scoped>
.key-value-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.add-btn {
  align-self: flex-start;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.kv-table {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.kv-table-head,
.kv-table-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
}

.kv-table-head {
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
}

.kv-table-row {
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.col-key {
  width: 38%;
  flex-shrink: 0;
}

.col-value {
  flex: 1;
  min-width: 0;
}

.col-action {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
</style>
