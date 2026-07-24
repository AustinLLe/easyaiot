<template>
  <div class="overview-dashboard" :style="dashboardStyle">
    <div class="dashboard-canvas">
    <header class="screen-header">
      <div class="header-center">
        <div class="header-badge">EASYAIOT EDGE</div>
        <h1 class="screen-title">边缘智能算法应用平台</h1>
        <p class="screen-subtitle">设备 · 算法 · 告警 实时态势感知</p>
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
            <div class="split-toolbar">
              <button
                v-for="layout in splitLayouts"
                :key="layout.value"
                type="button"
                :class="['split-btn', { active: currentLayout === layout.value }]"
                :title="layout.label"
                @click="switchLayout(layout.value)"
              >
                {{ layout.short }}
              </button>
            </div>
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
            <span :class="['stream-status', { online: activeStreamCount > 0 }]">
              {{ activeStreamCount > 0 ? `${activeStreamCount} 路播放中` : '等待选择' }}
            </span>
          </div>
        </div>
        <div class="video-stage-wrap">
          <div class="video-monitor-grid" :class="`layout-${currentLayout}`">
            <div
              v-for="(video, index) in displayVideos"
              :key="`${currentLayout}-${video.id}-${index}`"
              :class="['video-window', { active: activeVideoIndex === index, 'drag-over': videoDragOverIndex === index }]"
              :style="getVideoStyle(index)"
              @click="activeVideoIndex = index"
              @contextmenu.prevent="clearVideoSlot(index)"
              @dragover.prevent="videoDragOverIndex = index"
              @dragleave="handleVideoWindowDragLeave($event, index)"
              @drop="handleVideoWindowDrop($event, index)"
            >
              <Jessibuca
                v-if="video.url"
                :key="video.url"
                :play-url="video.url"
                :has-audio="false"
                class="video-player"
              />
              <div v-else class="video-window-placeholder">
                <Icon icon="ant-design:video-camera-outlined" :size="22" color="#475569" />
                <span>{{ streamLoading && activeVideoIndex === index ? '加载中...' : `窗口 ${index + 1}` }}</span>
              </div>
              <div v-if="video.url" class="video-window-label">{{ video.name }}</div>
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
              :class="{ active: isDevicePlaying(device.id) }"
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
            <div v-if="algorithmRanking.length" class="chart-wrap">
              <div ref="algorithmChartRef" class="chart-box" />
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
            <div v-if="displayRanking.length" class="chart-wrap">
              <div ref="rankingChartRef" class="chart-box" />
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
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
import { useECharts } from '@/hooks/web/useECharts'

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

interface VideoSlot {
  id: string
  url: string
  name: string
  deviceId?: string
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
const deviceList = ref<DeviceInfo[]>([])
const selectedDeviceId = ref('')
const treeLoading = ref(false)
const directoryTree = ref<TreeItem[]>([])
const selectedDirectoryKey = ref('')
const videoDragOverIndex = ref(-1)
const draggingDeviceId = ref('')
const alarmList = ref<AlarmItem[]>([])
const todayAlarmCount = ref(0)

const splitLayouts = [
  { value: '1', label: '1分屏', short: '1' },
  { value: '4', label: '4分屏', short: '4' },
  { value: '6', label: '6分屏', short: '6' },
  { value: '8', label: '8分屏', short: '8' },
  { value: '9', label: '9分屏', short: '9' },
  { value: '16', label: '16分屏', short: '16' },
]
const currentLayout = ref('1')
const activeVideoIndex = ref(0)
const videoSlots = ref<VideoSlot[]>([{ id: 'placeholder-0', url: '', name: '窗口1' }])

let alarmRefreshTimer: ReturnType<typeof setInterval> | null = null

const periodOptions = [
  { label: '今日', value: 'today' as PeriodKey },
  { label: '本周', value: 'week' as PeriodKey },
  { label: '本月', value: 'month' as PeriodKey },
]
const chartColors = ['#43d0d6', '#5dc2fe', '#f19000', '#34d399', '#a78bfa', '#fb7185', '#2dd4bf', '#f87171']

const algorithmChartRef = ref<HTMLDivElement>()
const rankingChartRef = ref<HTMLDivElement>()
const { setOptions: setAlgorithmOptions, resize: resizeAlgorithmChart } = useECharts(algorithmChartRef, 'dark')
const { setOptions: setRankingOptions, resize: resizeRankingChart } = useECharts(rankingChartRef, 'dark')

function buildAlgorithmChartOptions(animate = false): EChartsOption {
  const total = algorithmPeriodData.value.alarm_count
  const data = algorithmRanking.value.slice(0, 8).map((item, index) => ({
    name: item.name,
    value: item.count,
    itemStyle: { color: chartColors[index % chartColors.length] },
  }))

  return {
    animation: animate,
    animationDuration: animate ? 900 : 0,
    animationDurationUpdate: 0,
    color: chartColors,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: 'rgba(67, 208, 214, 0.45)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: '{b}<br/>{c} 次 ({d}%)',
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 0,
      top: 'middle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: '#7a9bb8', fontSize: 11 },
      pageTextStyle: { color: '#64748b' },
      pageIconColor: '#43d0d6',
      pageIconInactiveColor: '#334155',
    },
    series: [{
      type: 'pie',
      radius: ['46%', '72%'],
      center: ['34%', '50%'],
      avoidLabelOverlap: true,
      animation: animate,
      animationDuration: animate ? 900 : 0,
      animationDurationUpdate: 0,
      label: {
        show: true,
        position: 'center',
        formatter: () => `{value|${total}}\n{label|总数}`,
        rich: {
          value: { fontSize: 22, fontWeight: 700, color: '#5dc2fe', lineHeight: 28 },
          label: { fontSize: 11, color: '#7a9bb8', lineHeight: 16 },
        },
      },
      emphasis: { scale: true, scaleSize: 6 },
      data,
    }],
  }
}

