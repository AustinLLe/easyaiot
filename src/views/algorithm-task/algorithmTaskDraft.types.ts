export type AlgorithmTaskSectionKey = 'basic' | 'camera' | 'model' | 'region' | 'alert' | 'alert_push';

export type AlgorithmTaskMode = 'wizard';

export type ConfigMode = 'camera' | 'algorithm';

/** 算法阈值配置模式：组合=每摄像头×每算法；算法=同名算法共用 */
export type ParamConfigMode = 'combo' | 'algorithm';

export type AlgorithmParamPreset = 'high_precision' | 'balanced' | 'high_recall';

export interface CameraBindingDraft {
  device_id: string;
  device_name: string;
  model_ids: number[];
  online?: boolean;
}

export type AlertRuleLogic = 'AND' | 'OR';

export type AlertRuleScopeType = 'full_frame' | 'region' | 'line';

export type AlertRuleOperator = '>=' | '<=' | '==' | '>' | '<';

/** 任务级默认推理配置（文档 detection_config 中的全局项） */
export interface DetectionConfigDraft {
  model_id: number | null;
  conf: number;
  iou: number;
  imgsz: number;
  class_whitelist: string[];
  min_box_area: number;
  max_detections: number;
  extract_interval: number;
  enable_tracking: boolean;
  tracking_similarity_threshold?: number;
  tracking_max_age?: number;
  tracking_smooth_alpha?: number;
  device: 'auto' | 'cpu' | 'cuda';
}

/** 单条算法/组合的可调参数（编辑弹窗保存） */
export interface AlgorithmParamConfigDraft {
  preset: AlgorithmParamPreset;
  custom_enabled: boolean;
  detection_config: {
    model_id: number;
    conf: number;
    iou: number;
    imgsz: number;
    extract_interval: number;
    class_whitelist: string[];
    min_box_area: number;
    max_detections: number;
  };
  algorithm_params: Record<string, number | string | boolean>;
}

export const THRESHOLD_MODE_OPTIONS = [
  { label: '默认', value: false },
  { label: '扩展', value: true },
] as const;

export interface RegionDraft {
  region_id: string;
  region_name: string;
  device_id: string;
  points: number[][];
}

/** 分析区域范围：默认全画面 / 自定义框选 */
export type RegionScopeMode = 'default' | 'custom';

export interface RegionConfigDraft {
  scope_mode: RegionScopeMode;
  regions: RegionDraft[];
  image_id?: number | null;
  image_path?: string | null;
}

export interface RegionTableRow {
  key: string;
  device_id?: string;
  device_name?: string;
  model_id: number;
  model_name: string;
  scope_mode: RegionScopeMode;
  scope_label: string;
}

export interface AlertRuleConditionDraft {
  seq: number;
  model_id: number | null;
  model_name?: string;
  class_name: string;
  operator?: AlertRuleOperator;
  count?: number;
}

export interface AlertRuleScopeDraft {
  type: AlertRuleScopeType;
  device_id?: string | null;
  region_id: string | null;
  line_id: string | null;
}

export interface AlertRuleDraft {
  rule_id: string;
  /** 系统自动分配的序号，从 1 开始 */
  rule_seq?: number;
  rule_name: string;
  enabled: boolean;
  scope: AlertRuleScopeDraft;
  conditions: AlertRuleConditionDraft[];
  duration_sec?: number;
  alarm_suppress_time?: number;
  /** 条件关系表达式，如 "(1 AND 2) OR 3" */
  logic_expression: string;
  /** @deprecated 兼容旧数据，新规则以 logic_expression 为准 */
  logic?: AlertRuleLogic;
  severity?: 'low' | 'medium' | 'high';
  /** 告警片段录像是否启用 */
  clip_record_enabled?: boolean;
  /** 录像片段：告警前秒数 */
  clip_before_sec?: number;
  /** 录像片段：告警后秒数 */
  clip_after_sec?: number;
}

export type AlertPushChannel =
  | 'platform'
  | 'email'
  | 'sms'
  | 'wechat'
  | 'feishu'
  | 'dingtalk';

