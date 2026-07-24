<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="alert-event-push-overlay"
      @mousedown.self="handleCancel"
    >
      <div class="alert-event-push-dialog" role="dialog" aria-modal="true">
        <div class="alert-event-push-header">
          <span class="alert-event-push-title">推送告警</span>
          <button type="button" class="alert-event-push-close" @click="handleCancel">×</button>
        </div>

        <div class="alert-event-push-body">
          <p v-if="selectedCount > 0" class="selected-hint">
            已选择 {{ selectedCount }} 条报警记录
          </p>

          <AlertPushFormFields
            v-model:push="localPush"
            :show-push-name="false"
            :show-enabled="false"
            :show-rule-select="false"
            form-class="push-form"
          />
        </div>

        <div class="alert-event-push-footer">
          <Button @click="handleCancel">取消</Button>
          <Button type="primary" @click="handleConfirm">确认推送</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { Button } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import AlertPushFormFields from '@/views/algorithm-task/components/AlertEditors/AlertPushFormFields.vue';
import type { AlertPushDraft } from '@/views/algorithm-task/algorithmTaskDraft.types';
import {
  cloneAlertPush,
  createEmptyAlertPush,
  normalizeAlertPushBeforeSave,
  validateAlertPush,
} from '@/views/algorithm-task/utils/alertUtils';

defineOptions({ name: 'AlertEventPushModal' });

defineProps<{
  selectedCount?: number;
}>();

const emit = defineEmits<{
  confirm: [push: AlertPushDraft];
  cancel: [];
}>();

const visible = defineModel<boolean>('open', { default: false });
const { createMessage } = useMessage();

const localPush = ref<AlertPushDraft>(createEmptyAlertPush(0));

watch(visible, (open) => {
  if (!open)
    return;
  localPush.value = cloneAlertPush(createEmptyAlertPush(0));
});

function handleCancel() {
  visible.value = false;
  emit('cancel');
}

function handleConfirm() {
  const draft = {
    ...localPush.value,
    push_name: localPush.value.push_name?.trim() || '告警批量推送',
    enabled: true,
  };
  const error = validateAlertPush(draft, { requireRules: false });
  if (error) {
    createMessage.warning(error);
    return;
  }

  emit('confirm', normalizeAlertPushBeforeSave(draft));
  visible.value = false;
}
</script>

<style lang="less" scoped>
.alert-event-push-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.alert-event-push-dialog {
  display: flex;
  flex-direction: column;
  width: min(720px, 100%);
  max-height: calc(100vh - 48px);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.alert-event-push-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.alert-event-push-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.alert-event-push-close {
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

.alert-event-push-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
}

.selected-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.alert-event-push-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}
</style>
