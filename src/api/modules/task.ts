import { defHttp } from '/@/utils/http/axios';

enum Api {
  // 推送历史列表查询（VIDEO 占位服务）
  historyQuery = '/video/message/push/history/query',
}
const commonApi = (method: 'get' | 'post' | 'delete' | 'put', url, params, headers = {}) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });

  return defHttp[method](
    {
      url,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
        ...headers,
      },
      ...params,
    },
    {
      isTransformResponse: true,
    },
  );
};
// 推送历史列表查询
export const historyQuery = (_data) => {
  const { pageNo, pageSize, ...data } = _data;
  const clean = { ...data };
  Object.keys(clean).forEach((key) => {
    const value = clean[key];
    if (value === undefined || value === null || value === '')
      delete clean[key];
  });
  if ('msgType' in clean && !Number.isFinite(Number(clean.msgType)))
    delete clean.msgType;
  return commonApi('get', Api.historyQuery, {
    params: {
      page: pageNo,
      pageSize,
      ...clean,
    },
  });
};
