<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue'
import {
  QuestionCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue'
import { useMessage } from '@/hooks/web/useMessage'
import {
  type VideoInputProfile,
  getVideoInputProfile,
  getVideoInputProfiles,
  restartVideoInputProfile,
  updateVideoInputProfile,
} from '@/api/device/video_input_processing'

defineOptions({ name: 'CameraInputProcessing' })

const { createMessage } = useMessage()
const loading = ref(false)
const profiles = ref<VideoInputProfile[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = 8
const savingIds = ref<string[]>([])
const restartingIds = ref<string[]>([])
const fpsOptions = [30, 25, 24, 20, 15, 10]
const filters = reactive<{ search: string, enabled?: boolean }>({ search: '', enabled: undefined })

function normalizeResponse(response: any) {
  const payload = response?.data && !Array.isArray(response.data) && response.data.data
    ? response.data
    : response
  return {
    data: Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []),
    total: Number(payload?.total ?? payload?.data?.length ?? 0),
  }
}

async function loadProfiles() {
  loading.value = true
  try {
    const result = normalizeResponse(await getVideoInputProfiles({
      pageNo: pageNo.value,
      pageSize,
      search: filters.search || undefined,
      enabled: filters.enabled,
    }))
    profiles.value = result.data
    total.value = result.total
  }
  catch {
    createMessage.error('获取视频输入处理列表失败')
  }
  finally {
    loading.value = false
  }
}

function search() {
  pageNo.value = 1
  loadProfiles()
}

function reset() {
  filters.search = ''
  filters.enabled = undefined
  search()
}

function setBusy(target: typeof savingIds, id: string, busy: boolean) {
  target.value = busy
    ? [...target.value, id]
    : target.value.filter(item => item !== id)
}

const isSaving = (id: string) => savingIds.value.includes(id)
const isRestarting = (id: string) => restartingIds.value.includes(id)

const delay = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds))

function unwrapProfile(response: any): VideoInputProfile | undefined {
  if (response?.code !== undefined)
    return response.data
  return response?.data ?? response
}

function replaceProfile(profile: VideoInputProfile) {
  const index = profiles.value.findIndex(item => item.device_id === profile.device_id)
  if (index >= 0)
    profiles.value.splice(index, 1, profile)
}

async function waitUntilApplied(deviceId: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const profile = unwrapProfile(await getVideoInputProfile(deviceId))
    if (profile) {
      replaceProfile(profile)
      if (!profile.enabled || ['running', 'passthrough', 'error', 'disabled', 'stopped'].includes(profile.status))
        return profile
    }
    await delay(500)
  }
  return undefined
}

async function save(profile: VideoInputProfile, quiet = false) {
  setBusy(savingIds, profile.device_id, true)
  try {
    await updateVideoInputProfile(profile.device_id, {
      enabled: profile.enabled,
      resolution: profile.resolution,
      max_fps: profile.max_fps,
    })
    const applied = await waitUntilApplied(profile.device_id)
    if (applied?.status === 'error')
      throw new Error(applied.exception_reason || '视频输入处理启动失败')
    if (!applied)
      createMessage.warning('策略已保存，处理进程仍在启动，请稍后刷新确认')
    else if (!quiet)
      createMessage.success(applied.processing_required
        ? `策略已生效，播放与算法将使用${applied.resolution}处理流`
        : '策略已生效，当前输入符合上限，使用原流直通')
  }
  catch {
    createMessage.error('视频输入处理策略保存失败')
    await loadProfiles()
  }
  finally {
    setBusy(savingIds, profile.device_id, false)
  }
}

const toggleProfile = (profile: VideoInputProfile) => save(profile, true)

async function restart(profile: VideoInputProfile) {
  setBusy(restartingIds, profile.device_id, true)
  try {
    await restartVideoInputProfile(profile.device_id)
    const applied = await waitUntilApplied(profile.device_id)
    if (applied?.status === 'error')
      throw new Error(applied.exception_reason || '重新探测失败')
    createMessage.success(applied ? '已重新探测并应用视频输入' : '已重新探测，处理进程仍在启动')
  }
  catch {
    createMessage.error('重新探测失败')
  }
  finally {
    setBusy(restartingIds, profile.device_id, false)
  }
}

