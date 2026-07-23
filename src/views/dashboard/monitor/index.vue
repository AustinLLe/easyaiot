<template>
  <div class="overview-dashboard">
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
      <div class="dashboard-main-left">
        <article class="panel video-panel">
          <div class="panel-title-row video-title-row">
            <div>
              <span class="panel-kicker">实时监控</span>
              <h2>原始视频流</h2>
            </div>
            <span :class="['stream-status', { online: Boolean(currentStreamUrl) }]">
              {{ currentStreamUrl ? '流已就绪' : '等待拖入或选择摄像头' }}
            </span>
          </div>

          <div
            class="video-stage"
            :class="{ 'is-drop-target': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
            @drop.prevent="handleVideoDrop"
          >
            <Jessibuca
              v-if="currentStreamUrl"
              :key="currentStreamUrl"
              :play-url="currentStreamUrl"
              :has-audio="false"
              class="video-player"
            />
            <div v-else class="video-placeholder">
              <div class="camera-orbit">
                <Icon icon="ant-design:video-camera-outlined" :size="42" />
              </div>
              <strong>{{ videoPlaceholderTitle }}</strong>
              <span>从下方目录树拖拽摄像头到此处，或点击设备节点播放</span>
            </div>
            <div v-if="playingDevice" class="video-caption">
              <span>{{ playingDevice.name || playingDevice.id }}</span>
              <span>原始流</span>
            </div>
          </div>
        </article>

        <article class="panel camera-tree-panel">
          <div class="tree-header">
            <Icon icon="ant-design:folder-outlined" :size="16" />
            <span class="tree-title">设备目录</span>
            <span v-if="treeDeviceCount" class="device-count">{{ treeDeviceCount }} 个设备</span>
          </div>
          <p class="tree-hint">拖拽摄像头到上方视频区域播放原始流</p>
          <div class="tree-body">
            <BasicTree
              :tree-data="treeData"
              :expanded-keys="expandedKeys"
              :selected-keys="selectedKeys"
              :loading="treeLoading"
              search
              :default-expand-all="true"
              :click-row-to-expand="false"
              :render-icon="renderTreeIcon"
              tree-wrapper-class-name="dashboard-tree-wrapper"
              @update:expanded-keys="expandedKeys = $event"
              @select="handleTreeSelect"
            >
              <template #title="node">
                <span
                  v-if="node.isDevice"
                  class="device-node"
                  draggable="true"
                  @dragstart="handleDeviceDragStart(node, $event)"
                >
                  <Icon icon="ant-design:drag-outlined" :size="12" class="drag-icon" />
                  <span class="device-name">{{ node.title }}</span>
                </span>
                <span v-else class="directory-node">{{ node.title }}</span>
              </template>
            </BasicTree>
          </div>
        </article>
      </div>

      <aside class="dashboard-main-right">
        <section class="panel side-metrics-panel" aria-label="数据统计">
          <div class="side-metric-grid">
            <article v-for="metric in sideMetrics" :key="metric.label" class="side-metric-card">
              <div class="metric-icon" :style="{ color: metric.color, backgroundColor: `${metric.color}18` }">
                <Icon :icon="metric.icon" :size="20" />
              </div>
              <div class="metric-content">
                <div class="metric-label">{{ metric.label }}</div>
                <div class="metric-value" :style="{ color: metric.color }">{{ metric.value }}</div>
              </div>
            </article>
          </div>
        </section>

        <article class="panel algorithm-panel">
          <div class="panel-title-row">
            <div>
              <span class="panel-kicker">报警统计</span>
              <h2>算法报警占比</h2>
            </div>
            <span class="panel-total">{{ currentPeriod.alarm_count }} 次</span>
          </div>

          <div v-if="algorithmRanking.length" class="donut-section">
            <div class="donut" :style="donutStyle">
              <div class="donut-center">
                <strong>{{ currentPeriod.alarm_count }}</strong>
                <span>报警总数</span>
              </div>
            </div>
            <div class="legend-list">
              <div v-for="(item, index) in algorithmRanking" :key="item.name" class="legend-row">
                <span class="legend-dot" :style="{ backgroundColor: chartColors[index % chartColors.length] }"></span>
                <span class="legend-name" :title="item.name">{{ item.name }}</span>
                <strong>{{ item.count }}</strong>
                <span>{{ item.percentage.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-state compact">当前周期暂无算法报警</div>
        </article>

        <article class="panel ranking-panel">
          <div class="panel-title-row ranking-title-row">
            <div>
              <span class="panel-kicker">摄像头报警排行</span>
              <h2>{{ rankingMode === 'camera' ? '摄像头排行' : '分组排行' }}</h2>
            </div>
            <div class="mode-toggle">
              <button :class="{ active: rankingMode === 'camera' }" @click="rankingMode = 'camera'">摄像头</button>
              <button :class="{ active: rankingMode === 'directory' }" @click="rankingMode = 'directory'">分组</button>
            </div>
          </div>

          <div v-if="displayRanking.length" class="ranking-list">
            <div
              v-for="(item, index) in displayRanking.slice(0, 8)"
              :key="`${rankingMode}-${item.name}`"
              class="ranking-row"
            >
              <span :class="['rank-number', { top: index < 3 }]">{{ index + 1 }}</span>
              <div class="rank-content">
                <div class="rank-meta">
                  <span :title="item.name">{{ item.name }}</span>
                  <strong>{{ item.count }} 次</strong>
                </div>
                <div class="rank-track">
                  <span :style="{ width: `${rankingWidth(item.count)}%` }"></span>
                </div>
                <small v-if="rankingMode === 'camera'">{{ item.directory_name || '未分组' }}</small>
              </div>
            </div>
          </div>
          <div v-else class="empty-state compact">当前周期暂无摄像头报警</div>
        </article>
      </aside>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { Icon } from '@/components/Icon'
import { BasicTree } from '@/components/Tree'
import type { TreeItem } from '@/components/Tree'
import Jessibuca from '@/components/Player/module/jessibuca.vue'
import { getDashboardStatistics } from '@/api/device/calculate'
import {
  getDirectoryList,
  getDeviceList,
  startStreamForwarding,
  type DeviceDirectory,
  type DeviceInfo,
} from '@/api/device/camera'
import { useMessage } from '@/hooks/web/useMessage'

defineOptions({ name: 'MonitorDashboard' })

const DEVICE_DRAG_MIME = 'application/x-easyaiot-device'

type PeriodKey = 'today' | 'week' | 'month'
type RankingMode = 'camera' | 'directory'

interface RankingItem {
  name: string
  count: number
  percentage: number
  device_id?: string
  directory_name?: string
}

interface PeriodStatistics {
  label: string
  alarm_count: number
  active_camera_count: number
  active_algorithm_count: number
  algorithm_ranking: RankingItem[]
  camera_ranking: RankingItem[]
  directory_ranking: RankingItem[]
}

const emptyPeriod = (label: string): PeriodStatistics => ({
  label,
  alarm_count: 0,
  active_camera_count: 0,
  active_algorithm_count: 0,
  algorithm_ranking: [],
  camera_ranking: [],
  directory_ranking: [],
})

const { createMessage } = useMessage()
const loading = ref(false)
const streamLoading = ref(false)
const selectedPeriod = ref<PeriodKey>('today')
const rankingMode = ref<RankingMode>('camera')
const isDragOver = ref(false)
const currentStreamUrl = ref('')
const playingDevice = ref<DeviceInfo | null>(null)
const treeLoading = ref(false)
const treeData = ref<TreeItem[]>([])
const expandedKeys = ref<string[]>([])
const selectedKeys = ref<string[]>([])

const periodOptions = [
  { label: '今日', value: 'today' as PeriodKey },
  { label: '本周', value: 'week' as PeriodKey },
  { label: '本月', value: 'month' as PeriodKey },
]
const chartColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b']

const statistics = ref({
  alarm_count: 0,
  camera_count: 0,
  algorithm_count: 0,
  periods: {
    today: emptyPeriod('今日'),
    week: emptyPeriod('本周'),
    month: emptyPeriod('本月'),
  } as Record<PeriodKey, PeriodStatistics>,
})

const currentPeriod = computed(() => statistics.value.periods[selectedPeriod.value] || emptyPeriod('当前'))
const algorithmRanking = computed(() => currentPeriod.value.algorithm_ranking || [])
const displayRanking = computed(() => (
  rankingMode.value === 'camera'
    ? currentPeriod.value.camera_ranking || []
    : currentPeriod.value.directory_ranking || []
))

const sideMetrics = computed(() => [
  {
    label: `${currentPeriod.value.label}报警`,
    value: currentPeriod.value.alarm_count,
    icon: 'ant-design:alert-outlined',
    color: '#ef4444',
  },
  {
    label: '摄像头数量',
    value: statistics.value.camera_count,
    icon: 'ant-design:video-camera-outlined',
    color: '#3b82f6',
  },
  {
    label: '算法数量',
    value: statistics.value.algorithm_count,
    icon: 'ant-design:deployment-unit-outlined',
    color: '#8b5cf6',
  },
  {
    label: '历史报警',
    value: statistics.value.alarm_count,
    icon: 'ant-design:history-outlined',
    color: '#f59e0b',
  },
])

const donutStyle = computed(() => {
  if (!algorithmRanking.value.length)
    return {}
  let cursor = 0
  const stops = algorithmRanking.value.map((item, index) => {
    const start = cursor
    cursor += item.percentage
    return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})

const videoPlaceholderTitle = computed(() => {
  if (streamLoading.value)
    return '正在准备视频流...'
  return '拖拽摄像头到此处播放'
})

function rankingWidth(count: number) {
  const max = Math.max(...displayRanking.value.map(item => item.count), 1)
  return Math.max((count / max) * 100, 6)
}

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

function normalizeHttpStream(streamUrl?: string) {
  if (!streamUrl)
    return ''
  if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://') || streamUrl.startsWith('/'))
    return streamUrl
  return streamUrl
}

function resolveOriginalStreamUrl(device: DeviceInfo) {
  if (device.http_stream)
    return normalizeHttpStream(device.http_stream)
  if (device.rtmp_stream)
    return convertRtmpToHttp(device.rtmp_stream)
  return ''
}

async function ensureOriginalStreamUrl(device: DeviceInfo) {
  const existing = resolveOriginalStreamUrl(device)
  if (existing)
    return existing

  const response = await startStreamForwarding(device.id)
  const payload = response?.code !== undefined ? response.data ?? response : response
  const httpStream = payload?.http_stream || payload?.data?.http_stream
  const rtmpStream = payload?.rtmp_stream || payload?.data?.rtmp_stream || device.rtmp_stream

  if (httpStream)
    return normalizeHttpStream(httpStream)
  if (rtmpStream)
    return convertRtmpToHttp(rtmpStream)
  return ''
}

function normalizeDeviceList(response: any): DeviceInfo[] {
  if (!response)
    return []
  if (Array.isArray(response))
    return response
  if (response.code !== undefined)
    return response.data?.list || response.data?.records || response.data || []
  if (response.list)
    return response.list
  if (response.records)
    return response.records
  if (Array.isArray(response.data))
    return response.data
  return []
}

function normalizeDirectoryList(response: any): DeviceDirectory[] {
  if (!response)
    return []
  if (Array.isArray(response))
    return response
  if (response.code !== undefined)
    return response.data || []
  return []
}

function convertToTreeData(directories: DeviceDirectory[], devices: DeviceInfo[]): TreeItem[] {
  return directories.map((dir) => {
    const children: TreeItem[] = []
    if (dir.children?.length)
      children.push(...convertToTreeData(dir.children, devices))

    devices
      .filter(device => device.directory_id === dir.id)
      .forEach((device) => {
        children.push({
          key: `device_${device.id}`,
          title: device.name || device.id,
          isDevice: true,
          isDirectory: false,
          device,
          icon: 'ant-design:camera-filled',
        } as TreeItem)
      })

    return {
      key: `dir_${dir.id}`,
      title: dir.name,
      isDirectory: true,
      directory: dir,
      icon: 'ant-design:folder-outlined',
      children: children.length ? children : undefined,
    } as TreeItem
  })
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
    const directories = normalizeDirectoryList(dirResponse)
    const devices = normalizeDeviceList(deviceResponse)
    const tree = convertToTreeData(directories, devices)

    devices
      .filter(device => !device.directory_id)
      .forEach((device) => {
        tree.push({
          key: `device_${device.id}`,
          title: device.name || device.id,
          isDevice: true,
          isDirectory: false,
          device,
          icon: 'ant-design:camera-filled',
        } as TreeItem)
      })

    treeData.value = tree
    expandedKeys.value = collectDirectoryKeys(tree)
  }
  catch (error) {
    console.error('加载设备目录失败', error)
    createMessage.error('加载设备目录失败')
    treeData.value = []
  }
  finally {
    treeLoading.value = false
  }
}

function handleDeviceDragStart(node: TreeItem, event: DragEvent) {
  if (!node.device)
    return
  event.dataTransfer?.setData(DEVICE_DRAG_MIME, JSON.stringify(node.device))
  event.dataTransfer!.effectAllowed = 'copy'
}

function handleTreeSelect(keys: string[]) {
  if (!keys.length)
    return
  const node = findNodeByKey(treeData.value, keys[0])
  if (node?.isDevice && node.device) {
    selectedKeys.value = keys
    handlePlayDevice(node.device)
  }
}

function parseDroppedDevice(event: DragEvent): DeviceInfo | null {
  const raw = event.dataTransfer?.getData(DEVICE_DRAG_MIME)
  if (!raw)
    return null
  try {
    return JSON.parse(raw) as DeviceInfo
  }
  catch {
    return null
  }
}

async function handlePlayDevice(device: DeviceInfo) {
  streamLoading.value = true
  try {
    const streamUrl = await ensureOriginalStreamUrl(device)
    if (!streamUrl) {
      createMessage.warning('该摄像头暂无原始流地址')
      return
    }
    playingDevice.value = device
    currentStreamUrl.value = streamUrl
  }
  catch (error) {
    console.error('播放摄像头失败', error)
    createMessage.error('播放摄像头失败')
  }
  finally {
    streamLoading.value = false
  }
}

async function handleVideoDrop(event: DragEvent) {
  isDragOver.value = false
  const device = parseDroppedDevice(event)
  if (!device) {
    createMessage.warning('请从设备目录拖拽摄像头')
    return
  }
  await handlePlayDevice(device)
}

async function loadStatistics() {
  const response = await getDashboardStatistics()
  if (response) {
    statistics.value = {
      ...statistics.value,
      ...response,
      periods: { ...statistics.value.periods, ...(response.periods || {}) },
    }
  }
}

async function refreshDashboard() {
  loading.value = true
  try {
    await Promise.all([
      loadStatistics(),
      loadTreeData(),
    ])
  }
  catch (error) {
    console.error('加载首页看板失败', error)
    createMessage.error('首页看板加载失败，请稍后重试')
  }
  finally {
    loading.value = false
  }
}

onMounted(refreshDashboard)
</script>

<style lang="less" scoped>
.overview-dashboard {
  min-height: 100%;
  padding: 28px;
  color: #172033;
  background:
    radial-gradient(circle at 0 0, rgba(59, 130, 246, 0.1), transparent 32%),
    #f5f7fb;
}

.dashboard-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;

  h1 { margin: 2px 0 4px; font-size: 28px; line-height: 1.2; font-weight: 700; }
  p { margin: 0; color: #7b8498; }
}

.heading-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.eyebrow, .panel-kicker {
  color: #3b82f6;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  color: #fff;
  background: #172033;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  &:disabled { opacity: .55; cursor: wait; }
}

.period-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: #e9edf5;
  border-radius: 10px;
}

.period-tab, .mode-toggle button {
  border: 0;
  cursor: pointer;
  transition: .2s ease;
}

.period-tab {
  min-width: 68px;
  padding: 8px 14px;
  color: #6c7588;
  background: transparent;
  border-radius: 7px;
  &.active { color: #172033; background: #fff; box-shadow: 0 3px 12px rgba(31, 45, 75, .08); }
}

.dashboard-body {
  display: grid;
  grid-template-columns: minmax(0, 1.85fr) minmax(320px, 1fr);
  gap: 14px;
  min-height: calc(100vh - 150px);
}

.dashboard-main-left {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 14px;
  min-height: 0;
}

.dashboard-main-right {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 14px;
}

.panel {
  background: rgba(255, 255, 255, .94);
  border: 1px solid #e7eaf1;
  box-shadow: 0 8px 28px rgba(38, 53, 83, .06);
  display: flex;
  min-width: 0;
  padding: 18px;
  border-radius: 14px;
  flex-direction: column;
}

.panel-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-title-row h2 {
  margin: 3px 0 0;
  font-size: 17px;
  font-weight: 650;
}

.panel-total {
  padding: 5px 9px;
  color: #ef4444;
  font-size: 12px;
  background: #fef2f2;
  border-radius: 999px;
  white-space: nowrap;
}

.side-metrics-panel {
  flex: 0 0 auto;
  padding: 14px;
}

.side-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.side-metric-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 78px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #edf0f5;
  border-radius: 12px;
}

.metric-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 11px;
}

.metric-label {
  color: #737d91;
  font-size: 12px;
}

.metric-value {
  margin-top: 2px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
}

.algorithm-panel {
  flex: 1;
  min-height: 260px;
}

.ranking-panel {
  flex: 1;
  min-height: 260px;
}

.donut-section {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 20px;
  flex-direction: column;
}

.donut {
  position: relative;
  display: grid;
  width: 170px;
  height: 170px;
  place-items: center;
  border-radius: 50%;
  transform: rotate(-90deg);
}

.donut::after {
  width: 100px;
  height: 100px;
  background: #fff;
  border-radius: 50%;
  content: '';
}

.donut-center {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: center;
  color: #172033;
  transform: rotate(90deg);
  flex-direction: column;
}

.donut-center strong { font-size: 24px; }
.donut-center span { color: #929bad; font-size: 11px; }

.legend-list {
  width: 100%;
  max-height: 160px;
  padding-right: 4px;
  overflow-y: auto;
}

.legend-row {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto 46px;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  color: #8891a3;
  font-size: 12px;
  border-bottom: 1px solid #f0f2f6;
}

.legend-row strong { color: #344054; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-name { overflow: hidden; color: #596174; text-overflow: ellipsis; white-space: nowrap; }

.video-panel {
  min-height: 0;
  padding-bottom: 14px;
}

.video-title-row { margin-bottom: 12px; }

.stream-status {
  padding: 5px 9px;
  color: #8992a5;
  font-size: 11px;
  background: #f0f2f6;
  border-radius: 999px;
  white-space: nowrap;
}

.stream-status.online {
  color: #15803d;
  background: #ecfdf3;
}

.video-stage {
  position: relative;
  flex: 1;
  min-height: 420px;
  overflow: hidden;
  background: #09111f;
  border: 2px solid #25324a;
  border-radius: 12px;
  transition: border-color .2s ease, box-shadow .2s ease;
}

.video-stage.is-drop-target {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, .15);
}

.video-player { width: 100%; height: 100%; }

.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dce8ff;
  background: radial-gradient(circle at 50% 42%, #192a48, #080f1c 64%);
  flex-direction: column;
  text-align: center;
  padding: 0 24px;
}

.video-placeholder strong { margin: 18px 0 5px; font-size: 16px; }
.video-placeholder span { color: #73809a; font-size: 12px; max-width: 320px; }

.camera-orbit {
  display: grid;
  width: 90px;
  height: 90px;
  color: #60a5fa;
  background: rgba(59, 130, 246, .1);
  border: 1px solid rgba(96, 165, 250, .28);
  border-radius: 50%;
  place-items: center;
  box-shadow: 0 0 40px rgba(59, 130, 246, .16);
}

.video-caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  justify-content: space-between;
  padding: 24px 14px 10px;
  color: #fff;
  font-size: 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, .82));
  pointer-events: none;
}

