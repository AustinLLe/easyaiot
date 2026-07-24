<template>
  <BasicModal
    @register="register"
    title="区域检测配置"
    :width="1200"
    :z-index="props.zIndex"
    :canFullscreen="true"
    :defaultFullscreen="false"
    :keyboard="false"
    :useWrapper="false"
    :showOkBtn="false"
    :showCancelBtn="true"
  >
    <div class="device-region-detection-drawer" :class="{ 'draft-fixed-layout': hideDeviceList }">
      <!-- 摄像头列表：组合模式编辑固定配对时隐藏；算法模式多摄像头时保留 -->
      <div v-if="!hideDeviceList" class="device-list-panel">
        <div class="panel-header">
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="搜索摄像头"
            style="width: 100%"
            @search="handleSearch"
          />
        </div>
        <div class="device-list">
          <div
            v-for="device in filteredDevices"
            :key="device.id"
            class="device-item"
            :class="{ active: selectedDeviceId === device.id }"
            @click="selectDevice(device)"
          >
            <div class="device-cover">
              <img
                v-if="device.cover_image_path"
                :src="device.cover_image_path"
                :alt="device.name"
                @error="handleImageError"
              />
              <div v-else class="no-cover">
                <CameraOutlined style="font-size: 32px; color: #ccc" />
              </div>
            </div>
            <div class="device-info">
              <div class="device-name">{{ device.name || device.id }}</div>
            </div>
          </div>
          <a-empty v-if="filteredDevices.length === 0" description="暂无摄像头" :image="false" />
        </div>
      </div>

      <!-- 区域检测绘制区域 -->
      <div
        class="region-drawer-panel"
        :class="{ 'region-drawer-panel--full': hideDeviceList }"
        v-if="selectedDeviceId"
      >
        <DeviceRegionDrawer
          ref="regionDrawerRef"
          :key="selectedDeviceId"
          :device-id="selectedDeviceId"
          :initial-regions="deviceRegions[selectedDeviceId] || []"
          :initial-image-id="deviceImageIds[selectedDeviceId]"
          :initial-image-path="deviceImagePaths[selectedDeviceId]"
          :model-ids="activeModelIds"
          :draft-only="draftMode"
          :hide-model-selector="hideModelSelector"
          @save="handleRegionSave"
          @image-captured="handleImageCaptured"
          @cover-updated="handleCoverUpdated"
        />
      </div>
      <div v-else class="empty-selection" :class="{ 'empty-selection--full': hideDeviceList }">
        <a-empty :description="emptySelectionText" />
      </div>
    </div>
  </BasicModal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { BasicModal, useModalInner } from '@/components/Modal';
import { CameraOutlined } from '@ant-design/icons-vue';
import { useMessage } from '@/hooks/web/useMessage';
import { getDeviceList, type DeviceInfo } from '@/api/device/camera';
import { getDeviceRegions, type DeviceDetectionRegion } from '@/api/device/device_detection_region';
import { getTaskStreams, getAlgorithmTask, type CameraStreamInfo } from '@/api/device/algorithm_task';
import {
  bootstrapDeviceRegionContext,
  parseDeviceRegionsResponse,
} from './useBootstrap';
import type {
  AlgorithmTaskDraft,
  RegionConfigDraft,
  RegionTableRow,
} from '../../algorithmTaskDraft.types';
import {
  buildRegionConfigFromDrawResult,
  createDefaultRegionConfig,
  draftRegionsToDeviceRegions,
} from '../../utils/paramUtils';
import DeviceRegionDrawer from '@/views/camera/components/DeviceRegionDrawer/index.vue';

defineOptions({ name: 'DeviceRegionDetectionDrawer', inheritAttrs: false });

const props = withDefaults(defineProps<{
  /** 嵌套在其他弹窗内时提高层级，避免被父级遮挡 */
  zIndex?: number;
}>(), {
  zIndex: undefined,
});

const { createMessage } = useMessage();

const regionDrawerRef = ref<InstanceType<typeof DeviceRegionDrawer> | null>(null);

const draftMode = ref(false);
const draftRow = ref<RegionTableRow | null>(null);
const draftConfig = ref<RegionConfigDraft | null>(null);
const draftOnSave = ref<((config: RegionConfigDraft) => void) | null>(null);

