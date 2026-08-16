<template>
  <div class="overview-dashboard overview-dashboard--fullscreen datav-dashboard">
    <header class="dashboard-heading">
      <button type="button" class="back-menu-button" @click="goBackToMenu">
        <Icon icon="ant-design:arrow-left-outlined" :size="16" />
        返回菜单
      </button>
      <div class="heading-title-center">
        <div class="heading-eyebrow">EASYAIOT EDGE</div>
        <h1 class="heading-title">边缘智能算法应用平台</h1>
      </div>
      <Decoration5
        ref="decorationRef"
        class="heading-decoration"
        :dur="DECORATION_ANIM_DUR"
        :color="['#3b82f6', '#1e3a5f']"
      />
    </header>

    <section class="dashboard-body fade-in fade-in-delayed">
      <!-- 左上：时间 -->
      <BorderBox13 class="panel-border time-panel" :color="['#3b82f6aa', '#1e3a5faa']" background-color="rgba(8, 18, 36, 0.72)">
        <article class="panel time-panel-inner">
          <div class="time-panel-clock">
            <div class="datetime-date">{{ currentDate }}</div>
            <div class="datetime-clock">{{ currentTime }}</div>
          </div>
          <div class="heading-actions time-panel-actions">
            <div class="period-tabs" role="tablist" aria-label="统计周期">
              <button
                v-for="item in periodOptions"
                :key="item.value"
                type="button"
                :class="['period-tab', { active: selectedPeriod === item.value }]"
                role="tab"
                :aria-selected="selectedPeriod === item.value"
                @click="selectedPeriod = item.value"
              >
                {{ item.label }}
              </button>
            </div>
            <button type="button" class="refresh-button" :disabled="loading" @click="refreshDashboard">
              <Icon icon="ant-design:reload-outlined" :size="16" />
              {{ loading ? '刷新中' : '刷新数据' }}
            </button>
          </div>
        </article>
      </BorderBox13>

      <!-- 左中：四指标合成 -->
      <BorderBox13 class="panel-border metrics-panel" :color="['#3b82f6aa', '#1e3a5faa']" background-color="rgba(8, 18, 36, 0.72)">
        <article class="panel metrics-combo-panel">
          <div class="metrics-combo">
            <div
              class="metric-feature"
              :style="{ '--metric-color': metrics[0].color }"
            >
              <div
                class="metric-feature-icon"
                :style="{ color: metrics[0].color, backgroundColor: `${metrics[0].color}24`, borderColor: `${metrics[0].color}4d` }"
              >
                <Icon :icon="metrics[0].icon" :size="28" />
              </div>
              <div class="metric-feature-label">{{ metrics[0].label }}</div>
              <div class="metric-feature-value">{{ displayMetricValues[0] ?? 0 }}</div>
              <div class="metric-feature-hint">{{ metrics[0].hint }}</div>
            </div>
            <div class="metric-side-list">
              <div
                v-for="(metric, index) in metrics.slice(1)"
                :key="metric.key"
                class="metric-side-item"
                :style="{ '--metric-color': metric.color }"
              >
                <div
                  class="metric-side-icon"
                  :style="{ color: metric.color, backgroundColor: `${metric.color}24`, borderColor: `${metric.color}4d` }"
                >
                  <Icon :icon="metric.icon" :size="18" />
                </div>
                <div class="metric-side-body">
                  <div class="metric-side-label">{{ metric.label }}</div>
                  <div class="metric-side-value">{{ displayMetricValues[index + 1] ?? 0 }}</div>
                </div>
                <div class="metric-side-hint">{{ metric.hint }}</div>
              </div>
            </div>
          </div>
        </article>
      </BorderBox13>

      <!-- 中上：视频 -->
      <BorderBox13 class="panel-border video-panel-wrap" :color="['#3b82f6aa', '#1e3a5faa']" background-color="rgba(8, 18, 36, 0.72)">
        <article class="panel video-panel">
        <div class="panel-title-row video-title-row">
          <div>
            <span class="panel-kicker">中间视频</span>
            <h2>任务实时画面</h2>
          </div>
          <span :class="['stream-status', { online: Boolean(currentPlayableStreamUrl) }]">
            {{ currentPlayableStreamUrl ? '流已就绪' : hasRunningTasks ? '等待选择' : '暂无运行中任务' }}
          </span>
        </div>

        <div class="video-stage">
          <div class="video-filters video-filters--overlay">
            <label for="monitor-task-select" class="sr-only">选择算法任务</label>
            <Select
              id="monitor-task-select"
              v-model:value="selectedTaskId"
              class="filter-select"
              placeholder="选择算法任务"
              :loading="tasksLoading"
              :options="taskOptions"
              @change="handleTaskChange"
            />
            <label for="monitor-camera-select" class="sr-only">选择任务摄像头</label>
            <Select
              id="monitor-camera-select"
              v-model:value="selectedCameraId"
              class="filter-select"
              placeholder="选择任务摄像头"
              :disabled="!selectedTaskId"
              :options="cameraOptions"
            />
            <label for="monitor-algorithm-select" class="sr-only">选择任务算法</label>
            <Select
              id="monitor-algorithm-select"
              v-model:value="selectedAlgorithm"
              class="filter-select"
              placeholder="选择任务算法"
              allow-clear
              :disabled="!selectedTaskId"
              :options="algorithmOptions"
            />
          </div>
          <Jessibuca
            v-if="currentPlayableStreamUrl"
            :key="currentPlayableStreamUrl"
            :playUrl="currentPlayableStreamUrl"
            :has-audio="false"
            class="video-player"
          />
          <div v-else class="video-placeholder">
            <div v-if="hasRunningTasks" class="camera-orbit">
              <Icon icon="ant-design:video-camera-outlined" :size="42" />
            </div>
            <strong>{{ videoPlaceholderTitle }}</strong>
            <span>{{ hasRunningTasks ? '从任务中选择摄像头和算法后显示 AI 视频流' : '启动算法任务后将在此显示 AI 视频流' }}</span>
          </div>
          <div v-if="selectedCamera" class="video-caption">
            <span>{{ selectedCamera.device_name || selectedCamera.device_id }}</span>
            <span>{{ selectedAlgorithm || '原始视频' }}</span>
          </div>
        </div>
        </article>
      </BorderBox13>

      <!-- 右侧：告警列表（通栏） -->
      <BorderBox13 class="panel-border alarm-panel-wrap" :color="['#3b82f6aa', '#1e3a5faa']" background-color="rgba(8, 18, 36, 0.82)">
        <section class="panel alarm-side-panel">
          <div class="panel-title-row alarm-title-row">
            <div>
              <span class="panel-kicker">最新告警</span>
              <h2>告警截图</h2>
            </div>
            <span class="panel-total">今日 {{ todayAlarmCount }} 次</span>
          </div>
          <div class="alarm-feed">
            <article
              v-for="alarm in alarmList"
              :key="alarm.id"
              class="alarm-feed-item alarm-card"
            >
              <button
                type="button"
                class="alarm-thumb"
                :disabled="!getAlarmImageUrl(alarm) || isAlarmImageBroken(alarm.id)"
                @click="handleAlarmPreview(alarm)"
              >
                <img
                  v-if="getAlarmImageUrl(alarm) && !isAlarmImageBroken(alarm.id)"
                  :src="getAlarmImageUrl(alarm)!"
                  alt="告警截图"
                  @error="markAlarmImageBroken(alarm.id)"
                />
                <Icon v-else icon="ant-design:picture-outlined" :size="22" />
                <span v-if="getAlarmImageUrl(alarm) && !isAlarmImageBroken(alarm.id)" class="alarm-thumb-zoom">
                  <Icon icon="ant-design:zoom-in-outlined" :size="22" />
                </span>
              </button>
              <div class="alarm-feed-body">
                <div class="alarm-feed-head">
                  <span class="alarm-feed-title" :title="getAlarmTitle(alarm)">
                    {{ getAlarmTitle(alarm) }}
                  </span>
                  <span v-if="isRealtimeAlarm(alarm)" class="alarm-tag-live">实时</span>
                </div>
                <div class="alarm-feed-row">
                  <span class="alarm-feed-label">时间：</span>
                  <span class="alarm-feed-value" :title="alarm.time">{{ alarm.time || '-' }}</span>
                </div>
                <div class="alarm-feed-row">
                  <span class="alarm-feed-label">摄像头：</span>
                  <span class="alarm-feed-value" :title="alarm.device_name">{{ alarm.device_name || '未知设备' }}</span>
                </div>
              </div>
            </article>
            <div v-if="!alarmList.length" class="empty-state compact">暂无告警截图</div>
          </div>
        </section>
      </BorderBox13>

      <!-- 底部：摄像头（左）+ 算法（中） -->
      <div class="rankings-bottom-row">
      <BorderBox13 class="panel-border ranking-camera-panel" :color="['#3b82f6aa', '#1e3a5faa']" background-color="rgba(8, 18, 36, 0.72)">
        <article class="panel stats-panel">
          <div class="panel-title-row ranking-title-row">
            <div>
              <h2>摄像头排行</h2>
            </div>
            <div class="ranking-title-actions">
              <div class="mode-toggle">
                <button type="button" :class="{ active: rankingMode === 'camera' }" @click="rankingMode = 'camera'">摄像头</button>
                <button type="button" :class="{ active: rankingMode === 'directory' }" @click="rankingMode = 'directory'">分组</button>
              </div>
            </div>
          </div>

          <div v-if="displayRanking.length" class="stats-tab-panel">
            <div class="ranking-list">
              <div v-for="(item, index) in displayRanking.slice(0, 8)" :key="`${rankingMode}-${item.name}`" class="ranking-row">
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
          </div>
          <div v-else class="empty-state">当前周期暂无摄像头报警</div>
        </article>
      </BorderBox13>

      <BorderBox13 class="panel-border ranking-algo-panel" :color="['#3b82f6aa', '#1e3a5faa']" background-color="rgba(8, 18, 36, 0.72)">
        <article class="panel stats-panel">
          <div class="panel-title-row ranking-title-row">
            <div>
              <h2>算法排行</h2>
            </div>
            <span class="panel-total">{{ currentPeriod.alarm_count }} 次</span>
          </div>

          <div v-if="algorithmRanking.length" class="stats-tab-panel">
            <div class="donut-section ranking-algo-donut-section">
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
          </div>
          <div v-else class="empty-state">当前周期暂无算法报警</div>
        </article>
      </BorderBox13>
      </div>
    </section>

    <ImageModal @register="registerImageModal" />
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Select } from 'ant-design-vue'
import { BorderBox13, Decoration5 } from '@kjgl77/datav-vue3'
import { Icon } from '@/components/Icon'
import { useModal } from '@/components/Modal'
import Jessibuca from '@/components/Player/module/jessibuca.vue'
import { getDashboardStatistics, queryAlarmList } from '@/api/device/calculate'
import {
  getTaskStreams,
  listAlgorithmTasks,
  watchTaskStream,
} from '@/api/device/algorithm_task'
import type { AlgorithmTask, CameraStreamInfo } from '@/api/device/algorithm_task'
import { useMessage } from '@/hooks/web/useMessage'
import { resolveAlertImageUrl } from '@/views/alert/alertDisplayUtils'
import ImageModal from '@/views/alert/components/ImageModal/index.vue'

