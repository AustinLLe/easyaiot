<template>
  <div :class="['camera-picker-panel', { embedded }]" @mousedown.stop>
    <div class="camera-toolbar">
      <span class="toolbar-title">摄像头列�?/span>
      <a-input-search
        v-model:value="searchText"
        placeholder="搜索当前分组摄像�?
        allow-clear
        class="toolbar-search"
      />
    </div>

    <div class="camera-body">
      <div class="group-panel">
        <a-spin :spinning="loadingGroups">
          <div
            v-for="group in visibleGroups"
            :key="group.key"
            :class="['group-item', { active: selectedGroupKey === group.key }]"
            :style="{ paddingLeft: `${12 + group.level * 16}px` }"
            @click="handleSelectGroup(group.key)"
          >
            <span
              v-if="group.hasChildren"
              class="group-expand"
              @click.stop="handleToggleExpand(group.directoryId!)"
            >
              <CaretRightOutlined :class="{ expanded: isExpanded(group.directoryId!) }" />
            </span>
            <span v-else class="group-expand-placeholder" />
            <span class="group-label">{{ group.label }}</span>
          </div>
        </a-spin>
      </div>

      <div class="device-panel">
        <div v-if="!singleSelect" class="device-panel-header">
          <div class="select-all" @click="toggleSelectAll">
            <span :class="['select-box', { checked: allChecked, indeterminate: indeterminate && !allChecked }]">
              <CheckOutlined v-if="allChecked" class="select-check" />
              <span v-else-if="indeterminate" class="select-dash" />
            </span>
            <span>全�?/span>
          </div>
          <span class="selected-count">已�?{{ selectedDeviceIds.length }} �?/span>
        </div>

        <a-spin :spinning="loadingDevices">
          <div v-if="filteredDevices.length" class="device-list">
            <div
              v-for="device in filteredDevices"
              :key="normalizeDeviceId(device.id)"
              :class="['device-row', { selected: isDeviceSelected(device.id) }]"
              @click="toggleDevice(normalizeDeviceId(device.id))"
            >
              <span :class="['select-box', { checked: isDeviceSelected(device.id) }]">
                <CheckOutlined v-if="isDeviceSelected(device.id)" class="select-check" />
              </span>
              <span class="device-name">{{ device.name || device.id }}</span>
              <a-button
                type="text"
                size="small"
                class="preview-btn"
                title="预览�?
                @click.stop="handlePreview(device)"
              >
                <VideoCameraOutlined />
              </a-button>
            </div>
          </div>
          <a-empty v-else description="当前分组暂无摄像�? />
        </a-spin>
      </div>
    </div>

    <div v-if="!embedded || !singleSelect" class="picker-footer">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </div>

    <DialogPlayer @register="registerPlayerModal" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { CaretRightOutlined, CheckOutlined, VideoCameraOutlined } from '@ant-design/icons-vue';
import {
  getDeviceList,
  getDirectoryDevices,
  getDirectoryList,
  type DeviceDirectory,
  type DeviceInfo,
} from '@/api/device/camera';
import DialogPlayer from '@/components/VideoPlayer/DialogPlayer.vue';
import { useModal } from '@/components/Modal';
import { useMessage } from '@/hooks/web/useMessage';
import { normalizeDeviceId, unwrapList } from '../../utils/taskUtils';

defineOptions({ name: 'CameraPickerPanel' });

const props = defineProps<{
  initialSelectedIds?: string[];
  embedded?: boolean;
  singleSelect?: boolean;
  /** �?true 时单选只更新选中态，不自�?emit confirm（由父级点确定再读取�?*/
  deferConfirm?: boolean;
}>();

const emit = defineEmits<{
  confirm: [devices: DeviceInfo[]];
  cancel: [];
  select: [devices: DeviceInfo[]];
}>();

const open = defineModel<boolean>('open', { default: false });

const ALL_GROUP_KEY = '__all__';

interface DisplayGroup {
  key: string;
  label: string;
  directoryId: number | null;
  level: number;
  hasChildren: boolean;
}

const { createMessage } = useMessage();
const [registerPlayerModal, { openModal: openPlayerModal }] = useModal();

const loadingGroups = ref(false);
const loadingDevices = ref(false);
const searchText = ref('');
const selectedGroupKey = ref(ALL_GROUP_KEY);
const directoryTree = ref<DeviceDirectory[]>([]);
const expandedDirectoryIds = ref<Set<number>>(new Set());
const currentDevices = ref<DeviceInfo[]>([]);
const selectedDeviceIds = ref<string[]>([]);
const selectedDeviceMap = ref<Map<string, DeviceInfo>>(new Map());
const allDevicesCache = ref<DeviceInfo[]>([]);
const dataLoaded = ref(false);

function buildVisibleGroups(
  directories: DeviceDirectory[],
  expandedIds: Set<number>,
  level = 0,
): DisplayGroup[] {
  const result: DisplayGroup[] = [];

  for (const dir of directories) {
    const hasChildren = !!(dir.children && dir.children.length > 0);
    result.push({
      key: `dir_${dir.id}`,
      label: dir.name,
      directoryId: dir.id,
      level,
      hasChildren,
    });

    if (hasChildren && expandedIds.has(dir.id))
      result.push(...buildVisibleGroups(dir.children!, expandedIds, level + 1));
  }

  return result;
}