const [register, { setModalProps }] = useModalInner(async (data) => {
  selectedDeviceId.value = null;
  deviceRegions.value = {};
  deviceImageIds.value = {};
  deviceImagePaths.value = {};
  searchKeyword.value = '';
  taskModelIds.value = null;
  taskId.value = null;
  draftMode.value = false;
  draftRow.value = null;
  draftConfig.value = null;
  draftOnSave.value = null;

  if (data?.mode === 'draft' && data?.draft && data?.row) {
    draftMode.value = true;
    draftRow.value = data.row;
    draftConfig.value = data.config ?? null;
    draftOnSave.value = data.onSave ?? null;
    taskModelIds.value = [data.row.model_id];

    const subtitle = buildDraftModalSubtitle(data.row);
    setModalProps({ title: `分析区域 - ${subtitle}` });

    await loadDraftDevices(data.draft, data.row);
    return;
  }

  setModalProps({ title: '区域检测配置' });

  if (data?.taskId) {
    taskId.value = data.taskId;
    await loadTaskInfo(data.taskId);
    await loadTaskDevices(data.taskId);
  }
  else {
    await loadDevices();
  }
});

// 状态
const taskId = ref<number | null>(null);
const taskModelIds = ref<number[] | null>(null);
const devices = ref<DeviceInfo[]>([]);
const searchKeyword = ref('');
const selectedDeviceId = ref<string | null>(null);
const deviceRegions = ref<Record<string, DeviceDetectionRegion[]>>({});
const deviceImageIds = ref<Record<string, number>>({});
const deviceImagePaths = ref<Record<string, string>>({});

const activeModelIds = computed(() => {
  if (draftMode.value && draftRow.value)
    return [draftRow.value.model_id];
  return taskModelIds.value ?? undefined;
});

/** 组合模式编辑：行已固定摄像头+算法，不再展示左侧摄像头列表 */
const hideDeviceList = computed(() => {
  if (!draftMode.value)
    return false;
  if (draftRow.value?.device_id)
    return true;
  return devices.value.length <= 1;
});

/** 组合模式编辑：算法已固定，不再展示左侧算法模型选择 */
const hideModelSelector = computed(() =>
  draftMode.value && !!draftRow.value?.device_id,
);

const emptySelectionText = computed(() => {
  if (draftMode.value && draftRow.value?.device_id)
    return '正在加载摄像头底图...';
  if (draftMode.value)
    return '请选择一个摄像头进行区域配置';
  return '请选择一个摄像头进行区域检测配置';
});

function buildDraftModalSubtitle(row: RegionTableRow) {
  if (row.device_id && row.device_name)
    return `${row.device_name} · ${row.model_name}`;
  return row.model_name;
}

