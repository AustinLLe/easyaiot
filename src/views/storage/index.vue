<template>
  <div class="storage-page">
    <div class="page-heading">
      <div>
        <h1>录像存储中心</h1>
        <p>查看运行节点磁盘、配置摄像头留存方式，并翻阅已保存录像</p>
      </div>
      <div class="heading-actions">
        <a-button :loading="refreshing" @click="refreshAll(true)">
          <template #icon><ReloadOutlined /></template>
          重新扫描
        </a-button>
        <a-popconfirm title="立即按当前策略处理过期录像？" @confirm="handleCleanup">
          <a-button type="primary" :loading="cleaning">立即执行留存策略</a-button>
        </a-popconfirm>
      </div>
    </div>

    <a-spin :spinning="overviewLoading">
      <section class="node-panel">
        <div class="node-title">
          <div class="node-icon"><DatabaseOutlined /></div>
          <div>
            <div class="node-name">{{ overview?.node.name || '当前录像节点' }}</div>
            <div class="node-meta">
              <a-badge status="success" text="在线" />
              <span>{{ overview?.node.kind === 'development_board' ? '开发板' : '服务器' }}</span>
              <span>{{ overview?.node.platform }} · {{ overview?.node.architecture }}</span>
            </div>
          </div>
          <div class="scan-time">最近扫描：{{ formatDateTime(overview?.node.scanned_at) }}</div>
        </div>

        <div v-if="overview?.disks.length" class="disk-grid">
          <article v-for="disk in overview.disks" :key="disk.id" class="disk-card">
            <div class="disk-card-head">
              <div>
                <div class="disk-name">磁盘 {{ disk.mount_point }}</div>
                <div class="muted">{{ disk.filesystem }}</div>
              </div>
              <strong :class="usageClass(disk.usage_percent)">{{ disk.usage_percent }}%</strong>
            </div>
            <a-progress
              :percent="disk.usage_percent"
              :show-info="false"
              :stroke-color="progressColor(disk.usage_percent)"
              :trail-color="'#e8edf4'"
            />
            <div class="disk-values">
              <span>可用 <b>{{ formatBytes(disk.free_bytes) }}</b></span>
              <span>已用 {{ formatBytes(disk.used_bytes) }}</span>
              <span>总计 {{ formatBytes(disk.total_bytes) }}</span>
            </div>
            <div class="target-list">
              <a-tag v-for="target in disk.targets" :key="target.path" :color="target.exists ? 'blue' : 'default'">
                {{ target.label }}
              </a-tag>
            </div>
          </article>
        </div>
        <a-empty v-else description="未发现可用录像磁盘" />

        <div class="usage-summary">
          <div><span>录像总占用</span><b>{{ formatBytes(overview?.recording_usage.total_bytes) }}</b></div>
          <div><span>SRS 连续录像</span><b>{{ formatBytes(overview?.recording_usage.srs_bytes) }}</b></div>
          <div><span>平台录像对象</span><b>{{ formatBytes(overview?.recording_usage.object_bytes) }}</b></div>
          <div><span>到期归档</span><b>{{ formatBytes(overview?.recording_usage.archive_bytes) }}</b></div>
        </div>
      </section>
    </a-spin>

    <a-tabs v-model:active-key="activeTab" class="content-tabs" @change="handleTabChange">
      <a-tab-pane key="policy" tab="摄像头留存策略">
        <div class="tab-toolbar">
          <div>
            <h2>按摄像头配置</h2>
            <p>0 天表示永久保留；“到期归档”会将过期录像移入归档区。</p>
          </div>
          <a-input-search v-model:value="policySearch" placeholder="搜索摄像头" allow-clear class="search-box" />
        </div>
        <a-table
          :data-source="filteredPolicies"
          :columns="policyColumns"
          :loading="policyLoading"
          :row-key="(row) => row.id"
          :pagination="{ pageSize: 10, showSizeChanger: false }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'camera'">
              <div class="camera-cell">
                <VideoCameraOutlined />
                <div><b>{{ record.device_name }}</b><span>{{ record.device_id }}</span></div>
              </div>
            </template>
            <template v-else-if="column.key === 'usage'">
              <b>{{ formatBytes(record.video_bytes) }}</b>
              <span class="table-sub">{{ record.video_count }} 段录像</span>
            </template>
            <template v-else-if="column.key === 'save_mode'">
              <a-select v-model:value="record.save_mode" style="width: 128px">
                <a-select-option :value="0">到期删除</a-select-option>
                <a-select-option :value="1">到期归档</a-select-option>
              </a-select>
            </template>
            <template v-else-if="column.key === 'save_time'">
              <a-input-number v-model:value="record.save_time" :min="0" :max="3650" :precision="0" />
              <span class="day-unit">天</span>
              <span v-if="record.save_time === 0" class="forever">永久</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="primary" size="small" :loading="savingPolicyId === record.id" @click="savePolicy(record)">
                保存
              </a-button>
              <a-button type="link" size="small" @click="openDeviceHistory(record.device_id)">查看历史</a-button>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="history" tab="录像历史">
        <div class="history-filters">
          <a-input-search v-model:value="historyFilters.search" placeholder="摄像头、设备 ID 或文件名" allow-clear @search="loadHistory(true)" />
          <a-select v-model:value="historyFilters.device_id" allow-clear placeholder="全部摄像头" @change="loadHistory(true)">
            <a-select-option v-for="policy in policies" :key="policy.device_id" :value="policy.device_id">
              {{ policy.device_name }}
            </a-select-option>
          </a-select>
          <a-range-picker v-model:value="historyRange" show-time @change="loadHistory(true)" />
          <a-button type="primary" @click="loadHistory(true)">查询</a-button>
        </div>

        <a-spin :spinning="historyLoading">
          <div v-if="history.length" class="history-grid">
            <article v-for="item in history" :key="item.id" class="history-card" @click="playHistory(item)">
              <div class="history-preview">
                <VideoCameraOutlined />
                <span class="play-button"><CaretRightFilled /></span>
                <a-tag class="source-tag" :color="item.source === 'srs' ? 'cyan' : 'purple'">
                  {{ item.source === 'srs' ? '连续录像' : '平台录像' }}
                </a-tag>
              </div>
              <div class="history-info">
                <b :title="item.filename">{{ item.device_name }}</b>
                <span>{{ formatDateTime(item.event_time) }}</span>
                <span>{{ formatBytes(item.size) }} · {{ item.filename }}</span>
              </div>
            </article>
          </div>
          <a-empty v-else description="当前筛选条件下暂无录像" />
        </a-spin>
        <div class="history-pagination">
          <span>共 {{ historyTotal }} 段，{{ formatBytes(historyTotalBytes) }}</span>
          <a-pagination
            v-model:current="historyPage"
            :page-size="historyPageSize"
            :total="historyTotal"
            :show-size-changer="false"
            @change="loadHistory(false)"
          />
        </div>
      </a-tab-pane>
    </a-tabs>

    <DialogPlayer title="录像回放" @register="registerPlayerModal" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import dayjs, { type Dayjs } from 'dayjs';
