<template>
  <div class="storage-page">
    <div class="page-heading">
      <div>
        <h1>录像存储中心</h1>
        <p>查看运行节点磁盘、配置摄像头留存方式，并翻阅已保存录像</p>
      </div>
      <div class="heading-actions">
        <AButton :loading="refreshing" @click="refreshAll(true)">
          <template #icon><ReloadOutlined /></template>
          重新扫描
        </AButton>
        <APopconfirm title="立即按当前策略处理过期录像？" @confirm="handleCleanup">
          <AButton type="primary" :loading="cleaning">立即执行留存策略</AButton>
        </APopconfirm>
      </div>
    </div>

    <ASpin :spinning="overviewLoading">
      <section class="node-panel">
        <div class="node-title">
          <div class="node-icon"><DatabaseOutlined /></div>
          <div>
            <div class="node-name">{{ overview?.node.name || '当前录像节点' }}</div>
            <div class="node-meta">
              <ABadge status="success" text="在线" />
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
            <AProgress
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
              <ATag v-for="target in disk.targets" :key="target.path" :color="target.exists ? 'blue' : 'default'">
                {{ target.label }}
              </ATag>
            </div>
          </article>
        </div>
        <AEmpty v-else description="未发现可用录像磁盘" />

        <div class="usage-summary">
          <div><span>录像总占用</span><b>{{ formatBytes(overview?.recording_usage.total_bytes) }}</b></div>
          <div><span>SRS 连续录像</span><b>{{ formatBytes(overview?.recording_usage.srs_bytes) }}</b></div>
          <div><span>平台录像对象</span><b>{{ formatBytes(overview?.recording_usage.object_bytes) }}</b></div>
          <div><span>到期归档</span><b>{{ formatBytes(overview?.recording_usage.archive_bytes) }}</b></div>
        </div>
      </section>
    </ASpin>

    <ATabs v-model:active-key="activeTab" class="content-tabs" :animated="false" @change="handleTabChange">
      <ATabPane key="policy" tab="摄像头留存策略">
        <div class="tab-toolbar">
          <div>
            <h2>按摄像头配置</h2>
            <p>0 天表示永久保留；“到期归档”会将过期录像移入归档区。</p>
          </div>
          <div class="policy-picker">
            <label>选择摄像头</label>
            <ASelect
              v-model:value="policyDeviceFilter"
              show-search
              allow-clear
              option-filter-prop="label"
              placeholder="点击选择最近使用的摄像头"
              class="camera-select"
            >
              <ASelectOption
                v-for="policy in recentPolicies"
                :key="policy.device_id"
                :value="policy.device_id"
                :label="`${policy.device_name} ${policy.device_id}`"
              >
                <div class="camera-option">
                  <span>{{ policy.device_name }}</span>
                  <small>{{ policy.latest_recording_at ? `最近录像 ${formatRelativeTime(policy.latest_recording_at)}` : '暂无录像' }}</small>
                </div>
              </ASelectOption>
            </ASelect>
          </div>
        </div>

        <section class="retention-schemes">
          <div class="current-scheme">
            <div class="current-scheme-title">
              <span>当前生效规则</span>
              <ATag :color="schemeState?.current.matched_scheme_id ? 'green' : 'blue'">
                {{ schemeState?.current.matched_scheme_id ? '已匹配方案' : '实时汇总' }}
              </ATag>
            </div>
            <h3>{{ schemeState?.current.name || '读取中…' }}</h3>
            <p>{{ schemeState?.current.description }}</p>
            <div class="current-details">
              <ATag v-for="detail in schemeState?.current.details || []" :key="`${detail.save_time}-${detail.save_time_unit}-${detail.save_mode}`">
                {{ detail.camera_count }} 个摄像头：{{ detail.label }}
              </ATag>
            </div>
          </div>

          <div class="scheme-heading">
            <div>
              <h3>快速启用留存方案</h3>
              <p>启用方案只会更新留存设置；录像将在定时任务或点击“立即执行留存策略”时清理。</p>
            </div>
            <AButton type="dashed" @click="openCustomScheme">
              <template #icon><PlusOutlined /></template>
              新建自定义方案
            </AButton>
          </div>
          <ASpin :spinning="schemeLoading">
            <div class="scheme-grid">
              <article
                v-for="scheme in schemeState?.schemes || []"
                :key="scheme.id"
                class="scheme-card"
                :class="{ active: schemeState?.current.matched_scheme_id === scheme.id }"
              >
                <div class="scheme-card-head">
                  <div>
                    <ATag v-if="scheme.recommended" color="green">推荐</ATag>
                    <ATag v-else-if="!scheme.builtin" color="purple">自定义</ATag>
                    <ATag v-else>预设</ATag>
                  </div>
                  <APopconfirm v-if="!scheme.builtin" title="确认删除这个自定义方案？" @confirm="removeScheme(scheme)">
                    <AButton type="text" danger size="small">删除</AButton>
                  </APopconfirm>
                </div>
                <h4>{{ scheme.name }}</h4>
                <p>{{ scheme.description }}</p>
                <div class="scheme-rules">
                  <span v-for="(rule, index) in scheme.rules" :key="index">{{ formatSchemeRule(rule) }}</span>
                </div>
                <APopconfirm
                  :title="scheme.warning || `确认将“${scheme.name}”应用到符合条件的摄像头？`"
                  ok-text="确认启用"
                  cancel-text="取消"
                  @confirm="activateScheme(scheme)"
                >
                  <AButton
                    block
                    :type="schemeState?.current.matched_scheme_id === scheme.id ? 'default' : 'primary'"
                    :disabled="schemeState?.current.matched_scheme_id === scheme.id"
                    :loading="applyingSchemeId === scheme.id"
                  >
                    {{ schemeState?.current.matched_scheme_id === scheme.id ? '当前已启用' : '启用此方案' }}
                  </AButton>
                </APopconfirm>
              </article>
            </div>
          </ASpin>
        </section>

        <ATable
          :data-source="filteredPolicies"
          :columns="policyColumns"
          :loading="policyLoading"
          :row-key="(row) => row.id"
          :pagination="{ pageSize: 10, showSizeChanger: false }"
          :scroll="{ x: 980 }"
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
              <ASelect v-model:value="record.save_mode" style="width: 128px">
                <ASelectOption :value="0">到期删除</ASelectOption>
                <ASelectOption :value="1">到期归档</ASelectOption>
              </ASelect>
            </template>
            <template v-else-if="column.key === 'save_time'">
              <div class="duration-editor">
                <AInputNumber v-model:value="record.save_time" :min="0" :max="record.save_time_unit === 'hour' ? 87600 : 3650" :precision="0" />
                <ASelect v-model:value="record.save_time_unit" style="width: 76px">
                  <ASelectOption value="hour">小时</ASelectOption>
                  <ASelectOption value="day">天</ASelectOption>
                </ASelect>
              </div>
              <span v-if="record.save_time === 0" class="forever">永久</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <AButton type="primary" size="small" :loading="savingPolicyId === record.id" @click="savePolicy(record)">
                保存
              </AButton>
              <AButton type="link" size="small" @click="openDeviceHistory(record.device_id)">查看历史</AButton>
            </template>
          </template>
        </ATable>
      </ATabPane>

      <ATabPane key="history" tab="录像历史">
        <div class="history-filters">
          <AInputSearch v-model:value="historyFilters.search" placeholder="搜索录像文件" allow-clear @search="loadHistory(true)" />
          <ASelect
            v-model:value="historyFilters.device_id"
            show-search
            allow-clear
            option-filter-prop="label"
            placeholder="选择摄像头"
            @change="loadHistory(true)"
          >
            <ASelectOption
              v-for="policy in recentPolicies"
              :key="policy.device_id"
              :value="policy.device_id"
              :label="`${policy.device_name} ${policy.device_id}`"
            >
              {{ policy.device_name }}
            </ASelectOption>
          </ASelect>
          <ARangePicker v-model:value="historyRange" show-time @change="loadHistory(true)" />
          <AButton type="primary" @click="loadHistory(true)">查询</AButton>
        </div>

        <ASpin :spinning="historyLoading">
          <div v-if="history.length" class="history-grid">
            <article v-for="item in history" :key="item.id" class="history-card" @click="playHistory(item)">
              <div class="history-preview">
                <VideoCameraOutlined />
                <span class="play-button"><CaretRightFilled /></span>
                <ATag class="source-tag" :color="item.source === 'srs' ? 'cyan' : item.source === 'archive' ? 'orange' : 'purple'">
                  {{ sourceLabel(item.source) }}
                </ATag>
              </div>
              <div class="history-info">
                <b :title="item.filename">{{ item.device_name }}</b>
                <span>{{ formatDateTime(item.event_time) }}</span>
                <span>{{ formatBytes(item.size) }} · {{ item.filename }}</span>
              </div>
            </article>
          </div>
          <AEmpty v-else description="当前筛选条件下暂无录像" />
        </ASpin>
        <div class="history-pagination">
          <span>共 {{ historyTotal }} 段，{{ formatBytes(historyTotalBytes) }}</span>
          <APagination
            v-model:current="historyPage"
            :page-size="historyPageSize"
            :total="historyTotal"
            :show-size-changer="false"
            @change="loadHistory(false)"
          />
        </div>
      </ATabPane>
    </ATabs>

    <HistoryPlayerModal @register="registerPlayerModal" />

    <AModal
      v-model:open="customSchemeOpen"
      title="新建可复用留存方案"
      :confirm-loading="savingCustomScheme"
      ok-text="保存并启用"
      cancel-text="取消"
      @ok="saveCustomScheme"
    >
      <div class="custom-form">
        <label><span>方案名称</span><AInput v-model:value="customSchemeForm.name" :maxlength="100" placeholder="例如：厂区重点摄像头保留 3 天" /></label>
        <label><span>说明（可选）</span><ATextarea v-model:value="customSchemeForm.description" :rows="2" :maxlength="500" placeholder="说明适用场景，方便以后复用" /></label>
        <label>
          <span>应用范围</span>
          <ASelect v-model:value="customSchemeForm.target">
            <ASelectOption value="all">全部摄像头</ASelectOption>
            <ASelectOption value="active">最近活跃的摄像头</ASelectOption>
            <ASelectOption value="inactive">最近不活跃的摄像头</ASelectOption>
            <ASelectOption value="selected">指定摄像头</ASelectOption>
          </ASelect>
        </label>
        <label v-if="customSchemeForm.target === 'active' || customSchemeForm.target === 'inactive'">
          <span>活跃判断窗口</span>
          <div class="inline-field"><AInputNumber v-model:value="customSchemeForm.active_within_hours" :min="1" :max="8760" /><em>小时</em></div>
        </label>
        <label v-if="customSchemeForm.target === 'selected'">
          <span>选择摄像头</span>
          <ASelect v-model:value="customSchemeForm.device_ids" mode="multiple" show-search option-filter-prop="label" placeholder="可选择多个摄像头">
            <ASelectOption v-for="policy in recentPolicies" :key="policy.device_id" :value="policy.device_id" :label="`${policy.device_name} ${policy.device_id}`">
              {{ policy.device_name }}
            </ASelectOption>
          </ASelect>
        </label>
        <label>
          <span>保留时长</span>
          <div class="inline-field">
            <AInputNumber v-model:value="customSchemeForm.value" :min="0" :max="customSchemeForm.unit === 'hour' ? 87600 : 3650" :precision="0" />
            <ASelect v-model:value="customSchemeForm.unit" style="width: 100px"><ASelectOption value="hour">小时</ASelectOption><ASelectOption value="day">天</ASelectOption></ASelect>
          </div>
        </label>
        <label>
          <span>到期处理</span>
          <ASelect v-model:value="customSchemeForm.save_mode"><ASelectOption :value="0">到期删除</ASelectOption><ASelectOption :value="1">到期归档</ASelectOption></ASelect>
        </label>
        <p class="form-tip">0 表示永久保留。保存后方案会出现在上方，可重复启用或删除。</p>
      </div>
    </AModal>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import dayjs from 'dayjs';
