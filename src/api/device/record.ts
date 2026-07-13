import {defHttp} from '@/utils/http/axios';

const RECORD_PREFIX = '/video/record';

// 通用请求封装
const commonApi = (method: 'get' | 'post' | 'delete' | 'put', url: string, params = {}, headers = {}, isTransformResponse = true) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });

  return defHttp[method]({
    url,
    headers: { ...headers },
    ...(method === 'get' ? { params } : { data: params })
  }, { isTransformResponse: isTransformResponse });
};

// ====================== 监控录像空间管理接口 ======================
export interface RecordSpace {
  id: number;
  space_name: string;
  space_code: string;
  bucket_name: string;
  save_mode: number; // 0:标准存储, 1:归档存储
  save_time: number; // 0:永久保存, >=7(单位:天)
  save_time_unit?: 'hour' | 'day';
  description?: string;
  device_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecordSpaceListResponse {
  code: number;
  msg: string;
  data: RecordSpace[];
  total: number;
}

/**
 * 获取监控录像空间列表
 */
export const getRecordSpaceList = (params: {
  pageNo?: number;
  pageSize?: number;
  search?: string;
}) => {
  return commonApi('get', `${RECORD_PREFIX}/space/list`, params);
};

/**
 * 获取监控录像空间详情
 */
export const getRecordSpace = (space_id: number) => {
  return commonApi('get', `${RECORD_PREFIX}/space/${space_id}`);
};

/**
 * 创建监控录像空间
 */
export const createRecordSpace = (data: {
  space_name: string;
  save_mode?: number;
  save_time?: number;
  description?: string;
}) => {
  return commonApi('post', `${RECORD_PREFIX}/space`, data);
};

/**
 * 更新监控录像空间
 */
export const updateRecordSpace = (space_id: number, data: {
  space_name?: string;
  save_mode?: number;
  save_time?: number;
  save_time_unit?: 'hour' | 'day';
  description?: string;
}) => {
  return commonApi('put', `${RECORD_PREFIX}/space/${space_id}`, data);
};

/**
 * 删除监控录像空间
 */
export const deleteRecordSpace = (space_id: number) => {
  return commonApi('delete', `${RECORD_PREFIX}/space/${space_id}`);
};

// ====================== 监控录像管理接口 ======================
export interface RecordVideo {
  object_name: string;
  filename: string;
  size: number;
  duration?: number; // 时长（秒）
  last_modified: string;
  etag: string;
  content_type: string;
  url: string;
  thumbnail_url?: string; // 缩略图URL
}

export interface RecordVideoListResponse {
  code: number;
  msg: string;
  data: RecordVideo[];
  total: number;
}

/**
 * 获取监控录像空间录像列表
 */
export const getRecordVideoList = (space_id: number, params: {
  device_id?: string;
  pageNo?: number;
  pageSize?: number;
}) => {
  return commonApi('get', `${RECORD_PREFIX}/space/${space_id}/videos`, params);
};

/**
 * 批量删除监控录像
 */
export const deleteRecordVideos = (space_id: number, object_names: string[]) => {
  return commonApi('delete', `${RECORD_PREFIX}/space/${space_id}/videos`, { object_names });
};

/**
 * 清理过期的监控录像
 */
export const cleanupRecordVideos = (space_id: number, days: number) => {
  return commonApi('post', `${RECORD_PREFIX}/space/${space_id}/videos/cleanup`, { days });
};

/**
 * 同步所有监控录像空间到Minio
 */
export const syncRecordSpacesToMinio = () => {
  return commonApi('post', `${RECORD_PREFIX}/space/sync/minio`);
};

// ====================== 存储中心 ======================
export interface StorageDisk {
  id: string;
  mount_point: string;
  filesystem: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percent: number;
  targets: Array<{ label: string; path: string; exists: boolean }>;
}

export interface StorageOverview {
  node: {
    id: string;
    name: string;
    kind: 'server' | 'development_board';
    platform: string;
    architecture: string;
    status: string;
    scanned_at: string;
  };
  disks: StorageDisk[];
  recording_usage: {
    total_bytes: number;
    srs_bytes: number;
    object_bytes: number;
    archive_bytes: number;
  };
}

export interface RetentionPolicy extends RecordSpace {
  device_name: string;
  video_count: number;
  video_bytes: number;
  latest_recording_at?: string;
  retention_seconds: number;
}

export interface RetentionRule {
  target: 'all' | 'active' | 'inactive' | 'selected';
  value: number;
  unit: 'hour' | 'day';
  save_mode: 0 | 1;
  active_within_hours?: number;
  device_ids?: string[];
}

export interface RetentionScheme {
  id: string;
  database_id?: number;
  name: string;
  description: string;
  builtin: boolean;
  recommended?: boolean;
  warning?: string;
  rules: RetentionRule[];
}

export interface RetentionSchemeState {
  schemes: RetentionScheme[];
  current: {
    matched_scheme_id?: string;
    name: string;
    description: string;
    camera_count: number;
    details: Array<{
      save_time: number;
      save_time_unit: 'hour' | 'day';
      save_mode: number;
      camera_count: number;
      label: string;
    }>;
  };
}

export interface RecordingHistory {
  id: string;
  source: 'srs' | 'object' | 'archive';
  device_id: string;
  device_name: string;
  filename: string;
  relative_path: string;
  size: number;
  event_time: string;
  url: string;
  playback_url: string;
}

export const getStorageOverview = () => commonApi('get', `${RECORD_PREFIX}/storage/overview`);

export const getRetentionPolicies = () => commonApi('get', `${RECORD_PREFIX}/policies`);

export const getRetentionSchemes = () => commonApi('get', `${RECORD_PREFIX}/retention/schemes`);

export const createRetentionScheme = (data: {
  name: string;
  description?: string;
  rules: RetentionRule[];
}) => commonApi('post', `${RECORD_PREFIX}/retention/schemes`, data);

export const applyRetentionScheme = (schemeId: string) =>
  commonApi('post', `${RECORD_PREFIX}/retention/schemes/${encodeURIComponent(schemeId)}/apply`);

export const deleteRetentionScheme = (schemeId: string) =>
  commonApi('delete', `${RECORD_PREFIX}/retention/schemes/${encodeURIComponent(schemeId)}`);

export const getRecordingHistory = (params: {
  pageNo?: number;
  pageSize?: number;
  device_id?: string;
  search?: string;
  start_time?: string;
  end_time?: string;
  refresh?: boolean;
}) => commonApi('get', `${RECORD_PREFIX}/history`, params, {}, false);

export const runRetentionCleanup = () => commonApi('post', `${RECORD_PREFIX}/cleanup/run`);
