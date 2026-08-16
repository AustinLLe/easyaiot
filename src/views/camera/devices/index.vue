<template>
  <div class="camera-devices-page">
    <div class="device-list-layout">
      <DirectorySidebar ref="directorySidebarRef" @select="handleDirectorySelect" />
      <div class="device-list-main">
        <header class="page-header">
          <div>
            <span class="eyebrow">CAMERAS</span>
            <h1>设备列表</h1>
            <p>按分组管理直连摄像头，支持宫格与表格两种视图。</p>
          </div>
        </header>
        <BasicTable v-if="viewMode === 'table'" @register="registerTable">
          <template #toolbar>
            <div class="toolbar-buttons">
              <!-- 暂时隐藏 ONVIF 相关按钮
              <a-button v-auth="['camera:devices:scan']" type="primary" @click="handleScanOnvif">
                <template #icon><ScanOutlined /></template>
                扫描局域网ONVIF设备
              </a-button>
              -->
              <a-button v-auth="['camera:devices:create']" @click="openAddModal('source')">
                <template #icon><VideoCameraAddOutlined /></template>
                新增直连设备
              </a-button>
              <a-button :loading="refreshingStreamStatus" @click="handleRefreshStreamStatus">
                <template #icon><SyncOutlined /></template>
                刷新全部推流状态
              </a-button>
              <span class="auto-refresh-note" title="进入页面立即刷新一次，之后每 30 秒自动刷新；手动刷新按钮继续保留">
                <span class="auto-refresh-dot"></span>
                自动刷新已开启 · 每 30 秒
              </span>
              <!-- 暂时隐藏 ONVIF 相关按钮
              <a-button v-auth="['camera:devices:refresh-onvif']" @click="handleUpdateOnvifDevice">
                <template #icon><SyncOutlined /></template>
                更新ONVIF设备
              </a-button>
              -->
              <a-button type="default" @click="handleToggleViewMode">
                <template #icon><SwapOutlined /></template>
                切换视图
              </a-button>
            </div>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="['id', 'name', 'model', 'source', 'rtmp_stream'].includes(column.key)">
              <span
                class="device-copy-cell"
                :class="{ 'device-name-cell': column.key === 'name' }"
                :title="record[column.key] || ''"
                @click="handleCopy(record[column.key])"
              >
                <Icon icon="tdesign:copy-filled" color="#4287FCFF" /> {{ record[column.key] }}
              </span>
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
          >
            <template #header>
              <!-- 暂时隐藏 ONVIF 相关按钮
              <a-button v-auth="['camera:devices:scan']" type="primary" @click="handleScanOnvif">
                <template #icon><ScanOutlined /></template>
                扫描局域网ONVIF设备
              </a-button>
              -->
              <a-button v-auth="['camera:devices:create']" @click="openAddModal('source')">
                <template #icon><VideoCameraAddOutlined /></template>
                新增直连设备
              </a-button>
              <a-button :loading="refreshingStreamStatus" @click="handleRefreshStreamStatus">
                <template #icon><SyncOutlined /></template>
                刷新全部推流状态
              </a-button>
              <span class="auto-refresh-note" title="进入页面立即刷新一次，之后每 30 秒自动刷新；手动刷新按钮继续保留">
                <span class="auto-refresh-dot"></span>
                自动刷新已开启 · 每 30 秒
              </span>
              <!-- 暂时隐藏 ONVIF 相关按钮
              <a-button v-auth="['camera:devices:refresh-onvif']" @click="handleUpdateOnvifDevice">
                <template #icon><SyncOutlined /></template>
                更新ONVIF设备
              </a-button>
              -->
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
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { BasicTable, TableAction, useTable } from '@/components/Table'
import { useMessage } from '@/hooks/web/useMessage'
import { getBasicColumns, getFormConfig } from '../Data'
import { useModal } from '@/components/Modal'
import VideoModal from '../components/VideoModal/index.vue'
import {
  deleteDevice,
  getDeviceList,
  getDeviceStatus,
  getDirectoryDevices,
  // refreshDevices,
  type DeviceDirectory,
} from '@/api/device/camera'
import {
  SwapOutlined,
  SyncOutlined,
  VideoCameraAddOutlined,
  // ScanOutlined,
} from '@ant-design/icons-vue'
import DialogPlayer from '@/components/VideoPlayer/DialogPlayer.vue'
import DirectorySidebar from '../components/DirectorySidebar/index.vue'
import VideoCardList from '../components/VideoCardList/index.vue'
import { confirmDeleteDevice, preloadAlgorithmTaskUsageCache } from '@/views/algorithm-task/utils/algorithmTaskUsageUtils'

defineOptions({ name: 'CameraDevices' })

const { createMessage } = useMessage()
const [registerAddModel, { openModal }] = useModal()
const [registerPlayerAddModel, { openModal: openPlayerAddModel }] = useModal()

const viewMode = ref<'table' | 'card'>('card')
const directorySidebarRef = ref()
const selectedDirectoryId = ref<number | null>(null)
const videoCardListRef = ref()
const refreshingStreamStatus = ref(false)
let streamStatusTimer: ReturnType<typeof setInterval> | undefined

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

  return getDeviceList({
    pageNo,
    pageSize,
    search,
    online: params.online !== undefined && params.online !== '' ? params.online : undefined,
  })
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

const [registerTable, { reload }] = useTable({
  canResize: false,
  resizeHeightOffset: 36,
  showIndexColumn: false,
  title: '',
  api: fetchDeviceList,
  columns: getBasicColumns(),
  useSearchForm: true,
  pagination: true,
  formConfig: getFormConfig(),
  fetchSetting: { listField: 'data', totalField: 'total' },
  rowKey: 'id',
})

