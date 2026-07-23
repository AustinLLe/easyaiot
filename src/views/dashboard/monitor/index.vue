<template>
  <div class="overview-dashboard" :style="dashboardStyle">
    <div class="dashboard-canvas">
    <header class="dashboard-heading">
      <div>
        <div class="eyebrow">EASYAIOT EDGE</div>
        <h1>首页看板</h1>
        <p>设备、算法与告警态势实时汇总</p>
      </div>
      <div class="heading-actions">
        <button class="refresh-button" :disabled="loading" @click="refreshDashboard">
          <Icon icon="ant-design:reload-outlined" :size="16" />
          {{ loading ? '刷新中' : '刷新数据' }}
        </button>
      </div>
    </header>

    <section class="dashboard-body">
      <!-- 左侧：KPI + 告警事件 -->
      <aside class="left-stack">
        <section class="kpi-board panel">
          <div class="period-tabs compact kpi-period-tabs" role="tablist" aria-label="KPI统计周期">
            <button
              v-for="item in periodOptions"
              :key="item.value"
              type="button"
              :class="['period-tab', { active: kpiPeriod === item.value }]"
              role="tab"
              :aria-selected="kpiPeriod === item.value"
              @click="kpiPeriod = item.value"
            >
              {{ item.label }}
            </button>
          </div>
          <div class="kpi-board-grid">
            <div class="kpi-primary">
              <div class="kpi-primary-label">{{ kpiPeriodData.label }}报警</div>
              <div class="kpi-primary-value">{{ kpiPeriodData.alarm_count }}</div>
            </div>
            <div class="kpi-secondary">
              <div class="kpi-secondary-item">
                <span class="kpi-secondary-label">历史报警</span>
                <strong class="kpi-secondary-value">{{ statistics.alarm_count }}</strong>
              </div>
              <div class="kpi-secondary-item">
                <span class="kpi-secondary-label">摄像头</span>
                <strong class="kpi-secondary-value">{{ statistics.camera_count }}</strong>
              </div>
              <div class="kpi-secondary-item">
                <span class="kpi-secondary-label">算法</span>
                <strong class="kpi-secondary-value">{{ statistics.algorithm_count }}</strong>
              </div>
            </div>
          </div>
        </section>

        <article class="panel alarm-panel">
          <div class="panel-title-row compact-title">
            <div>
              <span class="panel-kicker">实时报警</span>
              <h2>告警事件</h2>
            </div>
            <span class="panel-total">今日 {{ todayAlarmCount }} 次</span>
          </div>
          <div class="alarm-list">
            <div v-for="alarm in alarmList" :key="alarm.id" class="alarm-item">
              <div class="alarm-thumb">
                <img
                  v-if="getAlarmImageUrl(alarm) && !alarm.imageError"
                  :src="getAlarmImageUrl(alarm)!"
                  alt=""
                  @error="alarm.imageError = true"
                />
                <Icon v-else icon="ant-design:alert-outlined" :size="18" color="#ef4444" />
              </div>
              <div class="alarm-info">
                <div class="alarm-title">{{ alarm.title }}</div>
                <div class="alarm-meta">
                  <span :class="['alarm-tag', alarm.taskTypeClass]">{{ alarm.taskTypeText }}</span>
                  <span class="alarm-device">{{ alarm.location }}</span>
                </div>
                <div class="alarm-time">{{ alarm.time }}</div>
              </div>
            </div>
            <div v-if="!alarmList.length" class="empty-state compact">暂无实时告警</div>
          </div>
        </article>
      </aside>

      <!-- 中间上：视频 -->
      <article class="panel video-panel">
        <div class="panel-title-row compact-title">
          <div>
            <span class="panel-kicker">实时监控</span>
          </div>
          <div class="video-actions">
            <select
              v-model="selectedDeviceId"
              class="camera-select"
              :disabled="!deviceList.length || streamLoading"
              @change="handleDeviceSelect"
            >
              <option value="">选择摄像头</option>
              <option v-for="device in deviceList" :key="device.id" :value="device.id">
                {{ device.name || device.id }}
              </option>
            </select>
            <span :class="['stream-status', { online: Boolean(currentStreamUrl) }]">
              {{ currentStreamUrl ? '流已就绪' : '等待选择' }}
            </span>
          </div>
        </div>
        <div class="video-stage-wrap">
          <div
            class="video-stage"
            :class="{ 'drag-over': videoDragOver }"
            @dragover.prevent="videoDragOver = true"
            @dragleave="handleVideoDragLeave"
            @drop="handleVideoDrop"
          >
            <Jessibuca
              v-if="currentStreamUrl"
              :key="currentStreamUrl"
              :play-url="currentStreamUrl"
              :has-audio="false"
              class="video-player"
            />
            <div v-else class="video-placeholder">
              <Icon icon="ant-design:video-camera-outlined" :size="40" color="#60a5fa" />
              <strong>{{ videoPlaceholderTitle }}</strong>
              <span>从右侧列表拖入摄像头，或点击摄像头播放</span>
            </div>
            <div v-if="playingDevice" class="video-caption">
              <span>{{ playingDevice.name || playingDevice.id }}</span>
            </div>
          </div>
        </div>
      </article>

      <!-- 右侧：分组 + 摄像头列表 -->
      <article class="panel device-panel">
        <div class="device-section groups-section">
          <div class="section-label">摄像头分组</div>
          <div v-if="directoryTree.length" class="group-list">
            <button
              v-for="item in flatDirectoryItems"
              :key="item.key"
              type="button"
              :class="['group-item', { active: selectedDirectoryKey === item.key }]"
              :style="{ paddingLeft: `${10 + item.depth * 12}px` }"
              @click="selectDirectory(item.key)"
            >
              <Icon icon="ant-design:folder-outlined" :size="14" />
              <span class="group-name">{{ item.title }}</span>
            </button>
          </div>
          <div v-else-if="!treeLoading" class="empty-state compact">暂无分组</div>
          <div v-else class="empty-state compact">加载中...</div>
        </div>
        <div class="device-section-divider" />
        <div class="device-section cameras-section">
          <div class="section-label">
            摄像头
            <span v-if="groupCameras.length" class="section-count">{{ groupCameras.length }} 台</span>
          </div>
          <div class="camera-list">
            <div
              v-for="device in groupCameras"
              :key="device.id"
              class="camera-drag-item"
              draggable="true"
              :class="{ active: playingDevice?.id === device.id }"
              @click="selectAndPlayDevice(device)"
              @dragstart="handleCameraDragStart($event, device)"
              @dragend="draggingDeviceId = ''"
            >
              <Icon icon="ant-design:camera-filled" :size="14" />
              <span class="camera-name">{{ device.name || device.id }}</span>
              <Icon icon="ant-design:drag-outlined" :size="12" class="drag-handle" />
            </div>
            <div v-if="!groupCameras.length && !treeLoading" class="empty-state compact">
              该分组暂无摄像头
            </div>
          </div>
        </div>
      </article>

      <!-- 中间下：算法占比 + 摄像头排行（视频下方） -->
      <article class="panel stats-panel">
        <div class="stats-split">
          <section class="stats-block">
            <div class="panel-title-row compact-title">
              <div>
                <span class="panel-kicker">报警统计</span>
                <h2>算法报警占比</h2>
              </div>
              <div class="panel-title-actions">
                <div class="period-tabs compact" role="tablist" aria-label="算法统计周期">
                  <button
                    v-for="item in periodOptions"
                    :key="item.value"
                    type="button"
                    :class="['period-tab', { active: algorithmPeriod === item.value }]"
                    role="tab"
                    :aria-selected="algorithmPeriod === item.value"
                    @click="algorithmPeriod = item.value"
                  >
                    {{ item.label }}
                  </button>
                </div>
              </div>
            </div>
            <div v-if="algorithmRanking.length" class="donut-wrap bottom">
              <div class="donut large" :style="algorithmDonutStyle">
                <div class="donut-center">
                  <strong>{{ algorithmPeriodData.alarm_count }}</strong>
                  <span>总数</span>
                </div>
              </div>
              <div class="legend-list horizontal">
                <div v-for="(item, index) in algorithmRanking.slice(0, 8)" :key="item.name" class="legend-row">
                  <span class="legend-dot" :style="{ backgroundColor: chartColors[index % chartColors.length] }" />
                  <span class="legend-name" :title="item.name">{{ item.name }}</span>
                  <strong>{{ item.count }}</strong>
                  <span>{{ item.percentage.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state compact">当前周期暂无算法报警</div>
          </section>

          <div class="stats-divider" />

          <section class="stats-block">
            <div class="panel-title-row compact-title">
              <div>
                <span class="panel-kicker">报警统计</span>
                <h2>{{ rankMode === 'directory' ? '分组报警排行' : '摄像头报警排行' }}</h2>
              </div>
              <div class="panel-title-actions">
                <div class="period-tabs compact" role="tablist" aria-label="排行统计周期">
                  <button
                    v-for="item in periodOptions"
                    :key="item.value"
                    type="button"
                    :class="['period-tab', { active: rankingPeriod === item.value }]"
                    role="tab"
                    :aria-selected="rankingPeriod === item.value"
                    @click="rankingPeriod = item.value"
                  >
                    {{ item.label }}
                  </button>
                </div>
                <div class="rank-mode-tabs">
                  <button
                    type="button"
                    :class="['rank-mode-tab', { active: rankMode === 'camera' }]"
                    @click="rankMode = 'camera'"
                  >
                    摄像头
                  </button>
                  <button
                    type="button"
                    :class="['rank-mode-tab', { active: rankMode === 'directory' }]"
                    @click="rankMode = 'directory'"
                  >
                    分组
                  </button>
                </div>
              </div>
            </div>
            <div v-if="displayRanking.length" class="ranking-list">
              <div
                v-for="(item, index) in displayRanking.slice(0, 5)"
                :key="`${rankMode}-${item.name}`"
                class="ranking-row"
              >
                <span :class="['rank-no', { top: index < 3 }]">{{ index + 1 }}</span>
                <div class="rank-body">
                  <div class="rank-line">
                    <span :title="item.name">{{ item.name }}</span>
                    <strong>{{ item.count }} 次</strong>
                  </div>
                  <div class="rank-bar">
                    <i :style="{ width: `${rankingWidth(item.count, displayRanking)}%` }" />
                  </div>
                </div>
                <span class="rank-percent">{{ item.percentage.toFixed(1) }}%</span>
              </div>
            </div>
            <div v-else class="empty-state compact">
              {{ rankMode === 'directory' ? '当前周期暂无分组报警' : '当前周期暂无摄像头报警' }}
            </div>
          </section>
        </div>
      </article>
    </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@/components/Icon'
import Jessibuca from '@/components/Player/module/jessibuca.vue'
import { getDashboardStatistics, queryAlarmList } from '@/api/device/calculate'
import { getMonitorDashboardConfig } from './config'
import {
  getDeviceList,
  getDirectoryList,
  startStreamForwarding,
  type DeviceDirectory,
  type DeviceInfo,
} from '@/api/device/camera'
import { useMessage } from '@/hooks/web/useMessage'
import { usePageContext } from '@/hooks/component/usePageContext'

defineOptions({ name: 'MonitorDashboard' })

const pageContext = usePageContext()
const dashboardStyle = computed(() => {
  const height = pageContext?.contentHeight?.value
  if (height && height > 0) {
    return {
      height: `${height}px`,
      maxHeight: `${height}px`,
    }
  }
  return {
    height: 'calc(100vh - 48px)',
    maxHeight: 'calc(100vh - 48px)',
  }
})

type PeriodKey = 'today' | 'week' | 'month'
type RankMode = 'camera' | 'directory'

interface DirectoryTreeItem {
  key: string
  title: string
  depth: number
}

interface TreeItem {
  key: string
  title: string
  isDevice?: boolean
  isDirectory?: boolean
  device?: DeviceInfo
  children?: TreeItem[]
}

interface RankingItem {
  name: string
  count: number
  percentage: number
  directory_name?: string
}

interface PeriodStatistics {
  label: string
  alarm_count: number
  algorithm_ranking: RankingItem[]
  camera_ranking: RankingItem[]
  directory_ranking: RankingItem[]
}

interface AlarmItem {
  id: string | number
  title: string
  location: string
  time: string
  type: string
  taskTypeText: string
  taskTypeClass: string
  image?: string | null
  image_url?: string | null
  imageError?: boolean
  event?: string
  device_name?: string
}

const emptyPeriod = (label: string): PeriodStatistics => ({
  label,
  alarm_count: 0,
  algorithm_ranking: [],
  camera_ranking: [],
  directory_ranking: [],
})

const { createMessage } = useMessage()
const dashboardConfig = getMonitorDashboardConfig()

const loading = ref(false)
const streamLoading = ref(false)
const kpiPeriod = ref<PeriodKey>('today')
const algorithmPeriod = ref<PeriodKey>('today')
const rankingPeriod = ref<PeriodKey>('today')
const rankMode = ref<RankMode>('camera')
const currentStreamUrl = ref('')
const playingDevice = ref<DeviceInfo | null>(null)
const deviceList = ref<DeviceInfo[]>([])
const selectedDeviceId = ref('')
const treeLoading = ref(false)
const directoryTree = ref<TreeItem[]>([])
const selectedDirectoryKey = ref('')
const videoDragOver = ref(false)
const draggingDeviceId = ref('')
const alarmList = ref<AlarmItem[]>([])
const todayAlarmCount = ref(0)

let alarmRefreshTimer: ReturnType<typeof setInterval> | null = null

const periodOptions = [
  { label: '今日', value: 'today' as PeriodKey },
  { label: '本周', value: 'week' as PeriodKey },
  { label: '本月', value: 'month' as PeriodKey },
]
const chartColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']

const statistics = ref({
  alarm_count: 0,
  camera_count: 0,
  algorithm_count: 0,
  today_alarm_count: 0,
  periods: {
    today: emptyPeriod('今日'),
    week: emptyPeriod('本周'),
    month: emptyPeriod('本月'),
  } as Record<PeriodKey, PeriodStatistics>,
})

const kpiPeriodData = computed(() => statistics.value.periods[kpiPeriod.value] || emptyPeriod('当前'))
const algorithmPeriodData = computed(() => statistics.value.periods[algorithmPeriod.value] || emptyPeriod('当前'))
const rankingPeriodData = computed(() => statistics.value.periods[rankingPeriod.value] || emptyPeriod('当前'))
const algorithmRanking = computed(() => algorithmPeriodData.value.algorithm_ranking || [])
const displayRanking = computed(() => {
  const period = rankingPeriodData.value
  if (rankMode.value === 'directory')
    return period.directory_ranking || []
  return period.camera_ranking || []
})

function buildDonutStyle(items: RankingItem[]) {
  if (!items.length)
    return {}
  let cursor = 0
  const stops = items.map((item, index) => {
    const start = cursor
    cursor += item.percentage
    return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
}

const algorithmDonutStyle = computed(() => buildDonutStyle(algorithmRanking.value))

function rankingWidth(count: number, items: RankingItem[]) {
  const max = Math.max(...items.map(i => i.count), 1)
  return Math.max((count / max) * 100, 8)
}

const videoPlaceholderTitle = computed(() => streamLoading.value ? '正在准备视频流...' : '请拖入或选择摄像头')

function flattenDirectoryTree(nodes: TreeItem[], depth = 0): DirectoryTreeItem[] {
  const items: DirectoryTreeItem[] = []
  nodes.forEach((node) => {
    if (node.isDirectory) {
      items.push({ key: String(node.key), title: node.title, depth })
      if (node.children?.length)
        items.push(...flattenDirectoryTree(node.children.filter(c => c.isDirectory), depth + 1))
    }
  })
  return items
}

const flatDirectoryItems = computed(() => flattenDirectoryTree(directoryTree.value))

const groupCameras = computed(() => {
  if (!selectedDirectoryKey.value)
    return deviceList.value
  if (selectedDirectoryKey.value === 'dir_uncategorized')
    return deviceList.value.filter(d => !getDeviceDirectoryId(d))
  const dirId = selectedDirectoryKey.value.replace(/^dir_/, '')
  return deviceList.value.filter(d => String(getDeviceDirectoryId(d) ?? '') === dirId)
})

function selectDirectory(key: string) {
  selectedDirectoryKey.value = key
}

function selectAndPlayDevice(device: DeviceInfo) {
  selectedDeviceId.value = device.id
  handlePlayDevice(device)
}

function handleCameraDragStart(event: DragEvent, device: DeviceInfo) {
  draggingDeviceId.value = device.id
  event.dataTransfer?.setData('application/x-device-id', device.id)
  event.dataTransfer?.setData('text/plain', device.name || device.id)
  if (event.dataTransfer)
    event.dataTransfer.effectAllowed = 'copy'
}

function handleVideoDragLeave(event: DragEvent) {
  const related = event.relatedTarget as Node | null
  if (!event.currentTarget || (related && (event.currentTarget as Node).contains(related)))
    return
  videoDragOver.value = false
}

function handleVideoDrop(event: DragEvent) {
  event.preventDefault()
  videoDragOver.value = false
  const deviceId = event.dataTransfer?.getData('application/x-device-id') || draggingDeviceId.value
  if (!deviceId)
    return
  const device = deviceList.value.find(d => d.id === deviceId)
  if (device)
    selectAndPlayDevice(device)
  draggingDeviceId.value = ''
}

function buildDirectoryTree(flat: DeviceDirectory[]): DeviceDirectory[] {
  const map = new Map<number, DeviceDirectory>()
  const roots: DeviceDirectory[] = []
  flat.forEach((dir) => {
    map.set(dir.id, { ...dir, children: dir.children ? [...dir.children] : [] })
  })
  flat.forEach((dir) => {
    const node = map.get(dir.id)
    if (!node)
      return
    if (dir.parent_id != null && map.has(dir.parent_id)) {
      const parent = map.get(dir.parent_id)!
      parent.children = parent.children || []
      if (!parent.children.some(child => child.id === node.id))
        parent.children.push(node)
    }
    else if (!roots.some(root => root.id === node.id)) {
      roots.push(node)
    }
  })
  return roots
}

function normalizeDirectoryList(response: any): DeviceDirectory[] {
  if (!response)
    return []
  let list: DeviceDirectory[] = []
  if (Array.isArray(response))
    list = response
  else if (response.code !== undefined)
    list = response.data || []
  if (!list.length)
    return []

  const hasNestedChildren = list.some(dir => dir.children?.length)
  if (hasNestedChildren)
    return list

  const hasParentId = list.some(dir => dir.parent_id != null)
  if (hasParentId)
    return buildDirectoryTree(list)

  return list
}

function getDeviceDirectoryId(device: DeviceInfo) {
  return (device as DeviceInfo & { directory_id?: number | string | null }).directory_id
}

function convertToDirectoryTree(directories: DeviceDirectory[]): TreeItem[] {
  return directories.map((dir) => ({
    key: `dir_${dir.id}`,
    title: dir.name,
    isDirectory: true,
    children: dir.children?.length ? convertToDirectoryTree(dir.children) : undefined,
  }))
}

function appendUncategorizedDirectory(tree: TreeItem[], devices: DeviceInfo[]) {
  const uncategorized = devices.filter(d => !getDeviceDirectoryId(d))
  if (!uncategorized.length)
    return
  tree.push({
    key: 'dir_uncategorized',
    title: '未分组',
    isDirectory: true,
  })
}

async function loadTreeData() {
  treeLoading.value = true
  try {
    const [dirResponse, deviceResponse] = await Promise.all([
      getDirectoryList(),
      getDeviceList({ pageNo: 1, pageSize: 10000 }),
    ])
    const devices = normalizeDeviceList(deviceResponse)
    deviceList.value = devices
    const directories = normalizeDirectoryList(dirResponse)
    const tree = convertToDirectoryTree(directories)
    appendUncategorizedDirectory(tree, devices)
    directoryTree.value = tree
    if (!selectedDirectoryKey.value && tree.length)
      selectedDirectoryKey.value = String(tree[0].key)
  }
  catch (error) {
    console.error('加载设备目录失败', error)
    directoryTree.value = []
  }
  finally {
    treeLoading.value = false
  }
}

function getAlarmTaskType(alarm: any) {
  let taskType: string | null = alarm.task_type || null
  if (!taskType && alarm.information) {
    try {
      const info = typeof alarm.information === 'string' ? JSON.parse(alarm.information) : alarm.information
      taskType = info?.task_type || null
    }
    catch { /* ignore */ }
  }
  const isSnap = taskType === 'snap' || taskType === 'snapshot'
  return {
    taskTypeText: isSnap ? '抓拍' : '实时',
    taskTypeClass: isSnap ? 'tag-snap' : 'tag-realtime',
  }
}

function mapAlarmItem(item: any): AlarmItem {
  const { taskTypeText, taskTypeClass } = getAlarmTaskType(item)
  let type = 'default'
  const event = item.event || item.title || ''
  if (/火|fire/i.test(event))
    type = 'fire'
  else if (/烟|smoke/i.test(event))
    type = 'smoke'
  else if (/入侵|intrusion/i.test(event))
    type = 'intrusion'

  return {
    id: item.id || item.alert_id,
    title: event || '未知事件',
    location: item.device_name || item.location || '未知设备',
    time: item.time || item.alert_time || item.created_at || '',
    type,
    taskTypeText,
    taskTypeClass,
    image: item.image_url || item.image_path || null,
    image_url: item.image_url || item.image_path || null,
    imageError: false,
    event,
    device_name: item.device_name,
  }
}

function getAlarmImageUrl(alarm: AlarmItem) {
  const url = alarm.image_url || alarm.image
  if (!url)
    return null
  if (url.startsWith('http://') || url.startsWith('https://'))
    return url
  if (url.startsWith('/'))
    return `${window.location.origin}${url}`
  return url
}

function convertRtmpToHttp(rtmpUrl?: string) {
  if (!rtmpUrl?.startsWith('rtmp://'))
    return ''
  try {
    const url = new URL(rtmpUrl)
    let path = url.pathname.replace(/^\//, '') || 'live'
    if (!path.endsWith('.flv'))
      path += '.flv'
    return `/${path}`
  }
  catch {
    return ''
  }
}

async function ensureOriginalStreamUrl(device: DeviceInfo) {
  if (device.http_stream)
    return device.http_stream.startsWith('http') || device.http_stream.startsWith('/') ? device.http_stream : device.http_stream
  if (device.rtmp_stream) {
    const converted = convertRtmpToHttp(device.rtmp_stream)
    if (converted)
      return converted
  }
  const response = await startStreamForwarding(device.id)
  const payload = response?.code !== undefined ? response.data ?? response : response
  return payload?.http_stream || convertRtmpToHttp(payload?.rtmp_stream || device.rtmp_stream) || ''
}

function normalizeDeviceList(response: any): DeviceInfo[] {
  if (!response)
    return []
  if (Array.isArray(response))
    return response
  if (response.code !== undefined)
    return response.data?.list || response.data?.records || response.data || []
  return response.list || response.records || (Array.isArray(response.data) ? response.data : [])
}

async function loadStatistics() {
  const response = await getDashboardStatistics()
  if (response) {
    statistics.value = {
      ...statistics.value,
      ...response,
      periods: { ...statistics.value.periods, ...(response.periods || {}) },
    }
    todayAlarmCount.value = response.today_alarm_count ?? response.periods?.today?.alarm_count ?? 0
  }
}

async function loadAlarmList() {
  try {
    const response = await queryAlarmList({
      pageNo: 1,
      pageSize: dashboardConfig.rightAlarmPageSize,
    })
    if (response?.alert_list) {
      alarmList.value = response.alert_list.map(mapAlarmItem)
    }
    else {
      alarmList.value = []
    }
  }
  catch (error) {
    console.error('加载实时告警失败', error)
    alarmList.value = []
  }
}

async function handlePlayDevice(device: DeviceInfo) {
  streamLoading.value = true
  try {
    const streamUrl = await ensureOriginalStreamUrl(device)
    if (!streamUrl) {
      createMessage.warning('该摄像头暂无原始流地址')
      currentStreamUrl.value = ''
      playingDevice.value = null
      return
    }
    playingDevice.value = device
    currentStreamUrl.value = streamUrl
  }
  catch (error) {
    console.error('播放失败', error)
    createMessage.error('播放摄像头失败')
  }
  finally {
    streamLoading.value = false
  }
}

function handleDeviceSelect() {
  if (!selectedDeviceId.value) {
    currentStreamUrl.value = ''
    playingDevice.value = null
    return
  }
  const device = deviceList.value.find(d => d.id === selectedDeviceId.value)
  if (device)
    handlePlayDevice(device)
}

async function refreshDashboard() {
  loading.value = true
  try {
    await Promise.all([loadStatistics(), loadTreeData(), loadAlarmList()])
  }
  catch (error) {
    console.error('刷新看板失败', error)
    createMessage.error('首页看板加载失败')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshDashboard()
  alarmRefreshTimer = setInterval(() => {
    loadAlarmList()
    loadStatistics()
  }, dashboardConfig.refreshIntervalSeconds * 1000)
})

onUnmounted(() => {
  if (alarmRefreshTimer) {
    clearInterval(alarmRefreshTimer)
    alarmRefreshTimer = null
  }
})
</script>

<style lang="less" scoped>
.overview-dashboard {
  display: flex;
  justify-content: center;
  width: 100%;
  color: #172033;
  background: #e4e8f0;
  box-sizing: border-box;
  overflow: hidden;
}

.dashboard-canvas {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1440px;
  height: 100%;
  margin: 0 auto;
  padding: 12px 16px;
  background: #f5f7fb;
  box-sizing: border-box;
  box-shadow: 0 0 0 1px rgba(38, 53, 83, .06);
}

.dashboard-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  flex-shrink: 0;

  h1 { margin: 0 0 2px; font-size: 20px; font-weight: 700; line-height: 1.2; }
  p { margin: 0; color: #7b8498; font-size: 12px; }
}

.heading-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.eyebrow, .panel-kicker {
  color: #3b82f6;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  color: #fff;
  background: #172033;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  &:disabled { opacity: .55; }
}

.period-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: #e9edf5;
  border-radius: 8px;
}

.period-tab {
  border: 0;
  cursor: pointer;
  font-size: 12px;
  padding: 6px 12px;
  color: #6c7588;
  background: transparent;
  border-radius: 6px;
  &.active { color: #172033; background: #fff; box-shadow: 0 2px 8px rgba(31, 45, 75, .08); }
}

.dashboard-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 220px;
  grid-template-rows: minmax(0, 1.65fr) minmax(0, 1fr);
  gap: 10px;
}

.left-stack {
  grid-column: 1;
  grid-row: 1 / 3;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
}

.left-stack .alarm-panel {
  flex: 1;
  min-height: 0;
}

.video-panel {
  grid-column: 2;
  grid-row: 1;
  min-height: 0;
}

.stats-panel {
  grid-column: 2 / -1;
  grid-row: 2;
  min-height: 0;
  padding: 10px 12px !important;
}

.device-panel {
  grid-column: 3;
  grid-row: 1;
  min-height: 0;
  max-height: 100%;
  align-self: stretch;
  padding: 0 !important;
}

.stats-split {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  gap: 0 16px;
}

.stats-block {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.stats-divider {
  width: 1px;
  background: #edf0f5;
  align-self: stretch;
}

.panel-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;

  h2 { margin: 2px 0 0; font-size: 15px; font-weight: 650; }
  &.compact-title { margin-bottom: 8px; }
}

.panel-title-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.rank-mode-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: #eef2f7;
  border-radius: 6px;
}

.rank-mode-tab {
  border: 0;
  cursor: pointer;
  font-size: 11px;
  padding: 4px 8px;
  color: #6c7588;
  background: transparent;
  border-radius: 4px;
  white-space: nowrap;
  &.active {
    color: #172033;
    background: #fff;
    box-shadow: 0 1px 4px rgba(31, 45, 75, .08);
  }
}

.period-tabs.compact {
  gap: 2px;
  padding: 2px;
  .period-tab {
    font-size: 11px;
    padding: 4px 8px;
  }
}

.kpi-board {
  flex-shrink: 0;
  padding: 8px !important;
}

.kpi-period-tabs {
  display: flex;
  width: 100%;
  margin-bottom: 6px;

  .period-tab {
    flex: 1;
    min-width: 0;
    text-align: center;
    white-space: nowrap;
  }
}

.kpi-board-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 82px;
  gap: 6px;
  min-height: 88px;
}

.kpi-primary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  min-width: 0;
}

.kpi-primary-label {
  font-size: 11px;
  color: #737d91;
}

.kpi-primary-value {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  color: #ef4444;
}

.kpi-secondary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
}

