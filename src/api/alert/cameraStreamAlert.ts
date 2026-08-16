import { defHttp } from '@/utils/http/axios'
import type { AlertPushDraft } from '@/views/algorithm-task/algorithmTaskDraft.types'

export interface CameraStreamAlertDevice {
  id: string
  name: string
  hasStream: boolean
}

export interface CameraStreamAlertRule {
  id: number
  name: string
  deviceId?: string | null
  deviceName?: string
  enabled: boolean
  disconnectSeconds: number
  recoveryNotification: boolean
  pushConfig: AlertPushDraft | Record<string, never>
  createdAt?: string | null
  updatedAt?: string | null
}

export interface CameraStreamAlertEvent {
  id: number
  ruleId: number
  ruleName?: string
  deviceId: string
  deviceName: string
  streamStatus: string
  disconnectedSince?: string | null
  triggeredAt?: string | null
  recoveredAt?: string | null
  active: boolean
  notificationResult?: { sent?: number, failed?: number, skipped?: number }
  recoveryNotificationResult?: { sent?: number, failed?: number, skipped?: number }
}

export interface CameraStreamAlertRulePayload {
  name: string
  deviceId?: string | null
  enabled: boolean
  disconnectSeconds: number
  recoveryNotification: boolean
  pushConfig: AlertPushDraft | Record<string, never>
}

const PREFIX = '/video/system/camera-stream-alert'

export function getCameraStreamAlertDevices() {
  return defHttp.get<CameraStreamAlertDevice[]>({ url: `${PREFIX}/devices` })
}

export function getCameraStreamAlertRules() {
  return defHttp.get<{ list: CameraStreamAlertRule[], total: number }>({ url: `${PREFIX}/rules` })
}

export function createCameraStreamAlertRule(data: CameraStreamAlertRulePayload) {
  return defHttp.post<CameraStreamAlertRule>({ url: `${PREFIX}/rules`, data })
}

export function updateCameraStreamAlertRule(id: number, data: CameraStreamAlertRulePayload) {
  return defHttp.put<CameraStreamAlertRule>({ url: `${PREFIX}/rules/${id}`, data })
}

export function deleteCameraStreamAlertRule(id: number) {
  return defHttp.delete<void>({ url: `${PREFIX}/rules/${id}` })
}

export function testCameraStreamAlertRule(id: number) {
  return defHttp.post<{ sent: number, failed: number, skipped: number }>({ url: `${PREFIX}/rules/${id}/test` })
}

export function getCameraStreamAlertEvents(params: {
  pageNo: number
  pageSize: number
  ruleId?: number
  deviceId?: string
  active?: boolean
}) {
  return defHttp.get<{ list: CameraStreamAlertEvent[], total: number }>({
    url: `${PREFIX}/events`,
    params,
  })
}
