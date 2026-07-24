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
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { Badge, Button, Modal, Table } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { useMessage } from '@/hooks/web/useMessage';
import type { AlarmPushEndpoint } from '../../pushSettings.types';
import {
  createEmptyPushProfile,
  loadPushProfiles,
  removePushProfile,
  savePushProfile,
} from '../../utils/mockPushSettingsStore';
import PushEndpointEditModal from './PushEndpointEditModal.vue';
import PushEndpointTestModal from './PushEndpointTestModal.vue';

defineOptions({ name: 'AlertPushSettings' });

const { createMessage } = useMessage();

const endpointList = ref<AlarmPushEndpoint[]>([]);
const editVisible = ref(false);
const editingIndex = ref<number | null>(null);
const editingEndpoint = ref<AlarmPushEndpoint | null>(null);
const selectedRowKeys = ref<string[]>([]);
const testVisible = ref(false);
const testingEndpoint = ref<AlarmPushEndpoint | null>(null);

const columns: ColumnsType<AlarmPushEndpoint> = [
  { title: '名称', dataIndex: 'profile_name', key: 'profile_name', width: '18%', ellipsis: true },
  { title: '推送地址', key: 'push_url', width: '42%', ellipsis: true },
  { title: '状态', key: 'status', width: '20%', align: 'center' },
  { title: '操作', key: 'action', width: '20%', align: 'center' },
];

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(String);
  },
}));

async function reload() {
  try {
    endpointList.value = await loadPushProfiles();
  }
  catch (error) {
    // Keep the editor usable even if the address list cannot be refreshed.
    endpointList.value = [];
    createMessage.error(error instanceof Error ? error.message : '加载推送配置失败');
  }
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
