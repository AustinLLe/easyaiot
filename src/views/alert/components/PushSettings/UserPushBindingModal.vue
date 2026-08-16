<template>
  <Modal
    v-model:open="visible"
    :title="binding?.id ? '编辑用户默认地址' : '新增用户默认地址'"
    ok-text="保存"
    cancel-text="取消"
    :confirm-loading="saving"
    :z-index="4000"
    @ok="handleSave"
  >
    <Form layout="vertical">
      <FormItem label="用户" required html-for="user-push-user">
        <Select
          id="user-push-user"
          v-model:value="local.user_id"
          show-search
          option-filter-prop="label"
          placeholder="请选择用户"
          :options="userOptions"
          :get-popup-container="getPopupContainer"
        />
      </FormItem>
      <FormItem label="渠道" required html-for="user-push-channel">
        <Select
          id="user-push-channel"
          v-model:value="local.channel"
          :options="channelOptions"
          :get-popup-container="getPopupContainer"
          @change="local.push_url = ''"
        />
      </FormItem>
      <FormItem label="Webhook 地址" required html-for="user-push-url">
        <Input
          id="user-push-url"
          v-model:value="local.push_url"
          :placeholder="pushUrlPlaceholder"
          allow-clear
        />
      </FormItem>
      <Alert
        type="info"
        show-icon
        message="算法任务选择“按用户推送”后，会自动使用这里绑定的默认地址。"
      />
    </Form>
  </Modal>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { Alert, Form, FormItem, Input, Modal, Select } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import type { UserPushBinding } from '../../pushSettings.types';

interface SimpleUser {
  id: number;
  nickname?: string;
  username?: string;
}

const props = defineProps<{
  binding: UserPushBinding | null;
  users: SimpleUser[];
}>();
const emit = defineEmits<{ save: [binding: UserPushBinding] }>();
const visible = defineModel<boolean>('open', { default: false });
const { createMessage } = useMessage();
const saving = ref(false);
const local = ref<UserPushBinding>({
  user_id: undefined as unknown as number,
  channel: 'dingtalk',
  push_url: '',
});

const channelOptions = [
  { label: '钉钉', value: 'dingtalk' },
  { label: '飞书', value: 'feishu' },
  { label: '企业微信', value: 'wechat' },
];
const userOptions = computed(() => props.users.map(user => ({
  label: user.nickname || user.username || String(user.id),
  value: user.id,
})));
const pushUrlPlaceholder = computed(() => ({
  dingtalk: 'https://oapi.dingtalk.com/robot/send?access_token=...',
  feishu: 'https://open.feishu.cn/open-apis/bot/v2/hook/...',
  wechat: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...',
}[local.value.channel]));

function getPopupContainer(trigger: HTMLElement) {
  // This modal deliberately sits above the task editor. Keep Select popups in
  // the same stacking context instead of teleporting them below the mask.
  return trigger.parentElement ?? document.body;
}

watch(
  () => [visible.value, props.binding] as const,
  ([open, binding]) => {
    if (!open)
      return;
    local.value = binding
      ? JSON.parse(JSON.stringify(binding))
      : { user_id: undefined as unknown as number, channel: 'dingtalk', push_url: '' };
  },
);

async function handleSave() {
  if (!local.value.user_id) {
    createMessage.warning('请选择用户');
    return;
  }
  if (!/^https?:\/\//i.test(local.value.push_url?.trim() || '')) {
    createMessage.warning('请填写完整的 Webhook 地址');
    return;
  }
  local.value.push_url = local.value.push_url.trim();
  saving.value = true;
  try {
    emit('save', { ...local.value });
  }
  finally {
    saving.value = false;
    visible.value = false;
  }
}
</script>
