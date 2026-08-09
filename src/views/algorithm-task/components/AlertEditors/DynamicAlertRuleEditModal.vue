<template>
  <Teleport to="body">
    <div v-if="visible" class="dynamic-rule-overlay" @mousedown.self="handleCancel">
      <div class="dynamic-rule-dialog" role="dialog" aria-modal="true">
        <div class="dynamic-rule-header">
          <span class="dynamic-rule-title">{{ modalTitle }}</span>
          <button type="button" class="dynamic-rule-close" @click="handleCancel">x</button>
        </div>

        <div class="dynamic-rule-body" :class="{ 'form-readonly': readonly }">
          <Form layout="vertical" class="dynamic-rule-form">
            <div class="form-block">
              <div class="block-title">{{ TXT.basic }}</div>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem :label="TXT.ruleName" required>
                    <Input v-model:value="localRule.rule_name" :placeholder="TXT.ruleNamePlaceholder" :allow-clear="!readonly" :disabled="readonly" :readonly="readonly" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem :label="TXT.ruleType" required>
                    <Select
                      v-model:value="localRule.behavior_type"
                      :options="DYNAMIC_BEHAVIOR_OPTIONS"
                      :disabled="readonly"
                      :get-popup-container="selectPopupContainer"
                      :dropdown-style="SELECT_DROPDOWN_STYLE"
                      style="width: 100%"
                      @change="handleBehaviorChange"
                    />
                  </FormItem>
                </Col>
              </Row>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem :label="TXT.enabled">
                    <Switch v-model:checked="localRule.enabled" :checked-children="TXT.on" :un-checked-children="TXT.off" :disabled="readonly" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem :label="TXT.severity" required>
                    <Select
                      v-model:value="localRule.severity"
                      :options="SEVERITY_OPTIONS"
                      :disabled="readonly"
                      :get-popup-container="selectPopupContainer"
                      :dropdown-style="SELECT_DROPDOWN_STYLE"
                      style="width: 100%"
                    />
                  </FormItem>
                </Col>
              </Row>
            </div>

            <div class="form-block">
              <div class="block-title">{{ TXT.target }}</div>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem :label="TXT.targetModel" required>
                    <Select
                      v-model:value="localRule.target_model_id"
                      :placeholder="TXT.selectModel"
                      :options="modelOptions"
                      :allow-clear="!readonly"
                      :disabled="readonly"
                      :get-popup-container="selectPopupContainer"
                      :dropdown-style="SELECT_DROPDOWN_STYLE"
                      style="width: 100%"
                      @change="handleTargetModelChange"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem :label="TXT.targetClass" required>
                    <Select
                      v-model:value="localRule.target_classes"
                      mode="multiple"
                      :placeholder="TXT.selectClass"
                      :options="targetClassOptions"
                      :disabled="readonly"
                      :get-popup-container="selectPopupContainer"
                      :dropdown-style="SELECT_DROPDOWN_STYLE"
                      style="width: 100%"
                    />
                  </FormItem>
                </Col>
              </Row>
            </div>

            <div class="form-block">
              <div class="block-title">{{ TXT.trigger }}</div>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem :label="TXT.extractInterval" required>
                    <InputNumber v-model:value="localRule.dynamic_trigger!.extract_interval" :min="1" :max="1000" :precision="0" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem :label="triggerLabel" required>
                    <Select
                      v-if="localRule.behavior_type === 'intrusion'"
                      v-model:value="localRule.dynamic_trigger!.mode"
                      :options="intrusionTriggerOptions"
                      :disabled="readonly"
                      :get-popup-container="selectPopupContainer"
                      :dropdown-style="SELECT_DROPDOWN_STYLE"
                      style="width: 100%"
                    />
                    <Input v-else :value="fixedTriggerText" disabled />
                  </FormItem>
                </Col>
              </Row>
              <Row v-if="showDwellSeconds || showShortLeaveTolerance" :gutter="16">
                <Col v-if="showDwellSeconds" :span="12">
                  <FormItem :label="TXT.dwellSeconds" required>
                    <InputNumber v-model:value="localRule.dynamic_trigger!.dwell_sec" :min="1" :max="86400" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
                <Col v-if="showShortLeaveTolerance" :span="12">
                  <FormItem :label="TXT.shortLeaveToleranceSeconds">
                    <InputNumber v-model:value="localRule.dynamic_trigger!.allow_leave_sec" :min="0" :max="86400" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
              </Row>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem :label="TXT.sameTrackSuppressSeconds" required>
                    <InputNumber v-model:value="localRule.dynamic_trigger!.same_track_suppress_sec" :min="0" :max="86400" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
              </Row>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem :label="TXT.suppressSeconds" required>
                    <InputNumber v-model:value="localRule.alarm_suppress_time" :min="0" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
              </Row>
              <Row :gutter="16">
                <Col v-if="localRule.behavior_type === 'intrusion'" :span="12">
                  <FormItem :label="TXT.enterConfirmFrames">
                    <InputNumber v-model:value="localRule.dynamic_trigger!.enter_confirm_frames" :min="1" :max="120" :precision="0" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
              </Row>
              <Row v-if="localRule.behavior_type === 'dwell'" :gutter="16">
                <Col :span="12">
                  <FormItem :label="TXT.crowdCount" required>
                    <InputNumber v-model:value="localRule.dynamic_trigger!.crowd_count" :min="1" :max="1000" :precision="0" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
              </Row>
            </div>

            <div class="form-block">
              <div class="block-title">{{ TXT.trackingQuality }}</div>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem :label="TXT.lostTrackBuffer" required>
                    <InputNumber v-model:value="localRule.dynamic_trigger!.lost_track_buffer" :min="1" :max="1000" :precision="0" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem :label="TXT.matchingThreshold" required>
                    <InputNumber v-model:value="localRule.dynamic_trigger!.matching_threshold" :min="0.01" :max="1" :step="0.01" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
              </Row>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem :label="TXT.maxSpeedJump">
                    <InputNumber v-model:value="localRule.dynamic_trigger!.max_speed_jump" :min="0" :precision="0" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem :label="TXT.smoothAlpha">
                    <InputNumber v-model:value="localRule.dynamic_trigger!.smooth_alpha" :min="0" :max="1" :step="0.01" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
              </Row>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem :label="TXT.lockClass">
                    <Switch v-model:checked="localRule.dynamic_trigger!.lock_class" :checked-children="TXT.on" :un-checked-children="TXT.off" :disabled="readonly" />
                  </FormItem>
                </Col>
              </Row>
            </div>

            <div class="form-block">
              <div class="block-title">{{ TXT.record }}</div>
              <Row :gutter="16">
                <Col :span="8">
                  <FormItem :label="TXT.recordEnabled">
                    <Switch v-model:checked="localRule.clip_record_enabled" :checked-children="TXT.on" :un-checked-children="TXT.off" :disabled="readonly" />
                  </FormItem>
                </Col>
                <Col v-if="localRule.clip_record_enabled" :span="8">
                  <FormItem :label="TXT.beforeSeconds" required>
                    <InputNumber v-model:value="localRule.clip_before_sec" :min="0" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
                <Col v-if="localRule.clip_record_enabled" :span="8">
                  <FormItem :label="TXT.afterSeconds" required>
                    <InputNumber v-model:value="localRule.clip_after_sec" :min="0" :disabled="readonly" style="width: 100%" />
                  </FormItem>
                </Col>
              </Row>
            </div>
          </Form>
        </div>

        <div class="dynamic-rule-footer">
          <Button @click="handleCancel">{{ readonly ? TXT.close : TXT.cancel }}</Button>
          <Button v-if="!readonly" type="primary" @click="handleSave">{{ TXT.save }}</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
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
} from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import type { AlertRuleBehaviorType, AlertRuleDraft } from '../../algorithmTaskDraft.types';
import {
  DYNAMIC_BEHAVIOR_OPTIONS,
  SELECT_DROPDOWN_STYLE,
  SEVERITY_OPTIONS,
  clearClipRecordSeconds,
  cloneAlertRule,
  createEmptyDynamicAlertRule,
  ensureClipRecordDefaults,
  normalizeDynamicAlertRuleBeforeSave,
  selectPopupContainer,
  validateDynamicAlertRule,
} from '../../utils/alertUtils';

