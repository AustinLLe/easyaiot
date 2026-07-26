import defaultLogo from '@/assets/images/logo.png'

/** 页面配置「默认语言」下拉选项（仅 UI 展示，不切换 i18n） */
export type PlatformDisplayLocale = 'zh_CN' | 'zh_TW' | 'en'

const DISPLAY_LOCALES: PlatformDisplayLocale[] = ['zh_CN', 'zh_TW', 'en']

export interface InterfaceConfig {
  platformName: string
  /** 页面配置展示用，暂未接入 i18n 切换 */
  defaultLocale: PlatformDisplayLocale
  /** 原彩 Logo：src 资源路径或 data URL */
  logoColorUrl: string
  /** 浅色 Logo：src 资源路径或 data URL */
  logoLightUrl: string
  faviconUrl: string
}

export interface MonitorDashboardConfig {
  showRightAlarmPanel: boolean
  showBottomRecords: boolean
  rightAlarmPageSize: number
  bottomRecordPageSize: number
  refreshIntervalSeconds: number
}

export const PLATFORM_INTERFACE_STORAGE_KEY = 'easyaiot-platform-interface-config'
export const MONITOR_DASHBOARD_STORAGE_KEY = 'easyaiot-monitor-dashboard-config'

export const MONITOR_DASHBOARD_CONFIG_EVENT = 'monitor-dashboard-config-change'
export const PLATFORM_INTERFACE_EVENT = 'platform-interface-config-change'

/** 默认界面配置（可改此文件作为项目内置默认值） */
export const defaultInterfaceConfig = (): InterfaceConfig => ({
  platformName: '边缘智能算法应用平台',
  defaultLocale: 'zh_CN',
  logoColorUrl: defaultLogo,
  logoLightUrl: '',
  faviconUrl: '/logo.png',
})

export const defaultMonitorDashboardConfig: MonitorDashboardConfig = {
  showRightAlarmPanel: true,
  showBottomRecords: true,
  rightAlarmPageSize: 7,
  bottomRecordPageSize: 20,
  refreshIntervalSeconds: 5,
}

export function parseConfigJson<T>(configJson: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(configJson) }
  }
  catch {
    return fallback
  }
}

export function resolvePlatformAssetUrl(url?: string) {
  if (!url)
    return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))
    return url
  return url.startsWith('/') ? url : `/${url}`
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

function loadFromStorage<T>(key: string, fallback: T, normalize?: (value: Partial<T>) => T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw)
      return fallback
    const parsed = parseConfigJson(raw, fallback)
    return normalize ? normalize(parsed) : parsed
  }
  catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function removeFromStorage(key: string) {
  localStorage.removeItem(key)
}

const normalizeNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const num = Number(value)
  if (!Number.isFinite(num))
    return fallback
  return Math.min(max, Math.max(min, Math.floor(num)))
}

export function normalizeInterfaceConfig(config: Partial<InterfaceConfig> = {}): InterfaceConfig {
  const defaults = defaultInterfaceConfig()
  return {
    platformName: (config.platformName || '').trim() || defaults.platformName,
    defaultLocale: DISPLAY_LOCALES.includes(config.defaultLocale as PlatformDisplayLocale)
      ? (config.defaultLocale as PlatformDisplayLocale)
      : 'zh_CN',
    logoColorUrl: (config.logoColorUrl || '').trim() || defaults.logoColorUrl,
    logoLightUrl: (config.logoLightUrl || '').trim() || defaults.logoLightUrl,
    faviconUrl: (config.faviconUrl || '').trim() || defaults.faviconUrl,
  }
}

export function normalizeMonitorDashboardConfig(config: Partial<MonitorDashboardConfig> = {}): MonitorDashboardConfig {
  return {
    showRightAlarmPanel: config.showRightAlarmPanel !== false,
    showBottomRecords: config.showBottomRecords !== false,
    rightAlarmPageSize: normalizeNumber(config.rightAlarmPageSize, defaultMonitorDashboardConfig.rightAlarmPageSize, 1, 50),
    bottomRecordPageSize: normalizeNumber(config.bottomRecordPageSize, defaultMonitorDashboardConfig.bottomRecordPageSize, 1, 100),
    refreshIntervalSeconds: normalizeNumber(config.refreshIntervalSeconds, defaultMonitorDashboardConfig.refreshIntervalSeconds, 3, 300),
  }
}

export function loadInterfaceConfig(): InterfaceConfig {
  return loadFromStorage(
    PLATFORM_INTERFACE_STORAGE_KEY,
    defaultInterfaceConfig(),
    normalizeInterfaceConfig,
  )
}

export function saveInterfaceConfig(config: Partial<InterfaceConfig>): InterfaceConfig {
  const normalized = normalizeInterfaceConfig(config)
  saveToStorage(PLATFORM_INTERFACE_STORAGE_KEY, normalized)
  window.dispatchEvent(new CustomEvent(PLATFORM_INTERFACE_EVENT, { detail: normalized }))
  return normalized
}

export function resetInterfaceConfig(): InterfaceConfig {
  removeFromStorage(PLATFORM_INTERFACE_STORAGE_KEY)
  const normalized = defaultInterfaceConfig()
  window.dispatchEvent(new CustomEvent(PLATFORM_INTERFACE_EVENT, { detail: normalized }))
  return normalized
}

export function loadMonitorDashboardConfig(): MonitorDashboardConfig {
  return loadFromStorage(
    MONITOR_DASHBOARD_STORAGE_KEY,
    defaultMonitorDashboardConfig,
    normalizeMonitorDashboardConfig,
  )
}

export function saveMonitorDashboardConfig(config: Partial<MonitorDashboardConfig>): MonitorDashboardConfig {
  const normalized = normalizeMonitorDashboardConfig(config)
  saveToStorage(MONITOR_DASHBOARD_STORAGE_KEY, normalized)
  window.dispatchEvent(new CustomEvent(MONITOR_DASHBOARD_CONFIG_EVENT, { detail: normalized }))
  return normalized
}

export function resetMonitorDashboardConfig(): MonitorDashboardConfig {
  removeFromStorage(MONITOR_DASHBOARD_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(MONITOR_DASHBOARD_CONFIG_EVENT, { detail: defaultMonitorDashboardConfig }))
  return { ...defaultMonitorDashboardConfig }
}
