<template>
  <div class="overview-dashboard">
    <header class="dashboard-heading">
      <div>
        <div class="eyebrow">EASYAIOT EDGE</div>
        <h1>首页看板</h1>
        <p>设备、算法与告警态势实时汇总</p>
      </div>
      <button class="refresh-button" :disabled="loading" @click="refreshDashboard">
        <Icon icon="ant-design:reload-outlined" :size="16" />
        {{ loading ? "刷新中" : "刷新数据" }}
      </button>
    </header>

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

    <section class="metric-grid" aria-label="数据统计">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <div
          class="metric-icon"
          :style="{ color: metric.color, backgroundColor: `${metric.color}18` }"
        >
          <Icon :icon="metric.icon" :size="22" />
        </div>
        <div>
          <div class="metric-label">{{ metric.label }}</div>
          <div class="metric-value">{{ metric.value }}</div>
          <div class="metric-hint">{{ metric.hint }}</div>
        </div>
      </article>
    </section>

    <section class="dashboard-grid">
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
              <span
                class="legend-dot"
                :style="{ backgroundColor: chartColors[index % chartColors.length] }"
              ></span>
              <span class="legend-name" :title="item.name">{{ item.name }}</span>
              <strong>{{ item.count }}</strong>
              <span>{{ item.percentage.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">当前周期暂无算法报警</div>
      </article>

      <article class="panel video-panel">
        <div class="panel-title-row video-title-row">
          <div>
            <span class="panel-kicker">中间视频</span>
            <h2>任务实时画面</h2>
          </div>
          <span :class="['stream-status', { online: Boolean(currentStreamUrl) }]">
            {{ currentStreamUrl ? "播放中" : "等待选择" }}
          </span>
        </div>

        <div v-if="cameraStreams.length" class="stream-selector" aria-label="视频流选择">
          <button
            v-for="camera in cameraStreams"
            :key="camera.id"
            :class="['stream-select-button', { active: selectedCameraId === camera.id }]"
            :title="camera.name || camera.id"
            @click="selectedCameraId = camera.id"
          >
            <Icon icon="ant-design:video-camera-outlined" :size="14" />
            <span>{{ camera.name || camera.id }}</span>
          </button>
        </div>
        <div v-else-if="streamsLoading" class="stream-selector-empty">正在加载视频流…</div>
        <div v-else class="stream-selector-empty">暂无可选择的视频流</div>

        <div class="video-stage">
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
            <span>选择上方的视频流后开始播放</span>
          </div>
          <div v-if="selectedCamera" class="video-caption">
            <span>{{ selectedCamera.name || selectedCamera.id }}</span>
            <span>视频流</span>
          </div>
        </div>
      </article>

      <article class="panel ranking-panel">
        <div class="panel-title-row ranking-title-row">
          <div>
            <span class="panel-kicker">摄像头报警排行</span>
            <h2>{{ rankingMode === "camera" ? "摄像头排行" : "摄像头分组排行" }}</h2>
          </div>
          <div class="mode-toggle">
            <button :class="{ active: rankingMode === 'camera' }" @click="rankingMode = 'camera'">
              摄像头
            </button>
            <button
              :class="{ active: rankingMode === 'directory' }"
              @click="rankingMode = 'directory'"
            >
              分组
            </button>
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
              <small v-if="rankingMode === 'camera'">{{ item.directory_name || "未分组" }}</small>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">当前周期暂无摄像头报警</div>
      </article>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Icon } from "@/components/Icon";
import Jessibuca from "@/components/Player/module/jessibuca.vue";
import { getDashboardStatistics } from "@/api/device/calculate";
import { getDeviceList, type DeviceInfo } from "@/api/device/camera";
import {
  getTaskStreams,
  listAlgorithmTasks,
  type AlgorithmTask,
} from "@/api/device/algorithm_task";
import { useMessage } from "@/hooks/web/useMessage";

defineOptions({ name: "MonitorDashboard" });

type PeriodKey = "today" | "week" | "month";
type RankingMode = "camera" | "directory";

interface RankingItem {
  name: string;
  count: number;
  percentage: number;
  device_id?: string;
  directory_name?: string;
}

interface PeriodStatistics {
  label: string;
  alarm_count: number;
  active_camera_count: number;
  active_algorithm_count: number;
  algorithm_ranking: RankingItem[];
  camera_ranking: RankingItem[];
  directory_ranking: RankingItem[];
}

const emptyPeriod = (label: string): PeriodStatistics => ({
  label,
  alarm_count: 0,
  active_camera_count: 0,
  active_algorithm_count: 0,
  algorithm_ranking: [],
  camera_ranking: [],
  directory_ranking: [],
});

const { createMessage } = useMessage();
const loading = ref(false);
const streamsLoading = ref(false);
const selectedPeriod = ref<PeriodKey>("today");
const rankingMode = ref<RankingMode>("camera");
const periodOptions = [
  { label: "今日", value: "today" as PeriodKey },
  { label: "本周", value: "week" as PeriodKey },
  { label: "本月", value: "month" as PeriodKey },
];
const chartColors = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#64748b",
];