import {
  CaretRightFilled, DatabaseOutlined, PlusOutlined, ReloadOutlined, VideoCameraOutlined,
} from '@ant-design/icons-vue';
import {
  Badge as ABadge,
  Button as AButton,
  DatePicker,
  Empty as AEmpty,
  Input as AInput,
  InputNumber as AInputNumber,
  Modal as AModal,
  Pagination as APagination,
  Popconfirm as APopconfirm,
  Progress as AProgress,
  Select as ASelect,
  SelectOption as ASelectOption,
  Spin as ASpin,
  Table as ATable,
  Tabs as ATabs,
  TabPane as ATabPane,
  Tag as ATag,
} from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import { useModal } from '@/components/Modal';
import HistoryPlayerModal from './components/HistoryPlayerModal.vue';
import {
  applyRetentionScheme, createRetentionScheme, deleteRetentionScheme, getRecordingHistory,
  getRetentionPolicies, getRetentionSchemes, getStorageOverview, runRetentionCleanup,
  updateRecordSpace, type RecordingHistory, type RetentionPolicy, type RetentionRule,
  type RetentionScheme, type RetentionSchemeState, type StorageOverview,
} from '@/api/device/record';

defineOptions({ name: 'StorageCenter' });

const { createMessage } = useMessage();
const [registerPlayerModal, { openModal: openPlayerModal }] = useModal();
const AInputSearch = AInput.Search;
const ATextarea = AInput.TextArea;
const ARangePicker = DatePicker.RangePicker;
const activeTab = ref('policy');
const overview = ref<StorageOverview | null>(null);
const policies = ref<RetentionPolicy[]>([]);
const schemeState = ref<RetentionSchemeState | null>(null);
const history = ref<RecordingHistory[]>([]);
const overviewLoading = ref(false);
const policyLoading = ref(false);
const schemeLoading = ref(false);
const historyLoading = ref(false);
const refreshing = ref(false);
const cleaning = ref(false);
const savingPolicyId = ref<number | null>(null);
const applyingSchemeId = ref<string | null>(null);
const customSchemeOpen = ref(false);
const savingCustomScheme = ref(false);
const policyDeviceFilter = ref<string | undefined>();
const historyPage = ref(1);
const historyPageSize = 24;
const historyTotal = ref(0);
const historyTotalBytes = ref(0);
const historyRange = ref<any>(null);
const historyFilters = reactive({ search: '', device_id: undefined as string | undefined });
const customSchemeForm = reactive({
  name: '',
  description: '',
  target: 'all' as RetentionRule['target'],
  active_within_hours: 24,
  device_ids: [] as string[],
  value: 7,
  unit: 'day' as RetentionRule['unit'],
  save_mode: 0 as 0 | 1,
});

