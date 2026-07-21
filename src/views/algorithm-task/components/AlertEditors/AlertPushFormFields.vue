<template>
  <Form layout="vertical" :class="formClass">
    <FormItem v-if="showRuleSelect" label="告警规则" required>
      <Select
        v-model:value="pushModel.rule_ids"
        mode="multiple"
        placeholder="请选择要推送的告警规则"
        allow-clear
        placement="bottomLeft"
        :options="alertRuleOptions"
        :get-popup-container="selectPopupContainer"
        :dropdown-style="SELECT_DROPDOWN_STYLE"
        style="width: 100%"
      />
    </FormItem>

    <FormItem v-if="showPushName" label="推送名称" required>
      <Input
        v-model:value="pushModel.push_name"
        placeholder="例如：高等级邮件通知"
        allow-clear
      />
    </FormItem>

    <FormItem v-if="showEnabled" label="启用">
      <Switch
        v-model:checked="pushModel.enabled"
        checked-children="开"
        un-checked-children="关"
      />
    </FormItem>

    <FormItem label="推送模式">
      <RadioGroup
        v-model:value="pushModel.push_mode"
        :options="PUSH_MODE_OPTIONS"
      />
    </FormItem>

    <template v-if="isUserPushMode(pushModel)">
      <FormItem label="推送渠道" required>
        <CheckboxGroup
          v-model:value="pushModel.channels"
          :options="CHANNEL_OPTIONS"
        />
      </FormItem>

      <FormItem label="推送用户（可选）">
        <ApiSelect
          v-model:value="pushModel.recipient_user_ids"
          mode="multiple"
          :api="getListSimpleUsers"
          label-field="nickname"
          value-field="id"
          placeholder="可选择已维护邮箱/手机号的系统用户"
          placement="bottomLeft"
          :get-popup-container="selectPopupContainer"
          :dropdown-style="SELECT_DROPDOWN_STYLE"
          style="width: 100%"
        />
      </FormItem>

      <FormItem v-if="usesEmailChannel" label="收件邮箱" required>
        <Select
          v-model:value="emailRecipients"
          mode="tags"
          placeholder="请输入收件邮箱，回车添加；支持多个邮箱"
          :token-separators="[',', ';']"
          placement="bottomLeft"
          :get-popup-container="selectPopupContainer"
          :dropdown-style="SELECT_DROPDOWN_STYLE"
          style="width: 100%"
        />
        <div class="field-help">系统用户没有维护邮箱时，请在这里直接填写实际收件地址。</div>
      </FormItem>

      <FormItem v-if="usesEmailChannel" label="发件邮箱配置" required>
        <Select
          v-model:value="emailAccountId"
          :options="mailAccountOptions"
          :loading="mailAccountLoading"
          placeholder="请选择“告警事件 → 消息配置”中的 SMTP 发件邮箱"
          allow-clear
          placement="bottomLeft"
          :get-popup-container="selectPopupContainer"
          :dropdown-style="SELECT_DROPDOWN_STYLE"
          style="width: 100%"
        />
        <div class="field-help">该配置决定用哪个邮箱发送；收件地址来自上方所选用户的邮箱。</div>
      </FormItem>

      <FormItem label="推送标题" required>
        <Input
          v-model:value="pushModel.content.title_template"
          placeholder="例如：车间门口高等级告警"
          allow-clear
        />
      </FormItem>

      <FormItem label="推送内容包含" required>
        <CheckboxGroup
          v-model:value="pushModel.content.include_fields"
          :options="CONTENT_FIELD_OPTIONS"
        />
      </FormItem>

      <FormItem label="补充说明（可选）">
        <Input.TextArea
          v-model:value="pushModel.content.remark"
          placeholder="附加在推送正文末尾"
          :rows="2"
        />
      </FormItem>

      <FormItem label="内容预览">
        <div class="preview-box">{{ previewText }}</div>
      </FormItem>
    </template>

    <template v-else>
      <FormItem label="推送地址" required>
        <Select
          v-model:value="pushModel.address_profile_ids"
          mode="multiple"
          placeholder="请选择推送地址"
          allow-clear
          placement="bottomLeft"
          :options="addressProfileOptions"
          :get-popup-container="selectPopupContainer"
          :dropdown-style="SELECT_DROPDOWN_STYLE"
          style="width: 100%"
        />
      </FormItem>
    </template>
  </Form>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import {
  CheckboxGroup,
  Form,
  FormItem,
  Input,
  RadioGroup,
  Select,
  Switch,
} from 'ant-design-vue';
import ApiSelect from '@/components/Form/src/components/ApiSelect.vue';
import { getListSimpleUsers } from '@/api/system/user';
import { messageConfigQuery } from '@/api/modules/notice';
import { getPushProfiles } from '@/views/alert/utils/mockPushSettingsStore';
import type { AlertPushDraft, AlertRuleDraft } from '../../algorithmTaskDraft.types';
import {
  buildAlertRuleSelectOptions,
  CHANNEL_OPTIONS,
  CONTENT_FIELD_OPTIONS,
  PUSH_MODE_OPTIONS,
  SELECT_DROPDOWN_STYLE,
  buildAddressProfileOptions,
  buildPushPreview,
  isUserPushMode,
  selectPopupContainer,
} from '../../utils/alertUtils';

