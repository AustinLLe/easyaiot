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
        <div class="period-tabs" role="tablist" aria-label="统计周期">
          <button
            v-for="item in periodOptions"
            :key="item.value"
            :class="['period-tab', { active: selectedPeriod === item.value }]"
            role="tab"
            :aria-selected="selectedPeriod === item.value"
            @click="selectedPeriod = item.value"
          >
            {{ item.label }}
          </button>
        </div>
        <button class="refresh-button" :disabled="loading" @click="refreshDashboard">
          <Icon icon="ant-design:reload-outlined" :size="16" />
          {{ loading ? '刷新中' : '刷新数据' }}
        </button>
      </div>
    </header>

    <section class="dashboard-body">
      <!-- 左侧：告警事件 -->
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

      <!-- 中间上：视频 -->
      <article class="panel video-panel">
        <div class="panel-title-row compact-title">
          <div>
            <span class="panel-kicker">实时监控</span>
            <h2>原始视频流</h2>
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
          <div class="video-stage">
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
              <span>从右侧分组目录选择摄像头播放</span>
            </div>
            <div v-if="playingDevice" class="video-caption">
              <span>{{ playingDevice.name || playingDevice.id }}</span>
              <span>原始流</span>
            </div>
          </div>
        </div>
      </article>

      <!-- 中间下：算法占比 -->
      <article class="panel algorithm-panel">
        <div class="panel-title-row compact-title">
          <div>
            <span class="panel-kicker">报警统计</span>
            <h2>算法报警占比</h2>
          </div>
          <span class="panel-total">{{ currentPeriod.alarm_count }} 次</span>
        </div>
        <div v-if="algorithmRanking.length" class="donut-wrap bottom">
          <div class="donut large" :style="algorithmDonutStyle">
            <div class="donut-center">
              <strong>{{ currentPeriod.alarm_count }}</strong>
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
      </article>

      <!-- 右侧：KPI + 设备分组 + 摄像头排行 -->
      <aside class="right-stack">
        <section class="kpi-compact panel">
          <article v-for="metric in kpiMetrics" :key="metric.label" class="kpi-mini-card">
            <div class="kpi-mini-icon" :style="{ color: metric.color, backgroundColor: `${metric.color}18` }">
              <Icon :icon="metric.icon" :size="16" />
            </div>
            <div class="kpi-mini-text">
              <div class="kpi-mini-label">{{ metric.label }}</div>
              <div class="kpi-mini-value" :style="{ color: metric.color }">{{ metric.value }}</div>
            </div>
          </article>
        </section>

        <article class="panel device-panel">
          <div class="panel-title-row compact-title">
            <div>
              <span class="panel-kicker">设备管理</span>
              <h2>设备分组</h2>
            </div>
            <span v-if="treeDeviceCount" class="device-count">{{ treeDeviceCount }} 台</span>
          </div>
          <p class="tree-hint">按分组浏览，点击摄像头播放原始流</p>
          <div class="tree-body">
            <BasicTree
              :tree-data="treeData"
              :expanded-keys="expandedKeys"
              :selected-keys="selectedKeys"
              :loading="treeLoading"
              search
              :default-expand-all="true"
              :click-row-to-expand="true"
              :render-icon="renderTreeIcon"
              tree-wrapper-class-name="dashboard-tree-wrapper"
              @update:expanded-keys="expandedKeys = $event"
              @select="handleTreeSelect"
            >
              <template #title="node">
                <span v-if="node.isDevice" class="device-node">
                  <Icon icon="ant-design:camera-filled" :size="12" />
                  <span class="device-name">{{ node.title }}</span>
                </span>
                <span v-else class="directory-node">{{ node.title }}</span>
              </template>
            </BasicTree>
          </div>
        </article>

        <article class="panel camera-rank-panel">
          <div class="panel-title-row compact-title">
            <div>
              <span class="panel-kicker">报警统计</span>
              <h2>摄像头报警排行</h2>
            </div>
            <span class="panel-total">{{ currentPeriod.alarm_count }} 次</span>
          </div>
          <div v-if="cameraRanking.length" class="ranking-list">
            <div
              v-for="(item, index) in cameraRanking.slice(0, 5)"
              :key="item.name"
              class="ranking-row"
            >
              <span :class="['rank-no', { top: index < 3 }]">{{ index + 1 }}</span>
              <div class="rank-body">
                <div class="rank-line">
                  <span :title="item.name">{{ item.name }}</span>
                  <strong>{{ item.count }} 次</strong>
                </div>
                <div class="rank-bar">
                  <i :style="{ width: `${rankingWidth(item.count)}%` }" />
                </div>
              </div>
              <span class="rank-percent">{{ item.percentage.toFixed(1) }}%</span>
            </div>
          </div>
          <div v-else class="empty-state compact">当前周期暂无摄像头报警</div>
        </article>
      </aside>
    </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@/components/Icon'
