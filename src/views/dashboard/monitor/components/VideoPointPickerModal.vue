<template>
  <BasicModal
    v-model:open="visible"
    title="选择点位"
    :width="720"
    wrap-class-name="monitor-point-picker-modal"
    ok-text="确定"
    cancel-text="取消"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="point-picker">
      <div class="point-picker-selected">
        <div class="point-picker-selected-head">
          <span class="point-picker-selected-label">已选择</span>
          <span class="point-picker-selected-count">{{ selectedDevice ? '1/1' : '0/1' }}</span>
        </div>
        <div class="point-picker-selected-body">
          <span v-if="selectedDevice" class="point-picker-tag">
            {{ selectedDevice.name || selectedDevice.id }}
            <button type="button" class="point-picker-tag-remove" @click="clearSelection">
              <Icon icon="ant-design:close-outlined" :size="10" />
            </button>
          </span>
          <span v-else class="point-picker-empty">请从下方列表选择摄像头</span>
        </div>
      </div>

      <div class="point-picker-list-head">
        <span class="point-picker-list-title">点位列表</span>
        <div class="point-picker-search">
          <Icon icon="ant-design:search-outlined" :size="14" class="point-picker-search-icon" />
          <input
            v-model="searchText"
            type="search"
            class="point-picker-search-input"
            placeholder="搜索点位"
          />
        </div>
      </div>

      <div class="point-picker-body">
        <div class="point-picker-col point-picker-col--category">
          <button type="button" class="point-picker-category active">点位</button>
        </div>

        <div class="point-picker-col point-picker-col--groups">
          <button
            v-for="item in directories"
            :key="item.key"
            type="button"
            :class="['point-picker-group', { active: selectedDirectoryKey === item.key }]"
            :style="{ paddingLeft: `${10 + item.depth * 12}px` }"
            @click="selectDirectory(item.key)"
          >
            <Icon icon="ant-design:folder-outlined" :size="13" />
            <span>{{ item.title }}</span>
          </button>
          <div v-if="!directories.length" class="point-picker-col-empty">暂无分组</div>
        </div>

        <div class="point-picker-col point-picker-col--devices">
          <div
            v-for="device in filteredDevices"
            :key="device.id"
            :class="['point-picker-device', { active: selectedDeviceId === device.id }]"
            @click="selectDevice(device)"
          >
            <span :class="['point-picker-checkbox', { checked: selectedDeviceId === device.id }]">
              <Icon v-if="selectedDeviceId === device.id" icon="ant-design:check-outlined" :size="10" />
            </span>
            <div class="point-picker-device-info">
              <span class="point-picker-device-name">{{ device.name || device.id }}</span>
              <span :class="['point-picker-device-status', { online: isDeviceOnline(device) }]">
                <span class="point-picker-status-dot" />
                {{ isDeviceOnline(device) ? '在线' : '离线' }}
              </span>
            </div>
            <button type="button" class="point-picker-refresh" @click.stop="emit('refresh')">
              刷新
            </button>
          </div>
          <div v-if="!filteredDevices.length" class="point-picker-col-empty">
            {{ selectedDirectoryKey ? '该分组暂无摄像头' : '请先选择分组' }}
          </div>
        </div>
      </div>
    </div>
  </BasicModal>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { BasicModal } from '@/components/Modal'
import { Icon } from '@/components/Icon'
import { useMessage } from '@/hooks/web/useMessage'
import type { DeviceInfo } from '@/api/device/camera'

export interface DirectoryTreeItem {
  key: string
  title: string
  depth: number
}

defineOptions({ name: 'VideoPointPickerModal' })

const props = defineProps<{
  directories: DirectoryTreeItem[]
  devices: DeviceInfo[]
  initialDirectoryKey?: string
  initialDeviceId?: string
  getCamerasByDirectoryKey: (directoryKey: string) => DeviceInfo[]
}>()

const emit = defineEmits<{
  confirm: [device: DeviceInfo]
  cancel: []
  refresh: []
}>()

const visible = defineModel<boolean>('open', { default: false })

const { createMessage } = useMessage()

