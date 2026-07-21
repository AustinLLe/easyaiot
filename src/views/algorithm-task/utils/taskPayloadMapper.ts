import type {
  AlertPushDraft,
  AlertRuleDraft,
  AlgorithmParamConfigDraft,
  AlgorithmTaskDraft,
  DetectionConfigDraft,
  RegionDraft,
} from '../algorithmTaskDraft.types';
import type {
  AlgorithmTaskPayload,
  BackendAlertPushConfig,
  BackendAlertRule,
  BackendBindingModel,
  BackendBindingRegion,
  BackendDetectionConfig,
  BackendTaskBinding,
} from '../algorithmTaskPayload.types';
import type { AlgorithmTask } from '@/api/device/algorithm_task';
import {
  buildModelNameMapFromDraft,
  ensureParamConfigs,
  expandComboRows,
  getParamConfigForRow,
  getRegionConfigForRow,
  isCustomRegionConfig,
  syncFlattenRegionsFromConfigs,
} from './paramUtils';
import {
  normalizeAlertRuleBeforeSave,
  resolveAlertPushConfigsForSubmit,
} from './alertUtils';
import {
  buildDefenseFieldsFromDraft,
  createFullDefenseSchedule,
  DEFAULT_TRACKING_MAX_AGE,
  DEFAULT_TRACKING_SIMILARITY_THRESHOLD,
  DEFAULT_TRACKING_SMOOTH_ALPHA,
} from './taskUtils';
import {
  buildSnapCronFromInterval,
  ensureSnapIntervalDefaults,
  syncLegacyIdsFromDraft,
} from './draftCommon';

function toBackendDetectionConfig(
  item: AlgorithmParamConfigDraft['detection_config'],
  global: DetectionConfigDraft,
): BackendDetectionConfig {
  return {
    conf: item.conf,
    iou: item.iou,
    imgsz: item.imgsz ?? global.imgsz ?? 416,
    class_whitelist: [...(item.class_whitelist || [])],
    min_box_area: item.min_box_area,
    max_detections: item.max_detections,
    extract_interval: item.extract_interval ?? global.extract_interval ?? 25,
    device: global.device ?? 'auto',
  };
}

function buildModelEntry(
  draft: AlgorithmTaskDraft,
  row: ReturnType<typeof expandComboRows>[number],
  global: DetectionConfigDraft,
): BackendBindingModel {
  const config = getParamConfigForRow(draft, row);
  return {
    model_id: row.model_id,
    model_name: row.model_name,
    detection_config: toBackendDetectionConfig(config.detection_config, global),
    algorithm_params: config.custom_enabled
      ? { ...config.algorithm_params }
      : {},
  };
}

function collectBindingRegions(
  draft: AlgorithmTaskDraft,
  deviceId: string,
  modelRows: ReturnType<typeof expandComboRows>,
): BackendBindingRegion[] {
  const result: BackendBindingRegion[] = [];
  const seen = new Set<string>();

  for (const row of modelRows) {
    if (row.device_id !== deviceId)
      continue;
    const config = getRegionConfigForRow(draft, row);
    if (!isCustomRegionConfig(config))
      continue;
    for (const region of config.regions) {
      if (seen.has(region.region_id))
        continue;
      seen.add(region.region_id);
      result.push({
        region_id: region.region_id,
        region_name: region.region_name,
        scope_mode: 'custom',
        points: region.points.map(point => [...point]),
      });
    }
  }

  return result;
}

function buildBindingsFromDraft(draft: AlgorithmTaskDraft): BackendTaskBinding[] {
  const modelNameMap = buildModelNameMapFromDraft(draft);
  ensureParamConfigs(draft, modelNameMap);
  syncFlattenRegionsFromConfigs(draft);

  const comboRows = expandComboRows(draft, modelNameMap);
  const global = draft.detection_config;

  return draft.camera_bindings.map((binding) => {
    const modelRows = comboRows.filter(row => row.device_id === binding.device_id);
    return {
      device_id: binding.device_id,
      device_name: binding.device_name,
      models: binding.model_ids.map((rawModelId) => {
        const modelId = Number(rawModelId);
        const row = modelRows.find(item => item.model_id === modelId)
          ?? {
            key: `${binding.device_id}__${modelId}`,
            device_id: binding.device_id,
            device_name: binding.device_name,
            model_id: modelId,
            model_name: draft.model_name_map?.[modelId] ?? `模型 ${modelId}`,
          };
        return buildModelEntry(draft, row, global);
      }),
      regions: collectBindingRegions(draft, binding.device_id, comboRows),
    };
  });
}

