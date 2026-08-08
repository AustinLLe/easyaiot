<template>
  <div class="section-panel" :class="{ 'section-panel--upload': !showHeader }">
    <div v-if="showHeader" class="section-header">
      <h3>基础信息</h3>
      <p>设置模型名称、版本、格式和文件。</p>
    </div>

    <div v-if="!showHeader" class="upload-tip">
      先上传模型文件，平台会自动识别格式、基础模型和类别标签。
    </div>

    <Form
      :label-col="showHeader ? { span: 5 } : { style: { width: '88px' } }"
      :wrapper-col="showHeader ? { span: 19 } : { style: { flex: '1' } }"
      :disabled="isView"
    >
      <FormItem label="模型文件" required>
        <Upload
          name="file"
          :action="modelUploadUrl"
          :headers="headers"
          :data="modelUploadExtraData"
          :showUploadList="true"
          accept=".pt,.pth,.onnx,.rknn"
          :disabled="isView"
          @change="handleFileUpload"
        >
          <a-button type="primary" :disabled="isView">上传模型</a-button>
        </Upload>
        <div v-if="draft.filePath" class="file-path">
          {{ draft.filePath }}
        </div>
      </FormItem>

      <FormItem label="模型名称" required>
        <Input v-model:value="draft.name" placeholder="请输入模型名称" />
      </FormItem>

      <FormItem label="版本" required>
        <Input v-model:value="draft.version" placeholder="例如：V1.0.0" />
      </FormItem>

      <FormItem label="描述">
        <TextArea v-model:value="draft.description" :rows="4" placeholder="请输入描述" />
      </FormItem>

      <FormItem label="模型格式">
        <template v-if="draft.filePath">
          <Select
            v-model:value="draft.model_format"
            :options="formatOptions"
            :disabled="isView"
            placeholder="上传模型后自动识别"
          />
        </template>
        <div v-else class="auto-detect-placeholder">上传模型后自动显示识别结果</div>
      </FormItem>

      <FormItem label="基础模型">
        <template v-if="draft.filePath">
          <Input
            v-model:value="draft.base_model"
            :disabled="isView"
            placeholder="上传模型后自动识别"
          />
        </template>
        <div v-else class="auto-detect-placeholder">上传模型后自动显示识别结果</div>
      </FormItem>

      <FormItem label="类别标签">
        <template v-if="draft.filePath">
          <TextArea
            v-model:value="draft.class_labels_text"
            :rows="4"
            :disabled="isView"
            placeholder="上传模型后自动识别，必要时可手动修正"
            @blur="applyClassLabelsText"
          />
        </template>
        <div v-else class="auto-detect-placeholder">上传模型后自动显示识别结果</div>
      </FormItem>

      <FormItem label="状态">
        <Select v-model:value="draft.status" :options="statusOptions" />
      </FormItem>

      <FormItem label="模型图片">
        <Upload
          name="file"
          :action="imageUploadUrl"
          :headers="headers"
          :showUploadList="false"
          accept=".jpg,.jpeg,.png,.webp"
          :disabled="isView"
          @change="handleImageUpload"
        >
          <a-button type="primary" :disabled="isView">上传图片</a-button>
        </Upload>
        <div v-if="draft.imageUrl" class="image-preview">
          <img :src="draft.imageUrl" alt="模型预览" />
        </div>
      </FormItem>
    </Form>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { Form, FormItem, Input, Select, Upload } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import type { ModelDraft } from '../../../modelDraft.types';
import {
  applyClassLabelsToDraft,
  applyClassLabelsTextToDraft,
  type ModelClassLabelDraft,
} from '../useDraft';

defineOptions({ name: 'ModelBasicInfoSection' });

const { showHeader = true } = defineProps<{
  isView?: boolean;
  showHeader?: boolean;
  modelUploadUrl: string;
  imageUploadUrl: string;
  headers: Record<string, string>;
}>();

const draft = defineModel<ModelDraft>('draft', { required: true });
const { createMessage } = useMessage();
const TextArea = Input.TextArea;

