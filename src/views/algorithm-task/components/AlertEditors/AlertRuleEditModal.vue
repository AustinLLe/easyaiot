<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="alert-rule-edit-overlay"
      @mousedown.self="handleCancel"
    >
      <div class="alert-rule-edit-dialog" role="dialog" aria-modal="true">
        <div class="alert-rule-edit-header">
          <span class="alert-rule-edit-title">{{ modalTitle }}</span>
          <button type="button" class="alert-rule-edit-close" @click="handleCancel">×</button>
        </div>

        <div class="alert-rule-edit-body" :class="{ 'form-readonly': readonly }">
          <Form layout="vertical" class="rule-form">
            <FormItem label="规则名称" required html-for="alert-rule-name">
              <Input
                id="alert-rule-name"
                v-model:value="localRule.rule_name"
                placeholder="例如：未戴安全帽"
                :allow-clear="!readonly"
                :disabled="readonly"
                :readonly="readonly"
              />
            </FormItem>

            <FormItem label="启用">
              <Switch
                v-model:checked="localRule.enabled"
                checked-children="开"
                un-checked-children="关"
                :disabled="readonly"
              />
            </FormItem>

            <FormItem label="检测条件" required>
              <Table
                class="condition-table"
                :columns="conditionColumns"
                :data-source="localRule.conditions"
                :pagination="false"
                size="small"
                :row-key="record => `cond_${record.seq}`"
              >
                <template #bodyCell="{ column, record, index: condIndex }">
                  <template v-if="column.key === 'seq'">
                    <Tag color="blue">{{ record.seq }}</Tag>
                  </template>
                  <template v-else-if="column.key === 'model_id'">
                    <span v-if="readonly">{{ getModelLabel(record.model_id) }}</span>
                    <template v-else>
                      <label :for="`alert-rule-model-${condIndex}`" class="sr-only">算法</label>
                      <Select
                        :id="`alert-rule-model-${condIndex}`"
                        v-model:value="record.model_id"
                        placeholder="请选择算法"
                        allow-clear
                        style="width: 100%"
                        :options="modelOptions"
                        :get-popup-container="selectPopupContainer"
                        :dropdown-style="SELECT_DROPDOWN_STYLE"
                        @change="(value: number) => handleModelChange(record as AlertRuleConditionDraft, value)"
                      />
                    </template>
                  </template>
                  <template v-else-if="column.key === 'class_name'">
                    <span v-if="readonly">{{ record.class_name || '—' }}</span>
                    <template v-else>
                      <label :for="`alert-rule-class-${condIndex}`" class="sr-only">类别</label>
                      <Select
                        :id="`alert-rule-class-${condIndex}`"
                        v-model:value="record.class_name"
                        placeholder="请选择"
                        allow-clear
                        style="width: 100%"
                        :options="getClassOptions(record.model_id)"
                        :get-popup-container="selectPopupContainer"
                        :dropdown-style="SELECT_DROPDOWN_STYLE"
                      />
                    </template>
                  </template>
                  <template v-else-if="column.key === 'operator'">
                    <span v-if="readonly">{{ getOperatorLabel(record.operator) }}</span>
                    <template v-else>
                      <label :for="`alert-rule-op-${condIndex}`" class="sr-only">运算符</label>
                      <Select
                        :id="`alert-rule-op-${condIndex}`"
                        v-model:value="record.operator"
                        placeholder="请选择"
                        allow-clear
                        style="width: 100%"
                        :options="OPERATOR_OPTIONS"
                        :get-popup-container="selectPopupContainer"
                        :dropdown-style="SELECT_DROPDOWN_STYLE"
                      />
                    </template>
                  </template>
                  <template v-else-if="column.key === 'count'">
                    <span v-if="readonly">{{ record.count ?? '—' }}</span>
                    <template v-else>
                      <label :for="`alert-rule-count-${condIndex}`" class="sr-only">数量</label>
                      <InputNumber
                        :id="`alert-rule-count-${condIndex}`"
                        v-model:value="record.count"
                        placeholder="数量"
                        :min="0"
                        style="width: 100%"
                      />
                    </template>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <Button
                      type="link"
                      danger
                      size="small"
                      html-type="button"
                      class="btn-link-compact"
                      :disabled="localRule.conditions.length <= 1"
                      @click="handleRemoveCondition(condIndex)"
                    >
                      删除
                    </Button>
                  </template>
                </template>
              </Table>
              <Button v-if="!readonly" type="dashed" block html-type="button" class="add-condition-btn" @click="handleAddCondition">
                <PlusOutlined />
                添加条件
              </Button>
            </FormItem>

            <FormItem>
              <template #label>
                <span>条件关系</span>
                <span class="label-hint">（不填写默认为全部满足）</span>
              </template>
              <LogicExpressionBuilder
                v-model:expression="localRule.logic_expression"
                :conditions="localRule.conditions"
                :readonly="readonly"
              />
            </FormItem>

            <Row :gutter="16">
              <Col v-if="taskType === 'realtime'" :span="12">
                <FormItem label="持续时间（秒）" required html-for="alert-rule-duration">
                  <InputNumber
                    id="alert-rule-duration"
                    v-model:value="localRule.duration_sec"
                    placeholder="例如 3"
                    :min="0"
                    :disabled="readonly"
                    style="width: 100%"
                  />
                </FormItem>
              </Col>
              <Col :span="taskType === 'realtime' ? 12 : 24">
                <FormItem label="告警抑制时间（秒）" required html-for="alert-rule-suppress">
                  <InputNumber
                    id="alert-rule-suppress"
                    v-model:value="localRule.alarm_suppress_time"
                    placeholder="例如 300"
                    :min="0"
                    :disabled="readonly"
                    style="width: 100%"
                  />
                </FormItem>
              </Col>
            </Row>

            <Row :gutter="16">
              <Col :span="12">
                <FormItem label="录像启用">
                  <Switch
                    v-model:checked="localRule.clip_record_enabled"
                    checked-children="开"
                    un-checked-children="关"
                    :disabled="readonly"
                  />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="告警等级" required html-for="alert-rule-severity">
                  <Select
                    id="alert-rule-severity"
                    v-model:value="localRule.severity"
                    placeholder="请选择"
                    :allow-clear="!readonly"
                    :disabled="readonly"
                    :options="SEVERITY_OPTIONS"
                    :get-popup-container="selectPopupContainer"
                    :dropdown-style="SELECT_DROPDOWN_STYLE"
                    style="width: 100%"
                  />
                </FormItem>
              </Col>
            </Row>

            <div v-if="localRule.clip_record_enabled" class="clip-duration-block">
              <div class="clip-duration-row">
                <label class="clip-duration-label" for="alert-rule-clip-before">前</label>
                <InputNumber
                  id="alert-rule-clip-before"
                  v-model:value="localRule.clip_before_sec"
                  placeholder="10"
                  :min="0"
                  :disabled="readonly"
                  class="clip-duration-input"
                />
                <span class="clip-duration-unit">秒</span>
                <span class="clip-duration-gap" aria-hidden="true" />
                <label class="clip-duration-label" for="alert-rule-clip-after">后</label>
                <InputNumber
                  id="alert-rule-clip-after"
                  v-model:value="localRule.clip_after_sec"
                  placeholder="10"
                  :min="0"
                  :disabled="readonly"
                  class="clip-duration-input"
                />
                <span class="clip-duration-unit">秒</span>
              </div>
            </div>

            <TrackingConfigFields
              v-if="showTrackingConfig"
              v-model:config="detectionConfig"
              class="tracking-in-modal"
            />
          </Form>
        </div>

        <div class="alert-rule-edit-footer">
          <Button html-type="button" @click="handleCancel">{{ readonly ? '关闭' : '取消' }}</Button>
          <Button v-if="!readonly" type="primary" html-type="button" @click="handleSave">保存</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Col,
  Form,
  FormItem,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  Table,
  Tag,
} from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import type { AlertRuleConditionDraft, AlertRuleDraft } from '../../algorithmTaskDraft.types';
import LogicExpressionBuilder from './LogicExpressionBuilder.vue';
import TrackingConfigFields from '../TaskFormWidgets/TrackingConfigFields.vue';
import type { DetectionConfigDraft } from '../../algorithmTaskDraft.types';
import {
  OPERATOR_OPTIONS,
  SELECT_DROPDOWN_STYLE,
  SEVERITY_OPTIONS,
  cloneAlertRule,
  createBlankCondition,
  createEmptyAlertRule,
  ensureClipRecordDefaults,
  clearClipRecordSeconds,
  selectPopupContainer,
  syncModelNamesOnConditions,
  validateAlertRule,
} from '../../utils/alertUtils';
import {
  normalizeAlertRuleBeforeSave,
  renumberConditions,
} from '../../utils/alertUtils';

