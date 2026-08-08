import type {
  AlgorithmTaskDraft,
  AlgorithmTaskSectionKey,
  DetectionConfigDraft,
} from '../../algorithmTaskDraft.types';
import type { AlgorithmTask } from '@/api/device/algorithm_task';
import {
  createEmptyAlertRule,
  migrateAlertRule,
} from '../../utils/alertUtils';
import {
  createFullDefenseSchedule,
  createEmptyDefenseSchedule,
  getCurrentWeekRange,
  validateDefenseSchedule,
} from '../../utils/taskUtils';
import {
  DEFAULT_TRACKING_MAX_AGE,
  DEFAULT_TRACKING_SIMILARITY_THRESHOLD,
  DEFAULT_TRACKING_SMOOTH_ALPHA,
} from '../../utils/taskUtils';
import { resolveTaskMode } from '../../utils/stores';
import {
  buildBackendTaskPayloadFromDraft,
  extractTaskPayloadFromAlgorithmTask,
  isAlgorithmTaskPayload,
} from '../../utils/taskPayloadMapper';
import type {
  AlgorithmTaskPayload,
  BackendBindingModel,
  BackendTaskBinding,
} from '../../algorithmTaskPayload.types';
import type { AlgorithmParamConfigDraft, RegionDraft } from '../../algorithmTaskDraft.types';
import { syncFlattenRegionsFromConfigs } from '../../utils/paramUtils';
import {
  createDefaultPatrolConfig,
  validatePatrolConfig,
} from '../../utils/patrolUtils';
import {
  DEFAULT_SNAP_INTERVAL_UNIT,
  DEFAULT_SNAP_INTERVAL_VALUE,
  ensureSnapIntervalDefaults,
  normalizeRealModelIds,
  parseSnapCronFromExpression,
  syncLegacyIdsFromDraft,
  validateSnapInterval,
} from '../../utils/draftCommon';

export {
  DEFAULT_SNAP_CRON_EXPRESSION,
  DEFAULT_SNAP_INTERVAL_UNIT,
  DEFAULT_SNAP_INTERVAL_VALUE,
  buildSnapCronFromInterval,
  ensureSnapIntervalDefaults,
  normalizeRealModelIds,
  parseSnapCronFromExpression,
  syncLegacyIdsFromDraft,
  validateSnapInterval,
} from '../../utils/draftCommon';
export function createDefaultDetectionConfig(): DetectionConfigDraft {
  return {
    model_id: null,
    conf: 0.35,
    iou: 0.45,
    imgsz: 416,
    class_whitelist: [],
    min_box_area: 200,
    max_detections: 100,
    extract_interval: 25,
    enable_tracking: false,
    tracking_similarity_threshold: DEFAULT_TRACKING_SIMILARITY_THRESHOLD,
    tracking_max_age: DEFAULT_TRACKING_MAX_AGE,
    tracking_smooth_alpha: DEFAULT_TRACKING_SMOOTH_ALPHA,
    device: 'auto',
  };
}

export function createDefaultDraft(): AlgorithmTaskDraft {
  const [weekStart, weekEnd] = getCurrentWeekRange();
  return {
    task_name: '',
    task_type: 'realtime',
    analysis_mode: 'static',
    snap_interval_value: DEFAULT_SNAP_INTERVAL_VALUE,
    snap_interval_unit: DEFAULT_SNAP_INTERVAL_UNIT,
    task_mode: 'wizard',
    config_mode: 'camera',
    camera_bindings: [],
    device_ids: [],
    model_ids: [],
    detection_config: createDefaultDetectionConfig(),
    param_config_mode: 'combo',
    combo_param_configs: {},
    model_param_configs: {},
    model_name_map: {},
    combo_region_configs: {},
    model_region_configs: {},
    regions: [],
    alert_rules: [],
    alert_push_configs: [],
    patrol_config: createDefaultPatrolConfig(),
    is_full_day_defense: true,
    defense_mode: 'full',
    defense_schedule: createFullDefenseSchedule(),
    defense_week_start: weekStart.format('YYYY-MM-DD'),
    defense_week_end: weekEnd.format('YYYY-MM-DD'),
    defense_week_schedules: [],
  };
}

