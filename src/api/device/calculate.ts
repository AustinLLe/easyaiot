import {defHttp} from '@/utils/http/axios';
import { dedupeRequest } from '@/utils/requestDedupe';
import { getDeviceList } from '@/api/device/camera';

enum Api {
  Alarm = '/video/alert',
}

const commonApi = (method: 'get' | 'post' | 'delete' | 'put', url, params = {}, headers = {}, isTransformResponse = true, responseType = 'json') => {
  defHttp.setHeader({'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token')});

  return defHttp[method](
    {
      url,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
        ...headers,
      },
      ...params,
      responseType: responseType,
    },
    {
      isTransformResponse: isTransformResponse,
    },
  );
};

/** 解析 VIDEO 告警接口响应（code=200, data=...） */
function parseVideoAlertResponse(res: any) {
  const body = res?.data ?? res;
  if (body?.code !== undefined && body.code !== 200) {
    throw new Error(body.message || body.msg || '请求失败');
  }
  if (body?.data !== undefined && body?.data !== null) {
    return body.data;
  }
  return body;
}

// 告警事件（带请求去重）
export const queryAlarmList = async (params) => {
  const url = Api.Alarm + '/page';
  return dedupeRequest(
    async () => {
      const res = await commonApi('get', url, {params}, {}, false);
      return parseVideoAlertResponse(res);
    },
    url,
    params,
    1000 // 1秒内相同参数的请求会被去重
  );
};

// 获取告警筛选摄像头列表
export const queryAlertCameras = async () => {
  const res = await getDeviceList({ pageNo: 1, pageSize: 1000 });
  const deviceList = (res && res.data) ? res.data : [];
  const cameraOptions = deviceList.map((item) => {
    const deviceId = item.id;
    const deviceName = item.name || item.id;
    return {
      value: deviceId,
      label: String(deviceName || deviceId),
      device_id: deviceId,
      device_name: deviceName,
    };
  });

  cameraOptions.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  return {
    data: [
      { value: '', label: '全部摄像头' },
      ...cameraOptions,
    ],
  };
};

export const deleteAlarm = async (id: number) => {
  const res = await commonApi('delete', `${Api.Alarm}/delete/${id}`, {}, {}, false);
  return parseVideoAlertResponse(res);
};

export async function deleteAlarms(ids: number[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const results = await Promise.allSettled(uniqueIds.map(id => deleteAlarm(id)));
  const succeeded = results.filter(item => item.status === 'fulfilled').length;
  const failed = results.length - succeeded;
  return { succeeded, failed, total: results.length };
}

export const updateAlertProcessStatus = async (params: {
  ids: number[];
  process_status: 'pending' | 'processed' | 'false_alarm';
}) => {
  const res = await commonApi('post', Api.Alarm + '/process', { data: params }, {}, false);
  return parseVideoAlertResponse(res);
};

export const updateAlertArchiveStatus = async (params: {
  ids: number[];
  archive_status: 'none' | 'correct' | 'incorrect';
}) => {
  const res = await commonApi('post', Api.Alarm + '/archive', { data: params }, {}, false);
  return parseVideoAlertResponse(res);
};

export const getAlertCount = async (params: {
  group?: 'date' | 'device' | 'object';
  begin_datetime?: string;
  end_datetime?: string;
  device_id?: string;
  object?: string;
  event?: string;
}) => {
  const url = Api.Alarm + '/count';
  return dedupeRequest(
    async () => {
      const res = await commonApi('get', url, { params }, {}, false);
      return parseVideoAlertResponse(res);
    },
    url,
    params,
    1000,
  );
};

export const getAlertImage = (path) => {
  return commonApi('get', Api.Alarm + '/image?path=' + path, {}, {}, false, 'blob');
};

export const getAlertRecord = (path) => {
  return commonApi('get', Api.Alarm + '/record?path=' + path, {}, {}, false, 'blob');
};

// 根据告警时间和设备ID查询对应的录像
export const queryAlertRecord = async (params: {
  device_id: string;
  alert_time: string;
  time_range?: number;
}) => {
  const res = await commonApi('get', Api.Alarm + '/record/query', {params}, {}, false);
  // 处理响应数据
  if (res && res.data) {
    const responseData = res.data;
    // 如果code是400（业务错误），抛出错误让前端处理
    if (responseData.code === 400) {
      const error: any = new Error(responseData.message || '未找到匹配的录像');
      error.response = { data: responseData };
      error.data = responseData;
      throw error;
    }
    // 成功情况，返回数据
    if (responseData.data) {
      return responseData.data;
    }
    return responseData;
  }
  return res;
};

export const generatePlayback = (params) => {
  return commonApi('post', Api.Alarm + '/generatePlayback', {params});
};

// 获取仪表板统计信息（统一接口，带请求去重）
export const getDashboardStatistics = async () => {
  const url = Api.Alarm + '/statistics';
  return dedupeRequest(
    async () => {
      const res = await commonApi('get', url, {}, {}, false);
      return parseVideoAlertResponse(res);
    },
    url,
    undefined, // 统计接口无参数
    1000 // 1秒内相同请求会被去重
  );
};