defineOptions({ name: 'MonitorDashboard' })

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

const DECORATION_ANIM_DUR = 2

const router = useRouter()
const { createMessage } = useMessage()

function goBackToMenu() {
  router.push('/camera/devices')
}

const [registerImageModal, { openModal: openImageModal }] = useModal()
const decorationRef = ref<InstanceType<typeof Decoration5> | null>(null)
const currentDate = ref('')
const currentTime = ref('')
const loading = ref(false)
const tasksLoading = ref(false)
const alarmList = ref<any[]>([])
const brokenAlarmImages = ref<Set<number>>(new Set())
const displayMetricValues = ref<number[]>([0, 0, 0, 0])
let alarmRefreshTimer: number | undefined
let clockTimer: number | undefined
let metricAnimFrame: number | undefined
let aiStreamWatchTimer: number | undefined

function animateMetricValues(targets: number[]) {
  if (metricAnimFrame)
    cancelAnimationFrame(metricAnimFrame)
  const starts = targets.map((_, index) => displayMetricValues.value[index] ?? 0)
  const duration = 900
  const startedAt = performance.now()
  function tick(now: number) {
    const progress = Math.min((now - startedAt) / duration, 1)
    const eased = 1 - (1 - progress) ** 3
    displayMetricValues.value = targets.map((target, index) =>
      Math.round(starts[index] + (target - starts[index]) * eased),
    )
    if (progress < 1)
      metricAnimFrame = requestAnimationFrame(tick)
  }
  metricAnimFrame = requestAnimationFrame(tick)
}

