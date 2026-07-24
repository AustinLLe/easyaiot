<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="draw-object-import-overlay"
      @mousedown.self="handleClose"
    >
      <div class="draw-object-import-dialog" role="dialog" aria-modal="true">
        <div class="draw-object-import-header">
          <span class="draw-object-import-title">批量导入</span>
          <button type="button" class="draw-object-import-close" @click="handleClose">×</button>
        </div>

        <div class="draw-object-import-body">
          <div class="draw-object-import-icon">
            <CloudUploadOutlined />
          </div>
          <p class="draw-object-import-desc">
            支持导入表格(.xls / .xlsx)进行批量新增绘制对象
          </p>
          <p class="draw-object-import-hint">
            {{ templateHint }}
          </p>
          <div class="draw-object-import-actions">
            <Button :loading="downloading" @click="handleDownloadTemplate">
              下载模板
            </Button>
            <Button type="primary" :loading="importing" @click="handleSelectFile">
              选择文件导入
            </Button>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept=".xls,.xlsx"
            class="draw-object-import-file"
            @change="handleFileChange"
          >
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { CloudUploadOutlined } from '@ant-design/icons-vue';
import { Button } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import type { ModelDrawObjectItem } from '../../modelDraft.types';
import { DRAW_OBJECT_IMPORT_TEMPLATE_HINT } from '../../constants/drawObjectImportTemplate';
import { downloadDrawObjectTemplate, parseDrawObjectExcel } from '../../utils/drawUtils';

defineOptions({ name: 'DrawObjectImportModal' });

const visible = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  success: [items: ModelDrawObjectItem[]];
}>();

const { createMessage } = useMessage();

const fileInputRef = ref<HTMLInputElement | null>(null);
const downloading = ref(false);
const importing = ref(false);
const templateHint = DRAW_OBJECT_IMPORT_TEMPLATE_HINT;

function handleClose() {
  visible.value = false;
}

function handleDownloadTemplate() {
  downloading.value = true;
  try {
    downloadDrawObjectTemplate();
  }
  catch (error) {
    console.error(error);
    createMessage.error('模板下载失败');
  }
  finally {
    downloading.value = false;
  }
}

function handleSelectFile() {
  fileInputRef.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file)
    return;

  importing.value = true;
  try {
    const items = await parseDrawObjectExcel(file);
    emit('success', items);
    visible.value = false;
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '导入失败，请检查文件格�?;
    createMessage.error(message);
  }
  finally {
    importing.value = false;
  }
}
</script>

<style lang="less" scoped>
.draw-object-import-overlay {
  position: fixed;
  inset: 0;
  z-index: 4100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.draw-object-import-dialog {
  width: min(480px, 100%);
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.draw-object-import-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.draw-object-import-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.draw-object-import-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;

  &:hover {
    color: rgba(0, 0, 0, 0.88);
  }
}

.draw-object-import-body {
  padding: 36px 24px 32px;
  text-align: center;
}

.draw-object-import-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  font-size: 72px;
  color: #bfbfbf;
  line-height: 1;
}

.draw-object-import-desc {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.65);
}

.draw-object-import-hint {
  margin: 0 0 28px;
  font-size: 13px;
  line-height: 20px;
  color: rgba(0, 0, 0, 0.45);
}

.draw-object-import-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.draw-object-import-file {
  display: none;
}
</style>
