export interface MonitorDashboardConfig {
  showRightAlarmPanel: boolean
  showBottomRecords: boolean
  rightAlarmPageSize: number
  bottomRecordPageSize: number
  refreshIntervalSeconds: number
}

export const MONITOR_DASHBOARD_CONFIG_KEY = 'monitor-dashboard-config'
export const MONITOR_DASHBOARD_CONFIG_EVENT = 'monitor-dashboard-config-change'

export const defaultMonitorDashboardConfig: MonitorDashboardConfig = {
  showRightAlarmPanel: true,
  showBottomRecords: true,
  rightAlarmPageSize: 7,
  bottomRecordPageSize: 20,
  refreshIntervalSeconds: 5,
}

const normalizeNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.floor(num)))
}

export const normalizeMonitorDashboardConfig = (config: Partial<MonitorDashboardConfig> = {}): MonitorDashboardConfig => {
  return {
    showRightAlarmPanel: config.showRightAlarmPanel !== false,
    showBottomRecords: config.showBottomRecords !== false,
    rightAlarmPageSize: normalizeNumber(config.rightAlarmPageSize, defaultMonitorDashboardConfig.rightAlarmPageSize, 1, 50),
    bottomRecordPageSize: normalizeNumber(config.bottomRecordPageSize, defaultMonitorDashboardConfig.bottomRecordPageSize, 1, 100),
    refreshIntervalSeconds: normalizeNumber(config.refreshIntervalSeconds, defaultMonitorDashboardConfig.refreshIntervalSeconds, 3, 300),
  }
}

export const getMonitorDashboardConfig = (): MonitorDashboardConfig => {
  try {
    const raw = localStorage.getItem(MONITOR_DASHBOARD_CONFIG_KEY)
    if (!raw) return defaultMonitorDashboardConfig
    return normalizeMonitorDashboardConfig(JSON.parse(raw))
  } catch (error) {
    return defaultMonitorDashboardConfig
  }
}

export const saveMonitorDashboardConfig = (config: Partial<MonitorDashboardConfig>) => {
  const normalized = normalizeMonitorDashboardConfig(config)
  localStorage.setItem(MONITOR_DASHBOARD_CONFIG_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(MONITOR_DASHBOARD_CONFIG_EVENT, { detail: normalized }))
  return normalized
}

export const resetMonitorDashboardConfig = () => saveMonitorDashboardConfig(defaultMonitorDashboardConfig)
