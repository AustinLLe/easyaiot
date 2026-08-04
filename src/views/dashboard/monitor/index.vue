<template>
  <div class="overview-dashboard datav-dashboard">
    <header class="dashboard-heading">
      <Decoration5 class="heading-decoration" :color="['#3b82f6', '#1e3a5f']" />
      <div class="heading-main">
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
      </div>
    </header>

    <section class="metric-grid" aria-label="数据统计">
      <BorderBox13
        v-for="metric in metrics"
        :key="metric.label"
        class="metric-border"
        :color="['#3b82f6aa', '#1e3a5faa']"
        background-color="rgba(8, 18, 36, 0.72)"
      >
        <article class="metric-card">
          <div class="metric-icon" :style="{ color: metric.color, backgroundColor: `${metric.color}18` }">
            <Icon :icon="metric.icon" :size="22" />
          </div>
          <div>
            <div class="metric-label">{{ metric.label }}</div>
            <div class="metric-value">{{ metric.value }}</div>
            <div class="metric-hint">{{ metric.hint }}</div>
          </div>
        </article>
      </BorderBox13>
    </section>

    <section class="dashboard-grid">
      <BorderBox13 class="panel-border" :color="['#3b82f6aa', '#1e3a5faa']" background-color="rgba(8, 18, 36, 0.72)">
        <article class="panel stats-panel">
          <div class="panel-title-row ranking-title-row">
            <div>
              <span class="panel-kicker">报警统计</span>
              <h2>报警排行</h2>
            </div>
            <div class="ranking-title-actions">
              <div class="stats-tabs" role="tablist" aria-label="报警排行类型">
                <button
                  :class="['stats-tab', { active: statsTab === 'algorithm' }]"
                  role="tab"
                  :aria-selected="statsTab === 'algorithm'"
                  @click="statsTab = 'algorithm'"
                >
                  算法
                </button>
                <button
                  :class="['stats-tab', { active: statsTab === 'camera' }]"
                  role="tab"
                  :aria-selected="statsTab === 'camera'"
                  @click="statsTab = 'camera'"
                >
                  摄像头
                </button>
              </div>
              <div v-if="statsTab === 'camera'" class="mode-toggle">
                <button :class="{ active: rankingMode === 'camera' }" @click="rankingMode = 'camera'">摄像头</button>
                <button :class="{ active: rankingMode === 'directory' }" @click="rankingMode = 'directory'">分组</button>
              </div>
              <span class="panel-total">{{ currentPeriod.alarm_count }} 次</span>
            </div>
          </div>

          <div v-if="statsTab === 'algorithm'" class="stats-tab-panel">
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
            <div v-else class="empty-state">当前周期暂无算法报警</div>
          </div>

          <div v-else class="stats-tab-panel">
            <div v-if="displayRanking.length" class="ranking-list">
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
            <div v-else class="empty-state">当前周期暂无摄像头报警</div>
          </div>
        </article>
      </BorderBox13>

      <BorderBox13 class="panel-border video-border" :color="['#3b82f6aa', '#1e3a5faa']" background-color="rgba(8, 18, 36, 0.72)">
        <article class="panel video-panel">
        <div class="panel-title-row video-title-row">
          <div>
            <span class="panel-kicker">中间视频</span>
            <h2>任务实时画面</h2>
          </div>
          <span :class="['stream-status', { online: Boolean(currentStreamUrl) }]">
            {{ currentStreamUrl ? '流已就绪' : hasRunningTasks ? '等待选择' : '暂无运行中任务' }}
          </span>
        </div>

        <div class="video-filters">
          <Select
            v-model:value="selectedTaskId"
            class="filter-select"
            placeholder="选择算法任务"
            :loading="tasksLoading"
            :options="taskOptions"
            @change="handleTaskChange"
          />
          <Select
            v-model:value="selectedCameraId"
            class="filter-select"
            placeholder="选择任务摄像头"
            :disabled="!selectedTaskId"
            :options="cameraOptions"
          />
          <Select
            v-model:value="selectedAlgorithm"
            class="filter-select"
            placeholder="选择任务算法"
            allow-clear
            :disabled="!selectedTaskId"
            :options="algorithmOptions"
          />
        </div>

        <div class="video-stage">
          <Jessibuca
            v-if="currentStreamUrl"
            :key="currentStreamUrl"
            :playUrl="currentStreamUrl"
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

      <BorderBox13 class="panel-border alarm-panel-border" :color="['#ef4444aa', '#3b82f6aa']" background-color="rgba(8, 18, 36, 0.82)">
        <section class="panel alarm-side-panel">
          <div class="panel-title-row alarm-title-row">
            <div>
              <span class="panel-kicker">最新告警</span>
              <h2>告警截图</h2>
            </div>
            <span class="panel-total">今日 {{ todayAlarmCount }} 次</span>
          </div>
          <p class="alarm-tip">点击缩略图查看大图</p>
          <div class="alarm-feed">
            <article
              v-for="alarm in alarmList"
              :key="alarm.id"
              class="alarm-feed-item"
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
                <Icon v-else icon="ant-design:picture-outlined" :size="28" />
              </button>
              <div class="alarm-feed-body">
                <div class="alarm-feed-title" :title="alarm.event || alarm.title">
                  {{ alarm.event || alarm.title || '未知事件' }}
                </div>
                <div class="alarm-feed-row">
                  <span class="alarm-feed-label">时间</span>
                  <span class="alarm-feed-value" :title="alarm.time">{{ alarm.time || '-' }}</span>
                </div>
                <div class="alarm-feed-row">
                  <span class="alarm-feed-label">位置</span>
                  <span class="alarm-feed-value" :title="alarm.device_name">{{ alarm.device_name || '未知设备' }}</span>
                </div>
                <div class="alarm-feed-footer">
                  <span class="alarm-feed-tag">{{ getAlarmTaskTypeLabel(alarm) }}</span>
                </div>
              </div>
            </article>
            <div v-if="!alarmList.length" class="empty-state compact">暂无告警截图</div>
          </div>
        </section>
      </BorderBox13>
    </section>

    <ImageModal @register="registerImageModal" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Select } from 'ant-design-vue'
