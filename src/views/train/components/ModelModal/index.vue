<template>
  <BasicModal
    @register="register"
    :title="modalTitle"
    @cancel="handleCancel"
    :width="isEditLayout ? 1200 : 700"
    :canFullscreen="isEditLayout"
    :showOkBtn="!isEditLayout"
    :showCancelBtn="!isEditLayout"
    :useWrapper="isEditLayout ? false : undefined"
    @ok="handleUploadOk"
  >
    <!-- 上传 -->
    <template v-if="!isEditLayout">
      <Spin :spinning="state.editLoading">
        <ModelBasicInfoSection
          v-model:draft="draft"
          :show-header="false"
          :model-upload-url="uploadConfig.modelUploadUrl"
          :image-upload-url="uploadConfig.imageUploadUrl"
          :headers="uploadConfig.headers"
        />
      </Spin>
    </template>

    <!-- 编辑 / 查看 -->
    <template v-else>
      <div class="model-edit-modal">
        <div class="edit-body">
          <aside class="edit-nav">
            <div class="nav-title">配置项</div>
            <div
              v-for="item in sectionList"
              :key="item.key"
              :class="['step-item', { active: activeSection === item.key }]"
              @click="activeSection = item.key"
            >
              <span class="step-icon">
                <component :is="item.icon" />
              </span>
              <span class="step-label">{{ item.label }}</span>
            </div>
          </aside>

          <section class="edit-content">
            <Spin :spinning="state.editLoading">
              <component
                :is="currentSectionComponent"
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
import { BasicModal, useModalInner } from '@/components/Modal';
import { Spin } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import { useUserStoreWithOut } from '@/store/modules/user';
import { useGlobSetting } from '@/hooks/setting';
import { createModel, updateModel } from '@/api/device/model';
import type { ModelDraft, ModelSectionKey } from '../../modelDraft.types';
import { createDefaultModelDraft, mapRecordToModelDraft } from './useDraft';
import { clearModelExtensionProfileCache } from '@/views/algorithm-task/utils/paramUtils';
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

const sectionList: Array<{
  key: ModelSectionKey;
  label: string;
  icon: Component;
  component: Component;
}> = [
  { key: 'basic', label: '基础信息', icon: InfoCircleOutlined, component: ModelBasicInfoSection },
  { key: 'threshold', label: '阈值配置', icon: ExperimentOutlined, component: ModelDefaultThresholdSection },
  { key: 'draw_object', label: '绘制对象管理', icon: PartitionOutlined, component: ModelDrawObjectSection },
  { key: 'draw_style', label: '默认绘制样式', icon: BgColorsOutlined, component: ModelDefaultDrawStyleSection },
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
    return '查看算法';
  if (state.isEdit)
    return '编辑算法';
  return '上传本地算法';
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
    return '请输入算法名称';
  if (!draft.value.version?.trim())
    return '请输入算法版本';
  if (!draft.value.imageUrl?.trim())
    return '请上传算法图片';
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
    imageUrl: draft.value.imageUrl,
    custom_enabled: draft.value.custom_enabled,
    algorithm_params: draft.value.custom_enabled
      ? { ...draft.value.algorithm_params }
      : {},
    algorithm_param_descriptions: draft.value.custom_enabled
      ? { ...draft.value.algorithm_param_descriptions }
      : {},
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

  state.editLoading = true;
  const api = draft.value.id ? updateModel : createModel;

  try {
    await api(buildApiPayload());
    if (draft.value.id)
      clearModelExtensionProfileCache(draft.value.id);
    createMessage.success('操作成功');
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
  letter-spacing: 0.5px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: rgba(0, 0, 0, 0.65);

  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  &.active {
    background: #e6f4ff;
    color: #1677ff;
    font-weight: 600;

    .step-icon {
      border-color: #1677ff;
      background: #1677ff;
      color: #fff;
    }
  }
}

.step-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 1px solid #d9d9d9;
  border-radius: 50%;
  font-size: 14px;
  background: #fff;
}

.step-label {
  flex: 1;
  line-height: 1.4;
  font-size: 13px;
}

.edit-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 16px 20px;
  overflow: auto;
  background: #fff;

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    height: 100%;
    min-height: 0;
  }
}

.edit-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  margin: 4px -12px -12px;
  padding: 4px 12px 0;
}

.footer-actions {
  display: flex;
  gap: 6px;
}
</style>
