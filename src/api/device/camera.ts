import {defHttp} from '@/utils/http/axios';

const CAMERA_PREFIX = '/video/camera';

// 通用请求封装
const commonApi = (method: 'get' | 'post' | 'delete' | 'put', url: string, params = {}, headers = {}, isTransformResponse = true) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });

  return defHttp[method]({
    url,
    headers: { ...headers },
    ...(method === 'get' ? { params } : { data: params })
  }, { isTransformResponse: isTransformResponse });
};

// ====================== 设备管理接口 ======================
export const registerDevice = (data: {
  id?: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  stream?: number;
  enable_forward?: boolean;
  rtmp_stream?: string;
  http_stream?: string;
  ai_rtmp_stream?: string;
  ai_http_stream?: string;
}) => {
  return commonApi('post', `${CAMERA_PREFIX}/register/device`, data);
};

/**
 * 通过ONVIF搜索并自动注册摄像头
 * @param data 包含IP、端口、密码的对象
 * @returns 注册结果
 */
export const registerDeviceByOnvif = (data: {
  ip: string;
  port: number;
  password: string;
}) => {
  return commonApi('post', `${CAMERA_PREFIX}/register/device/onvif`, data);
};

export const getDeviceInfo = (device_id: string) => {
  return commonApi('get', `${CAMERA_PREFIX}/device/${device_id}`);
};

export const updateDevice = (device_id: string, data: {
  name?: string;
  ip?: string;
  port?: number;
  username?: string;
  password?: string;
  stream?: number;
  enable_forward?: boolean;
  rtmp_stream?: string;
  http_stream?: string;
  ai_rtmp_stream?: string;
  ai_http_stream?: string;
}) => {
  return commonApi('put', `${CAMERA_PREFIX}/device/${device_id}`, data);
};

export const deleteDevice = (device_id: string) => {
  return commonApi('delete', `${CAMERA_PREFIX}/device/${device_id}`);
};

export const getDeviceList = (params: {
  pageNo?: number;
  pageSize?: number;
  search?: string;
  enable_forward?: boolean;
}) => {
  return commonApi('get', `${CAMERA_PREFIX}/list`, params);
};

export const getDeviceStatus = () => {
  return commonApi('get', `${CAMERA_PREFIX}/device/status`);
};

// ====================== PTZ控制接口 ======================
export const controlPTZ = (device_id: string, data: {
  x: number;
  y: number;
  z: number;
}) => {
  return commonApi('post', `${CAMERA_PREFIX}/device/${device_id}/ptz`, data, {}, false);
};

// ====================== 截图任务接口 ======================
export const startRtspCapture = (device_id: number, data: {
  rtsp_url?: string;
  interval?: number;
  max_count?: number;
}) => {
  return commonApi('post', `${CAMERA_PREFIX}/device/${device_id}/rtsp/start`, data);
};

export const stopRtspCapture = (device_id: number) => {
  return commonApi('post', `${CAMERA_PREFIX}/device/${device_id}/rtsp/stop`);
};

export const getRtspStatus = (device_id: number) => {
  return commonApi('get', `${CAMERA_PREFIX}/device/${device_id}/rtsp/status`);
};

export const startOnvifCapture = (device_id: number, data: {
  interval?: number;
  max_count?: number;
}) => {
  return commonApi('post', `${CAMERA_PREFIX}/device/${device_id}/onvif/start`, data);
};

export const stopOnvifCapture = (device_id: number) => {
  return commonApi('post', `${CAMERA_PREFIX}/device/${device_id}/onvif/stop`);
};

export const getOnvifStatus = (device_id: number) => {
  return commonApi('get', `${CAMERA_PREFIX}/device/${device_id}/onvif/status`);
};

export const getOnvifProfiles = (device_ip: string, device_port: number, auth: {
  username: string;
  password: string;
}) => {
  return commonApi('post', `${CAMERA_PREFIX}/device/onvif/${device_ip}/${device_port}/profiles`, auth);
};

// ====================== 设备发现接口 ======================
export const discoverDevices = () => {
  return commonApi('get', `${CAMERA_PREFIX}/discovery`);
};

export const refreshDevices = () => {
  return commonApi('post', `${CAMERA_PREFIX}/refresh`);
};

// ====================== MinIO上传接口 ======================
export const uploadScreenshot = (formData: FormData) => {
  return defHttp.post({
    url: `${CAMERA_PREFIX}/upload`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
    }
  });
};

