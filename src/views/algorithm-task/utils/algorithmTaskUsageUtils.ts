import { Modal } from 'ant-design-vue';
import {
  listAlgorithmTasks,
  type AlgorithmTask,
} from '@/api/device/algorithm_task';

interface AlgorithmTaskUsageItem {
  id: number;
  task_name: string;
  is_enabled: boolean;
}

let cachedAlgorithmTasks: AlgorithmTask[] | null = null;
let cacheLoading: Promise<AlgorithmTask[]> | null = null;

function normalizeTaskList(response: unknown): AlgorithmTask[] {
  if (!response || typeof response !== 'object')
    return [];
  const payload = response as { code?: number; data?: AlgorithmTask[] };
  if (payload.code !== undefined && payload.code !== 0)
    return [];
  return Array.isArray(payload.data) ? payload.data : [];
}

async function fetchAllAlgorithmTasksFromApi(): Promise<AlgorithmTask[]> {
  const pageSize = 500;
  let pageNo = 1;
  const all: AlgorithmTask[] = [];
  let total = Number.POSITIVE_INFINITY;

  while (all.length < total) {
    const response = await listAlgorithmTasks({ pageNo, pageSize });
    const list = normalizeTaskList(response);
    const responseTotal = (response as { total?: number })?.total;
    total = responseTotal ?? list.length;
    all.push(...list);
    if (list.length < pageSize)
      break;
    pageNo += 1;
  }

  return all;
}

/** 拉取并缓存全量算法任务（与设备名称校验相同，会话内复用） */
export async function preloadAlgorithmTaskUsageCache(force = false): Promise<void> {
  if (!force && cachedAlgorithmTasks)
    return;
  if (!force && cacheLoading) {
    await cacheLoading;
    return;
  }
  cacheLoading = fetchAllAlgorithmTasksFromApi()
    .then((tasks) => {
      cachedAlgorithmTasks = tasks;
      return tasks;
    })
    .finally(() => {
      cacheLoading = null;
    });
  await cacheLoading;
}

export function invalidateAlgorithmTaskUsageCache() {
  cachedAlgorithmTasks = null;
  cacheLoading = null;
}

async function getCachedAlgorithmTasks(): Promise<AlgorithmTask[]> {
  if (cachedAlgorithmTasks)
    return cachedAlgorithmTasks;
  await preloadAlgorithmTaskUsageCache();
  return cachedAlgorithmTasks ?? [];
}

function normalizeTaskEnabled(value: unknown): boolean {
  if (typeof value === 'boolean')
    return value;
  if (typeof value === 'number')
    return value === 1;
  if (typeof value === 'string')
    return value === '1' || value.toLowerCase() === 'true';
  return Boolean(value);
}

function toUsageItem(task: AlgorithmTask): AlgorithmTaskUsageItem {
  return {
    id: task.id,
    task_name: task.task_name || `任务#${task.id}`,
    is_enabled: normalizeTaskEnabled(task.is_enabled),
  };
}

function taskUsesDeviceId(task: AlgorithmTask, deviceId: string): boolean {
  const ids = task.device_ids;
  if (!Array.isArray(ids) || ids.length === 0)
    return false;
  return ids.some(id => String(id) === String(deviceId));
}

function taskUsesModelId(task: AlgorithmTask, modelId: number): boolean {
  const ids = task.model_ids;
  if (!Array.isArray(ids) || ids.length === 0)
    return false;
  return ids.some(id => Number(id) === modelId);
}

async function findLinkedTasks(params: {
  device_id?: string;
  model_id?: number;
}): Promise<AlgorithmTaskUsageItem[]> {
  const tasks = await getCachedAlgorithmTasks();
  const linked = tasks.filter((task) => {
    if (params.device_id)
      return taskUsesDeviceId(task, params.device_id);
    if (params.model_id != null)
      return taskUsesModelId(task, params.model_id);
    return false;
  });
  return sortTasksRunningFirst(linked.map(toUsageItem));
}

function sortTasksRunningFirst(tasks: AlgorithmTaskUsageItem[]): AlgorithmTaskUsageItem[] {
  return [...tasks].sort((a, b) => {
    if (a.is_enabled === b.is_enabled)
      return 0;
    return a.is_enabled ? -1 : 1;
  });
}

function formatTaskNames(tasks: AlgorithmTaskUsageItem[]): string {
  return sortTasksRunningFirst(tasks)
    .map((task) => {
      const statusLabel = task.is_enabled ? '运行中' : '已停止';
      return `${task.task_name}（${statusLabel}）`;
    })
    .join('、');
}

function buildRunningBlockMessage(
  resourceLabel: string,
  resourceName: string,
  linkedTasks: AlgorithmTaskUsageItem[],
  runningTasks: AlgorithmTaskUsageItem[],
): string {
  const stoppedTasks = linkedTasks.filter(task => !task.is_enabled);
  const runningPart = `运行中：${formatTaskNames(runningTasks)}`;
  const stoppedPart = stoppedTasks.length > 0
    ? `；已停止：${formatTaskNames(stoppedTasks)}`
    : '';
  return `${resourceLabel}「${resourceName}」已被算法任务关联。${runningPart}${stoppedPart}。运行中的任务禁止删除，请先停止相关任务。`;
}

function showRunningTaskBlockModal(
  resourceLabel: string,
  resourceName: string,
  linkedTasks: AlgorithmTaskUsageItem[],
  runningTasks: AlgorithmTaskUsageItem[],
) {
  Modal.warning({
    title: '无法删除',
    content: buildRunningBlockMessage(resourceLabel, resourceName, linkedTasks, runningTasks),
    okText: '知道了',
    centered: true,
  });
}

function confirmLinkedTaskDelete(
  resourceLabel: string,
  resourceName: string,
  tasks: AlgorithmTaskUsageItem[],
): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      title: '删除风险提示',
      content: `${resourceLabel}「${resourceName}」已被算法任务关联：${formatTaskNames(tasks)}。删除后相关任务可能无法正常运行，是否仍要删除？`,
      okText: '仍要删除',
      cancelText: '取消',
      centered: true,
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

async function confirmDeleteByUsage(
  resourceLabel: string,
  resourceName: string,
  params: { device_id?: string; model_id?: number },
): Promise<boolean> {
  const linkedTasks = await findLinkedTasks(params);
  const runningTasks = linkedTasks.filter(task => task.is_enabled);

  if (runningTasks.length > 0) {
    showRunningTaskBlockModal(resourceLabel, resourceName, linkedTasks, runningTasks);
    return false;
  }

  if (linkedTasks.length > 0)
    return confirmLinkedTaskDelete(resourceLabel, resourceName, linkedTasks);

  return true;
}

export async function confirmDeleteDevice(
  deviceId: string,
  deviceName?: string,
): Promise<boolean> {
  return confirmDeleteByUsage('摄像头', deviceName || deviceId, { device_id: String(deviceId) });
}

export async function confirmDeleteModel(
  modelId: number | string,
  modelName?: string,
): Promise<boolean> {
  return confirmDeleteByUsage('算法', modelName || String(modelId), { model_id: Number(modelId) });
}