.kpi-secondary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 6px 8px;
  background: #f8fafc;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  min-height: 0;
}

.kpi-secondary-label {
  font-size: 10px;
  color: #737d91;
  line-height: 1.2;
}

.kpi-secondary-value {
  font-size: 15px;
  font-weight: 700;
  color: #172033;
  line-height: 1.1;
}

.device-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 10px 12px;
}

.groups-section {
  flex: 0 0 38%;
  max-height: 42%;
}

.cameras-section {
  flex: 1;
  min-height: 0;
}

.device-section-divider {
  height: 1px;
  background: #edf0f5;
  flex-shrink: 0;
}

.section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #737d91;
  letter-spacing: .04em;
  flex-shrink: 0;
}

.section-count {
  font-size: 10px;
  font-weight: 500;
  color: #9aa3b5;
}

.group-list,
.camera-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: thin;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #4d5669;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background .15s;

  &:hover { background: #f3f5f9; }
  &.active {
    background: #eef4ff;
    color: #2563eb;
    font-weight: 600;
  }
}

.group-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.camera-drag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #edf0f5;
  font-size: 12px;
  color: #344054;
  cursor: grab;
  user-select: none;
  transition: border-color .15s, background .15s;

  &:hover { background: #f0f4ff; border-color: #dbeafe; }
  &.active {
    background: #eef4ff;
    border-color: #93c5fd;
    color: #1d4ed8;
  }
  &:active { cursor: grabbing; }
}

