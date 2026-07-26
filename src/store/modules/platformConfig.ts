import { defineStore } from 'pinia'
import defaultLogo from '@/assets/images/logo.png'
import {
  defaultInterfaceConfig,
  loadInterfaceConfig,
  PLATFORM_INTERFACE_EVENT,
  resetInterfaceConfig,
  resolvePlatformAssetUrl,
  saveInterfaceConfig,
  type InterfaceConfig,
} from '@/settings/platformConfig'

export { PLATFORM_INTERFACE_EVENT, defaultInterfaceConfig }
export type { InterfaceConfig } from '@/settings/platformConfig'

interface PlatformConfigState {
  interfaceConfig: InterfaceConfig
  loaded: boolean
}

export const usePlatformConfigStore = defineStore('platform-config', {
  state: (): PlatformConfigState => ({
    interfaceConfig: defaultInterfaceConfig(),
    loaded: false,
  }),
  getters: {
    platformName(state): string {
      return state.interfaceConfig.platformName || defaultInterfaceConfig().platformName
    },
    logoForLightTheme(state): string {
      const url = state.interfaceConfig.logoColorUrl
      return url ? resolvePlatformAssetUrl(url) : defaultLogo
    },
    logoForDarkTheme(state): string {
      const url = state.interfaceConfig.logoLightUrl || state.interfaceConfig.logoColorUrl
      return url ? resolvePlatformAssetUrl(url) : defaultLogo
    },
    faviconUrl(state): string {
      const url = state.interfaceConfig.faviconUrl
      return url ? resolvePlatformAssetUrl(url) : '/logo.png'
    },
  },
  actions: {
    loadInterfaceConfig() {
      this.interfaceConfig = loadInterfaceConfig()
      this.loaded = true
      this.applyInterfaceConfig()
    },
    setInterfaceConfig(config: InterfaceConfig) {
      this.interfaceConfig = { ...config }
      this.applyInterfaceConfig()
      window.dispatchEvent(new CustomEvent(PLATFORM_INTERFACE_EVENT, { detail: this.interfaceConfig }))
    },
    saveInterfaceConfig(config: InterfaceConfig) {
      const payload = saveInterfaceConfig(config)
      this.setInterfaceConfig(payload)
      return payload
    },
    resetInterfaceConfig() {
      const payload = resetInterfaceConfig()
      this.setInterfaceConfig(payload)
      return payload
    },
    applyInterfaceConfig() {
      const cfg = this.interfaceConfig
      if (cfg.platformName)
        document.title = cfg.platformName

      const favicon = this.faviconUrl
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = favicon
    },
  },
})

export function usePlatformConfigStoreWithOut() {
  return usePlatformConfigStore()
}