import {
  CaretRightFilled, DatabaseOutlined, ReloadOutlined, VideoCameraOutlined,
} from '@ant-design/icons-vue';
import { useMessage } from '@/hooks/web/useMessage';
import { useModal } from '@/components/Modal';
import DialogPlayer from '@/components/VideoPlayer/DialogPlayer.vue';
import {
  getRecordingHistory, getRetentionPolicies, getStorageOverview, runRetentionCleanup,
  updateRecordSpace, type RecordingHistory, type RetentionPolicy, type StorageOverview,
} from '@/api/device/record';

defineOptions({ name: 'StorageCenter' });

const { createMessage } = useMessage();
const [registerPlayerModal, { openModal: openPlayerModal }] = useModal();
const activeTab = ref('policy');
const overview = ref<StorageOverview | null>(null);
const policies = ref<RetentionPolicy[]>([]);
const history = ref<RecordingHistory[]>([]);
const overviewLoading = ref(false);
const policyLoading = ref(false);
const historyLoading = ref(false);
const refreshing = ref(false);
const cleaning = ref(false);
const savingPolicyId = ref<number | null>(null);
const policySearch = ref('');
const historyPage = ref(1);
const historyPageSize = 24;
const historyTotal = ref(0);
const historyTotalBytes = ref(0);
const historyRange = ref<[Dayjs, Dayjs] | null>(null);
const historyFilters = reactive({ search: '', device_id: undefined as string | undefined });