.camera-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drag-handle {
  flex-shrink: 0;
  color: #b0b8c7;
}

.video-stage.drag-over {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, .25);
}

.panel {
  background: #fff;
  border: 1px solid #e7eaf1;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(38, 53, 83, .05);
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 10px 12px;
  overflow: hidden;
}

.ranking-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scrollbar-width: thin;
}

.ranking-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.rank-no {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  font-size: 10px;
  border-radius: 5px;
  background: #f0f2f6;
  color: #8c95a7;
  &.top { background: #172033; color: #fff; }
}

.rank-body { flex: 1; min-width: 0; }

.rank-line {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 11px;
  margin-bottom: 4px;
  span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #4d5669; }
  strong { flex-shrink: 0; font-size: 10px; color: #1d2939; }
}

.rank-bar {
  height: 4px;
  background: #edf0f5;
  border-radius: 4px;
  overflow: hidden;
  i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #60a5fa, #2563eb);
    border-radius: inherit;
  }
}

.rank-percent {
  flex-shrink: 0;
  font-size: 10px;
  color: #8891a3;
  line-height: 20px;
}

.panel-total {
  padding: 3px 8px;
  color: #ef4444;
  font-size: 11px;
  background: #fef2f2;
  border-radius: 999px;
  white-space: nowrap;
}

.video-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.camera-select {
  max-width: 160px;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  color: #344054;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  &:disabled { opacity: .6; cursor: not-allowed; }
}

.stream-status {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #f0f2f6;
  color: #8992a5;
  white-space: nowrap;
  &.online { background: #ecfdf3; color: #15803d; }
}

.video-stage-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-stage {
  width: 100%;
  max-height: 100%;
  aspect-ratio: 16 / 9;
  position: relative;
  background: #09111f;
  border: 2px solid #e7eaf1;
  border-radius: 10px;
  overflow: hidden;
}

.video-player {
  width: 100%;
  height: 100%;
  min-height: 0;
}

:deep(.video-player > div),
:deep(.video-player #container) {
  width: 100% !important;
  height: 100% !important;
  min-height: 0;
}

.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #dce8ff;
  text-align: center;
  padding: 16px;
  background: radial-gradient(circle at 50% 40%, #192a48, #080f1c 70%);

  strong { font-size: 14px; }
  span { font-size: 12px; color: #73809a; max-width: 240px; }
}

.video-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 20px 12px 8px;
  color: #fff;
  font-size: 11px;
  background: linear-gradient(transparent, rgba(0, 0, 0, .75));
  pointer-events: none;
}

.alarm-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scrollbar-width: thin;
}

.alarm-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #edf0f5;
  border-left: 3px solid #ef4444;
  border-radius: 8px;
  flex-shrink: 0;
}

