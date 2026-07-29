import { defHttp } from '@/utils/http/axios'
import type { InterfaceConfig, PlatformAsset } from '@/settings/platformConfig'

export interface PlatformInterfaceConfigResponse extends InterfaceConfig {
  customAssets: PlatformAsset[]
}

export function getPlatformInterfaceConfig() {
  return defHttp.get<PlatformInterfaceConfigResponse>(
    { url: '/video/platform/config' },
    { errorMessageMode: 'none', skipSessionValidate: true },
  )
}

export function updatePlatformInterfaceConfig(data: InterfaceConfig) {
  return defHttp.put<PlatformInterfaceConfigResponse>({
    url: '/video/platform/config',
    data,
  })
}

export function uploadPlatformAsset(file: File) {
  const data = new FormData()
  data.append('file', file)
  return defHttp.post<PlatformAsset>({
    url: '/video/platform/config/assets',
    data,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export function deletePlatformAsset(id: string) {
  return defHttp.delete<{ id: string }>({
    url: `/video/platform/config/assets/${id}`,
  })
}
