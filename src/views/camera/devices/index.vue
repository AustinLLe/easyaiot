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
import { onMounted, ref } from 'vue'
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
  refreshDevices,
  type DeviceDirectory,
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

  return getDeviceList({ pageNo, pageSize, search })
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
  canResize: true,
  resizeHeightOffset: 36,
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
})

const getTableActions = (record) => {
  const actions = [{ icon: 'octicon:play-16', tooltip: '播放RTMP流', onClick: () => handlePlay(record) }]
  actions.push(
    { icon: 'ant-design:eye-filled', tooltip: '详情', onClick: () => openAddModal('view', record) },
    { icon: 'ant-design:edit-filled', tooltip: '编辑', onClick: () => openAddModal('edit', record) },
    { icon: 'material-symbols:delete-outline-rounded', tooltip: '删除', popConfirm: { title: '确定删除此设备？', confirm: () => handleDelete(record) } },
  )
  return actions
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

onMounted(() => handleSuccess())
</script>

<style lang="less" scoped>
.camera-devices-page {
  height: calc(100vh - 96px);
  padding: 16px 19px 16px 15px;
  background: #fff;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

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
