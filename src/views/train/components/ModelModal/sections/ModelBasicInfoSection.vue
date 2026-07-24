<template>
  <div class="section-panel">
    <div v-if="showHeader" class="section-header">
      <h3>基础信息</h3>
      <p>设置模型名称、版本、格式和文件�?/p>
    </div>

    <div class="upload-tip">
      先上传模型文件，平台会自动识别格式、基础模型和类别标签�?    </div>

    <Form :labelCol="{ span: 5 }" :wrapperCol="{ span: 19 }" :disabled="isView">
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
        <Input v-model:value="draft.name" placeholder="请输入模型名�? />
      </FormItem>

      <FormItem label="版本" required>
        <Input v-model:value="draft.version" placeholder="例如：V1.0.0" />
      </FormItem>

      <FormItem label="描述">
        <TextArea v-model:value="draft.description" :rows="4" placeholder="请输入描�? />
      </FormItem>

      <FormItem label="模型格式">
        <template v-if="draft.filePath">
          <Select
            v-model:value="draft.model_format"
            :options="formatOptions"
            :disabled="isView"
            placeholder="上传模型后自动识�?
          />
        </template>
        <div v-else class="auto-detect-placeholder">上传模型后自动显示识别结�?/div>
      </FormItem>

      <FormItem label="基础模型">
        <template v-if="draft.filePath">
          <Input
            v-model:value="draft.base_model"
            :disabled="isView"
            placeholder="上传模型后自动识�?
          />
        </template>
        <div v-else class="auto-detect-placeholder">上传模型后自动显示识别结�?/div>
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
        <div v-else class="auto-detect-placeholder">上传模型后自动显示识别结�?/div>
      </FormItem>

      <FormItem label="状�?>
        <Select v-model:value="draft.status" :options="statusOptions" />
      </FormItem>

      <FormItem label="模型图片" required>
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

defineOptions({ name: 'ModelBasicInfoSection' });

defineProps<{
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
  { value: 1, label: '已发�? },
  { value: 3, label: '已下�? },
];

type UploadResp = {
  code?: number;
  msg?: string;
  data?: {
    url?: string;
    model_format?: string;
    base_model?: string;
    class_labels?: ClassLabel[];
    detection_config?: Record<string, unknown>;
    draw_objects?: Record<string, unknown>;
  };
};

type ClassLabel = {
  class_key?: string;
  classKey?: string;
  label?: string;
  name?: string;
};

const modelUploadExtraData = computed(() => ({
  name: draft.value.name,
  version: draft.value.version,
  description: draft.value.description,
  model_format: draft.value.model_format,
  base_model: draft.value.base_model,
  labels: draft.value.class_labels_text,
}));

function classLabelsToText(labels?: ClassLabel[]): string {
  if (!Array.isArray(labels))
    return '';
  return labels
    .map(item => `${String(item.class_key ?? item.classKey ?? '').trim()} ${String(item.label ?? item.name ?? '').trim()}`.trim())
    .filter(Boolean)
    .join('\n');
}

function parseClassLabelsText(text: string): ClassLabel[] {
  return text
    .split(/[\r\n,;]+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^(\d+|[A-Za-z_][\w.-]*)\s*[:=\s]\s*(.+)$/);
      if (match)
        return { class_key: match[1], label: match[2].trim() };
      return { class_key: String(index), label: line };
    });
}

function applyClassLabelsText() {
  const labels = parseClassLabelsText(draft.value.class_labels_text);
  if (!labels.length)
    return;
  draft.value.draw_objects = {
    ...draft.value.draw_objects,
    items: labels.map((item, index) => {
      const classKey = String(item.class_key ?? '').trim();
      const existing = draft.value.draw_objects.items.find(row => row.class_key === classKey);
      return {
        id: existing?.id ?? String(index + 1),
        class_key: classKey,
        label: String(item.label ?? '').trim(),
        color: existing?.color ?? ['#ff4d4f', '#1677ff', '#52c41a', '#faad14', '#722ed1'][index % 5],
        enabled: existing?.enabled ?? true,
        preview_regions: existing?.preview_regions,
        preview_bbox: existing?.preview_bbox,
        title_bbox: existing?.title_bbox,
      };
    }),
  };
  draft.value.detection_config.class_whitelist = draft.value.draw_objects.items
    .filter(item => item.enabled && item.class_key.trim())
    .map(item => item.class_key.trim());
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
      const labelsText = classLabelsToText(response.data?.class_labels);
      if (labelsText)
        draft.value.class_labels_text = labelsText;
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

.file-path {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  word-break: break-all;
}
</style>