function playDecorationOnce() {
  const root = decorationRef.value?.$el as HTMLElement | undefined
  if (!root)
    return
  root.querySelectorAll('animate').forEach((anim) => {
    anim.setAttribute('repeatCount', '1')
  })
}

function updateDateTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentDate.value = `${year}年${month}月${day}日 ${weekDays[now.getDay()]}`
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
}
const selectedPeriod = ref<PeriodKey>('today')
const rankingMode = ref<RankingMode>('camera')
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
  model_count: 0,
  periods: {
    today: emptyPeriod('今日'),
    week: emptyPeriod('本周'),
    month: emptyPeriod('本月'),
  } as Record<PeriodKey, PeriodStatistics>,
})

const tasks = ref<AlgorithmTask[]>([])
const taskStreams = ref<CameraStreamInfo[]>([])
const selectedTaskId = ref<number>()
const selectedCameraId = ref<string>()
const selectedAlgorithm = ref<string>()
const aiStreamWatchReady = ref(false)

const currentPeriod = computed(() => statistics.value.periods[selectedPeriod.value] || emptyPeriod('当前'))
const algorithmRanking = computed(() => currentPeriod.value.algorithm_ranking || [])
const displayRanking = computed(() => (
  rankingMode.value === 'camera'
    ? currentPeriod.value.camera_ranking || []
    : currentPeriod.value.directory_ranking || []
))

const metrics = computed(() => {
  const cameraTotal = statistics.value.camera_count
  const cameraActive = currentPeriod.value.active_camera_count
  const cameraRate = cameraTotal
    ? ((cameraActive / cameraTotal) * 100).toFixed(1)
    : '0.0'

  const algorithmTotal = statistics.value.algorithm_count
  const algorithmActive = currentPeriod.value.active_algorithm_count
  const algorithmRate = algorithmTotal
    ? ((algorithmActive / algorithmTotal) * 100).toFixed(1)
    : '0.0'

  const modelCount = statistics.value.model_count

  return [
    {
      key: 'alarm',
      label: `${currentPeriod.value.label}报警`,
      value: currentPeriod.value.alarm_count,
      hint: '报警事件总量',
      icon: 'ant-design:alert-outlined',
      color: '#f87171',
    },
    {
      key: 'camera',
      label: '活跃摄像头',
      value: cameraActive,
      hint: `设备总数 ${cameraTotal} · 在线率 ${cameraRate}%`,
      icon: 'ant-design:video-camera-outlined',
      color: '#22d3ee',
    },
    {
      key: 'algorithm',
      label: '触发算法',
      value: algorithmActive,
      hint: `任务总数 ${algorithmTotal} · 触发占比 ${algorithmRate}%`,
      icon: 'ant-design:deployment-unit-outlined',
      color: '#a78bfa',
    },
    {
      key: 'model',
      label: '模型总数',
      value: modelCount,
      hint: modelCount ? '已接入算法模型' : '已接入算法模型 · 待接入',
      icon: 'ant-design:cluster-outlined',
      color: '#34d399',
    },
  ]
})

watch(
  () => metrics.value.map(metric => metric.value),
  values => animateMetricValues(values),
)

const todayAlarmCount = computed(() => statistics.value.periods.today?.alarm_count ?? 0)

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

