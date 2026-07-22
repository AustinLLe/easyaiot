<template>
  <div class="alert-log-page">
    <BasicTable v-if="state.isTableMode" @register="registerTable">
      <template #toolbar>
        <div class="alert-toolbar">
          <div class="alert-toolbar-left">
            <a-button size="small" @click="handleBatchPush">推送</a-button>
            <a-button size="small" @click="handleBatchAction('process')">处理</a-button>
            <Dropdown>
              <a-button size="small">归档</a-button>
              <template #overlay>
                <Menu @click="handleArchiveMenuClick">
                  <MenuItem key="correct">正确报警</MenuItem>
                  <MenuItem key="incorrect">错误报警</MenuItem>
                </Menu>
              </template>
            </Dropdown>
            <a-button size="small" @click="handleBatchExport">导出</a-button>
            <a-button size="small" danger @click="handleBatchAction('delete')">删除</a-button>
          </div>
          <div class="alert-toolbar-right">
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
            v-if="hasRecordClip(record) || (record.device_id && record.time && !isSnapTask(record))"
            type="link"
            size="small"
            @click="handleViewVideo(record)"
          >
            播放
          </a-button>
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
              <a-button size="small" @click="handleBatchPush">推送</a-button>
              <a-button size="small" @click="handleBatchAction('process')">处理</a-button>
              <Dropdown>
                <a-button size="small">归档</a-button>
                <template #overlay>
                  <Menu @click="handleArchiveMenuClick">
                    <MenuItem key="correct">正确报警</MenuItem>
                    <MenuItem key="incorrect">错误报警</MenuItem>
                  </Menu>
                </template>
              </Dropdown>
              <a-button size="small" @click="handleBatchExport">导出</a-button>
              <a-button size="small" danger @click="handleBatchAction('delete')">删除</a-button>
            </div>
            <div class="alert-toolbar-right">
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
import { reactive, ref } from 'vue';
import { Badge, Dropdown, Menu, MenuItem, Tag } from 'ant-design-vue';
import { BasicTable, useTable } from '@/components/Table';
import { useMessage } from '@/hooks/web/useMessage';
import { extractAlertClientFilters, getBasicColumns, getFormConfig } from '../../Data';
import { queryAlarmList, queryAlertRecord } from '@/api/device/calculate';
import AlertCards from './AlertCards/index.vue';
import AlertEventPushModal from './AlertEventPushModal.vue';
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
  filterAlertsClientSide,
  getArchiveStatus,
  getProcessStatus,
  hasRecordClip,
  loadAlertUiState,
  resolveAlertImageUrl,
  resolveSeverityLevel,
  saveAlertUiState,
  type AlertUiState,
  type UiArchiveStatus,
  type UiProcessStatus,
} from '../../alertDisplayUtils';

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

function handleClickSwap() {
  state.isTableMode = !state.isTableMode;
}

const clientFilters = reactive({
  severity: null as string | null,
  process_status: null as string | null,
  archive_status: null as string | null,
});

let cardListReload = () => {};

function getMethod(m: any) {
  cardListReload = m;
}

function persistUiState() {
  saveAlertUiState(uiState);
}

const [
  registerTable,
  {
    reload,
    getSelectRows,
    clearSelectedRowKeys,
  },
] = useTable({
  canResize: false,
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
  beforeFetch: (params) => {
    const filters = extractAlertClientFilters(params);
    clientFilters.severity = filters.severity;
    clientFilters.process_status = filters.process_status;
    clientFilters.archive_status = filters.archive_status;
    return params;
  },
  afterFetch: (list) => {
    const rows = Array.isArray(list) ? list : [];
    const filtered = filterAlertsClientSide(rows, clientFilters, uiState);
    return filtered;
  },
  rowKey: 'id',
});

function isSnapTask(record: Record<string, any>) {
  const t = record.task_type;
  return t === 'snap' || t === 'snapshot';
}

