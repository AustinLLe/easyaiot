<template>
  <Form layout="vertical" :class="formClass">
    <FormItem v-if="showRuleSelect" label="告警规则" required html-for="alert-push-rules">
      <Select
        id="alert-push-rules"
        v-model:value="pushModel.rule_ids"
        mode="multiple"
        placeholder="请选择要推送的告警规则"
        allow-clear
        :disabled="disabled"
        placement="bottomLeft"
        :options="alertRuleOptions"
        :get-popup-container="selectPopupContainer"
        :dropdown-style="SELECT_DROPDOWN_STYLE"
        style="width: 100%"
      />
    </FormItem>

    <FormItem v-if="showPushName" label="推送名称" required html-for="alert-push-name">
      <Input
        id="alert-push-name"
        v-model:value="pushModel.push_name"
        placeholder="例如：高等级邮件通知"
        :allow-clear="!disabled"
        :disabled="disabled"
      />
    </FormItem>

    <FormItem v-if="showEnabled" label="启用">
      <Switch
        v-model:checked="pushModel.enabled"
        checked-children="开"
        un-checked-children="关"
        :disabled="disabled"
      />
    </FormItem>

    <FormItem label="推送模式">
      <RadioGroup
        v-model:value="pushModel.push_mode"
        :options="PUSH_MODE_OPTIONS"
        :disabled="disabled"
      />
    </FormItem>

    <FormItem label="发送平台" required html-for="alert-push-platform">
      <Input
        id="alert-push-platform"
        v-model:value="pushModel.content.platform_name"
        placeholder="默认使用当前平台名称"
        :maxlength="64"
        :disabled="disabled"
      />
    </FormItem>

    <template v-if="isUserPushMode(pushModel)">
      <FormItem label="推送渠道" required>
        <CheckboxGroup
          v-model:value="pushModel.channels"
          :options="CHANNEL_OPTIONS"
          :disabled="disabled"
        />
      </FormItem>

      <FormItem label="推送用户" required>
        <ApiSelect
          v-model:value="pushModel.recipient_user_ids"
          mode="multiple"
          :api="getListSimpleUsers"
          label-field="nickname"
          value-field="id"
          placeholder="请选择推送用户"
          placement="bottomLeft"
          :disabled="disabled"
          :get-popup-container="selectPopupContainer"
          :dropdown-style="SELECT_DROPDOWN_STYLE"
          style="width: 100%"
        />
      </FormItem>

      <FormItem label="推送标题" required html-for="alert-push-title">
        <Input
          id="alert-push-title"
          v-model:value="pushModel.content.title_template"
          placeholder="例如：车间门口高等级告警"
          :allow-clear="!disabled"
          :disabled="disabled"
        />
      </FormItem>

      <FormItem label="推送内容包含" required>
        <CheckboxGroup
          v-model:value="pushModel.content.include_fields"
          :options="CONTENT_FIELD_OPTIONS"
          :disabled="disabled"
        />
      </FormItem>

      <FormItem label="补充说明（可选）" html-for="alert-push-remark">
        <Input.TextArea
          id="alert-push-remark"
          v-model:value="pushModel.content.remark"
          placeholder="附加在推送正文末尾"
          :rows="2"
          :disabled="disabled"
        />
      </FormItem>

      <FormItem label="内容预览">
        <div class="preview-box">{{ previewText }}</div>
      </FormItem>
    </template>

    <template v-else>
      <FormItem label="推送地址" required html-for="alert-push-address">
        <Select
          id="alert-push-address"
          v-model:value="pushModel.address_profile_ids"
          mode="multiple"
          placeholder="请选择推送地址"
          allow-clear
          :disabled="disabled"
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
import { usePlatformConfigStore } from '@/store/modules/platformConfig';
import { getPushProfiles, loadPushProfiles } from '@/views/alert/utils/mockPushSettingsStore';
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
  disabled?: boolean;
}>(), {
  alertRules: () => [],
  formClass: 'push-form',
  showRuleSelect: true,
  showPushName: true,
  showEnabled: true,
});

const pushModel = defineModel<AlertPushDraft>('push', { required: true });
const platformConfigStore = usePlatformConfigStore();

if (!pushModel.value.push_mode)
  pushModel.value.push_mode = 'user';
if (!pushModel.value.recipient_user_ids)
  pushModel.value.recipient_user_ids = [];
if (!pushModel.value.address_profile_ids)
  pushModel.value.address_profile_ids = [];
if (!pushModel.value.rule_ids)
  pushModel.value.rule_ids = [];

const alertRuleOptions = computed(() => buildAlertRuleSelectOptions(props.alertRules));

const addressProfileOptions = ref(buildAddressProfileOptions());

onMounted(async () => {
  await Promise.all([
    loadPushProfiles(),
    platformConfigStore.loadInterfaceConfig(),
  ]);
  if (!pushModel.value.content.platform_name?.trim())
    pushModel.value.content.platform_name = platformConfigStore.platformName;
  addressProfileOptions.value = buildAddressProfileOptions(getPushProfiles());
});

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
</style>