function sourceFormat(profile: VideoInputProfile) {
  const size = profile.detected_width && profile.detected_height
    ? `${profile.detected_width}×${profile.detected_height}`
    : '待探测'
  const fps = profile.detected_fps ? ` / ${Number(profile.detected_fps.toFixed(1))} fps` : ''
  return `${size}${fps}`
}

function statusMeta(profile: VideoInputProfile) {
  if (!profile.enabled || profile.status === 'disabled')
    return { text: '已停用', color: 'default' }
  const map: Record<string, { text: string, color: string }> = {
    pending: { text: '待探测', color: 'processing' },
    starting: { text: '启动中', color: 'processing' },
    running: { text: '处理中', color: 'green' },
    passthrough: { text: '原流直通', color: 'blue' },
    error: { text: '异常', color: 'red' },
    stopped: { text: '已停止', color: 'orange' },
  }
  return map[profile.status] || { text: profile.status, color: 'default' }
}

function resourceText(profile: VideoInputProfile) {
  if (!profile.enabled)
    return '模块停用，系统直接使用设备原始输入'
  if (profile.processing_required)
    return `独立低资源进程${profile.process_id ? ` · PID ${profile.process_id}` : ''}`
  return '无需转码，不占用额外处理进程'
}

onMounted(loadProfiles)
</script>

<template>
  <div class="input-processing-page">
    <a-alert class="policy-note" type="info" show-icon>
      <template #message>
        按需处理：只降不升，最高 30 帧
      </template>
      <template #description>
        默认“原视频流输入”为零进程直通。只有输入超过所选清晰度或 30 帧时才启动轻量处理进程；
        低于上限的输入保持原清晰度和原帧率，不补帧、不放大。
      </template>
    </a-alert>

    <div class="query-bar">
      <div class="query-fields">
        <span class="query-label">设备名称</span>
        <a-input
          v-model:value="filters.search"
          class="query-input"
          allow-clear
          placeholder="请输入"
          @press-enter="search"
        />
        <span class="query-label">处理状态</span>
        <a-select v-model:value="filters.enabled" class="query-select" allow-clear placeholder="请选择">
          <a-select-option :value="true">
            已启用
          </a-select-option>
          <a-select-option :value="false">
            已停用
          </a-select-option>
        </a-select>
      </div>
      <div class="query-actions">
        <a-button @click="reset">
          重置
        </a-button>
        <a-button type="primary" @click="search">
          查询
        </a-button>
      </div>
    </div>

    <div class="section-heading">
      <div>
        <h2>视频输入处理</h2>
        <span>每个流媒体设备自动对应一个处理模块</span>
      </div>
      <a-button :loading="loading" @click="loadProfiles">
        <template #icon>
          <ReloadOutlined />
        </template>
        刷新状态
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <a-empty v-if="!profiles.length && !loading" description="暂无流媒体设备" />
      <div v-else class="profile-grid">
        <article v-for="profile in profiles" :key="profile.device_id" class="profile-card">
          <div class="card-head">
            <div class="camera-mark">
              <VideoCameraOutlined />
            </div>
            <div class="device-title">
              <h3 :title="profile.device_name">
                {{ profile.device_name || profile.device_id }}
              </h3>
              <span>{{ [profile.manufacturer, profile.model].filter(Boolean).join(' · ') || '直连设备' }}</span>
            </div>
            <a-tag :color="statusMeta(profile).color">
              {{ statusMeta(profile).text }}
            </a-tag>
          </div>

          <div class="source-summary">
            <div>
              <span>输入探测</span>
              <strong>{{ sourceFormat(profile) }}</strong>
            </div>
            <div>
              <span>当前路径</span>
              <strong :class="{ active: profile.processing_required }">
                {{ profile.processing_required ? '处理后流' : '原流直通' }}
              </strong>
            </div>
          </div>

          <div class="form-row">
            <label>启用模块</label>
            <div class="switch-field">
              <a-switch
                v-model:checked="profile.enabled"
                :loading="isSaving(profile.device_id)"
                @change="toggleProfile(profile)"
              />
              <span>{{ profile.enabled ? '已启用' : '已停用' }}</span>
            </div>
          </div>

          <div class="form-row">
            <label>清晰度策略</label>
            <a-select v-model:value="profile.resolution" :disabled="!profile.enabled">
              <a-select-option value="original">
                原视频流输入
              </a-select-option>
              <a-select-option value="1080p">
                1080p（高负载）
              </a-select-option>
              <a-select-option value="720p">
                720p
              </a-select-option>
              <a-select-option value="540p">
                540p
              </a-select-option>
              <a-select-option value="360p">
                360p
              </a-select-option>
            </a-select>
          </div>

          <div class="form-row">
            <label>
              帧率上限
              <a-tooltip title="只对高于上限的输入降帧，低帧率输入保持不变">
                <QuestionCircleOutlined />
              </a-tooltip>
            </label>
            <a-select v-model:value="profile.max_fps" :disabled="!profile.enabled">
              <a-select-option v-for="fps in fpsOptions" :key="fps" :value="fps">
                {{ fps }} fps
              </a-select-option>
            </a-select>
          </div>

          <div v-if="profile.exception_reason" class="error-text" :title="profile.exception_reason">
            {{ profile.exception_reason }}
          </div>
          <div v-else class="resource-note">
            <ThunderboltOutlined />
            {{ resourceText(profile) }}
          </div>

          <div class="card-actions">
            <a-button
              :disabled="!profile.enabled"
              :loading="isRestarting(profile.device_id)"
              @click="restart(profile)"
            >
              重新探测
            </a-button>
            <a-button
              type="primary"
              :disabled="!profile.enabled"
              :loading="isSaving(profile.device_id)"
              @click="save(profile)"
            >
              应用策略
            </a-button>
          </div>
        </article>
      </div>
    </a-spin>

    <div v-if="total > pageSize" class="pagination">
      <a-pagination
        v-model:current="pageNo"
        :page-size="pageSize"
        :total="total"
        show-less-items
        @change="loadProfiles"
      />
    </div>
  </div>
