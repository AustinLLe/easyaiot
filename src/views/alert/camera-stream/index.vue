<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  Button as AButton,
  Card as ACard,
  Divider as ADivider,
  Empty as AEmpty,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Modal as AModal,
  Select as ASelect,
  Spin as ASpin,
  Switch as ASwitch,
  Table as ATable,
  Tag as ATag,
  message,
} from 'ant-design-vue'
import AlertPushFormFields from '@/views/algorithm-task/components/AlertEditors/AlertPushFormFields.vue'
import type { AlertPushDraft } from '@/views/algorithm-task/algorithmTaskDraft.types'
import {
  cloneAlertPush,
  createEmptyAlertPush,
  resolveAlertPushConfigsForSubmit,
  validateAlertPush,
} from '@/views/algorithm-task/utils/alertUtils'
import {
  createCameraStreamAlertRule,
  deleteCameraStreamAlertRule,
  getCameraStreamAlertDevices,
  getCameraStreamAlertEvents,
  getCameraStreamAlertRules,
  testCameraStreamAlertRule,
  updateCameraStreamAlertRule,
} from '@/api/alert/cameraStreamAlert'
import type {
  CameraStreamAlertDevice,
  CameraStreamAlertEvent,
  CameraStreamAlertRule,
  CameraStreamAlertRulePayload,
} from '@/api/alert/cameraStreamAlert'
import { formatToDateTime } from '@/utils/dateUtil'

defineOptions({ name: 'AlertCameraStreamAlert' })

const loading = ref(true)
const saving = ref(false)
const testingId = ref<number>()
const rules = ref<CameraStreamAlertRule[]>([])
const devices = ref<CameraStreamAlertDevice[]>([])
const events = ref<CameraStreamAlertEvent[]>([])
const eventTotal = ref(0)
const eventPage = ref(1)
const eventPageSize = 10
const modalOpen = ref(false)
const editingId = ref<number>()
const form = reactive({
  name: '',
  deviceId: null as string | null,
  enabled: true,
  disconnectSeconds: 30,
  recoveryNotification: true,
  pushConfig: createPush(),
})

const ruleColumns = [
  { title: '规则名称', dataIndex: 'name', key: 'name' },
  { title: '摄像头', dataIndex: 'deviceName', key: 'deviceName' },
  { title: '断流阈值', dataIndex: 'disconnectSeconds', key: 'disconnectSeconds' },
  { title: '状态', dataIndex: 'enabled', key: 'enabled' },
  { title: '通知', dataIndex: 'recoveryNotification', key: 'recoveryNotification' },
  { title: '操作', key: 'actions', width: 260 },
]
const eventColumns = [
  { title: '规则', dataIndex: 'ruleName', key: 'ruleName' },
  { title: '摄像头', dataIndex: 'deviceName', key: 'deviceName' },
  { title: '断流开始', dataIndex: 'disconnectedSince', key: 'disconnectedSince' },
  { title: '告警触发', dataIndex: 'triggeredAt', key: 'triggeredAt' },
  { title: '恢复时间', dataIndex: 'recoveredAt', key: 'recoveredAt' },
  { title: '状态', dataIndex: 'active', key: 'active' },
]
let timer: number | undefined

function createPush(): AlertPushDraft {
  const push = createEmptyAlertPush(0)
  push.push_id = 'camera_stream_alert'
  push.push_name = '摄像头断流告警'
  push.content.title_template = '摄像头断流告警'
  push.content.include_fields = ['camera_name', 'rule_name', 'severity', 'alarm_time', 'detection_summary']
  return push
}

const deviceOptions = computed(() => [
  { label: '全部摄像头', value: 'all' },
  ...devices.value.map(item => ({ label: item.name || item.id, value: item.id })),
])

function resetForm() {
  form.name = ''
  form.deviceId = null
  form.enabled = true
  form.disconnectSeconds = 30
  form.recoveryNotification = true
  form.pushConfig = createPush()
}

function openCreate() {
  editingId.value = undefined
  resetForm()
  modalOpen.value = true
}