const statistics = ref({
  alarm_count: 0,
  camera_count: 0,
  algorithm_count: 0,
  model_count: 0,
  periods: {
    today: emptyPeriod("今日"),
    week: emptyPeriod("本周"),
    month: emptyPeriod("本月"),
  } as Record<PeriodKey, PeriodStatistics>,
});

const cameraStreams = ref<DeviceInfo[]>([]);
const selectedCameraId = ref<string>();
const autoPlayingTaskId = ref<number>();
let runningTaskPollTimer: ReturnType<typeof window.setInterval> | undefined;

const currentPeriod = computed(
  () => statistics.value.periods[selectedPeriod.value] || emptyPeriod("当前"),
);
const algorithmRanking = computed(() => currentPeriod.value.algorithm_ranking || []);
const displayRanking = computed(() =>
  rankingMode.value === "camera"
    ? currentPeriod.value.camera_ranking || []
    : currentPeriod.value.directory_ranking || [],
);

const metrics = computed(() => [
  {
    label: `${currentPeriod.value.label}报警`,
    value: currentPeriod.value.alarm_count,
    hint: "报警事件总量",
    icon: "ant-design:alert-outlined",
    color: "#ef4444",
  },
  {
    label: "活跃摄像头",
    value: currentPeriod.value.active_camera_count,
    hint: `设备总数 ${statistics.value.camera_count}`,
    icon: "ant-design:video-camera-outlined",
    color: "#3b82f6",
  },
  {
    label: "触发算法",
    value: currentPeriod.value.active_algorithm_count,
    hint: `任务总数 ${statistics.value.algorithm_count}`,
    icon: "ant-design:deployment-unit-outlined",
    color: "#8b5cf6",
  },
  {
    label: "模型总数",
    value: statistics.value.model_count,
    hint: "已接入算法模型",
    icon: "ant-design:cluster-outlined",
    color: "#22c55e",
  },
]);

const donutStyle = computed(() => {
  if (!algorithmRanking.value.length) return {};
  let cursor = 0;
  const stops = algorithmRanking.value.map((item, index) => {
    const start = cursor;
    cursor += item.percentage;
    return `${chartColors[index % chartColors.length]} ${start}% ${cursor}%`;
  });
  return { background: `conic-gradient(${stops.join(", ")})` };
});

const selectedCamera = computed(() =>
  cameraStreams.value.find((camera) => camera.id === selectedCameraId.value),
);