export function validateSectionDraft(
  section: AlgorithmTaskSectionKey,
  draft: AlgorithmTaskDraft,
): string | null {
  syncLegacyIdsFromDraft(draft);

  switch (section) {
    case 'basic':
      if (!draft.task_name?.trim())
        return '请填写任务名称';
      if (!draft.task_type)
        return '请选择任务类型';
      const snapError = validateSnapInterval(draft);
      if (snapError)
        return snapError;
      return validateDefenseSchedule(draft);
    case 'camera':
      if (!draft.camera_bindings.length)
        return '请至少添加一个摄像头';
      if (draft.camera_bindings.some(binding => binding.model_ids.length === 0))
        return '每个摄像头至少绑定一个算法';
      return null;
    case 'patrol':
      return validatePatrolConfig(draft);
    case 'model':
      return null;
    case 'region':
      return null;
    case 'alert':
      return null;
    case 'alert_push':
      return null;
    default:
      return null;
  }
}

function parseModelIds(task: AlgorithmTask): number[] {
  if (Array.isArray(task.model_ids))
    return normalizeRealModelIds(task.model_ids);
  if (typeof task.model_ids === 'string') {
    try {
      const parsed = JSON.parse(task.model_ids);
      if (Array.isArray(parsed))
        return normalizeRealModelIds(parsed);
    }
    catch {
      return [];
    }
  }
  return [];
}

function parseDeviceIds(task: AlgorithmTask): string[] {
  if (Array.isArray(task.device_ids))
    return [...task.device_ids];
  if (typeof task.device_ids === 'string') {
    try {
      const parsed = JSON.parse(task.device_ids);
      if (Array.isArray(parsed))
        return parsed.map(String);
    }
    catch {
      return [];
    }
  }
  return [];
}

function parseDefenseSchedule(task: AlgorithmTask): number[][] | undefined {
  if (!task.defense_schedule)
    return undefined;
  try {
    const schedule = typeof task.defense_schedule === 'string'
      ? JSON.parse(task.defense_schedule)
      : task.defense_schedule;
    return Array.isArray(schedule) ? schedule : undefined;
  }
  catch {
    return undefined;
  }
}

function normalizeLegacyAlertPushConfigs(task: AlgorithmTask) {
  return Array.isArray(task.alert_push_configs)
    ? task.alert_push_configs
    : [];
}

function buildFallbackAlertRule(
  draft: AlgorithmTaskDraft,
  options?: {
    ruleId?: string;
    ruleName?: string;
    enabled?: boolean;
    alarmSuppressTime?: number;
  },
) {
  const firstModelId = draft.model_ids[0] ?? null;
  const rule = createEmptyAlertRule(0);
  const className = draft.detection_config.class_whitelist[0] ?? 'person';

  rule.rule_id = options?.ruleId ?? `legacy_rule_${Date.now()}_1`;
  rule.rule_seq = 1;
  rule.rule_name = options?.ruleName ?? '默认告警规则';
  rule.enabled = options?.enabled !== false;
  rule.scope = {
    type: 'full_frame',
    region_id: null,
    line_id: null,
    device_id: draft.camera_bindings[0]?.device_id ?? null,
  };
  rule.conditions = [
    {
      seq: 1,
      model_id: firstModelId,
      model_name: firstModelId != null ? draft.model_name_map[firstModelId] : undefined,
      class_name: className,
      operator: '>=',
      count: 1,
    },
  ];
  rule.logic_expression = '1';
  rule.duration_sec = 0;
  rule.alarm_suppress_time = options?.alarmSuppressTime ?? 300;
  rule.severity = 'low';

  return migrateAlertRule(rule);
}

function buildLegacyAlertRule(task: AlgorithmTask, draft: AlgorithmTaskDraft) {
  return buildFallbackAlertRule(draft, {
    ruleId: `legacy_task_${task.id}_rule_1`,
    ruleName: '旧任务默认告警规则',
    enabled: task.alert_event_enabled !== false,
    alarmSuppressTime: task.alarm_suppress_time ?? 300,
  });
}

