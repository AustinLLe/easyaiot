import {defHttp} from '@/utils/http/axios';

enum Api {
  NodeRed = '/nodeRed',
}

/** Node-RED Admin API 不走 IoT 网关，无需 token */
const nodeRedOptions = {
  isTransformResponse: false,
  withToken: false,
  skipSessionValidate: true,
} as const;

/**
 * @description: 规则查询
 */
export const flowsList = () => {
  return defHttp.get({url: Api.NodeRed + '/flows'}, nodeRedOptions);
}

/**
 * @description: 新增规则
 */
export const addFlows = (params) =>
  defHttp.post(
    {
      url: Api.NodeRed + '/flow',
      data: params,
    },
    nodeRedOptions,
  );
/**
 * @description: 获取规则链详细信息
 */
export const getFlows = (key: string) => {
  if (!key || key === 'undefined') {
    return Promise.reject(new Error('规则链ID不能为空'));
  }
  return defHttp.get(
    {
      url: Api.NodeRed + '/flow/' + key,
    },
    nodeRedOptions,
  );
};
/**
 * @description: 更新规则
 */
export const updateflows = (key, params) => {
  if (!key || key === 'undefined') {
    return Promise.reject(new Error('规则链ID不能为空'));
  }
  return defHttp.put(
    {
      url: Api.NodeRed + '/flow/' + key,
      data: params,
    },
    nodeRedOptions,
  );
};
/**
 * @description: 删除规则
 */
export const deleteflows = (key) => {
  if (!key || key === 'undefined') {
    return Promise.reject(new Error('规则链ID不能为空'));
  }
  return defHttp.delete(
    {
      url: Api.NodeRed + '/flow/' + key,
    },
    nodeRedOptions,
  );
};
