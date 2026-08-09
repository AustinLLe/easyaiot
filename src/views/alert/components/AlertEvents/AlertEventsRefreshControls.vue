<template>
  <div class="alert-refresh-controls">
    <a-button type="default" @click="openSettings">
      刷新设置
    </a-button>

    <Modal
      v-model:open="settingsVisible"
      title="刷新设置"
      :width="520"
      :footer="null"
      destroy-on-close
    >
      <div class="refresh-settings-body">
        <div class="manual-refresh-row">
          <div class="manual-refresh-text">
            <div class="manual-refresh-title">手动刷新</div>
            <div class="manual-refresh-desc">立即重新加载当前告警列表</div>
          </div>
          <a-button :loading="refreshing" @click="emit('refresh')">
            刷新
          </a-button>
        </div>

        <Divider class="settings-divider" />

        <Form layout="vertical" class="refresh-settings-form">
          <FormItem label="自动刷新">
            <Switch v-model:checked="draft.enabled" checked-children="开" un-checked-children="关" />
          </FormItem>
          <FormItem label="刷新间隔（秒）">
            <InputNumber
              v-model:value="draft.intervalSeconds"
              :min="3"
              :max="300"
              :step="1"
              :disabled="!draft.enabled"
              style="width: 100%"
            />
            <div class="field-hint">范围 3–300 秒，默认 10 秒</div>
          </FormItem>
        </Form>

        <div class="modal-actions">
          <a-button @click="settingsVisible = false">取消</a-button>
          <a-button type="primary" @click="handleSaveSettings">保存</a-button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, watch } from 'vue';
import { Divider, Form, FormItem, InputNumber, Modal, Switch } from 'ant-design-vue';
import type { AlertRefreshConfig } from '../../utils/alertRefreshConfig';

defineOptions({ name: 'AlertEventsRefreshControls' });

const props = defineProps<{
  config: AlertRefreshConfig;
  refreshing?: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  save: [config: AlertRefreshConfig];
}>();

const settingsVisible = ref(false);
const draft = reactive<AlertRefreshConfig>({
  enabled: true,
  intervalSeconds: 10,
});

watch(
  () => props.config,
  (value) => {
    draft.enabled = value.enabled;
    draft.intervalSeconds = value.intervalSeconds;
  },
  { immediate: true, deep: true },
);

function openSettings() {
  draft.enabled = props.config.enabled;
  draft.intervalSeconds = props.config.intervalSeconds;
  settingsVisible.value = true;
}

function handleSaveSettings() {
  emit('save', {
    enabled: draft.enabled,
    intervalSeconds: draft.intervalSeconds,
  });
  settingsVisible.value = false;
}
</script>

<style lang="less" scoped>
.alert-refresh-controls {
  display: inline-flex;
  align-items: center;
}

.refresh-settings-body {
  padding-top: 4px;
}

.manual-refresh-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.manual-refresh-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  line-height: 22px;
}

.manual-refresh-desc {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 20px;
}

.settings-divider {
  margin: 20px 0;
}

.refresh-settings-form {
  :deep(.ant-form-item) {
    margin-bottom: 16px;
  }

  :deep(.ant-form-item:last-child) {
    margin-bottom: 0;
  }
}

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
