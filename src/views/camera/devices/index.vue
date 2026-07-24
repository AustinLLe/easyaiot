<template>
  <div class="camera-devices-page">
    <div class="device-list-layout">
      <DirectorySidebar ref="directorySidebarRef" @select="handleDirectorySelect" />
      <div class="device-list-main">
        <BasicTable v-if="viewMode === 'table'" @register="registerTable">
          <template #toolbar>
            <div class="toolbar-buttons">
              <a-button type="primary" @click="handleScanOnvif">
                <template #icon><ScanOutlined /></template>
                扫描局域网ONVIF设备
              </a-button>
              <a-button @click="openAddModal('source')">
                <template #icon><VideoCameraAddOutlined /></template>
                新增直连设备
              </a-button>
              <a-button @click="handleUpdateOnvifDevice">
                <template #icon><SyncOutlined /></template>
                更新ONVIF设备
              </a-button>
              <a-button type="default" @click="handleToggleViewMode">
                <template #icon><SwapOutlined /></template>
                切换视图
              </a-button>
            </div>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="['id', 'name', 'model', 'source', 'rtmp_stream'].includes(column.key)">
              <span style="cursor: pointer" @click="handleCopy(record[column.key])">
                <Icon icon="tdesign:copy-filled" color="#4287FCFF" /> {{ record[column.key] }}
              </span>
            </template>
            <template v-else-if="column.dataIndex === 'stream_status'">
              <a-tag :color="getStreamStatusColor(record.stream_status)">
                {{ getStreamStatusText(record.stream_status) }}
              </a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <div class="camera-table-action">
                <TableAction :actions="getTableActions(record)" />
              </div>
            </template>
          </template>
        </BasicTable>

        <div v-else class="card-mode-wrapper">
          <VideoCardList
            ref="videoCardListRef"
            :api="fetchDeviceList"
            :params="{}"
            @view="handleCardView"
            @edit="handleCardEdit"
            @delete="handleCardDelete"
            @play="handleCardPlay"
            @toggleStream="handleCardToggleStream"
          >
            <template #header>
              <a-button type="primary" @click="handleScanOnvif">
                <template #icon><ScanOutlined /></template>
                扫描局域网ONVIF设备
              </a-button>
              <a-button @click="openAddModal('source')">
                <template #icon><VideoCameraAddOutlined /></template>
                新增直连设备
              </a-button>
              <a-button @click="handleUpdateOnvifDevice">
                <template #icon><SyncOutlined /></template>
                更新ONVIF设备
              </a-button>
              <a-button type="default" @click="handleToggleViewMode">
                <template #icon><SwapOutlined /></template>
                切换视图
              </a-button>
            </template>
          </VideoCardList>
        </div>

        <DialogPlayer title="视频播放" @register="registerPlayerAddModel" @success="handlePlayerSuccess" />
        <VideoModal @register="registerAddModel" @success="handleSuccess" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { BasicTable, TableAction, useTable } from '@/components/Table'
import { Icon } from '@/components/Icon'
import { useMessage } from '@/hooks/web/useMessage'
import { getBasicColumns, getFormConfig } from '../Data'
import { useModal } from '@/components/Modal'
import VideoModal from '../components/VideoModal/index.vue'
import {
  deleteDevice,
  getDeviceList,
  getDirectoryDevices,
  getStreamStatus,
  refreshDevices,
  startStreamForwarding,
  stopStreamForwarding,
  type DeviceDirectory,
  type DeviceInfo,
  type StreamStatusResponse,
} from '@/api/device/camera'
import { ScanOutlined, SyncOutlined, SwapOutlined, VideoCameraAddOutlined } from '@ant-design/icons-vue'
import DialogPlayer from '@/components/VideoPlayer/DialogPlayer.vue'
import DirectorySidebar from '../components/DirectorySidebar/index.vue'
import VideoCardList from '../components/VideoCardList/index.vue'

defineOptions({ name: 'CameraDevices' })

const { createMessage } = useMessage()
const [registerAddModel, { openModal }] = useModal()
const [registerPlayerAddModel, { openModal: openPlayerAddModel }] = useModal()

const viewMode = ref<'table' | 'card'>('card')
const directorySidebarRef = ref()
const selectedDirectoryId = ref<number | null>(null)
const videoCardListRef = ref()
const deviceStreamStatuses = ref<Record<string, string>>({})
const statusCheckTimer = ref<NodeJS.Timeout | null>(null)

