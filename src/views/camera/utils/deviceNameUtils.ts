import { getDeviceList } from '@/api/device/camera';

export interface DeviceNameItem {
  id: string;
  name: string;
}

export function normalizeDeviceName(name: string | undefined | null): string {
  return (name ?? '').trim().toLowerCase();
}

export function isDeviceNameDuplicate(
  name: string,
  devices: DeviceNameItem[],
  excludeId?: string | number,
): boolean {
  const normalized = normalizeDeviceName(name);
  if (!normalized)
    return false;
  const excludeKey = excludeId != null && excludeId !== '' ? String(excludeId) : undefined;
  return devices.some(
    device => device.id !== excludeKey && normalizeDeviceName(device.name) === normalized,
  );
}

export function validateDeviceNameUnique(
  name: string | undefined | null,
  devices: DeviceNameItem[],
  excludeId?: string | number,
): string | null {
  const normalized = normalizeDeviceName(name);
  if (!normalized)
    return null;
  if (isDeviceNameDuplicate(normalized, devices, excludeId))
    return `设备名称「${(name ?? '').trim()}」已存在`;
  return null;
}

export async function fetchAllDeviceNames(): Promise<DeviceNameItem[]> {
  const pageSize = 500;
  let pageNo = 1;
  const all: DeviceNameItem[] = [];
  let total = Number.POSITIVE_INFINITY;

  while (all.length < total) {
    const response = await getDeviceList({ pageNo, pageSize });
    const data = response.code !== undefined ? response.data : response;
    const list = Array.isArray(data) ? data : [];
    total = response.code !== undefined ? (response.total ?? list.length) : list.length;

    all.push(
      ...list.map((device: { id: string | number; name?: string }) => ({
        id: String(device.id),
        name: device.name ?? '',
      })),
    );

    if (list.length < pageSize)
      break;
    pageNo += 1;
  }

  return all;
}
