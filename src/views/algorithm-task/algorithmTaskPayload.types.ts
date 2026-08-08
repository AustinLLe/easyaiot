import type {
  AlertPushChannel,
  AlertPushContentField,
  AlertPushMode,
  AlertRuleBehaviorType,
  AlertRuleOperator,
  AlertRuleScopeType,
  AnalysisMode,
  DynamicGeometryDraft,
  DynamicTriggerDraft,
  SnapIntervalUnit,
  PatrolConfigDraft,
} from './algorithmTaskDraft.types';

export interface BackendDetectionConfig {
  conf: number;
  iou: number;
  imgsz: number;
  class_whitelist: string[];
  min_box_area: number;
  max_detections: number;
  extract_interval: number;
  device: 'auto' | 'cpu' | 'cuda';
  draw_objects?: Record<string, unknown>;
  draw_style?: Record<string, unknown>;
}

export interface BackendBindingModel {
  model_id: number;
  model_name: string;
  detection_config: BackendDetectionConfig;
  algorithm_params: Record<string, number | string | boolean>;
  regions?: BackendBindingRegion[];
}

export interface BackendBindingRegion {
  region_id: string;
  region_name: string;
  scope_mode: 'custom' | 'default';
  points: number[][];
}

export interface BackendTaskBinding {
  device_id: string;
  device_name: string;
  models: BackendBindingModel[];
  /** 旧版摄像头级区域；新任务的算法区域保存在 models[].regions */
  regions: BackendBindingRegion[];
}

export interface BackendTaskSchedule {
  is_full_day_defense: boolean;
  defense_mode: string;
  defense_schedule: number[][];
}

export interface BackendSnapConfig {
  snap_interval_value: number;
  snap_interval_unit: SnapIntervalUnit;
  cron_expression: string;
  frame_skip: number;
}

export interface BackendTrackingConfig {
  enabled: boolean;
  backend?: 'simple' | 'supervision' | string;
  tracker?: 'simple' | 'bytetrack' | 'byte_track' | string;
  similarity_threshold: number;
  minimum_matching_threshold?: number;
  max_age: number;
  max_lost_frames?: number;
  smooth_alpha: number;
  min_confidence?: number;
  frame_rate?: number;
  predict_boxes?: boolean;
}

export interface BackendAlertRuleCondition {
  seq: number;
  model_id: number;
  model_name?: string;
  class_name: string;
  operator: AlertRuleOperator;
  count: number;
}

export interface BackendAlertRuleScope {
  type: AlertRuleScopeType;
  device_id: string | null;
  region_id: string | null;
  line_id: string | null;
}

export interface BackendAlertRule {
  rule_id: string;
  rule_seq: number;
  rule_name: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high';
  behavior_type?: AlertRuleBehaviorType;
  target_model_id?: number | null;
  target_classes?: string[];
  dynamic_geometry?: DynamicGeometryDraft;
  dynamic_trigger?: DynamicTriggerDraft;
  scope: BackendAlertRuleScope;
  conditions: BackendAlertRuleCondition[];
  logic_expression: string;
  trigger: {
    duration_sec: number;
    alarm_suppress_time: number;
  };
  clip_record: {
    enabled: boolean;
    before_sec: number;
    after_sec: number;
  };
  push_ids: string[];
}

export interface BackendAlertConfig {
  enabled: boolean;
  rules: BackendAlertRule[];
}

export interface BackendAlertPushContent {
  platform_name?: string;
  title_template: string;
  include_fields: AlertPushContentField[];
  remark?: string;
}

export interface BackendAlertPushConfig {
  push_id: string;
  push_name: string;
  enabled: boolean;
  push_mode: AlertPushMode;
  rule_ids: string[];
  channels: AlertPushChannel[];
  recipient_user_ids: number[];
  address_profile_ids: string[];
  content: BackendAlertPushContent;
}

/** 后端同学提供的完整任务 JSON 模板 */
export interface AlgorithmTaskPayload {
  task_name: string;
  task_type: 'realtime' | 'snap' | 'patrol';
  analysis_mode?: AnalysisMode;
  task_mode: 'wizard' | 'workflow';
  is_enabled: boolean;
  schedule: BackendTaskSchedule;
  snap_config: BackendSnapConfig | null;
  patrol_config?: PatrolConfigDraft | null;
  tracking_config: BackendTrackingConfig;
  bindings: BackendTaskBinding[];
  alert_config: BackendAlertConfig;
  alert_push_configs: BackendAlertPushConfig[];
  /** 后端可冗余生成的索引字段 */
  device_ids?: string[];
  model_ids?: number[];
  cron_expression?: string;
  extract_interval?: number;
  tracking_enabled?: boolean;
  tracking_similarity_threshold?: number;
  tracking_max_age?: number;
  tracking_smooth_alpha?: number;
  defense_mode?: string;
  defense_schedule?: string;
  alert_event_enabled?: boolean;
  alert_notification_enabled?: boolean;
  alarm_suppress_time?: number;
  frame_skip?: number;
}