const visibleGroups = computed<DisplayGroup[]>(() => [
  {
    key: ALL_GROUP_KEY,
    label: '全部设备',
    directoryId: null,
    level: 0,
    hasChildren: false,
  },
  ...buildVisibleGroups(directoryTree.value, expandedDirectoryIds.value),
]);

const filteredDevices = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  if (!keyword)
    return currentDevices.value;

  return currentDevices.value.filter((device) => {
    const name = (device.name || device.id || '').toLowerCase();
    return name.includes(keyword);
  });
});

const filteredDeviceIds = computed(() =>
  filteredDevices.value.map(device => normalizeDeviceId(device.id)),
);

const allChecked = computed(() => {
  if (!filteredDeviceIds.value.length)
    return false;
  return filteredDeviceIds.value.every(id => selectedDeviceIds.value.includes(id));
});

const indeterminate = computed(() => {
  if (!filteredDeviceIds.value.length)
    return false;
  const selectedCount = filteredDeviceIds.value.filter(id => selectedDeviceIds.value.includes(id)).length;
  return selectedCount > 0 && selectedCount < filteredDeviceIds.value.length;
});

function isDeviceSelected(id: string | number) {
  return selectedDeviceIds.value.includes(normalizeDeviceId(id));
}

function isExpanded(directoryId: number) {
  return expandedDirectoryIds.value.has(directoryId);
}

function handleToggleExpand(directoryId: number) {
  const next = new Set(expandedDirectoryIds.value);
  if (next.has(directoryId))
    next.delete(directoryId);
  else
    next.add(directoryId);
  expandedDirectoryIds.value = next;
}

function handleSelectGroup(groupKey: string) {
  if (selectedGroupKey.value === groupKey)
    return;
  selectedGroupKey.value = groupKey;
  searchText.value = '';
}

function rememberSelectedDevice(device: DeviceInfo) {
  selectedDeviceMap.value.set(normalizeDeviceId(device.id), device);
}

function forgetSelectedDevice(id: string) {
  selectedDeviceMap.value.delete(id);
}

function toggleDevice(id: string) {
  if (props.singleSelect) {
    const device = currentDevices.value.find(item => normalizeDeviceId(item.id) === id)
      || filteredDevices.value.find(item => normalizeDeviceId(item.id) === id);
    selectedDeviceIds.value = [id];
    selectedDeviceMap.value = new Map();
    if (device)
      rememberSelectedDevice(device);
    const selected = buildSelectedDevices();
    if (props.deferConfirm)
      emit('select', selected);
    else
      emit('confirm', selected);
    return;
  }

  const next = new Set(selectedDeviceIds.value);
  if (next.has(id)) {
    next.delete(id);
    forgetSelectedDevice(id);
  }
  else {
    next.add(id);
    const device = currentDevices.value.find(item => normalizeDeviceId(item.id) === id)
      || filteredDevices.value.find(item => normalizeDeviceId(item.id) === id);
    if (device)
      rememberSelectedDevice(device);
  }
  selectedDeviceIds.value = [...next];
}

function handleSelectAll(checked: boolean) {
  const next = new Set(selectedDeviceIds.value);
  if (checked) {
    filteredDevices.value.forEach((device) => {
      const id = normalizeDeviceId(device.id);
      next.add(id);
      rememberSelectedDevice(device);
    });
  }
  else {
    filteredDeviceIds.value.forEach((id) => {
      next.delete(id);
      forgetSelectedDevice(id);
    });
  }
  selectedDeviceIds.value = [...next];
}

function toggleSelectAll() {
  if (!filteredDeviceIds.value.length)
    return;
  handleSelectAll(!allChecked.value);
}