const fetchDeviceList = async (params: Record<string, any> = {}) => {
  const pageNo = params.pageNo || params.page || 1
  const pageSize = params.pageSize || 10
  const search = params.search || params.deviceName || ''

  if (selectedDirectoryId.value) {
    const response = await getDirectoryDevices(selectedDirectoryId.value, {
      pageNo,
      pageSize,
      search,
      name: params.name || params.deviceName || '',
      online: params.online !== undefined && params.online !== '' ? params.online : undefined,
      model: params.model || '',
    })
    const data = response.code !== undefined ? response.data : response
    const total = response.code !== undefined ? response.total : (Array.isArray(data) ? data.length : 0)
    return { data: Array.isArray(data) ? data : [], total: total ?? 0 }
  }

  return getDeviceList({ pageNo, pageSize, search, enable_forward: params.enable_forward })
}

const handleDirectorySelect = (directory: DeviceDirectory | null) => {
  selectedDirectoryId.value = directory?.id ?? null
  handleSuccess()
}

const handleToggleViewMode = () => {
  viewMode.value = viewMode.value === 'table' ? 'card' : 'table'
  if (viewMode.value === 'card' && videoCardListRef.value)
    videoCardListRef.value.fetch()
}

const getStreamStatusText = (status: string) => ({
  running: '运行中',
  stopped: '已停止',
  error: '错误',
  unknown: '未知',
}[status] || status)

const getStreamStatusColor = (status: string) => ({
  running: 'green',
  stopped: 'red',
  error: 'orange',
  unknown: 'default',
}[status] || 'default')

const checkDeviceStreamStatus = async (deviceId: string) => {
  if (!deviceStreamStatuses.value)
    deviceStreamStatuses.value = {}
  try {
    const response: StreamStatusResponse = await getStreamStatus(deviceId)
    deviceStreamStatuses.value[deviceId] = response.code === 0 ? response.data.status : 'error'
  }
  catch {
    deviceStreamStatuses.value[deviceId] = 'error'
  }
}

const [registerTable, { reload }] = useTable({
  canResize: true,
  resizeHeightOffset: 24,
  showIndexColumn: false,
  title: '摄像头列表',
  api: fetchDeviceList,
  columns: getBasicColumns(),
  useSearchForm: true,
  showTableSetting: false,
  pagination: true,
  formConfig: getFormConfig(),
  fetchSetting: { listField: 'data', totalField: 'total' },
  rowKey: 'id',
  onSuccess: (data) => {
    if (!data?.data)
      return
    if (!deviceStreamStatuses.value)
      deviceStreamStatuses.value = {}
    data.data.forEach((device: DeviceInfo) => {
      if (!deviceStreamStatuses.value[device.id])
        deviceStreamStatuses.value[device.id] = 'unknown'
    })
  },
})

const getTableActions = (record) => {
  const actions = [{ icon: 'octicon:play-16', tooltip: '播放RTMP流', onClick: () => handlePlay(record) }]
  const currentStatus = deviceStreamStatuses.value?.[record.id] || 'unknown'
  actions.splice(1, 0, currentStatus === 'running'
    ? { icon: 'ant-design:pause-circle-outlined', tooltip: '停止RTSP转发', onClick: () => handleDisableRtsp(record) }
    : { icon: 'ant-design:swap-outline', tooltip: '启用RTSP转发', onClick: () => handleEnableRtsp(record) })
  actions.push(
    { icon: 'ant-design:eye-filled', tooltip: '详情', onClick: () => openAddModal('view', record) },
    { icon: 'ant-design:edit-filled', tooltip: '编辑', onClick: () => openAddModal('edit', record) },
    { icon: 'material-symbols:delete-outline-rounded', tooltip: '删除', popConfirm: { title: '确定删除此设备？', confirm: () => handleDelete(record) } },
  )
  return actions
}