import { BasicTree } from '@/components/Tree'
import type { TreeItem } from '@/components/Tree'
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
const selectedPeriod = ref<PeriodKey>('today')
const currentStreamUrl = ref('')
const playingDevice = ref<DeviceInfo | null>(null)
const deviceList = ref<DeviceInfo[]>([])
const selectedDeviceId = ref('')
const treeLoading = ref(false)
const treeData = ref<TreeItem[]>([])
const expandedKeys = ref<string[]>([])
const selectedKeys = ref<string[]>([])
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

const currentPeriod = computed(() => statistics.value.periods[selectedPeriod.value] || emptyPeriod('当前'))
const algorithmRanking = computed(() => currentPeriod.value.algorithm_ranking || [])
const cameraRanking = computed(() => currentPeriod.value.camera_ranking || [])

const kpiMetrics = computed(() => [
  { label: `${currentPeriod.value.label}报警`, value: currentPeriod.value.alarm_count, icon: 'ant-design:alert-outlined', color: '#ef4444' },
  { label: '历史报警', value: statistics.value.alarm_count, icon: 'ant-design:history-outlined', color: '#f59e0b' },
  { label: '摄像头', value: statistics.value.camera_count, icon: 'ant-design:video-camera-outlined', color: '#3b82f6' },
  { label: '算法', value: statistics.value.algorithm_count, icon: 'ant-design:deployment-unit-outlined', color: '#8b5cf6' },
])

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

function rankingWidth(count: number) {
  const max = Math.max(...cameraRanking.value.map(i => i.count), 1)
  return Math.max((count / max) * 100, 8)
}

const videoPlaceholderTitle = computed(() => streamLoading.value ? '正在准备视频流...' : '请选择摄像头播放')

const treeDeviceCount = computed(() => {
  let count = 0
  const walk = (nodes: TreeItem[]) => {
    nodes.forEach((node) => {
      if (node.isDevice)
        count++
      if (node.children?.length)
        walk(node.children as TreeItem[])
    })
  }
  walk(treeData.value)
  return count
})

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

function convertToTreeData(directories: DeviceDirectory[], devices: DeviceInfo[]): TreeItem[] {
  return directories.map((dir) => {
    const children: TreeItem[] = []
    if (dir.children?.length)
      children.push(...convertToTreeData(dir.children, devices))
    devices
      .filter(d => String(getDeviceDirectoryId(d) ?? '') === String(dir.id))
      .forEach((device) => {
        children.push({
          key: `device_${device.id}`,
          title: device.name || device.id,
          isDevice: true,
          device,
          icon: 'ant-design:camera-filled',
        } as TreeItem)
      })
    return {
      key: `dir_${dir.id}`,
      title: dir.name,
      isDirectory: true,
      icon: 'ant-design:folder-outlined',
      children: children.length ? children : undefined,
    } as TreeItem
  })
}

function appendUncategorizedDevices(tree: TreeItem[], devices: DeviceInfo[]) {
  const uncategorized = devices.filter(d => !getDeviceDirectoryId(d))
  if (!uncategorized.length)
    return
  tree.push({
    key: 'dir_uncategorized',
    title: '未分组',
    isDirectory: true,
    icon: 'ant-design:folder-outlined',
    children: uncategorized.map(device => ({
      key: `device_${device.id}`,
      title: device.name || device.id,
      isDevice: true,
      device,
      icon: 'ant-design:camera-filled',
    }) as TreeItem),
  } as TreeItem)
}