function resolveDeviceIdForRule(rule: AlertRuleDraft, draft: AlgorithmTaskDraft): string | null {
  if (rule.scope.device_id)
    return rule.scope.device_id;

  if (rule.scope.region_id) {
    const matched = draft.regions.find(region => region.region_id === rule.scope.region_id);
    if (matched?.device_id)
      return matched.device_id;
  }

  const modelId = rule.conditions.find(condition => condition.model_id != null)?.model_id;
  if (modelId != null) {
    const binding = draft.camera_bindings.find(item =>
      item.model_ids.some(id => Number(id) === Number(modelId)),
    );
    if (binding)
      return binding.device_id;
  }

  return draft.camera_bindings[0]?.device_id ?? null;
}

function collectPushIdsForRule(ruleId: string, pushConfigs: AlertPushDraft[]): string[] {
  return pushConfigs
    .filter(push => push.enabled && push.rule_ids?.includes(ruleId))
    .map(push => push.push_id);
}

function mapAlertRuleToBackend(
  rule: AlertRuleDraft,
  draft: AlgorithmTaskDraft,
  pushConfigs: AlertPushDraft[],
): BackendAlertRule {
  const normalized = normalizeAlertRuleBeforeSave({
    ...rule,
    conditions: rule.conditions.map(condition => ({ ...condition })),
    scope: { ...rule.scope },
  });

  return {
    rule_id: normalized.rule_id,
    rule_seq: normalized.rule_seq ?? 1,
    rule_name: normalized.rule_name,
    enabled: normalized.enabled,
    severity: normalized.severity ?? 'medium',
    scope: {
      type: normalized.scope.type,
      device_id: resolveDeviceIdForRule(normalized, draft),
      region_id: normalized.scope.region_id,
      line_id: normalized.scope.line_id,
    },
    conditions: normalized.conditions.map(condition => ({
      seq: condition.seq,
      model_id: Number(condition.model_id),
      model_name: condition.model_name,
      class_name: condition.class_name,
      operator: condition.operator ?? '>=',
      count: condition.count ?? 1,
    })),
    logic_expression: normalized.logic_expression,
    trigger: {
      duration_sec: normalized.duration_sec ?? 0,
      alarm_suppress_time: normalized.alarm_suppress_time ?? 300,
    },
    clip_record: {
      enabled: !!normalized.clip_record_enabled,
      before_sec: normalized.clip_before_sec ?? 10,
      after_sec: normalized.clip_after_sec ?? 10,
    },
    push_ids: collectPushIdsForRule(normalized.rule_id, pushConfigs),
  };
}

function mapAlertPushToBackend(push: AlertPushDraft): BackendAlertPushConfig {
  const resolved = resolveAlertPushConfigsForSubmit([push])[0];
  return {
    push_id: resolved.push_id,
    push_name: resolved.push_name,
    enabled: resolved.enabled,
    push_mode: resolved.push_mode ?? 'user',
    rule_ids: resolved.rule_ids ?? [],
    channels: resolved.channels ?? [],
    recipient_user_ids: resolved.recipient_user_ids ?? [],
    address_profile_ids: resolved.address_profile_ids ?? [],
    // Keep concrete recipients/phones when the push rule is submitted. The
    // VIDEO service needs these at alert time; omitting them made every rule
    // display-only and impossible to execute.
    channel_config: resolved.channel_config ?? {},
    content: {
      title_template: resolved.content.title_template,
      include_fields: resolved.content.include_fields,
      remark: resolved.content.remark,
    },
  };
}

function parseDefenseScheduleMatrix(draft: AlgorithmTaskDraft): number[][] {
  const defenseFields = buildDefenseFieldsFromDraft(draft);
  try {
    const parsed = JSON.parse(defenseFields.defense_schedule);
    if (Array.isArray(parsed))
      return parsed;
  }
  catch {
    // ignore
  }
  return draft.is_full_day_defense !== false
    ? createFullDefenseSchedule()
    : (draft.defense_schedule ?? createFullDefenseSchedule());
}