const searchText = ref('')
const selectedDirectoryKey = ref('')
const selectedDeviceId = ref('')

const currentDevices = computed(() => {
  if (!selectedDirectoryKey.value)
    return []
  return props.getCamerasByDirectoryKey(selectedDirectoryKey.value)
})

const filteredDevices = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword)
    return currentDevices.value
  return currentDevices.value.filter((device) => {
    const name = (device.name || device.id || '').toLowerCase()
    return name.includes(keyword)
  })
})

const selectedDevice = computed(() =>
  props.devices.find(device => device.id === selectedDeviceId.value),
)

function isDeviceOnline(device: DeviceInfo) {
  return !!(device.http_stream || device.rtmp_stream || device.stream)
}

function selectDirectory(key: string) {
  const prevDeviceId = selectedDeviceId.value
  selectedDirectoryKey.value = key
  searchText.value = ''
  if (prevDeviceId) {
    const stillVisible = props.getCamerasByDirectoryKey(key).some(device => device.id === prevDeviceId)
    if (!stillVisible)
      selectedDeviceId.value = ''
  }
}

function selectDevice(device: DeviceInfo) {
  selectedDeviceId.value = selectedDeviceId.value === device.id ? '' : device.id
}

function clearSelection() {
  selectedDeviceId.value = ''
}

function syncFromProps() {
  selectedDirectoryKey.value = props.initialDirectoryKey
    || props.directories[0]?.key
    || ''
  selectedDeviceId.value = props.initialDeviceId || ''
  searchText.value = ''
}

function handleConfirm() {
  const device = selectedDevice.value
  if (!device) {
    createMessage.warning('请先选择一个摄像头')
    return
  }
  emit('confirm', device)
  visible.value = false
}

function handleCancel() {
  emit('cancel')
  visible.value = false
}

watch(visible, (open) => {
  if (open)
    syncFromProps()
})
</script>

<style lang="less" scoped>
@picker-primary: #3486da;
@picker-text: #e8eef8;
@picker-muted: #8fa3c8;
@picker-bg: rgba(5, 14, 35, 0.96);
@picker-border: rgba(52, 134, 218, 0.28);

.point-picker {
  color: @picker-text;
}

.point-picker-selected {
  margin-bottom: 14px;
  border: 1px solid @picker-border;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(3, 10, 28, 0.55);
}

.point-picker-selected-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(
    90deg,
    rgba(52, 134, 218, 0.16) 0%,
    rgba(8, 18, 40, 0.72) 42%,
    rgba(5, 14, 35, 0.35) 100%
  );
  border-bottom: 1px solid rgba(52, 134, 218, 0.2);
}

.point-picker-selected-label {
  font-size: 13px;
  font-weight: 600;
}

.point-picker-selected-count {
  font-size: 12px;
  color: @picker-muted;
}

.point-picker-selected-body {
  min-height: 44px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
}

.point-picker-empty {
  font-size: 12px;
  color: @picker-muted;
}

.point-picker-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 10px;
  font-size: 12px;
  color: @picker-text;
  background: linear-gradient(90deg, rgba(52, 134, 218, 0.22), rgba(52, 134, 218, 0.08));
  border: 1px solid rgba(52, 134, 218, 0.35);
  border-radius: 3px;
}

.point-picker-tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: @picker-muted;
  cursor: pointer;

  &:hover {
    color: @picker-text;
  }
}

.point-picker-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.point-picker-list-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.point-picker-search {
  position: relative;
  flex: 1;
  max-width: 220px;
}

.point-picker-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: @picker-muted;
  pointer-events: none;
}

.point-picker-search-input {
  width: 100%;
  height: 30px;
  padding: 0 10px 0 30px;
  font-size: 12px;
  color: @picker-text;
  background: rgba(3, 10, 28, 0.88);
  border: 1px solid @picker-border;
  border-radius: 3px;
  outline: none;

  &::placeholder {
    color: rgba(143, 163, 200, 0.65);
  }

  &:focus {
    border-color: rgba(52, 134, 218, 0.55);
    box-shadow: 0 0 0 2px rgba(52, 134, 218, 0.12);
  }
}

