import type { AlgorithmTask } from '@/api/device/algorithm_task';
import { listAlgorithmTasks } from '@/api/device/algorithm_task';
import type { AlgorithmTaskDraft, AlgorithmTaskMode } from '../algorithmTaskDraft.types';

// ---- task mode map ----
const MODE_STORAGE_KEY = 'algorithm_task_mode_map_v1';

type TaskModeMap = Record<string, AlgorithmTaskMode>;

function loadModeMap(): TaskModeMap {
  try {
    const raw = localStorage.getItem(MODE_STORAGE_KEY);
    if (!raw)
      return {};
    const parsed = JSON.parse(raw) as TaskModeMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  }
  catch {
    return {};
  }
}

function persistModeMap(map: TaskModeMap) {
  localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(map));
}

export function setTaskMode(taskId: number, mode: AlgorithmTaskMode) {
  const map = loadModeMap();
  map[String(taskId)] = mode;
  persistModeMap(map);
}

export function removeTaskMode(taskId: number) {
  const map = loadModeMap();
  delete map[String(taskId)];
  persistModeMap(map);
}

export function getTaskModeFromMap(taskId: number): AlgorithmTaskMode | undefined {
  return loadModeMap()[String(taskId)];
}

export function resolveTaskMode(
  task: AlgorithmTask,
  fallback: AlgorithmTaskMode = 'wizard',
): AlgorithmTaskMode {
  if (task.task_mode === 'wizard')
    return 'wizard';
  const mapped = getTaskModeFromMap(task.id);
  if (mapped === 'wizard')
    return 'wizard';
  return fallback;
}

export function enrichTaskWithMode(
  task: AlgorithmTask,
  fallback: AlgorithmTaskMode = 'wizard',
): AlgorithmTask {
  return {
    ...task,
    task_mode: resolveTaskMode(task, fallback),
  };
}

// ---- mock algorithm tasks ----
const MOCK_STORAGE_KEY = 'algorithm_task_mock_records_v1';

export interface MockAlgorithmTaskRecord {
  id: number;
  task: AlgorithmTask;
  draft: AlgorithmTaskDraft;
  submitPayload: Record<string, unknown>;
}

function loadMockRecords(): MockAlgorithmTaskRecord[] {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw)
      return [];
    const parsed = JSON.parse(raw) as MockAlgorithmTaskRecord[];
    return Array.isArray(parsed) ? parsed : [];
  }
  catch {
    return [];
  }
}

function persistMockRecords(records: MockAlgorithmTaskRecord[]) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(records));
}

let mockRecords: MockAlgorithmTaskRecord[] = loadMockRecords();

export function isMockAlgorithmTask(id: number) {
  return id < 0;
}

export function getMockAlgorithmTasks(): AlgorithmTask[] {
  return mockRecords.map((record) => {
    setTaskMode(record.id, 'wizard');
    return enrichTaskWithMode({
      ...record.task,
      task_mode: 'wizard',
    });
  });
}

export function getMockDraftByTaskId(id: number): AlgorithmTaskDraft | null {
  const record = mockRecords.find(item => item.id === id);
  if (!record)
    return null;
  return JSON.parse(JSON.stringify(record.draft)) as AlgorithmTaskDraft;
}

function buildModelNames(draft: AlgorithmTaskDraft): string {
  const map = draft.model_name_map ?? {};
  const names = (draft.model_ids ?? []).map(id => map[id] || `模型${id}`);
  return names.filter(Boolean).join(', ') || '--';
}

export function createMockRecordFromDraft(
  draft: AlgorithmTaskDraft,
  submitPayload: Record<string, unknown>,
): MockAlgorithmTaskRecord {
  const id = -Date.now();
  const task: AlgorithmTask = {
    id,
    task_name: draft.task_name.trim(),
    task_code: `mock_${Math.abs(id)}`,
    task_type: draft.task_type,
    device_ids: [...(draft.device_ids ?? [])],
    device_names: draft.camera_bindings.map(binding => binding.device_name),
    model_ids: [...(draft.model_ids ?? [])],
    model_names: buildModelNames(draft),
    task_mode: 'wizard',
    is_enabled: false,
    status: 0,
    total_frames: 0,
    total_detections: 0,
  };
  return {
    id,
    task,
    draft: JSON.parse(JSON.stringify(draft)) as AlgorithmTaskDraft,
    submitPayload: JSON.parse(JSON.stringify(submitPayload)),
  };
}

export function addMockAlgorithmTask(
  draft: AlgorithmTaskDraft,
  submitPayload: Record<string, unknown>,
): AlgorithmTask {
  const record = createMockRecordFromDraft(draft, submitPayload);
  mockRecords = [record, ...mockRecords];
  persistMockRecords(mockRecords);
  setTaskMode(record.id, 'wizard');
  return { ...record.task };
}

export function updateMockAlgorithmTask(
  id: number,
  draft: AlgorithmTaskDraft,
  submitPayload: Record<string, unknown>,
): AlgorithmTask | null {
  const index = mockRecords.findIndex(item => item.id === id);
  if (index < 0)
    return null;
  const prev = mockRecords[index];
  const updated = createMockRecordFromDraft(draft, submitPayload);
  updated.id = id;
  updated.task.id = id;
  updated.task.is_enabled = prev.task.is_enabled;
  updated.task.task_code = prev.task.task_code;
  mockRecords[index] = updated;
  persistMockRecords(mockRecords);
  setTaskMode(id, 'wizard');
  return { ...updated.task };
}