defineOptions({ name: 'DynamicAlertRuleEditModal' });

const props = defineProps<{
  rule: AlertRuleDraft | null;
  isCreate: boolean;
  readonly?: boolean;
  classOptions: Array<{ label: string; value: string; class_key?: string }>;
  classOptionsByModel?: Record<number, Array<{ label: string; value: string; class_key?: string }>>;
  modelOptions: Array<{ label: string; value: number }>;
}>();

const emit = defineEmits<{
  save: [rule: AlertRuleDraft];
  cancel: [];
}>();

const TXT = {
  addTitle: '\u6dfb\u52a0\u52a8\u6001\u8ffd\u8e2a\u89c4\u5219',
  editTitle: '\u7f16\u8f91\u52a8\u6001\u8ffd\u8e2a\u89c4\u5219',
  basic: '\u57fa\u7840',
  ruleName: '\u89c4\u5219\u540d\u79f0',
  ruleNamePlaceholder: '\u4f8b\u5982\uff1a\u4eba\u5458\u8fdb\u5165\u5371\u9669\u533a\u57df',
  ruleType: '\u89c4\u5219\u7c7b\u578b',
  enabled: '\u542f\u7528',
  on: '\u5f00',
  off: '\u5173',
  severity: '\u544a\u8b66\u7b49\u7ea7',
  target: '\u76ee\u6807',
  targetModel: '\u76ee\u6807\u7b97\u6cd5',
  targetClass: '\u76ee\u6807\u7c7b\u522b',
  selectModel: '\u8bf7\u9009\u62e9\u7b97\u6cd5',
  selectClass: '\u8bf7\u9009\u62e9\u8981\u8ffd\u8e2a\u7684\u7c7b\u522b',
  trigger: '\u89e6\u53d1',
  extractInterval: '\u62bd\u5e27\u95f4\u9694',
  intrusionTrigger: '\u5165\u4fb5\u89e6\u53d1\u65b9\u5f0f',
  triggerType: '\u89e6\u53d1\u65b9\u5f0f',
  enterNow: '\u8fdb\u5165\u533a\u57df\u7acb\u5373\u89e6\u53d1',
  enterStay: '\u8fdb\u5165\u533a\u57df\u5e76\u505c\u7559\u540e\u89e6\u53d1',
  stayTrigger: '\u6301\u7eed\u505c\u7559\u540e\u89e6\u53d1',
  enterConfirmFrames: '\u8fdb\u5165\u786e\u8ba4\u5e27\u6570',
  dwellSeconds: '\u505c\u7559\u89e6\u53d1\uff08\u79d2\uff09',
  shortLeaveToleranceSeconds: '\u77ed\u6682\u79bb\u5f00\u5bb9\u5fcd\u65f6\u95f4\uff08\u79d2\uff09',
  sameTrackSuppressSeconds: '\u76f8\u540c\u76ee\u6807\u91cd\u590d\u544a\u8b66\u6291\u5236\uff08\u79d2\uff09',
  suppressSeconds: '\u544a\u8b66\u6291\u5236\u65f6\u95f4\uff08\u79d2\uff09',
  crowdCount: '\u89e6\u53d1\u6570\u91cf',
  trackingQuality: '\u8ffd\u8e2a\u8d28\u91cf',
  lostTrackBuffer: '\u76ee\u6807\u4e22\u5931\u4fdd\u7559\u5e27\u6570',
  matchingThreshold: '\u8f68\u8ff9\u5339\u914d\u9608\u503c',
  maxSpeedJump: '\u6700\u5927\u901f\u5ea6\u8df3\u53d8',
  smoothAlpha: '\u8f68\u8ff9\u5e73\u6ed1\u7cfb\u6570',
  lockClass: '\u76ee\u6807\u7c7b\u522b\u9501\u5b9a',
  record: '\u5f55\u50cf',
  recordEnabled: '\u5f55\u50cf\u542f\u7528',
  beforeSeconds: '\u544a\u8b66\u524d\uff08\u79d2\uff09',
  afterSeconds: '\u544a\u8b66\u540e\uff08\u79d2\uff09',
  cancel: '\u53d6\u6d88',
  close: '\u5173\u95ed',
  save: '\u4fdd\u5b58',
};