defineOptions({ name: 'AlertPushFormFields' });

const props = withDefaults(defineProps<{
  taskName?: string;
  alertRules?: AlertRuleDraft[];
  userLabelMap?: Map<number, string>;
  profileLabelMap?: Map<string, string>;
  formClass?: string;
  showRuleSelect?: boolean;
  showPushName?: boolean;
  showEnabled?: boolean;
}>(), {
  alertRules: () => [],
  formClass: 'push-form',
  showRuleSelect: true,
  showPushName: true,
  showEnabled: true,
});

const pushModel = defineModel<AlertPushDraft>('push', { required: true });

const mailAccountLoading = ref(false);
const mailAccountOptions = ref<Array<{ label: string; value: number | string }>>([]);
const usesEmailChannel = computed(() =>
  isUserPushMode(pushModel.value) && pushModel.value.channels?.includes('email'),
);
const emailAccountId = computed<number | string | undefined>({
  get: () => pushModel.value.channel_config?.email?.account_id,
  set: (accountId) => {
    const channelConfig = pushModel.value.channel_config ?? {};
    const email = channelConfig.email ?? { recipients: [] };
    pushModel.value.channel_config = {
      ...channelConfig,
      email: { ...email, account_id: accountId },
    };
  },
});
const emailRecipients = computed<string[]>({
  get: () => pushModel.value.channel_config?.email?.recipients ?? [],
  set: (recipients) => {
    const channelConfig = pushModel.value.channel_config ?? {};
    const email = channelConfig.email ?? { recipients: [] };
    pushModel.value.channel_config = {
      ...channelConfig,
      email: { ...email, recipients },
    };
  },
});

function parseConfiguration(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object')
    return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value || '{}')) as Record<string, unknown>;
  }
  catch {
    return {};
  }
}

async function loadMailAccounts() {
  mailAccountLoading.value = true;
  try {
    const response = await messageConfigQuery({ msgType: 3, pageNo: 1, pageSize: 100 }) as any;
    const payload = response?.data ?? response;
    const rows = Array.isArray(payload) ? payload : (payload?.list ?? []);
    mailAccountOptions.value = rows.map((row: any) => {
      const config = row.configurationMap ?? parseConfiguration(row.configuration);
      const host = String(config.mailHost || '-');
      const port = String(config.mailPort || '-');
      const from = String(config.mailFrom || config.mailUser || `邮件账号 ${row.id}`);
      const demoHint = ['127.0.0.1', 'localhost'].includes(host) ? '，本机演示配置' : '';
      return {
        value: row.id,
        label: `${from}（${host}:${port}${demoHint}）`,
      };
    });
  }
  finally {
    mailAccountLoading.value = false;
  }
}

onMounted(loadMailAccounts);

if (!pushModel.value.push_mode)
  pushModel.value.push_mode = 'user';
if (!pushModel.value.recipient_user_ids)
  pushModel.value.recipient_user_ids = [];
if (!pushModel.value.address_profile_ids)
  pushModel.value.address_profile_ids = [];
if (!pushModel.value.rule_ids)
  pushModel.value.rule_ids = [];

const alertRuleOptions = computed(() => buildAlertRuleSelectOptions(props.alertRules));

const addressProfileOptions = computed(() => buildAddressProfileOptions(getPushProfiles()));

watch(
  () => pushModel.value.push_mode,
  (mode) => {
    if (mode === 'user' && !pushModel.value.channels?.length)
      pushModel.value.channels = ['email'];
    if (mode === 'address')
      pushModel.value.address_profile_ids = pushModel.value.address_profile_ids ?? [];
  },
);

const previewText = computed(() =>
  buildPushPreview(
    pushModel.value,
    props.taskName || '示例任务',
    props.userLabelMap,
    props.profileLabelMap,
    props.alertRules,
  ),
);
</script>

<style lang="less" scoped>
.push-form {
  :deep(.ant-form-item) {
    margin-bottom: 16px;
  }

  :deep(.ant-checkbox-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
  }
}

.preview-box {
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.65);
}

.field-help {
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