export function deleteMockAlgorithmTask(id: number): boolean {
  const next = mockRecords.filter(item => item.id !== id);
  if (next.length === mockRecords.length)
    return false;
  mockRecords = next;
  persistMockRecords(mockRecords);
  removeTaskMode(id);
  return true;
}

export function setMockTaskEnabled(id: number, enabled: boolean): AlgorithmTask | null {
  const record = mockRecords.find(item => item.id === id);
  if (!record)
    return null;
  record.task.is_enabled = enabled;
  persistMockRecords(mockRecords);
  return { ...record.task };
}

export interface MockTaskListFilter {
  search?: string;
  task_type?: 'realtime' | 'snap' | '';
  is_enabled?: boolean | number | string;
}

export function filterMockAlgorithmTasks(
  tasks: AlgorithmTask[],
  filter: MockTaskListFilter = {},
): AlgorithmTask[] {
  const keyword = filter.search?.trim().toLowerCase() ?? '';
  return tasks.filter((task) => {
    if (keyword && !task.task_name?.toLowerCase().includes(keyword))
      return false;
    if (filter.task_type && task.task_type !== filter.task_type)
      return false;
    if (filter.is_enabled !== undefined && filter.is_enabled !== '') {
      const enabled = filter.is_enabled === true
        || filter.is_enabled === 1
        || filter.is_enabled === '1'
        || filter.is_enabled === 'true';
      if (task.is_enabled !== enabled)
        return false;
    }
    return true;
  });
}

export async function fetchAlgorithmTaskListMerged(params: {
  page?: number;
  pageNo?: number;
  pageSize?: number;
  search?: string;
  task_type?: 'realtime' | 'snap' | 'patrol';
  is_enabled?: number;
}) {
  const filter: MockTaskListFilter = {
    search: params.search,
    task_type: params.task_type ?? '',
    is_enabled: params.is_enabled,
  };
  const mockItems = filterMockAlgorithmTasks(getMockAlgorithmTasks(), filter);
  const pageNo = Number(params.pageNo ?? params.page ?? 1) || 1;
  const pageSize = Number(params.pageSize ?? 10) || 10;

  if (mockItems.length === 0) {
    const response = await listAlgorithmTasks({
      ...params,
      pageNo,
      pageSize,
    });
    if (response.code === 0) {
      return {
        ...response,
        data: (response.data ?? []).map(item => enrichTaskWithMode(item)),
        total: response.total ?? response.data?.length ?? 0,
      };
    }
    return response;
  }

  let apiItems: AlgorithmTask[] = [];
  let apiTotal = 0;
  try {
    const response = await listAlgorithmTasks({
      ...params,
      pageNo: 1,
      pageSize: 10000,
    });
    if (response.code === 0) {
      apiItems = response.data ?? [];
      apiTotal = response.total ?? apiItems.length;
    }
  }
  catch (error) {
    console.warn('[mockAlgorithmTaskStore] 后端列表加载失败，仅展示本地 mock 任务', error);
  }

  const apiItemsFiltered = apiItems
    .filter(item => !isMockAlgorithmTask(item.id))
    .map(item => enrichTaskWithMode(item));
  const merged = [...mockItems, ...apiItemsFiltered];
  const offset = (pageNo - 1) * pageSize;
  const paged = merged.slice(offset, offset + pageSize);

  return {
    code: 0,
    msg: 'ok',
    data: paged,
    total: mockItems.length + apiTotal,
  };
}

// ---- wizard drafts ----
const DRAFT_STORAGE_KEY = 'algorithm_task_wizard_drafts_v1';

interface StoredWizardDraft {
  taskId: number;
  draft: AlgorithmTaskDraft;
  submitPayload: Record<string, unknown>;
}

function loadWizardDraftRecords(): StoredWizardDraft[] {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw)
      return [];
    const parsed = JSON.parse(raw) as StoredWizardDraft[];
    return Array.isArray(parsed) ? parsed : [];
  }
  catch {
    return [];
  }
}

function persistWizardDraftRecords(records: StoredWizardDraft[]) {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(records));
}

export function saveWizardDraft(
  taskId: number,
  draft: AlgorithmTaskDraft,
  submitPayload: Record<string, unknown>,
) {
  if (isMockAlgorithmTask(taskId))
    return;
  const records = loadWizardDraftRecords().filter(item => item.taskId !== taskId);
  records.push({
    taskId,
    draft: JSON.parse(JSON.stringify(draft)) as AlgorithmTaskDraft,
    submitPayload: JSON.parse(JSON.stringify(submitPayload)),
  });
  persistWizardDraftRecords(records);
}

export function getWizardDraftByTaskId(taskId: number): AlgorithmTaskDraft | null {
  if (isMockAlgorithmTask(taskId))
    return null;
  const record = loadWizardDraftRecords().find(item => item.taskId === taskId);
  if (!record)
    return null;
  return JSON.parse(JSON.stringify(record.draft)) as AlgorithmTaskDraft;
}

export function getWizardSubmitPayloadByTaskId(taskId: number): Record<string, unknown> | null {
  if (isMockAlgorithmTask(taskId))
    return null;
  const record = loadWizardDraftRecords().find(item => item.taskId === taskId);
  if (!record)
    return null;
  return JSON.parse(JSON.stringify(record.submitPayload)) as Record<string, unknown>;
}

export function removeWizardDraft(taskId: number) {
  if (isMockAlgorithmTask(taskId))
    return;
  const next = loadWizardDraftRecords().filter(item => item.taskId !== taskId);
  persistWizardDraftRecords(next);
}