function buildRankingChartOptions(animate = false): EChartsOption {
  const items = [...displayRanking.value].slice(0, 6).reverse()

  return {
    animation: animate,
    animationDuration: animate ? 900 : 0,
    animationDurationUpdate: 0,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: 'rgba(67, 208, 214, 0.45)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    grid: { left: 4, right: 12, top: 8, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: items.map(item => item.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#7a9bb8',
        fontSize: 11,
        width: 72,
        overflow: 'truncate',
      },
    },
    series: [{
      type: 'bar',
      barWidth: 10,
      animation: animate,
      animationDuration: animate ? 900 : 0,
      animationDurationUpdate: 0,
      data: items.map(item => item.count),
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: '#069' },
            { offset: 1, color: '#43d0d6' },
          ],
        },
      },
      label: {
        show: true,
        position: 'right',
        color: '#7a9bb8',
        fontSize: 10,
        formatter: '{c} 次',
      },
    }],
  }
}

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

const algorithmChartKey = computed(() => {
  const items = algorithmRanking.value.slice(0, 8)
  return `${algorithmPeriod.value}|${items.map(i => `${i.name}:${i.count}`).join(',')}`
})

const rankingChartKey = computed(() => {
  const items = displayRanking.value.slice(0, 6)
  return `${rankingPeriod.value}|${rankMode.value}|${items.map(i => `${i.name}:${i.count}`).join(',')}`
})

const algorithmChartAnimated = ref(false)
const rankingChartAnimated = ref(false)

watch(algorithmChartKey, () => {
  if (!algorithmRanking.value.length)
    return
  const animate = !algorithmChartAnimated.value
  setAlgorithmOptions(buildAlgorithmChartOptions(animate), animate)
  algorithmChartAnimated.value = true
}, { immediate: true })

watch(rankingChartKey, () => {
  if (!displayRanking.value.length)
    return
  const animate = !rankingChartAnimated.value
  setRankingOptions(buildRankingChartOptions(animate), animate)
  rankingChartAnimated.value = true
}, { immediate: true })

function getMaxVideoCount(layout: string) {
  const count = Number.parseInt(layout, 10)
  return Number.isNaN(count) ? 1 : count
}

function createEmptySlot(index: number): VideoSlot {
  return { id: `placeholder-${index}`, url: '', name: `窗口${index + 1}` }
}

function ensureVideoSlotsInitialized() {
  const maxCount = getMaxVideoCount(currentLayout.value)
  while (videoSlots.value.length < maxCount)
    videoSlots.value.push(createEmptySlot(videoSlots.value.length))
}