defineOptions({ name: 'AlertRuleEditModal' });

const props = defineProps<{
  rule: AlertRuleDraft | null;
  isCreate: boolean;
  readonly?: boolean;
  taskType: 'realtime' | 'snap';
  classOptions: Array<{ label: string; value: string; class_key?: string }>;
  classOptionsByModel?: Record<number, Array<{ label: string; value: string; class_key?: string }>>;
  modelOptions: Array<{ label: string; value: number }>;
}>();

const detectionConfig = defineModel<DetectionConfigDraft>('detectionConfig', { required: true });

const showTrackingConfig = computed(() => !props.readonly && props.isCreate && props.taskType === 'realtime');

const modalTitle = computed(() => {
  if (props.readonly)
    return '查看告警规则';
  return props.isCreate ? '添加告警规则' : '编辑告警规则';
});

const emit = defineEmits<{
  save: [rule: AlertRuleDraft];
  cancel: [];
}>();

const visible = defineModel<boolean>('open', { default: false });
const { createWarningModal } = useMessage();

const localRule = ref<AlertRuleDraft>(createEmptyAlertRule(0));

const conditionColumns = computed(() => {
  const columns = [
    { title: '序号', key: 'seq', width: 56, align: 'center' as const },
    { title: '算法名称', key: 'model_id', width: '22%' },
    { title: '检测类别', key: 'class_name', width: '22%' },
    { title: '判断关系', key: 'operator', width: '16%' },
    { title: '数量', key: 'count', width: '14%' },
  ];
  if (!props.readonly) {
    columns.push({ title: '操作', key: 'action', width: 52, align: 'center' as const });
  }
  return columns;
});

