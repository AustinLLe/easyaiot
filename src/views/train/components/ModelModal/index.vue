<template>
  <BasicModal
    @register="register"
    :title="modalTitle"
    @cancel="handleCancel"
    :width="isEditLayout ? 1200 : 720"
    :height="isEditLayout ? undefined : 520"
    :minHeight="isEditLayout ? 600 : 200"
    :canFullscreen="isEditLayout"
    :showOkBtn="!isEditLayout"
    :showCancelBtn="!isEditLayout"
    :useWrapper="isEditLayout ? false : undefined"
    :wrapClassName="isEditLayout ? undefined : 'model-upload-modal'"
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
        <div class="edit-body">
          <aside class="edit-nav">
            <div class="nav-title">配置项</div>
            <button
              v-for="item in sectionList"
              :key="item.key"
              type="button"
              :class="['step-item', { active: activeSection === item.key }]"
              @click="activeSection = item.key"
            >
              <span class="step-icon">
                <component :is="item.icon" />
              </span>
              <span class="step-label">{{ item.label }}</span>
            </button>
          </aside>

          <section class="edit-content">
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
        </div>

        <div class="edit-footer">
          <a-button type="link" size="small" @click="handleCancel">取消</a-button>
          <div class="footer-actions">
            <a-button
              v-if="!state.isView"
              size="small"
              type="primary"
              :loading="state.editLoading"
              @click="handleEditSave"
            >
              保存
            </a-button>
            <a-button v-else size="small" @click="handleCancel">关闭</a-button>
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
  flex-direction: column;
  height: 560px;
  max-height: calc(100vh - 120px);
}

.edit-body {
  display: flex;
  flex: 1;
  min-height: 0;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.edit-nav {
  width: 200px;
  flex-shrink: 0;
  padding: 16px 10px;
  background: #fafafa;
  border-right: 1px solid #f0f0f0;
}

.nav-title {
  margin-bottom: 12px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.45);
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.65);
  text-align: left;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &.active {
    background: #e6f4ff;
    color: #1677ff;
    font-weight: 600;
  }
}

.step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid #d9d9d9;
  border-radius: 50%;
}

.edit-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 20px;
  overflow: auto;
  background: #fff;
}

.edit-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.footer-actions {
  display: flex;
  gap: 8px;
}
</style>