const modalTitle = computed(() => {
  if (props.readonly)
    return '查看动态追踪规则';
  return props.isCreate ? TXT.addTitle : TXT.editTitle;
});

const visible = defineModel<boolean>('open', { default: false });
const { createWarningModal } = useMessage();
const localRule = ref<AlertRuleDraft>(createEmptyDynamicAlertRule(0));

const intrusionTriggerOptions = computed(() => [
  { label: TXT.enterNow, value: 'enter' },
  { label: TXT.enterStay, value: 'stay' },
]);

const showDwellSeconds = computed(() =>
  localRule.value.behavior_type === 'dwell'
  || (localRule.value.behavior_type === 'intrusion' && localRule.value.dynamic_trigger?.mode === 'stay'),
);
const showShortLeaveTolerance = computed(() =>
  localRule.value.behavior_type === 'dwell'
  || (localRule.value.behavior_type === 'intrusion' && localRule.value.dynamic_trigger?.mode === 'stay'),
);
const targetClassOptions = computed(() => {
  const modelId = localRule.value.target_model_id;
  if (modelId != null && props.classOptionsByModel?.[modelId]?.length)
    return props.classOptionsByModel[modelId];
  return props.classOptions;
});
const triggerLabel = computed(() => localRule.value.behavior_type === 'intrusion' ? TXT.intrusionTrigger : TXT.triggerType);
const fixedTriggerText = computed(() => TXT.stayTrigger);

