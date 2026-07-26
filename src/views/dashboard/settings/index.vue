<template>
  <div class="dashboard-config-page">
    <div class="page-header">
      <div>
        <h2>页面配置</h2>
        <p>配置平台名称、默认语言与 Logo；上传图片保存在浏览器本地。</p>
      </div>
      <div class="actions">
        <button class="secondary-btn" :disabled="saving" @click="handleResetInterface">恢复默认</button>
        <button class="primary-btn" :disabled="saving" @click="handleSaveInterface">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>

    <div class="config-panel section-panel">
      <div class="section-head">
        <div>
          <h3>界面配置</h3>
        </div>
      </div>

      <div class="interface-form">
        <div class="interface-form-row">
          <span class="interface-form-label">平台名称</span>
          <input
            v-model="interfaceForm.platformName"
            class="interface-form-control"
            maxlength="64"
            placeholder="边缘智能算法应用平台"
            type="text"
          />
        </div>

        <div class="interface-form-row">
          <span class="interface-form-label">默认语言</span>
          <select v-model="interfaceForm.defaultLocale" class="interface-form-control interface-form-control--select">
            <option v-for="item in localeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <div class="platform-brand-row">
          <span class="platform-brand-title">平台标识</span>
          <div class="upload-grid upload-grid--compact">
            <div v-for="item in uploadItems" :key="item.field" class="upload-card-wrap">
              <div class="upload-label">{{ item.label }}</div>
              <div class="upload-hint">{{ item.hint }}</div>
              <a-upload
                :accept="item.accept"
                :show-upload-list="false"
                :custom-request="(opt) => handleAssetUpload(opt, item.field)"
              >
                <div class="upload-card" :class="{ 'upload-card--dark': item.darkPreview }">
                  <img
                    v-if="interfaceForm[item.field]"
                    :src="resolvePlatformAssetUrl(interfaceForm[item.field])"
                    alt=""
                    class="upload-preview"
                  />
                  <div v-else class="upload-placeholder">
                    <Icon icon="ant-design:cloud-upload-outlined" :size="24" />
                    <span>点击上传</span>
                  </div>
                </div>
              </a-upload>
              <button
                v-if="interfaceForm[item.field]"
                class="link-btn"
                type="button"
                @click="interfaceForm[item.field] = defaultInterfaceConfig()[item.field]"
              >
                清除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
import { Icon } from '@/components/Icon'
import { useMessage } from '@/hooks/web/useMessage'
import {
  defaultInterfaceConfig,
  loadInterfaceConfig,
  readFileAsDataUrl,
  resolvePlatformAssetUrl,
  type InterfaceConfig,
  type PlatformDisplayLocale,
} from '@/settings/platformConfig'
import { usePlatformConfigStore } from '@/store/modules/platformConfig'

defineOptions({
  name: 'DashboardConfigPage',
})

type AssetField = 'logoColorUrl' | 'logoLightUrl' | 'faviconUrl'

const { createMessage } = useMessage()
const platformConfigStore = usePlatformConfigStore()
const saving = ref(false)

const interfaceForm = reactive<InterfaceConfig>(defaultInterfaceConfig())

const localeOptions: Array<{ label: string, value: PlatformDisplayLocale }> = [
  { label: '简体中文', value: 'zh_CN' },
  { label: '繁體中文', value: 'zh_TW' },
  { label: 'English', value: 'en' },
]

const uploadItems: Array<{
  field: AssetField
  label: string
  hint: string
  accept: string
  darkPreview?: boolean
}> = [
  {
    field: 'logoColorUrl',
    label: '原彩 Logo',
    hint: '浅色菜单/亮色主题，PNG/JPG',
    accept: '.png,.jpg,.jpeg',
  },
  {
    field: 'logoLightUrl',
    label: '浅色 Logo',
    hint: '深色菜单/暗色主题，PNG/JPG',
    accept: '.png,.jpg,.jpeg',
    darkPreview: true,
  },
  {
    field: 'faviconUrl',
    label: 'Favicon',
    hint: '浏览器标签图标，PNG/ICO/JPG',
    accept: '.png,.jpg,.jpeg,.ico',
  },
]

onMounted(() => {
  Object.assign(interfaceForm, loadInterfaceConfig())
})

async function handleAssetUpload(option: UploadRequestOption, field: AssetField) {
  const file = option.file as File
  try {
    interfaceForm[field] = await readFileAsDataUrl(file)
    option.onSuccess?.(interfaceForm[field])
    createMessage.success('已选择图片，请点击保存生效')
  }
  catch (error) {
    option.onError?.(error as Error)
    createMessage.error('读取图片失败')
  }
}

async function handleSaveInterface() {
  saving.value = true
  try {
    platformConfigStore.saveInterfaceConfig({ ...interfaceForm })
    createMessage.success('界面配置已保存，正在刷新…')
    window.location.reload()
  }
  catch {
    createMessage.error('界面配置保存失败')
    saving.value = false
  }
}

async function handleResetInterface() {
  saving.value = true
  try {
    platformConfigStore.resetInterfaceConfig()
    Object.assign(interfaceForm, platformConfigStore.interfaceConfig)
    createMessage.success('界面配置已恢复默认，正在刷新…')
    window.location.reload()
  }
  catch {
    createMessage.error('恢复默认失败')
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.dashboard-config-page {
  padding: 24px;
  min-height: 100%;
  background: #f5f7fb;
}

.page-header,
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-header {
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    color: #1f2937;
  }

  p {
    margin: 8px 0 0;
    color: #64748b;
  }
}

.section-head {
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef2f7;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }
}

.actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.primary-btn,
.secondary-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  background: #fff;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.primary-btn {
  color: #fff;
  background: #1677ff;
  border-color: #1677ff;
}

.config-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.interface-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.interface-form-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid #eef2f7;
}

.interface-form-label {
  width: 88px;
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.interface-form-control {
  flex: 1;
  max-width: 420px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  outline: none;
  background: #fff;
  color: #334155;

  &--select {
    cursor: pointer;
  }
}

.platform-brand-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-top: 18px;
}

.platform-brand-title {
  width: 88px;
  flex-shrink: 0;
  padding-top: 4px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.upload-grid--compact {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: flex-start;
  flex: 1;
  min-width: 0;
}

.upload-grid--compact .upload-card-wrap {
  width: 132px;
  flex: 0 0 auto;
}

.upload-grid--compact .upload-card {
  height: 96px;
}

.upload-grid--compact .upload-placeholder {
  font-size: 12px;
  gap: 6px;
}

.upload-grid--compact .upload-hint {
  font-size: 11px;
  line-height: 1.35;
}

.upload-card-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.upload-label {
  font-weight: 600;
  color: #111827;
  font-size: 13px;
}

.upload-hint {
  font-size: 12px;
  color: #64748b;
  margin-top: -4px;
}

.upload-card {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;

  &:hover {
    border-color: #1677ff;
  }

  &--dark {
    background: #1e293b;
    border-color: #334155;
  }
}

.upload-preview {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
}

.link-btn {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: #1677ff;
  cursor: pointer;
  font-size: 13px;
}
</style>
