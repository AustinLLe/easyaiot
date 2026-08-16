<template>
  <div class="draw-object-section">
    <div class="section-header">
      <h3>绘制对象</h3>
      <p>配置检测类别、标签与绘制颜色，创建算法任务时会自动带入。</p>
    </div>

    <div class="draw-object-layout">
      <div class="draw-object-left">
        <div class="table-toolbar">
          <Button type="primary" html-type="button" size="small" :disabled="isView" @click="handleSave">
            保存
          </Button>
          <Button type="link" html-type="button" size="small" :disabled="isView" @click="handleAdd">
            <PlusOutlined />
            新增
          </Button>
          <Button type="link" html-type="button" size="small" :disabled="isView" @click="handleImport">
            <ImportOutlined />
            导入
          </Button>
        </div>

        <Table
          aria-label="绘制对象"
          :columns="columns"
          :data-source="tableItems"
          :pagination="false"
          row-key="id"
          size="small"
          bordered
          class="draw-object-table"
          table-layout="fixed"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'class_key'">
              <template v-if="isRowEditing(record.id)">
                <label :for="`draw-class-key-${record.id}`" class="sr-only">类别ID</label>
                <Input
                  :id="`draw-class-key-${record.id}`"
                  v-model:value="record.class_key"
                  size="small"
                  class="cell-input"
                  placeholder="类别ID"
                  :disabled="isView"
                />
              </template>
              <span v-else class="cell-text">{{ record.class_key || '-' }}</span>
            </template>
            <template v-else-if="column.key === 'class_label'">
              <template v-if="isRowEditing(record.id)">
                <label :for="`draw-class-label-${record.id}`" class="sr-only">class label</label>
                <Input
                  :id="`draw-class-label-${record.id}`"
                  v-model:value="record.class_label"
                  size="small"
                  class="cell-input"
                  placeholder="class label"
                  :disabled="isView"
                />
              </template>
              <span v-else class="cell-text">{{ record.class_label || '-' }}</span>
            </template>
            <template v-else-if="column.key === 'label'">
              <template v-if="isRowEditing(record.id)">
                <label :for="`draw-label-${record.id}`" class="sr-only">描述文本</label>
                <Input
                  :id="`draw-label-${record.id}`"
                  v-model:value="record.label"
                  size="small"
                  class="cell-input"
                  placeholder="描述文本"
                  :disabled="isView"
                />
              </template>
              <span v-else class="cell-text">{{ record.label || '-' }}</span>
            </template>
            <template v-else-if="column.key === 'color'">
              <Popover
                v-model:open="colorPopoverMap[record.id]"
                trigger="click"
                placement="bottom"
                :overlay-style="{ padding: 0 }"
              >
                <template #content>
                  <ColorPicker
                    :init-color="record.color"
                    @change-color="(color) => handleColorConfirm(record.id, color)"
                  />
                </template>
                <button
                  type="button"
                  class="color-swatch"
                  :style="{ background: record.color }"
                  :disabled="isView"
                />
              </Popover>
            </template>
            <template v-else-if="column.key === 'enabled'">
              <Switch
                v-model:checked="record.enabled"
                size="small"
                :disabled="isView"
                @change="handleEnabledChange"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <div class="row-actions">
                <template v-if="isRowEditing(record.id)">
                  <Button
                    type="link"
                    html-type="button"
                    size="small"
                    class="action-link"
                    :disabled="isView"
                    @click="handleCancelEdit"
                  >
                    取消
                  </Button>
                  <Button
                    type="link"
                    html-type="button"
                    size="small"
                    class="action-link action-done"
                    :disabled="isView"
                    @click="handleFinishEdit(record.id)"
                  >
                    完成
                  </Button>
                </template>
                <template v-else>
                  <Button
                    type="link"
                    html-type="button"
                    size="small"
                    class="action-link"
                    :disabled="isView"
                    @click="handleEditRow(record.id)"
                  >
                    编辑
                  </Button>
                  <Button
                    type="link"
                    html-type="button"
                    size="small"
                    class="action-link"
                    danger
                    :disabled="isView"
                    @click="handleDelete(record.id)"
                  >
                    删除
                  </Button>
                </template>
              </div>
            </template>
          </template>
        </Table>
      </div>

      <div class="draw-object-right">
        <div class="preview-wrap">
          <div class="preview-stage">
            <img :src="previewImageUrl" alt="绘制预览" class="preview-image" />
            <template v-if="showPreviewOverlay">
              <template v-if="draft.draw_style.detection_area.enabled">
                <div
                  v-for="(edge, edgeIndex) in detectionAreaEdges"
                  :key="`det-${edgeIndex}`"
                  class="preview-poly-edge"
                  :style="edge"
                />
              </template>

              <template v-for="item in previewItems" :key="item.id">
                <template
                  v-for="(region, regionIndex) in expandDrawRegions(item)"
                  :key="`${item.id}-${regionIndex}`"
                >
                  <div
                    v-if="region.title_bbox"
                    class="preview-title-box"
                    :style="titleBoxStyle(item, region)"
                  >
                    <span v-if="item.label" class="preview-title-text">{{ item.label }}</span>
                  </div>
                  <div
                    v-if="region.preview_bbox"
                    class="preview-box"
                    :style="objectBoxStyle(item, region)"
                  />
                </template>
              </template>

            </template>
          </div>
        </div>
        <Button html-type="button" class="preview-btn" @click="handlePreview">
          预览绘制效果
        </Button>
      </div>
    </div>

    <DrawObjectImportModal
      v-model:open="importVisible"
      :existing-class-keys="existingClassKeys"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, h, reactive, ref } from 'vue';