const displayVideos = computed(() => {
  const maxCount = getMaxVideoCount(currentLayout.value)
  const slots = [...videoSlots.value]
  while (slots.length < maxCount)
    slots.push(createEmptySlot(slots.length))
  return slots.slice(0, maxCount)
})

const activeStreamCount = computed(() =>
  displayVideos.value.filter(slot => slot.url).length,
)

function isDevicePlaying(deviceId: string) {
  return videoSlots.value.some(slot => slot.deviceId === deviceId && slot.url)
}

function findEmptyScreen() {
  const maxCount = getMaxVideoCount(currentLayout.value)
  for (let i = 0; i < maxCount; i++) {
    const slot = videoSlots.value[i]
    if (!slot?.url)
      return i
  }
  return null
}

function switchLayout(layout: string) {
  currentLayout.value = layout
  activeVideoIndex.value = 0
  ensureVideoSlotsInitialized()
}

function getVideoStyle(index: number): Record<string, string> {
  const layout = currentLayout.value
  if (layout === '6') {
    if (index === 0)
      return { gridColumn: '1 / 3', gridRow: '1 / 3' }
    const pos = index - 1
    if (pos === 0)
      return { gridColumn: '3', gridRow: '1' }
    if (pos === 1)
      return { gridColumn: '3', gridRow: '2' }
    return { gridColumn: `${pos - 1}`, gridRow: '3' }
  }
  if (layout === '8') {
    if (index === 0)
      return { gridColumn: '1 / 4', gridRow: '1 / 3' }
    if (index < 4) {
      const pos = index - 1
      if (pos === 0)
        return { gridColumn: '4', gridRow: '1' }
      if (pos === 1)
        return { gridColumn: '4', gridRow: '2' }
      return { gridColumn: '4', gridRow: '3' }
    }
    const pos = index - 4
    return { gridColumn: `${pos + 1}`, gridRow: '3' }
  }
  return {}
}

function clearVideoSlot(index: number) {
  if (!videoSlots.value[index]?.url)
    return
  videoSlots.value[index] = createEmptySlot(index)
}

function handleVideoWindowDragLeave(event: DragEvent, index: number) {
  const related = event.relatedTarget as Node | null
  if (!event.currentTarget || (related && (event.currentTarget as Node).contains(related)))
    return
  if (videoDragOverIndex.value === index)
    videoDragOverIndex.value = -1
}

function handleVideoWindowDrop(event: DragEvent, index: number) {
  event.preventDefault()
  videoDragOverIndex.value = -1
  const deviceId = event.dataTransfer?.getData('application/x-device-id') || draggingDeviceId.value
  if (!deviceId)
    return
  const device = deviceList.value.find(d => d.id === deviceId)
  if (device) {
    selectedDeviceId.value = device.id
    handlePlayDevice(device, index)
  }
  draggingDeviceId.value = ''
}

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

async function handlePlayDevice(device: DeviceInfo, targetIndex?: number) {
  streamLoading.value = true
  try {
    const streamUrl = await ensureOriginalStreamUrl(device)
    if (!streamUrl) {
      createMessage.warning('该摄像头暂无原始流地址')
      return
    }
    ensureVideoSlotsInitialized()
    let index = targetIndex
    if (index === undefined) {
      if (currentLayout.value === '1')
        index = 0
      else
        index = activeVideoIndex.value
      const slot = videoSlots.value[index]
      if (slot?.url && currentLayout.value !== '1')
        index = findEmptyScreen() ?? index
    }
    if (index === null || index === undefined) {
      createMessage.warning('当前没有空窗口，请右键移除后再试')
      return
    }
    videoSlots.value[index] = {
      id: `video-${device.id}-${index}`,
      url: streamUrl,
      name: device.name || device.id,
      deviceId: device.id,
    }
    activeVideoIndex.value = index
    selectedDeviceId.value = device.id
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
  if (!selectedDeviceId.value)
    return
  const device = deviceList.value.find(d => d.id === selectedDeviceId.value)
  if (device)
    handlePlayDevice(device, currentLayout.value === '1' ? 0 : activeVideoIndex.value)
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
  window.addEventListener('resize', handleChartResize)
})

onUnmounted(() => {
  if (alarmRefreshTimer) {
    clearInterval(alarmRefreshTimer)
    alarmRefreshTimer = null
  }
  window.removeEventListener('resize', handleChartResize)
})

