import type { AlgorithmTaskDraft, SnapIntervalUnit } from '../algorithmTaskDraft.types';

export const DEFAULT_SNAP_CRON_EXPRESSION = '0 */5 * * * *';
export const DEFAULT_SNAP_INTERVAL_VALUE = 5;
export const DEFAULT_SNAP_INTERVAL_UNIT = 'minute' as const;

/** 从 camera_bindings 同步 device_ids / model_ids */
export function normalizeRealModelIds(ids?: Array<number | string | null | undefined>): number[] {
  return [...new Set(
    (ids ?? [])
      .map(id => Number(id))
      .filter(id => Number.isFinite(id) && id > 0),
  )];
}

export function syncLegacyIdsFromDraft(draft: AlgorithmTaskDraft) {
  draft.camera_bindings = draft.camera_bindings.map(binding => ({
    ...binding,
    model_ids: normalizeRealModelIds(binding.model_ids),
  }));
  draft.device_ids = draft.camera_bindings.map(binding => binding.device_id);
  const bindingModelIds = normalizeRealModelIds(
    draft.camera_bindings.flatMap(binding => binding.model_ids),
  );
  if (bindingModelIds.length || draft.camera_bindings.length)
    draft.model_ids = bindingModelIds;
  else
    draft.model_ids = normalizeRealModelIds(draft.model_ids);
  draft.detection_config.model_id = draft.model_ids[0] ?? null;
}

export function ensureSnapIntervalDefaults(draft: AlgorithmTaskDraft) {
  if (draft.task_type !== 'snap')
    return;
  if (draft.snap_interval_value == null || draft.snap_interval_value < 1)
    draft.snap_interval_value = DEFAULT_SNAP_INTERVAL_VALUE;
  if (!draft.snap_interval_unit)
    draft.snap_interval_unit = DEFAULT_SNAP_INTERVAL_UNIT;
}

/** 将抓拍间隔转为后端 Cron 表达式（6 段：秒 分 时 日 月 周） */
export function buildSnapCronFromInterval(value: number, unit: SnapIntervalUnit): string {
  const n = Math.max(1, Math.floor(value));
  if (unit === 'second')
    return `*/${n} * * * * *`;
  if (unit === 'minute')
    return `0 */${n} * * * *`;
  return `0 0 */${n} * * *`;
}

export function parseSnapCronFromExpression(
  cron?: string,
): { value: number; unit: SnapIntervalUnit } | null {
  if (!cron?.trim())
    return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 3)
    return null;

  const second = parts[0];
  const minute = parts[1];
  const hour = parts[2];

  const secondMatch = second.match(/^\*\/(\d+)$/);
  if (secondMatch && minute === '*' && hour === '*') {
    return { value: Number(secondMatch[1]), unit: 'second' };
  }

  const minuteMatch = minute.match(/^\*\/(\d+)$/);
  if (second === '0' && minuteMatch && hour === '*') {
    return { value: Number(minuteMatch[1]), unit: 'minute' };
  }

  const hourMatch = hour.match(/^\*\/(\d+)$/);
  if (second === '0' && minute === '0' && hourMatch) {
    return { value: Number(hourMatch[1]), unit: 'hour' };
  }

  return null;
}

export function validateSnapInterval(draft: AlgorithmTaskDraft): string | null {
  if (draft.task_type !== 'snap')
    return null;
  ensureSnapIntervalDefaults(draft);
  const value = draft.snap_interval_value!;
  const unit = draft.snap_interval_unit!;
  if (!Number.isFinite(value) || value < 1)
    return '请填写有效的抓拍间隔';
  if (unit === 'second' && value > 59)
    return '秒级抓拍间隔不能超过 59';
  if (unit === 'minute' && value > 59)
    return '分钟级抓拍间隔不能超过 59';
  if (unit === 'hour' && value > 23)
    return '小时级抓拍间隔不能超过 23';
  return null;
}