/** 将后端任务列表/详情字段还原为向导 draft（无本地缓存时的兜底） */
export function buildDraftFromAlgorithmTask(task: AlgorithmTask): AlgorithmTaskDraft {
  const payloadFromApi = extractTaskPayloadFromAlgorithmTask(task);
  if (payloadFromApi)
    return buildDraftFromBackendTaskPayload(payloadFromApi);

  const draft = createDefaultDraft();
  const deviceIds = parseDeviceIds(task);
  const modelIds = parseModelIds(task);
  const modelNames = (task.model_names ?? '')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);
  const deviceNames = task.device_names ?? [];

  draft.task_name = task.task_name ?? '';
  draft.task_type = task.task_type ?? 'realtime';
  draft.analysis_mode = draft.task_type === 'realtime' && !!task.tracking_enabled
    ? 'dynamic'
    : 'static';
  draft.task_mode = resolveTaskMode(task);
  draft.device_ids = deviceIds;
  draft.model_ids = modelIds;
  draft.model_name_map = Object.fromEntries(
    modelIds.map((id, index) => [id, modelNames[index] || `Model_${id}`]),
  );
  draft.camera_bindings = deviceIds.map((deviceId, index) => ({
    device_id: deviceId,
    device_name: deviceNames[index] ?? deviceId,
    model_ids: [...modelIds],
  }));

  draft.detection_config = {
    ...createDefaultDetectionConfig(),
    model_id: modelIds[0] ?? null,
    extract_interval: task.extract_interval ?? 25,
    enable_tracking: !!task.tracking_enabled,
    tracking_similarity_threshold: task.tracking_similarity_threshold ?? DEFAULT_TRACKING_SIMILARITY_THRESHOLD,
    tracking_max_age: task.tracking_max_age ?? DEFAULT_TRACKING_MAX_AGE,
    tracking_smooth_alpha: task.tracking_smooth_alpha ?? DEFAULT_TRACKING_SMOOTH_ALPHA,
  };

  const isFullDay = task.defense_mode === 'full' || !task.defense_mode;
  draft.is_full_day_defense = isFullDay;
  draft.defense_mode = task.defense_mode ?? 'full';
  draft.defense_schedule = parseDefenseSchedule(task)
    ?? (isFullDay ? createFullDefenseSchedule() : draft.defense_schedule);
  const [weekStart, weekEnd] = getCurrentWeekRange();
  draft.defense_week_start = weekStart.format('YYYY-MM-DD');
  draft.defense_week_end = weekEnd.format('YYYY-MM-DD');

  if (draft.task_type === 'snap') {
    const parsed = parseSnapCronFromExpression(task.cron_expression);
    if (parsed) {
      draft.snap_interval_value = parsed.value;
      draft.snap_interval_unit = parsed.unit;
    }
    ensureSnapIntervalDefaults(draft);
  }

  if (task.alert_event_enabled) {
    draft.alert_rules = [buildLegacyAlertRule(task, draft)];
  }
  draft.alert_push_configs = normalizeLegacyAlertPushConfigs(task).map((push, index) => {
    const row = push as Record<string, unknown>;
    return {
      push_id: String(row.push_id ?? row.pushId ?? `legacy_push_${task.id}_${index + 1}`),
      push_name: String(row.push_name ?? row.pushName ?? `旧任务告警推送 ${index + 1}`),
      enabled: row.enabled !== false,
      push_mode: row.push_mode === 'address' ? 'address' : 'user',
      rule_ids: Array.isArray(row.rule_ids) && row.rule_ids.length
        ? [...row.rule_ids as string[]]
        : draft.alert_rules.map(rule => rule.rule_id),
      channels: Array.isArray(row.channels) ? [...row.channels as any[]] : [],
      recipient_user_ids: Array.isArray(row.recipient_user_ids)
        ? [...row.recipient_user_ids as number[]]
        : [],
      address_profile_ids: Array.isArray(row.address_profile_ids)
        ? [...row.address_profile_ids as string[]]
        : [],
      channel_profile_map: {},
      content: {
        platform_name: String((row.content as Record<string, unknown> | undefined)?.platform_name ?? ''),
        title_template: String((row.content as Record<string, unknown> | undefined)?.title_template ?? '算法告警通知'),
        include_fields: Array.isArray((row.content as Record<string, unknown> | undefined)?.include_fields)
          ? [...(row.content as Record<string, unknown>).include_fields as any[]]
          : ['task_name', 'camera_name', 'rule_seq', 'rule_name', 'severity', 'alarm_time'],
        remark: String((row.content as Record<string, unknown> | undefined)?.remark ?? ''),
      },
    };
  });

  return draft;
}

