<template>
  <div class="alert-log-page">
    <BasicTable v-if="state.isTableMode" @register="registerTable">
      <template #toolbar>
        <div class="alert-toolbar">
          <div class="alert-toolbar-left">
            <a-button v-auth="['alert:events:push']" size="small" @click="handleBatchPush">推送</a-button>
            <a-button v-auth="['alert:events:process']" size="small" @click="handleBatchAction('process')">处理</a-button>
            <Dropdown v-auth="['alert:events:archive']">
              <a-button size="small">归档</a-button>
              <template #overlay>
                <Menu @click="handleArchiveMenuClick">
                  <MenuItem key="correct">正确报警</MenuItem>
                  <MenuItem key="incorrect">错误报警</MenuItem>
                </Menu>
              </template>
            </Dropdown>
            <a-button v-auth="['alert:events:export']" size="small" @click="handleBatchExport">导出</a-button>
            <a-button v-auth="['alert:events:delete']" size="small" danger @click="handleBatchAction('delete')">删除</a-button>
          </div>
          <div class="alert-toolbar-right">
            <AlertEventsRefreshControls
              :config="refreshConfig"
              :refreshing="manualRefreshing"
              @refresh="handleManualRefresh"
              @save="handleRefreshConfigSave"
            />
            <a-button type="default" preIcon="ant-design:swap-outlined" @click="handleClickSwap">
              切换视图
            </a-button>
          </div>
        </div>
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'snapshot_thumb'">
          <div class="snapshot-cell" @click="handleViewImage(record)">
            <img
              v-if="resolveAlertImageUrl(record)"
              :src="resolveAlertImageUrl(record)"
              alt="报警截图"
              class="snapshot-img"
              @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
            />
            <span v-else class="snapshot-empty">无截图</span>
          </div>
        </template>

        <template v-else-if="column.key === 'record_clip'">
          <a-button
            v-if="hasRecordClip(record)"
            type="link"
            size="small"
            @click="handleViewVideo(record)"
          >
            播放
          </a-button>
          <span v-else-if="getRecordClipStatus(record) === 'generating'" class="muted-text">生成中</span>
          <span v-else-if="getRecordClipStatus(record) === 'failed'" class="muted-text">生成失败</span>
          <span v-else class="muted-text">暂无视频</span>
        </template>

        <template v-else-if="column.key === 'severity_level'">
          <Tag :color="resolveSeverityLevel(record).color">
            {{ resolveSeverityLevel(record).label }}
          </Tag>
        </template>

        <template v-else-if="column.key === 'process_status'">
          <Badge :status="getProcessStatus(record, uiState).color as any" />
          <span>{{ getProcessStatus(record, uiState).label }}</span>
        </template>

        <template v-else-if="column.key === 'archive_status'">
          <Badge :status="getArchiveStatus(record, uiState).badgeStatus" />
          <span>{{ getArchiveStatus(record, uiState).label }}</span>
        </template>
      </template>
    </BasicTable>

    <div v-else>
      <AlertCards
        v-model:selected-ids="gridSelectedIds"
        :api="queryAlarmList"
        :ui-state="uiState"
        @getMethod="getMethod"
        @viewImage="handleCardViewImage"
        @viewVideo="handleCardViewVideo"
        @selectionChange="handleGridSelectionChange"
        @push="handleCardPush"
        @updateProcess="handleCardUpdateProcess"
        @updateArchive="handleCardUpdateArchive"
        @delete="handleCardDelete"
      >
        <template #header>
          <div class="alert-toolbar">
            <div class="alert-toolbar-left">
              <a-button v-auth="['alert:events:push']" size="small" @click="handleBatchPush">推送</a-button>
              <a-button v-auth="['alert:events:process']" size="small" @click="handleBatchAction('process')">处理</a-button>
              <Dropdown v-auth="['alert:events:archive']">
                <a-button size="small">归档</a-button>
                <template #overlay>
                  <Menu @click="handleArchiveMenuClick">
                    <MenuItem key="correct">正确报警</MenuItem>
                    <MenuItem key="incorrect">错误报警</MenuItem>
                  </Menu>
                </template>
              </Dropdown>
              <a-button v-auth="['alert:events:export']" size="small" @click="handleBatchExport">导出</a-button>
              <a-button v-auth="['alert:events:delete']" size="small" danger @click="handleBatchAction('delete')">删除</a-button>
            </div>
            <div class="alert-toolbar-right">
              <AlertEventsRefreshControls
                :config="refreshConfig"
                :refreshing="manualRefreshing"
                @refresh="handleManualRefresh"
                @save="handleRefreshConfigSave"
              />
              <a-button type="default" preIcon="ant-design:swap-outlined" @click="handleClickSwap">
                切换视图
              </a-button>
            </div>
          </div>
        </template>
      </AlertCards>
    </div>

    <ImageModal @register="registerImageModal" />
    <DialogPlayer @register="registerVideoModal" />
    <AlertEventPushModal
      v-model:open="pushModalVisible"
      :selected-count="pendingPushIds.length"
      @confirm="handlePushConfirm"
    />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { Badge, Dropdown, Menu, MenuItem, Tag } from 'ant-design-vue';
