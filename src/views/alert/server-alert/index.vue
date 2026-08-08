<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import AlertPushFormFields from '@/views/algorithm-task/components/AlertEditors/AlertPushFormFields.vue'
import type { AlertPushDraft } from '@/views/algorithm-task/algorithmTaskDraft.types'
import {
  cloneAlertPush,
  createEmptyAlertPush,
  resolveAlertPushConfigsForSubmit,
  validateAlertPush,
} from '@/views/algorithm-task/utils/alertUtils'
import {
  getServerAlertConfig,
  getServerAlertEvents,
  getServerAlertStatus,
  testServerAlertNotification,
  updateServerAlertConfig,
} from '@/api/alert/serverAlert'
import type {
  ServerAlertConfig,
  ServerAlertEvent,
  ServerAlertMetricConfig,
  ServerAlertMetricKey,
  ServerAlertStatus,
} from '@/api/alert/serverAlert'
import { formatToDateTime } from '@/utils/dateUtil'

defineOptions({ name: 'AlertServerAlert' })

const METRICS: Array<{ key: ServerAlertMetricKey, title: string, description: string }> = [
  { key: 'cpu', title: 'CPU', description: '服务器 CPU 使用率' },
  { key: 'memory', title: '内存', description: '服务器物理内存使用率' },
  { key: 'rootDisk', title: '系统盘 /', description: '系统根分区使用率' },
  { key: 'dataDisk', title: '业务数据盘', description: '/srv/easyaiot-data 使用率' },
]

function defaultMetrics(): Record<ServerAlertMetricKey, ServerAlertMetricConfig> {
  return {
    cpu: { enabled: true, threshold: 85 },
    memory: { enabled: true, threshold: 85 },
    rootDisk: { enabled: true, threshold: 90 },
    dataDisk: { enabled: true, threshold: 90 },
  }
}

function createServerPush(): AlertPushDraft {
  const push = createEmptyAlertPush(0)
  push.push_id = 'server_hardware_alert'
  push.push_name = '服务器硬件告警'
  push.content.title_template = '服务器资源告警'
  push.content.include_fields = ['rule_name', 'severity', 'alarm_time', 'detection_summary']
  return push
}

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const enabled = ref(false)
const repeatIntervalMinutes = ref(30)
const recoveryNotification = ref(true)
const metrics = reactive(defaultMetrics())
const pushConfig = ref<AlertPushDraft>(createServerPush())
const status = ref<ServerAlertStatus>()
const statusFailed = ref(false)
const events = ref<ServerAlertEvent[]>([])
const eventTotal = ref(0)
const eventPage = ref(1)
const eventPageSize = 10
let timer: number | undefined
let statusInFlight = false

const metricCards = computed(() => METRICS.map((definition) => {
  const current = status.value?.metrics?.[definition.key]
  return {
    ...definition,
    percent: current?.percent ?? 0,
    alarming: current?.alarming ?? false,
    config: metrics[definition.key],
  }
}))

function ringColor(percent: number, alarming: boolean) {
  if (alarming)
    return '#ef4444'
  if (percent >= 75)
    return '#f59e0b'
  return '#16a34a'
}

function applyConfig(config: ServerAlertConfig) {
  enabled.value = config.enabled
  repeatIntervalMinutes.value = config.repeatIntervalMinutes || 30
  recoveryNotification.value = config.recoveryNotification !== false
  for (const item of METRICS) {
    const incoming = config.metrics?.[item.key]
    metrics[item.key].enabled = incoming?.enabled !== false
    metrics[item.key].threshold = Number(incoming?.threshold ?? defaultMetrics()[item.key].threshold)
  }
  const incomingPush = config.pushConfig as Partial<AlertPushDraft>
  pushConfig.value = incomingPush?.push_id
    ? cloneAlertPush(incomingPush as AlertPushDraft)
    : createServerPush()
  pushConfig.value.push_id = 'server_hardware_alert'
  pushConfig.value.push_name = '服务器硬件告警'
}

async function loadConfig() {
  applyConfig(await getServerAlertConfig())
}

async function refreshStatus() {
  if (statusInFlight || document.hidden)
    return
  statusInFlight = true
  try {
    status.value = await getServerAlertStatus()
    statusFailed.value = false
  }
  catch {
    statusFailed.value = true
  }
  finally {
    statusInFlight = false
  }
}

async function loadEvents(page = eventPage.value) {
  eventPage.value = page
  const result = await getServerAlertEvents({ pageNo: page, pageSize: eventPageSize })
  events.value = result.list || []
  eventTotal.value = result.total || 0
}

