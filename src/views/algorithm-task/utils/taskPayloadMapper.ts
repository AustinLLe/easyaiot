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
  normalizeRealModelIds,
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
    draw_objects: item.draw_objects ? { ...item.draw_objects } : undefined,
    draw_style: item.draw_style ? { ...item.draw_style } : undefined,
  };
}

function buildModelEntry(
  draft: AlgorithmTaskDraft,
  row: ReturnType<typeof expandComboRows>[number],
  global: DetectionConfigDraft,
): BackendBindingModel {
  const config = getParamConfigForRow(draft, row);
  const regionConfig = getRegionConfigForRow(draft, row);
  return {
    model_id: row.model_id,
    model_name: row.model_name,
    detection_config: toBackendDetectionConfig(config.detection_config, global),
    algorithm_params: config.custom_enabled
      ? { ...config.algorithm_params }
      : {},
    regions: isCustomRegionConfig(regionConfig)
      ? regionConfig.regions.map(region => ({
          region_id: region.region_id,
          region_name: region.region_name,
          scope_mode: 'custom',
          points: region.points.map(point => [...point]),
        }))
      : [],
  };
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
      models: normalizeRealModelIds(binding.model_ids).map((rawModelId) => {
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
      regions: [],
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

function resolveTargetModelIdForRule(rule: AlertRuleDraft): number | null {
  if (rule.target_model_id != null)
    return Number(rule.target_model_id);

  const conditionModelId = rule.conditions.find(condition => condition.model_id != null)?.model_id;
  return conditionModelId != null ? Number(conditionModelId) : null;
}

function resolveInheritedDynamicRegion(
  rule: AlertRuleDraft,
  draft: AlgorithmTaskDraft,
): RegionDraft | null {
  const deviceId = resolveDeviceIdForRule(rule, draft);
  const modelId = resolveTargetModelIdForRule(rule);
  if (!deviceId || modelId == null)
    return null;

  const modelNameMap = buildModelNameMapFromDraft(draft);
  const row = expandComboRows(draft, modelNameMap).find(item =>
    item.device_id === deviceId && Number(item.model_id) === Number(modelId),
  );
  if (!row)
    return null;

  const config = getRegionConfigForRow(draft, row);
  return config.regions.find(region =>
    region.device_id === deviceId && (region.points?.length ?? 0) >= 3,
  ) ?? null;
}

function buildDynamicGeometryForRule(
  rule: AlertRuleDraft,
  inheritedRegion: RegionDraft | null,
): BackendAlertRule['dynamic_geometry'] {
  if (!rule.dynamic_geometry)
    return undefined;

  const ownPoints = rule.dynamic_geometry.points ?? [];
  if (ownPoints.length > 0) {
    return {
      ...rule.dynamic_geometry,
      points: ownPoints.map(point => [...point]),
    };
  }

  return {
    ...rule.dynamic_geometry,
    points: inheritedRegion?.points.map(point => [...point]) ?? [],
  };
}

function resolveRegionIdForRule(rule: AlertRuleDraft, inheritedRegion: RegionDraft | null): string | null {
  if (rule.scope.region_id)
    return rule.scope.region_id;
  if ((rule.dynamic_geometry?.points?.length ?? 0) > 0)
    return null;
  return inheritedRegion?.region_id ?? null;
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

  const deviceId = resolveDeviceIdForRule(normalized, draft);
  const inheritedRegion = normalized.behavior_type && normalized.behavior_type !== 'static_count'
    ? resolveInheritedDynamicRegion(normalized, draft)
    : null;
  const regionId = resolveRegionIdForRule(normalized, inheritedRegion);

  return {
    rule_id: normalized.rule_id,
    rule_seq: normalized.rule_seq ?? 1,
    rule_name: normalized.rule_name,
    enabled: normalized.enabled,
    severity: normalized.severity ?? 'medium',
    behavior_type: normalized.behavior_type ?? 'static_count',
    target_model_id: normalized.target_model_id ?? null,
    target_classes: [...(normalized.target_classes ?? [])],
    dynamic_geometry: buildDynamicGeometryForRule(normalized, inheritedRegion),
    dynamic_trigger: normalized.dynamic_trigger ? { ...normalized.dynamic_trigger } : undefined,
    scope: {
      type: normalized.scope.type,
      device_id: deviceId,
      region_id: regionId,
      line_id: normalized.scope.line_id,
    },
    conditions: normalized.conditions.map(condition => ({
      seq: condition.seq,
      key: `cond_${condition.seq}`,
      field: 'model_class_count',
      model_id: Number(condition.model_id),
      model_name: condition.model_name,
      class_name: condition.class_name,
      operator: condition.operator ?? '>=',
      count: condition.count ?? 1,
      value: condition.count ?? 1,
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
    content: {
      platform_name: resolved.content.platform_name,
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
  draft.param_config_mode = 'combo';
  syncLegacyIdsFromDraft(draft);
  ensureParamConfigs(draft, buildModelNameMapFromDraft(draft));
  if (draft.task_type === 'snap')
    ensureSnapIntervalDefaults(draft);

  const defenseFields = buildDefenseFieldsFromDraft(draft);
  const pushConfigs = resolveAlertPushConfigsForSubmit(draft.alert_push_configs ?? []);
  const rules = (draft.alert_rules ?? []).map(rule =>
    mapAlertRuleToBackend(rule, draft, pushConfigs),
  );

  const analysisMode = draft.task_type === 'realtime' ? (draft.analysis_mode ?? 'static') : 'static';
  const trackingEnabled = draft.task_type === 'realtime'
    && (analysisMode === 'dynamic' || !!draft.detection_config.enable_tracking);
  const dynamicTrackingConfig = rules.find(rule =>
    rule.enabled && rule.behavior_type !== 'static_count' && rule.dynamic_trigger,
  )?.dynamic_trigger;
  const trackingSimilarityThreshold =
    dynamicTrackingConfig?.matching_threshold
    ?? draft.detection_config.tracking_similarity_threshold
    ?? DEFAULT_TRACKING_SIMILARITY_THRESHOLD;
  const trackingMaxAge =
    dynamicTrackingConfig?.lost_track_buffer
    ?? draft.detection_config.tracking_max_age
    ?? DEFAULT_TRACKING_MAX_AGE;
  const trackingSmoothAlpha =
    dynamicTrackingConfig?.smooth_alpha
    ?? draft.detection_config.tracking_smooth_alpha
    ?? DEFAULT_TRACKING_SMOOTH_ALPHA;

  const payload: AlgorithmTaskPayload = {
    task_name: draft.task_name.trim(),
    task_type: draft.task_type,
    analysis_mode: analysisMode,
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
      backend: trackingEnabled ? 'supervision' : 'simple',
      tracker: trackingEnabled ? 'bytetrack' : 'simple',
      similarity_threshold: trackingSimilarityThreshold,
      minimum_matching_threshold: trackingSimilarityThreshold,
      max_age: trackingMaxAge,
      max_lost_frames: trackingMaxAge,
      smooth_alpha: trackingSmoothAlpha,
      frame_rate: 30,
    },
    bindings: buildBindingsFromDraft(draft),
    alert_config: {
      enabled: rules.some(rule => rule.enabled),
      rules,
    },
    alert_push_configs: pushConfigs.map(mapAlertPushToBackend),
    device_ids: [...draft.device_ids],
    model_ids: normalizeRealModelIds(draft.model_ids),
    extract_interval: dynamicTrackingConfig?.extract_interval ?? draft.detection_config.extract_interval ?? 25,
    tracking_enabled: trackingEnabled,
    tracking_similarity_threshold: trackingSimilarityThreshold,
    tracking_max_age: trackingMaxAge,
    tracking_smooth_alpha: trackingSmoothAlpha,
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

  if (trackingEnabled && dynamicTrackingConfig?.extract_interval) {
    payload.bindings.forEach((binding) => {
      binding.models.forEach((model) => {
        model.detection_config.extract_interval = dynamicTrackingConfig.extract_interval!;
      });
    });
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
