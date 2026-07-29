<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/hooks/web/useI18n'
import { useMessage } from '@/hooks/web/useMessage'
import { useLocale } from '@/locales/useLocale'
import {
  defaultInterfaceConfig,
  resolvePlatformAssetUrl,
  type InterfaceConfig,
  type PlatformAsset,
  type PlatformDisplayLocale,
} from '@/settings/platformConfig'
import { usePlatformConfigStore } from '@/store/modules/platformConfig'

defineOptions({
  name: 'DashboardConfigPage',
})

type AssetField = 'logoColorUrl' | 'logoLightUrl' | 'faviconUrl'

const { t } = useI18n('platformConfig')
const { createMessage, createConfirm } = useMessage()
const { changeLocale } = useLocale()
const platformConfigStore = usePlatformConfigStore()
const saving = ref(false)
const uploading = ref(false)
const deletingId = ref('')

const interfaceForm = reactive<InterfaceConfig>(defaultInterfaceConfig())
const customAssets = computed(() => platformConfigStore.customAssets)

const localeOptions: Array<{ label: string, value: PlatformDisplayLocale }> = [
  { label: '简体中文', value: 'zh_CN' },
  { label: 'English', value: 'en' },
]

const roleItems: Array<{
  field: AssetField
  labelKey: string
  hintKey: string
  darkPreview?: boolean
}> = [
  {
    field: 'logoColorUrl',
    labelKey: 'colorLogo',
    hintKey: 'colorLogoHint',
  },
  {
    field: 'logoLightUrl',
    labelKey: 'lightLogo',
    hintKey: 'lightLogoHint',
    darkPreview: true,
  },
  {
    field: 'faviconUrl',
    labelKey: 'favicon',
    hintKey: 'faviconHint',
  },
]

onMounted(async () => {
  Object.assign(interfaceForm, await platformConfigStore.loadInterfaceConfig(true))
})

function isAssetAssigned(asset: PlatformAsset) {
  return roleItems.some(item => interfaceForm[item.field] === asset.url)
}

function assignedRoleLabels(asset: PlatformAsset) {
  return roleItems
    .filter(item => interfaceForm[item.field] === asset.url)
    .map(item => t(item.labelKey))
    .join(' / ')
}

function assignAsset(asset: PlatformAsset, field: AssetField) {
  interfaceForm[field] = asset.url
  createMessage.success(t('assetSelected'))
}

async function handleAssetUpload(option: UploadRequestOption) {
  const file = option.file as File
  uploading.value = true
  try {
    if (file.size > 2 * 1024 * 1024)
      throw new Error(t('fileTooLarge'))
    const asset = await platformConfigStore.uploadAsset(file)
    option.onSuccess?.(asset)
    createMessage.success(t('uploadSuccess'))
  }
  catch (error) {
    option.onError?.(error as Error)
    createMessage.error(error instanceof Error ? error.message : t('uploadFailed'))
  }
  finally {
    uploading.value = false
  }
}

function handleDeleteAsset(asset: PlatformAsset) {
  createConfirm({
    title: t('deleteAssetTitle'),
    iconType: 'warning',
    content: t('deleteAssetConfirm', { name: asset.name }),
    async onOk() {
      deletingId.value = asset.id
      try {
        await platformConfigStore.deleteAsset(asset.id)
        createMessage.success(t('deleteSuccess'))
      }
      catch {
        createMessage.error(t('deleteFailed'))
      }
      finally {
        deletingId.value = ''
      }
    },
  })
}

async function handleSave() {
  saving.value = true
  try {
    await platformConfigStore.saveInterfaceConfig({ ...interfaceForm })
    await changeLocale(interfaceForm.defaultLocale)
    createMessage.success(t('saveSuccess'))
    window.location.reload()
  }
  catch {
    createMessage.error(t('saveFailed'))
    saving.value = false
  }
}

async function handleReset() {
  saving.value = true
  try {
    await platformConfigStore.resetInterfaceConfig()
    Object.assign(interfaceForm, platformConfigStore.interfaceConfig)
    await changeLocale(interfaceForm.defaultLocale)
    createMessage.success(t('resetSuccess'))
    window.location.reload()
  }
  catch {
    createMessage.error(t('resetFailed'))
    saving.value = false
  }
}
</script>