const getTableActions = (record) => {
  const actions = [{ label: '播放', auth: 'camera:devices:play', onClick: () => handlePlay(record) }]
  actions.push(
    { label: '查看', auth: 'camera:devices:view', onClick: () => openAddModal('view', record) },
    { label: '编辑', auth: 'camera:devices:update', onClick: () => openAddModal('edit', record) },
    { label: '删除', auth: 'camera:devices:delete', popConfirm: { title: '确定删除此设备？', confirm: () => handleDelete(record) } },
  )
  return actions
}

function handlePlayerSuccess() {}
async function refreshCurrentView(forceStreamStatus = false) {
  if (forceStreamStatus) {
    const response: any = await getDeviceStatus(true).catch(() => undefined)
    const statuses = response?.code !== undefined ? response.data : response?.data
    if (Array.isArray(statuses) && videoCardListRef.value?.patchDeviceStatuses)
      videoCardListRef.value.patchDeviceStatuses(statuses)
  }
  if (viewMode.value === 'table')
    await reload()
  else if (videoCardListRef.value)
    await videoCardListRef.value.fetch()
}

function handlePlay(record) {
  openPlayerAddModel(true, {
    ...record,
    onStreamStatus: (device) => {
      videoCardListRef.value?.patchDeviceStatus?.(device)
    },
    onClose: () => {
      setTimeout(() => refreshCurrentView(true), 300)
    },
  })
  setTimeout(() => refreshCurrentView(true), 1500)
}

const openAddModal = (type, record = null) => {
  openModal(true, { type, record, isEdit: type === 'edit', isView: type === 'view', defaultDirectoryId: selectedDirectoryId.value })
}

// 暂时隐藏 ONVIF 相关按钮，保留逻辑便于恢复
// const handleScanOnvif = () => openAddModal('onvif')
//
// const handleUpdateOnvifDevice = async () => {
//   try {
//     await refreshDevices()
//     createMessage.success('ONVIF设备更新成功')
//     handleSuccess()
//   }
//   catch {
//     createMessage.error('ONVIF设备更新失败')
//   }
// }

const handleSuccess = () => {
  directorySidebarRef.value?.refresh()
  refreshCurrentView()
}

const handleRefreshStreamStatus = async (showMessage = true) => {
  if (refreshingStreamStatus.value)
    return
  refreshingStreamStatus.value = true
  try {
    const response: any = await getDeviceStatus(true)
    const statuses = response?.code !== undefined ? response.data : response?.data
    if (Array.isArray(statuses) && videoCardListRef.value?.patchDeviceStatuses)
      videoCardListRef.value.patchDeviceStatuses(statuses)
    if (viewMode.value === 'table')
      await reload()
    else if (videoCardListRef.value)
      await videoCardListRef.value.fetch()
    if (showMessage)
      createMessage.success('全部设备推流状态已刷新')
  }
  catch {
    if (showMessage)
      createMessage.error('推流状态刷新失败')
  }
  finally {
    refreshingStreamStatus.value = false
  }
}

onMounted(() => {
  preloadAlgorithmTaskUsageCache().catch(() => {})
  // 进入设备列表立即从 SRS 获取一次全量状态，之后静默轮询。
  void handleRefreshStreamStatus(false)
  streamStatusTimer = setInterval(() => {
    void handleRefreshStreamStatus(false)
  }, 30_000)
})

onBeforeUnmount(() => {
  if (streamStatusTimer) {
    clearInterval(streamStatusTimer)
    streamStatusTimer = undefined
  }
})

const handleDelete = async (record) => {
  const canDelete = await confirmDeleteDevice(record.id, record.name)
  if (!canDelete)
    return
  try {
    await deleteDevice(record.id)
    createMessage.success('删除成功')
    handleSuccess()
  }
  catch {
    createMessage.error('删除失败')
  }
}

const handleCardView = (record) => openAddModal('view', record)
const handleCardEdit = (record) => openAddModal('edit', record)
const handleCardDelete = async (record) => handleDelete(record)
const handleCardPlay = (record) => handlePlay(record)
</script>

<style lang="less" scoped>
.camera-devices-page {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 100vh;
  padding: 0;
  background: transparent;

  :deep(.ant-form-item) {
    margin-bottom: 10px;
  }

  .toolbar-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .auto-refresh-note {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px;
    color: #4d6859;
    font-size: 12px;
    line-height: 20px;
    white-space: nowrap;
    background: #f1f8f4;
    border: 1px solid #d5eadc;
    border-radius: 12px;
  }

  .auto-refresh-dot {
    width: 7px;
    height: 7px;
    background: #39a96b;
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgb(57 169 107 / 12%);
  }

  .device-copy-cell {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
    cursor: pointer;
  }

  .device-name-cell {
    min-width: 0;
  }

  .device-list-layout {
    display: flex;
    flex: 1;
    gap: 0;
    align-items: stretch;
    min-height: 100vh;
    background: transparent;

    .device-list-main {
      flex: 1;
      min-width: 0;
      overflow: auto;
      padding: 28px 24px 24px;

      .page-header {
        margin-bottom: 22px;
      }

      .eyebrow {
        color: #2457a7;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.16em;
      }

      .page-header h1 {
        margin: 7px 0 6px;
        color: #17233d;
        font-size: 28px;
        line-height: 1.2;
      }

      .page-header p {
        margin: 0;
        color: #7d889a;
        font-size: 14px;
      }

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