function handleChartResize() {
  resizeAlgorithmChart()
  resizeRankingChart()
}
</script>

<style lang="less" scoped>
// iDataV 切图与色板
@header-bg: url('@/assets/images/bigscreen/header.png');
@page-bg: url('@/assets/images/bigscreen/head_bg.png');
@idata-bg: #0f1c30;
@idata-panel: rgba(16, 31, 50, 0.72);
@idata-cyan: #43d0d6;
@idata-blue: #5dc2fe;
@idata-gold: #f19000;
@idata-text: #d6e4f0;
@idata-muted: #7a9bb8;

.idata-corner-frame() {
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    background:
      linear-gradient(@idata-cyan, @idata-cyan) 0 0 / 20px 2px no-repeat,
      linear-gradient(@idata-cyan, @idata-cyan) 0 0 / 2px 20px no-repeat,
      linear-gradient(@idata-cyan, @idata-cyan) 100% 0 / 20px 2px no-repeat,
      linear-gradient(@idata-cyan, @idata-cyan) 100% 0 / 2px 20px no-repeat,
      linear-gradient(@idata-cyan, @idata-cyan) 0 100% / 20px 2px no-repeat,
      linear-gradient(@idata-cyan, @idata-cyan) 0 100% / 2px 20px no-repeat,
      linear-gradient(@idata-cyan, @idata-cyan) 100% 100% / 20px 2px no-repeat,
      linear-gradient(@idata-cyan, @idata-cyan) 100% 100% / 2px 20px no-repeat;
    opacity: 0.9;
  }
}

.overview-dashboard {
  display: flex;
  justify-content: center;
  width: 100%;
  color: @idata-text;
  background: @idata-bg;
  box-sizing: border-box;
  overflow: hidden;
}

.dashboard-canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1440px;
  height: 100%;
  margin: 0 auto;
  padding: 8px 16px 12px;
  background: @page-bg center / cover no-repeat;
  box-sizing: border-box;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(67, 208, 214, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(67, 208, 214, 0.035) 1px, transparent 1px),
      linear-gradient(180deg, rgba(15, 28, 48, 0.78) 0%, rgba(15, 28, 48, 0.9) 100%);
    background-size: 24px 24px, 24px 24px, 100% 100%;
    pointer-events: none;
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }
}

.screen-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-height: 68px;
  margin-bottom: 8px;
  padding: 6px 120px 10px;
  background: @header-bg center top / 100% 100% no-repeat;
}

.header-center {
  text-align: center;
}

.header-badge {
  color: @idata-cyan;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .22em;
  margin-bottom: 2px;
  text-shadow: 0 0 10px rgba(67, 208, 214, 0.5);
}

.screen-title {
  margin: 0;
  font-size: 23px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: .12em;
  color: @idata-blue;
  text-shadow: 0 0 16px rgba(93, 194, 254, 0.4);
}

.screen-subtitle {
  margin: 3px 0 0;
  color: @idata-muted;
  font-size: 11px;
  letter-spacing: .1em;
}

.heading-actions {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.panel-kicker {
  color: @idata-cyan;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  color: @idata-blue;
  background: rgba(16, 31, 50, 0.75);
  border: 1px solid rgba(67, 208, 214, 0.45);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background .15s, border-color .15s, box-shadow .15s;
  &:hover:not(:disabled) {
    background: rgba(67, 208, 214, 0.12);
    box-shadow: 0 0 12px rgba(67, 208, 214, 0.2);
  }
  &:disabled { opacity: .55; }
}

.period-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: rgba(8, 18, 32, 0.85);
  border: 1px solid rgba(67, 208, 214, 0.15);
  border-radius: 4px;
}

.period-tab {
  border: 0;
  cursor: pointer;
  font-size: 12px;
  padding: 6px 12px;
  color: @idata-muted;
  background: transparent;
  border-radius: 3px;
  &.active {
    color: @idata-blue;
    background: rgba(67, 208, 214, 0.15);
    box-shadow: inset 0 0 8px rgba(67, 208, 214, 0.12);
  }
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
  background: rgba(67, 208, 214, 0.12);
  align-self: stretch;
}