function openEdit(record: CameraStreamAlertRule) {
  editingId.value = record.id
  form.name = record.name
  form.deviceId = record.deviceId || null
  form.enabled = record.enabled
  form.disconnectSeconds = record.disconnectSeconds
  form.recoveryNotification = record.recoveryNotification !== false
  form.pushConfig = record.pushConfig && 'push_id' in record.pushConfig
    ? cloneAlertPush(record.pushConfig as AlertPushDraft)
    : createPush()
  modalOpen.value = true
}

function handleDeviceChange(value: string) {
  form.deviceId = value === 'all' ? null : value
}

function buildPayload(): CameraStreamAlertRulePayload | null {
  if (!form.name.trim()) {
    message.warning('请填写断流告警规则名称')
    return null
  }
  if (!Number.isInteger(Number(form.disconnectSeconds)) || form.disconnectSeconds < 5 || form.disconnectSeconds > 86400) {
    message.warning('断流持续阈值必须在 5–86400 秒之间')
    return null
  }
  if (form.enabled) {
    const error = validateAlertPush(form.pushConfig, { requireRules: false })
    if (error) {
      message.warning(error)
      return null
    }
  }
  const push = resolveAlertPushConfigsForSubmit([{
    ...form.pushConfig,
    push_id: 'camera_stream_alert',
    push_name: '摄像头断流告警',
    enabled: true,
    rule_ids: [],
  }])[0]
  return {
    name: form.name.trim(),
    deviceId: form.deviceId,
    enabled: form.enabled,
    disconnectSeconds: Number(form.disconnectSeconds),
    recoveryNotification: form.recoveryNotification,
    pushConfig: push,
  }
}

async function saveRule() {
  const payload = buildPayload()
  if (!payload)
    return
  saving.value = true
  try {
    if (editingId.value)
      await updateCameraStreamAlertRule(editingId.value, payload)
    else
      await createCameraStreamAlertRule(payload)
    message.success('摄像头断流告警规则已保存')
    modalOpen.value = false
    await Promise.all([loadRules(), loadEvents(1)])
  }
  finally {
    saving.value = false
  }
}

async function removeRule(record: CameraStreamAlertRule) {
  AModal.confirm({
    title: '删除摄像头断流告警规则？',
    content: '删除后将停止该规则并保留历史告警记录。',
    okType: 'danger',
    async onOk() {
      await deleteCameraStreamAlertRule(record.id)
      message.success('规则已删除')
      await Promise.all([loadRules(), loadEvents(eventPage.value)])
    },
  })
}

async function sendTest(record: CameraStreamAlertRule) {
  testingId.value = record.id
  try {
    const result = await testCameraStreamAlertRule(record.id)
    message.success(`测试告警已发送：成功 ${result.sent || 0}，跳过 ${result.skipped || 0}`)
  }
  finally {
    testingId.value = undefined
  }
}

async function loadRules() {
  const result = await getCameraStreamAlertRules()
  rules.value = result.list || []
}

async function loadEvents(page = eventPage.value) {
  eventPage.value = page
  const result = await getCameraStreamAlertEvents({ pageNo: page, pageSize: eventPageSize })
  events.value = result.list || []
  eventTotal.value = result.total || 0
}

async function loadPage() {
  const devicePromise = getCameraStreamAlertDevices()
  await Promise.all([loadRules(), loadEvents(1)])
  devices.value = await devicePromise
}

onMounted(async () => {
  try {
    await loadPage()
  }
  finally {
    loading.value = false
  }
  timer = window.setInterval(() => loadEvents(eventPage.value), 10000)
})

onBeforeUnmount(() => {
  if (timer)
    window.clearInterval(timer)
})
</script>

