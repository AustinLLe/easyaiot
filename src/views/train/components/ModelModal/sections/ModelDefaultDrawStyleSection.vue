<template>
  <div class="draw-style-section">
    <div class="draw-style-layout">
      <div class="draw-style-left">
        <div class="section-toolbar">
          <Button type="primary" size="small" :disabled="isView" @click="handleSave">
            保存
          </Button>
          <Button type="link" size="small" :disabled="isView" @click="handleReset">
            <ReloadOutlined />
            重置样式
          </Button>
        </div>

        <div class="style-card-list">
          <DrawStyleConfigCard
            v-model:config="draft.draw_style.detection_area"
            title="检测区�?
            :disabled="isView"
            show-border-width
          />
          <DrawStyleConfigCard
            v-model:config="draft.draw_style.object_box"
            title="对象分析�?
            :disabled="isView"
            show-border-width
          />
          <DrawStyleConfigCard
            v-model:config="draft.draw_style.object_box_title"
            title="对象分析框标�?
            :disabled="isView"
            show-bg-color
          />
          <DrawStyleConfigCard
            v-model:config="draft.draw_style.segmentation"
            title="分割绘制"
            :disabled="isView"
            show-border-width
          />
        </div>
      </div>

      <div class="draw-style-right">
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

              <template v-for="item in previewDrawItems" :key="item.id">
                <template
                  v-for="(region, regionIndex) in expandDrawRegions(item)"
                  :key="`${item.id}-${regionIndex}`"
                >
                  <div
                    v-if="draft.draw_style.object_box_title.enabled && region.title_bbox"
                    class="preview-title-box"
                    :style="titleBoxStyle(item, region)"
                  >
                    <span class="preview-title-text">{{ item.label || defaultPreviewLabel }}</span>
                  </div>
                  <div
                    v-if="draft.draw_style.object_box.enabled && region.preview_bbox"
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
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { Button } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import { createDefaultDrawStyle, buildDrawObjectLabelFromModelName } from '../useDraft';
import type { ModelDraft, ModelDrawObjectItem, ModelDrawRegion } from '../../../modelDraft.types';
import {
  DEFAULT_DETECTION_AREA_POLYGON,
  DEFAULT_MODEL_PREVIEW,
  DEFAULT_SEGMENTATION_POLYGONS,
  buildPolygonEdgeStyles,
  buildPreviewTitleBoxStyle,
  expandDrawRegions,
  itemHasDrawRegions,
  rectToCssStyle,
} from '../../../utils/drawUtils';
import DrawStyleConfigCard from './DrawStyleConfigCard.vue';

defineOptions({ name: 'ModelDefaultDrawStyleSection' });

defineProps<{
  isView?: boolean;
}>();

const draft = defineModel<ModelDraft>('draft', { required: true });
const { createMessage } = useMessage();

const showPreviewOverlay = ref(true);

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

const previewDrawItems = computed(() =>
  draft.value.draw_objects.items.filter(
    item => item.enabled && itemHasDrawRegions(item),
  ),
);

const defaultPreviewLabel = computed(() =>
  buildDrawObjectLabelFromModelName(draft.value.name),
);

function objectBoxStyle(_item: ModelDrawObjectItem, region: ModelDrawRegion) {
  if (!region.preview_bbox)
    return {};
  return {
    ...rectToCssStyle(region.preview_bbox),
    borderWidth: `${draft.value.draw_style.object_box.border_width}px`,
    borderColor: draft.value.draw_style.object_box.color,
  };
}

function titleBoxStyle(item: ModelDrawObjectItem, region: ModelDrawRegion) {
  return buildPreviewTitleBoxStyle(
    region,
    item,
    draft.value.draw_style.object_box_title,
  );
}

watch(
  () => draft.value.imageUrl,
  () => {
    showPreviewOverlay.value = false;
  },
);

function handleSave() {
  createMessage.success('绘制样式已保�?);
}

function handleReset() {
  draft.value.draw_style = createDefaultDrawStyle();
  showPreviewOverlay.value = true;
  createMessage.success('样式已重�?);
}

function handlePreview() {
  const style = draft.value.draw_style;
  const hasEnabled = [
    style.detection_area,
    style.object_box,
    style.object_box_title,
    style.segmentation,
  ].some(item => item.enabled);

  if (!hasEnabled) {
    createMessage.warning('请至少启用一种绘制样�?);
    return;
  }
  if ((style.object_box.enabled || style.object_box_title.enabled) && !previewDrawItems.value.length) {
    createMessage.warning('绘制对象缺少标注位置');
    return;
  }
  showPreviewOverlay.value = true;
}
</script>

<style lang="less" scoped>
.draw-style-section {
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
}

.draw-style-layout {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.draw-style-left {
  flex: 0 0 420px;
  width: 420px;
  max-width: 420px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.draw-style-right {
  flex: 1;
  min-width: 280px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.section-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.style-card-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
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
