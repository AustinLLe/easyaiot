<template>
  <Teleport to="body">
    <div
      v-if="open && anchorEl"
      ref="panelRef"
      class="model-picker-panel"
      :style="panelStyle"
      @mousedown.stop
    >
    <div class="picker-toolbar">
      <span class="toolbar-title">选择算法</span>
      <a-input-search
        v-model:value="searchText"
        placeholder="搜索算法"
        allow-clear
        class="toolbar-search"
      />
    </div>

    <div class="picker-body">
      <div class="picker-header">
        <div class="select-all" @click="toggleSelectAll">
          <span :class="['select-box', { checked: allChecked, indeterminate: indeterminate && !allChecked }]">
            <CheckOutlined v-if="allChecked" class="select-check" />
            <span v-else-if="indeterminate" class="select-dash" />
          </span>
          <span>全选</span>
        </div>
        <span class="selected-count">已选 {{ selectedModelIds.length }} 个</span>
      </div>

      <a-spin :spinning="loading">
        <div v-if="filteredModels.length" class="model-list">
          <div
            v-for="model in filteredModels"
            :key="model.id"
            :class="['model-row', { selected: isModelSelected(model.id) }]"
            @click="toggleModel(model.id)"
          >
            <span :class="['select-box', { checked: isModelSelected(model.id) }]">
              <CheckOutlined v-if="isModelSelected(model.id)" class="select-check" />
            </span>
            <div class="model-info">
              <div class="model-name">{{ model.name }}</div>
              <div class="model-meta">ID: {{ model.id }}<template v-if="model.version"> | v{{ model.version }}</template></div>
            </div>
          </div>
        </div>
        <a-empty v-else-if="!loading" description="暂无可用算法" />
      </a-spin>
    </div>

    <div class="picker-footer">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import { onClickOutside, useElementBounding, useEventListener } from '@vueuse/core';
import { CheckOutlined } from '@ant-design/icons-vue';
import { getModelPage } from '@/api/device/model';
import { seedModelDefaultProfiles } from '../../utils/paramUtils';
import { normalizeRealModelIds } from '../../utils/draftCommon';

defineOptions({ name: 'ModelPickerPanel' });

export interface ModelOption {
  id: number;
  name: string;
  version?: string | number;
}

const PANEL_WIDTH = 360;

const props = defineProps<{
  initialModelIds?: number[];
  anchorEl?: HTMLElement | null;
}>();

const emit = defineEmits<{
  confirm: [modelIds: number[]];
  cancel: [];
}>();

const open = defineModel<boolean>('open', { default: false });

const panelRef = ref<HTMLElement | null>(null);
const anchorRef = computed(() => props.anchorEl ?? null);
const { top, left, height, update } = useElementBounding(anchorRef);

const panelStyle = computed(() => {
  if (!props.anchorEl || !open.value)
    return {};

  let leftPos = left.value;
  const maxLeft = window.innerWidth - PANEL_WIDTH - 24;
  if (leftPos > maxLeft)
    leftPos = Math.max(24, maxLeft);

  return {
    position: 'fixed',
    top: `${top.value + height.value + 8}px`,
    left: `${leftPos}px`,
    zIndex: 2100,
  } as const;
});

const loading = ref(false);
const searchText = ref('');
const selectedModelIds = ref<number[]>([]);
const modelOptions = ref<ModelOption[]>([]);
const dataLoaded = ref(false);

const filteredModels = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  if (!keyword)
    return modelOptions.value;

  return modelOptions.value.filter((model) => {
    const name = model.name.toLowerCase();
    const idText = String(model.id);
    return name.includes(keyword) || idText.includes(keyword);
  });
});

const filteredModelIds = computed(() => filteredModels.value.map(model => model.id));

const allChecked = computed(() => {
  if (!filteredModelIds.value.length)
    return false;
  return filteredModelIds.value.every(id => selectedModelIds.value.includes(id));
});

const indeterminate = computed(() => {
  if (!filteredModelIds.value.length)
    return false;
  const count = filteredModelIds.value.filter(id => selectedModelIds.value.includes(id)).length;
  return count > 0 && count < filteredModelIds.value.length;
});

function isModelSelected(id: number) {
  return selectedModelIds.value.includes(id);
}

function toggleModel(id: number) {
  const next = new Set(selectedModelIds.value);
  if (next.has(id))
    next.delete(id);
  else
    next.add(id);
  selectedModelIds.value = [...next];
}

function handleSelectAll(checked: boolean) {
  const next = new Set(selectedModelIds.value);
  if (checked)
    filteredModelIds.value.forEach(id => next.add(id));
  else
    filteredModelIds.value.forEach(id => next.delete(id));
  selectedModelIds.value = [...next];
}

function toggleSelectAll() {
  if (!filteredModelIds.value.length)
    return;
  handleSelectAll(!allChecked.value);
}

async function loadModels() {
  loading.value = true;
  try {
    const response = await getModelPage({ pageNo: 1, pageSize: 1000 });
    let allModels: any[] = [];
    if (Array.isArray(response))
      allModels = response;
    else if (response && response.code === 0 && response.data)
      allModels = Array.isArray(response.data) ? response.data : [];
    else if (response?.data && Array.isArray(response.data))
      allModels = response.data;

    const dbModels = allModels.map((item: any) => ({
      id: item.id,
      name: item.name,
      version: item.version,
    }));
    seedModelDefaultProfiles(allModels);
    modelOptions.value = dbModels.filter(model => Number(model.id) > 0);
  }
  catch {
    modelOptions.value = [];
  }
  finally {
    loading.value = false;
  }
}

async function initPanelData() {
  selectedModelIds.value = normalizeRealModelIds(props.initialModelIds);
  searchText.value = '';
  if (!dataLoaded.value) {
    await loadModels();
    dataLoaded.value = true;
  }
}

function handleConfirm() {
  emit('confirm', normalizeRealModelIds(selectedModelIds.value));
  open.value = false;
}

function handleCancel() {
  emit('cancel');
  open.value = false;
}

watch(open, async (visible) => {
  if (visible) {
    await nextTick();
    update();
    initPanelData();
  }
}, { immediate: true });

useEventListener(window, 'scroll', () => {
  if (open.value)
    update();
}, { capture: true });

useEventListener(window, 'resize', () => {
  if (open.value)
    update();
});

onClickOutside(panelRef, () => {
  if (!open.value)
    return;
  handleCancel();
}, { ignore: [anchorRef] });
</script>

<style lang="less" scoped>
.model-picker-panel {
  width: 360px;
  max-width: calc(100vw - 48px);
  font-size: 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.picker-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;

  .toolbar-title {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .toolbar-search {
    max-width: 180px;

    :deep(.ant-input) {
      font-size: 12px;
    }
  }
}

.picker-body {
  padding: 12px 16px;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.select-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.select-box {
  width: 16px;
  height: 16px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transition: all 0.2s;

  &.checked {
    border-color: #1677ff;
    background: #1677ff;
    color: #fff;
  }

  &.indeterminate {
    border-color: #1677ff;
    background: #1677ff;
  }
}

.select-check {
  font-size: 10px;
}

.select-dash {
  width: 8px;
  height: 2px;
  background: #fff;
  border-radius: 1px;
}

.selected-count {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.model-list {
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
}

.model-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px;
  margin: 0 -8px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  &.selected {
    background: #e6f4ff;
  }
}

.model-info {
  flex: 1;
  min-width: 0;
}

.model-name {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.model-meta {
  margin-top: 2px;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
}

.picker-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;

  :deep(.ant-btn) {
    font-size: 12px;
    height: 28px;
    padding: 0 12px;
  }
}
</style>
