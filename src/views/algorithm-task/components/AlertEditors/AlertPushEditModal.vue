<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="alert-push-edit-overlay"
      @mousedown.self="handleCancel"
    >
      <div class="alert-push-edit-dialog" role="dialog" aria-modal="true">
        <div class="alert-push-edit-header">
          <span class="alert-push-edit-title">{{ modalTitle }}</span>
          <button type="button" class="alert-push-edit-close" @click="handleCancel">×</button>
        </div>

        <div class="alert-push-edit-body" :class="{ 'form-readonly': readonly }">
          <AlertPushFormFields
            v-model:push="localPush"
            :task-name="taskName"
            :alert-rules="alertRules"
            :user-label-map="userLabelMap"
            :profile-label-map="profileLabelMap"
            :disabled="readonly"
          />
        </div>

        <div class="alert-push-edit-footer">
          <Button @click="handleCancel">{{ readonly ? '关闭' : '取消' }}</Button>
          <Button v-if="!readonly" type="primary" @click="handleSave">保存</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { Button } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import AlertPushFormFields from './AlertPushFormFields.vue';
import type { AlertPushDraft, AlertRuleDraft } from '../../algorithmTaskDraft.types';
import {
  cloneAlertPush,
  createEmptyAlertPush,
  normalizeAlertPushBeforeSave,
  validateAlertPush,
} from '../../utils/alertUtils';

defineOptions({ name: 'AlertPushEditModal' });

const props = defineProps<{
  pushConfig: AlertPushDraft | null;
  isCreate: boolean;
  readonly?: boolean;
  taskName?: string;
  alertRules?: AlertRuleDraft[];
  userLabelMap?: Map<number, string>;
  profileLabelMap?: Map<string, string>;
}>();

const emit = defineEmits<{
  save: [push: AlertPushDraft];
  cancel: [];
}>();

const visible = defineModel<boolean>('open', { default: false });
const { createWarningModal } = useMessage();

const modalTitle = computed(() => {
  if (props.readonly)
    return '查看告警推送';
  return props.isCreate ? '添加告警推送' : '编辑告警推送';
});

const localPush = ref<AlertPushDraft>(createEmptyAlertPush(0));

watch(
  () => [visible.value, props.pushConfig] as const,
  ([open, pushConfig]) => {
    if (!open)
      return;
    localPush.value = cloneAlertPush(pushConfig ?? createEmptyAlertPush(0));
  },
);

function handleCancel() {
  visible.value = false;
  emit('cancel');
}

function handleSave() {
  if (props.readonly)
    return;
  const normalized = normalizeAlertPushBeforeSave({
    ...localPush.value,
    push_name: localPush.value.push_name.trim(),
  });

  const error = validateAlertPush(normalized);
  if (error) {
    createWarningModal({
      title: '提示',
      content: error,
      zIndex: 4100,
      getContainer: () => document.body,
    });
    return;
  }

  emit('save', normalized);
  visible.value = false;
}
</script>

<style lang="less" scoped>
.alert-push-edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.alert-push-edit-dialog {
  display: flex;
  flex-direction: column;
  width: min(720px, 100%);
  max-height: calc(100vh - 48px);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.alert-push-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.alert-push-edit-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.alert-push-edit-close {
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

.alert-push-edit-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
}

.alert-push-edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.form-readonly {
  :deep(.ant-input),
  :deep(.ant-input-number),
  :deep(.ant-select),
  :deep(.ant-switch),
  :deep(.ant-checkbox-wrapper),
  :deep(.ant-radio-wrapper) {
    pointer-events: none;
  }
}
</style>