.alarm-thumb {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: #eef2f7;
  display: grid;
  place-items: center;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.alarm-info { min-width: 0; flex: 1; }
.alarm-title { font-size: 12px; font-weight: 600; color: #1d2939; margin-bottom: 3px; line-height: 1.3; }
.alarm-meta { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; flex-wrap: wrap; }
.alarm-tag {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 500;
  &.tag-realtime { background: #dbeafe; color: #2563eb; }
  &.tag-snap { background: #d1fae5; color: #059669; }
}
.alarm-device { font-size: 10px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.alarm-time { font-size: 10px; color: #9ca3af; }

.donut-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 12px;

  &.compact {
    flex: 0 0 auto;
    min-height: 100px;
  }

  &.side {
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 0 4px;
  }

  &.bottom {
    justify-content: center;
    gap: 24px;
    padding: 0 12px;
  }
}

.donut {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 50%;
  position: relative;
  display: grid;
  place-items: center;
  transform: rotate(-90deg);

  &.large {
    width: 110px;
    height: 110px;
  }

  &::after {
    content: '';
    width: 52px;
    height: 52px;
    background: #fff;
    border-radius: 50%;
  }

  &.large::after {
    width: 66px;
    height: 66px;
  }
}

.donut-center {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: rotate(90deg);
  strong { font-size: 16px; }
  span { font-size: 10px; color: #929bad; }

  .large & strong { font-size: 20px; }
}

.legend-list {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  scrollbar-width: thin;

  &.horizontal {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 16px;
    overflow-y: auto;
    max-height: 100%;
  }
}

.legend-row {
  display: grid;
  grid-template-columns: 8px 1fr auto 36px;
  gap: 5px;
  align-items: center;
  padding: 3px 0;
  font-size: 11px;
  color: #8891a3;
  border-bottom: 1px solid #f0f2f6;
  strong { color: #344054; }
}

.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #596174; }

.empty-state {
  flex: 1;
  display: grid;
  place-items: center;
  color: #a1a8b6;
  font-size: 13px;

  &.compact {
    flex: 0 0 auto;
    min-height: 80px;
  }
}

@media (max-width: 1200px) {
  .dashboard-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    overflow-y: auto;
  }

  .left-stack,
  .video-panel,
  .stats-panel,
  .device-panel {
    grid-column: 1;
    grid-row: auto;
  }

  .left-stack { min-height: 420px; }
  .device-panel { min-height: 480px; }
  .stats-split {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1px auto;
    gap: 12px 0;
  }
  .stats-divider {
    width: 100%;
    height: 1px;
  }

  .overview-dashboard,
  .dashboard-canvas {
    height: auto !important;
    max-height: none !important;
  }
  .overview-dashboard { overflow: visible; }
  .video-stage { aspect-ratio: 16 / 9; max-height: none; min-height: 200px; }
}
</style>