import { ImportOutlined, PlusOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Input,
  Popover,
  Switch,
  Table,
} from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import ColorPicker from '@/components/ColorPicker/ColorPicker.vue';
import DrawObjectImportModal from '../../DrawObjectImportModal/index.vue';
import { useMessage } from '@/hooks/web/useMessage';
import {
  createDrawObjectItem,
  finalizeDrawObjectLabel,
  syncClassLabelsTextFromDrawObjects,
  syncClassWhitelistFromDrawObjects,
  validateDrawObjectRowComplete,
  validateDrawObjects,
  validateImportDrawObjects,
} from '../useDraft';
import type { ModelDraft, ModelDrawObjectItem, ModelDrawRegion } from '../../../modelDraft.types';
import {
  DEFAULT_DRAW_OBJECT_PRESETS,
  DEFAULT_MODEL_PREVIEW,
  DEFAULT_DETECTION_AREA_POLYGON,
  buildPolygonEdgeStyles,
  buildPreviewTitleBoxStyle,
  expandDrawRegions,
  itemHasDrawRegions,
  rectToCssStyle,
} from '../../../utils/drawUtils';

defineOptions({ name: 'ModelDrawObjectSection' });

defineProps<{
  isView?: boolean;
}>();

const draft = defineModel<ModelDraft>('draft', { required: true });
const { createMessage } = useMessage();

const colorPopoverMap = reactive<Record<string, boolean>>({});
const showPreviewOverlay = ref(true);
const importVisible = ref(false);
const editingRowId = ref<string | null>(null);
const editingSnapshot = ref<{ class_key: string; class_label: string; label: string } | null>(null);
const isNewEditingRow = ref(false);

const tableItems = computed({
  get: () => draft.value.draw_objects.items,
  set: (items) => {
    draft.value.draw_objects.items = items;
  },
});

const existingClassKeys = computed(() =>
  tableItems.value.map(item => item.class_key.trim()).filter(Boolean),
);

const previewImageUrl = DEFAULT_MODEL_PREVIEW;

const detectionAreaEdges = computed(() =>
  buildPolygonEdgeStyles(
    DEFAULT_DETECTION_AREA_POLYGON,
    draft.value.draw_style.detection_area.border_width,
    draft.value.draw_style.detection_area.color,
  ),
);