<template>
  <div class="camera-stream-alert-page">
    <a-spin :spinning="loading">
      <a-card class="page-card" :bordered="false">
        <template #title>
          <div class="page-title">
            <div>
              <h2>摄像头断流告警</h2>
              <p>检测 SRS 推流状态，持续断流达到阈值后通过现有告警渠道通知，并在恢复后发送一次恢复通知。</p>
            </div>
            <a-button type="primary" @click="openCreate">
              新增断流告警
            </a-button>
          </div>
        </template>
        <a-table row-key="id" :columns="ruleColumns" :data-source="rules" :pagination="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'disconnectSeconds'">
              {{ record.disconnectSeconds }} 秒
            </template>
            <template v-else-if="column.key === 'enabled'">
              <a-tag :color="record.enabled ? 'success' : 'default'">{{ record.enabled ? '启用' : '停用' }}</a-tag>
            </template>
            <template v-else-if="column.key === 'recoveryNotification'">
              {{ record.recoveryNotification ? '发送恢复告警' : '不发送' }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" size="small" :loading="testingId === record.id" @click="sendTest(record)">测试告警</a-button>
              <a-button type="link" danger size="small" @click="removeRule(record)">删除</a-button>
            </template>
          </template>
        </a-table>
        <a-empty v-if="!rules.length" description="暂无摄像头断流告警规则" />
      </a-card>

      <a-card class="page-card history-card" :bordered="false" title="断流告警历史">
        <a-table
          row-key="id"
          :columns="eventColumns"
          :data-source="events"
          :pagination="{ current: eventPage, pageSize: eventPageSize, total: eventTotal, showSizeChanger: false }"
          @change="(pagination) => loadEvents(pagination.current || 1)"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="['disconnectedSince', 'triggeredAt', 'recoveredAt'].includes(column.key)">
              {{ record[column.key] ? formatToDateTime(record[column.key]) : '--' }}
            </template>
            <template v-else-if="column.key === 'active'">
              <a-tag :color="record.active ? 'error' : 'success'">{{ record.active ? '告警中' : '已恢复' }}</a-tag>
            </template>
          </template>
        </a-table>
      </a-card>
    </a-spin>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑摄像头断流告警' : '新增摄像头断流告警'"
      :confirm-loading="saving"
      width="760px"
      @ok="saveRule"
    >
      <a-form layout="vertical" class="rule-form">
        <a-form-item label="规则名称" required>
          <a-input v-model:value="form.name" :maxlength="120" placeholder="例如：东门摄像头断流告警" />
        </a-form-item>
        <div class="form-row">
          <a-form-item label="监控摄像头" required>
            <a-select
              :value="form.deviceId || 'all'"
              :options="deviceOptions"
              style="width: 100%"
              @change="handleDeviceChange"
            />
          </a-form-item>
          <a-form-item label="断流持续阈值" required>
            <a-input-number v-model:value="form.disconnectSeconds" :min="5" :max="86400" addon-after="秒" style="width: 100%" />
          </a-form-item>
        </div>
        <div class="switch-row">
          <span>启用规则</span>
          <a-switch v-model:checked="form.enabled" checked-children="启用" un-checked-children="停用" />
          <span>恢复通知</span>
          <a-switch v-model:checked="form.recoveryNotification" checked-children="发送" un-checked-children="不发送" />
        </div>
        <a-divider />
        <h3>通知渠道</h3>
        <p class="form-help">复用“告警管理-推送设置”中的地址、用户、邮件、短信、飞书和钉钉配置。</p>
        <AlertPushFormFields
          v-model:push="form.pushConfig"
          task-name="摄像头断流监控"
          :show-rule-select="false"
          :show-push-name="false"
          :show-enabled="false"
        />
      </a-form>
    </a-modal>
  </div>
</template>

<style lang="less" scoped>
.camera-stream-alert-page {
  min-height: 100%;
  padding: 24px;
  background: #f5f7f6;
}

.page-card {
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 5px 18px rgb(24 39 30 / 5%);
}

.page-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;

  h2 {
    margin: 0;
    font-size: 22px;
  }

  p {
    margin: 6px 0 0;
    color: #7a847e;
    font-size: 13px;
    font-weight: 400;
  }
}

.history-card :deep(.ant-card-head-title) {
  font-weight: 700;
}

.rule-form {
  padding-top: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(180px, 0.6fr);
  gap: 16px;
}

.switch-row {
  display: flex;
  gap: 10px;
  align-items: center;
  color: #4b5563;

  > span:nth-of-type(2) {
    margin-left: 20px;
  }
}

.rule-form h3 {
  margin: 0 0 4px;
}

.form-help {
  margin: 0 0 14px;
  color: #7a847e;
}

@media (max-width: 720px) {
  .camera-stream-alert-page {
    padding: 12px;
  }

  .page-title,
  .form-row {
    display: block;
  }

  .page-title .ant-btn {
    margin-top: 14px;
  }
}
</style>