import { BasicTable, useTable } from '@/components/Table';
import { useMessage } from '@/hooks/web/useMessage';
import { extractAlertClientFilters, getBasicColumns, getFormConfig } from '../../Data';
import { queryAlarmList, updateAlertArchiveStatus, updateAlertProcessStatus, deleteAlarms, pushAlertEvents } from '@/api/device/calculate';
import AlertCards from './AlertCards/index.vue';
import AlertEventPushModal from './AlertEventPushModal.vue';
import AlertEventsRefreshControls from './AlertEventsRefreshControls.vue';
import ImageModal from '../ImageModal/index.vue';
import DialogPlayer from '@/components/VideoPlayer/DialogPlayer.vue';
import { useModal } from '@/components/Modal';
import type { AlertPushDraft } from '@/views/algorithm-task/algorithmTaskDraft.types';
import {
  formatAddressProfileIds,
  formatChannels,
  formatRecipientUserIds,
  getPushModeLabel,
  isUserPushMode,
} from '@/views/algorithm-task/utils/alertUtils';
import { getPushProfiles } from '@/views/alert/utils/mockPushSettingsStore';
import {
  exportAlertsToCsv,
  getArchiveStatus,
  getProcessStatus,
  getRecordClipStatus,
  hasRecordClip,
  loadAlertUiState,
  resolveAlertImageUrl,
  resolveSeverityLevel,
  type AlertUiState,
  type UiArchiveStatus,
  type UiProcessStatus,
} from '../../alertDisplayUtils';
import {
  getRefreshIntervalMs,
  loadAlertRefreshConfig,
  saveAlertRefreshConfig,
  type AlertRefreshConfig,
} from '../../utils/alertRefreshConfig';

defineOptions({ name: 'AlertEvents' });

const { createMessage } = useMessage();
const [registerImageModal, { openModal: openImageModal }] = useModal();
const [registerVideoModal, { openModal: openVideoModal }] = useModal();

const uiState = reactive<AlertUiState>(loadAlertUiState());

const state = reactive({
  isTableMode: true,
});

const pushModalVisible = ref(false);
const pendingPushIds = ref<number[]>([]);
const gridSelectedIds = ref<number[]>([]);
const gridSelectedRows = ref<Record<string, any>[]>([]);
const refreshConfig = ref<AlertRefreshConfig>(loadAlertRefreshConfig());
const manualRefreshing = ref(false);

function handleClickSwap() {
  state.isTableMode = !state.isTableMode;
}

let cardListReload = () => {};

function getMethod(m: any) {
  cardListReload = m;
}

const [
  registerTable,
  {
    reload,
    getSelectRows,
    clearSelectedRowKeys,
  },
] = useTable({
  canResize: true,
  resizeHeightOffset: 36,
  showIndexColumn: false,
  title: '',
  api: queryAlarmList,
  columns: getBasicColumns(),
  useSearchForm: true,
  showTableSetting: false,
  formConfig: getFormConfig(),
  rowSelection: { type: 'checkbox' },
  pagination: {
    pageSize: 7,
    defaultPageSize: 7,
    pageSizeOptions: ['7', '14', '21'],
  },
  fetchSetting: {
    listField: 'alert_list',
    totalField: 'total',
  },
  beforeFetch: (params) => extractAlertClientFilters(params),
  rowKey: 'id',
});

let refreshTimer: number | undefined;

function refreshAlertLists() {
  reload();
  cardListReload();
}

