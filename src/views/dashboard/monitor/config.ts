import {
  defaultMonitorDashboardConfig,
  loadMonitorDashboardConfig,
  MONITOR_DASHBOARD_CONFIG_EVENT,
  normalizeMonitorDashboardConfig,
  resetMonitorDashboardConfig,
  saveMonitorDashboardConfig,
  type MonitorDashboardConfig,
} from '@/settings/platformConfig'

export type { MonitorDashboardConfig }

export {
  defaultMonitorDashboardConfig,
  MONITOR_DASHBOARD_CONFIG_EVENT,
  normalizeMonitorDashboardConfig,
  saveMonitorDashboardConfig,
}

/** 同步读取看板配置（localStorage） */
export function getMonitorDashboardConfig() {
  return loadMonitorDashboardConfig()
}

export async function fetchMonitorDashboardConfig() {
  return loadMonitorDashboardConfig()
}

export async function resetMonitorDashboardConfigRemote() {
  return resetMonitorDashboardConfig()
}