function convertRtmpToHttp(rtmpUrl?: string) {
  if (!rtmpUrl?.startsWith("rtmp://")) return "";
  try {
    const url = new URL(rtmpUrl);
    let path = url.pathname.replace(/^\//, "") || "live";
    if (!path.endsWith(".flv")) path += ".flv";
    return `/${path}`;
  } catch {
    return "";
  }
}

function normalizeStream(streamUrl?: string) {
  if (!streamUrl) return "";
  try {
    const url = new URL(streamUrl, window.location.origin);
    if (url.pathname.startsWith("/ai/") || url.pathname.startsWith("/live/"))
      // Jessibuca 3.3.15 uses an `http` prefix to distinguish HTTP-FLV from
      // WebSocket streams. Keep the same-origin URL absolute or it will treat
      // `/live/*.flv` as a WebSocket URL and fail with `websocketError`.
      return `${window.location.origin}${url.pathname}${url.search}`;
  } catch {
    return streamUrl;
  }
  return streamUrl;
}

const currentStreamUrl = computed(() => {
  const camera = selectedCamera.value;
  if (!camera) return "";
  return normalizeStream(camera.http_stream) || convertRtmpToHttp(camera.rtmp_stream);
});

const videoPlaceholderTitle = computed(() => {
  if (!selectedCameraId.value) return "请选择视频流";
  return "该摄像头暂无可播放流";
});

function rankingWidth(count: number) {
  const max = Math.max(...displayRanking.value.map((item) => item.count), 1);
  return Math.max((count / max) * 100, 6);
}

async function loadStatistics() {
  const response = await getDashboardStatistics();
  if (response)
    statistics.value = {
      ...statistics.value,
      ...response,
      periods: { ...statistics.value.periods, ...(response.periods || {}) },
    };
}

function isRunningTask(task: AlgorithmTask) {
  return task.is_enabled && task.status === 0;
}

function mostRecentlyUpdatedTask(tasks: AlgorithmTask[]) {
  return [...tasks].sort(
    (left, right) =>
      new Date(right.updated_at || right.created_at || 0).getTime() -
      new Date(left.updated_at || left.created_at || 0).getTime(),
  )[0];
}

async function autoPlayRunningTask() {
  try {
    // The backend currently parses is_enabled with int(...), so the browser's
    // boolean query value ("true") produces HTTP 400. Fetch then filter locally.
    const response = await listAlgorithmTasks({ pageNo: 1, pageSize: 1000 });
    const taskList = Array.isArray(response) ? response : response?.data || [];
    const task = mostRecentlyUpdatedTask(taskList.filter(isRunningTask));
    if (!task) {
      autoPlayingTaskId.value = undefined;
      return;
    }
    if (task.id === autoPlayingTaskId.value) return;

    const streamResponse = await getTaskStreams(task.id);
    const taskStreams = Array.isArray(streamResponse) ? streamResponse : streamResponse?.data || [];
    const playableStream = taskStreams.find((stream) => stream.http_stream || stream.rtmp_stream);
    if (!playableStream) return;

    const camera = cameraStreams.value.find((item) => item.id === playableStream.device_id);
    if (camera) {
      selectedCameraId.value = camera.id;
    } else {
      cameraStreams.value = [
        ...cameraStreams.value,
        {
          ...playableStream,
          id: playableStream.device_id,
          name: playableStream.device_name,
        } as DeviceInfo,
      ];
      selectedCameraId.value = playableStream.device_id;
    }
    autoPlayingTaskId.value = task.id;
  } catch (error) {
    // 自动播放不应影响看板其余数据加载，下一轮轮询会再次尝试。
    console.warn("自动切换运行中的算法任务视频流失败", error);
  }
}

async function loadCameraStreams() {
  streamsLoading.value = true;
  try {
    const response = await getDeviceList({ pageNo: 1, pageSize: 8 });
    const devices = Array.isArray(response) ? response : response?.data || [];
    cameraStreams.value = devices.filter((camera: DeviceInfo) =>
      Boolean(
        camera.http_stream || camera.rtmp_stream || camera.ai_http_stream || camera.ai_rtmp_stream,
      ),
    );
    if (
      !selectedCameraId.value ||
      !cameraStreams.value.some((camera) => camera.id === selectedCameraId.value)
    )
      selectedCameraId.value = cameraStreams.value[0]?.id;
  } catch (error) {
    console.error("加载首页视频流失败", error);
    createMessage.warning("视频流加载失败，请稍后重试");
  } finally {
    streamsLoading.value = false;
  }
}

async function refreshDashboard() {
  loading.value = true;
  try {
    await Promise.all([loadStatistics(), loadCameraStreams()]);
    await autoPlayRunningTask();
  } catch (error) {
    console.error("加载首页看板失败", error);
    createMessage.error("首页看板加载失败，请稍后重试");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  refreshDashboard();
  runningTaskPollTimer = window.setInterval(autoPlayRunningTask, 15_000);
});

onBeforeUnmount(() => {
  if (runningTaskPollTimer) window.clearInterval(runningTaskPollTimer);
});
</script>

<style lang="less" scoped>
.overview-dashboard {
  min-height: 100%;
  padding: 28px;
  color: #172033;
  background: radial-gradient(circle at 0 0, rgba(59, 130, 246, 0.1), transparent 32%), #f5f7fb;
}

.dashboard-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;

  h1 {
    margin: 2px 0 4px;
    font-size: 28px;
    line-height: 1.2;
    font-weight: 700;
  }
  p {
    margin: 0;
    color: #7b8498;
  }
}

.eyebrow,
.panel-kicker {
  color: #3b82f6;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
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
  &:disabled {
    opacity: 0.55;
    cursor: wait;
  }
}

.period-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 18px;
  background: #e9edf5;
  border-radius: 10px;
}

.period-tab,
.mode-toggle button {
  border: 0;
  cursor: pointer;
  transition: 0.2s ease;
}

.period-tab {
  min-width: 76px;
  padding: 8px 18px;
  color: #6c7588;
  background: transparent;
  border-radius: 7px;
  &.active {
    color: #172033;
    background: #fff;
    box-shadow: 0 3px 12px rgba(31, 45, 75, 0.08);
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.metric-card,
.panel {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e7eaf1;
  box-shadow: 0 8px 28px rgba(38, 53, 83, 0.06);
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 112px;
  padding: 20px;
  border-radius: 14px;
}

.metric-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  place-items: center;
  border-radius: 13px;
}
.metric-label {
  color: #737d91;
  font-size: 13px;
}
.metric-value {
  margin: 2px 0;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}
.metric-hint {
  color: #a0a7b7;
  font-size: 11px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(250px, 0.9fr) minmax(420px, 1.5fr) minmax(270px, 1fr);
  gap: 14px;
  min-height: 540px;
}

.panel {
  display: flex;
  min-width: 0;
  padding: 20px;
  border-radius: 14px;
  flex-direction: column;
}
.panel-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}
.panel-title-row h2 {
  margin: 3px 0 0;
  font-size: 18px;
  font-weight: 650;
}
.panel-total {
  padding: 5px 9px;
  color: #ef4444;
  font-size: 12px;
  background: #fef2f2;
  border-radius: 999px;
}