function restoreParamConfigFromModel(model: BackendBindingModel): AlgorithmParamConfigDraft {
  const hasAlgorithmParams = Object.keys(model.algorithm_params || {}).length > 0;
  const defaultDetection = createDefaultDetectionConfig();
  const detectionConfig = (model as BackendBindingModel & {
    detection_config?: Partial<BackendBindingModel['detection_config']>;
  }).detection_config ?? {};
  return {
    preset: 'balanced',
    custom_enabled: hasAlgorithmParams,
    detection_config: {
      model_id: model.model_id,
      conf: detectionConfig.conf ?? defaultDetection.conf,
      iou: detectionConfig.iou ?? defaultDetection.iou,
      imgsz: detectionConfig.imgsz ?? defaultDetection.imgsz,
      extract_interval: detectionConfig.extract_interval ?? defaultDetection.extract_interval,
      class_whitelist: [...(detectionConfig.class_whitelist ?? defaultDetection.class_whitelist)],
      min_box_area: detectionConfig.min_box_area ?? defaultDetection.min_box_area,
      max_detections: detectionConfig.max_detections ?? defaultDetection.max_detections,
      draw_objects: detectionConfig.draw_objects
        ? { ...detectionConfig.draw_objects }
        : undefined,
      draw_style: detectionConfig.draw_style
        ? { ...detectionConfig.draw_style }
        : undefined,
    },
    algorithm_params: hasAlgorithmParams ? { ...model.algorithm_params } : {},
  };
}

function restoreRegionsToComboConfigs(draft: AlgorithmTaskDraft, binding: BackendTaskBinding) {
  for (const model of binding.models) {
    const sourceRegions = model.regions?.length ? model.regions : binding.regions;
    if (!sourceRegions?.length)
      continue;

    const regionDrafts: RegionDraft[] = sourceRegions.map(region => ({
      region_id: region.region_id,
      region_name: region.region_name,
      device_id: binding.device_id,
      points: region.points.map(point => [...point]),
    }));
    const key = `${binding.device_id}__${model.model_id}`;
    draft.combo_region_configs[key] = {
      scope_mode: 'custom',
      regions: regionDrafts.map(region => ({
        ...region,
        points: region.points.map(point => [...point]),
      })),
    };
  }
}

