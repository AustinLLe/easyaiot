import defaultLogo from '@/assets/images/logo.png'

/** 与页头语言选择器共用的实际系统语言 */
export type PlatformDisplayLocale = 'zh_CN' | 'en'

const DISPLAY_LOCALES: PlatformDisplayLocale[] = ['zh_CN', 'en']

export interface InterfaceConfig {
  platformName: string
  /** 与页头语言选择器保持一致的系统语言 */
  defaultLocale: PlatformDisplayLocale
  /** 原彩 Logo：src 资源路径或 data URL */
  logoColorUrl: string
  /** 浅色 Logo：src 资源路径或 data URL */
  logoLightUrl: string
  faviconUrl: string
}

export interface PlatformAsset {
  id: string
  name: string
  mimeType: string
  size: number
  url: string
  createdAt?: string
}

export const PLATFORM_INTERFACE_STORAGE_KEY = 'easyaiot-platform-interface-config'

export const PLATFORM_INTERFACE_EVENT = 'platform-interface-config-change'

/** 默认界面配置（可改此文件作为项目内置默认值） */
export const defaultInterfaceConfig = (): InterfaceConfig => ({
  platformName: '边缘智能算法应用平台',
  defaultLocale: 'zh_CN',
  logoColorUrl: defaultLogo,
  logoLightUrl: '',
  faviconUrl: '/logo.png',
})

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
