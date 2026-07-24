<template>
  <div class="alert-card-list-wrapper p-2">
    <div class="p-4 bg-white" style="margin-bottom: 10px">
      <BasicForm @register="registerForm" />
    </div>

    <div class="p-2 bg-white">
      <Spin :spinning="state.loading">
        <List
          :split="false"
          :grid="{ gutter: 2, xs: 1, sm: 2, md: 4, lg: 4, xl: 4, xxl: 4 }"
          :data-source="data"
          :pagination="paginationProp"
        >
          <template #header>
            <div
              style="display: flex;align-items: center;justify-content: space-between;flex-direction: row;"
            >
              <span style="padding-left: 7px;font-size: 16px;font-weight: 500;line-height: 24px;"
                >报警记录</span
              >
              <div class="space-x-2">
                <slot name="header"></slot>
              </div>
            </div>
          </template>

          <template #renderItem="{ item }">
            <ListItem class="alert-item normal">
              <Checkbox
                class="card-select"
                :checked="isSelected(item.id)"
                @change="(e) => toggleSelect(item, e.target.checked)"
              />

              <div class="card-inner">
                <div class="alert-img-left" @click="handleViewImage(item)">
                  <img
                    v-if="isSnapshotVisible(item)"
                    :src="getSnapshotUrl(item)"
                    alt="报警截图"
                    class="img"
                    @error="() => markSnapshotBroken(item.id)"
                  />
                  <span v-else class="snapshot-empty">无截�?/span>
                </div>

                <div class="alert-info-main">
                  <div class="title-row">
                    <div class="title o2">{{ item.event || '未知事件' }}</div>
                    <Tag :color="resolveSeverityLevel(item).color" class="severity-tag">
                      {{ resolveSeverityLevel(item).label }}
                    </Tag>
                  </div>
                  <div class="meta-line">
                    <span class="meta-label">摄像头：</span>
                    <span class="meta-value">{{ item.device_name || '-' }}</span>
                  </div>
                  <div class="meta-line">
                    <span class="meta-label">报警规则�?/span>
                    <span class="meta-value">{{ resolveRuleName(item) }}</span>
                  </div>
                  <div class="meta-line">
                    <span class="meta-label">报警描述�?/span>
                    <span class="meta-value meta-desc">{{ resolveAlertDescription(item) }}</span>
                  </div>
                  <div class="meta-line">
                    <span class="meta-label">报警时间�?/span>
                    <span class="meta-value">{{ formatTime(item.time) }}</span>
                  </div>
                  <div class="meta-line meta-status">
                    <span class="meta-label">处理状态：</span>
                    <Select
                      size="small"
                      :bordered="false"
                      class="status-select"
                      :value="getProcessStatus(item, uiState).value"
                      :options="PROCESS_STATUS_OPTIONS"
                      :get-popup-container="getPopupContainer"
                      @click.stop
                      @change="(val) => emit('updateProcess', item, val as UiProcessStatus)"
                    />
                  </div>
                  <div class="meta-line meta-status">
                    <span class="meta-label">归档状态：</span>
                    <Select
                      size="small"
                      :bordered="false"
                      class="status-select"
                      :value="getArchiveStatus(item, uiState).value"
                      :options="ARCHIVE_STATUS_OPTIONS"
                      :get-popup-container="getPopupContainer"
                      @click.stop
                      @change="(val) => emit('updateArchive', item, val as UiArchiveStatus)"
                    />
                  </div>

                  <div class="card-actions-wrap">
                    <div class="btns">
                    <div
                      class="btn"
                      :class="{ disabled: !canViewVideo(item) }"
                      title="查看录像"
                      @click="handleViewVideo(item)"
                    >
                      <Icon icon="ant-design:play-circle-outlined" :size="15" color="#3B82F6" />
                    </div>
                    <div class="btn" title="推�? @click="emit('push', item)">
                      <Icon icon="ant-design:send-outlined" :size="15" color="#3B82F6" />
                    </div>
                    <Popconfirm
                      title="是否确认删除�?
                      ok-text="�?
                      cancel-text="�?
                      @confirm="emit('delete', item)"
                    >
                      <div class="btn" title="删除">
                        <Icon icon="material-symbols:delete-outline-rounded" :size="15" color="#DC2626" />
                      </div>
                    </Popconfirm>
                    </div>
                  </div>
                </div>
              </div>
            </ListItem>
          </template>
        </List>
      </Spin>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { Checkbox, List, Popconfirm, Select, Spin, Tag } from 'ant-design-vue';