const policyColumns = [
  { title: '摄像头', key: 'camera', width: 260 },
  { title: '当前占用', key: 'usage', width: 150 },
  { title: '到期处理', key: 'save_mode', width: 170 },
  { title: '保留时长', key: 'save_time', width: 230 },
  { title: '操作', key: 'action', width: 180 },
];

const filteredPolicies = computed(() => {
  const term = policySearch.value.trim().toLowerCase();
  if (!term) return policies.value;
  return policies.value.filter(item => item.device_name.toLowerCase().includes(term)
    || (item.device_id || '').toLowerCase().includes(term));
});

function formatBytes(value?: number) {
  const size = Number(value || 0);
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function formatDateTime(value?: string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--';
}

function usageClass(percent: number) {
  return percent >= 90 ? 'danger' : percent >= 75 ? 'warning' : 'healthy';
}

function progressColor(percent: number) {
  return percent >= 90 ? '#ef4444' : percent >= 75 ? '#f59e0b' : '#1677ff';
}

async function loadOverview() {
  overviewLoading.value = true;
  try { overview.value = await getStorageOverview() as StorageOverview; }
  finally { overviewLoading.value = false; }
}

async function loadPolicies() {
  policyLoading.value = true;
  try { policies.value = (await getRetentionPolicies() || []) as RetentionPolicy[]; }
  finally { policyLoading.value = false; }
}

async function loadHistory(reset = false) {
  if (reset) historyPage.value = 1;
  historyLoading.value = true;
  try {
    const rawResponse: any = await getRecordingHistory({
      pageNo: historyPage.value,
      pageSize: historyPageSize,
      search: historyFilters.search || undefined,
      device_id: historyFilters.device_id,
      start_time: historyRange.value?.[0]?.toISOString(),
      end_time: historyRange.value?.[1]?.toISOString(),
      refresh: reset,
    });
    const response = rawResponse?.data?.code === 0 ? rawResponse.data : rawResponse;
    history.value = Array.isArray(response) ? response : (response?.data || []);
    historyTotal.value = Array.isArray(response) ? response.length : Number(response?.total || 0);
    historyTotalBytes.value = Number(response?.total_bytes || history.value.reduce((sum, item) => sum + item.size, 0));
  } finally { historyLoading.value = false; }
}

async function refreshAll(force = false) {
  refreshing.value = force;
  try {
    await Promise.all([loadOverview(), loadPolicies()]);
    if (activeTab.value === 'history') await loadHistory(force);
    if (force) createMessage.success('磁盘与录像信息已更新');
  } finally { refreshing.value = false; }
}

async function savePolicy(record: RetentionPolicy) {
  savingPolicyId.value = record.id;
  try {
    await updateRecordSpace(record.id, { save_mode: record.save_mode, save_time: Number(record.save_time || 0) });
    createMessage.success(`${record.device_name} 的留存策略已保存`);
  } finally { savingPolicyId.value = null; }
}

async function handleCleanup() {
  cleaning.value = true;
  try {
    const result: any = await runRetentionCleanup();
    createMessage.success(`处理完成：删除 ${result.deleted_count || 0}，归档 ${result.archived_count || 0}`);
    await refreshAll(true);
  } finally { cleaning.value = false; }
}

function openDeviceHistory(deviceId: string) {
  historyFilters.device_id = deviceId;
  activeTab.value = 'history';
  loadHistory(true);
}

function getPlaybackUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/api/')) return `${window.location.origin}${path}`;
  const apiBase = (import.meta.env.VITE_GLOB_API_URL || '/dev-api').replace(/\/$/, '');
  return `${apiBase}${path}`;
}

function playHistory(item: RecordingHistory) {
  openPlayerModal(true, { id: item.device_id, http_stream: getPlaybackUrl(item.url) });
}

function handleTabChange(key: string) {
  if (key === 'history' && history.length === 0) loadHistory(true);
}

onMounted(() => refreshAll(false));
</script>