function buildPayload(): ServerAlertConfig | null {
  for (const item of METRICS) {
    const threshold = Number(metrics[item.key].threshold)
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100) {
      message.warning(`${item.title} 阈值必须在 1–100% 之间`)
      return null
    }
  }
  if (enabled.value) {
    const error = validateAlertPush(pushConfig.value, { requireRules: false })
    if (error) {
      message.warning(error)
      return null
    }
  }
  const resolved = resolveAlertPushConfigsForSubmit([{
    ...pushConfig.value,
    push_id: 'server_hardware_alert',
    push_name: '服务器硬件告警',
    enabled: true,
    rule_ids: [],
  }])[0]
  return {
    enabled: enabled.value,
    metrics: JSON.parse(JSON.stringify(metrics)),
    pushConfig: resolved,
    repeatIntervalMinutes: repeatIntervalMinutes.value,
    recoveryNotification: recoveryNotification.value,
  }
}

async function saveConfig(showSuccess = true) {
  const payload = buildPayload()
  if (!payload)
    return false
  saving.value = true
  try {
    applyConfig(await updateServerAlertConfig(payload))
    if (showSuccess)
      message.success('服务器告警配置已保存')
    await refreshStatus()
    return true
  }
  finally {
    saving.value = false
  }
}

async function sendTest() {
  const error = validateAlertPush(pushConfig.value, { requireRules: false })
  if (error) {
    message.warning(error)
    return
  }
  if (!(await saveConfig(false)))
    return
  testing.value = true
  try {
    const result = await testServerAlertNotification()
    message.success(`测试告警已发送：成功 ${result.sent}，跳过 ${result.skipped}`)
  }
  finally {
    testing.value = false
  }
}

function handleVisibilityChange() {
  if (!document.hidden)
    refreshStatus()
}