const taskOptions = computed(() => tasks.value.map(task => ({
  label: `${task.task_name} · ${task.task_type === 'snap' ? '抓拍' : '实时'}`,
  value: task.id,
})))
const hasRunningTasks = computed(() => tasks.value.length > 0)
const cameraOptions = computed(() => taskStreams.value.map(stream => ({
  label: stream.device_name || stream.device_id,
  value: stream.device_id,
})))
const selectedTask = computed(() => tasks.value.find(task => task.id === selectedTaskId.value))
const algorithmOptions = computed(() => {
  const modelNames = (selectedTask.value?.model_names || '')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean)
  const serviceNames = (selectedTask.value?.algorithm_services || [])
    .map(service => service.service_name?.trim())
    .filter(Boolean) as string[]
  const names = [...modelNames, ...serviceNames]
  return [...new Set(names)].map(name => ({ label: name, value: name }))
})
const selectedCamera = computed(() => taskStreams.value.find(stream => stream.device_id === selectedCameraId.value))

/** RTMP → 同源 HTTP-FLV（Sylphira VideoMonitor 7970c1f）。 */
function convertRtmpToHttp(rtmpUrl?: string) {
  if (!rtmpUrl?.startsWith('rtmp://'))
    return ''
  try {
    const url = new URL(rtmpUrl)
    let path = url.pathname.substring(1) || 'live'
    if (!path.endsWith('.flv'))
      path = `${path}.flv`
    return `${window.location.origin}/${path}`
  }
  catch (error) {
    console.error('RTMP地址转换失败:', error)
    return ''
  }
}

/** AI 流走同源 /ai/ 网关（Sylphira 0ff0e3a + VideoMonitor 7970c1f）。 */
function normalizeAiStreamUrl(streamUrl?: string) {
  if (!streamUrl)
    return ''
  try {
    const url = new URL(streamUrl, window.location.origin)
    if (url.pathname.startsWith('/ai/'))
      return `${window.location.origin}${url.pathname}${url.search}`
  }
  catch (error) {
    console.warn('AI流地址解析失败，使用原地址:', streamUrl, error)
  }
  return streamUrl
}

/** 解析 AI 流地址（与 VideoMonitor playDeviceStream AI 模式一致）。 */
function resolveAiStreamUrl(camera: CameraStreamInfo) {
  if (camera.ai_http_stream)
    return normalizeAiStreamUrl(camera.ai_http_stream)
  if (camera.ai_rtmp_stream)
    return convertRtmpToHttp(camera.ai_rtmp_stream)
  return ''
}

/** 解析原始视频流（http_stream 原样，与 Sylphira / VideoMonitor 视频模式一致）。 */
function resolveVideoStreamUrl(camera: CameraStreamInfo) {
  if (camera.http_stream)
    return camera.http_stream
  if (camera.rtmp_stream)
    return convertRtmpToHttp(camera.rtmp_stream)
  return ''
}

const currentStreamUrl = computed(() => {
  const camera = selectedCamera.value
  if (!camera)
    return ''
  if (selectedAlgorithm.value)
    return resolveAiStreamUrl(camera)
  return resolveVideoStreamUrl(camera)
})

const currentPlayableStreamUrl = computed(() => {
  if (selectedAlgorithm.value && !aiStreamWatchReady.value)
    return ''
  return currentStreamUrl.value
})

function stopAiStreamWatch() {
  if (aiStreamWatchTimer) {
    window.clearInterval(aiStreamWatchTimer)
    aiStreamWatchTimer = undefined
  }
  aiStreamWatchReady.value = false
}

async function renewAiStreamWatch(camera: CameraStreamInfo) {
  const taskId = selectedTaskId.value
  if (!taskId || !selectedAlgorithm.value || !camera.ai_http_stream)
    return
  await watchTaskStream(taskId, camera.device_id, camera.ai_stream_watch_ttl || 30)
}

async function startAiStreamWatch(camera: CameraStreamInfo) {
  stopAiStreamWatch()
  if (!selectedTaskId.value || !selectedAlgorithm.value || !camera.ai_http_stream)
    return
  await renewAiStreamWatch(camera)
  window.setTimeout(() => {
    if (selectedCamera.value?.device_id === camera.device_id && selectedAlgorithm.value)
      aiStreamWatchReady.value = true
  }, 1500)
  aiStreamWatchTimer = window.setInterval(() => {
    renewAiStreamWatch(camera).catch((error) => {
      console.warn('AI输出流续租失败:', error)
    })
  }, 10000)
}

watch(
  () => ({
    taskId: selectedTaskId.value,
    cameraId: selectedCameraId.value,
    algorithm: selectedAlgorithm.value,
    aiStream: selectedCamera.value?.ai_http_stream,
  }),
  () => {
    const camera = selectedCamera.value
    if (!camera || !selectedAlgorithm.value || !camera.ai_http_stream) {
      stopAiStreamWatch()
      return
    }
    startAiStreamWatch(camera).catch((error) => {
      console.warn('AI输出流启动续租失败:', error)
    })
  },
  { immediate: true },
)

const videoPlaceholderTitle = computed(() => {
  if (!hasRunningTasks.value)
    return '当前没有运行中的算法任务'
  if (!selectedTaskId.value)
    return '请选择算法任务'
  if (!selectedCameraId.value)
    return '请选择任务中的摄像头'
  if (selectedAlgorithm.value && !currentStreamUrl.value)
    return '该摄像头暂无 AI 流'
  return '该摄像头暂无可播放流'
})

function rankingWidth(count: number) {
  const max = Math.max(...displayRanking.value.map(item => item.count), 1)
  return Math.max((count / max) * 100, 6)
}

