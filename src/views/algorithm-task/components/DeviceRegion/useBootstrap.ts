import { getDeviceInfo } from '@/api/device/camera';
import {
  getDeviceRegions,
  type DeviceDetectionRegion,
} from '@/api/device/device_detection_region';

export interface DeviceRegionBootstrapResult {
  serverRegions: DeviceDetectionRegion[];
  imageId: number | null;
  imagePath: string | null;
  coverImagePath: string | null;
}

function unwrapData<T>(response: unknown): T | null {
  if (!response || typeof response !== 'object')
    return null;

  if ('code' in response) {
    const wrapped = response as { code?: number; data?: T; msg?: string };
    if (wrapped.code === 0 && wrapped.data !== undefined)
      return wrapped.data;
    return null;
  }

  if ('data' in response)
    return (response as { data: T }).data;

  return response as T;
}

/** 解析 getDeviceRegions 多种响应格式（与 DeviceRegionDetectionDrawer 一致） */
export function parseDeviceRegionsResponse(response: unknown): DeviceDetectionRegion[] {
  if (Array.isArray(response))
    return response;

  if (!response || typeof response !== 'object')
    return [];

  if ('code' in response) {
    const wrapped = response as { code?: number; data?: DeviceDetectionRegion[] };
    if (wrapped.code === 0 && Array.isArray(wrapped.data))
      return wrapped.data;
    return [];
  }

  if ('data' in response && Array.isArray((response as { data: unknown }).data))
    return (response as { data: DeviceDetectionRegion[] }).data;

  return [];
}

/**
 * 加载设备区域与底图上下文：优先已有区域图，否则回退到摄像头封面。
 * 与任务列表「区域检测配置」中 selectDevice 逻辑对齐。
 */
export async function bootstrapDeviceRegionContext(
  deviceId: string,
): Promise<DeviceRegionBootstrapResult> {
  let serverRegions: DeviceDetectionRegion[] = [];
  let imageId: number | null = null;
  let imagePath: string | null = null;
  let coverImagePath: string | null = null;

  try {
    const response = await getDeviceRegions(deviceId);
    serverRegions = parseDeviceRegionsResponse(response);

    if (serverRegions.length > 0 && serverRegions[0].image_path) {
      imagePath = serverRegions[0].image_path;
      imageId = serverRegions[0].image_id ?? null;
    }
  }
  catch (error) {
    console.error('加载设备区域配置失败', error);
    serverRegions = [];
  }

  try {
    const deviceResponse = await getDeviceInfo(deviceId);
    const device = unwrapData<{ cover_image_path?: string }>(deviceResponse)
      ?? (deviceResponse as { cover_image_path?: string } | null);

    coverImagePath = device?.cover_image_path ?? null;

    if (!imagePath && coverImagePath)
      imagePath = coverImagePath;
  }
  catch (error) {
    console.error('加载设备封面失败', error);
  }

  return {
    serverRegions,
    imageId,
    imagePath,
    coverImagePath,
  };
}