<template>
  <div class="platform-config-page">
    <div class="page-header">
      <div>
        <h2>{{ t('pageTitle') }}</h2>
        <p>{{ t('pageDescription') }}</p>
      </div>
      <div class="actions">
        <button class="secondary-btn" :disabled="saving" @click="handleReset">
          {{ t('resetDefaults') }}
        </button>
        <button class="primary-btn" :disabled="saving" @click="handleSave">
          {{ saving ? t('saving') : t('save') }}
        </button>
      </div>
    </div>

    <div class="config-panel">
      <div class="section-head">
        <div>
          <h3>{{ t('interfaceConfig') }}</h3>
          <p>{{ t('serverOwnedHint') }}</p>
        </div>
        <div class="active-name">
          <span>{{ t('currentPlatformName') }}</span>
          <strong>{{ platformConfigStore.platformName }}</strong>
        </div>
      </div>

      <div class="interface-form">
        <div class="interface-form-row">
          <label class="interface-form-label" for="platform-name">{{ t('platformName') }}</label>
          <div class="control-stack">
            <input
              id="platform-name"
              v-model="interfaceForm.platformName"
              class="interface-form-control"
              maxlength="64"
              :placeholder="t('platformNamePlaceholder')"
              type="text"
            />
            <span class="field-hint">{{ t('platformNameHint') }}</span>
          </div>
        </div>

        <div class="interface-form-row">
          <label class="interface-form-label" for="default-locale">{{ t('defaultLanguage') }}</label>
          <div class="control-stack">
            <select
              id="default-locale"
              v-model="interfaceForm.defaultLocale"
              class="interface-form-control interface-form-control--select"
            >
              <option v-for="item in localeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
            <span class="field-hint">{{ t('languageHint') }}</span>
          </div>
        </div>

        <div class="platform-brand-row">
          <span class="platform-brand-title">{{ t('platformBranding') }}</span>
          <div class="branding-content">
            <div class="branding-grid">
              <div v-for="item in roleItems" :key="item.field" class="role-card-wrap">
                <div class="card-label">{{ t(item.labelKey) }}</div>
                <div class="card-hint">{{ t(item.hintKey) }}</div>
                <div class="preview-card" :class="{ 'preview-card--dark': item.darkPreview }">
                  <img
                    v-if="interfaceForm[item.field]"
                    :src="resolvePlatformAssetUrl(interfaceForm[item.field])"
                    alt=""
                    class="preview-image"
                  />
                  <span v-else class="empty-text">{{ t('notConfigured') }}</span>
                </div>
                <div class="slot-status">
                  <Icon icon="ant-design:check-circle-filled" :size="14" />
                  {{ t('currentSlot') }}
                </div>
              </div>

              <a-upload
                accept=".png,.jpg,.jpeg,.ico"
                :multiple="true"
                :show-upload-list="false"
                :custom-request="handleAssetUpload"
              >
                <div class="upload-library-card">
                  <Icon icon="ant-design:cloud-upload-outlined" :size="28" />
                  <strong>{{ uploading ? t('uploading') : t('uploadCustomImages') }}</strong>
                  <span>{{ t('unlimitedImagesHint') }}</span>
                </div>
              </a-upload>
            </div>

            <div class="asset-library">
              <div class="asset-library-head">
                <strong>{{ t('customImageLibrary') }}</strong>
                <span>{{ t('imageCount', { count: customAssets.length }) }}</span>
              </div>
              <div v-if="customAssets.length" class="asset-grid">
                <div v-for="asset in customAssets" :key="asset.id" class="asset-card">
                  <div class="asset-preview">
                    <img :src="resolvePlatformAssetUrl(asset.url)" :alt="asset.name" />
                  </div>
                  <div class="asset-name" :title="asset.name">{{ asset.name }}</div>
                  <div v-if="isAssetAssigned(asset)" class="assigned-badge">
                    {{ t('inUseAs', { roles: assignedRoleLabels(asset) }) }}
                  </div>
                  <div class="asset-actions">
                    <button
                      v-for="item in roleItems"
                      :key="item.field"
                      type="button"
                      :class="{ active: interfaceForm[item.field] === asset.url }"
                      @click="assignAsset(asset, item.field)"
                    >
                      {{ t('useAs', { role: t(item.labelKey) }) }}
                    </button>
                    <button
                      class="danger"
                      type="button"
                      :disabled="isAssetAssigned(asset) || deletingId === asset.id"
                      @click="handleDeleteAsset(asset)"
                    >
                      {{ t('delete') }}
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="empty-library">
                {{ t('emptyLibrary') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.platform-config-page {
  min-height: 100%;
  padding: 24px;
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
    color: #1f2937;
    font-size: 22px;
    font-weight: 600;
  }

  p {
    margin: 8px 0 0;
    color: #64748b;
  }
}

.actions {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
}

.primary-btn,
.secondary-btn {
  height: 34px;
  padding: 0 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.primary-btn {
  border-color: #1677ff;
  background: #1677ff;
  color: #fff;
}

.config-panel {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.section-head {
  margin-bottom: 4px;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef2f7;

  h3 {
    margin: 0;
    color: #111827;
    font-size: 18px;
    font-weight: 600;
  }

  p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 13px;
  }
}

.active-name {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding: 7px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 7px;
  background: #eff6ff;
  color: #64748b;
  font-size: 12px;

  strong {
    color: #1d4ed8;
    font-size: 14px;
  }
}

.interface-form-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #eef2f7;
}

.interface-form-label,
.platform-brand-title {
  width: 96px;
  flex-shrink: 0;
  padding-top: 7px;
  color: #111827;
  font-size: 15px;
  font-weight: 600;
}

.control-stack {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.interface-form-control {
  width: min(100%, 460px);
  height: 36px;
  padding: 0 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  outline: none;
  background: #fff;
  color: #334155;

  &:focus {
    border-color: #1677ff;
    box-shadow: 0 0 0 2px rgb(22 119 255 / 10%);
  }

  &--select {
    cursor: pointer;
  }
}

.field-hint,
.card-hint {
  color: #64748b;
  font-size: 12px;
}

.platform-brand-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-top: 20px;
}

.branding-content {
  min-width: 0;
  flex: 1;
}

.branding-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 16px;
}

