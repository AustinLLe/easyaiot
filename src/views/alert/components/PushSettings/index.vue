<template>
  <div class="push-settings-page">
    <div class="page-header">
      <span class="page-title">报警推送</span>
      <div class="header-actions">
        <Button type="primary" @click="openCreate">
          <PlusOutlined />
          创建推送
        </Button>
      </div>
    </div>

    <Table
      :columns="columns"
      :data-source="endpointList"
      :pagination="false"
      :row-selection="rowSelection"
      row-key="profile_id"
      size="small"
      table-layout="fixed"
      :locale="{ emptyText: '暂无推送配置，请点击「创建推送」' }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'push_url'">
          <span class="url-text" :title="record.push_url">{{ record.push_url || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'platform'">
          {{ platformLabels[record.platform || 'webhook'] }}
        </template>
        <template v-else-if="column.key === 'status'">
          <div class="status-cell">
            <Badge
              :status="record.online ? 'success' : 'error'"
              :text="record.online ? '在线' : '离线'"
            />
            <Button type="link" size="small" @click="openTest(record)">
              测试
            </Button>
          </div>
        </template>
        <template v-else-if="column.key === 'action'">
          <Button type="link" size="small" @click="openEdit(index)">编辑</Button>
          <Button type="link" size="small" danger @click="handleDelete(index)">删除</Button>
        </template>
      </template>
    </Table>

    <div class="section-header">
      <div>
        <div class="page-title">用户默认地址</div>
        <div class="section-description">
          算法任务按用户推送时，钉钉、飞书和企业微信会自动使用这里绑定的地址。
        </div>
      </div>
      <Button type="primary" @click="openBindingCreate">
        <PlusOutlined />
        新增绑定
      </Button>
    </div>

    <Table
      :columns="bindingColumns"
      :data-source="bindingList"
      :pagination="false"
      row-key="id"
      size="small"
      table-layout="fixed"
      :locale="{ emptyText: '暂无用户默认地址' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'user'">
          {{ userLabels.get(record.user_id) || `用户 #${record.user_id}` }}
        </template>
        <template v-else-if="column.key === 'channel'">
          {{ platformLabels[record.channel] }}
        </template>
        <template v-else-if="column.key === 'push_url'">
          <span class="url-text" :title="record.push_url">{{ record.push_url || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'status'">
          <div class="status-cell">
            <Badge
              :status="record.online ? 'success' : 'error'"
              :text="record.online ? '在线' : '离线'"
            />
            <Button type="link" size="small" @click="openBindingTest(record)">
              测试
            </Button>
          </div>
        </template>
        <template v-else-if="column.key === 'action'">
          <Button type="link" size="small" @click="openBindingEdit(record)">编辑</Button>
          <Button type="link" size="small" danger @click="handleBindingDelete(record)">删除</Button>
        </template>
      </template>
    </Table>

    <PushEndpointEditModal
      v-model:open="editVisible"
      :endpoint="editingEndpoint"
      :is-create="editingIndex === null"
      @save="handleSave"
    />

    <PushEndpointTestModal
      v-model:open="testVisible"
      :endpoint="testingEndpoint"
      @tested="reload"
    />

    <UserPushBindingModal
      v-model:open="bindingVisible"
      :binding="editingBinding"
      :users="users"
      @save="handleBindingSave"
    />

    <PushEndpointTestModal
      v-model:open="bindingTestVisible"
      :binding="testingBinding"
      @tested="reload"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { Badge, Button, Modal, Table } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { useMessage } from '@/hooks/web/useMessage';
import { getListSimpleUsers } from '@/api/system/user';
import type { AlarmPushEndpoint, UserPushBinding } from '../../pushSettings.types';
import {
  createEmptyPushProfile,
  loadPushProfiles,
  removePushProfile,
  loadUserPushBindings,
  removeUserPushBinding,
  savePushProfile,
  saveUserPushBinding,
} from '../../utils/mockPushSettingsStore';
import PushEndpointEditModal from './PushEndpointEditModal.vue';
import PushEndpointTestModal from './PushEndpointTestModal.vue';
import UserPushBindingModal from './UserPushBindingModal.vue';

defineOptions({ name: 'AlertPushSettings' });

const { createMessage } = useMessage();

const endpointList = ref<AlarmPushEndpoint[]>([]);
const editVisible = ref(false);
const editingIndex = ref<number | null>(null);
const editingEndpoint = ref<AlarmPushEndpoint | null>(null);
const selectedRowKeys = ref<string[]>([]);
const testVisible = ref(false);
const testingEndpoint = ref<AlarmPushEndpoint | null>(null);
const bindingList = ref<UserPushBinding[]>([]);
const bindingVisible = ref(false);
const editingBinding = ref<UserPushBinding | null>(null);
const bindingTestVisible = ref(false);
const testingBinding = ref<UserPushBinding | null>(null);
const users = ref<Array<{ id: number; nickname?: string; username?: string }>>([]);

const columns: ColumnsType<AlarmPushEndpoint> = [
  { title: '名称', dataIndex: 'profile_name', key: 'profile_name', width: '16%', ellipsis: true },
  { title: '渠道', key: 'platform', width: '14%', align: 'center' },
  { title: '推送地址', key: 'push_url', width: '36%', ellipsis: true },
  { title: '状态', key: 'status', width: '16%', align: 'center' },
  { title: '操作', key: 'action', width: '18%', align: 'center' },
];
const platformLabels: Record<AlarmPushEndpoint['platform'], string> = {
  webhook: '通用 Webhook',
  dingtalk: '钉钉',
  feishu: '飞书',
  wechat: '企业微信',
};
const bindingColumns: ColumnsType<UserPushBinding> = [
  { title: '用户', key: 'user', width: '22%' },
  { title: '渠道', key: 'channel', width: '18%', align: 'center' },
  { title: 'Webhook 地址', dataIndex: 'push_url', key: 'push_url', width: '30%', ellipsis: true },
  { title: '状态', key: 'status', width: '14%', align: 'center' },
  { title: '操作', key: 'action', width: '16%', align: 'center' },
];
const userLabels = computed(() => new Map(users.value.map(user => [
  user.id,
  user.nickname || user.username || String(user.id),
])));

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(String);
  },
}));