</template>

<style lang="less" scoped>
.input-processing-page {
  min-height: calc(100vh - 96px);
  padding: 16px 24px 28px;
  background: #f5f7fa;
}

.policy-note {
  margin-bottom: 14px;
  border-radius: 8px;
}

.query-bar,
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: #fff;
}

.query-bar {
  margin-bottom: 14px;
  border-radius: 8px;
}

.query-fields,
.query-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.query-label {
  color: #303133;
}

.query-input,
.query-select {
  width: 230px;
}

.section-heading {
  padding: 12px 4px;
  background: transparent;

  h2 {
    display: inline-block;
    margin: 0 12px 0 0;
    font-size: 20px;
  }

  span {
    color: #8c8c8c;
  }
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(260px, 1fr));
  gap: 18px;
}

.profile-card {
  padding: 18px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #edf0f5;
  border-radius: 12px;
  box-shadow: 0 4px 18px rgb(31 55 88 / 6%);
}

.card-head {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.camera-mark {
  display: grid;
  width: 44px;
  height: 44px;
  margin-right: 11px;
  color: #2f74ff;
  font-size: 22px;
  background: #edf4ff;
  border-radius: 10px;
  place-items: center;
}

.device-title {
  min-width: 0;
  flex: 1;

  h3 {
    margin: 0 0 3px;
    overflow: hidden;
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: #8c8c8c;
    font-size: 12px;
  }
}

.source-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
  margin-bottom: 16px;
  background: #f7f9fc;
  border-radius: 8px;

  div {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  span {
    margin-bottom: 4px;
    color: #8c8c8c;
    font-size: 12px;
  }

  strong {
    overflow: hidden;
    color: #303133;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .active {
    color: #16a66a;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  align-items: center;
  min-height: 42px;

  label {
    color: #5a6070;
  }

  .switch-field {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #8c8c8c;
  }
}

.resource-note,
.error-text {
  height: 34px;
  padding: 8px 10px;
  margin: 10px 0 14px;
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 6px;
}

.resource-note {
  color: #58708f;
  background: #f3f7fc;
}

.error-text {
  color: #d4380d;
  background: #fff2e8;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 22px;
}

@media (max-width: 1500px) {
  .profile-grid {
    grid-template-columns: repeat(3, minmax(260px, 1fr));
  }
}

@media (max-width: 1120px) {
  .profile-grid {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
  }
}

@media (max-width: 760px) {
  .input-processing-page {
    padding: 12px;
  }

  .query-bar,
  .query-fields {
    align-items: stretch;
    flex-direction: column;
  }

  .query-bar {
    gap: 14px;
  }

  .query-input,
  .query-select {
    width: 100%;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