watch(
  () => [visible.value, props.rule, props.isCreate] as const,
  ([open, rule, isCreate]) => {
    if (!open)
      return;
    const base = isCreate
      ? cloneAlertRule(rule ?? createEmptyAlertRule(0))
      : cloneAlertRule(rule!);
    if (isCreate)
      base.logic_expression = '';
    if (base.clip_record_enabled)
      ensureClipRecordDefaults(base);
    syncModelNamesOnConditions(base.conditions, props.modelOptions);
    localRule.value = base;
    normalizeConditionClassNames();
  },
);

watch(
  () => localRule.value.clip_record_enabled,
  (enabled) => {
    if (enabled)
      ensureClipRecordDefaults(localRule.value);
    else
      clearClipRecordSeconds(localRule.value);
  },
);

function handleModelChange(record: AlertRuleConditionDraft, value: number) {
  const option = props.modelOptions.find(item => item.value === value);
  record.model_name = option?.label;
  const options = getClassOptions(value);
  if (record.class_name && !options.some(item => optionMatchesClass(item, record.class_name)))
    record.class_name = '';
}

function getClassOptions(modelId?: number | null) {
  if (modelId != null && props.classOptionsByModel?.[modelId]?.length)
    return props.classOptionsByModel[modelId];
  return props.classOptions;
}

function getModelLabel(modelId?: number | null) {
  if (modelId == null)
    return '—';
  return props.modelOptions.find(item => item.value === modelId)?.label ?? String(modelId);
}