const previewItems = computed(() =>
  tableItems.value
    .filter(item => item.enabled)
    .slice(0, DEFAULT_DRAW_OBJECT_PRESETS.length)
    .map((item, index) => {
      if (itemHasDrawRegions(item))
        return item;
      const preset = DEFAULT_DRAW_OBJECT_PRESETS[index % DEFAULT_DRAW_OBJECT_PRESETS.length];
      return {
        ...item,
        preview_regions: [
          {
            preview_bbox: { ...preset.preview_bbox },
            title_bbox: { ...preset.title_bbox },
          },
        ],
      };
    }),
);

function requiredColumnTitle(label: string) {
  return () => h('span', [
    h('span', { class: 'required-star' }, '*'),
    ` ${label}`,
  ]);
}

const columns: ColumnsType<ModelDrawObjectItem> = [
  { title: requiredColumnTitle('类别ID'), key: 'class_key', width: 72 },
  { title: requiredColumnTitle('类别标签'), key: 'class_label', width: 80, ellipsis: true },
  { title: '描述文本', key: 'label', width: 80, ellipsis: true },
  { title: '颜色', key: 'color', width: 48, align: 'center' },
  { title: '是否绘制', key: 'enabled', width: 72, align: 'center' },
  { title: '操作', key: 'action', width: 88, align: 'center' },
];

function validateSection(): boolean {
  if (editingRowId.value) {
    createMessage.warning('请先完成当前行的编辑');
    return false;
  }
  const error = validateDrawObjects(tableItems.value);
  if (error) {
    createMessage.warning(error);
    return false;
  }
  return true;
}

defineExpose({ validateSection });

function handleSave() {
  if (!validateSection())
    return;
  syncDrawObjectDerivedState();
  createMessage.success('绘制对象已保存');
}

function syncDrawObjectDerivedState() {
  syncClassLabelsTextFromDrawObjects(draft.value);
  syncClassWhitelistFromDrawObjects(draft.value);
}

function handleAdd() {
  const item = createDrawObjectItem({ class_key: '', class_label: '', label: '' });
  tableItems.value = [...tableItems.value, item];
  editingRowId.value = item.id;
  editingSnapshot.value = { class_key: '', class_label: '', label: '' };
  isNewEditingRow.value = true;
}

function isRowEditing(id: string) {
  return editingRowId.value === id;
}

function clearEditingState() {
  editingRowId.value = null;
  editingSnapshot.value = null;
  isNewEditingRow.value = false;
}

function handleEditRow(id: string) {
  const row = tableItems.value.find(item => item.id === id);
  if (!row)
    return;
  editingRowId.value = id;
  editingSnapshot.value = {
    class_key: row.class_key,
    class_label: row.class_label,
    label: row.label,
  };
  isNewEditingRow.value = false;
}

function handleCancelEdit() {
  const id = editingRowId.value;
  if (!id)
    return;

  if (isNewEditingRow.value) {
    if (tableItems.value.length <= 1) {
      createMessage.warning('至少保留一条绘制对象');
      return;
    }
    tableItems.value = tableItems.value.filter(item => item.id !== id);
    syncDrawObjectDerivedState();
    clearEditingState();
    return;
  }

  if (editingSnapshot.value) {
    const row = tableItems.value.find(item => item.id === id);
    if (row) {
      row.class_key = editingSnapshot.value.class_key;
      row.class_label = editingSnapshot.value.class_label;
      row.label = editingSnapshot.value.label;
    }
  }
  clearEditingState();
}

function handleFinishEdit(id: string) {
  const row = tableItems.value.find(item => item.id === id);
  if (!row)
    return;

  const error = validateDrawObjectRowComplete(row, tableItems.value);
  if (error) {
    createMessage.warning(error);
    return;
  }

  finalizeDrawObjectLabel(row);
  clearEditingState();
  syncDrawObjectDerivedState();
}

