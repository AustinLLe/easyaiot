import { defHttp } from '@/utils/http/axios'

export interface ApiLogPageReq {
  pageNo?: number
  pageSize?: number
  applicationName?: string
  requestUrl?: string
  requestMethod?: string
  userIp?: string
  resultCode?: number
  processStatus?: number
  createTime?: Date[]
}

export function getApiAccessLogPage(params: ApiLogPageReq) {
  return defHttp.get({ url: '/infra/api-log/access/page', params })
}

export function getApiErrorLogPage(params: ApiLogPageReq) {
  return defHttp.get({ url: '/infra/api-log/error/page', params })
}

export function getApiLog(type: 'access' | 'error', id: number) {
  return defHttp.get({ url: '/infra/api-log/get', params: { type, id } })
}
