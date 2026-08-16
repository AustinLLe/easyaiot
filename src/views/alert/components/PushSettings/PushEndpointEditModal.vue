<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="push-endpoint-edit-overlay"
      @mousedown.self="handleCancel"
    >
      <div class="push-endpoint-edit-dialog" role="dialog" aria-modal="true">
        <div class="push-endpoint-edit-header">
          <span class="push-endpoint-edit-title">{{ isCreate ? '创建推送' : '编辑推送' }}</span>
          <button type="button" class="push-endpoint-edit-close" @click="handleCancel">×</button>
        </div>

        <div class="push-endpoint-edit-body">
          <Form layout="vertical" class="base-form">
            <FormItem label="名称" required html-for="push-endpoint-name">
              <Input
                id="push-endpoint-name" aria-label="名称"
                v-model:value="localEndpoint.profile_name"
                placeholder="例如：测试推送"
                allow-clear
              />
            </FormItem>
            <FormItem label="渠道类型" required html-for="push-endpoint-platform">
              <Select
                id="push-endpoint-platform" aria-label="渠道类型"
                v-model:value="localEndpoint.platform"
                :options="platformOptions"
                :get-popup-container="getPopupContainer"
              />
            </FormItem>
            <FormItem label="推送地址" required html-for="push-endpoint-url">
              <Input
                id="push-endpoint-url" aria-label="推送地址"
                v-model:value="localEndpoint.push_url"
                :placeholder="pushUrlPlaceholder"
                allow-clear
              />
            </FormItem>
          </Form>

          <Tabs v-model:activeKey="activeTab" class="config-tabs">
            <TabPane key="output" tab="输出内容">
              <PushOutputFieldPicker
                v-model:algorithm-fields="localEndpoint.output_content.algorithm_fields"
                v-model:analysis-fields="localEndpoint.output_content.analysis_fields"
              />
            </TabPane>

            <TabPane key="headers" tab="请求头">
              <KeyValueEditor v-model:rows="localEndpoint.request_headers" />
            </TabPane>

            <TabPane key="extra" tab="扩展字段">
              <KeyValueEditor v-model:rows="localEndpoint.extra_fields" />
            </TabPane>

            <TabPane key="mapping" tab="字段对照">
              <FieldMappingEditor v-model:rows="localEndpoint.field_mappings" />
            </TabPane>
          </Tabs>
        </div>

        <div class="push-endpoint-edit-footer">
          <Button html-type="button" @click="handleCancel">取消</Button>
          <Button type="primary" html-type="button" @click="handleSave">保存</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { Button, Form, FormItem, Input, Select, TabPane, Tabs } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import type { AlarmPushEndpoint } from '../../pushSettings.types';
import { createEmptyPushProfile } from '../../utils/mockPushSettingsStore';
import { clonePushEndpoint, ensurePushEndpointEditableRows, validatePushEndpoint } from '../../utils/pushUtils';
import PushOutputFieldPicker from './PushOutputFieldPicker.vue';
import KeyValueEditor from './KeyValueEditor.vue';
import FieldMappingEditor from './FieldMappingEditor.vue';

defineOptions({ name: 'PushEndpointEditModal' });

const props = defineProps<{
  endpoint: AlarmPushEndpoint | null;
  isCreate: boolean;
}>();

const emit = defineEmits<{
  save: [endpoint: AlarmPushEndpoint];
  cancel: [];
}>();

const visible = defineModel<boolean>('open', { default: false });
const { createMessage, createWarningModal } = useMessage();

const PUSH_URL_VALIDATION_ERRORS = new Set([
  '请填写推送地址',
  '推送地址需以 http:// 或 https:// 开头',
]);

const localEndpoint = ref<AlarmPushEndpoint>(createEmptyPushProfile());
const activeTab = ref('output');
const platformOptions = [
  { label: '通用 Webhook', value: 'webhook' },
  { label: '钉钉机器人', value: 'dingtalk' },
  { label: '飞书机器人', value: 'feishu' },
  { label: '企业微信机器人', value: 'wechat' },
];
const pushUrlPlaceholder = computed(() => ({
  dingtalk: 'https://oapi.dingtalk.com/robot/send?access_token=...',
  feishu: 'https://open.feishu.cn/open-apis/bot/v2/hook/...',
  wechat: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...',
  webhook: 'https://example.com/api/alarm/push',
}[localEndpoint.value.platform || 'webhook']));

function getPopupContainer(trigger: HTMLElement) {
  return trigger.parentElement ?? document.body;
}

watch(
  () => [visible.value, props.endpoint] as const,
  ([open, endpoint]) => {
    if (!open)
      return;
    localEndpoint.value = ensurePushEndpointEditableRows(
      clonePushEndpoint(endpoint ?? createEmptyPushProfile()),
    );
    activeTab.value = 'output';
  },
);

function handleCancel() {
  visible.value = false;
  emit('cancel');
}

function handleSave() {
  const normalized = clonePushEndpoint(localEndpoint.value);
  normalized.profile_name = normalized.profile_name.trim();
  normalized.push_url = normalized.push_url.trim();
  normalized.request_headers = normalized.request_headers
    .filter(row => row.key?.trim())
    .map(({ key, value }) => ({ key, value }));
  normalized.extra_fields = normalized.extra_fields
    .filter(row => row.key?.trim())
    .map(({ key, value }) => ({ key, value }));
  normalized.field_mappings = normalized.field_mappings
    .filter(group =>
      group.key_source?.trim()
      || group.key_target?.trim()
      || group.value_source?.trim()
      || group.value_target?.trim(),
    )
    .map(({ key_source, key_target, value_source, value_target }) => ({
      key_source,
      key_target,
      value_source,
      value_target,
    }));
  normalized.output_content.algorithm_fields = normalized.output_content.algorithm_fields
    .filter(key => key !== 'algorithm_name_en');

  const error = validatePushEndpoint(normalized);
  if (error) {
    if (PUSH_URL_VALIDATION_ERRORS.has(error)) {
      createWarningModal({
        title: '提示',
        content: error,
        zIndex: 4100,
      });
    }
    else {
      createMessage.warning(error);
    }
    return;
  }

  emit('save', normalized);
  visible.value = false;
}
</script>

<style lang="less" scoped>
.push-endpoint-edit-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.push-endpoint-edit-dialog {
  display: flex;
  flex-direction: column;
  width: min(860px, 100%);
  max-height: calc(100vh - 48px);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.push-endpoint-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.push-endpoint-edit-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.push-endpoint-edit-close {
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

.push-endpoint-edit-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
}

.base-form {
  margin-bottom: 8px;

  :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
}

.config-tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 12px;
  }
}

.push-endpoint-edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}
</style>