import { BorderBox13, Decoration5 } from '@kjgl77/datav-vue3'
import { Icon } from '@/components/Icon'
import { useModal } from '@/components/Modal'
import Jessibuca from '@/components/Player/module/jessibuca.vue'
import { getDashboardStatistics, queryAlarmList } from '@/api/device/calculate'
import {
  getTaskStreams,
  listAlgorithmTasks,
  type AlgorithmTask,
  type CameraStreamInfo,
} from '@/api/device/algorithm_task'
import { useMessage } from '@/hooks/web/useMessage'
import { resolveAlertImageUrl } from '@/views/alert/alertDisplayUtils'
import ImageModal from '@/views/alert/components/ImageModal/index.vue'

defineOptions({ name: 'MonitorDashboard' })

type PeriodKey = 'today' | 'week' | 'month'
type RankingMode = 'camera' | 'directory'
type StatsTab = 'algorithm' | 'camera'

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
const [registerImageModal, { openModal: openImageModal }] = useModal()
const loading = ref(false)
const tasksLoading = ref(false)
const alarmList = ref<any[]>([])
const brokenAlarmImages = ref<Set<number>>(new Set())
let alarmRefreshTimer: number | undefined
const selectedPeriod = ref<PeriodKey>('today')
const statsTab = ref<StatsTab>('algorithm')
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

const currentPeriod = computed(() => statistics.value.periods[selectedPeriod.value] || emptyPeriod('当前'))
const algorithmRanking = computed(() => currentPeriod.value.algorithm_ranking || [])
const displayRanking = computed(() => (
  rankingMode.value === 'camera'
    ? currentPeriod.value.camera_ranking || []
    : currentPeriod.value.directory_ranking || []
))

