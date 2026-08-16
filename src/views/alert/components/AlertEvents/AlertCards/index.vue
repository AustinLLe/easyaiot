<template>
  <div class="alert-card-list-wrapper">
    <div class="alert-card-list-form p-4">
      <BasicForm @register="registerForm" @reset="handleSubmit" />
    </div>

    <div class="alert-card-list-body">
      <Spin :spinning="state.loading">
        <List
          :split="false"
          :grid="{ gutter: 15, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 3 }"
          :data-source="data"
          :pagination="paginationProp"
        >
          <template #header>
            <div class="list-header">
              <div class="list-header__actions">
                <slot name="header" />
              </div>
            </div>
          </template>

          <template #renderItem="{ item }">
            <ListItem class="alert-card-item">
              <article class="alert-capability-card">
                <Checkbox
                  class="card-select"
                  :checked="isSelected(item.id)"
                  @change="(e) => toggleSelect(item, e.target.checked)"
                />
                <div class="card-top">
                  <div class="card-image" @click="handleViewImage(item)">
                    <img
                      v-if="isSnapshotVisible(item)"
                      :src="getSnapshotUrl(item)"
                      alt="报警截图"
                      @error="() => markSnapshotBroken(item.id)"
                    />
                    <span v-else class="snapshot-empty">无截图</span>
                  </div>
                  <div class="card-head">
                    <div class="card-title-row">
                      <h3 class="card-title" :title="item.event || '未知事件'">
                        {{ item.event || '未知事件' }}
                      </h3>
                      <i
                        class="card-severity"
                        :class="`card-severity--${resolveSeverityLevel(item).color}`"
                      >
                        {{ resolveSeverityLevel(item).label }}
                      </i>
                    </div>
                    <div class="alert-meta">
                      <div class="alert-meta__line">
                        <span class="alert-meta__label">摄像头</span>
                        <span class="alert-meta__text">{{ item.device_name || '--' }}</span>
                      </div>
                      <div class="alert-meta__line">
                        <span class="alert-meta__label">报警规则</span>
                        <span class="alert-meta__text">{{ resolveRuleName(item) }}</span>
                      </div>
                      <div class="alert-meta__line">
                        <span class="alert-meta__label">报警描述</span>
                        <span class="alert-meta__text">{{ resolveAlertDescription(item) }}</span>
                      </div>
                      <div class="alert-meta__line">
                        <span class="alert-meta__label">报警时间</span>
                        <span class="alert-meta__text">{{ formatTime(item.time) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="card-action-row">
                  <div class="card-status-row">
                    <div class="alert-meta__line">
                      <label class="alert-meta__label" :for="`alert-process-${item.id}`">处理状态</label>
                      <Select
                        :id="`alert-process-${item.id}`"
                        size="small"
                        :bordered="false"
                        class="status-select"
                        :value="getProcessStatus(item, uiState).value"
                        :options="PROCESS_STATUS_OPTIONS"
                        :get-popup-container="getPopupContainer"
                        @click.stop
                        @change="(val) => onProcessChange(item, val as UiProcessStatus)"
                      />
                    </div>
                    <div class="alert-meta__line">
                      <label class="alert-meta__label" :for="`alert-archive-${item.id}`">归档状态</label>
                      <Select
                        :id="`alert-archive-${item.id}`"
                        size="small"
                        :bordered="false"
                        class="status-select"
                        :value="getArchiveStatus(item, uiState).value"
                        :options="ARCHIVE_STATUS_OPTIONS"
                        :get-popup-container="getPopupContainer"
                        @click.stop
                        @change="(val) => onArchiveChange(item, val as UiArchiveStatus)"
                      />
                    </div>
                  </div>
                  <div class="card-action-btns">
                    <button
                      type="button"
                      class="card-action-btn"
                      :class="{ 'card-action-btn--disabled': !canViewVideo(item) }"
                      :title="getVideoButtonTitle(item)"
                      @click="handleViewVideo(item)"
                    >
                      播放
                    </button>
                    <button type="button" class="card-action-btn" @click="onPush(item)">
                      推送
                    </button>
                    <Popconfirm title="是否确认删除？" ok-text="是" cancel-text="否" @confirm="onDelete(item)">
                      <button type="button" class="card-action-btn" @click.stop>
                        删除
                      </button>
                    </Popconfirm>
                  </div>
                </div>
              </article>
            </ListItem>
          </template>
        </List>
      </Spin>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { usePermission } from '@/hooks/web/usePermission';
import { Checkbox, List, Popconfirm, Select, Spin } from 'ant-design-vue';
import { BasicForm, useForm } from '@/components/Form';
import { propTypes } from '@/utils/propTypes';
import { isFunction } from '@/utils/is';
import { useMessage } from '@/hooks/web/useMessage';
import moment from 'moment';
import { extractAlertClientFilters, getFormConfig } from '@/views/alert/Data';
import {
  getArchiveStatus,
  getProcessStatus,
  getRecordClipStatus,
  resolveAlertDescription,
  resolveAlertImageUrl,
  resolveRuleName,
  resolveSeverityLevel,
  type AlertUiState,
  type UiArchiveStatus,
  type UiProcessStatus,
} from '@/views/alert/alertDisplayUtils';

const PROCESS_STATUS_OPTIONS = [
  { value: 'pending', label: '未处理' },
  { value: 'processed', label: '已处理' },
];

const ARCHIVE_STATUS_OPTIONS = [
  { value: 'none', label: '暂未归档' },
  { value: 'correct', label: '正确报警' },
  { value: 'incorrect', label: '错误报警' },
];

const ListItem = List.Item;

const props = defineProps({
  params: propTypes.object.def({}),
  api: propTypes.func,
  uiState: {
    type: Object as () => AlertUiState,
    default: () => ({ process: {}, archive: {} }),
  },
});

const selectedIds = defineModel<number[]>('selectedIds', { default: () => [] });

const emit = defineEmits<{
  getMethod: [reload: () => void];
  viewImage: [record: Record<string, any>];
  viewVideo: [record: Record<string, any>];
  selectionChange: [records: Record<string, any>[]];
  push: [record: Record<string, any>];
  updateProcess: [record: Record<string, any>, status: UiProcessStatus];
  updateArchive: [record: Record<string, any>, status: UiArchiveStatus];
  delete: [record: Record<string, any>];
}>();

const { createMessage } = useMessage();
const { runWithPermission } = usePermission();

const onProcessChange = (item: Record<string, any>, val: UiProcessStatus) => {
  runWithPermission('alert:events:process', () => emit('updateProcess', item, val));
};
const onArchiveChange = (item: Record<string, any>, val: UiArchiveStatus) => {
  runWithPermission('alert:events:archive', () => emit('updateArchive', item, val));
};
const onPush = (item: Record<string, any>) => runWithPermission('alert:events:push', () => emit('push', item));
const onDelete = (item: Record<string, any>) => runWithPermission('alert:events:delete', () => emit('delete', item));

const data = ref<Record<string, any>[]>([]);
const state = reactive({
  loading: true,
});
const lastSearchParams = ref<Record<string, any>>({});
const brokenSnapshotIds = ref<Set<number>>(new Set());

const [registerForm, { validate }] = useForm({
  ...getFormConfig(),
  showAdvancedButton: false,
  autoSubmitOnEnter: true,
  submitFunc: handleSubmit,
});

watch(selectedIds, () => {
  syncSelectionChange();
}, { deep: true });

function syncSelectionChange() {
  const idSet = new Set(selectedIds.value);
  emit('selectionChange', data.value.filter(item => idSet.has(item.id)));
}

function isSelected(id: number) {
  return selectedIds.value.includes(id);
}

function toggleSelect(item: Record<string, any>, checked: boolean) {
  const id = item.id;
  if (!id)
    return;
  if (checked) {
    if (!selectedIds.value.includes(id))
      selectedIds.value = [...selectedIds.value, id];
  }
  else {
    selectedIds.value = selectedIds.value.filter(selectedId => selectedId !== id);
  }
}

async function handleSubmit() {
  page.value = 1;
  const formData = await validate();
  await fetch(formData);
}

onMounted(() => {
  fetch();
  emit('getMethod', fetch);
});

async function fetch(p?: Record<string, any>) {
  const { api, params } = props;
  if (api && isFunction(api)) {
    if (p && Object.keys(p).length > 0)
      lastSearchParams.value = { ...p };
    try {
      state.loading = true;
      const apiParams = { ...lastSearchParams.value };
      extractAlertClientFilters(apiParams);
      const res = await api({ ...params, pageNo: page.value, pageSize: pageSize.value, ...apiParams });
      const list = Array.isArray(res?.alert_list) ? res.alert_list : [];
      data.value = list;
      brokenSnapshotIds.value = new Set();
      total.value = res.total || 0;
      const visibleIds = new Set(data.value.map(item => item.id));
      selectedIds.value = selectedIds.value.filter(id => visibleIds.has(id));
      syncSelectionChange();
    }
    catch (error) {
      console.error('获取数据失败:', error);
      data.value = [];
      total.value = 0;
      selectedIds.value = [];
      syncSelectionChange();
    }
    finally {
      hideLoading();
    }
  }
}

function hideLoading() {
  state.loading = false;
}

const page = ref(1);
const pageSize = ref(9);
const total = ref(0);
const paginationProp = ref({
  showSizeChanger: false,
  showQuickJumper: true,
  pageSize,
  current: page,
  total,
  showTotal: (totalCount: number) => `总 ${totalCount} 条`,
  onChange: pageChange,
  onShowSizeChange: pageSizeChange,
});

function pageChange(p: number, pz: number) {
  page.value = p;
  pageSize.value = pz;
  fetch();
}

function pageSizeChange(_current: number, size: number) {
  pageSize.value = size;
  fetch();
}

function formatTime(time: string) {
  if (!time)
    return '-';
  return moment(time).format('YYYY-MM-DD HH:mm:ss');
}

function getTaskType(item: Record<string, any>): string | null {
  let taskType = null;
  if (item.information) {
    if (typeof item.information === 'object' && item.information.task_type) {
      taskType = item.information.task_type;
    }
    else if (typeof item.information === 'string') {
      try {
        const info = JSON.parse(item.information);
        taskType = info?.task_type;
      }
      catch {
        // ignore
      }
    }
  }
  if (!taskType && item.task_type)
    taskType = item.task_type;
  return taskType;
}

function isSnapTask(item: Record<string, any>): boolean {
  const taskType = getTaskType(item);
  return taskType === 'snap' || taskType === 'snapshot';
}

function canViewVideo(item: Record<string, any>) {
  return getRecordClipStatus(item) === 'ready' && !!(item.device_id && item.time && !isSnapTask(item));
}

function getVideoButtonTitle(item: Record<string, any>) {
  const status = getRecordClipStatus(item);
  if (status === 'generating')
    return '录像生成中';
  if (status === 'failed')
    return '录像生成失败';
  if (status === 'ready')
    return '查看录像';
  return '暂无视频';
}

function handleViewImage(record: Record<string, any>) {
  if (!record.image_url && !record.image_path) {
    createMessage.warn('告警图片不存在');
    return;
  }
  emit('viewImage', record);
}

function handleViewVideo(record: Record<string, any>) {
  if (!canViewVideo(record)) {
    createMessage.warn(getVideoButtonTitle(record));
    return;
  }
  emit('viewVideo', record);
}

function getPopupContainer() {
  return document.body;
}

function getSnapshotUrl(item: Record<string, any>): string {
  return resolveAlertImageUrl(item);
}

function markSnapshotBroken(id: number) {
  if (!id)
    return;
  brokenSnapshotIds.value = new Set([...brokenSnapshotIds.value, id]);
}

function isSnapshotVisible(item: Record<string, any>) {
  return !!getSnapshotUrl(item) && !brokenSnapshotIds.value.has(item.id);
}
</script>

<style lang="less" scoped>
@card-brand: #2457a7;
@card-border: #e1e7f0;
@card-muted: #778397;

.alert-card-list-wrapper {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overflow-x: hidden;

  :deep(.ant-form) {
    background: transparent;
  }

  :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  :deep(.ant-row) {
    align-items: center;
  }

  :deep(.ant-input),
  :deep(.ant-input-affix-wrapper),
  :deep(.ant-select-selector),
  :deep(.ant-picker) {
    background-color: #fff !important;
  }

  :deep(.ant-list-header) {
    padding-top: 0;
    padding-bottom: 12px;
    background: transparent;
    border-block-end: 0;
  }

  :deep(.ant-list) {
    padding: 0;
    background: transparent;
    overflow-x: hidden;
  }

  :deep(.ant-list-grid .ant-row) {
    row-gap: 15px;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  :deep(.ant-list-grid .ant-col) {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  :deep(.alert-card-item) {
    margin: 0;
    padding: 0;
    border-block-end: none !important;
  }

  :deep(.ant-list-pagination) {
    margin: 12px 16px 16px;
    text-align: right;
  }
}

.alert-card-list-form {
  flex-shrink: 0;
  margin-bottom: 10px;
}

.alert-card-list-body {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.list-header {
  display: flex;
  align-items: center;
  width: 100%;

  &__actions {
    width: 100%;
  }
}

.alert-capability-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 19px 19px 19px 42px;
  background: #fff;
  border: 1px solid @card-border;
  border-radius: 15px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    border-color: #cfd8e6;
    box-shadow: 0 6px 18px rgb(36 87 167 / 6%);
  }
}

.card-select {
  position: absolute;
  top: 19px;
  left: 12px;
  z-index: 2;
}

.card-top {
  display: flex;
  align-items: stretch;
  gap: 16px;
  min-width: 0;
}

.card-image {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 168px;
  min-height: 128px;
  overflow: hidden;
  border-radius: 12px;
  background: #f5f7fb;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .snapshot-empty {
    color: @card-muted;
    font-size: 12px;
  }
}

.card-head {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.card-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: #26354e;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-severity {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 5px;
  font-size: 10px;
  font-style: normal;
  font-weight: 600;
  line-height: 1.4;
}

.card-severity--red {
  background: rgb(220 38 38 / 8%);
  color: #dc2626;
}

.card-severity--orange {
  background: rgb(234 88 12 / 8%);
  color: #ea580c;
}

.card-severity--gold {
  background: rgb(36 87 167 / 8%);
  color: @card-brand;
}

.alert-meta {
  display: grid;
  gap: 8px;
}

.alert-meta__line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.alert-meta__label {
  flex-shrink: 0;
  color: @card-muted;
  font-size: 12px;
  line-height: 1.5;
}

.alert-meta__text {
  min-width: 0;
  overflow: hidden;
  color: #435169;
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-select {
  flex: 1;
  min-width: 0;
  max-width: 120px;

  :deep(.ant-select-selector) {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 18px !important;
  }

  :deep(.ant-select-selection-item) {
    padding-inline-end: 14px !important;
    color: #435169;
    font-size: 12px;
    line-height: 18px;
  }

  :deep(.ant-select-arrow) {
    right: 0;
    font-size: 10px;
    color: @card-muted;
  }
}

.card-action-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px solid #edf0f5;
}

.card-status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  min-width: 0;
}

.card-action-btns {
  display: flex;
  flex-shrink: 0;
  flex-wrap: nowrap;
  gap: 8px 12px;
  align-items: center;
}

.card-action-btn {
  display: inline-flex;
  align-items: center;
  padding: 0;
  color: @card-brand;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  background: none;
  border: 0;

  &:hover {
    opacity: 0.82;
  }

  &--disabled {
    color: #9aa6b8;
    cursor: not-allowed;

    &:hover {
      opacity: 1;
    }
  }
}

:deep(.ant-popconfirm) {
  display: inline-flex;
}
</style>