function handlePreview(device: DeviceInfo) {
  const httpStream = device.http_stream || device.ai_http_stream;
  if (!httpStream) {
    createMessage.warning('该摄像头暂无可用流地址，请先在流媒体中开启转�?);
    return;
  }

  openPlayerModal(true, {
    ...device,
    http_stream: httpStream,
  });
}

async function loadDirectoryTree() {
  loadingGroups.value = true;
  try {
    const response = await getDirectoryList();
    directoryTree.value = unwrapList<DeviceDirectory>(response);
  }
  catch (error) {
    console.error('加载目录列表失败', error);
    directoryTree.value = [];
  }
  finally {
    loadingGroups.value = false;
  }
}

async function loadDevicesByGroup(groupKey: string) {
  loadingDevices.value = true;
  try {
    if (groupKey === ALL_GROUP_KEY) {
      const response = await getDeviceList({ pageNo: 1, pageSize: 1000 });
      currentDevices.value = unwrapList<DeviceInfo>(response);
      return;
    }

    const directoryId = Number(groupKey.replace('dir_', ''));
    if (!Number.isFinite(directoryId)) {
      currentDevices.value = [];
      return;
    }

    const response = await getDirectoryDevices(directoryId, {
      pageNo: 1,
      pageSize: 1000,
    });
    currentDevices.value = unwrapList<DeviceInfo>(response);
  }
  catch (error) {
    console.error('加载摄像头列表失�?, error);
    currentDevices.value = [];
  }
  finally {
    loadingDevices.value = false;
  }
}

async function loadAllDevicesCache() {
  try {
    const response = await getDeviceList({ pageNo: 1, pageSize: 1000 });
    allDevicesCache.value = unwrapList<DeviceInfo>(response);
  }
  catch {
    allDevicesCache.value = [];
  }
}

async function initPanelData() {
  selectedDeviceIds.value = [...(props.initialSelectedIds || [])].map(String);
  searchText.value = '';
  selectedGroupKey.value = ALL_GROUP_KEY;

  if (!dataLoaded.value) {
    await Promise.all([
      loadDirectoryTree(),
      loadAllDevicesCache(),
      loadDevicesByGroup(ALL_GROUP_KEY),
    ]);
    dataLoaded.value = true;
  }
  else {
    await loadDevicesByGroup(ALL_GROUP_KEY);
  }

  syncSelectedDeviceMap();
}

function syncSelectedDeviceMap() {
  const deviceMap = new Map(allDevicesCache.value.map(device => [normalizeDeviceId(device.id), device]));
  const nextMap = new Map<string, DeviceInfo>();

  for (const id of selectedDeviceIds.value) {
    const device = selectedDeviceMap.value.get(id)
      || deviceMap.get(id)
      || currentDevices.value.find(item => normalizeDeviceId(item.id) === id);
    if (device)
      nextMap.set(id, device);
  }

  selectedDeviceMap.value = nextMap;
}

function buildSelectedDevices() {
  const deviceMap = new Map(allDevicesCache.value.map(device => [normalizeDeviceId(device.id), device]));

  return selectedDeviceIds.value.map((id) => {
    const normalized = String(id);
    return selectedDeviceMap.value.get(normalized)
      || deviceMap.get(normalized)
      || currentDevices.value.find(device => normalizeDeviceId(device.id) === normalized)
      || { id: normalized, name: normalized } as DeviceInfo;
  });
}

function handleConfirm() {
  emit('confirm', buildSelectedDevices());
  open.value = false;
}

function handleCancel() {
  emit('cancel');
  open.value = false;
}

watch(open, (visible) => {
  if (visible)
    initPanelData();
}, { immediate: true });

watch(
  () => props.initialSelectedIds,
  (ids) => {
    if (!props.embedded || !ids)
      return;
    selectedDeviceIds.value = [...ids].map(String);
    syncSelectedDeviceMap();
  },
);

onMounted(() => {
  if (props.embedded)
    initPanelData();
});

defineExpose({
  getSelectedDevices: buildSelectedDevices,
});

watch(selectedGroupKey, (groupKey) => {
  if (open.value)
    loadDevicesByGroup(groupKey);
});
</script>

<style lang="less" scoped>
.camera-picker-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 1050;
  width: 520px;
  max-width: calc(100vw - 48px);
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;

  &.embedded {
    position: static;
    z-index: auto;
    width: 100%;
    max-width: none;
    box-shadow: none;
    border: none;
    border-radius: 0;

    .camera-toolbar {
      padding: 0 0 8px;
      background: transparent;
      border-bottom: none;
    }

    .camera-body {
      flex-direction: column;
    }

    .group-panel {
      width: 100%;
      max-height: 100px;
      border-right: none;
      border-bottom: 1px solid #f0f0f0;
    }

    .device-list {
      max-height: 180px;
    }
  }
}

.camera-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;

  .toolbar-title {
    font-weight: 600;
    white-space: nowrap;
  }

  .toolbar-search {
    max-width: 200px;
  }
}

.camera-body {
  display: flex;
  overflow: hidden;
}

.group-panel {
  width: 140px;
  flex-shrink: 0;
  border-right: 1px solid #f0f0f0;
  padding: 8px 0;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  background: #fafafa;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 34px;
  padding: 6px 12px 6px 0;
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &.active {
    background: #e6f4ff;
    color: #1677ff;
  }
}

.group-expand,
.group-expand-placeholder {
  display: inline-flex;
  width: 20px;
  flex-shrink: 0;
  justify-content: center;
}

.group-expand .expanded {
  transform: rotate(90deg);
}

.group-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-panel {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  overflow: hidden;
}

.device-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.select-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.select-box {
  width: 16px;
  height: 16px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transition: all 0.2s;

  &.checked {
    border-color: #1677ff;
    background: #1677ff;
    color: #fff;
  }

  &.indeterminate {
    border-color: #1677ff;
    background: #1677ff;
  }
}

.select-check {
  font-size: 10px;
}

.select-dash {
  width: 8px;
  height: 2px;
  background: #fff;
  border-radius: 1px;
}

.selected-count {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.device-list {
  display: block;
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
}

.device-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 6px 8px;
  margin: 0 -8px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  &.selected {
    background: #e6f4ff;
  }
}

.device-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-btn {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
}

.picker-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}
</style>