.donut-section {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 26px;
  flex-direction: column;
}
.donut {
  position: relative;
  display: grid;
  width: 190px;
  height: 190px;
  place-items: center;
  border-radius: 50%;
  transform: rotate(-90deg);
}
.donut::after {
  width: 112px;
  height: 112px;
  background: #fff;
  border-radius: 50%;
  content: "";
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
.donut-center strong {
  font-size: 28px;
}
.donut-center span {
  color: #929bad;
  font-size: 11px;
}
.legend-list {
  width: 100%;
  max-height: 210px;
  padding-right: 4px;
  overflow-y: auto;
}
.legend-row {
  display: grid;
  grid-template-columns: 9px minmax(0, 1fr) auto 46px;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  color: #8891a3;
  font-size: 12px;
  border-bottom: 1px solid #f0f2f6;
}
.legend-row strong {
  color: #344054;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-name {
  overflow: hidden;
  color: #596174;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-panel {
  padding-bottom: 16px;
}
.video-title-row {
  margin-bottom: 14px;
}
.stream-status {
  padding: 5px 9px;
  color: #8992a5;
  font-size: 11px;
  background: #f0f2f6;
  border-radius: 999px;
}
.stream-status.online {
  color: #15803d;
  background: #ecfdf3;
}
.stream-selector {
  display: flex;
  gap: 8px;
  padding-bottom: 10px;
  overflow-x: auto;
}
.stream-select-button {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
  color: #5f6b7d;
  font-size: 12px;
  background: #f7f8fb;
  border: 1px solid #e5e9f0;
  border-radius: 7px;
  cursor: pointer;
  transition: 0.2s ease;
}
.stream-select-button span {
  max-width: 116px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stream-select-button:hover {
  color: #2563eb;
  border-color: #93c5fd;
}
.stream-select-button.active {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #60a5fa;
}
.stream-selector-empty {
  padding: 5px 0 13px;
  color: #98a1b2;
  font-size: 12px;
}
.video-stage {
  position: relative;
  flex: 1;
  min-height: 350px;
  overflow: hidden;
  background: #09111f;
  border: 1px solid #25324a;
  border-radius: 12px;
}
.video-player {
  width: 100%;
  height: 100%;
}
.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dce8ff;
  background: radial-gradient(circle at 50% 42%, #192a48, #080f1c 64%);
  flex-direction: column;
}
.video-placeholder strong {
  margin: 18px 0 5px;
  font-size: 16px;
}
.video-placeholder span {
  color: #73809a;
  font-size: 12px;
}
.camera-orbit {
  display: grid;
  width: 90px;
  height: 90px;
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.28);
  border-radius: 50%;
  place-items: center;
  box-shadow: 0 0 40px rgba(59, 130, 246, 0.16);
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
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.82));
  pointer-events: none;
}

.ranking-title-row {
  align-items: center;
}
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
  box-shadow: 0 2px 7px rgba(32, 45, 72, 0.08);
}
.ranking-list {
  display: flex;
  gap: 14px;
  flex-direction: column;
}
.ranking-row {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}
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
.rank-number.top {
  color: #fff;
  background: #172033;
}
.rank-content {
  min-width: 0;
  flex: 1;
}
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
.rank-meta strong {
  flex-shrink: 0;
  color: #1d2939;
  font-size: 11px;
}
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
  min-height: 230px;
  color: #a1a8b6;
  font-size: 13px;
  place-items: center;
}

@media (max-width: 1280px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1.5fr;
  }
  .ranking-panel {
    grid-column: 1 / -1;
  }
  .ranking-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 900px) {
  .overview-dashboard {
    padding: 18px;
  }
  .metric-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .ranking-panel {
    grid-column: auto;
  }
  .video-panel {
    min-height: 560px;
  }
}

@media (max-width: 600px) {
  .dashboard-heading {
    align-items: flex-start;
    gap: 12px;
    flex-direction: column;
  }
  .metric-grid {
    grid-template-columns: 1fr;
  }
  .ranking-list {
    grid-template-columns: 1fr;
  }
}
</style>
