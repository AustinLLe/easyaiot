// ---- from defenseScheduleUtils.ts ----
import type { AlgorithmTaskDraft, DefenseWeekScheduleEntry } from '../algorithmTaskDraft.types';
import dayjs, { type Dayjs } from 'dayjs';

export function createFullDefenseSchedule(): number[][] {
  return Array.from({ length: 7 }, () => new Array(24).fill(1));
}

export function createEmptyDefenseSchedule(): number[][] {
  return Array.from({ length: 7 }, () => new Array(24).fill(0));
}

export function isFullDefenseSchedule(schedule: number[][]): boolean {
  return schedule.length === 7
    && schedule.every(day => day.length === 24 && day.every(hour => hour === 1));
}

export function ensureDefenseDefaults(draft: AlgorithmTaskDraft) {
  if (draft.is_full_day_defense !== false) {
    draft.defense_mode = 'full';
    draft.defense_schedule = createFullDefenseSchedule();
    draft.is_full_day_defense = true;
    return;
  }
  if (!draft.defense_schedule?.length)
    draft.defense_schedule = createEmptyDefenseSchedule();
  draft.defense_mode = isFullDefenseSchedule(draft.defense_schedule) ? 'full' : 'half';
  draft.is_full_day_defense = false;
  if (!draft.defense_week_start || !draft.defense_week_end) {
    const [start, end] = getCurrentWeekRange();
    draft.defense_week_start = start.format('YYYY-MM-DD');
    draft.defense_week_end = end.format('YYYY-MM-DD');
  }
}

export function validateDefenseSchedule(draft: AlgorithmTaskDraft): string | null {
  ensureDefenseDefaults(draft);
  if (draft.is_full_day_defense !== false)
    return null;
  const savedWeeks = draft.defense_week_schedules ?? [];
  if (savedWeeks.length > 1)
    return '后端仅支持一个每周循环布防模板，请重新确认并应用当前时段';
  if (savedWeeks.length) {
    const hasValidWeek = savedWeeks.some(entry =>
      entry.schedule.some(day => day.some(hour => hour === 1)),
    );
    if (!hasValidWeek)
      return '请至少保存一个包含布防时段的周配置';
    return null;
  }
  const schedule = draft.defense_schedule ?? [];
  const hasSelectedDay = schedule.some(day => day.some(hour => hour === 1));
  if (!hasSelectedDay)
    return '请至少选择一个布防日期和时段，并保存该周配置';
  return null;
}

export function buildDefenseFieldsFromDraft(draft: AlgorithmTaskDraft): {
  defense_mode: string;
  defense_schedule: string;
} {
  ensureDefenseDefaults(draft);
  if (draft.is_full_day_defense !== false) {
    return {
      defense_mode: 'full',
      defense_schedule: JSON.stringify(createFullDefenseSchedule()),
    };
  }
  const schedule = resolvePrimaryDefenseSchedule(
    draft.defense_schedule ?? createEmptyDefenseSchedule(),
    draft.defense_week_schedules,
  );
  return {
    defense_mode: isFullDefenseSchedule(schedule) ? 'full' : 'half',
    defense_schedule: JSON.stringify(schedule),
  };
}

export function parseDefenseScheduleFromTask(
  defenseSchedule?: string | number[][],
): number[][] | null {
  if (!defenseSchedule)
    return null;
  try {
    const schedule = typeof defenseSchedule === 'string'
      ? JSON.parse(defenseSchedule)
      : defenseSchedule;
    if (Array.isArray(schedule) && schedule.length === 7)
      return schedule;
  }
  catch {
    return null;
  }
  return null;
}

export function buildDefenseScheduleValue(
  defenseMode?: string,
  defenseSchedule?: string | number[][],
): { mode: string; schedule: number[][] } {
  const schedule = parseDefenseScheduleFromTask(defenseSchedule)
    ?? (defenseMode === 'full' ? createFullDefenseSchedule() : createEmptyDefenseSchedule());
  return {
    mode: isFullDefenseSchedule(schedule) ? 'full' : (defenseMode || 'half'),
    schedule,
  };
}

export function validateDefenseScheduleValue(schedule: number[][]): string | null {
  const hasSelectedDay = schedule.some(day => day.some(hour => hour === 1));
  if (!hasSelectedDay)
    return '请至少选择一个布防日期和时段';
  return null;
}

/** 获取某日期所在自然周（周一至周日） */
export function getWeekRangeFromDate(date: Dayjs): [Dayjs, Dayjs] {
  const day = date.day();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = date.subtract(diffToMonday, 'day').startOf('day');
  return [monday, monday.add(6, 'day')];
}

export function getCurrentWeekRange(): [Dayjs, Dayjs] {
  return getWeekRangeFromDate(dayjs());
}

export function formatWeekRange(start?: string, end?: string): string {
  if (!start || !end)
    return '';
  return `${start} ~ ${end}`;
}

export type { DefenseWeekScheduleEntry };

export interface DefenseSchedulePickerValue {
  is_full_day_defense: boolean;
  mode: string;
  schedule: number[][];
  defense_week_start?: string;
  defense_week_end?: string;
  defense_week_schedules?: DefenseWeekScheduleEntry[];
  defense_applied_to_all_week_key?: string | null;
}

export function getWeekRangeKey(start: string, end: string): string {
  return `${start}::${end}`;
}

export function parseWeekRangeKey(key: string): [string, string] {
  const [week_start, week_end] = key.split('::');
  return [week_start, week_end];
}

