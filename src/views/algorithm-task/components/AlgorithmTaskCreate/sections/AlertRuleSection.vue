<template>
  <div class="section-panel">
    <div class="section-header">
      <h3>告警规则</h3>
      <p>配置触发告警的条件、持续时间和抑制策略。</p>
    </div>

    <div class="alert-rule-panel">
      <div class="table-toolbar">
        <Button type="primary" @click="openCreate">
          <PlusOutlined />
          添加告警规则
        </Button>
      </div>

      <Table
        class="alert-rule-table"
        :columns="tableColumns"
        :data-source="payload.alert_rules"
        :pagination="false"
        :locale="{ emptyText: '暂未添加告警规则，请点击上方按钮添加' }"
        row-key="rule_id"
        size="middle"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'rule_seq'">
            {{ getRuleSeqDisplay(record, index) }}
          </template>
          <template v-else-if="column.key === 'severity'">
            <span :class="['severity-text', record.severity ? `severity-${record.severity}` : '']">
              {{ getSeverityLabel(record.severity) }}
            </span>
          </template>
          <template v-else-if="column.key === 'clip_record_enabled'">
            <Switch
              :checked="!!record.clip_record_enabled"
              checked-children="开"
              un-checked-children="关"
              size="small"
              @change="(checked: boolean) => handleClipRecordChange(record, checked)"
            />
          </template>
          <template v-else-if="column.key === 'enabled'">
            <Switch
              v-model:checked="record.enabled"
              checked-children="开"
              un-checked-children="关"
              size="small"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <Button type="link" size="small" @click="openEdit(index)">
              编辑
            </Button>
            <Button type="link" size="small" danger @click="handleDelete(index)">
              删除
            </Button>
          </template>
        </template>
      </Table>
    </div>

    <AlertRuleEditModal
      v-model:open="editVisible"
      :rule="editingRule"
      :is-create="editingIndex === null"
      :task-type="payload.task_type"
      v-model:detection-config="payload.detection_config"
      :class-options="classOptions"
      :model-options="modelOptions"
      @save="handleEditSave"
      @cancel="handleEditClose"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { Button, Modal, Switch, Table } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import AlertRuleEditModal from '../../AlertEditors/AlertRuleEditModal.vue';
import type { AlertRuleDraft, AlgorithmTaskDraft } from '../../../algorithmTaskDraft.types';
import {
  assignNextRuleSeq,
  clearClipRecordSeconds,
  createEmptyAlertRule,
  ensureClipRecordDefaults,
  getClassOptionsFromDraft,
  getModelOptionsFromDraft,
  getRuleSeqDisplay,
  getSeverityLabel,
  renumberAlertRules,
} from '../../../utils/alertUtils';
import { clearTrackingParams } from '../../../utils/taskUtils';

defineOptions({ name: 'AlertRuleSection' });

const payload = defineModel<AlgorithmTaskDraft>('payload', { required: true });

const editVisible = ref(false);
const editingIndex = ref<number | null>(null);
const editingRule = ref<AlertRuleDraft | null>(null);

const tableColumns: ColumnsType<AlertRuleDraft> = [
  { title: '规则序号', key: 'rule_seq', width: 88, align: 'center' },
  { title: '规则名称', dataIndex: 'rule_name', key: 'rule_name', ellipsis: true },
  { title: '告警等级', key: 'severity', width: 88, align: 'center' },
  { title: '录像启用', key: 'clip_record_enabled', width: 100, align: 'center' },
  { title: '是否启用', key: 'enabled', width: 100, align: 'center' },
  { title: '操作', key: 'action', width: 140, align: 'center' },
];

const classOptions = computed(() => getClassOptionsFromDraft(payload.value));
const modelOptions = computed(() => getModelOptionsFromDraft(payload.value));

watch(
  () => payload.value.task_type,
  (type) => {
    if (type === 'snap') {
      payload.value.detection_config.enable_tracking = false;
      clearTrackingParams(payload.value.detection_config);
    }
  },
  { immediate: true },
);

function handleClipRecordChange(rule: AlertRuleDraft, checked: boolean) {
  rule.clip_record_enabled = checked;
  if (checked)
    ensureClipRecordDefaults(rule);
  else
    clearClipRecordSeconds(rule);
}

function openCreate() {
  editingIndex.value = null;
  editingRule.value = createEmptyAlertRule(payload.value.alert_rules.length);
  editVisible.value = true;
}

function openEdit(index: number) {
  editingIndex.value = index;
  editingRule.value = payload.value.alert_rules[index] ?? null;
  editVisible.value = true;
}

function handleEditSave(rule: AlertRuleDraft) {
  if (editingIndex.value === null) {
    assignNextRuleSeq(rule, payload.value.alert_rules);
    payload.value.alert_rules.push(rule);
  }
  else {
    payload.value.alert_rules[editingIndex.value] = rule;
  }
  handleEditClose();
}

function handleDelete(index: number) {
  const rule = payload.value.alert_rules[index];
  const ruleLabel = rule?.rule_name?.trim() || `规则 ${rule ? getRuleSeqDisplay(rule, index) : index + 1}`;
  Modal.confirm({
    title: '确认删除',
    content: `确定删除告警规则「${ruleLabel}」吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      payload.value.alert_rules.splice(index, 1);
      renumberAlertRules(payload.value.alert_rules);
    },
  });
}

function handleEditClose() {
  editVisible.value = false;
  editingIndex.value = null;
  editingRule.value = null;
}
</script>

<style lang="less" scoped>
.section-panel {
  max-width: 900px;
}

.section-header {
  margin-bottom: 20px;

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

.alert-rule-panel {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  justify-content: flex-start;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.alert-rule-table {
  :deep(.ant-table) {
    border-radius: 0;
  }
}

.severity-text {
  font-size: 14px;

  &.severity-low {
    color: rgba(0, 0, 0, 0.45);
  }

  &.severity-medium {
    color: #fa8c16;
  }

  &.severity-high {
    color: #ff4d4f;
  }
}
</style>
