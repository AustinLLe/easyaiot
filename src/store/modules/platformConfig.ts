import { defineStore } from 'pinia'
import defaultLogo from '@/assets/images/logo.png'
import {
  defaultInterfaceConfig,
  loadInterfaceConfig as loadInterfaceConfigLocal,
  PLATFORM_INTERFACE_EVENT,
  resetInterfaceConfig as resetInterfaceConfigLocal,
  resolvePlatformAssetUrl,
  saveInterfaceConfig as saveInterfaceConfigLocal,
  normalizeInterfaceConfig,
  type InterfaceConfig,
  type PlatformAsset,
} from '@/settings/platformConfig'
import {
  deletePlatformAsset,
  getPlatformInterfaceConfig,
  uploadPlatformAsset,
  updatePlatformInterfaceConfig,
} from '@/api/platform/config'
import { applyAppLoadingBranding } from '@/logics/appLoadingBranding'

export { PLATFORM_INTERFACE_EVENT, defaultInterfaceConfig }
export type { InterfaceConfig } from '@/settings/platformConfig'

interface PlatformConfigState {
  interfaceConfig: InterfaceConfig
  loaded: boolean
  remoteLoaded: boolean
  customAssets: PlatformAsset[]
}

export const usePlatformConfigStore = defineStore('platform-config', {
  state: (): PlatformConfigState => ({
    interfaceConfig: defaultInterfaceConfig(),
    loaded: false,
    remoteLoaded: false,
    customAssets: [],
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
    async loadInterfaceConfig(loadRemote = true) {
      if (!this.loaded) {
        this.interfaceConfig = loadInterfaceConfigLocal()
        this.loaded = true
        this.applyInterfaceConfig()
      }
      if (!loadRemote || this.remoteLoaded)
        return this.interfaceConfig

      try {
        const remote = await getPlatformInterfaceConfig()
        this.customAssets = remote.customAssets || []
        const payload = normalizeInterfaceConfig(remote)
        saveInterfaceConfigLocal(payload)
        this.interfaceConfig = payload
        this.remoteLoaded = true
        this.applyInterfaceConfig()
      }
      catch {
        // Login page and transient backend failures keep the cached/default branding.
      }
      this.loaded = true
      return this.interfaceConfig
    },
    setInterfaceConfig(config: InterfaceConfig) {
      this.interfaceConfig = { ...config }
      this.applyInterfaceConfig()
      window.dispatchEvent(new CustomEvent(PLATFORM_INTERFACE_EVENT, { detail: this.interfaceConfig }))
    },
    async saveInterfaceConfig(config: InterfaceConfig) {
      const normalized = normalizeInterfaceConfig(config)
      const remote = await updatePlatformInterfaceConfig(normalized)
      this.customAssets = remote.customAssets || []
      const payload = saveInterfaceConfigLocal(normalizeInterfaceConfig(remote))
      this.remoteLoaded = true
      this.setInterfaceConfig(payload)
      return payload
    },
    async resetInterfaceConfig() {
      const defaults = defaultInterfaceConfig()
      const remote = await updatePlatformInterfaceConfig(defaults)
      this.customAssets = remote.customAssets || []
      resetInterfaceConfigLocal()
      const payload = saveInterfaceConfigLocal(normalizeInterfaceConfig(remote))
      this.remoteLoaded = true
      this.setInterfaceConfig(payload)
      return payload
    },
    async uploadAsset(file: File) {
      const asset = await uploadPlatformAsset(file)
      this.customAssets = [asset, ...this.customAssets]
      return asset
    },
    async deleteAsset(id: string) {
      await deletePlatformAsset(id)
      this.customAssets = this.customAssets.filter(item => item.id !== id)
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

      applyAppLoadingBranding(cfg)
    },
  },
})

export function usePlatformConfigStoreWithOut() {
  return usePlatformConfigStore()
}