<style lang="less" scoped>
.storage-page { min-height: 100%; padding: 24px; background: #f5f7fb; color: #182230; }
.page-heading, .node-title, .tab-toolbar, .history-filters, .history-pagination { display: flex; align-items: center; justify-content: space-between; }
.page-heading { margin-bottom: 20px; }
h1, h2, p { margin: 0; }
h1 { font-size: 26px; }
h2 { font-size: 18px; }
.page-heading p, .tab-toolbar p { margin-top: 6px; color: #667085; }
.heading-actions { display: flex; gap: 10px; }
.node-panel, .content-tabs { background: #fff; border: 1px solid #e5eaf1; border-radius: 14px; box-shadow: 0 6px 24px rgba(16, 24, 40, .05); }
.node-panel { padding: 20px; }
.node-title { justify-content: flex-start; }
.node-icon { display: grid; place-items: center; width: 44px; height: 44px; margin-right: 12px; border-radius: 12px; color: #1677ff; background: #eaf3ff; font-size: 22px; }
.node-name { font-size: 17px; font-weight: 650; }
.node-meta { display: flex; gap: 14px; margin-top: 4px; color: #667085; }
.scan-time { margin-left: auto; color: #98a2b3; }
.disk-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; margin-top: 20px; }
.disk-card { padding: 18px; border: 1px solid #e8edf3; border-radius: 12px; background: #fbfcfe; }
.disk-card-head, .disk-values { display: flex; justify-content: space-between; align-items: center; }
.disk-card-head { margin-bottom: 10px; }
.disk-name { font-weight: 600; }
.muted { color: #98a2b3; font-size: 12px; }
.healthy { color: #1677ff; } .warning { color: #f59e0b; } .danger { color: #ef4444; }
.disk-values { margin-top: 8px; color: #667085; font-size: 13px; }
.disk-values b { color: #182230; }
.target-list { margin-top: 14px; }
.usage-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 18px; }
.usage-summary div { padding: 14px 16px; border-radius: 10px; background: #f7f9fc; }
.usage-summary span, .usage-summary b { display: block; }
.usage-summary span { color: #667085; font-size: 13px; }
.usage-summary b { margin-top: 6px; font-size: 18px; }
.content-tabs { margin-top: 20px; padding: 4px 20px 20px; }
.tab-toolbar { padding: 8px 0 18px; }
.search-box { width: 280px; }
.camera-cell { display: flex; align-items: center; gap: 10px; }
.camera-cell > span { color: #1677ff; font-size: 18px; }
.camera-cell b, .camera-cell span, .table-sub { display: block; }
.camera-cell span, .table-sub { color: #98a2b3; font-size: 12px; }
.day-unit { margin-left: 6px; }.forever { margin-left: 10px; color: #1677ff; }
.history-filters { justify-content: flex-start; gap: 10px; margin-bottom: 18px; }
.history-filters > :first-child { width: 280px; }.history-filters > :nth-child(2) { width: 200px; }
.history-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.history-card { overflow: hidden; border: 1px solid #e5eaf1; border-radius: 12px; background: #fff; cursor: pointer; transition: .2s ease; }
.history-card:hover { transform: translateY(-2px); border-color: #91caff; box-shadow: 0 8px 22px rgba(22, 119, 255, .10); }
.history-preview { position: relative; display: grid; place-items: center; height: 132px; color: #8ca3bd; font-size: 44px; background: linear-gradient(145deg, #eef4fb, #dfeaf7); }
.play-button { position: absolute; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; color: #fff; background: rgba(18, 34, 54, .72); font-size: 20px; }
.source-tag { position: absolute; top: 10px; left: 10px; }
.history-info { padding: 13px; }.history-info b, .history-info span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-info span { margin-top: 4px; color: #667085; font-size: 12px; }
.history-pagination { margin-top: 20px; color: #667085; }
@media (max-width: 900px) {
  .storage-page { padding: 14px; }.page-heading, .tab-toolbar { align-items: flex-start; flex-direction: column; gap: 12px; }
  .usage-summary { grid-template-columns: repeat(2, 1fr); }.history-filters { flex-wrap: wrap; }.scan-time { display: none; }
}
</style>
