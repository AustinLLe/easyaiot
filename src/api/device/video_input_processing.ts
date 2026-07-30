import { defHttp } from '@/utils/http/axios'

const PREFIX = '/video/input-processing'

function request(method: 'get' | 'post' | 'put', url: string, params: Record<string, any> = {}) {
  defHttp.setHeader({ 'X-Authorization': `Bearer ${localStorage.getItem('jwt_token')}` })
  return defHttp[method]({
    url,
    ...(method === 'get' ? { params } : { data: params }),
  })
}

export type ResolutionStrategy = 'original' | '1080p' | '720p' | '540p' | '360p'

export interface VideoInputProfile {
  id: number
  device_id: string
  device_name: string
  manufacturer?: string
  model?: string
  online: boolean
  enabled: boolean
  resolution: ResolutionStrategy
  max_fps: number
  source_url: string
  output_rtmp_url: string
  output_http_url: string
  processing_required: boolean
  detected_width?: number
  detected_height?: number
  detected_fps?: number
  detected_codec?: string
  status: 'pending' | 'starting' | 'running' | 'passthrough' | 'error' | 'disabled' | 'stopped'
  process_id?: number
  exception_reason?: string
  runtime_running?: boolean
}

export interface VideoInputProfileList {
  code?: number
  data: VideoInputProfile[]
  total: number
}

export function getVideoInputProfiles(params: {
  pageNo?: number
  pageSize?: number
  search?: string
  enabled?: boolean
}) {
  return request('get', `${PREFIX}/list`, params) as Promise<VideoInputProfileList>
}

export function updateVideoInputProfile(deviceId: string, data: Pick<VideoInputProfile, 'enabled' | 'resolution' | 'max_fps'>) {
  return request('put', `${PREFIX}/device/${deviceId}`, data)
}

export function restartVideoInputProfile(deviceId: string) {
  return request('post', `${PREFIX}/device/${deviceId}/restart`)
}