const metrics = computed(() => [
  { label: `${currentPeriod.value.label}报警`, value: currentPeriod.value.alarm_count, hint: '报警事件总量', icon: 'ant-design:alert-outlined', color: '#ef4444' },
  { label: '活跃摄像头', value: currentPeriod.value.active_camera_count, hint: `设备总数 ${statistics.value.camera_count}`, icon: 'ant-design:video-camera-outlined', color: '#3b82f6' },
  { label: '触发算法', value: currentPeriod.value.active_algorithm_count, hint: `任务总数 ${statistics.value.algorithm_count}`, icon: 'ant-design:deployment-unit-outlined', color: '#8b5cf6' },
  { label: '模型总数', value: statistics.value.model_count, hint: '已接入算法模型', icon: 'ant-design:cluster-outlined', color: '#22c55e' },
])

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

function getAlarmTaskTypeLabel(alarm: any) {
  let taskType = alarm.task_type
  if (!taskType && alarm.information) {
    try {
      const info = typeof alarm.information === 'string'
        ? JSON.parse(alarm.information)
        : alarm.information
      taskType = info?.task_type
    }
    catch {
      taskType = undefined
    }
  }
  if (taskType === 'snap' || taskType === 'snapshot')
    return '抓拍'
  return '实时'
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

onMounted(() => {
  refreshDashboard()
  alarmRefreshTimer = window.setInterval(loadAlarmList, 30000)
})

onUnmounted(() => {
  if (alarmRefreshTimer)
    window.clearInterval(alarmRefreshTimer)
})
</script>

<style lang="less" scoped>
.overview-dashboard {
  box-sizing: border-box;
  display: flex;
  height: calc(100vh - 112px);
  min-height: 640px;
  padding: 20px 28px 24px;
  overflow: hidden;
  color: #dce8ff;
  background:
    radial-gradient(circle at 0 0, rgba(59, 130, 246, 0.16), transparent 32%),
    radial-gradient(circle at 100% 0, rgba(239, 68, 68, 0.08), transparent 28%),
    #07111f;
  flex-direction: column;
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

  h1 { margin: 2px 0 4px; font-size: 28px; line-height: 1.2; font-weight: 700; color: #f8fbff; }
  p { margin: 0; color: #8ea3c7; }
}

.heading-decoration {
  width: 100%;
  height: 42px;
  margin-bottom: 8px;
}

.heading-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  color: #fff;
  background: linear-gradient(90deg, #2563eb, #1d4ed8);
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  flex-shrink: 0;
  &:disabled { opacity: .55; cursor: wait; }
}

.heading-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.period-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(96, 165, 250, 0.18);
  border-radius: 10px;
  flex-shrink: 0;
}

.period-tab, .mode-toggle button, .stats-tab {
  border: 0;
  cursor: pointer;
  transition: .2s ease;
}

.period-tab {
  min-width: 76px;
  padding: 8px 18px;
  color: #9fb4d9;
  background: transparent;
  border-radius: 7px;
  &.active { color: #f8fbff; background: rgba(59, 130, 246, 0.28); box-shadow: 0 3px 12px rgba(31, 45, 75, .18); }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
  flex-shrink: 0;
}

.metric-border {
  min-height: 96px;
}

.metric-card, .panel {
  background: transparent;
  border: 0;
  box-shadow: none;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 96px;
  padding: 16px 20px;
  border-radius: 14px;
}

.metric-icon { display: grid; width: 46px; height: 46px; flex: 0 0 46px; place-items: center; border-radius: 13px; }
.metric-label { color: #8ea3c7; font-size: 13px; }
.metric-value { margin: 2px 0; color: #f8fbff; font-size: 28px; font-weight: 700; line-height: 1.1; }
.metric-hint { color: #6f86ad; font-size: 11px; }

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(250px, .9fr) minmax(420px, 1.5fr) minmax(270px, 1fr);
  gap: 14px;
  min-height: 0;
  overflow: hidden;
  flex: 1;
}

.panel-border {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.panel { display: flex; min-width: 0; height: 100%; padding: 20px; border-radius: 14px; flex-direction: column; }
.panel-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.panel-title-row h2 { margin: 3px 0 0; color: #f8fbff; font-size: 18px; font-weight: 650; }
.panel-total { padding: 5px 9px; color: #fca5a5; font-size: 12px; background: rgba(239, 68, 68, 0.16); border-radius: 999px; flex-shrink: 0; }

.stats-tabs {
  display: inline-flex;
  padding: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  flex-shrink: 0;
}

.stats-tab {
  min-width: 64px;
  padding: 6px 12px;
  color: #8ea3c7;
  font-size: 12px;
  background: transparent;
  border-radius: 6px;

  &.active {
    color: #f8fbff;
    background: rgba(59, 130, 246, 0.24);
    box-shadow: 0 2px 7px rgba(32, 45, 72, 0.08);
  }
}

.stats-tab-panel {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.ranking-title-row {
  align-items: center;
  margin-bottom: 14px;
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

.donut-section { display: flex; flex: 1; align-items: center; justify-content: center; gap: 20px; min-height: 0; flex-direction: column; }
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
.video-filters { display: grid; grid-template-columns: 1.25fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
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
  gap: 12px;
  min-height: 0;
  padding-right: 4px;
  overflow-x: hidden;
  overflow-y: auto;
  flex: 1;
  flex-direction: column;
}

.alarm-feed-item {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(96, 165, 250, 0.18);
  border-radius: 12px;
  flex-shrink: 0;
  transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(96, 165, 250, 0.35);
    box-shadow: 0 0 18px rgba(59, 130, 246, 0.1);
  }
}

.alarm-thumb {
  display: grid;
  width: 38%;
  min-width: 110px;
  max-width: 160px;
  flex: 0 0 38%;
  place-items: center;
  overflow: hidden;
  color: #6f86ad;
  background: rgba(255, 255, 255, 0.04);
  border: 0;
  border-right: 1px solid rgba(96, 165, 250, 0.12);
  cursor: pointer;
  transition: transform .2s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:hover:not(:disabled) {
    transform: scale(1.02);
  }

  &:disabled {
    cursor: default;
    opacity: .75;
  }
}

.alarm-feed-body {
  display: flex;
  min-width: 0;
  padding: 12px 14px;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
}

.alarm-feed-title {
  overflow: hidden;
  margin-bottom: 8px;
  color: #f8fbff;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-feed-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 5px;
  min-width: 0;
  font-size: 12px;
}

.alarm-feed-label {
  color: #8ea3c7;
  flex-shrink: 0;
}

.alarm-feed-value {
  overflow: hidden;
  color: #dce8ff;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.alarm-feed-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 8px;
}

.alarm-feed-tag {
  padding: 3px 10px;
  color: #bfdbfe;
  font-size: 11px;
  background: rgba(59, 130, 246, 0.18);
  border: 1px solid rgba(96, 165, 250, 0.24);
  border-radius: 999px;
  flex-shrink: 0;
}

@media (max-width: 1280px) {
  .overview-dashboard {
    height: auto;
    min-height: calc(100vh - 112px);
    overflow: auto;
  }

  .dashboard-grid {
    grid-template-columns: 1fr 1.5fr;
    min-height: 520px;
  }

  .alarm-panel-border { grid-column: 1 / -1; }
  .stats-panel { grid-column: auto; }
}

@media (max-width: 900px) {
  .overview-dashboard { padding: 18px; }
  .metric-grid { grid-template-columns: repeat(2, 1fr); }
  .dashboard-grid { grid-template-columns: 1fr; min-height: auto; }
  .alarm-panel-border { grid-column: auto; }
  .panel-border { min-height: 420px; }
}

@media (max-width: 600px) {
  .heading-main { align-items: flex-start; gap: 12px; flex-direction: column; }
  .heading-actions { flex-wrap: wrap; width: 100%; }
  .metric-grid { grid-template-columns: 1fr; }
  .video-filters { grid-template-columns: 1fr; }
  .stats-tab-row { align-items: flex-start; flex-direction: column; }
}
</style>