// ====================== 类型定义 ======================
export interface StreamStatusResponse {
  code: number;
  msg: string;
  data: {
    status: 'running' | 'stopped';
    rtmp_url: string | null;
    enable_forward: boolean;
    pid?: number;
    start_time?: string;
  };
}

export interface StartStreamResponse {
  code: number;
  msg: string;
  data: {
    rtmp_url: string;
    process_id: number;
  };
}

export interface DeviceInfo {
  id: string;
  name: string;
  source: string;
  rtmp_stream: string;
  http_stream: string;
  ai_rtmp_stream?: string;
  ai_http_stream?: string;
  stream: number;
  ip: string;
  port: number;
  username: string;
  password: string;
  mac: string;
  manufacturer: string;
  model: string;
  firmware_version: string;
  serial_number: string;
  hardware_id: string;
  support_move: boolean;
  support_zoom: boolean;
  enable_forward: boolean;
  cover_image_path?: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceListResponse {
  code: number;
  msg: string;
  data: DeviceInfo[];
  total: number;
}

// ====================== 设备目录管理接口 ======================
export interface DeviceDirectory {
  id: number;
  name: string;
  parent_id: number | null;
  description?: string;
  sort_order: number;
  device_count?: number;
  children?: DeviceDirectory[];
  created_at?: string;
  updated_at?: string;
}

export interface DirectoryListResponse {
  code: number;
  msg: string;
  data: DeviceDirectory[];
}

export interface DirectoryInfoResponse {
  code: number;
  msg: string;
  data: {
    id: number;
    name: string;
    parent_id: number | null;
    description?: string;
    sort_order: number;
    device_count: number;
    children_count: number;
    created_at?: string;
    updated_at?: string;
  };
}

/**
 * 获取目录列表（树形结构）
 */
export const getDirectoryList = () => {
  return commonApi('get', `${CAMERA_PREFIX}/directory/list`);
};

/**
 * 获取目录详情
 * @param directory_id 目录ID
 */
export const getDirectoryInfo = (directory_id: number) => {
  return commonApi('get', `${CAMERA_PREFIX}/directory/${directory_id}`);
};

/**
 * 创建目录
 * @param data 目录信息
 */
export const createDirectory = (data: {
  name: string;
  parent_id?: number | null;
  description?: string;
  sort_order?: number;
}) => {
  return commonApi('post', `${CAMERA_PREFIX}/directory`, data);
};

/**
 * 更新目录
 * @param directory_id 目录ID
 * @param data 目录信息
 */
export const updateDirectory = (directory_id: number, data: {
  name?: string;
  parent_id?: number | null;
  description?: string;
  sort_order?: number;
}) => {
  return commonApi('put', `${CAMERA_PREFIX}/directory/${directory_id}`, data);
};

/**
 * 删除目录
 * @param directory_id 目录ID
 */
export const deleteDirectory = (directory_id: number) => {
  return commonApi('delete', `${CAMERA_PREFIX}/directory/${directory_id}`);
};

/**
 * 获取目录下的设备列表
 * @param directory_id 目录ID
 * @param params 查询参数
 */
export const getDirectoryDevices = (directory_id: number, params: {
  pageNo?: number;
  pageSize?: number;
  search?: string;
}) => {
  return commonApi('get', `${CAMERA_PREFIX}/directory/${directory_id}/devices`, params);
};

/**
 * 移动设备到目录
 * @param device_id 设备ID
 * @param directory_id 目录ID（0表示移动到根目录，即无目录）
 */
export const moveDeviceToDirectory = (device_id: string, directory_id: number | null) => {
  return commonApi('put', `${CAMERA_PREFIX}/device/${device_id}/directory`, {
    directory_id: directory_id === 0 ? null : directory_id
  });
};

// ====================== RTSP抓拍接口 ======================
/**
 * 从RTSP流抓取一帧图片
 * @param device_id 设备ID
 * @returns 包含图片ID和URL的响应
 */
export const captureSnapshot = (device_id: string) => {
  return commonApi('post', `${CAMERA_PREFIX}/device/${device_id}/snapshot`, {}, {}, false);
};

// ====================== 摄像头冲突检查接口 ======================
/**
 * 获取正在运行的算法任务所使用的摄像头 ID。
 * @param task_type 保留的算法任务筛选参数
 * @returns 包含冲突摄像头ID列表的响应
 */
export const getDeviceConflicts = (task_type?: 'algorithm') => {
  return commonApi<{ code: number; msg: string; data: string[] }>(
    'get',
    `${CAMERA_PREFIX}/device/conflicts`,
    task_type ? { task_type } : {}
  );
};
