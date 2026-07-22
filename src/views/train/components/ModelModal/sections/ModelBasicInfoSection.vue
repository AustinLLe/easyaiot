<template>
  <div class="section-panel">
    <div v-if="showHeader" class="section-header">
      <h3>Basic Info</h3>
      <p>Set the model name, version, format and files.</p>
    </div>

    <Form :labelCol="{ span: 5 }" :wrapperCol="{ span: 19 }" :disabled="isView">
      <FormItem label="Model Name" required>
        <Input v-model:value="draft.name" placeholder="Enter model name" />
      </FormItem>

      <FormItem label="Version" required>
        <Input v-model:value="draft.version" placeholder="e.g. V1.0.0" />
      </FormItem>

      <FormItem label="Description">
        <TextArea v-model:value="draft.description" :rows="4" placeholder="Enter description" />
      </FormItem>

      <FormItem label="Model Format">
        <Select
          v-model:value="draft.model_format"
          :options="formatOptions"
          placeholder="Select format"
        />
      </FormItem>

      <FormItem label="Base Model">
        <Input v-model:value="draft.base_model" placeholder="e.g. yolov8" />
      </FormItem>

      <FormItem label="Class Labels">
        <TextArea
          v-model:value="draft.class_labels_text"
          :rows="4"
          placeholder="One class per line, e.g. 0 person"
          @blur="applyClassLabelsText"
        />
      </FormItem>

      <FormItem label="Status">
        <Select v-model:value="draft.status" :options="statusOptions" />
      </FormItem>

      <FormItem label="Model Image" required>
        <Upload
          name="file"
          :action="imageUploadUrl"
          :headers="headers"
          :showUploadList="false"
          accept=".jpg,.jpeg,.png,.webp"
          :disabled="isView"
          @change="handleImageUpload"
        >
          <a-button type="primary" :disabled="isView">Upload image</a-button>
        </Upload>
        <div v-if="draft.imageUrl" class="image-preview">
          <img :src="draft.imageUrl" alt="model preview" />
        </div>
      </FormItem>

      <FormItem label="Model File">
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
          <a-button type="primary" :disabled="isView">Upload model</a-button>
        </Upload>
        <div v-if="draft.filePath" class="file-path">
          {{ draft.filePath }}
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
  { value: 0, label: 'Draft' },
  { value: 1, label: 'Published' },
  { value: 3, label: 'Offline' },
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
      createMessage.success('Model uploaded');
    }
    else {
      createMessage.error(response?.msg || 'Model upload failed');
    }
  }
  else if (info.file.status === 'error') {
    createMessage.error(info.file.response?.msg || info.file.error?.message || 'Model upload failed');
  }
}

function handleImageUpload(info: { file: { status?: string; response?: UploadResp } }) {
  if (info.file.status === 'done') {
    const response = info.file.response;
    if (response?.code === 0) {
      draft.value.imageUrl = response.data?.url ?? '';
      createMessage.success('Image uploaded');
    }
    else {
      createMessage.error(response?.msg || 'Image upload failed');
    }
  }
  else if (info.file.status === 'error') {
    createMessage.error('Image upload failed');
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
