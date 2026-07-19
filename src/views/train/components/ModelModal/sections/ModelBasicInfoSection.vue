<template>
  <div class="section-panel">
    <div v-if="showHeader" class="section-header">
      <h3>基础信息</h3>
      <p>配置算法名称、版本、描述及算法文件。</p>
    </div>
    <Form
      :labelCol="{ span: 4 }"
      :wrapperCol="{ span: 20 }"
      :disabled="isView"
    >
      <FormItem label="算法名称" required>
        <Input v-model:value="draft.name" placeholder="请输入算法名称" />
      </FormItem>
      <FormItem label="算法版本" required>
        <Input v-model:value="draft.version" placeholder="请输入算法版本（例如：1.0.0）" />
      </FormItem>
      <FormItem label="算法描述">
        <TextArea v-model:value="draft.description" placeholder="请输入算法描述" :rows="4" />
      </FormItem>
      <FormItem label="状态">
        <Select
          v-model:value="draft.status"
          placeholder="请选择状态"
          :options="statusOptions"
          :disabled="isView"
        />
      </FormItem>
      <FormItem label="算法图片" required>
        <Upload
          name="file"
          :action="imageUploadUrl"
          :headers="headers"
          :showUploadList="false"
          accept=".jpg,.jpeg,.png"
          :disabled="isView"
          @change="handleImageUpload"
        >
          <a-button type="primary" :disabled="isView">
            {{ isView ? '已上传' : '上传算法图片' }}
          </a-button>
        </Upload>
        <div v-if="draft.imageUrl?.trim()" class="image-preview">
          <img :src="draft.imageUrl" alt="算法图片预览" />
        </div>
      </FormItem>
      <FormItem label="算法文件">
        <Upload
          name="file"
          :action="modelUploadUrl"
          :headers="headers"
          :showUploadList="true"
          accept=".pt,.pth,.h5,.onnx"
          :disabled="isView"
          @change="handleFileUpload"
        >
          <a-button type="primary" :disabled="isView">
            {{ isView ? '已上传' : '上传算法文件' }}
          </a-button>
        </Upload>
        <div v-if="draft.filePath" class="file-path">
          已上传文件: {{ draft.filePath }}
        </div>
      </FormItem>
    </Form>
  </div>
</template>

<script lang="ts" setup>
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

const statusOptions = [
  { value: 0, label: '未部署' },
  { value: 1, label: '已部署' },
  { value: 3, label: '已下线' },
];

function handleFileUpload(info: { file: { status?: string; response?: { code?: number; msg?: string; data?: { url?: string } }; error?: { message?: string } } }) {
  if (info.file.status === 'done') {
    const response = info.file.response;
    if (response && response.code === 0) {
      draft.value.filePath = response.data?.url ?? '';
      createMessage.success('算法文件上传成功');
    }
    else {
      createMessage.error(response?.msg || '文件上传失败');
    }
  }
  else if (info.file.status === 'error') {
    const response = info.file.response;
    createMessage.error(response?.msg || info.file.error?.message || '文件上传失败');
  }
}

function handleImageUpload(info: { file: { status?: string; response?: { code?: number; msg?: string; data?: { url?: string } } } }) {
  if (info.file.status === 'done') {
    const response = info.file.response;
    if (response && response.code === 0) {
      draft.value.imageUrl = response.data?.url ?? '';
      createMessage.success('算法图片上传成功');
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
  max-width: 720px;
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
    max-height: 200px;
    max-width: 100%;
  }
}

.file-path {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  word-break: break-all;
}

:deep(.ant-form-item-label) {
  & > label::after {
    content: '';
  }
}
</style>