export type AlertPushContentField =
  | 'task_name'
  | 'camera_name'
  | 'rule_name'
  | 'rule_seq'
  | 'severity'
  | 'alarm_time'
  | 'detection_summary'
  | 'snapshot_image'
  | 'region_name';

export interface AlertPushChannelConfig {
  email?: { recipients: string[]; subject?: string };
  sms?: { phones: string[] };
  wechat?: { webhook_url?: string };
  feishu?: { webhook_url?: string };
  dingtalk?: { webhook_url?: string };
}

export interface AlertPushContentDraft {
  title_template: string;
  include_fields: AlertPushContentField[];
  remark?: string;
}

/** 推送模式：按用户 / 推送地址 */
export type AlertPushMode = 'user' | 'address';

export interface AlertPushDraft {
  push_id: string;
  push_name: string;
  enabled: boolean;
  /** 推送模式，默认按用户推送 */
  push_mode?: AlertPushMode;
  channels: AlertPushChannel[];
  /** 各渠道引用的推送设置 profile_id（地址/Webhook 在告警-推送设置中维护） */
  channel_profile_map: Partial<Record<AlertPushChannel, string[]>>;
  content: AlertPushContentDraft;
  /** 按用户推送：系统用户 id 列表（多选） */
  recipient_user_ids?: number[];
  /** 推送地址模式：推送设置中的 profile_id 列表（多选） */
  address_profile_ids?: string[];
  /** 绑定的告警规则 rule_id 列表（多选） */
  rule_ids?: string[];
  /** 提交时由 profile 合并生成；旧数据兼容 inline 地址 */
  channel_config?: AlertPushChannelConfig;
}

export type SnapIntervalUnit = 'second' | 'minute' | 'hour';

export interface DefenseWeekScheduleEntry {
  week_start: string;
  week_end: string;
  schedule: number[][];
}

export interface AlgorithmTaskDraft {
  task_name: string;
  task_type: 'realtime' | 'snap';
  /** 抓拍间隔数值（仅抓拍任务） */
  snap_interval_value?: number;
  /** 抓拍间隔单位（仅抓拍任务） */
  snap_interval_unit?: SnapIntervalUnit;
  task_mode?: AlgorithmTaskMode;
  config_mode: ConfigMode;
  camera_bindings: CameraBindingDraft[];
  device_ids: string[];
  model_ids: number[];
  /** 任务级全局推理参数 */
  detection_config: DetectionConfigDraft;
  /** 阈值配置模式 */
  param_config_mode: ParamConfigMode;
  /** 组合模式：key = `${device_id}__${model_id}` */
  combo_param_configs: Record<string, AlgorithmParamConfigDraft>;
  /** 算法模式：key = model_id */
  model_param_configs: Record<number, AlgorithmParamConfigDraft>;
  /** 算法 ID -> 名称，供阈值步骤展示 */
  model_name_map: Record<number, string>;
  /** 组合模式区域：key = `${device_id}__${model_id}` */
  combo_region_configs: Record<string, RegionConfigDraft>;
  /** 算法模式区域：key = model_id */
  model_region_configs: Record<number, RegionConfigDraft>;
  regions: RegionDraft[];
  alert_rules: AlertRuleDraft[];
  alert_push_configs: AlertPushDraft[];
  /** 是否全天布防 */
  is_full_day_defense?: boolean;
  /** 布防模式: full / half / day / night */
  defense_mode?: string;
  /** 7×24 布防矩阵，1 表示激活 */
  defense_schedule?: number[][];
  /** 前端：布防参考周起始（YYYY-MM-DD） */
  defense_week_start?: string;
  /** 前端：布防参考周结束（YYYY-MM-DD） */
  defense_week_end?: string;
  /** 前端：按自然周保存的布防配置 */
  defense_week_schedules?: DefenseWeekScheduleEntry[];
  /** 前端：已执行「应用到全部周」的源周 key（week_start::week_end） */
  defense_applied_to_all_week_key?: string | null;
}

export interface AlgorithmTaskSectionMeta {
  key: AlgorithmTaskSectionKey;
  label: string;
  description: string;
}

export interface ThresholdTableRow {
  key: string;
  device_id?: string;
  device_name?: string;
  model_id: number;
  model_name: string;
}
