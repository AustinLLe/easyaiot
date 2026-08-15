<template>
  <Teleport to="body" :disabled="embedded">
    <div
      v-if="embedded || (open && anchorEl)"
      ref="panelRef"
      :class="['camera-picker-panel', { embedded, embeddedHorizontal: embedded && embeddedHorizontal, 'camera-picker-panel--dark': theme === 'dark' }]"
      :style="panelStyle"
      @mousedown.stop
    >
    <div :class="['camera-toolbar', { 'camera-toolbar--compact': !showSearch }]">
      <span class="toolbar-title">摄像头列表</span>
      <a-input-search
        v-if="showSearch"
        v-model:value="searchText"
        placeholder="搜索当前分组摄像头"
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
            <span>全选</span>
          </div>
          <span class="selected-count">已选 {{ selectedDeviceIds.length }} 个</span>
        </div>

        <a-spin :spinning="loadingDevices">
          <div v-if="filteredDevices.length" class="device-list">
            <div
              v-for="device in filteredDevices"
              :key="normalizeDeviceId(device.id)"
              :class="['device-row', { selected: isDeviceSelected(device.id), locked: isDeviceLocked(device.id) }]"
              @click="toggleDevice(normalizeDeviceId(device.id))"
            >
              <span :class="['select-box', { checked: isDeviceSelected(device.id) }]">
                <CheckOutlined v-if="isDeviceSelected(device.id)" class="select-check" />
              </span>
              <span class="device-name">{{ device.name || device.id }}</span>
              <span v-if="isDeviceLocked(device.id)" class="device-locked-tag">{{ lockedDeviceLabel }}</span>
              <a-button
                type="text"
                size="small"
                class="preview-btn"
                title="预览流"
                @click.stop="handlePreview(device)"
              >
                <VideoCameraOutlined />
              </a-button>
            </div>
          </div>
          <a-empty v-else description="当前分组暂无摄像头" />
        </a-spin>
      </div>
    </div>

    <div v-if="(!embedded || !singleSelect) && !hideFooter" class="picker-footer">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </div>

    <DialogPlayer @register="registerPlayerModal" />
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { onClickOutside, useElementBounding, useEventListener } from '@vueuse/core';
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

const props = withDefaults(defineProps<{
  initialSelectedIds?: string[];
  embedded?: boolean;
  singleSelect?: boolean;
  /** 为 true 时单选只更新选中态，不自动 emit confirm（由父级点确定再读取） */
  deferConfirm?: boolean;
  theme?: 'light' | 'dark';
  showSearch?: boolean;
  anchorEl?: HTMLElement | null;
  /** 仅展示这些设备（轮巡组编辑等场景） */
  restrictToDeviceIds?: string[];
  /** 已被其他组占用、不可选择的设备 */
  lockedDeviceIds?: string[];
  lockedDeviceLabel?: string;
  hideFooter?: boolean;
  /** 内嵌模式下仍保持左右布局（弹窗内使用） */
  embeddedHorizontal?: boolean;
}>(), {
  theme: 'light',
  showSearch: true,
  lockedDeviceLabel: '已分配',
});

const emit = defineEmits<{
  confirm: [devices: DeviceInfo[]];
  cancel: [];
  select: [devices: DeviceInfo[]];
}>();

const open = defineModel<boolean>('open', { default: false });

const PANEL_WIDTH = 360;

function resolvePopupZIndex() {
  if (typeof document === 'undefined')
    return 2100;

  let maxZ = 1000;
  for (const el of document.querySelectorAll('.ant-modal-wrap, .ant-modal-root, .vben-basic-modal-wrap')) {
    const z = Number.parseInt(window.getComputedStyle(el).zIndex, 10);
    if (!Number.isNaN(z))
      maxZ = Math.max(maxZ, z);
  }
  return maxZ + 10;
}

const panelRef = ref<HTMLElement | null>(null);
const anchorRef = computed(() => props.anchorEl ?? null);
const { top, left, height, update } = useElementBounding(anchorRef);

