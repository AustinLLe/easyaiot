<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="push-endpoint-test-overlay"
      @mousedown.self="handleClose"
    >
      <div class="push-endpoint-test-dialog" role="dialog" aria-modal="true">
        <div class="push-endpoint-test-header">
          <span class="push-endpoint-test-title">状态</span>
          <button type="button" class="push-endpoint-test-close" @click="handleClose">×</button>
        </div>

        <div class="push-endpoint-test-body">
          <div class="test-content-section">
            <div class="test-content-toolbar">
              <label class="section-label" for="push-test-payload">测试内容：</label>
              <div class="toolbar-actions">
                <Button type="link" size="small" html-type="button" :loading="pushing" @click="handlePush">
                  <SendOutlined />
                  推送
                </Button>
                <Button type="link" size="small" html-type="button" :disabled="pushing" @click="handleReset">
                  <ReloadOutlined />
                  重置
                </Button>
              </div>
            </div>
            <Textarea
              id="push-test-payload"
              v-model:value="payloadText"
              class="payload-editor"
              :rows="14"
              spellcheck="false"
            />
          </div>

          <div class="result-section">
            <span class="section-label">状态：</span>
            <div class="result-value">{{ statusText || '—' }}</div>
          </div>

          <div class="result-section">
            <span class="section-label">返回结果：</span>
            <pre class="response-box">{{ responseText || '—' }}</pre>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { ReloadOutlined, SendOutlined } from '@ant-design/icons-vue';
import { Button, Textarea } from 'ant-design-vue';
import type { AlarmPushEndpoint, UserPushBinding } from '../../pushSettings.types';
import {
  testPushEndpointWithPayload,
  testUserPushBindingWithPayload,
} from '../../utils/mockPushSettingsStore';
import { buildPushTestPayloadText } from '../../utils/pushUtils';

defineOptions({ name: 'PushEndpointTestModal' });

const props = defineProps<{
  endpoint?: AlarmPushEndpoint | null;
  binding?: UserPushBinding | null;
}>();

const visible = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{
  tested: [];
}>();

const payloadText = ref('');
const statusText = ref('');
const responseText = ref('');
const pushing = ref(false);

function resetForm(endpoint: AlarmPushEndpoint | null) {
  payloadText.value = buildPushTestPayloadText(endpoint);
  statusText.value = '';
  responseText.value = '';
}

watch(
  () => [visible.value, props.endpoint?.profile_id, props.binding?.id] as const,
  ([open]) => {
    if (!open)
      return;
    resetForm(props.endpoint ?? (props.binding
      ? {
          profile_id: `user-binding-${props.binding.id}`,
          profile_name: '用户默认地址',
          platform: props.binding.channel,
          push_url: props.binding.push_url,
          enabled: true,
          output_content: { algorithm_fields: [], analysis_fields: [] },
          request_headers: [],
          extra_fields: [],
          field_mappings: [],
        }
      : null));
  },
);

function handleClose() {
  visible.value = false;
}

function handleReset() {
  resetForm(props.endpoint);
}

async function handlePush() {
  const profileId = props.endpoint?.profile_id;
  const bindingId = props.binding?.id;
  if (!profileId && bindingId == null)
    return;

  pushing.value = true;
  try {
    const result = bindingId != null
      ? await testUserPushBindingWithPayload(bindingId, payloadText.value)
      : await testPushEndpointWithPayload(profileId!, payloadText.value);
    statusText.value = result.statusText;
    responseText.value = result.responseText;
    emit('tested');
  }
  finally {
    pushing.value = false;
  }
}
</script>

<style lang="less" scoped>
.push-endpoint-test-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.push-endpoint-test-dialog {
  display: flex;
  flex-direction: column;
  width: min(720px, 100%);
  max-height: calc(100vh - 48px);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.push-endpoint-test-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.push-endpoint-test-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.push-endpoint-test-close {
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

.push-endpoint-test-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-label {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
}

.test-content-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.payload-editor {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-value {
  min-height: 22px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
}

.response-box {
  margin: 0;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background: #fafafa;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(0, 0, 0, 0.65);
}
</style>