.role-card-wrap {
  min-width: 0;
}

.card-label {
  margin-bottom: 3px;
  color: #111827;
  font-size: 14px;
  font-weight: 600;
}

.card-hint {
  min-height: 34px;
  line-height: 1.4;
}

.preview-card,
.upload-library-card {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 126px;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid #dbe3ef;
  border-radius: 9px;
  background: #f8fafc;
}

.preview-card--dark {
  border-color: #334155;
  background: #1e293b;
}

.preview-image {
  max-width: 88%;
  max-height: 88%;
  object-fit: contain;
}

.empty-text {
  color: #94a3b8;
  font-size: 12px;
}

.slot-status {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 7px;
  color: #16a34a;
  font-size: 12px;
}

.upload-library-card {
  height: 181px;
  margin-top: 0;
  flex-direction: column;
  gap: 8px;
  border: 1px dashed #60a5fa;
  background: #eff6ff;
  color: #1677ff;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    border-color: #1677ff;
    background: #dbeafe;
  }

  span {
    padding: 0 14px;
    color: #64748b;
    font-size: 12px;
    text-align: center;
  }
}

.asset-library {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #eef2f7;
}

.asset-library-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #111827;

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}

.asset-card {
  min-width: 0;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

.asset-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92px;
  overflow: hidden;
  border-radius: 6px;
  background: linear-gradient(45deg, #f1f5f9 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(-45deg, #f1f5f9 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(45deg, transparent 75%, #f1f5f9 75%) 0 0 / 16px 16px,
    linear-gradient(-45deg, transparent 75%, #f1f5f9 75%) 0 0 / 16px 16px;

  img {
    max-width: 90%;
    max-height: 86px;
    object-fit: contain;
  }
}

.asset-name {
  margin-top: 8px;
  overflow: hidden;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assigned-badge {
  margin-top: 5px;
  color: #16a34a;
  font-size: 11px;
}

.asset-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;

  button {
    padding: 3px 7px;
    border: 1px solid #bfdbfe;
    border-radius: 4px;
    background: #eff6ff;
    color: #2563eb;
    cursor: pointer;
    font-size: 11px;

    &.active {
      border-color: #16a34a;
      background: #f0fdf4;
      color: #15803d;
    }

    &.danger {
      border-color: #fecaca;
      background: #fff;
      color: #dc2626;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
  }
}

.empty-library {
  padding: 24px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #94a3b8;
  text-align: center;
}

@media (max-width: 1100px) {
  .branding-grid {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }
}

@media (max-width: 640px) {
  .platform-config-page {
    padding: 12px;
  }

  .page-header,
  .section-head,
  .platform-brand-row {
    flex-direction: column;
  }

  .active-name {
    align-items: flex-start;
  }

  .branding-grid {
    grid-template-columns: 1fr;
  }
}
</style>