.panel-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(67, 208, 214, 0.1);

  h2 {
    margin: 2px 0 0;
    font-size: 15px;
    font-weight: 650;
    color: @idata-blue;
    padding-left: 10px;
    border-left: 3px solid @idata-cyan;
    line-height: 1.3;
  }
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
  background: rgba(8, 18, 32, 0.85);
  border: 1px solid rgba(67, 208, 214, 0.15);
  border-radius: 4px;
}

.rank-mode-tab {
  border: 0;
  cursor: pointer;
  font-size: 11px;
  padding: 4px 8px;
  color: @idata-muted;
  background: transparent;
  border-radius: 3px;
  white-space: nowrap;
  &.active {
    color: @idata-blue;
    background: rgba(67, 208, 214, 0.15);
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
  background: rgba(8, 18, 32, 0.65);
  border: 1px solid rgba(67, 208, 214, 0.22);
  border-radius: 4px;
  min-width: 0;
}

.kpi-primary-label {
  font-size: 11px;
  color: @idata-muted;
}

.kpi-primary-value {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  color: @idata-gold;
  text-shadow: 0 0 18px rgba(241, 144, 0, 0.35);
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
  background: rgba(8, 18, 32, 0.55);
  border: 1px solid rgba(67, 208, 214, 0.12);
  border-radius: 4px;
  min-height: 0;
}

.kpi-secondary-label {
  font-size: 10px;
  color: @idata-muted;
  line-height: 1.2;
}

.kpi-secondary-value {
  font-size: 15px;
  font-weight: 700;
  color: @idata-blue;
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
  background: rgba(67, 208, 214, 0.1);
  flex-shrink: 0;
}

.section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  color: @idata-muted;
  letter-spacing: .06em;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.section-count {
  font-size: 10px;
  font-weight: 500;
  color: rgba(122, 155, 184, 0.75);
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
  scrollbar-color: rgba(67, 208, 214, 0.22) transparent;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(67, 208, 214, 0.22);
    border-radius: 4px;
    &:hover { background: rgba(67, 208, 214, 0.38); }
  }
}

.group-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: @idata-muted;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background .15s;
  position: relative;
  z-index: 2;

  &:hover { background: rgba(67, 208, 214, 0.08); color: @idata-text; }
  &.active {
    background: rgba(67, 208, 214, 0.14);
    color: @idata-cyan;
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
  border-radius: 4px;
  background: rgba(8, 18, 32, 0.55);
  border: 1px solid rgba(67, 208, 214, 0.1);
  font-size: 12px;
  color: @idata-text;
  cursor: grab;
  user-select: none;
  transition: border-color .15s, background .15s;
  position: relative;
  z-index: 2;

  &:hover { background: rgba(67, 208, 214, 0.08); border-color: rgba(67, 208, 214, 0.25); }
  &.active {
    background: rgba(67, 208, 214, 0.14);
    border-color: rgba(67, 208, 214, 0.4);
    color: @idata-cyan;
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
  color: #475569;
}

.panel {
  position: relative;
  background:
    linear-gradient(180deg, rgba(16, 31, 50, 0.82) 0%, rgba(11, 22, 40, 0.88) 100%);
  border: 1px solid rgba(67, 208, 214, 0.22);
  border-radius: 2px;
  box-shadow:
    inset 0 0 30px rgba(67, 208, 214, 0.04),
    0 4px 20px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 10px 12px;
  overflow: hidden;
  .idata-corner-frame();
}

.chart-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  position: relative;
  z-index: 2;
}

.chart-box {
  flex: 1;
  min-height: 120px;
  width: 100%;
}

.panel-total {
  padding: 3px 8px;
  color: @idata-gold;
  font-size: 11px;
  background: rgba(241, 144, 0, 0.1);
  border: 1px solid rgba(241, 144, 0, 0.28);
  border-radius: 999px;
  white-space: nowrap;
  position: relative;
  z-index: 2;
}

.video-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.split-toolbar {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: rgba(8, 18, 32, 0.85);
  border: 1px solid rgba(67, 208, 214, 0.15);
  border-radius: 4px;
}

.split-btn {
  border: 0;
  cursor: pointer;
  font-size: 11px;
  min-width: 24px;
  padding: 4px 6px;
  color: @idata-muted;
  background: transparent;
  border-radius: 3px;
  line-height: 1;
  &.active {
    color: @idata-blue;
    background: rgba(67, 208, 214, 0.15);
  }
  &:hover:not(.active) { color: @idata-text; background: rgba(67, 208, 214, 0.08); }
}