async function handleManualRefresh() {
  if (manualRefreshing.value)
    return;
  manualRefreshing.value = true;
  try {
    refreshAlertLists();
  }
  finally {
    window.setTimeout(() => {
      manualRefreshing.value = false;
    }, 400);
  }
}

function stopRefreshTimer() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}

function startRefreshTimer() {
  stopRefreshTimer();
  if (!refreshConfig.value.enabled)
    return;
  refreshTimer = window.setInterval(refreshAlertLists, getRefreshIntervalMs(refreshConfig.value));
}

function handleRefreshConfigSave(config: AlertRefreshConfig) {
  refreshConfig.value = saveAlertRefreshConfig(config);
  startRefreshTimer();
  createMessage.success('刷新设置已保存');
}

onMounted(() => {
  startRefreshTimer();
});

onUnmounted(() => {
  stopRefreshTimer();
});

function isSnapTask(record: Record<string, any>) {
  const t = record.task_type;
  return t === 'snap' || t === 'snapshot';
}

async function markProcessed(ids: number[], asFalseAlarm = false) {
  await updateAlertProcessStatus({
    ids,
    process_status: asFalseAlarm ? 'false_alarm' : 'processed',
  });
  reload();
  cardListReload();
  createMessage.success(asFalseAlarm ? '已标记为误报' : '已标记为已处理');
}

async function markArchived(ids: number[], archiveType: UiArchiveStatus) {
  if (archiveType === 'none')
    return;
  await updateAlertArchiveStatus({
    ids,
    archive_status: archiveType,
  });
  reload();
  cardListReload();
  createMessage.success(
    archiveType === 'correct'
      ? '已标记为正确报警'
      : '已标记为错误报警',
  );
}

function clearGridSelection() {
  gridSelectedIds.value = [];
  gridSelectedRows.value = [];
}

function handleGridSelectionChange(rows: Record<string, any>[]) {
  gridSelectedRows.value = rows;
}

function getSelectedIds(): number[] {
  if (!state.isTableMode) {
    if (!gridSelectedIds.value.length) {
      createMessage.warning('请先选择报警记录');
      return [];
    }
    return [...gridSelectedIds.value];
  }

  const rows = getSelectRows?.() ?? [];
  if (!rows.length) {
    createMessage.warning('请先选择报警记录');
    return [];
  }
  return rows.map((r: any) => r.id).filter(Boolean);
}

async function handleArchiveMenuClick({ key }: { key: string }) {
  const ids = getSelectedIds();
  if (!ids.length)
    return;
  if (key === 'correct' || key === 'incorrect') {
    await markArchived(ids, key);
    clearSelectedRowKeys?.();
    clearGridSelection();
  }
}

function handleBatchPush() {
  const ids = getSelectedIds();
  if (!ids.length)
    return;
  pendingPushIds.value = ids;
  pushModalVisible.value = true;
}

async function handlePushConfirm(payload: AlertPushDraft) {
  const count = pendingPushIds.value.length;
  let targetText = '';
  if (isUserPushMode(payload)) {
    const channelText = formatChannels(payload.channels);
    const userText = formatRecipientUserIds(payload.recipient_user_ids);
    targetText = `${channelText} → ${userText}`;
  }
  else {
    const profileLabelMap = new Map(
      getPushProfiles().map(item => [item.profile_id, item.profile_name]),
    );
    targetText = formatAddressProfileIds(payload.address_profile_ids, profileLabelMap);
  }
  try {
    const result = await pushAlertEvents(pendingPushIds.value, payload);
    if (result.failed > 0 || result.sent === 0) {
      createMessage.warning(
        `推送完成：成功 ${result.sent}，失败 ${result.failed}，跳过 ${result.skipped}`,
      );
    }
    else {
      createMessage.success(
        `已按「${getPushModeLabel(payload.push_mode)}」向 ${targetText} 推送 ${count} 条报警`,
      );
    }
  }
  catch (error: any) {
    createMessage.error(error?.message || '告警推送失败');
    return;
  }
  pendingPushIds.value = [];
  clearSelectedRowKeys?.();
  clearGridSelection();
}

async function removeAlerts(ids: number[]) {
  const { succeeded, failed, total } = await deleteAlarms(ids);
  reload();
  cardListReload();
  if (failed === 0) {
    createMessage.success(total > 1 ? `已删除 ${succeeded} 条记录` : '删除成功');
    return;
  }
  if (succeeded === 0) {
    createMessage.error('删除失败');
    return;
  }
  createMessage.warning(`已删除 ${succeeded} 条，${failed} 条失败`);
}