.camera-tree-panel {
  flex: 0 0 auto;
  min-height: 240px;
}

.tree-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: #172033;
}

.tree-title {
  font-size: 14px;
  font-weight: 600;
}

.device-count {
  margin-left: auto;
  padding: 2px 8px;
  color: #6c7588;
  font-size: 11px;
  background: #f0f2f6;
  border-radius: 999px;
}

.tree-hint {
  margin: 0 0 10px;
  color: #9aa3b5;
  font-size: 11px;
}

.tree-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.device-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  color: #344054;
  border-radius: 6px;
  cursor: grab;

  &:hover { background: #eef4ff; }
  &:active { cursor: grabbing; }
}

.drag-icon { color: #94a3b8; }

.device-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.directory-node {
  color: #596174;
  font-weight: 500;
}

:deep(.dashboard-tree-wrapper) {
  max-height: 200px;
  overflow: auto;
}

:deep(.tree) {
  background: transparent;
}

:deep(.ant-tree-node-content-wrapper) {
  border-radius: 6px;
}

:deep(.ant-tree-node-selected .ant-tree-node-content-wrapper) {
  background: #eef4ff !important;
}

.ranking-title-row { align-items: center; }

.mode-toggle {
  display: flex;
  padding: 3px;
  background: #eef1f6;
  border-radius: 8px;
}

.mode-toggle button {
  padding: 6px 9px;
  color: #7f889a;
  font-size: 11px;
  background: transparent;
  border-radius: 6px;
}

.mode-toggle button.active {
  color: #172033;
  background: #fff;
  box-shadow: 0 2px 7px rgba(32, 45, 72, .08);
}

.ranking-list {
  display: flex;
  gap: 12px;
  flex-direction: column;
  overflow-y: auto;
}

.ranking-row { display: flex; align-items: flex-start; gap: 11px; }

.rank-number {
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  color: #8c95a7;
  font-size: 11px;
  background: #f0f2f6;
  border-radius: 7px;
}

.rank-number.top { color: #fff; background: #172033; }

.rank-content { min-width: 0; flex: 1; }

.rank-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.rank-meta span {
  overflow: hidden;
  color: #4d5669;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-meta strong { flex-shrink: 0; color: #1d2939; font-size: 11px; }

.rank-track {
  height: 5px;
  overflow: hidden;
  background: #edf0f5;
  border-radius: 10px;
}

.rank-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #60a5fa, #2563eb);
  border-radius: inherit;
}

.rank-content small {
  display: block;
  margin-top: 4px;
  color: #a1a8b6;
  font-size: 10px;
}

.empty-state {
  display: grid;
  flex: 1;
  color: #a1a8b6;
  font-size: 13px;
  place-items: center;
}

.empty-state.compact { min-height: 120px; }

@media (max-width: 1280px) {
  .dashboard-body { grid-template-columns: 1fr; }
  .dashboard-main-left { min-height: 680px; }
  .dashboard-main-right { display: grid; grid-template-columns: 1fr 1fr; }
  .side-metrics-panel { grid-column: 1 / -1; }
}

@media (max-width: 900px) {
  .overview-dashboard { padding: 18px; }
  .dashboard-heading { align-items: flex-start; flex-direction: column; }
  .heading-actions { width: 100%; justify-content: space-between; flex-wrap: wrap; }
  .dashboard-main-right { grid-template-columns: 1fr; }
  .video-stage { min-height: 320px; }
}

@media (max-width: 600px) {
  .side-metric-grid { grid-template-columns: 1fr; }
  .period-tabs { width: 100%; justify-content: space-between; }
  .period-tab { flex: 1; min-width: 0; padding-inline: 8px; }
}
</style>