const panelStyle = computed(() => {
  if (props.embedded)
    return {};

  if (!props.anchorEl || !open.value)
    return {};

  let leftPos = left.value;
  const maxLeft = window.innerWidth - PANEL_WIDTH - 24;
  if (leftPos > maxLeft)
    leftPos = Math.max(24, maxLeft);

  return {
    position: 'fixed',
    top: `${top.value + height.value + 8}px`,
    left: `${leftPos}px`,
    zIndex: resolvePopupZIndex(),
  } as const;
});

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
  let devices = currentDevices.value;
  if (props.restrictToDeviceIds?.length) {
    const allowed = new Set(props.restrictToDeviceIds.map(String));
    devices = devices.filter(device => allowed.has(normalizeDeviceId(device.id)));
  }

  const keyword = searchText.value.trim().toLowerCase();
  if (!keyword)
    return devices;

  return devices.filter((device) => {
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

function isDeviceLocked(id: string | number) {
  const normalized = normalizeDeviceId(id);
  if (!props.lockedDeviceIds?.length)
    return false;
  if (selectedDeviceIds.value.includes(normalized))
    return false;
  return props.lockedDeviceIds.map(String).includes(normalized);
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
  if (isDeviceLocked(id))
    return;

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
      if (isDeviceLocked(device.id))
        return;
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
    createMessage.warning('该摄像头暂无可用流地址，请先在流媒体中开启转发');
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
    console.error('加载摄像头列表失败', error);
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

watch(open, async (visible) => {
  if (visible) {
    if (!props.embedded) {
      await nextTick();
      update();
    }
    initPanelData();
  }
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

useEventListener(window, 'scroll', () => {
  if (open.value && !props.embedded)
    update();
}, { capture: true });

useEventListener(window, 'resize', () => {
  if (open.value && !props.embedded)
    update();
});

onClickOutside(panelRef, () => {
  if (!open.value || props.embedded)
    return;
  handleCancel();
}, { ignore: [anchorRef] });
</script>

<style lang="less" scoped>
.camera-picker-panel {
  width: 360px;
  max-width: calc(100vw - 48px);
  font-size: 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;

  &:not(.embedded) {
    .camera-body {
      height: auto;
      align-items: stretch;
      background: #fafafa;
    }

    .group-panel {
      min-height: 320px;
      max-height: 320px;
      overflow-y: auto;
      overflow-x: hidden;
      background: #fafafa;
    }

    .device-panel {
      height: auto;
      overflow: visible;
      background: #fff;
    }

    .device-list {
      height: auto;
      max-height: 280px;
      overflow-y: auto;
      overflow-x: hidden;
    }
  }

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

  &.embeddedHorizontal {
    .camera-toolbar {
      padding: 12px 16px;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
    }

    .camera-body {
      flex-direction: row;
      min-height: 320px;
    }

    .group-panel {
      width: 120px;
      max-height: none;
      height: auto;
      align-self: stretch;
      padding: 8px 4px;
      border-right: 1px solid #f0f0f0;
      border-bottom: none;
    }

    .group-item {
      padding-right: 8px;
    }

    .device-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 320px;
    }

    .device-list {
      max-height: none;
      flex: 1;
      min-height: 0;
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
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .toolbar-search {
    max-width: 200px;

    :deep(.ant-input) {
      font-size: 12px;
    }
  }

  &--compact {
    justify-content: flex-start;
  }
}

.camera-body {
  display: flex;
  overflow: hidden;
}

.group-panel {
  width: 120px;
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
  min-height: 30px;
  padding: 4px 12px 4px 0;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &.active {
    background: #eaf0fb;
    color: @mix-brand-color;
    font-weight: 500;
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
    border-color: @mix-brand-color;
    background: @mix-brand-color;
    color: #fff;
  }

  &.indeterminate {
    border-color: @mix-brand-color;
    background: @mix-brand-color;
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
  font-size: 12px;
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
  min-height: 32px;
  padding: 4px 8px;
  font-size: 12px;
  margin: 0 -8px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  &.selected {
    background: #eaf0fb;
  }

  &.locked {
    cursor: not-allowed;
    opacity: 0.72;
  }
}

.device-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-locked-tag {
  padding: 0 6px;
  color: @mix-brand-color;
  font-size: 11px;
  background: #eaf0fb;
  border-radius: 4px;
  flex-shrink: 0;
}

.preview-btn {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
}

.picker-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;

  :deep(.ant-btn) {
    font-size: 12px;
    height: 28px;
    padding: 0 12px;
  }
}

.camera-picker-panel--dark {
  width: 380px;
  background: rgba(5, 14, 35, 0.98);
  border: 1px solid rgba(52, 134, 218, 0.35);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  z-index: 2000;

  .camera-toolbar {
    justify-content: flex-start;
    padding: 10px 14px;
    background: linear-gradient(
      90deg,
      rgba(52, 134, 218, 0.2) 0%,
      rgba(8, 18, 40, 0.95) 45%,
      rgba(5, 14, 35, 0.98) 100%
    );
    border-bottom: 1px solid rgba(52, 134, 218, 0.28);

    .toolbar-title {
      color: #e8eef8;
    }
  }

  .camera-body {
    min-height: 420px;
  }

  .toolbar-search :deep(.ant-input),
  .toolbar-search :deep(.ant-input-search-button) {
    background: rgba(3, 10, 28, 0.88);
    border-color: rgba(52, 134, 218, 0.32);
    color: #e8eef8;
  }

  .toolbar-search :deep(.ant-input::placeholder) {
    color: rgba(143, 163, 200, 0.65);
  }

  .group-panel {
    width: 108px;
    max-height: none;
    align-self: stretch;
    background: rgba(3, 10, 28, 0.45);
    border-right-color: rgba(52, 134, 218, 0.2);
  }

  .group-item {
    color: #8fa3c8;

    &:hover {
      background: rgba(52, 134, 218, 0.08);
      color: #e8eef8;
    }

    &.active {
      color: #73aae5;
      background: linear-gradient(90deg, rgba(52, 134, 218, 0.2), transparent);
      box-shadow: inset 2px 0 0 #3486da;
    }
  }

  .device-panel {
    display: flex;
    flex-direction: column;
    background: rgba(5, 14, 35, 0.6);
  }

  .device-list {
    flex: 1;
    min-height: 380px;
    max-height: none;
  }

  .device-panel-header {
    border-bottom-color: rgba(52, 134, 218, 0.2);
  }

  .selected-count {
    color: #8fa3c8;
  }

  .select-all {
    color: #e8eef8;
  }

  .select-box {
    border-color: rgba(143, 163, 200, 0.55);
    background: rgba(3, 10, 28, 0.6);

    &.checked,
    &.indeterminate {
      border-color: #3486da;
      background: #3486da;
    }
  }

  .device-row {
    color: #e8eef8;

    &:hover {
      background: rgba(52, 134, 218, 0.08);
    }

    &.selected {
      background: linear-gradient(90deg, rgba(52, 134, 218, 0.18), transparent);
    }
  }

  .device-name {
    color: #e8eef8;
  }

  .preview-btn {
    color: #73aae5;

    &:hover {
      color: #3486da;
      background: rgba(52, 134, 218, 0.12);
    }
  }

  .picker-footer {
    background: rgba(3, 10, 28, 0.65);
    border-top-color: rgba(52, 134, 218, 0.2);

    .ant-btn-default {
      color: #e8eef8;
      background: transparent;
      border-color: rgba(52, 134, 218, 0.35);

      &:hover {
        color: #fff;
        border-color: rgba(52, 134, 218, 0.55);
      }
    }

    .ant-btn-primary {
      border: none;
      background: linear-gradient(180deg, #3d93e8 0%, #3486da 55%, #2a6fb8 100%);
      box-shadow: 0 2px 8px rgba(52, 134, 218, 0.35);

      &:hover {
        background: linear-gradient(180deg, #4a9ef0 0%, #3d93e8 55%, #3486da 100%);
      }
    }
  }

  :deep(.ant-empty-description) {
    color: #8fa3c8;
  }
}
</style>
