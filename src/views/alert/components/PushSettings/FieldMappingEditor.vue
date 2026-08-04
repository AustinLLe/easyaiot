<template>
  <div class="field-mapping-editor">
    <Alert
      type="info"
      show-icon
      message="报警扩展信息，支持创建映射参数与对应 value 值"
      class="mapping-alert"
    />

    <Button class="add-btn" @click="addGroup">
      <PlusOutlined />
      新增
    </Button>

    <div v-if="rows.length" class="map-table">
      <div class="map-table-head">
        <span class="col-type">类型</span>
        <span class="col-source">原始值</span>
        <span class="col-target">映射值</span>
        <span class="col-action">操作</span>
      </div>

      <div
        v-for="(group, index) in rows"
        :key="index"
        class="mapping-group"
      >
        <div class="map-table-row">
          <span class="col-type type-label">key</span>
          <div class="col-source field-control">
            <Select
              :value="group.key_source || undefined"
              :options="fieldKeyOptions"
              placeholder="请输入key值"
              show-search
              allow-clear
              :disabled="group.locked"
              :get-popup-container="selectPopupContainer"
              :dropdown-style="SELECT_DROPDOWN_STYLE"
              @change="(val) => group.key_source = String(val ?? '')"
            />
          </div>
          <div class="col-target field-control">
            <Input
              v-model:value="group.key_target"
              placeholder="请输入key值"
              :disabled="group.locked"
            />
          </div>
          <div class="col-action action-cell">
            <Button type="link" danger size="small" @click="removeGroup(index)">删除</Button>
            <Button
              v-if="!group.locked"
              type="link"
              size="small"
              @click="confirmGroup(index)"
            >
              完成
            </Button>
          </div>
        </div>

        <div class="map-table-row">
          <span class="col-type type-label">value</span>
          <div class="col-source field-control">
            <Input
              v-model:value="group.value_source"
              placeholder="请输入value值"
              :disabled="group.locked"
            />
          </div>
          <div class="col-target field-control">
            <Input
              v-model:value="group.value_target"
              placeholder="请输入value值"
              :disabled="group.locked"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { Alert, Button, Input, Select } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import type { PushFieldMappingGroup } from '../../pushSettings.types';
import {
  ALGORITHM_OUTPUT_FIELDS,
  ANALYSIS_OUTPUT_FIELDS,
} from '../../pushOutputFieldCatalog';
import {
  createEmptyFieldMappingGroup,
  SELECT_DROPDOWN_STYLE,
  selectPopupContainer,
} from '../../utils/pushUtils';

defineOptions({ name: 'FieldMappingEditor' });

const rows = defineModel<PushFieldMappingGroup[]>('rows', { required: true });
const { createMessage } = useMessage();

const fieldKeyOptions = computed(() => [
  ...ALGORITHM_OUTPUT_FIELDS.map(item => ({ label: item.label, value: item.key })),
  ...ANALYSIS_OUTPUT_FIELDS.map(item => ({ label: item.label, value: item.key })),
]);

function addGroup() {
  rows.value = [...rows.value, createEmptyFieldMappingGroup()];
}

function removeGroup(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index);
}

function confirmGroup(index: number) {
  const group = rows.value[index];
  if (!group?.key_source?.trim()) {
    createMessage.warning('请填写 key 原始值');
    return;
  }
  if (!group.key_target?.trim()) {
    createMessage.warning('请填写 key 映射值');
    return;
  }
  group.locked = true;
  rows.value = [...rows.value];
}
</script>

<style lang="less" scoped>
.field-mapping-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mapping-alert {
  margin-bottom: 0;
}

.add-btn {
  align-self: flex-start;
}

.map-table {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.map-table-head {
  display: grid;
  grid-template-columns: 88px 240px 240px 1fr;
  column-gap: 16px;
  align-items: center;
  padding: 10px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
}

.map-table-head .col-type {
  padding-left: 8px;
}

.mapping-group {
  display: grid;
  grid-template-columns: 88px 240px 240px 1fr;
  column-gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.map-table-row {
  display: contents;
}

.type-label {
  padding: 10px 0 10px 8px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

.field-control {
  width: 240px;
  min-width: 240px;
  max-width: 240px;
  padding: 8px 0;

  :deep(.ant-select),
  :deep(.ant-input-affix-wrapper),
  :deep(.ant-input) {
    width: 100%;
  }
}

.map-table-head .col-action {
  text-align: right;
}

.action-cell {
  grid-row: 1 / span 2;
  grid-column: 4;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 8px 0;
}
</style>
