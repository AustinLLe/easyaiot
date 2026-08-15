<template>
  <BasicModal
    @register="register"
    :title="isEditLayout ? '' : modalTitle"
    @cancel="handleCancel"
    :width="isEditLayout ? 1100 : 720"
    :height="isEditLayout ? undefined : 520"
    :minHeight="isEditLayout ? 0 : 200"
    :centered="isEditLayout"
    :canFullscreen="false"
    :defaultFullscreen="false"
    :showOkBtn="!isEditLayout"
    :showCancelBtn="!isEditLayout"
    :useWrapper="isEditLayout ? false : undefined"
    :wrapClassName="isEditLayout ? 'model-edit-wrap' : 'model-upload-modal'"
    @ok="handleUploadOk"
  >
    <template v-if="!isEditLayout">
      <div class="model-upload-body">
        <Spin :spinning="state.editLoading">
          <ModelBasicInfoSection
            v-model:draft="draft"
            :show-header="false"
            :model-upload-url="uploadConfig.modelUploadUrl"
            :image-upload-url="uploadConfig.imageUploadUrl"
            :headers="uploadConfig.headers"
          />
        </Spin>
      </div>
    </template>

    <template v-else>
      <div class="model-edit-modal">
        <aside class="create-nav">
          <div class="sidebar-header">
            <h2 class="sidebar-title">{{ modalTitle }}</h2>
          </div>
          <div class="settings-nav">
            <div
              v-for="item in sectionList"
              :key="item.key"
              :class="['nav-item', { active: activeSection === item.key }]"
              @click="activeSection = item.key"
            >
              <span class="nav-icon">
                <component :is="item.icon" />
              </span>
              <span class="nav-label">{{ item.label }}</span>
            </div>
          </div>
        </aside>

        <div class="create-main">
          <section class="create-content">
            <Spin :spinning="state.editLoading">
              <component
                :is="currentSectionComponent"
                ref="activeSectionRef"
                v-if="currentSectionComponent"
                v-model:draft="draft"
                :is-view="state.isView"
                v-bind="activeSection === 'basic' ? basicSectionProps : {}"
              />
            </Spin>
          </section>

          <div class="create-footer">
            <a-button
              v-if="!state.isView"
              type="primary"
              :loading="state.editLoading"
              @click="handleEditSave"
            >
              保存
            </a-button>
            <a-button v-else @click="handleCancel">关闭</a-button>
          </div>
        </div>
      </div>
    </template>
  </BasicModal>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, type Component } from 'vue';
import {
  BgColorsOutlined,
  ExperimentOutlined,
  InfoCircleOutlined,
  PartitionOutlined,
} from '@ant-design/icons-vue';
import { Spin } from 'ant-design-vue';
import { BasicModal, useModalInner } from '@/components/Modal';
import { useGlobSetting } from '@/hooks/setting';
import { useMessage } from '@/hooks/web/useMessage';
import { useUserStoreWithOut } from '@/store/modules/user';
import { createModel, updateModel } from '@/api/device/model';
import { clearModelExtensionProfileCache } from '@/views/algorithm-task/utils/paramUtils';
import type { ModelDraft, ModelSectionKey } from '../../modelDraft.types';
import { createDefaultModelDraft, mapRecordToModelDraft, validateDrawObjects } from './useDraft';
import ModelBasicInfoSection from './sections/ModelBasicInfoSection.vue';
import ModelDefaultThresholdSection from './sections/ModelDefaultThresholdSection.vue';
import ModelDrawObjectSection from './sections/ModelDrawObjectSection.vue';
import ModelDefaultDrawStyleSection from './sections/ModelDefaultDrawStyleSection.vue';

defineOptions({ name: 'ModelModal' });

const { createMessage } = useMessage();
const userStore = useUserStoreWithOut();
const { apiUrl } = useGlobSetting();

const uploadConfig = computed(() => {
  const token = userStore.getAccessToken;
  return {
    modelUploadUrl: `${apiUrl}/model/upload`,
    imageUploadUrl: `${apiUrl}/model/image_upload`,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Authorization': `Bearer ${token}`,
    },
  };
});

const state = reactive({
  isEdit: false,
  isView: false,
  editLoading: false,
});