function markProcessed(ids: number[], asFalseAlarm = false) {
  ids.forEach((id) => {
    uiState.process[id] = asFalseAlarm ? 'false_alarm' : 'processed';
  });
  persistUiState();
  reload();
  cardListReload();
  createMessage.success(asFalseAlarm ? '已标记为误报（仅前端）' : '已标记为已处理（仅前端）');
}

function markArchived(ids: number[], archiveType: UiArchiveStatus) {
  if (archiveType === 'none')
    return;
  ids.forEach((id) => {
    uiState.archive[id] = archiveType;
  });
  persistUiState();
  reload();
  cardListReload();
  createMessage.success(
    archiveType === 'correct'
      ? '已标记为正确报警（仅前端）'
      : '已标记为错误报警（仅前端）',
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

function handleArchiveMenuClick({ key }: { key: string }) {
  const ids = getSelectedIds();
  if (!ids.length)
    return;
  if (key === 'correct' || key === 'incorrect') {
    markArchived(ids, key);
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

function handlePushConfirm(payload: AlertPushDraft) {
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
  createMessage.success(
    `已按「${getPushModeLabel(payload.push_mode)}」向 ${targetText} 推送 ${count} 条报警（仅前端，待后端接入）`,
  );
  pendingPushIds.value = [];
  clearSelectedRowKeys?.();
  clearGridSelection();
}

function handleBatchAction(action: string) {
  const ids = getSelectedIds();
  if (!ids.length)
    return;

  switch (action) {
    case 'process':
      markProcessed(ids);
      clearSelectedRowKeys?.();
      clearGridSelection();
      break;
    case 'delete':
      createMessage.info('删除功能待后端接入，当前为界面预览');
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
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://'))
    return videoUrl;
  if (videoUrl.startsWith('/api/v1/buckets'))
    return `${window.location.origin}${videoUrl}`;
  if (videoUrl.startsWith('/'))
    return `${import.meta.env.VITE_GLOB_API_URL || ''}${videoUrl}`;
  return videoUrl;
};

const handleViewVideo = async (record: Record<string, any>) => {
  if (!record.device_id || !record.time) {
    createMessage.warn('缺少必要信息：设备ID或告警时间');
    return;
  }

  try {
    const result = await queryAlertRecord({
      device_id: record.device_id,
      alert_time: record.time,
      time_range: 60,
    });

    if (result?.video_url) {
      openVideoModal(true, {
        id: record.device_id,
        http_stream: getVideoUrl(result.video_url),
      });
      lastVideoErrorTime = 0;
      lastVideoErrorMsg = '';
    }
    else {
      showVideoErrorOnce(result?.message || '暂未找到该时间段的录像文件');
    }
  }
  catch (error: any) {
    const errorData = error?.response?.data || error?.data;
    if (errorData?.code === 400) {
      showVideoErrorOnce(errorData.message || '暂未找到该时间段的录像文件');
    }
    else {
      showVideoErrorOnce(error?.response?.data?.message || error?.message || '查询录像失败，请稍后重试');
    }
  }
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

function handleCardUpdateProcess(record: Record<string, any>, status: UiProcessStatus) {
  if (!record.id)
    return;
  if (status === 'pending')
    delete uiState.process[record.id];
  else
    uiState.process[record.id] = status === 'false_alarm' ? 'false_alarm' : 'processed';
  persistUiState();
  reload();
  cardListReload();
}

function handleCardUpdateArchive(record: Record<string, any>, status: UiArchiveStatus) {
  if (!record.id)
    return;
  if (status === 'none')
    delete uiState.archive[record.id];
  else
    uiState.archive[record.id] = status;
  persistUiState();
  reload();
  cardListReload();
}

function handleCardDelete(_record: Record<string, any>) {
  createMessage.info('删除功能待后端接入，当前为界面预览');
}
</script>

<style lang="less" scoped>
.alert-log-page {
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