// 过滤后的设备列表
const filteredDevices = computed(() => {
  if (!searchKeyword.value) {
    return devices.value;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return devices.value.filter(
    device =>
      (device.name || '').toLowerCase().includes(keyword) ||
      device.id.toLowerCase().includes(keyword)
  );
});

async function selectDeviceForDraft(device: DeviceInfo) {
  if (!draftRow.value)
    return;

  const row = draftRow.value;
  const config = draftConfig.value ?? createDefaultRegionConfig();

  deviceRegions.value[device.id] = draftRegionsToDeviceRegions(
    config.regions || [],
    device.id,
    row.model_id,
  );

  if (config.image_path) {
    deviceImagePaths.value[device.id] = config.image_path;
    if (config.image_id)
      deviceImageIds.value[device.id] = config.image_id;
  }
  else if (device.cover_image_path) {
    deviceImagePaths.value[device.id] = device.cover_image_path;
  }
  else {
    try {
      const context = await bootstrapDeviceRegionContext(device.id);
      if (context.imagePath)
        deviceImagePaths.value[device.id] = context.imagePath;
      if (context.imageId)
        deviceImageIds.value[device.id] = context.imageId;
      if (context.coverImagePath)
        device.cover_image_path = context.coverImagePath;
    }
    catch (error) {
      console.error('加载设备底图失败', error);
    }
  }

  await nextTick();
  selectedDeviceId.value = device.id;
  await nextTick();
  await tryAutoCaptureIfNoImage(device.id);
}

async function tryAutoCaptureIfNoImage(deviceId: string) {
  if (deviceImagePaths.value[deviceId])
    return;
  if (!regionDrawerRef.value)
    return;
  try {
    await regionDrawerRef.value.handleCapture();
  }
  catch (error) {
    console.error('自动抓拍失败', error);
  }
}

async function loadDraftDevices(draft: AlgorithmTaskDraft, row: RegionTableRow) {
  const bindings = draft.camera_bindings ?? [];
  const filtered = row.device_id
    ? bindings.filter(binding => binding.device_id === row.device_id)
    : bindings.filter(binding =>
      binding.model_ids.some(id => Number(id) === row.model_id),
    );

  if (filtered.length === 0) {
    createMessage.warning('未找到可用摄像头，请返回上一步绑定摄像头与算法');
    devices.value = [];
    return;
  }

  devices.value = filtered.map(binding => ({
    id: binding.device_id,
    name: binding.device_name || binding.device_id,
  } as DeviceInfo));

  await Promise.all(
    devices.value.map(async (device) => {
      try {
        const context = await bootstrapDeviceRegionContext(device.id);
        if (context.coverImagePath)
          device.cover_image_path = context.coverImagePath;
      }
      catch {
        // 封面加载失败不影响继续编辑
      }
    }),
  );

  await selectDeviceForDraft(devices.value[0]);
}

// 选择设备
const selectDevice = async (device: DeviceInfo) => {
  if (draftMode.value) {
    await selectDeviceForDraft(device);
    return;
  }

  try {
    const response = await getDeviceRegions(device.id);
    console.log('selectDevice: 获取区域数据响应:', response);

    const regions = parseDeviceRegionsResponse(response);
    console.log('selectDevice: 解析后的区域数据:', regions, '数量:', regions.length);
    
    // 确保即使数据为空数组，也要设置，这样组件知道已经加载过了
    deviceRegions.value[device.id] = regions;
    
    // 如果有区域，获取对应的图片路径
    if (regions.length > 0 && regions[0].image_path) {
      deviceImagePaths.value[device.id] = regions[0].image_path;
      if (regions[0].image_id) {
        deviceImageIds.value[device.id] = regions[0].image_id;
      }
      console.log('selectDevice: 设置区域图片路径:', regions[0].image_path);
    } else {
      // 如果没有区域图片，使用封面图作为初始图片
      // 优先使用最新的封面图，即使 deviceImagePaths 已经有值，也要检查并更新
      if (device.cover_image_path) {
        deviceImagePaths.value[device.id] = device.cover_image_path;
        console.log('selectDevice: 使用封面图作为初始图片:', device.cover_image_path);
      }
    }
  } catch (error) {
    console.error('加载设备区域配置失败', error);
    // 加载失败时，设置为空数组，表示已尝试加载但没有数据
    deviceRegions.value[device.id] = [];
    // 加载失败时，如果有封面图，使用封面图作为初始图片
    if (device.cover_image_path) {
      deviceImagePaths.value[device.id] = device.cover_image_path;
      console.log('selectDevice: 加载区域失败，使用封面图作为初始图片:', device.cover_image_path);
    }
  }
  
  console.log('selectDevice: 准备设置 selectedDeviceId, deviceRegions:', deviceRegions.value[device.id], 'deviceImagePaths:', deviceImagePaths.value[device.id]);
  
  // 确保图片路径已设置后再设置 selectedDeviceId，这样组件渲染时就能获取到图片路径
  // 使用 nextTick 确保响应式更新已完成
  await nextTick();
  selectedDeviceId.value = device.id;
  
  console.log('selectDevice: selectedDeviceId 已设置，传递给子组件的区域数据:', deviceRegions.value[device.id]);
  
  // 再次使用 nextTick 确保组件已渲染，然后触发图片加载
  await nextTick();
  await tryAutoCaptureIfNoImage(device.id);
};

// 搜索
const handleSearch = () => {
  // 搜索逻辑已在computed中处理
};

// 图片加载错误处理
const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.style.display = 'none';
};

// 区域保存
const handleRegionSave = (regions: DeviceDetectionRegion[]) => {
  if (!selectedDeviceId.value)
    return;

  deviceRegions.value[selectedDeviceId.value] = regions;

  if (draftMode.value && draftRow.value) {
    const config = buildRegionConfigFromDrawResult(
      regions,
      selectedDeviceId.value,
      deviceImageIds.value[selectedDeviceId.value] ?? null,
      deviceImagePaths.value[selectedDeviceId.value] ?? null,
    );
    draftConfig.value = config;
    draftOnSave.value?.(config);
    createMessage.success('区域配置已保存到当前任务');
    return;
  }

  createMessage.success('区域配置已保存');
};