import { BasicForm, useForm } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { propTypes } from '@/utils/propTypes';
import { isFunction } from '@/utils/is';
import { useMessage } from '@/hooks/web/useMessage';
import moment from 'moment';
import { extractAlertClientFilters, getFormConfig } from '@/views/alert/Data';
import {
  filterAlertsClientSide,
  getArchiveStatus,
  getProcessStatus,
  resolveAlertDescription,
  resolveAlertImageUrl,
  resolveRuleName,
  resolveSeverityLevel,
  type AlertUiState,
  type UiArchiveStatus,
  type UiProcessStatus,
} from '@/views/alert/alertDisplayUtils';

const PROCESS_STATUS_OPTIONS = [
  { value: 'pending', label: '未处�? },
  { value: 'processed', label: '已处�? },
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

const data = ref<Record<string, any>[]>([]);
const state = reactive({
  loading: true,
});
const lastSearchParams = ref<Record<string, any>>({});
const brokenSnapshotIds = ref<Set<number>>(new Set());

const [registerForm, { validate }] = useForm({
  ...getFormConfig(),
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
      const clientFilters = extractAlertClientFilters(apiParams);
      const res = await api({ ...params, pageNo: page.value, pageSize: pageSize.value, ...apiParams });
      const list = Array.isArray(res?.alert_list) ? res.alert_list : [];
      data.value = filterAlertsClientSide(list, clientFilters, props.uiState);
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
const pageSize = ref(7);
const total = ref(0);
const paginationProp = ref({
  showSizeChanger: false,
  showQuickJumper: true,
  pageSize,
  current: page,
  total,
  showTotal: (totalCount: number) => `�?${totalCount} 条`,
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
  return !!(item.device_id && item.time && !isSnapTask(item));
}

function handleViewImage(record: Record<string, any>) {
  if (!record.image_url && !record.image_path) {
    createMessage.warn('告警图片不存�?);
    return;
  }
  emit('viewImage', record);
}

function handleViewVideo(record: Record<string, any>) {
  if (!canViewVideo(record)) {
    createMessage.warn('缺少必要信息：设备ID或告警时�?);
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
.alert-card-list-wrapper {
  :deep(.ant-list-header) {
    border-block-end: 0;
    padding-top: 0;
    padding-bottom: 8px;
  }

  :deep(.ant-list) {
    padding: 8px;
  }

  :deep(.ant-list-item) {
    margin: 8px;
    border-block-end: none !important;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-4px);
    }
  }

  :deep(.alert-item) {
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    padding: 12px 16px;
    position: relative;
    background-color: #fff;
    background-repeat: no-repeat;
    background-position: center center;
    background-size: 104% 104%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    min-height: 200px;
    height: 100%;
    border: 1px solid rgba(0, 0, 0, 0.06);

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
      border-color: rgba(59, 130, 246, 0.2);
    }

    &.normal {
      background-image: url('@/assets/images/product/blue-bg.719b437a.png');
    }

    &.error {
      background-image: url('@/assets/images/product/red-bg.101af5ac.png');
    }
  }
}

.card-select {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
}

.card-inner {
  display: flex;
  gap: 16px;
  align-items: stretch;
  height: 100%;
  padding-left: 22px;
  min-height: 100px;
}

.alert-img-left {
  flex-shrink: 0;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  cursor: pointer;

  .img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .snapshot-empty {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
}

.alert-info-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-top: 2px;
  padding-bottom: 0;
  min-height: 100px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.title {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  color: #050708;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.severity-tag {
  flex-shrink: 0;
  margin: 0;
  font-size: 12px;
  line-height: 20px;
}

.meta-line {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  line-height: 18px;
  margin-bottom: 5px;
}

.meta-label {
  flex-shrink: 0;
  color: #8b8b8b;
}

.meta-value {
  min-width: 0;
  color: #4b5563;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-status {
  justify-content: space-between;
}

.meta-status:last-of-type {
  margin-bottom: 4px;
}

.card-actions-wrap {
  margin-top: auto;
  align-self: flex-start;
  padding-top: 10px;
  background: #fff;
  border-radius: 0 0 8px 8px;
}

.status-select {
  flex: 1;
  max-width: 120px;
  margin-left: auto;

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
    color: #4b5563;
    font-size: 13px;
    line-height: 18px;
  }

  :deep(.ant-select-arrow) {
    right: 0;
    font-size: 10px;
    color: #666;
  }
}

.btns {
  display: flex;
  width: fit-content;
  height: 28px;
  box-sizing: border-box;
  border-radius: 45px;
  justify-content: space-around;
  padding: 0 10px;
  align-items: center;
  overflow: hidden;
  border: 2px solid #266cfbff;

  :deep(.ant-popconfirm) {
    display: inline-flex;
    align-items: center;
    line-height: 1;
  }

  .btn {
    width: 28px;
    height: 100%;
    text-align: center;
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;

    & + .btn {
      border-left: 1px solid #e2e2e2;
    }

    &.disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }
  }
}
</style>
