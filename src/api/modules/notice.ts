import { defHttp } from '/@/utils/http/axios';

const MESSAGE_PREFIX = '/video/message';

enum Api {
  // 消息配置（VIDEO 占位服务，后续可替换为独立 Message 微服务）
  message_config_add = `${MESSAGE_PREFIX}/config/add`,
  message_config_update = `${MESSAGE_PREFIX}/config/update`,
  message_config_delete = `${MESSAGE_PREFIX}/config/delete`,
  message_config_query = `${MESSAGE_PREFIX}/config/query`,
  message_config_mailSendTest = `${MESSAGE_PREFIX}/config/mailSendTest`,

  // 消息准备
  message_prepare_add = `${MESSAGE_PREFIX}/prepare/add`,
  message_prepare_update = `${MESSAGE_PREFIX}/prepare/update`,
  message_prepare_delete = `${MESSAGE_PREFIX}/prepare/delete`,
  message_prepare_query = `${MESSAGE_PREFIX}/prepare/query`,
  message_file_upload = `${MESSAGE_PREFIX}/file/upload`,
  message_preview_user_queryByMsgType = `${MESSAGE_PREFIX}/preview/user/queryByMsgType`,
  // 消息推送
  message_send = `${MESSAGE_PREFIX}/send`,
  message_send_body = `${MESSAGE_PREFIX}/messageSend`,
}

const commonApi = (method: 'get' | 'post' | 'delete' | 'put', url, params, headers = {}, isTransformResponse = true) => {
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
      isTransformResponse: isTransformResponse,
    },
  );
};

// 添加
export const messageConfigAdd = (data) => {
  return commonApi('post', Api.message_config_add, { data });
};
// 更新
export const messageConfigUpdate = (data) => {
  return commonApi('post', Api.message_config_update, { data });
};

// 删除
export const messageConfigDelete = (params) => {
  return commonApi('get', Api.message_config_delete, { params });
};

// 查询（GET 须走 params，否则 msgType 等筛选条件不会拼到 URL）
export const messageConfigQuery = (params = {}) => {
  const clean = { ...params };
  Object.keys(clean).forEach((key) => {
    const value = clean[key];
    if (value === undefined || value === null || value === '') {
      delete clean[key];
    }
  });
  if ('msgType' in clean && !Number.isFinite(Number(clean.msgType))) {
    delete clean.msgType;
  }
  return commonApi('get', Api.message_config_query, { params: clean });
};

// 根据邮件调试
export const messageConfigMailSendTest = (tos, accountId?) => {
  return commonApi('get', Api.message_config_mailSendTest, { params: { tos, accountId } });
};

// 添加
export const messagePrepareAdd = (data) => {
  return commonApi('post', Api.message_prepare_add, { data });
};

// 更新
export const messagePrepareUpdate = (data) => {
  return commonApi('post', Api.message_prepare_update, { data });
};

// 删除
export const messagePrepareDelete = (params) => {
  return commonApi('get', Api.message_prepare_delete, { params });
};

// 查询
export const messagePrepareQuery = (data) => {
  const { pageNo, pageSize, ...res } = data;
  // 将所有参数（包括分页参数和其他查询参数）作为 params 传递
  return commonApi('get', Api.message_prepare_query, { 
    params: {
      page: pageNo,
      pageSize: pageSize,
      ...res
    }
  });
};
// 邮件上传
export const messageFileUpload = (data) => {
  return commonApi(
    'post',
    Api.message_file_upload,
    { data },
    { 'Content-Type': 'multipart/form-data' },
  );
};

// 根据消息类型查询目标用户列表
export const messagePreviewUserQueryByMsgType = (params) => {
  return commonApi(
    'get',
    `${Api.message_preview_user_queryByMsgType}?msgType=${params?.msgType}`,
    {},
  );
};

// 消息推送 - Body方式（优先使用）
export const messageSendByBody = (data, headers = {}, cookies = {}) => {
  // 使用 @RequestBody，传递完整的 DTO 对象
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  
  // 构建请求头，合并传入的 headers
  const requestHeaders = {
    'Content-Type': 'application/json',
    // @ts-ignore
    ignoreCancelToken: true,
    ...headers,
  };
  
  // 如果有 cookies，将其添加到请求头中
  if (cookies && Object.keys(cookies).length > 0) {
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    requestHeaders['Cookie'] = cookieString;
  }
  
  return defHttp.post(
    {
      url: Api.message_send_body,
      data: data,
      headers: requestHeaders,
    },
    {
      isTransformResponse: false,
    },
  );
};

// 消息推送 - Param方式（备用）
export const messageSendByParam = ({ msgId, msgType }, headers = {}, cookies = {}) => {
  // 后端接口使用 @RequestParam，期望从表单数据中获取参数
  // 使用 data 对象，设置 Content-Type 为 application/x-www-form-urlencoded
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  
  // 构建请求头，合并传入的 headers
  const requestHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
    // @ts-ignore
    ignoreCancelToken: true,
    ...headers,
  };
  
  // 如果有 cookies，将其添加到请求头中
  if (cookies && Object.keys(cookies).length > 0) {
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    requestHeaders['Cookie'] = cookieString;
  }
  
  return defHttp.post(
    {
      url: Api.message_send,
      data: {
        msgId: String(msgId),
        msgType: String(msgType),
      },
      headers: requestHeaders,
    },
    {
      isTransformResponse: false,
    },
  );
};

// 消息推送 - 兼容旧接口（保持向后兼容）
export const messageSend = ({ msgId, msgType }) => {
  return messageSendByParam({ msgId, msgType });
};

// import {messageFileUpload} from '/@/api/modules/notice';