.point-picker-body {
  display: flex;
  height: 320px;
  border: 1px solid @picker-border;
  border-radius: 4px;
  overflow: hidden;
  background: @picker-bg;
}

.point-picker-col {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;

  &--category {
    width: 72px;
    flex-shrink: 0;
    border-right: 1px solid rgba(52, 134, 218, 0.15);
    background: linear-gradient(180deg, rgba(52, 134, 218, 0.08) 0%, rgba(3, 10, 28, 0.4) 100%);
    padding: 8px 6px;
  }

  &--groups {
    width: 168px;
    flex-shrink: 0;
    border-right: 1px solid rgba(52, 134, 218, 0.15);
    background: rgba(3, 10, 28, 0.35);
    padding: 6px 0;
  }

  &--devices {
    flex: 1;
    min-width: 0;
    padding: 6px 0;
  }
}

.point-picker-category {
  width: 100%;
  padding: 8px 6px;
  font-size: 12px;
  color: @picker-muted;
  text-align: center;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: default;

  &.active {
    color: @picker-primary;
    font-weight: 600;
    background: linear-gradient(90deg, rgba(52, 134, 218, 0.24), rgba(52, 134, 218, 0.06));
    box-shadow: inset 2px 0 0 @picker-primary;
  }
}

.point-picker-group {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 34px;
  padding: 6px 10px 6px 10px;
  font-size: 12px;
  color: @picker-muted;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    color: @picker-text;
    background: rgba(52, 134, 218, 0.08);
  }

  &.active {
    color: @picker-primary;
    background: linear-gradient(90deg, rgba(52, 134, 218, 0.2), transparent);
    box-shadow: inset 2px 0 0 @picker-primary;
  }
}

.point-picker-device {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 6px 12px;
  cursor: pointer;

  &:hover {
    background: rgba(52, 134, 218, 0.06);
  }

  &.active {
    background: linear-gradient(90deg, rgba(52, 134, 218, 0.18), transparent);
  }
}

.point-picker-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border: 1px solid rgba(143, 163, 200, 0.55);
  border-radius: 2px;
  color: #fff;
  background: rgba(3, 10, 28, 0.6);

  &.checked {
    border-color: @picker-primary;
    background: @picker-primary;
  }
}

.point-picker-device-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.point-picker-device-name {
  font-size: 13px;
  color: @picker-text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.point-picker-device-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: @picker-muted;

  &.online {
    color: #52c41a;
  }
}

.point-picker-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.point-picker-refresh {
  flex-shrink: 0;
  padding: 0;
  font-size: 12px;
  color: @picker-primary;
  border: none;
  background: transparent;
  cursor: pointer;

  &:hover {
    color: #73aae5;
  }
}

.point-picker-col-empty {
  padding: 24px 12px;
  font-size: 12px;
  color: @picker-muted;
  text-align: center;
}
</style>

<style lang="less">
.monitor-point-picker-modal {
  .ant-modal-content {
    background: rgba(5, 14, 35, 0.98);
    border: 1px solid rgba(52, 134, 218, 0.35);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  }

  .ant-modal-header {
    margin-bottom: 0;
    padding: 14px 20px;
    background: linear-gradient(
      90deg,
      rgba(52, 134, 218, 0.22) 0%,
      rgba(8, 18, 40, 0.95) 45%,
      rgba(5, 14, 35, 0.98) 100%
    );
    border-bottom: 1px solid rgba(52, 134, 218, 0.35);
  }

  .ant-modal-title {
    color: #fff !important;
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  .ant-modal-close {
    color: rgba(232, 238, 248, 0.75);

    &:hover {
      color: #fff;
      background: rgba(52, 134, 218, 0.15);
    }
  }

  .ant-modal-body {
    padding: 16px 20px 12px;
    background: rgba(5, 14, 35, 0.98);
  }

  .ant-modal-footer {
    padding: 12px 20px 16px;
    background: rgba(3, 10, 28, 0.6);
    border-top: 1px solid rgba(52, 134, 218, 0.2);

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
}
</style>