function collectDirectoryKeys(nodes: TreeItem[]): string[] {
  let keys: string[] = []
  nodes.forEach((node) => {
    if (node.isDirectory)
      keys.push(String(node.key))
    if (node.children?.length)
      keys = keys.concat(collectDirectoryKeys(node.children as TreeItem[]))
  })
  return keys
}

function findNodeByKey(nodes: TreeItem[], key: string): TreeItem | null {
  for (const node of nodes) {
    if (node.key === key)
      return node
    if (node.children?.length) {
      const found = findNodeByKey(node.children as TreeItem[], key)
      if (found)
        return found
    }
  }
  return null
}

function renderTreeIcon(node: TreeItem) {
  if (node.isDirectory)
    return 'ant-design:folder-outlined'
  if (node.isDevice)
    return 'ant-design:camera-filled'
  return ''
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
    const tree = convertToTreeData(normalizeDirectoryList(dirResponse), devices)
    appendUncategorizedDevices(tree, devices)
    treeData.value = tree
    expandedKeys.value = [...collectDirectoryKeys(tree), 'dir_uncategorized']
  }
  catch (error) {
    console.error('加载设备目录失败', error)
    treeData.value = []
  }
  finally {
    treeLoading.value = false
  }
}

function handleTreeSelect(keys: string[]) {
  if (!keys.length)
    return
  const node = findNodeByKey(treeData.value, keys[0])
  if (node?.isDevice && node.device) {
    selectedKeys.value = keys
    selectedDeviceId.value = node.device.id
    handlePlayDevice(node.device)
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
    selectedKeys.value = []
    return
  }
  const device = deviceList.value.find(d => d.id === selectedDeviceId.value)
  if (device) {
    selectedKeys.value = [`device_${device.id}`]
    handlePlayDevice(device)
  }
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
  grid-template-columns: 260px minmax(420px, 1fr) 280px;
  grid-template-rows: minmax(0, 1.65fr) minmax(0, 1fr);
  gap: 10px;
}

.alarm-panel {
  grid-column: 1;
  grid-row: 1 / 3;
  min-height: 0;
}

.video-panel {
  grid-column: 2;
  grid-row: 1;
  min-height: 0;
}

.algorithm-panel {
  grid-column: 2;
  grid-row: 2;
  min-height: 0;
}

.right-stack {
  grid-column: 3;
  grid-row: 1 / 3;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
}

.kpi-compact {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 8px !important;
}

.kpi-mini-card {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  min-width: 0;
}

.kpi-mini-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 7px;
}

.kpi-mini-text {
  min-width: 0;
  flex: 1;
}

.kpi-mini-label {
  font-size: 10px;
  color: #737d91;
  line-height: 1.2;
  margin-bottom: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kpi-mini-value {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.1;
}

.device-panel {
  flex: 1;
  min-height: 0;
}

.camera-rank-panel {
  flex: 1;
  min-height: 0;
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

.device-count {
  font-size: 10px;
  color: #6c7588;
  background: #f0f2f6;
  padding: 2px 6px;
  border-radius: 999px;
}

.tree-hint {
  margin: 0 0 6px;
  font-size: 10px;
  color: #9aa3b5;
  flex-shrink: 0;
}

.tree-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.device-node {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.device-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.directory-node {
  color: #596174;
  font-weight: 500;
}

:deep(.dashboard-tree-wrapper) {
  height: 100%;
  max-height: none;
  overflow: auto;
  scrollbar-width: thin;
}

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

  .alarm-panel,
  .video-panel,
  .algorithm-panel,
  .right-stack {
    grid-column: 1;
    grid-row: auto;
  }

  .right-stack { min-height: 480px; }

  .overview-dashboard,
  .dashboard-canvas {
    height: auto !important;
    max-height: none !important;
  }
  .overview-dashboard { overflow: visible; }
  .video-stage { aspect-ratio: 16 / 9; max-height: none; min-height: 200px; }
}
</style>
