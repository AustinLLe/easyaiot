import {
  loadInterfaceConfig,
  resolvePlatformAssetUrl,
  type InterfaceConfig,
} from '@/settings/platformConfig'

const DEFAULT_LOADING_LOGO = '/resource/img/logo.png'

export function resolveLoadingLogoUrl(config: Partial<InterfaceConfig>, isDark = false): string {
  const logoColor = config.logoColorUrl?.trim()
  const logoLight = config.logoLightUrl?.trim()
  const raw = isDark ? (logoLight || logoColor) : logoColor
  if (raw)
    return resolvePlatformAssetUrl(raw)
  return DEFAULT_LOADING_LOGO
}

export function applyAppLoadingBranding(config?: Partial<InterfaceConfig>) {
  if (typeof document === 'undefined')
    return

  const cfg = config ?? loadInterfaceConfig()
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  const logoUrl = resolveLoadingLogoUrl(cfg, isDark)

  const logoEl = document.querySelector<HTMLImageElement>('.app-loading-logo')
  if (logoEl && logoUrl)
    logoEl.src = logoUrl

  const platformName = cfg.platformName?.trim()
  const titleEl = document.querySelector<HTMLElement>('.app-loading-title')
  if (platformName && titleEl)
    titleEl.textContent = platformName
}