onMounted(async () => {
  try {
    await Promise.all([loadConfig(), refreshStatus(), loadEvents(1)])
  }
  finally {
    loading.value = false
  }
  timer = window.setInterval(refreshStatus, 5000)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  if (timer)
    window.clearInterval(timer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="server-alert-page">
    <div class="page-heading">
      <div>
        <h2>服务器告警</h2>
        <p>监控服务器硬件资源，达到阈值后通过现有告警渠道通知开发者。</p>
      </div>
      <div class="live-state" :class="{ offline: statusFailed }">
        <span class="live-dot" />
        {{ statusFailed ? '状态更新中断，正在重试' : '每 5 秒刷新状态' }}
      </div>
    </div>

    <a-spin :spinning="loading">
      <section class="panel">
        <div class="panel-title-row">
          <div>
            <h3>硬件资源阈值</h3>
            <p>每项资源可独立启用；后台每 10 秒真实检测一次。</p>
          </div>
          <div class="master-switch">
            <span>启用服务器告警</span>
            <a-switch v-model:checked="enabled" checked-children="启用" un-checked-children="停用" />
          </div>
        </div>

        <div class="metric-grid">
          <article
            v-for="card in metricCards"
            :key="card.key"
            class="metric-card"
            :class="{ alarming: card.alarming, disabled: !card.config.enabled }"
          >
            <div class="metric-card-head">
              <div>
                <strong>{{ card.title }}</strong>
                <small>{{ card.description }}</small>
              </div>
              <a-switch v-model:checked="card.config.enabled" size="small" />
            </div>
            <div class="metric-main">
              <div class="progress-ring" :aria-label="`${card.title} ${Math.round(card.percent)}%`">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle class="ring-track" cx="60" cy="60" r="52" />
                  <circle
                    class="ring-progress"
                    cx="60"
                    cy="60"
                    r="52"
                    :stroke="ringColor(card.percent, card.alarming)"
                    :stroke-dashoffset="326.73 * (1 - card.percent / 100)"
                  />
                </svg>
                <div class="ring-label">
                  <b>{{ Math.round(card.percent) }}</b><span>%</span>
                </div>
              </div>
              <div class="threshold-editor">
                <span>告警阈值</span>
                <a-input-number
                  v-model:value="card.config.threshold"
                  :min="1"
                  :max="100"
                  :precision="0"
                  addon-after="%"
                  :disabled="!card.config.enabled"
                />
                <a-tag v-if="card.alarming" color="error">
                  正在告警
                </a-tag>
                <a-tag v-else color="success">
                  正常
                </a-tag>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div class="settings-grid">
        <section class="panel">
          <h3>告警策略</h3>
          <a-form layout="vertical">
            <a-form-item label="重复提醒间隔">
              <a-input-number
                v-model:value="repeatIntervalMinutes"
                :min="1"
                :max="1440"
                addon-after="分钟"
                style="width: 220px"
              />
              <div class="form-help">
                资源持续超限时按此间隔再次通知，避免消息轰炸。
              </div>
            </a-form-item>
            <a-form-item label="恢复通知">
              <a-switch v-model:checked="recoveryNotification" />
              <span class="inline-help">资源回落到阈值以下 3 个百分点时发送恢复消息</span>
            </a-form-item>
          </a-form>
        </section>

        <section class="panel notification-panel">
          <h3>通知开发者</h3>
          <p class="section-description">
            复用算法任务告警推送：可按系统用户选择邮件、短信、微信、飞书、钉钉，也可直接选择“推送设置”中的现有地址。
          </p>
          <AlertPushFormFields
            v-model:push="pushConfig"
            task-name="服务器硬件监控"
            :show-rule-select="false"
            :show-push-name="false"
            :show-enabled="false"
          />
        </section>
      </div>

      <section class="panel history-panel">
        <div class="panel-title-row">
          <div>
            <h3>服务器告警记录</h3>
            <p>保留超限、持续状态、通知结果与恢复时间。</p>
          </div>
        </div>
        <a-table
          row-key="id"
          :data-source="events"
          :pagination="{
            current: eventPage,
            pageSize: eventPageSize,
            total: eventTotal,
            showSizeChanger: false,
          }"
          @change="(pagination) => loadEvents(pagination.current || 1)"
        >
          <a-table-column title="资源" data-index="metricName" />
          <a-table-column title="触发值">
            <template #default="{ record }">
              {{ record.triggerValue.toFixed(1) }}%
            </template>
          </a-table-column>
          <a-table-column title="阈值">
            <template #default="{ record }">
              {{ record.threshold.toFixed(1) }}%
            </template>
          </a-table-column>
          <a-table-column title="状态">
            <template #default="{ record }">
              <a-tag :color="record.active ? 'error' : 'success'">
                {{ record.active ? '告警中' : '已恢复' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="通知结果">
            <template #default="{ record }">
              成功 {{ record.notificationResult?.sent || 0 }} / 失败 {{ record.notificationResult?.failed || 0 }}
            </template>
          </a-table-column>
          <a-table-column title="触发时间">
            <template #default="{ record }">
              {{ formatToDateTime(record.triggeredAt) }}
            </template>
          </a-table-column>
          <a-table-column title="恢复时间">
            <template #default="{ record }">
              {{ record.recoveredAt ? formatToDateTime(record.recoveredAt) : '--' }}
            </template>
          </a-table-column>
        </a-table>
      </section>

      <div class="action-bar">
        <a-button :loading="testing" @click="sendTest">
          发送测试告警
        </a-button>
        <a-button type="primary" :loading="saving" @click="saveConfig()">
          保存配置
        </a-button>
      </div>
    </a-spin>
  </div>
</template>

<style lang="less" scoped>
.server-alert-page {
  min-height: 100%;
  padding: 24px;
  background: #f5f7f6;
}

.page-heading,
.panel-title-row,
.metric-card-head,
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-heading {
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
  }

  p {
    margin: 5px 0 0;
    color: #7a847e;
  }
}

.live-state {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
  color: #168a43;

  &.offline {
    color: #d97706;
  }
}

.live-dot {
  width: 9px;
  height: 9px;
  background: currentcolor;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(22 163 74 / 12%);
}

.panel {
  padding: 22px;
  background: #fff;
  border: 1px solid #e9eeeb;
  border-radius: 12px;
  box-shadow: 0 5px 18px rgb(24 39 30 / 5%);

  h3 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #7a847e;
  }
}

.master-switch {
  display: flex;
  gap: 12px;
  align-items: center;
  font-weight: 600;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.metric-card {
  padding: 18px;
  border: 1px solid #edf1ee;
  border-radius: 10px;
  transition: border-color 0.2s, opacity 0.2s;

  &.alarming {
    background: #fffafa;
    border-color: #fca5a5;
  }

  &.disabled {
    opacity: 0.62;
  }
}

.metric-card-head {
  strong {
    display: block;
    font-size: 16px;
  }

  small {
    display: block;
    margin-top: 3px;
    color: #8a938d;
  }
}

.metric-main {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-top: 18px;
}

.progress-ring {
  position: relative;
  flex: 0 0 112px;
  width: 112px;
  height: 112px;

  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
}

.ring-track,
.ring-progress {
  fill: none;
  stroke-width: 9;
}

.ring-track {
  stroke: #edf0ee;
}

.ring-progress {
  stroke-dasharray: 326.73;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease, stroke 0.2s;
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #26312a;

  b {
    font-size: 30px;
  }

  span {
    margin-left: 2px;
    font-size: 13px;
  }
}

.threshold-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  > span {
    font-size: 13px;
    color: #6b756f;
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.7fr) minmax(520px, 1.3fr);
  gap: 16px;
  margin-top: 16px;
}

.section-description {
  margin-bottom: 18px !important;
}

.form-help {
  margin-top: 7px;
  font-size: 12px;
  color: #8a938d;
}

.inline-help {
  margin-left: 10px;
  color: #7a847e;
}

.history-panel {
  margin-top: 16px;
}

.action-bar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  gap: 10px;
  justify-content: flex-end;
  padding: 14px 24px;
  margin: 16px -24px -24px;
  background: rgb(255 255 255 / 94%);
  backdrop-filter: blur(8px);
  border-top: 1px solid #e7ebe8;
}

@media (max-width: 1400px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(240px, 1fr));
  }
}

@media (max-width: 900px) {
  .settings-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .page-heading,
  .panel-title-row {
    gap: 12px;
    align-items: flex-start;
  }

  .page-heading {
    flex-direction: column;
  }
}
</style>
