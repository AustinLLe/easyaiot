export interface PushHeaderEntry {
  key: string;
  value: string;
  locked?: boolean;
}

export interface PushExtraFieldEntry {
  key: string;
  value: string;
  locked?: boolean;
}

/** 字段对照：一组 key + value 两行映射 */
export interface PushFieldMappingGroup {
  key_source: string;
  key_target: string;
  value_source: string;
  value_target: string;
  locked?: boolean;
}

export interface AlarmPushEndpoint {
  profile_id: string;
  profile_name: string;
  push_url: string;
  enabled: boolean;
  online?: boolean;
  last_test_at?: string;
  output_content: {
    algorithm_fields: string[];
    analysis_fields: string[];
  };
  request_headers: PushHeaderEntry[];
  extra_fields: PushExtraFieldEntry[];
  field_mappings: PushFieldMappingGroup[];
}

/** @deprecated 兼容旧引用，等同 AlarmPushEndpoint */
export type PushChannelProfile = AlarmPushEndpoint;

/** @deprecated 旧单行结构，加载时迁移为 PushFieldMappingGroup */
export type PushFieldMappingEntry = PushFieldMappingGroup;