const handleEnableRtsp = async (record) => {
  if (!deviceStreamStatuses.value)
    deviceStreamStatuses.value = {}
  createMessage.loading({ content: '正在启动RTSP转发...', key: 'rtsp' })
  try {
    const response = await startStreamForwarding(record.id)
    if (response.code === 0) {
      createMessage.success({ content: 'RTSP转发已启动', key: 'rtsp' })
      deviceStreamStatuses.value[record.id] = 'running'
      if (videoCardListRef.value?.deviceStreamStatuses)
        videoCardListRef.value.deviceStreamStatuses[record.id] = 'running'
      handleSuccess()
    }
    else {
      createMessage.error({ content: `启动失败: ${response.data.msg}`, key: 'rtsp' })
      deviceStreamStatuses.value[record.id] = 'error'
    }
  }
  catch {
    createMessage.error({ content: '启动RTSP转发失败', key: 'rtsp' })
    deviceStreamStatuses.value[record.id] = 'error'
  }
}

const handleDisableRtsp = async (record) => {
  if (!deviceStreamStatuses.value)
    deviceStreamStatuses.value = {}
  createMessage.loading({ content: '正在停止RTSP转发...', key: 'rtsp' })
  try {
    const response = await stopStreamForwarding(record.id)
    if (response.code === 0) {
      createMessage.success({ content: 'RTSP转发已停止', key: 'rtsp' })
      deviceStreamStatuses.value[record.id] = 'stopped'
      if (videoCardListRef.value?.deviceStreamStatuses)
        videoCardListRef.value.deviceStreamStatuses[record.id] = 'stopped'
      handleSuccess()
    }
    else {
      createMessage.error({ content: `停止失败: ${response.data.msg}`, key: 'rtsp' })
      deviceStreamStatuses.value[record.id] = 'error'
    }
  }
  catch {
    createMessage.error({ content: '停止RTSP转发失败', key: 'rtsp' })
    deviceStreamStatuses.value[record.id] = 'error'
  }
}

function handlePlayerSuccess() {}
function handlePlay(record) { openPlayerAddModel(true, record) }

async function handleCopy(text: string) {
  if (navigator.clipboard)
    await navigator.clipboard.writeText(text)
  else {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  createMessage.success('复制成功')
}

const openAddModal = (type, record = null) => {
  openModal(true, { type, record, isEdit: type === 'edit', isView: type === 'view', defaultDirectoryId: selectedDirectoryId.value })
}

const handleScanOnvif = () => openAddModal('onvif')

const handleSuccess = () => {
  directorySidebarRef.value?.refresh()
  if (viewMode.value === 'table')
    reload()
  else if (videoCardListRef.value)
    videoCardListRef.value.fetch()
}

const handleDelete = async (record) => {
  try {
    await deleteDevice(record.id)
    createMessage.success('删除成功')
    handleSuccess()
  }
  catch {
    createMessage.error('删除失败')
  }
}

const handleUpdateOnvifDevice = async () => {
  try {
    await refreshDevices()
    createMessage.success('ONVIF设备更新成功')
    handleSuccess()
  }
  catch {
    createMessage.error('ONVIF设备更新失败')
  }
}

const handleCardView = (record) => openAddModal('view', record)
const handleCardEdit = (record) => openAddModal('edit', record)
const handleCardDelete = async (record) => handleDelete(record)
const handleCardPlay = (record) => handlePlay(record)

const handleCardToggleStream = async (record) => {
  const currentStatus = deviceStreamStatuses.value?.[record.id] || 'unknown'
  if (currentStatus === 'running')
    await handleDisableRtsp(record)
  else
    await handleEnableRtsp(record)
  videoCardListRef.value?.fetch()
}

onMounted(() => handleSuccess())

onUnmounted(() => {
  if (statusCheckTimer.value) {
    clearInterval(statusCheckTimer.value)
    statusCheckTimer.value = null
  }
})
</script>

<style lang="less" scoped>
.camera-devices-page {
  height: calc(100vh - 96px);
  padding: 16px 19px 16px 15px;
  background: #fff;
  overflow: hidden;
  box-sizing: border-box;

  :deep(.ant-form-item) {
    margin-bottom: 10px;
  }

  .toolbar-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .device-list-layout {
    display: flex;
    gap: 0;
    align-items: stretch;
    height: 100%;
    min-height: 0;
    background: #fff;

    .device-list-main {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      padding: 0 16px 16px;

      .camera-table-action {
        display: flex;
        justify-content: center;
        width: 100%;

        :deep([class*='-basic-table-action']) {
          justify-content: center !important;
        }
      }

      :deep(.camera-action-column) {
        text-align: center !important;
      }
    }
  }
}
</style>