function handleImport() {
  importVisible.value = true;
}

function handleImportSuccess(items: ModelDrawObjectItem[]) {
  const error = validateImportDrawObjects(tableItems.value, items);
  if (error) {
    createMessage.warning(error);
    return;
  }
  tableItems.value = [...tableItems.value, ...items];
  syncDrawObjectDerivedState();
  createMessage.success(`成功导入 ${items.length} 条绘制对象`);
}

function handleDelete(id: string) {
  if (tableItems.value.length <= 1) {
    createMessage.warning('至少保留一条绘制对象');
    return;
  }
  tableItems.value = tableItems.value.filter(item => item.id !== id);
  if (editingRowId.value === id)
    clearEditingState();
  syncDrawObjectDerivedState();
}

function handleEnabledChange() {
  syncClassWhitelistFromDrawObjects(draft.value);
}

function handleColorConfirm(id: string, color: string) {
  const target = tableItems.value.find(item => item.id === id);
  if (target)
    target.color = color;
  colorPopoverMap[id] = false;
}

function handlePreview() {
  if (!previewItems.value.length) {
    createMessage.warning('请至少启用一个绘制对象');
    return;
  }
  showPreviewOverlay.value = true;
}

function objectBoxStyle(item: ModelDrawObjectItem, region: ModelDrawRegion) {
  if (!region.preview_bbox)
    return {};
  return {
    ...rectToCssStyle(region.preview_bbox),
    borderWidth: `${draft.value.draw_style.object_box.border_width}px`,
    borderColor: item.color,
  };
}

function titleBoxStyle(item: ModelDrawObjectItem, region: ModelDrawRegion) {
  return buildPreviewTitleBoxStyle(
    region,
    item,
    draft.value.draw_style.object_box_title,
  );
}
</script>

<style lang="less" scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.draw-object-section {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: none;
  min-width: 0;
  min-height: 100%;
}

.section-header {
  flex-shrink: 0;
  margin-bottom: 20px;
}

.draw-object-layout {
  display: flex;
  align-items: stretch;
  gap: 16px;
  width: 100%;
  min-width: 0;
}

.draw-object-left {
  flex: 1 1 50%;
  min-width: 0;
}

.draw-object-right {
  flex: 1 1 50%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-right: 16px;
  box-sizing: border-box;
}

.required-star {
  color: #ff4d4f;
  font-family: SimSun, sans-serif;
}

.draw-object-table {
  :deep(.ant-table-wrapper) {
    overflow: visible !important;
  }

  :deep(.ant-table-wrapper),
  :deep(.ant-table) {
    width: 100%;
  }

  :deep(.ant-table) {
    font-size: 12px;
    table-layout: fixed;
  }

  :deep(.ant-table-container),
  :deep(.ant-table-content),
  :deep(.ant-table-body) {
    overflow: hidden !important;
  }

  :deep(.ant-table table) {
    table-layout: fixed;
    width: 100% !important;
  }

  :deep(.ant-table-thead > tr > th),
  :deep(.ant-table-tbody > tr > td) {
    padding: 8px 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.cell-input) {
    width: 100%;
    font-size: 12px;
  }
}

.cell-text {
  display: block;
  font-size: 12px;
  line-height: 22px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
  white-space: nowrap;
  gap: 4px;

  .action-link {
    padding: 0 2px;
    height: 24px;
    font-size: 12px;
    line-height: 24px;
  }

  .action-done {
    color: @mix-brand-color;
  }
}

.table-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.preview-wrap {
  width: 100%;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  overflow: hidden;
}

.preview-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1024 / 564;
}

.preview-image {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.preview-box {
  position: absolute;
  border-style: solid;
  box-sizing: border-box;
  pointer-events: none;
}

.preview-poly-edge {
  box-sizing: border-box;
}

.preview-title-box {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-title-text {
  padding: 0 4px;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.preview-btn {
  align-self: center;
  margin-top: 12px;
}
</style>