const draft = ref<ModelDraft>(createDefaultModelDraft());
const activeSection = ref<ModelSectionKey>('basic');
const isEditLayout = ref(false);
const activeSectionRef = ref<{
  flushPendingParamsEdit?: () => boolean;
  validateSection?: () => boolean;
} | null>(null);

const sectionList: Array<{
  key: ModelSectionKey;
  label: string;
  icon: Component;
  component: Component;
}> = [
  { key: 'basic', label: '基础信息', icon: InfoCircleOutlined, component: ModelBasicInfoSection },
  { key: 'threshold', label: '默认阈值', icon: ExperimentOutlined, component: ModelDefaultThresholdSection },
  { key: 'draw_object', label: '绘制对象', icon: PartitionOutlined, component: ModelDrawObjectSection },
  { key: 'draw_style', label: '绘制样式', icon: BgColorsOutlined, component: ModelDefaultDrawStyleSection },
];

const currentSectionComponent = computed(() =>
  sectionList.find(item => item.key === activeSection.value)?.component,
);

const basicSectionProps = computed(() => ({
  showHeader: true,
  modelUploadUrl: uploadConfig.value.modelUploadUrl,
  imageUploadUrl: uploadConfig.value.imageUploadUrl,
  headers: uploadConfig.value.headers,
}));

const modalTitle = computed(() => {
  if (state.isView)
    return '查看模型';
  if (state.isEdit)
    return '编辑模型';
  return '上传模型';
});

const emits = defineEmits(['success']);

function resetDraft() {
  draft.value = createDefaultModelDraft();
  activeSection.value = 'basic';
}

const [register, { closeModal }] = useModalInner((data) => {
  const { isEdit = false, isView = false, record } = data ?? {};
  state.isEdit = isEdit;
  state.isView = isView;
  isEditLayout.value = isEdit || isView;

  if (isEdit || isView) {
    state.editLoading = true;
    draft.value = mapRecordToModelDraft(record ?? {});
    activeSection.value = 'basic';
    state.editLoading = false;
  }
  else {
    resetDraft();
  }
});

function handleCancel() {
  resetDraft();
  closeModal();
}

function validateBasicInfo(): string | null {
  if (!draft.value.name?.trim())
    return '请输入模型名称';
  if (!draft.value.version?.trim())
    return '请输入模型版本';
  if (!draft.value.filePath?.trim())
    return '请上传模型文件';
  return null;
}

function buildApiPayload() {
  return {
    id: draft.value.id,
    name: draft.value.name,
    version: draft.value.version,
    description: draft.value.description,
    status: draft.value.status,
    filePath: draft.value.filePath,
    model_format: draft.value.model_format,
    base_model: draft.value.base_model,
    labels: draft.value.class_labels_text,
    imageUrl: draft.value.imageUrl,
    custom_enabled: draft.value.custom_enabled,
    algorithm_params: { ...draft.value.algorithm_params },
    algorithm_param_descriptions: { ...(draft.value.algorithm_param_descriptions ?? {}) },
    detection_config: {
      ...draft.value.detection_config,
      custom_enabled: draft.value.custom_enabled,
    },
    draw_objects: draft.value.draw_objects,
    draw_style: draft.value.draw_style,
  };
}

async function submitModel() {
  const error = validateBasicInfo();
  if (error) {
    createMessage.warning(error);
    if (isEditLayout.value)
      activeSection.value = 'basic';
    return;
  }

  if (activeSection.value === 'threshold') {
    const flushed = activeSectionRef.value?.flushPendingParamsEdit?.() ?? true;
    if (!flushed)
      return;
  }

  if (activeSection.value === 'draw_object') {
    const valid = activeSectionRef.value?.validateSection?.() ?? true;
    if (!valid)
      return;
  }

  const drawObjectError = validateDrawObjects(draft.value.draw_objects.items);
  if (drawObjectError) {
    createMessage.warning(drawObjectError);
    if (isEditLayout.value)
      activeSection.value = 'draw_object';
    return;
  }

  state.editLoading = true;
  const api = draft.value.id ? updateModel : createModel;

  try {
    await api(buildApiPayload());
    if (draft.value.id)
      clearModelExtensionProfileCache(draft.value.id);
    createMessage.success('已保存');
    closeModal();
    resetDraft();
    emits('success');
  }
  catch (err) {
    console.error(err);
  }
  finally {
    state.editLoading = false;
  }
}