async function loadAlarmList() {
  try {
    const response = await queryAlarmList({ pageNo: 1, pageSize: 8 })
    if (response?.alert_list) {
      alarmList.value = response.alert_list
      brokenAlarmImages.value = new Set()
    }
  }
  catch (error) {
    console.error('加载告警截图列表失败', error)
  }
}

function getAlarmImageUrl(alarm: any) {
  const url = resolveAlertImageUrl(alarm)
  return url || null
}

function isAlarmImageBroken(id?: number) {
  return id != null && brokenAlarmImages.value.has(id)
}

function markAlarmImageBroken(id?: number) {
  if (id != null)
    brokenAlarmImages.value.add(id)
}

function isRealtimeAlarm(alarm: any) {
  const taskType = String(alarm?.task_type || alarm?.taskType || '').toLowerCase()
  if (taskType === 'realtime' || taskType === 'real_time')
    return true
  if (alarm?.information) {
    try {
      const info = typeof alarm.information === 'string'
        ? JSON.parse(alarm.information)
        : alarm.information
      const infoType = String(info?.task_type || info?.taskType || '').toLowerCase()
      return infoType === 'realtime' || infoType === 'real_time'
    }
    catch {
      return false
    }
  }
  return false
}

function getAlarmTitle(alarm: any) {
  if (alarm.task_name)
    return alarm.task_name
  if (alarm.title)
    return alarm.title
  if (alarm.event)
    return alarm.event
  if (alarm.object)
    return alarm.object
  if (alarm.rule_name)
    return alarm.rule_name
  if (alarm.information) {
    try {
      const info = typeof alarm.information === 'string'
        ? JSON.parse(alarm.information)
        : alarm.information
      return info?.task_name || info?.title || info?.event || info?.object || info?.rule_name || '未知任务'
    }
    catch {
      return '未知任务'
    }
  }
  return '未知任务'
}

function handleAlarmPreview(alarm: any) {
  const url = resolveAlertImageUrl(alarm)
  if (!url && !alarm.image_path) {
    createMessage.warn('告警图片不存在')
    return
  }
  openImageModal(true, {
    image_url: url || undefined,
    image_path: alarm.image_path,
  })
}

async function loadStatistics() {
  const response = await getDashboardStatistics()
  if (response)
    statistics.value = { ...statistics.value, ...response, periods: { ...statistics.value.periods, ...(response.periods || {}) } }
}

async function loadTasks() {
  tasksLoading.value = true
  try {
    const response = await listAlgorithmTasks({ pageNo: 1, pageSize: 1000, is_enabled: 1 })
    const allTasks = Array.isArray(response) ? response : (response?.data || [])
    // 首页视频只允许已启动的任务创建播放器，避免停止任务触发无意义的加载状态。
    tasks.value = allTasks.filter(task => task.is_enabled === true)
    if (selectedTaskId.value && !tasks.value.some(task => task.id === selectedTaskId.value)) {
      selectedTaskId.value = undefined
      await handleTaskChange(undefined)
    }
    if (!selectedTaskId.value && tasks.value.length) {
      selectedTaskId.value = tasks.value[0].id
      await handleTaskChange(selectedTaskId.value)
    }
  }
  finally {
    tasksLoading.value = false
  }
}

async function handleTaskChange(taskId?: number) {
  stopAiStreamWatch()
  taskStreams.value = []
  selectedCameraId.value = undefined
  selectedAlgorithm.value = undefined
  if (!taskId)
    return

  try {
    const response = await getTaskStreams(taskId)
    taskStreams.value = Array.isArray(response) ? response : (response?.data || [])
    selectedCameraId.value = taskStreams.value[0]?.device_id
    selectedAlgorithm.value = algorithmOptions.value[0]?.value
  }
  catch (error) {
    console.error('加载任务流失败', error)
    createMessage.warning('该任务暂无可用摄像头流')
  }
}

async function refreshDashboard() {
  loading.value = true
  try {
    await Promise.all([loadStatistics(), loadTasks(), loadAlarmList()])
  }
  catch (error) {
    console.error('加载首页看板失败', error)
    createMessage.error('首页看板加载失败，请稍后重试')
  }
  finally {
    loading.value = false
  }
}

onMounted(async () => {
  updateDateTime()
  clockTimer = window.setInterval(updateDateTime, 1000)
  await nextTick()
  playDecorationOnce()
  refreshDashboard()
  alarmRefreshTimer = window.setInterval(loadAlarmList, 30000)
})

onUnmounted(() => {
  if (alarmRefreshTimer)
    window.clearInterval(alarmRefreshTimer)
  if (clockTimer)
    window.clearInterval(clockTimer)
  if (metricAnimFrame)
    cancelAnimationFrame(metricAnimFrame)
  stopAiStreamWatch()
})
</script>

<style lang="less" scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.overview-dashboard {
  position: relative;
  box-sizing: border-box;
  display: flex;
  height: calc(100vh - 112px);
  min-height: 640px;
  padding: 20px 28px 24px;
  overflow: hidden;
  color: #dce8ff;
  background: #070b16;
  flex-direction: column;

  &--fullscreen {
    height: 100vh;
    min-height: 100vh;
  }

  &::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(900px 500px at 15% -10%, rgba(61, 123, 255, 0.16), transparent 60%),
      radial-gradient(800px 500px at 85% -10%, rgba(34, 211, 238, 0.10), transparent 60%),
      radial-gradient(700px 600px at 50% 110%, rgba(61, 123, 255, 0.08), transparent 60%);
    content: '';
    z-index: 0;
  }

  &::after {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(93, 140, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(93, 140, 255, 0.05) 1px, transparent 1px);
    background-size: 44px 44px;
    content: '';
    mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, #000 30%, transparent 100%);
    opacity: 0.35;
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }
}