async function handleBatchAction(action: string) {
  const ids = getSelectedIds();
  if (!ids.length)
    return;

  switch (action) {
    case 'process':
      await markProcessed(ids);
      clearSelectedRowKeys?.();
      clearGridSelection();
      break;
    case 'delete':
      await removeAlerts(ids);
      clearSelectedRowKeys?.();
      clearGridSelection();
      break;
    default:
      break;
  }
}

function handleBatchExport() {
  const rows = state.isTableMode
    ? (getSelectRows?.() ?? [])
    : gridSelectedRows.value;
  if (!rows.length) {
    createMessage.warning('请先选择要导出的记录');
    return;
  }
  exportAlertsToCsv(rows, uiState);
  createMessage.success('导出成功');
}

const handleViewImage = (record: Record<string, any>) => {
  const url = resolveAlertImageUrl(record);
  if (!url && !record.image_path) {
    createMessage.warn('告警图片不存在');
    return;
  }
  openImageModal(true, {
    image_url: url || undefined,
    image_path: record.image_path,
  });
};

let lastVideoErrorTime = 0;
let lastVideoErrorMsg = '';

const getVideoUrl = (videoUrl: string): string => {
  if (!videoUrl)
    return '';
  const normalized = String(videoUrl).replace(/\\/g, '/').trim();
  const apiBase = (import.meta.env.VITE_GLOB_API_URL || '/dev-api').replace(/\/$/, '');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const url = new URL(normalized);
      if (url.pathname.startsWith('/api/v1/buckets'))
        return `${apiBase}/video/alert/record?path=${encodeURIComponent(`${url.pathname}${url.search}`)}`;
    }
    catch {
      return normalized;
    }
    return normalized;
  }
  if (normalized.startsWith('/api/v1/buckets'))
    return `${apiBase}/video/alert/record?path=${encodeURIComponent(normalized)}`;
  if (normalized.startsWith('/video/alert/record'))
    return `${apiBase}${normalized}`;
  if (normalized.startsWith('/'))
    return `${apiBase}/video/alert/record?path=${encodeURIComponent(normalized)}`;
  return normalized;
};

const handleViewVideo = async (record: Record<string, any>) => {
  const recordPath = String(record.record_path || '').trim();
  if (!recordPath) {
    showVideoErrorOnce('?????????');
    return;
  }

  openVideoModal(true, {
    id: record.device_id || record.id,
    http_stream: getVideoUrl(recordPath),
  });
  lastVideoErrorTime = 0;
  lastVideoErrorMsg = '';
};


function showVideoErrorOnce(message: string) {
  const now = Date.now();
  if (now - lastVideoErrorTime < 3000 && lastVideoErrorMsg === message)
    return;
  lastVideoErrorTime = now;
  lastVideoErrorMsg = message;
  createMessage.warn(message);
}

function handleCardViewImage(record: Record<string, any>) {
  handleViewImage(record);
}

function handleCardViewVideo(record: Record<string, any>) {
  handleViewVideo(record);
}

function handleCardPush(record: Record<string, any>) {
  if (!record.id)
    return;
  pendingPushIds.value = [record.id];
  pushModalVisible.value = true;
}

async function handleCardUpdateProcess(record: Record<string, any>, status: UiProcessStatus) {
  if (!record.id)
    return;
  await updateAlertProcessStatus({
    ids: [record.id],
    process_status: status,
  });
  reload();
  cardListReload();
}

async function handleCardUpdateArchive(record: Record<string, any>, status: UiArchiveStatus) {
  if (!record.id)
    return;
  await updateAlertArchiveStatus({
    ids: [record.id],
    archive_status: status,
  });
  reload();
  cardListReload();
}

async function handleCardDelete(record: Record<string, any>) {
  if (!record.id)
    return;
  await removeAlerts([record.id]);
}
</script>

<style lang="less" scoped>
.alert-log-page {
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  padding: 0 4px;

  :deep(.ant-table) {
    table-layout: fixed;
    width: 100%;
  }

  :deep(.ant-table-cell-ellipsis) {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.alert-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
  flex-wrap: wrap;
}

.alert-toolbar-left,
.alert-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.snapshot-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 48px;
  margin: 0 auto;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f5f5;
  cursor: pointer;
}

.snapshot-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.snapshot-empty,
.muted-text {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