// 图片抓拍
const handleImageCaptured = (imageId: number, imagePath: string) => {
  if (selectedDeviceId.value) {
    deviceImageIds.value[selectedDeviceId.value] = imageId;
    deviceImagePaths.value[selectedDeviceId.value] = imagePath;
  }
};

// 封面更新
const handleCoverUpdated = async (imagePath: string) => {
  if (selectedDeviceId.value) {
    // 更新设备列表中的封面图
    const device = devices.value.find(d => d.id === selectedDeviceId.value);
    if (device) {
      (device as any).cover_image_path = imagePath;
    }
    
    // 同步更新 deviceImagePaths，确保下次打开canvas时使用最新的封面图
    // 如果没有区域图片，则使用新的封面图作为canvas的初始图片
    const regions = deviceRegions.value[selectedDeviceId.value] || [];
    const hasRegionImage = regions.length > 0 && regions[0].image_path;
    if (!hasRegionImage) {
      deviceImagePaths.value[selectedDeviceId.value] = imagePath;
      console.log('封面更新: 同步更新 deviceImagePaths 为新的封面图:', imagePath);
    }
    
    createMessage.success('封面图已更新');

    if (draftMode.value)
      return;

    if (taskId.value)
      await loadTaskDevices(taskId.value);
    else
      await loadDevices();
  }
};

// 加载任务信息，获取关联的模型ID列表
const loadTaskInfo = async (taskId: number) => {
  try {
    const response = await getAlgorithmTask(taskId);
    // 处理响应：可能是直接返回任务对象，也可能是包含 code 的对象
    let task: any = null;
    if (response && typeof response === 'object' && 'code' in response) {
      if (response.code === 0 && response.data) {
        task = response.data;
      } else {
        console.warn('获取任务信息失败:', response.msg);
        return;
      }
    } else if (response && typeof response === 'object' && 'id' in response) {
      // 直接是任务对象
      task = response;
    }
    
    if (task && task.model_ids && Array.isArray(task.model_ids) && task.model_ids.length > 0) {
      taskModelIds.value = task.model_ids;
      console.log('任务关联的模型ID列表:', taskModelIds.value);
    } else {
      taskModelIds.value = null;
      console.log('任务未关联模型或模型列表为空');
    }
  } catch (error) {
    console.error('加载任务信息失败', error);
    taskModelIds.value = null;
  }
};

// 根据任务ID加载关联的摄像头列表
const loadTaskDevices = async (taskId: number) => {
  try {
    const response = await getTaskStreams(taskId);
    // 处理响应：可能是数组，也可能是包含 code 的对象
    let streams: CameraStreamInfo[] = [];
    if (Array.isArray(response)) {
      streams = response;
    } else if (response && typeof response === 'object' && 'code' in response) {
      if (response.code === 0 && response.data && Array.isArray(response.data)) {
        streams = response.data;
      } else {
        createMessage.warning(response.msg || '该任务未关联摄像头');
        devices.value = [];
        return;
      }
    } else {
      createMessage.warning('该任务未关联摄像头');
      devices.value = [];
      return;
    }
    
    // 将 CameraStreamInfo 转换为 DeviceInfo 格式
    devices.value = streams.map(stream => ({
      id: stream.device_id,
      name: stream.device_name,
      http_stream: stream.http_stream,
      rtmp_stream: stream.rtmp_stream,
      source: stream.source,
      cover_image_path: stream.cover_image_path, // 保留封面图路径
    } as DeviceInfo));
    
    // 如果设备有封面图且已被选择，但没有区域图片，使用封面图作为初始图片
    await nextTick();
    if (selectedDeviceId.value) {
      const selectedDevice = devices.value.find(d => d.id === selectedDeviceId.value);
      if (selectedDevice?.cover_image_path && !deviceImagePaths.value[selectedDeviceId.value]) {
        deviceImagePaths.value[selectedDeviceId.value] = selectedDevice.cover_image_path;
      }
    }
    
    if (devices.value.length === 0) {
      createMessage.warning('该任务未关联摄像头');
    }
  } catch (error) {
    console.error('加载任务关联摄像头列表失败', error);
    createMessage.error('加载任务关联摄像头列表失败');
    devices.value = [];
  }
};