watch(
  () => [visible.value, props.rule, props.isCreate] as const,
  ([open, rule, isCreate]) => {
    if (!open)
      return;
    const base = isCreate
      ? createEmptyDynamicAlertRule(0)
      : cloneAlertRule(rule ?? createEmptyDynamicAlertRule(0));
    if (!base.behavior_type || base.behavior_type === 'static_count' || base.behavior_type === 'line_crossing')
      base.behavior_type = 'intrusion';
    ensureDynamicDefaults(base);
    localRule.value = base;
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

function ensureDynamicDefaults(rule: AlertRuleDraft) {
  if (!rule.dynamic_trigger)
    rule.dynamic_trigger = { mode: 'enter' };
  rule.dynamic_trigger = {
    mode: rule.dynamic_trigger.mode ?? 'enter',
    dwell_sec: rule.dynamic_trigger.dwell_sec ?? 3,
    extract_interval: rule.dynamic_trigger.extract_interval ?? 25,
    lost_track_buffer: rule.dynamic_trigger.lost_track_buffer ?? 25,
    matching_threshold: rule.dynamic_trigger.matching_threshold ?? 0.8,
    same_track_suppress_sec: rule.dynamic_trigger.same_track_suppress_sec ?? rule.alarm_suppress_time ?? 300,
    enter_confirm_frames: rule.dynamic_trigger.enter_confirm_frames ?? 2,
    allow_leave_sec: rule.dynamic_trigger.allow_leave_sec ?? 1,
    crowd_count: rule.dynamic_trigger.crowd_count ?? 1,
    max_speed_jump: rule.dynamic_trigger.max_speed_jump ?? 0,
    smooth_alpha: rule.dynamic_trigger.smooth_alpha ?? 0.25,
    lock_class: rule.dynamic_trigger.lock_class ?? true,
  };
  if (!rule.target_classes)
    rule.target_classes = [];
  rule.scope.type = 'region';
  if (rule.behavior_type === 'dwell')
    rule.dynamic_trigger.mode = 'stay';
  rule.dynamic_geometry = {
    type: 'polygon',
    points: rule.dynamic_geometry?.points ?? [],
  };
  if (rule.dynamic_trigger.dwell_sec == null)
    rule.dynamic_trigger.dwell_sec = 3;
}

function handleBehaviorChange(value: AlertRuleBehaviorType) {
  localRule.value.behavior_type = value === 'line_crossing' ? 'intrusion' : value;
  ensureDynamicDefaults(localRule.value);
}

function handleTargetModelChange(value: number) {
  const option = props.modelOptions.find(item => item.value === value);
  localRule.value.conditions[0] = {
    ...(localRule.value.conditions[0] ?? { seq: 1 }),
    seq: 1,
    model_id: value ?? null,
    model_name: option?.label,
    class_name: localRule.value.target_classes?.[0] ?? '',
    operator: '>=',
    count: 1,
  };
  const validValues = new Set(targetClassOptions.value.map(item => item.value));
  localRule.value.target_classes = (localRule.value.target_classes ?? []).filter(item => validValues.has(item));
}

function handleCancel() {
  visible.value = false;
  emit('cancel');
}

function handleSave() {
  if (props.readonly)
    return;
  ensureDynamicDefaults(localRule.value);
  const error = validateDynamicAlertRule(localRule.value);
  if (error) {
    createWarningModal({
      title: '\u63d0\u793a',
      content: error,
      zIndex: 4100,
      getContainer: () => document.body,
    });
    return;
  }
  emit('save', normalizeDynamicAlertRuleBeforeSave({
    ...localRule.value,
    rule_name: localRule.value.rule_name.trim(),
  }));
  visible.value = false;
}
</script>

<style lang="less" scoped>
.dynamic-rule-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.dynamic-rule-dialog {
  display: flex;
  flex-direction: column;
  width: min(960px, 100%);
  max-height: calc(100vh - 48px);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.dynamic-rule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.dynamic-rule-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.dynamic-rule-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
}

.dynamic-rule-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
}

.dynamic-rule-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.form-block {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.form-block:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.block-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.dynamic-rule-form {
  :deep(.ant-form-item) {
    margin-bottom: 14px;
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
</style>
