<template>
  <div class="draw-object-section">
    <div class="draw-object-layout">
      <div class="draw-object-left">
        <div class="table-toolbar">
          <Button type="primary" size="small" :disabled="isView" @click="handleSave">
            保存
          </Button>
          <Button type="link" size="small" :disabled="isView" @click="handleAdd">
            <PlusOutlined />
            新增
          </Button>
          <Button type="link" size="small" :disabled="isView" @click="handleImport">
            <ImportOutlined />
            导入
          </Button>
        </div>

        <Table
          :columns="columns"
          :data-source="tableItems"
          :pagination="false"
          row-key="id"
          size="small"
          bordered
          class="draw-object-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'class_key'">
              <Input
                v-if="isRowEditing(record.id)"
                v-model:value="record.class_key"
                size="small"
                class="cell-input"
                placeholder="ClassID"
                :disabled="isView"
              />
              <span v-else class="cell-text">{{ record.class_key || '-' }}</span>
            </template>
            <template v-else-if="column.key === 'label'">
              <Input
                v-if="isRowEditing(record.id)"
                v-model:value="record.label"
                size="small"
                class="cell-input"
                placeholder="描述文本"
                :disabled="isView"
              />
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
              <Switch v-model:checked="record.enabled" size="small" :disabled="isView" />
            </template>
            <template v-else-if="column.key === 'action'">
              <div class="row-actions">
                <template v-if="isRowEditing(record.id)">
                  <Button
                    type="link"
                    size="small"
                    class="action-link"
                    :disabled="isView"
                    @click="handleCancelEdit"
                  >
                    取消
                  </Button>
                  <Button
                    type="link"
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
                    size="small"
                    class="action-link"
                    :disabled="isView"
                    @click="handleEditRow(record.id)"
                  >
                    编辑
                  </Button>
                  <Button
                    type="link"
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
                    <span class="preview-title-text">{{ item.label || defaultPreviewLabel }}</span>
                  </div>
                  <div
                    v-if="region.preview_bbox"
                    class="preview-box"
                    :style="objectBoxStyle(item, region)"
                  />
                </template>
              </template>

              <template v-if="draft.draw_style.segmentation.enabled">
                <div
                  v-for="(edge, edgeIndex) in segmentationEdges"
                  :key="`seg-${edgeIndex}`"
                  class="preview-poly-edge"
                  :style="edge"
                />
              </template>
            </template>
          </div>
        </div>
        <Button class="preview-btn" @click="handlePreview">
          预览绘制效果
        </Button>
      </div>
    </div>

    <DrawObjectImportModal v-model:open="importVisible" @success="handleImportSuccess" />
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';
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
  applyDrawObjectLabelsFromModelName,
  buildDrawObjectLabelFromModelName,
  createDrawObjectItem,
  syncClassWhitelistFromDrawObjects,
} from '../useDraft';
import type { ModelDraft, ModelDrawObjectItem, ModelDrawRegion } from '../../../modelDraft.types';
import {
  DEFAULT_MODEL_PREVIEW,
  DEFAULT_DETECTION_AREA_POLYGON,
  DEFAULT_SEGMENTATION_POLYGONS,
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
const editingSnapshot = ref<{ class_key: string; label: string } | null>(null);
const isNewEditingRow = ref(false);

const tableItems = computed({
  get: () => draft.value.draw_objects.items,
  set: (items) => {
    draft.value.draw_objects.items = items;
  },
});

const previewImageUrl = DEFAULT_MODEL_PREVIEW;

const detectionAreaEdges = computed(() =>
  buildPolygonEdgeStyles(
    DEFAULT_DETECTION_AREA_POLYGON,
    draft.value.draw_style.detection_area.border_width,
    draft.value.draw_style.detection_area.color,
  ),
);

const segmentationEdges = computed(() =>
  DEFAULT_SEGMENTATION_POLYGONS.flatMap(poly =>
    buildPolygonEdgeStyles(
      poly,
      draft.value.draw_style.segmentation.border_width,
      draft.value.draw_style.segmentation.color,
    ),
  ),
);

const defaultPreviewLabel = computed(() =>
  buildDrawObjectLabelFromModelName(draft.value.name),
);

const previewItems = computed(() =>
  tableItems.value.filter(item => item.enabled && itemHasDrawRegions(item)),
);

const columns: ColumnsType<ModelDrawObjectItem> = [
  { title: 'ClassID', key: 'class_key', width: 88 },
  { title: '描述文本', key: 'label', width: 112, ellipsis: true },
  { title: '颜色', key: 'color', width: 56, align: 'center' },
  { title: '是否绘制', key: 'enabled', width: 80, align: 'center' },
  { title: '操作', key: 'action', width: 72, align: 'center' },
];

watch(
  () => draft.value.name,
  () => {
    applyDrawObjectLabelsFromModelName(draft.value);
  },
  { immediate: true },
);

function handleSave() {
  syncClassWhitelistFromDrawObjects(draft.value);
  createMessage.success('绘制对象已保存');
}

function handleAdd() {
  const item = createDrawObjectItem({ class_key: '', label: '' });
  tableItems.value = [...tableItems.value, item];
  editingRowId.value = item.id;
  editingSnapshot.value = { class_key: '', label: '' };
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
    syncClassWhitelistFromDrawObjects(draft.value);
    clearEditingState();
    return;
  }

  if (editingSnapshot.value) {
    const row = tableItems.value.find(item => item.id === id);
    if (row) {
      row.class_key = editingSnapshot.value.class_key;
      row.label = editingSnapshot.value.label;
    }
  }
  clearEditingState();
}

function handleFinishEdit(id: string) {
  const row = tableItems.value.find(item => item.id === id);
  if (!row?.class_key?.trim()) {
    createMessage.warning('ClassID 不能为空');
    return;
  }
  clearEditingState();
  syncClassWhitelistFromDrawObjects(draft.value);
}

function handleImport() {
  importVisible.value = true;
}

function handleImportSuccess(items: ModelDrawObjectItem[]) {
  tableItems.value = [...tableItems.value, ...items];
  syncClassWhitelistFromDrawObjects(draft.value);
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
    createMessage.warning('请至少启用一个带标注位置的绘制对象');
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
.draw-object-section {
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
}

.draw-object-layout {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.draw-object-left {
  flex: 0 0 420px;
  width: 420px;
  max-width: 420px;
  min-width: 0;
}

.draw-object-right {
  flex: 1;
  min-width: 360px;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.draw-object-table {
  :deep(.ant-table) {
    font-size: 12px;
  }

  :deep(.ant-table-thead > tr > th),
  :deep(.ant-table-tbody > tr > td) {
    padding: 8px 6px;
  }

  :deep(.cell-input) {
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
    color: #1677ff;
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
  margin-top: 12px;
}
</style>