/** 后端完整任务 JSON → 向导 draft */
export function buildDraftFromBackendTaskPayload(payload: AlgorithmTaskPayload): AlgorithmTaskDraft {
  const draft = createDefaultDraft();
  draft.task_name = payload.task_name ?? '';
  draft.task_type = payload.task_type ?? 'realtime';
  draft.analysis_mode = draft.task_type === 'realtime'
    ? (payload.analysis_mode ?? (payload.tracking_config?.enabled ? 'dynamic' : 'static'))
    : 'static';
  draft.task_mode = payload.task_mode === 'workflow' ? 'wizard' : (payload.task_mode ?? 'wizard');
  draft.config_mode = 'camera';
  draft.param_config_mode = 'combo';

  draft.is_full_day_defense = payload.schedule?.is_full_day_defense !== false;
  draft.defense_mode = payload.schedule?.defense_mode ?? 'full';
  draft.defense_schedule = payload.schedule?.defense_schedule?.length
    ? payload.schedule.defense_schedule.map(day => [...day])
    : (draft.is_full_day_defense ? createFullDefenseSchedule() : createEmptyDefenseSchedule());

  draft.detection_config = {
    ...createDefaultDetectionConfig(),
    enable_tracking: !!payload.tracking_config?.enabled,
    tracking_similarity_threshold: payload.tracking_config?.similarity_threshold
      ?? DEFAULT_TRACKING_SIMILARITY_THRESHOLD,
    tracking_max_age: payload.tracking_config?.max_age ?? DEFAULT_TRACKING_MAX_AGE,
    tracking_smooth_alpha: payload.tracking_config?.smooth_alpha ?? DEFAULT_TRACKING_SMOOTH_ALPHA,
    device: payload.bindings?.[0]?.models?.[0]?.detection_config?.device ?? 'auto',
    extract_interval: payload.extract_interval
      ?? payload.bindings?.[0]?.models?.[0]?.detection_config?.extract_interval
      ?? 25,
  };

  if (payload.snap_config) {
    draft.snap_interval_value = payload.snap_config.snap_interval_value;
    draft.snap_interval_unit = payload.snap_config.snap_interval_unit;
  }
  else if (payload.task_type === 'snap' && payload.cron_expression) {
    const parsed = parseSnapCronFromExpression(payload.cron_expression);
    if (parsed) {
      draft.snap_interval_value = parsed.value;
      draft.snap_interval_unit = parsed.unit;
    }
  }

  if (payload.patrol_config) {
    draft.patrol_config = {
      group_mode: payload.patrol_config.group_mode ?? 'manual',
      cameras_per_group: payload.patrol_config.cameras_per_group,
      analysis_duration_sec: payload.patrol_config.analysis_duration_sec,
      groups: (payload.patrol_config.groups ?? []).map(group => ({
        group_id: group.group_id,
        group_name: group.group_name,
        device_ids: [...group.device_ids],
        analysis_duration_sec: group.analysis_duration_sec,
      })),
    };
  }
  else if (draft.task_type === 'patrol') {
    draft.patrol_config = createDefaultPatrolConfig();
  }

  draft.camera_bindings = (payload.bindings ?? []).map(binding => ({
    device_id: binding.device_id,
    device_name: binding.device_name,
    model_ids: normalizeRealModelIds(binding.models.map(model => model.model_id)),
  }));

  draft.model_name_map = {};
  draft.combo_param_configs = {};
  draft.combo_region_configs = {};
  draft.model_param_configs = {};
  draft.model_region_configs = {};

  for (const binding of payload.bindings ?? []) {
    for (const model of binding.models) {
      if (!Number.isFinite(Number(model.model_id)) || Number(model.model_id) <= 0)
        continue;
      draft.model_name_map[model.model_id] = model.model_name;
      draft.combo_param_configs[`${binding.device_id}__${model.model_id}`] =
        restoreParamConfigFromModel(model);
    }
    restoreRegionsToComboConfigs(draft, binding);
  }

  syncLegacyIdsFromDraft(draft);
  syncFlattenRegionsFromConfigs(draft);

  draft.alert_rules = (payload.alert_config?.rules ?? []).map(rule =>
    migrateAlertRule({
      rule_id: rule.rule_id,
      rule_seq: rule.rule_seq,
      rule_name: rule.rule_name,
      enabled: rule.enabled,
      severity: rule.severity,
      scope: {
        type: rule.scope.type,
        device_id: rule.scope.device_id,
        region_id: rule.scope.region_id,
        line_id: rule.scope.line_id,
      },
      conditions: rule.conditions.map(condition => ({
        seq: condition.seq,
        model_id: condition.model_id,
        model_name: condition.model_name,
        class_name: condition.class_name,
        operator: condition.operator,
        count: condition.count,
      })),
      logic_expression: rule.logic_expression,
      duration_sec: rule.trigger?.duration_sec,
      alarm_suppress_time: rule.trigger?.alarm_suppress_time,
      clip_record_enabled: rule.clip_record?.enabled,
      clip_before_sec: rule.clip_record?.before_sec,
      clip_after_sec: rule.clip_record?.after_sec,
    }),
  );
  if (!draft.alert_rules.length && payload.alert_config?.enabled) {
    draft.alert_rules = [
      buildFallbackAlertRule(draft, {
        ruleId: 'legacy_payload_rule_1',
        ruleName: '旧任务默认告警规则',
        enabled: true,
        alarmSuppressTime: payload.alarm_suppress_time ?? 300,
      }),
    ];
  }

  draft.alert_push_configs = (payload.alert_push_configs ?? []).map(push => ({
    push_id: push.push_id,
    push_name: push.push_name,
    enabled: push.enabled,
    push_mode: push.push_mode,
    rule_ids: push.rule_ids?.length
      ? push.rule_ids
      : draft.alert_rules.map(rule => rule.rule_id),
    channels: push.channels ?? [],
    recipient_user_ids: push.recipient_user_ids ?? [],
    address_profile_ids: push.address_profile_ids ?? [],
    channel_profile_map: {},
    content: {
      platform_name: push.content.platform_name ?? '',
      title_template: push.content.title_template,
      include_fields: push.content.include_fields,
      remark: push.content.remark,
    },
  }));

  if (payload.bindings?.[0]?.models?.[0]?.detection_config) {
    const primary = payload.bindings[0].models[0].detection_config;
    draft.detection_config = {
      ...draft.detection_config,
      conf: primary.conf,
      iou: primary.iou,
      imgsz: primary.imgsz,
      class_whitelist: [...primary.class_whitelist],
      min_box_area: primary.min_box_area,
      max_detections: primary.max_detections,
      extract_interval: primary.extract_interval,
      device: primary.device,
    };
  }

  return draft;
}

export function buildDraftFromStoredPayload(payload: unknown): AlgorithmTaskDraft | null {
  if (!isAlgorithmTaskPayload(payload))
    return null;
  return buildDraftFromBackendTaskPayload(payload);
}

/** 将向导 draft 映射为后端 create/update 接口接受的完整 JSON */
export function buildApiPayloadFromDraft(
  draft: AlgorithmTaskDraft,
  options?: { forUpdate?: boolean },
) {
  return buildBackendTaskPayloadFromDraft(draft, {
    is_enabled: false,
    forUpdate: options?.forUpdate,
  });
}

export function buildSubmitPayloadFromDraft(draft: AlgorithmTaskDraft) {
  return buildBackendTaskPayloadFromDraft(draft, { is_enabled: false });
}