.camera-select {
  max-width: 160px;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  color: @idata-text;
  background: rgba(8, 18, 32, 0.65);
  border: 1px solid rgba(67, 208, 214, 0.2);
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  &:disabled { opacity: .6; cursor: not-allowed; }
}

.stream-status {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(8, 18, 32, 0.65);
  color: @idata-muted;
  white-space: nowrap;
  &.online { background: rgba(67, 208, 214, 0.12); color: @idata-cyan; }
}

.video-stage-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.video-monitor-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 3px;
  padding: 3px;
  background:
    linear-gradient(rgba(67, 208, 214, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(67, 208, 214, 0.06) 1px, transparent 1px),
    #080f1c;
  background-size: 16px 16px, 16px 16px, 100% 100%;
  border: 1px solid rgba(67, 208, 214, 0.2);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
  z-index: 2;

  &.layout-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
  &.layout-4 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
  &.layout-6 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
  &.layout-8 { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(3, 1fr); }
  &.layout-9 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
  &.layout-16 { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
}

.video-window {
  position: relative;
  min-height: 0;
  min-width: 0;
  background: #101f32;
  border: 1px solid rgba(67, 208, 214, 0.2);
  border-radius: 2px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color .15s, box-shadow .15s;

  &:hover { border-color: rgba(67, 208, 214, 0.45); }
  &.active {
    border-color: @idata-cyan;
    box-shadow: 0 0 10px rgba(67, 208, 214, 0.25);
  }
  &.drag-over {
    border-color: @idata-gold;
    box-shadow: 0 0 0 2px rgba(241, 144, 0, 0.35);
  }
}

.video-window-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(122, 155, 184, 0.7);
  font-size: 11px;
  background: radial-gradient(circle at 50% 40%, rgba(16, 31, 50, 0.95), #080f1c 75%);
}

.video-window-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 8px 4px;
  color: @idata-blue;
  font-size: 10px;
  background: linear-gradient(transparent, rgba(8, 15, 28, 0.92));
  pointer-events: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-player {
  position: absolute;
  inset: 0;
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

.alarm-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
  position: relative;
  z-index: 2;
  scrollbar-width: thin;
  scrollbar-color: rgba(67, 208, 214, 0.25) transparent;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(67, 208, 214, 0.22);
    border-radius: 4px;
    &:hover { background: rgba(67, 208, 214, 0.38); }
  }
}

.alarm-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, rgba(67, 208, 214, 0.06), rgba(16, 31, 50, 0.75));
  border: 1px solid rgba(67, 208, 214, 0.14);
  border-left: 3px solid @idata-gold;
  border-radius: 2px;
  flex-shrink: 0;
  transition: background .2s, border-color .2s, box-shadow .2s;

  &:hover {
    background: linear-gradient(135deg, rgba(67, 208, 214, 0.12), rgba(16, 31, 50, 0.85));
    border-color: rgba(67, 208, 214, 0.28);
    box-shadow: 0 0 12px rgba(67, 208, 214, 0.08);
  }
}

.alarm-thumb {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 2px;
  overflow: hidden;
  background: rgba(8, 18, 32, 0.9);
  border: 1px solid rgba(67, 208, 214, 0.18);
  display: grid;
  place-items: center;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.alarm-info { min-width: 0; flex: 1; }
.alarm-title { font-size: 12px; font-weight: 600; color: @idata-text; margin-bottom: 3px; line-height: 1.3; }
.alarm-meta { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; flex-wrap: wrap; }
.alarm-tag {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 2px;
  font-weight: 500;
  &.tag-realtime { background: rgba(67, 208, 214, 0.12); color: @idata-cyan; }
  &.tag-snap { background: rgba(93, 194, 254, 0.12); color: @idata-blue; }
}
.alarm-device { font-size: 10px; color: @idata-muted; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.alarm-time { font-size: 10px; color: rgba(122, 155, 184, 0.75); }

.empty-state {
  flex: 1;
  display: grid;
  place-items: center;
  color: rgba(122, 155, 184, 0.65);
  font-size: 13px;
  position: relative;
  z-index: 2;

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
  .video-monitor-grid { min-height: 200px; }
}
</style>
