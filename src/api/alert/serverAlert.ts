import { defHttp } from '@/utils/http/axios'
import type { HardwareStatus } from '@/api/system/hardware'
import type { AlertPushDraft } from '@/views/algorithm-task/algorithmTaskDraft.types'

export type ServerAlertMetricKey = 'cpu' | 'memory' | 'rootDisk' | 'dataDisk'

export interface ServerAlertMetricConfig {
  enabled: boolean
  threshold: number
}

export interface ServerAlertConfig {
  enabled: boolean
  metrics: Record<ServerAlertMetricKey, ServerAlertMetricConfig>
  pushConfig: AlertPushDraft | Record<string, never>
  repeatIntervalMinutes: number
  recoveryNotification: boolean
  lastCheckedAt?: string | null
  lastError?: string | null
  updatedAt?: string | null
}

export interface ServerAlertMetricState extends ServerAlertMetricConfig {
  name: string
  percent: number
  alarming: boolean
  activeEventId?: number | null
}

export interface ServerAlertEvent {
  id: number
  metricKey: ServerAlertMetricKey
  metricName: string
  threshold: number
  triggerValue: number
  latestValue: number
  active: boolean
  triggeredAt: string
  recoveredAt?: string | null
  lastNotifiedAt?: string | null
  notificationResult?: { sent?: number, failed?: number, skipped?: number }
}

export interface ServerAlertStatus {
  sample: HardwareStatus
  metrics: Record<ServerAlertMetricKey, ServerAlertMetricState>
  activeEvents: ServerAlertEvent[]
}

export function getServerAlertConfig() {
  return defHttp.get<ServerAlertConfig>({ url: '/video/system/server-alert/config' })
}

export function updateServerAlertConfig(data: ServerAlertConfig) {
  return defHttp.put<ServerAlertConfig>({ url: '/video/system/server-alert/config', data })
}

export function getServerAlertStatus() {
  return defHttp.get<ServerAlertStatus>({ url: '/video/system/server-alert/status' })
}

export function getServerAlertEvents(params: { pageNo: number, pageSize: number }) {
  return defHttp.get<{ list: ServerAlertEvent[], total: number }>({
    url: '/video/system/server-alert/events',
    params,
  })
}

export function testServerAlertNotification() {
  return defHttp.post<{ sent: number, failed: number, skipped: number }>({
    url: '/video/system/server-alert/test',
  })
}