function handleUploadOk() {
  submitModel();
}

function handleEditSave() {
  submitModel();
}
</script>

<style lang="less" scoped>
.model-upload-body {
  padding: 4px 8px 8px;
}

.model-edit-modal {
  display: flex;
  overflow: hidden;
  height: 100%;
}

.create-nav {
  display: flex;
  width: 208px;
  flex-shrink: 0;
  flex-direction: column;
  overflow: hidden;
  background: @mix-rail-sidebar-bg;
  border-right: 1px solid @mix-stroke-color;
}

.sidebar-header {
  flex-shrink: 0;
  padding: 16px 14px 12px;
  border-bottom: 1px solid @mix-stroke-color;
}

.sidebar-title {
  margin: 0;
  color: @mix-rail-text;
  font-size: 16px;
  font-weight: 600;
}

.settings-nav {
  flex: 1;
  min-height: 0;
  padding: 8px 8px 12px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  margin-bottom: 2px;
  border-radius: 6px;
  color: @mix-rail-text;
  font-size: 14px;
  line-height: 22px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    background: @mix-highlight-bg;
    color: @mix-rail-text;
  }

  &.active {
    background: @mix-highlight-bg;
    color: @mix-brand-color;
    font-weight: 500;
  }
}

.nav-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 9px;
  color: inherit;
  font-size: 16px;
  line-height: 1;

  :deep(.anticon) {
    font-size: 16px;
  }
}

.nav-label {
  flex: 1;
  line-height: 22px;
}

.create-main {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: #fff;
}

.create-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 24px 0 24px 16px;
  overflow-x: hidden;
  overflow-y: auto;
  background: #fff;
  box-sizing: border-box;
  scrollbar-width: thin;
  scrollbar-color: #c5c5c5 transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #fff;
  }

  &::-webkit-scrollbar-thumb {
    background: #c5c5c5;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }

  :deep(.section-header) {
    h3 {
      margin: 0 0 6px;
      color: rgba(0, 0, 0, 0.9);
      font-size: 20px;
      font-weight: 600;
      line-height: 1.4;
    }

    p {
      margin: 0;
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
      line-height: 1.5;
    }
  }

  :deep(.ant-form-item-label > label) {
    color: rgba(0, 0, 0, 0.9);
    font-size: 15px;
    font-weight: 500;
  }

  :deep(.ant-btn-link) {
    color: @mix-brand-color;

    &:hover,
    &:focus {
      color: #1d4a8f;
    }

    &:disabled,
    &.ant-btn-disabled {
      color: rgba(0, 0, 0, 0.25);
    }

    &.ant-btn-dangerous {
      color: @mix-brand-color;

      &:hover,
      &:focus {
        color: #1d4a8f;
      }
    }
  }
}

.create-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 40px;
  background: #fff;
  border-top: 1px solid @mix-stroke-color;

  :deep(.ant-btn) {
    height: 32px;
    padding: 0 16px;
    font-size: 14px;
  }
}
</style>

<style lang="less">
.model-edit-wrap {
  .ant-modal {
    width: min(90vw, 1100px) !important;
    max-width: 1100px;
    padding-bottom: 0;
  }

  .ant-modal-content {
    height: min(85vh, 750px);
    overflow: hidden;
    padding: 0 !important;
    border-radius: 12px;
  }

  .ant-modal-header {
    position: absolute;
    top: 0;
    right: 0;
    left: auto;
    z-index: 2;
    width: auto;
    padding: 12px 16px;
    background: transparent;
    border-bottom: none;
  }

  .ant-modal-title {
    display: none;
  }

  .ant-modal-body {
    height: 100% !important;
    max-height: none !important;
    padding: 0 !important;
    overflow: hidden !important;

    > .scrollbar,
    > .scroll-container {
      padding: 0 !important;
    }

    .scroll-container,
    .scrollbar__wrap,
    .scrollbar__view {
      height: 100% !important;
      max-height: none !important;
      overflow: hidden !important;
    }

    .scroll-container .scrollbar__wrap {
      margin-bottom: 0 !important;
    }

    .scrollbar__view > div {
      max-height: none !important;
      min-height: 0 !important;
      height: 100% !important;
    }
  }

  .ant-modal-footer {
    display: none;
  }
}
</style>