.fade-in {
  animation: fade-up 0.5s ease both;
}

.fade-in-delayed {
  animation-delay: 0.08s;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.datav-dashboard {
  :deep(.border-box-content) {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
  }
}

.dashboard-heading {
  position: relative;
  margin-bottom: 14px;
  flex-shrink: 0;
}

.back-menu-button {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 36px;
  padding: 0 14px;
  color: #dce8ff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: rgb(59 130 246 / 12%);
  border: 1px solid rgb(96 165 250 / 28%);
  border-radius: 8px;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgb(59 130 246 / 22%);
    border-color: rgb(96 165 250 / 45%);
  }
}

.heading-title-center {
  margin-bottom: 6px;
  text-align: center;
}

.heading-eyebrow {
  margin-bottom: 6px;
  color: #22d3ee;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.heading-title {
  margin: 0;
  background: linear-gradient(90deg, #fff, #a9c2ff);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
}

.heading-decoration {
  width: 100%;
  height: 42px;
}

.datetime-date {
  color: #8ea3c7;
  font-size: 13px;
}

.datetime-clock {
  margin-top: 4px;
  color: #f8fbff;
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.eyebrow, .panel-kicker {
  color: #60a5fa;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 18px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  background: linear-gradient(135deg, #2f6bff, #1fb6ff);
  border: 0;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(47, 107, 255, 0.4);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    box-shadow: 0 6px 22px rgba(47, 107, 255, 0.55);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: wait;
    transform: none;
  }
}

.heading-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.period-tabs {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: rgba(13, 20, 40, 0.8);
  border: 1px solid rgba(93, 140, 255, 0.14);
  border-radius: 10px;
  flex-shrink: 0;
}

.period-tab, .mode-toggle button {
  border: 0;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.period-tab {
  min-width: 72px;
  padding: 6px 16px;
  color: #8fa1c4;
  font-size: 12.5px;
  background: transparent;
  border-radius: 8px;

  &.active {
    color: #fff;
    background: linear-gradient(135deg, rgba(61, 123, 255, 0.5), rgba(34, 211, 238, 0.25));
    box-shadow: 0 2px 10px rgba(61, 123, 255, 0.3);
  }
}

.dashboard-body {
  display: grid;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
  flex: 1;
  grid-template-columns: minmax(250px, 0.9fr) minmax(200px, 0.75fr) minmax(200px, 0.75fr) minmax(270px, 1fr);
  grid-template-rows: minmax(132px, auto) 1fr minmax(200px, 0.85fr);
  grid-template-areas:
    "time    video video  alarms"
    "metrics video video  alarms"
    "camera  algo  algo   alarms";
}

.time-panel { grid-area: time; min-height: 132px; }
.metrics-panel { grid-area: metrics; min-height: 0; }
.video-panel-wrap { grid-area: video; min-height: 0; }
.alarm-panel-wrap { grid-area: alarms; min-height: 0; }
.rankings-bottom-row { display: contents; }

.ranking-camera-panel { grid-area: camera; min-height: 0; }
.ranking-algo-panel { grid-area: algo; min-height: 0; }

.time-panel-inner {
  display: flex;
  height: 100%;
  min-height: 132px;
  padding: 16px 18px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.time-panel-clock {
  flex-shrink: 0;
}

.time-panel-actions {
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.metrics-combo-panel {
  padding: 14px 16px !important;
}

.metrics-combo {
  display: flex;
  height: 100%;
  min-height: 0;
  gap: 12px;
}

.metric-feature {
  position: relative;
  display: flex;
  width: 42%;
  min-width: 0;
  padding: 14px 12px;
  overflow: hidden;
  background: rgba(13, 20, 40, 0.55);
  border: 1px solid rgba(93, 140, 255, 0.14);
  border-radius: 12px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;

  &::after {
    position: absolute;
    inset: 0 0 auto;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--metric-color, #3d7bff), transparent);
    content: '';
    opacity: 0.85;
  }
}

.metric-feature-icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 10px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 12px;
}

.metric-feature-label {
  color: #8fa1c4;
  font-size: 12px;
}

.metric-feature-value {
  margin-top: 6px;
  color: #eef3ff;
  font-family: 'DIN Alternate', 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.metric-feature-hint {
  margin-top: 4px;
  color: #5a6a8c;
  font-size: 10px;
}

.metric-side-list {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.metric-side-item {
  display: grid;
  padding: 8px 10px;
  background: rgba(13, 20, 40, 0.45);
  border: 1px solid rgba(93, 140, 255, 0.1);
  border-radius: 10px;
  align-items: center;
  grid-template-columns: 32px 1fr;
  grid-template-rows: auto auto;
  gap: 0 10px;
}

.metric-side-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 9px;
  grid-row: 1 / span 2;
}

.metric-side-body {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  grid-column: 2;
}

.metric-side-label {
  overflow: hidden;
  color: #8fa1c4;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-side-value {
  color: #eef3ff;
  font-family: 'DIN Alternate', 'Bahnschrift', 'Segoe UI', sans-serif;
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.metric-side-hint {
  overflow: hidden;
  color: #5a6a8c;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
  grid-column: 2;
}

.panel-border {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  transition: transform 0.25s ease, filter 0.25s ease;

  &:hover {
    filter: brightness(1.04);
  }
}

.metric-card, .panel {
  background: transparent;
  border: 0;
  box-shadow: none;
}

.panel { display: flex; min-width: 0; height: 100%; padding: 20px; border-radius: 14px; flex-direction: column; }
.panel-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-shrink: 0; }
.panel-title-row h2 { margin: 3px 0 0; color: #f8fbff; font-size: 18px; font-weight: 650; }
.panel-total { padding: 5px 9px; color: #fca5a5; font-size: 12px; background: rgba(239, 68, 68, 0.16); border-radius: 999px; flex-shrink: 0; }

.stats-tab-panel {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.ranking-title-row {
  align-items: center;
  margin-bottom: 10px;
}

.ranking-title-row h2 {
  margin: 0;
}

.ranking-title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.stats-panel {
  min-height: 0;
}

.donut-section {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 0;
  flex-direction: column;
}

.ranking-algo-donut-section {
  display: grid;
  grid-template-columns: auto 1fr minmax(170px, 38%);
  align-items: start;
  gap: 20px;
  flex: 1;
  min-height: 0;
  overflow: visible;
}

.ranking-algo-donut-section .donut {
  grid-column: 1;
  align-self: start;
  margin-left: 52px;
  transform: rotate(-90deg) translateY(-8px);
}

.ranking-algo-panel .donut {
  width: 132px;
  height: 132px;
}

.ranking-algo-panel .donut::after {
  width: 80px;
  height: 80px;
}

.ranking-algo-panel .donut-center strong {
  font-size: 22px;
}

.ranking-algo-panel .legend-list {
  grid-column: 3;
  align-self: start;
  width: 100%;
  min-height: 0;
  padding-top: 6px;
  padding-left: 14px;
  overflow-y: auto;
  border-left: 1px solid rgba(93, 140, 255, 0.12);
  flex: unset;
}

.donut { position: relative; display: grid; width: 168px; height: 168px; flex-shrink: 0; place-items: center; border-radius: 50%; transform: rotate(-90deg); }
.donut::after { width: 100px; height: 100px; background: #07111f; border-radius: 50%; content: ''; }
.donut-center { position: absolute; z-index: 1; display: flex; align-items: center; color: #f8fbff; transform: rotate(90deg); flex-direction: column; }
.donut-center strong { font-size: 24px; }
.donut-center span { color: #8ea3c7; font-size: 11px; }
.legend-list { width: 100%; flex: 1; min-height: 0; padding-right: 4px; overflow-y: auto; }
.legend-row { display: grid; grid-template-columns: 9px minmax(0, 1fr) auto 46px; align-items: center; gap: 8px; padding: 7px 0; color: #8ea3c7; font-size: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.legend-row strong { color: #e2ebff; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-name { overflow: hidden; color: #b6c7e4; text-overflow: ellipsis; white-space: nowrap; }

.video-panel { padding-bottom: 16px; }
.video-title-row { margin-bottom: 14px; }
.stream-status { padding: 5px 9px; color: #8ea3c7; font-size: 11px; background: rgba(255, 255, 255, 0.06); border-radius: 999px; }
.stream-status.online { color: #86efac; background: rgba(34, 197, 94, 0.14); }
.video-filters {
  display: grid;
  grid-template-columns: 1.25fr 1fr 1fr;
  gap: 8px;
}

.video-filters--overlay {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 10;
  padding: 0 0 12px;
  background: linear-gradient(
    to bottom,
    rgba(8, 18, 36, 0.82) 0%,
    rgba(8, 18, 36, 0.52) 72%,
    transparent 100%
  );
  backdrop-filter: blur(4px);
  pointer-events: auto;
}

.video-filters--overlay :deep(.ant-select-selector) {
  background: rgba(15, 28, 50, 0.55) !important;
  border-color: rgba(96, 165, 250, 0.32) !important;
  color: #e2ebff;
}

.video-filters--overlay :deep(.ant-select-selection-item),
.video-filters--overlay :deep(.ant-select-selection-placeholder) {
  color: rgba(226, 235, 255, 0.88);
}

.video-filters--overlay :deep(.ant-select-arrow),
.video-filters--overlay :deep(.ant-select-clear) {
  color: rgba(226, 235, 255, 0.65);
}

.video-filters--overlay :deep(.ant-select-disabled .ant-select-selector) {
  background: rgba(15, 28, 50, 0.35) !important;
  border-color: rgba(96, 165, 250, 0.18) !important;
}

.filter-select { width: 100%; }
.video-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; background: #09111f; border: 1px solid #25324a; border-radius: 12px; }
.video-player { width: 100%; height: 100%; }
.video-placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #dce8ff; background: radial-gradient(circle at 50% 42%, #192a48, #080f1c 64%); flex-direction: column; }
.video-placeholder strong { margin: 18px 0 5px; font-size: 16px; }
.video-placeholder span { color: #73809a; font-size: 12px; }
.camera-orbit { display: grid; width: 90px; height: 90px; color: #60a5fa; background: rgba(59, 130, 246, .1); border: 1px solid rgba(96, 165, 250, .28); border-radius: 50%; place-items: center; box-shadow: 0 0 40px rgba(59, 130, 246, .16); }
.video-caption { position: absolute; right: 0; bottom: 0; left: 0; display: flex; justify-content: space-between; padding: 24px 14px 10px; color: #fff; font-size: 12px; background: linear-gradient(transparent, rgba(0, 0, 0, .82)); pointer-events: none; }

.ranking-title-row { align-items: center; }
.alarm-title-row { align-items: center; margin-bottom: 8px; }
.mode-toggle { display: flex; padding: 3px; background: rgba(255, 255, 255, 0.06); border-radius: 8px; flex-shrink: 0; }
.mode-toggle button { padding: 6px 9px; color: #8ea3c7; font-size: 11px; background: transparent; border-radius: 6px; }
.mode-toggle button.active { color: #f8fbff; background: rgba(59, 130, 246, 0.24); box-shadow: 0 2px 7px rgba(32, 45, 72, .08); }
.ranking-list { display: flex; gap: 12px; min-height: 0; overflow-y: auto; flex: 1; flex-direction: column; }
.ranking-row { display: flex; align-items: flex-start; gap: 11px; }
.rank-number { display: grid; width: 24px; height: 24px; flex: 0 0 24px; place-items: center; color: #8ea3c7; font-size: 11px; background: rgba(255, 255, 255, 0.06); border-radius: 7px; }
.rank-number.top { color: #fff; background: #2563eb; }
.rank-content { min-width: 0; flex: 1; }
.rank-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; font-size: 12px; }
.rank-meta span { overflow: hidden; color: #b6c7e4; text-overflow: ellipsis; white-space: nowrap; }
.rank-meta strong { flex-shrink: 0; color: #e2ebff; font-size: 11px; }
.rank-track { height: 5px; overflow: hidden; background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
.rank-track span { display: block; height: 100%; background: linear-gradient(90deg, #60a5fa, #2563eb); border-radius: inherit; }
.rank-content small { display: block; margin-top: 4px; color: #6f86ad; font-size: 10px; }
.empty-state {
  display: grid;
  flex: 1;
  min-height: 120px;
  color: #6f86ad;
  font-size: 13px;
  place-items: center;

  &.compact {
    flex: none;
    min-height: 160px;
  }
}

.alarm-side-panel {
  min-height: 0;
}

.alarm-tip {
  margin: 0 0 10px;
  color: #6f86ad;
  font-size: 12px;
  flex-shrink: 0;
}

.alarm-feed {
  display: flex;
  gap: 10px;
  min-height: 120px;
  padding-right: 2px;
  overflow-x: hidden;
  overflow-y: auto;
  flex: 1;
  flex-direction: column;
}

.alarm-feed-item {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 12px;
  padding: 10px;
  background: rgba(13, 20, 40, 0.7);
  border: 1px solid rgba(93, 140, 255, 0.12);
  border-left: 0;
  border-radius: 12px;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.22s ease, border-color 0.22s ease, transform 0.22s ease;

  &:hover {
    background: rgba(19, 28, 54, 0.85);
    border-color: rgba(93, 140, 255, 0.4);
    transform: translateX(-2px);
  }
}

.alarm-thumb {
  position: relative;
  display: grid;
  width: 128px;
  height: auto;
  min-height: 0;
  flex: 0 0 128px;
  aspect-ratio: 16 / 10;
  place-items: center;
  overflow: hidden;
  color: #6f86ad;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(93, 140, 255, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:hover:not(:disabled) {
    border-color: rgba(96, 165, 250, 0.45);

    .alarm-thumb-zoom {
      opacity: 1;
    }
  }

  &:disabled {
    cursor: default;
    opacity: 0.75;
  }
}

.alarm-thumb-zoom {
  position: absolute;
  inset: 0;
  display: grid;
  color: #fff;
  background: rgba(7, 11, 22, 0.45);
  opacity: 0;
  place-items: center;
  transition: opacity 0.2s ease;
}

.alarm-feed-body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.alarm-feed-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.alarm-feed-title {
  overflow: hidden;
  color: #eef3ff;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.alarm-tag-live {
  padding: 2px 7px;
  color: #34d399;
  font-size: 10px;
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.3);
  border-radius: 4px;
  flex-shrink: 0;
  margin-left: auto;
}

.alarm-feed-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  min-width: 0;
  font-size: 11px;
}

.alarm-feed-label {
  color: #8ea3c7;
  flex-shrink: 0;
}

.alarm-feed-value {
  overflow: hidden;
  color: #b6c7e4;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

@media (max-width: 1280px) {
  .overview-dashboard {
    height: auto;
    min-height: calc(100vh - 112px);
    overflow: auto;

    &--fullscreen {
      min-height: 100vh;
    }
  }

  .dashboard-body {
    grid-template-columns: minmax(240px, 280px) 1fr 1fr;
    grid-template-rows: auto auto 1fr auto;
    grid-template-areas:
      "time    video video"
      "metrics video video"
      "alarms  alarms  alarms"
      "camera  algo  algo";
    min-height: 720px;
  }

  .alarm-panel-wrap { min-height: 360px; }
}

@media (max-width: 900px) {
  .overview-dashboard { padding: 18px; }

  .dashboard-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    grid-template-areas:
      "time"
      "metrics"
      "video"
      "alarms"
      "camera"
      "algo";
    min-height: auto;
  }

  .panel-border { min-height: 320px; }
  .video-panel-wrap { min-height: 420px; }
  .alarm-panel-wrap { min-height: 400px; }
}

@media (max-width: 600px) {
  .time-panel-inner { flex-direction: column; align-items: stretch; }
  .time-panel-actions { justify-content: center; width: 100%; }
  .metrics-combo { flex-direction: column; }
  .metric-feature { width: 100%; }
  .video-filters { grid-template-columns: 1fr; }
  .ranking-algo-donut-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .ranking-algo-donut-section .donut {
    margin-left: 0;
  }

  .ranking-algo-panel .legend-list {
    padding-left: 0;
    border-left: 0;
  }
}
</style>