function getOperatorLabel(operator?: string | null) {
  if (!operator)
    return '—';
  return OPERATOR_OPTIONS.find(item => item.value === operator)?.label ?? operator;
}

function optionMatchesClass(option: { value: string; class_key?: string }, className: string) {
  return option.value === className || option.class_key === className;
}

function normalizeConditionClassNames() {
  for (const condition of localRule.value.conditions) {
    if (!condition.class_name)
      continue;
    const option = getClassOptions(condition.model_id).find(item =>
      optionMatchesClass(item, condition.class_name),
    );
    if (option && option.value !== condition.class_name)
      condition.class_name = option.value;
  }
}

watch(
  () => props.classOptionsByModel,
  () => normalizeConditionClassNames(),
  { deep: true },
);

function handleAddCondition() {
  const nextSeq = localRule.value.conditions.length + 1;
  localRule.value.conditions.push(createBlankCondition(nextSeq, null));
  localRule.value.conditions = renumberConditions(localRule.value.conditions);
  syncModelNamesOnConditions(localRule.value.conditions, props.modelOptions);
}

function handleRemoveCondition(index: number) {
  if (localRule.value.conditions.length <= 1)
    return;
  localRule.value.conditions.splice(index, 1);
  localRule.value.conditions = renumberConditions(localRule.value.conditions);
  syncModelNamesOnConditions(localRule.value.conditions, props.modelOptions);
}

function handleCancel() {
  visible.value = false;
  emit('cancel');
}

function handleSave() {
  if (props.readonly)
    return;
  syncModelNamesOnConditions(localRule.value.conditions, props.modelOptions);
  if (props.taskType === 'snap')
    localRule.value.duration_sec = 0;
  const error = validateAlertRule(localRule.value);
  if (error) {
    createWarningModal({
      title: '提示',
      content: error,
      zIndex: 4100,
      getContainer: () => document.body,
    });
    return;
  }
  emit('save', normalizeAlertRuleBeforeSave({
    ...localRule.value,
    rule_name: localRule.value.rule_name.trim(),
  }));
  visible.value = false;
}
</script>

<style lang="less" scoped>
.alert-rule-edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.alert-rule-edit-dialog {
  display: flex;
  flex-direction: column;
  width: min(920px, 100%);
  max-height: calc(100vh - 48px);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.alert-rule-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.alert-rule-edit-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.alert-rule-edit-close {
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

.alert-rule-edit-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
}

.alert-rule-edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.add-condition-btn {
  margin-top: 8px;
}

.rule-form {
  :deep(.ant-form-item) {
    margin-bottom: 16px;
  }
}

.label-hint {
  margin-left: 4px;
  font-size: 12px;
  font-weight: normal;
  color: rgba(0, 0, 0, 0.45);
}

.condition-table {
  :deep(.ant-table-cell) {
    overflow: visible;
  }

  :deep(.btn-link-compact.ant-btn-link) {
    min-width: 0 !important;
    width: fit-content;
    padding: 0 4px;
    letter-spacing: 0 !important;

    > span {
      letter-spacing: 0 !important;
    }
  }
}

.clip-duration-block {
  margin: -8px 0 8px;
}

.clip-duration-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.clip-duration-label,
.clip-duration-unit {
  flex-shrink: 0;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.clip-duration-input {
  width: 88px !important;
}

.clip-duration-gap {
  width: 16px;
}

.tracking-in-modal {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;

  :deep(.field-control) {
    max-width: none;
  }
}

.form-readonly {
  :deep(.ant-input),
  :deep(.ant-input-number),
  :deep(.ant-select),
  :deep(.ant-switch),
  :deep(.ant-checkbox-wrapper),
  :deep(.ant-radio-wrapper),
  :deep(.ant-btn) {
    pointer-events: none;
  }

  :deep(.ant-input),
  :deep(.ant-input-number),
  :deep(.ant-select-selector) {
    background: #fafafa;
  }
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
</style>