const policyColumns = [
  { title: '摄像头', key: 'camera', width: 260 },
  { title: '当前占用', key: 'usage', width: 150 },
  { title: '到期处理', key: 'save_mode', width: 170 },
  { title: '保留时长', key: 'save_time', width: 230 },
  { title: '操作', key: 'action', width: 180 },
];

const filteredPolicies = computed(() => {
  if (!policyDeviceFilter.value) return policies.value;
  return policies.value.filter(item => item.device_id === policyDeviceFilter.value);
});

const recentPolicies = computed(() => [...policies.value].sort((left, right) => {
  const leftTime = left.latest_recording_at ? dayjs(left.latest_recording_at).valueOf() : 0;
  const rightTime = right.latest_recording_at ? dayjs(right.latest_recording_at).valueOf() : 0;
  return rightTime - leftTime || left.device_name.localeCompare(right.device_name, 'zh-CN');
}));

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

function formatRelativeTime(value?: string) {
  if (!value) return '暂无录像';
  const minutes = Math.max(0, dayjs().diff(dayjs(value), 'minute'));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function sourceLabel(source: RecordingHistory['source']) {
  if (source === 'srs') return '连续录像';
  if (source === 'archive') return '归档录像';
  return '平台录像';
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

async function loadSchemes() {
  schemeLoading.value = true;
  try { schemeState.value = await getRetentionSchemes() as RetentionSchemeState; }
  finally { schemeLoading.value = false; }
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
    await Promise.all([loadOverview(), loadPolicies(), loadSchemes()]);
    if (activeTab.value === 'history') await loadHistory(force);
    if (force) createMessage.success('磁盘与录像信息已更新');
  } finally { refreshing.value = false; }
}

async function savePolicy(record: RetentionPolicy | Record<string, any>) {
  savingPolicyId.value = record.id;
  try {
    await updateRecordSpace(record.id, {
      save_mode: record.save_mode,
      save_time: Number(record.save_time || 0),
      save_time_unit: record.save_time_unit || 'day',
    });
    createMessage.success(`${record.device_name} 的留存策略已保存`);
    await loadSchemes();
  } finally { savingPolicyId.value = null; }
}

function targetLabel(target: RetentionRule['target']) {
  return { all: '全部', active: '活跃', inactive: '不活跃', selected: '指定' }[target];
}

function formatSchemeRule(rule: RetentionRule) {
  const duration = rule.value === 0 ? '永久' : `${rule.value} ${rule.unit === 'hour' ? '小时' : '天'}`;
  const action = rule.save_mode === 1 ? '归档' : '删除';
  const activeWindow = rule.target === 'active' || rule.target === 'inactive'
    ? `（${rule.active_within_hours || 24} 小时）`
    : '';
  return `${targetLabel(rule.target)}${activeWindow}：${duration}后${action}`;
}

async function activateScheme(scheme: RetentionScheme) {
  applyingSchemeId.value = scheme.id;
  try {
    const result: any = await applyRetentionScheme(scheme.id);
    createMessage.success(`${scheme.name}已启用，更新 ${result?.updated_count || 0} 个摄像头`);
    await Promise.all([loadPolicies(), loadSchemes()]);
  } finally { applyingSchemeId.value = null; }
}

function openCustomScheme() {
  Object.assign(customSchemeForm, {
    name: '', description: '', target: 'all', active_within_hours: 24,
    device_ids: [], value: 7, unit: 'day', save_mode: 0,
  });
  customSchemeOpen.value = true;
}

async function saveCustomScheme() {
  if (!customSchemeForm.name.trim()) {
    createMessage.warning('请输入方案名称');
    return;
  }
  if (customSchemeForm.target === 'selected' && customSchemeForm.device_ids.length === 0) {
    createMessage.warning('请至少选择一个摄像头');
    return;
  }
  savingCustomScheme.value = true;
  try {
    const scheme = await createRetentionScheme({
      name: customSchemeForm.name.trim(),
      description: customSchemeForm.description.trim(),
      rules: [{
        target: customSchemeForm.target,
        value: Number(customSchemeForm.value || 0),
        unit: customSchemeForm.unit,
        save_mode: customSchemeForm.save_mode,
        active_within_hours: Number(customSchemeForm.active_within_hours || 24),
        device_ids: [...customSchemeForm.device_ids],
      }],
    }) as RetentionScheme;
    await applyRetentionScheme(scheme.id);
    customSchemeOpen.value = false;
    createMessage.success(`自定义方案“${scheme.name}”已保存并启用`);
    await Promise.all([loadPolicies(), loadSchemes()]);
  } finally { savingCustomScheme.value = false; }
}

async function removeScheme(scheme: RetentionScheme) {
  await deleteRetentionScheme(scheme.id);
  createMessage.success(`自定义方案“${scheme.name}”已删除`);
  await loadSchemes();
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
  openPlayerModal(true, {
    url: getPlaybackUrl(item.playback_url || item.url),
    deviceName: item.device_name,
    eventTime: formatDateTime(item.event_time),
    sizeText: formatBytes(item.size),
    sourceText: sourceLabel(item.source),
  });
}

function handleTabChange(key: string) {
  if (key === 'history' && history.value.length === 0) loadHistory(true);
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
.tab-toolbar { gap: 24px; padding: 8px 0 18px; }
.policy-picker { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.policy-picker label { color: #475467; font-weight: 500; white-space: nowrap; }
.camera-select { width: 360px; }
.camera-option { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.camera-option small { color: #98a2b3; }
.camera-cell { display: flex; align-items: center; gap: 10px; }
.camera-cell > span { color: #1677ff; font-size: 18px; }
.camera-cell b, .camera-cell span, .table-sub { display: block; }
.camera-cell span, .table-sub { color: #98a2b3; font-size: 12px; }
.duration-editor, .inline-field { display: flex; align-items: center; gap: 8px; }
.duration-editor :deep(.ant-input-number) { width: 116px; }
.forever { display: inline-block; margin-top: 4px; color: #1677ff; }
.retention-schemes { margin-bottom: 20px; }
.current-scheme { padding: 18px 20px; border: 1px solid #b7d7ff; border-radius: 12px; background: linear-gradient(135deg, #f2f8ff, #fbfdff); }
.current-scheme-title, .scheme-heading, .scheme-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.current-scheme-title > span { color: #475467; font-weight: 600; }
.current-scheme h3, .scheme-heading h3, .scheme-card h4 { margin: 0; color: #182230; }
.current-scheme h3 { margin-top: 8px; font-size: 20px; }
.current-scheme p, .scheme-heading p, .scheme-card p { margin-top: 5px; color: #667085; }
.current-details { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.scheme-heading { margin: 20px 0 12px; }
.scheme-heading p { font-size: 13px; }
.scheme-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; }
.scheme-card { display: flex; flex-direction: column; min-height: 240px; padding: 16px; border: 1px solid #e5eaf1; border-radius: 12px; background: #fff; }
.scheme-card.active { border-color: #52c41a; box-shadow: inset 0 0 0 1px #52c41a; }
.scheme-card h4 { margin-top: 10px; font-size: 16px; }
.scheme-card p { min-height: 42px; font-size: 13px; line-height: 1.6; }
.scheme-rules { display: flex; flex: 1; flex-direction: column; gap: 5px; margin: 10px 0 14px; color: #475467; font-size: 12px; }
.scheme-rules span { padding: 6px 8px; border-radius: 6px; background: #f7f9fc; }
.custom-form { display: grid; gap: 15px; padding-top: 8px; }
.custom-form label { display: grid; gap: 6px; }
.custom-form label > span { color: #344054; font-weight: 500; }
.custom-form .inline-field :deep(.ant-input-number) { flex: 1; }
.custom-form .inline-field em { color: #667085; font-style: normal; }
.form-tip { margin: 0; color: #98a2b3; font-size: 12px; }
.history-filters {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(220px, 300px) minmax(300px, 360px) auto;
  justify-content: initial;
  gap: 12px;
  margin-bottom: 18px;
}
.history-filters > * { width: 100% !important; min-width: 0; }
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
  .usage-summary { grid-template-columns: repeat(2, 1fr); }.history-filters { grid-template-columns: 1fr; }.scan-time { display: none; }
  .policy-picker { width: 100%; align-items: flex-start; flex-direction: column; }
  .camera-select { width: 100%; }
  .scheme-heading { align-items: flex-start; flex-direction: column; }
}
</style>
