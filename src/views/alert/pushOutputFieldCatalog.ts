export interface PushOutputFieldDef {
  key: string;
  label: string;
}

export const ALGORITHM_OUTPUT_FIELDS: PushOutputFieldDef[] = [
  { key: 'algorithm_id', label: '算法ID' },
  { key: 'algorithm_name', label: '算法名称' },
  { key: 'degree', label: '算法报警等级' },
];

export const ANALYSIS_OUTPUT_FIELDS: PushOutputFieldDef[] = [
  { key: 'task_id', label: '任务ID' },
  { key: 'task_name', label: '任务名称' },
  { key: 'device_id', label: '摄像头ID' },
  { key: 'device_name', label: '摄像头名称' },
  { key: 'alarm_time', label: '报警时间' },
  { key: 'severity', label: '报警等级' },
  { key: 'rule_seq', label: '告警规则序号' },
  { key: 'rule_name', label: '告警规则名称' },
  { key: 'object', label: '检测对象' },
  { key: 'region', label: '区域名称' },
  { key: 'class_name', label: '类别名称' },
  { key: 'count', label: '目标数量' },
  { key: 'detection_summary', label: '检测摘要' },
  { key: 'snapshot_url', label: '报警截图' },
  { key: 'clip_url', label: '录制片段' },
  { key: 'information', label: '原始信息' },
];

export const ALL_OUTPUT_FIELD_KEYS = [
  ...ALGORITHM_OUTPUT_FIELDS.map(item => item.key),
  ...ANALYSIS_OUTPUT_FIELDS.map(item => item.key),
];
