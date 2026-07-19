<template>
  <div class="section-panel">
    <div class="section-header">
      <h3>摄像头与算法</h3>
      <p>摄像头模式下，为每个摄像头绑定一个或多个检测算法。</p>
    </div>

    <div class="binding-panel">
      <div class="binding-toolbar">
        <div ref="pickerAnchorRef" class="picker-anchor">
          <a-button type="primary" @click="toggleCameraPicker">
            <template #icon>
              <VideoCameraOutlined />
            </template>
            选择摄像头
            <DownOutlined :class="['picker-arrow', { open: cameraPickerOpen }]" />
          </a-button>

          <CameraPickerPanel
            v-if="cameraPickerOpen"
            v-model:open="cameraPickerOpen"
            :initial-selected-ids="selectedCameraIds"
            @confirm="handleCameraConfirm"
            @cancel="handlePickerCancel"
          />
        </div>

        <span class="stats-text">
          已选择：摄像头数量 {{ stats.cameraCount }} | 算法数量 {{ stats.algorithmCount }}
        </span>

        <a-input-search
          v-model:value="searchText"
          placeholder="搜索"
          allow-clear
          class="toolbar-search"
        />

        <div class="mode-switch">
          <span class="mode-label">配置模式</span>
          <a-segmented
            v-model:value="payload.config_mode"
            :options="configModeOptions"
          />
        </div>
      </div>

      <div v-if="visibleCameras.length" class="binding-list">
        <div
          v-for="binding in visibleCameras"
          :key="binding.device_id"
          class="binding-row"
        >
          <div class="camera-card">
            <div class="card-header">
              <a-tag :color="binding.online === false ? 'default' : 'green'">
                {{ binding.online === false ? '离线' : '在线' }}
              </a-tag>
              <a-tag v-if="binding.model_ids.length === 0" color="orange">未分配算法</a-tag>
              <a-button type="text" size="small" @click="removeCamera(binding.device_id)">
                <CloseOutlined />
              </a-button>
            </div>
            <div class="card-body">
              <VideoCameraOutlined class="camera-icon" />
              <div class="camera-info">
                <div class="camera-name">{{ binding.device_name }}</div>
                <div class="camera-id">ID: {{ binding.device_id }}</div>
              </div>
            </div>
          </div>

          <div class="algorithm-column">
            <div
              class="algo-picker-anchor"
              :ref="(el) => setModelPickerAnchor(binding.device_id, el)"
            >
              <div class="add-algorithm-btn" @click="toggleModelPicker(binding.device_id)">
                <PlusOutlined />
                <span>添加算法</span>
              </div>

              <ModelPickerPanel
                v-if="modelPickerOpen && editingDeviceId === binding.device_id"
                v-model:open="modelPickerOpen"
                :anchor-el="activeModelPickerAnchor"
                :initial-model-ids="editingModelIds"
                @confirm="handleModelConfirm"
                @cancel="handleModelPickerCancel"
              />
            </div>

            <div v-if="binding.model_ids.length" class="algorithm-list">
              <div
                v-for="modelId in binding.model_ids"
                :key="modelId"
                class="algorithm-card"
              >
                <div class="algorithm-card-body">
                  <div class="algo-name">{{ getModelName(modelId) }}</div>
                  <div class="algo-meta">{{ getModelMetaText(modelId) }}</div>
                </div>
                <a-button type="text" size="small" @click="removeModel(binding.device_id, modelId)">
                  <CloseOutlined />
                </a-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <a-empty v-else description="请点击上方「选择摄像头」添加设备" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import {
  CloseOutlined,
  DownOutlined,
  PlusOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import type { DeviceInfo } from '@/api/device/camera';
import { getModelPage } from '@/api/device/model';
import CameraPickerPanel from '../../TaskFormWidgets/CameraPickerPanel.vue';
import ModelPickerPanel from '../../TaskFormWidgets/ModelPickerPanel.vue';
import { syncLegacyIdsFromDraft } from '../useDraft';
import type { AlgorithmTaskDraft, CameraBindingDraft } from '../../../algorithmTaskDraft.types';

defineOptions({ name: 'CameraAlgorithmSection' });

interface ModelMeta {
  name: string;
  version?: string | number;
}

const payload = defineModel<AlgorithmTaskDraft>('payload', { required: true });

function syncLegacyIds() {
  syncLegacyIdsFromDraft(payload.value);
}

const pickerAnchorRef = ref<HTMLElement | null>(null);
const modelPickerAnchors = ref<Record<string, HTMLElement>>({});
const cameraPickerOpen = ref(false);
const modelPickerOpen = ref(false);
const searchText = ref('');
const editingDeviceId = ref<string | null>(null);
const editingModelIds = ref<number[]>([]);
const modelMetaMap = ref<Map<number, ModelMeta>>(new Map());

const configModeOptions = [
  { label: '摄像头', value: 'camera' },
  { label: '算法', value: 'algorithm', disabled: true },
];

const selectedCameraIds = computed(() =>
  payload.value.camera_bindings.map(binding => binding.device_id),
);

const stats = computed(() => ({
  cameraCount: payload.value.camera_bindings.length,
  algorithmCount: new Set(payload.value.camera_bindings.flatMap(binding => binding.model_ids)).size,
}));

const visibleCameras = computed(() =>
  payload.value.camera_bindings.filter(binding => matchesSearch(binding)),
);

function matchesSearch(binding: { device_id: string; device_name: string }) {
  const keyword = searchText.value.trim().toLowerCase();
  if (!keyword)
    return true;
  return binding.device_name.toLowerCase().includes(keyword)
    || binding.device_id.toLowerCase().includes(keyword);
}

function getModelName(modelId: number) {
  return modelMetaMap.value.get(modelId)?.name || `模型 ${modelId}`;
}

function getModelMetaText(modelId: number) {
  const meta = modelMetaMap.value.get(modelId);
  if (!meta)
    return `ID: ${modelId}`;
  const versionText = meta.version ? ` | v${meta.version}` : '';
  return `ID: ${modelId}${versionText}`;
}

const activeModelPickerAnchor = computed(() => {
  if (!editingDeviceId.value)
    return null;
  return modelPickerAnchors.value[editingDeviceId.value] ?? null;
});

function setModelPickerAnchor(deviceId: string, el: unknown) {
  if (el)
    modelPickerAnchors.value[deviceId] = el as HTMLElement;
}

function toggleCameraPicker() {
  modelPickerOpen.value = false;
  cameraPickerOpen.value = !cameraPickerOpen.value;
}

function handlePickerCancel() {
  cameraPickerOpen.value = false;
}

onClickOutside(pickerAnchorRef, () => {
  cameraPickerOpen.value = false;
});

function handleCameraConfirm(devices: DeviceInfo[]) {
  const existingMap = new Map(
    payload.value.camera_bindings.map(binding => [binding.device_id, binding]),
  );

  payload.value.camera_bindings = devices.map((device) => {
    const deviceId = String(device.id);
    const existing = existingMap.get(deviceId);
    if (existing)
      return existing;

    return {
      device_id: deviceId,
      device_name: device.name || deviceId,
      model_ids: [],
      online: (device as DeviceInfo & { online?: boolean }).online,
    } satisfies CameraBindingDraft;
  });

  syncLegacyIds();
  cameraPickerOpen.value = false;
}

function removeCamera(deviceId: string) {
  payload.value.camera_bindings = payload.value.camera_bindings.filter(
    binding => binding.device_id !== deviceId,
  );
  if (editingDeviceId.value === deviceId) {
    modelPickerOpen.value = false;
    editingDeviceId.value = null;
  }
  syncLegacyIds();
}

function toggleModelPicker(deviceId: string) {
  cameraPickerOpen.value = false;
  const binding = payload.value.camera_bindings.find(item => item.device_id === deviceId);
  if (!binding)
    return;

  if (modelPickerOpen.value && editingDeviceId.value === deviceId) {
    modelPickerOpen.value = false;
    editingDeviceId.value = null;
    return;
  }

  editingDeviceId.value = deviceId;
  editingModelIds.value = [...binding.model_ids];
  modelPickerOpen.value = true;
}

function handleModelPickerCancel() {
  modelPickerOpen.value = false;
  editingDeviceId.value = null;
}

function handleModelConfirm(modelIds: number[]) {
  if (!editingDeviceId.value)
    return;
  const binding = payload.value.camera_bindings.find(item => item.device_id === editingDeviceId.value);
  if (binding) {
    binding.model_ids = modelIds.map(id => Number(id));
    syncModelNamesForIds(binding.model_ids);
    syncLegacyIds();
  }
  modelPickerOpen.value = false;
  editingDeviceId.value = null;
  editingModelIds.value = [];
}

function removeModel(deviceId: string, modelId: number) {
  const binding = payload.value.camera_bindings.find(item => item.device_id === deviceId);
  if (!binding)
    return;
  binding.model_ids = binding.model_ids.filter(id => id !== modelId);
  syncLegacyIds();
}

function syncModelNamesForIds(modelIds: number[]) {
  const map = { ...payload.value.model_name_map };
  for (const id of modelIds) {
    const meta = modelMetaMap.value.get(id);
    if (meta?.name)
      map[id] = meta.name;
  }
  payload.value.model_name_map = map;
}

function syncAllModelNamesToDraft() {
  const map = { ...payload.value.model_name_map };
  for (const [id, meta] of modelMetaMap.value.entries())
    map[id] = meta.name;
  payload.value.model_name_map = map;
}

async function loadModelMeta() {
  const metaMap = new Map<number, ModelMeta>([
    [-1, { name: 'yolo11n.pt', version: '默认' }],
    [-2, { name: 'yolov8n.pt', version: '默认' }],
  ]);

  try {
    const response = await getModelPage({ pageNo: 1, pageSize: 1000 });
    let allModels: any[] = [];
    if (Array.isArray(response))
      allModels = response;
    else if (response?.data && Array.isArray(response.data))
      allModels = response.data;

    for (const item of allModels) {
      metaMap.set(item.id, {
        name: item.name,
        version: item.version,
      });
    }
  }
  catch {
    // keep defaults
  }

  modelMetaMap.value = metaMap;
  syncAllModelNamesToDraft();
}

onMounted(() => {
  loadModelMeta();
});
</script>

<style lang="less" scoped>
.section-panel {
  max-width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-header {
  flex-shrink: 0;
  margin-bottom: 16px;

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

.binding-panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.binding-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  margin-bottom: 12px;
}

.picker-anchor {
  position: relative;
}

.picker-arrow {
  margin-left: 6px;
  font-size: 12px;
  transition: transform 0.2s;

  &.open {
    transform: rotate(180deg);
  }
}

.stats-text {
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
  white-space: nowrap;
}

.toolbar-search {
  width: 200px;
  margin-left: auto;
}

.mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-label {
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
  white-space: nowrap;
}

.binding-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
  padding-right: 4px;
}

.binding-panel :deep(.ant-empty) {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0;
}

.binding-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex-shrink: 0;
}

.camera-card {
  width: 220px;
  flex-shrink: 0;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.card-body {
  display: flex;
  align-items: center;
  gap: 10px;
}

.camera-icon {
  font-size: 28px;
  color: #1677ff;
}

.camera-name {
  font-weight: 600;
  font-size: 15px;
}

.camera-id {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-top: 4px;
}

.algorithm-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.algo-picker-anchor {
  position: relative;
  width: 220px;
}

.algorithm-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 220px;
  max-width: 220px;
}

.add-algorithm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 40px;
  padding: 8px 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;

  &:hover {
    color: #1677ff;
    border-color: #1677ff;
  }
}

.algorithm-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
}

.algorithm-card-body {
  flex: 1;
  min-width: 0;
}

.algo-name {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
}

.algo-meta {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