const formatOptions = [
  { value: 'pt', label: 'PT' },
  { value: 'onnx', label: 'ONNX' },
  { value: 'rknn', label: 'RKNN' },
];

const statusOptions = [
  { value: 0, label: '草稿' },
  { value: 1, label: '已发布' },
  { value: 3, label: '已下线' },
];

type UploadResp = {
  code?: number;
  msg?: string;
  data?: {
    url?: string;
    model_format?: string;
    base_model?: string;
    class_labels?: ModelClassLabelDraft[];
    detection_config?: Record<string, unknown>;
    draw_objects?: Record<string, unknown>;
    draw_style?: Record<string, unknown>;
  };
};

const modelUploadExtraData = computed(() => ({
  name: draft.value.name,
  version: draft.value.version,
  description: draft.value.description,
  model_format: draft.value.model_format,
  base_model: draft.value.base_model,
  labels: draft.value.class_labels_text,
}));

function applyClassLabelsText() {
  applyClassLabelsTextToDraft(draft.value, draft.value.class_labels_text);
}

function handleFileUpload(info: { file: { status?: string; response?: UploadResp; error?: { message?: string } } }) {
  if (info.file.status === 'done') {
    const response = info.file.response;
    if (response?.code === 0) {
      draft.value.filePath = response.data?.url ?? '';
      if (response.data?.model_format)
        draft.value.model_format = response.data.model_format as ModelDraft['model_format'];
      if (response.data?.base_model)
        draft.value.base_model = response.data.base_model;
      if (response.data?.detection_config && typeof response.data.detection_config === 'object') {
        draft.value.detection_config = {
          ...draft.value.detection_config,
          ...response.data.detection_config,
        } as ModelDraft['detection_config'];
      }
      if (response.data?.draw_objects && typeof response.data.draw_objects === 'object') {
        draft.value.draw_objects = response.data.draw_objects as ModelDraft['draw_objects'];
      }
      if (response.data?.draw_style && typeof response.data.draw_style === 'object') {
        draft.value.draw_style = {
          ...draft.value.draw_style,
          ...response.data.draw_style,
        } as ModelDraft['draw_style'];
      }
      if (Array.isArray(response.data?.class_labels))
        applyClassLabelsToDraft(draft.value, response.data.class_labels);
      else if (!response.data?.draw_objects)
        applyClassLabelsToDraft(draft.value, []);
      createMessage.success('模型上传成功');
    }
    else {
      createMessage.error(response?.msg || '模型上传失败');
    }
  }
  else if (info.file.status === 'error') {
    createMessage.error(info.file.response?.msg || info.file.error?.message || '模型上传失败');
  }
}

function handleImageUpload(info: { file: { status?: string; response?: UploadResp } }) {
  if (info.file.status === 'done') {
    const response = info.file.response;
    if (response?.code === 0) {
      draft.value.imageUrl = response.data?.url ?? '';
      createMessage.success('图片上传成功');
    }
    else {
      createMessage.error(response?.msg || '图片上传失败');
    }
  }
  else if (info.file.status === 'error') {
    createMessage.error('图片上传失败');
  }
}
</script>

<style lang="less" scoped>
.section-panel {
  max-width: 760px;
}

.section-panel--upload {
  max-width: 100%;
  margin: 0;
}

.section-header {
  margin-bottom: 20px;

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: rgba(0, 0, 0, 0.45);
  }
}

.upload-tip {
  margin-bottom: 16px;
  padding-left: 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.auto-detect-placeholder {
  min-height: 32px;
  padding: 5px 12px;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.25);
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
}

.image-preview {
  margin-top: 8px;

  img {
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
  }
}

.section-panel--upload .image-preview img {
  max-height: 120px;
}

.file-path {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  word-break: break-all;
}
</style>

<style lang="less">
.model-upload-modal {
  .ant-modal-body > .scrollbar {
    padding-left: 12px;
    padding-right: 16px;
    overflow: hidden;
  }

  .ant-modal-body > .scrollbar > .scrollbar__wrap {
    overflow-x: hidden;
  }
}
</style>