// 加载所有设备列表（兼容旧逻辑，当没有传入taskId时使用）
const loadDevices = async () => {
  try {
    const response = await getDeviceList({});
    if (response.code === 0 && response.data) {
      devices.value = response.data;
    }
  } catch (error) {
    console.error('加载设备列表失败', error);
    createMessage.error('加载设备列表失败');
  }
};
</script>

<style lang="less" scoped>
// 变量定义 - 专业简洁配色方案（与 train 模型推理界面保持一致）
@primary-color: #2C3E50;
@secondary-color: #34495E;
@accent-color: #495057;
@success-color: #28A745;
@warning-color: #FFC107;
@error-color: #DC3545;
@light-bg: #F8F9FA;
@light-text: #212529;
@text-secondary: #6C757D;
@text-muted: #868E96;
@gray-color: #ADB5BD;
@border-color: #DEE2E6;
@border-hover: #CED4DA;
@shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
@shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
@shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
@shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

.device-region-detection-drawer {
  display: flex;
  height: 560px;
  max-height: calc(100vh - 120px);
  gap: 16px;
  padding: 12px;
  background: @light-bg;

  .device-list-panel {
    width: 280px;
    background: #ffffff;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    box-shadow: @shadow-md;
    border: 1px solid @border-color;
    overflow: hidden;

      .panel-header {
        padding: 20px;
        border-bottom: 1px solid @border-color;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        font-size: 16px;
        color: @light-text;
        background: @light-bg;
        position: relative;

        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 40px;
          height: 2px;
          background: @primary-color;
        }

        :deep(.ant-input-search) {
          .ant-input {
            border-radius: 6px;
            border: 1px solid @border-color;
            transition: all 0.2s ease;

            &:focus {
              border-color: @primary-color;
              box-shadow: 0 0 0 2px rgba(44, 62, 80, 0.1);
            }
          }

          .ant-input-search-button {
            border-radius: 0 6px 6px 0;
            background: @primary-color;
            border-color: @primary-color;

            &:hover {
              background: @secondary-color;
              border-color: @secondary-color;
            }
          }
        }
      }

    .device-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: @light-bg;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: @gray-color;
        border-radius: 3px;

        &:hover {
          background: @border-hover;
        }
      }

      .device-item {
        display: flex;
        padding: 14px;
        margin-bottom: 12px;
        border: 2px solid @border-color;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: #ffffff;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: transparent;
          transition: all 0.3s ease;
        }

        &:hover {
          background: @light-bg;
          border-color: @border-hover;
          box-shadow: @shadow-sm;

          &::before {
            background: @border-hover;
          }
        }

        &.active {
          border-color: @primary-color;
          background: @light-bg;
          box-shadow: @shadow-sm;

          &::before {
            background: @primary-color;
          }
        }

        .device-cover {
          width: 90px;
          height: 68px;
          border-radius: 6px;
          overflow: hidden;
          margin-right: 14px;
          background: @light-bg;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: @shadow-sm;
          border: 1px solid @border-color;
          flex-shrink: 0;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }

          &:hover img {
            transform: scale(1.05);
          }

          .no-cover {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
          }
        }

        .device-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;

          .device-name {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 6px;
            color: @light-text;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .device-region-count {
            font-size: 12px;
            color: @text-secondary;
            padding: 4px 8px;
            background: @light-bg;
            border-radius: 4px;
            display: inline-block;
            width: fit-content;
            font-weight: 500;
            border: 1px solid @border-color;
          }
        }
      }
    }
  }

  .region-drawer-panel {
    flex: 1;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: @shadow-md;
    border: 1px solid @border-color;
    overflow: hidden;

    &--full {
      flex: 1;
      width: 100%;
    }
  }

  &.draft-fixed-layout {
    gap: 0;
  }

  .empty-selection {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: @shadow-md;
    border: 1px solid @border-color;

    &--full {
      width: 100%;
    }

    :deep(.ant-empty) {
      .ant-empty-description {
        color: @text-secondary;
        font-size: 14px;
      }
    }
  }
}
</style>