export function cloneScheduleMatrix(source: number[][]): number[][] {
  return source.map(day => [...day]);
}

export function weekSchedulesToMap(entries?: DefenseWeekScheduleEntry[]): Record<string, number[][]> {
  const map: Record<string, number[][]> = {};
  (entries ?? []).forEach((entry) => {
    map[getWeekRangeKey(entry.week_start, entry.week_end)] = cloneScheduleMatrix(entry.schedule);
  });
  return map;
}

export function mapToWeekSchedules(map: Record<string, number[][]>): DefenseWeekScheduleEntry[] {
  return Object.entries(map).map(([key, schedule]) => {
    const [week_start, week_end] = parseWeekRangeKey(key);
    return {
      week_start,
      week_end,
      schedule: cloneScheduleMatrix(schedule),
    };
  }).sort((a, b) => a.week_start.localeCompare(b.week_start));
}

export function resolvePrimaryDefenseSchedule(
  schedule: number[][],
  weekSchedules?: DefenseWeekScheduleEntry[],
): number[][] {
  if (weekSchedules && weekSchedules.length > 1)
    throw new Error('后端仅支持一个每周循环布防模板，不能保存多自然周配置');
  if (weekSchedules?.length)
    return cloneScheduleMatrix(weekSchedules[0].schedule);
  return cloneScheduleMatrix(schedule);
}

export function createDefaultDefensePickerValue(): DefenseSchedulePickerValue {
  const [start, end] = getWeekRangeFromDate(dayjs());
  return {
    is_full_day_defense: true,
    mode: 'full',
    schedule: createFullDefenseSchedule(),
    defense_week_start: start.format('YYYY-MM-DD'),
    defense_week_end: end.format('YYYY-MM-DD'),
    defense_week_schedules: [],
  };
}

// ---- from trackingConfigUtils.ts ----
import type { DetectionConfigDraft } from '../algorithmTaskDraft.types';

export const DEFAULT_TRACKING_SIMILARITY_THRESHOLD = 0.2;
export const DEFAULT_TRACKING_MAX_AGE = 25;
export const DEFAULT_TRACKING_SMOOTH_ALPHA = 0.25;

export function ensureTrackingDefaults(config: DetectionConfigDraft) {
  if (!config.enable_tracking)
    return;
  if (config.tracking_similarity_threshold == null)
    config.tracking_similarity_threshold = DEFAULT_TRACKING_SIMILARITY_THRESHOLD;
  if (config.tracking_max_age == null)
    config.tracking_max_age = DEFAULT_TRACKING_MAX_AGE;
  if (config.tracking_smooth_alpha == null)
    config.tracking_smooth_alpha = DEFAULT_TRACKING_SMOOTH_ALPHA;
}

export function clearTrackingParams(config: DetectionConfigDraft) {
  config.tracking_similarity_threshold = undefined;
  config.tracking_max_age = undefined;
  config.tracking_smooth_alpha = undefined;
}

export function buildTrackingApiFields(config: DetectionConfigDraft, taskType: 'realtime' | 'snap') {
  if (taskType !== 'realtime') {
    return {
      tracking_enabled: false,
      tracking_similarity_threshold: DEFAULT_TRACKING_SIMILARITY_THRESHOLD,
      tracking_max_age: DEFAULT_TRACKING_MAX_AGE,
      tracking_smooth_alpha: DEFAULT_TRACKING_SMOOTH_ALPHA,
    };
  }

  if (config.enable_tracking)
    ensureTrackingDefaults(config);

  return {
    tracking_enabled: !!config.enable_tracking,
    tracking_similarity_threshold: config.tracking_similarity_threshold ?? DEFAULT_TRACKING_SIMILARITY_THRESHOLD,
    tracking_max_age: config.tracking_max_age ?? DEFAULT_TRACKING_MAX_AGE,
    tracking_smooth_alpha: config.tracking_smooth_alpha ?? DEFAULT_TRACKING_SMOOTH_ALPHA,
  };
}

// ---- from cameraPickerUtils.ts ----
export function normalizeDeviceId(id: string | number) {
  return String(id);
}

export function unwrapList<T>(response: unknown): T[] {
  if (!response)
    return [];
  if (Array.isArray(response))
    return response;

  if (typeof response === 'object' && response !== null) {
    const record = response as Record<string, unknown>;
    if (record.code !== undefined && record.data !== undefined) {
      const data = record.data;
      if (Array.isArray(data))
        return data as T[];
      if (data && typeof data === 'object') {
        const nested = data as Record<string, unknown>;
        if (Array.isArray(nested.list))
          return nested.list as T[];
        if (Array.isArray(nested.records))
          return nested.records as T[];
      }
    }
    if (Array.isArray(record.data))
      return record.data as T[];
    if (Array.isArray(record.list))
      return record.list as T[];
    if (Array.isArray(record.records))
      return record.records as T[];
  }

  return [];
}

// ---- from confirmUnsavedAlgorithmTaskExit.ts ----
import { Modal } from 'ant-design-vue';

/** 创建/编辑算法任务中途退出时的二次确认，返回 true 表示允许关闭 */
export function confirmUnsavedAlgorithmTaskExit(): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      title: '提示',
      content: '当前算法尚未保存，是否退出？',
      okText: '是',
      cancelText: '否',
      centered: true,
      getContainer: () => document.body,
      onOk() {
        resolve(true);
      },
      onCancel() {
        resolve(false);
      },
    });
  });
}