async function reload() {
  try {
    endpointList.value = await loadPushProfiles();
    bindingList.value = await loadUserPushBindings();
  }
  catch (error) {
    // Keep the editor usable even if the address list cannot be refreshed.
    endpointList.value = [];
    createMessage.error(error instanceof Error ? error.message : '加载推送配置失败');
  }
}

function openBindingCreate() {
  editingBinding.value = null;
  bindingVisible.value = true;
}

function openBindingEdit(binding: UserPushBinding) {
  editingBinding.value = binding;
  bindingVisible.value = true;
}

function openBindingTest(binding: UserPushBinding) {
  testingBinding.value = binding;
  bindingTestVisible.value = true;
}

async function handleBindingSave(binding: UserPushBinding) {
  await saveUserPushBinding(binding);
  createMessage.success(binding.id ? '已保存用户默认地址' : '已新增用户默认地址');
  await reload();
}

function handleBindingDelete(binding: UserPushBinding) {
  if (binding.id == null)
    return;
  Modal.confirm({
    title: '确认删除',
    content: `确定解除「${userLabels.value.get(binding.user_id) || binding.user_id}」的${platformLabels[binding.channel]}默认地址吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await removeUserPushBinding(binding.id!);
      createMessage.success('已解除用户默认地址');
      await reload();
    },
  });
}

function openCreate() {
  editingIndex.value = null;
  editingEndpoint.value = createEmptyPushProfile();
  editVisible.value = true;
}

function openEdit(index: number) {
  editingIndex.value = index;
  editingEndpoint.value = endpointList.value[index] ?? null;
  editVisible.value = true;
}

async function handleSave(endpoint: AlarmPushEndpoint) {
  if (editingIndex.value === null) {
    await savePushProfile(endpoint, true);
    createMessage.success('已创建推送');
  }
  else {
    await savePushProfile(endpoint, false);
    createMessage.success('已保存推送');
  }
  reload();
}

function handleDelete(index: number) {
  const item = endpointList.value[index];
  if (!item)
    return;
  Modal.confirm({
    title: '确认删除',
    content: `确定删除「${item.profile_name}」吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await removePushProfile(item.profile_id);
      {
        selectedRowKeys.value = selectedRowKeys.value.filter(id => id !== item.profile_id);
        createMessage.success('已删除');
        reload();
      }
    },
  });
}

function openTest(record: AlarmPushEndpoint) {
  testingEndpoint.value = record;
  testVisible.value = true;
}

onMounted(async () => {
  users.value = await getListSimpleUsers();
  await reload();
});
</script>

<style lang="less" scoped>
.push-settings-page {
  padding: 12px 16px 16px;
  background: #fff;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin: 28px 0 12px;
}

.section-description {
  margin-top: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.url-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(0, 0, 0, 0.65);
  font-size: 12px;
}

.status-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

:deep(.ant-table) {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.ant-table-thead > tr > th) {
  background: #fafafa;
}
</style>
