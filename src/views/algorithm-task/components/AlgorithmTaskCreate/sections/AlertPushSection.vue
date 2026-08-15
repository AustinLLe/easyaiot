<template>
  <div class="section-panel">
    <div class="section-header">
      <h3>告警推送</h3>
      <p>配置告警触发后的推送渠道与推送内容，支持按用户推送或推送地址等方式。</p>
    </div>

    <div class="alert-push-panel">
      <div v-if="!readonly" class="table-toolbar">
        <Button type="primary" @click="openCreate">
          <PlusOutlined />
          添加告警推送
        </Button>
      </div>

      <Table
        class="alert-push-table"
        :columns="tableColumns"
        :data-source="payload.alert_push_configs"
        :pagination="false"
        :locale="{ emptyText: '暂未添加告警推送，请点击上方按钮添加' }"
        row-key="push_id"
        size="middle"
        table-layout="fixed"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'rule_ids'">
            {{ formatAlertRuleIds(record.rule_ids, payload.alert_rules) }}
          </template>
          <template v-else-if="column.key === 'push_mode'">
            {{ getPushModeLabel(record.push_mode) }}
          </template>
          <template v-else-if="column.key === 'channels'">
            {{ record.push_mode === 'address'
              ? formatAddressProfileIds(record.address_profile_ids, profileLabelMap)
              : formatChannels(record.channels) }}
          </template>
          <template v-else-if="column.key === 'recipient_user_ids'">
            {{ record.push_mode === 'address'
              ? '--'
              : formatRecipientUserIds(record.recipient_user_ids, userLabelMap) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <span v-if="readonly">{{ record.enabled ? '开' : '关' }}</span>
            <Switch
              v-else
              v-model:checked="record.enabled"
              checked-children="开"
              un-checked-children="关"
              size="small"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <div class="action-cell">
              <Button type="link" size="small" @click="openEdit(index)">
                {{ readonly ? '查看' : '编辑' }}
              </Button>
              <Button v-if="!readonly" type="link" size="small" danger @click="handleDelete(index)">
                删除
              </Button>
            </div>
          </template>
        </template>
      </Table>
    </div>

    <AlertPushEditModal
      v-model:open="editVisible"
      :push-config="editingPush"
      :is-create="editingIndex === null"
      :readonly="readonly"
      :task-name="payload.task_name"
      :alert-rules="payload.alert_rules"
      :user-label-map="userLabelMap"
      :profile-label-map="profileLabelMap"
      @save="handleEditSave"
      @cancel="handleEditClose"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { Button, Modal, Switch, Table } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { useMessage } from '@/hooks/web/useMessage';
import { getListSimpleUsers } from '@/api/system/user';
import { getPushProfiles, loadPushProfiles } from '@/views/alert/utils/mockPushSettingsStore';
import { truncatePushUrl } from '@/views/alert/utils/pushUtils';
import AlertPushEditModal from '../../AlertEditors/AlertPushEditModal.vue';
import type { AlertPushDraft, AlgorithmTaskDraft } from '../../../algorithmTaskDraft.types';
import {
  createEmptyAlertPush,
  formatAddressProfileIds,
  formatAlertRuleIds,
  formatChannels,
  formatRecipientUserIds,
  getPushModeLabel,
  normalizeAlertPushBeforeSave,
} from '../../../utils/alertUtils';
import { useAlgorithmTaskReadonly } from '../useAlgorithmTaskReadonly';

defineOptions({ name: 'AlertPushSection' });

const payload = defineModel<AlgorithmTaskDraft>('payload', { required: true });
const readonly = useAlgorithmTaskReadonly();

const { createWarningModal } = useMessage();

const editVisible = ref(false);
const editingIndex = ref<number | null>(null);
const editingPush = ref<AlertPushDraft | null>(null);
const userLabelMap = ref(new Map<number, string>());
const profileLabelMap = ref(new Map<string, string>());

const tableColumns = computed<ColumnsType<AlertPushDraft>>(() => [
  { title: '关联规则', key: 'rule_ids', width: '16%', ellipsis: true },
  { title: '推送名称', dataIndex: 'push_name', key: 'push_name', width: '14%', ellipsis: true },
  { title: '推送模式', key: 'push_mode', width: '12%', ellipsis: true },
  { title: '推送渠道/地址', key: 'channels', width: '14%', ellipsis: true },
  { title: '推送用户', key: 'recipient_user_ids', width: '14%', ellipsis: true },
  { title: '是否启用', key: 'enabled', width: '10%', align: 'center' },
  { title: '操作', key: 'action', width: 120, align: 'center' },
]);

onMounted(async () => {
  await loadPushProfiles();
  profileLabelMap.value = new Map(
    getPushProfiles().map(item => [
      item.profile_id,
      `${item.profile_name}（${truncatePushUrl(item.push_url, 28)}）`,
    ]),
  );

  try {
    const users = await getListSimpleUsers();
    if (Array.isArray(users)) {
      userLabelMap.value = new Map(
        users.map((user: { id: number; nickname?: string; username?: string }) => [
          user.id,
          user.nickname || user.username || String(user.id),
        ]),
      );
    }
  }
  catch {
    userLabelMap.value = new Map();
  }
});

function openCreate() {
  if (!payload.value.alert_rules?.length) {
    createWarningModal({
      title: '提示',
      content: '请先在「告警规则」步骤中添加至少一条告警规则',
      zIndex: 4100,
      getContainer: () => document.body,
    });
    return;
  }
  editingIndex.value = null;
  editingPush.value = createEmptyAlertPush(payload.value.alert_push_configs.length);
  editVisible.value = true;
}

function openEdit(index: number) {
  editingIndex.value = index;
  editingPush.value = payload.value.alert_push_configs[index] ?? null;
  editVisible.value = true;
}

function handleEditSave(push: AlertPushDraft) {
  if (readonly.value)
    return;
  const normalized = normalizeAlertPushBeforeSave(push);
  if (editingIndex.value === null) {
    payload.value.alert_push_configs.push(normalized);
  }
  else {
    payload.value.alert_push_configs[editingIndex.value] = normalized;
  }
  handleEditClose();
}

function handleDelete(index: number) {
  const pushName = payload.value.alert_push_configs[index]?.push_name || '该推送';
  Modal.confirm({
    title: '确认删除',
    content: `确定删除告警推送「${pushName}」吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      payload.value.alert_push_configs.splice(index, 1);
    },
  });
}

function handleEditClose() {
  editVisible.value = false;
  editingIndex.value = null;
  editingPush.value = null;
}
</script>

<style lang="less" scoped>
.section-panel {
  max-width: 100%;
}

.section-header {
  margin-bottom: 20px;

  h3 {
    margin: 0 0 6px;
    color: rgba(0, 0, 0, 0.9);
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  }

  p {
    margin: 0;
    color: rgba(0, 0, 0, 0.6);
    font-size: 14px;
    line-height: 1.5;
  }
}

.alert-push-panel {
  overflow: visible;
}

.table-toolbar {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.alert-push-table {
  :deep(.ant-table) {
    border-radius: 0;
    table-layout: fixed;
    width: 100%;
  }

  :deep(.ant-table-cell-ellipsis) {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.action-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  white-space: nowrap;
  gap: 0;

  :deep(.ant-btn) {
    padding: 0 4px;
  }
}
</style>