/** 向导 draft → 后端完整任务 JSON（同学模板） */
export function buildBackendTaskPayloadFromDraft(
  draft: AlgorithmTaskDraft,
  options?: { is_enabled?: boolean; forUpdate?: boolean },
): AlgorithmTaskPayload {
  syncLegacyIdsFromDraft(draft);
  ensureParamConfigs(draft, buildModelNameMapFromDraft(draft));
  if (draft.task_type === 'snap')
    ensureSnapIntervalDefaults(draft);

  const defenseFields = buildDefenseFieldsFromDraft(draft);
  const pushConfigs = resolveAlertPushConfigsForSubmit(draft.alert_push_configs ?? []);
  const rules = (draft.alert_rules ?? []).map(rule =>
    mapAlertRuleToBackend(rule, draft, pushConfigs),
  );

  const trackingEnabled = draft.task_type === 'realtime' && !!draft.detection_config.enable_tracking;

  const payload: AlgorithmTaskPayload = {
    task_name: draft.task_name.trim(),
    task_type: draft.task_type,
    task_mode: draft.task_mode ?? 'wizard',
    is_enabled: options?.is_enabled ?? false,
    schedule: {
      is_full_day_defense: draft.is_full_day_defense !== false,
      defense_mode: defenseFields.defense_mode,
      defense_schedule: parseDefenseScheduleMatrix(draft),
    },
    snap_config: draft.task_type === 'snap'
      ? {
          snap_interval_value: draft.snap_interval_value!,
          snap_interval_unit: draft.snap_interval_unit!,
          cron_expression: buildSnapCronFromInterval(
            draft.snap_interval_value!,
            draft.snap_interval_unit!,
          ),
          frame_skip: draft.detection_config.extract_interval ?? 25,
        }
      : null,
    tracking_config: {
      enabled: trackingEnabled,
      similarity_threshold:
        draft.detection_config.tracking_similarity_threshold ?? DEFAULT_TRACKING_SIMILARITY_THRESHOLD,
      max_age: draft.detection_config.tracking_max_age ?? DEFAULT_TRACKING_MAX_AGE,
      smooth_alpha: draft.detection_config.tracking_smooth_alpha ?? DEFAULT_TRACKING_SMOOTH_ALPHA,
    },
    bindings: buildBindingsFromDraft(draft),
    alert_config: {
      enabled: rules.some(rule => rule.enabled),
      rules,
    },
    alert_push_configs: pushConfigs.map(mapAlertPushToBackend),
    device_ids: [...draft.device_ids],
    model_ids: [...draft.model_ids],
    extract_interval: draft.detection_config.extract_interval ?? 25,
    tracking_enabled: trackingEnabled,
    tracking_similarity_threshold:
      draft.detection_config.tracking_similarity_threshold ?? DEFAULT_TRACKING_SIMILARITY_THRESHOLD,
    tracking_max_age: draft.detection_config.tracking_max_age ?? DEFAULT_TRACKING_MAX_AGE,
    tracking_smooth_alpha:
      draft.detection_config.tracking_smooth_alpha ?? DEFAULT_TRACKING_SMOOTH_ALPHA,
    defense_mode: defenseFields.defense_mode,
    defense_schedule: defenseFields.defense_schedule,
    alert_event_enabled: rules.some(rule => rule.enabled),
    alert_notification_enabled: (draft.alert_push_configs ?? []).some(push => push.enabled),
    alarm_suppress_time: rules[0]?.trigger.alarm_suppress_time ?? 300,
  };

  if (payload.snap_config) {
    payload.cron_expression = payload.snap_config.cron_expression;
    payload.frame_skip = payload.snap_config.frame_skip;
  }

  if (options?.forUpdate) {
    const updatePayload = { ...payload };
    delete (updatePayload as { is_enabled?: boolean }).is_enabled;
    return updatePayload;
  }

  return payload;
}

export function isAlgorithmTaskPayload(value: unknown): value is AlgorithmTaskPayload {
  if (!value || typeof value !== 'object')
    return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.bindings) && record.schedule != null;
}

export function extractTaskPayloadFromAlgorithmTask(task: AlgorithmTask): AlgorithmTaskPayload | null {
  const record = task as Record<string, unknown>;
  if (isAlgorithmTaskPayload(record))
    return record as AlgorithmTaskPayload;
  if (isAlgorithmTaskPayload(record.task_config))
    return record.task_config as AlgorithmTaskPayload;
  if (typeof record.config_json === 'string') {
    try {
      const parsed = JSON.parse(record.config_json);
      if (isAlgorithmTaskPayload(parsed))
        return parsed;
    }
    catch {
      return null;
    }
  }
  if (isAlgorithmTaskPayload(record.config_json))
    return record.config_json as AlgorithmTaskPayload;
  return null;
}
