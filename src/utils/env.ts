import pkg from '../../package.json'
import { getConfigFileName } from '../../build/getConfigFileName'
import type { GlobEnvConfig } from '@/types/config'

import { warn } from '@/utils/log'

const PRODUCTION_CONFIG_KEY_RE = /^__PRODUCTION__.+__CONF__$/

function readProductionWindowConfig(): GlobEnvConfig | null {
  const configName = getConfigFileName(import.meta.env as unknown as Record<string, string>)
  const namedConfig = (window as any)[configName]
  if (namedConfig)
    return namedConfig as GlobEnvConfig

  const matchedKey = Object.keys(window).find(key => PRODUCTION_CONFIG_KEY_RE.test(key))
  if (matchedKey && (window as any)[matchedKey])
    return (window as any)[matchedKey] as GlobEnvConfig

  return null
}

function resolveAppEnvConfig(): GlobEnvConfig {
  if (import.meta.env.DEV)
    return import.meta.env as unknown as GlobEnvConfig

  return readProductionWindowConfig() ?? (import.meta.env as unknown as GlobEnvConfig)
}

export function getCommonStoragePrefix() {
  const { VITE_GLOB_APP_SHORT_NAME } = getAppEnvConfig()
  return `${VITE_GLOB_APP_SHORT_NAME}__${getEnv()}`.toUpperCase()
}

// Generate cache key according to version
export function getStorageShortName() {
  return `${getCommonStoragePrefix()}${`__${pkg.version}`}__`.toUpperCase()
}

export function getAppEnvConfig() {
  const ENV = resolveAppEnvConfig()

  const {
    VITE_GLOB_APP_TITLE,
    VITE_GLOB_BASE_URL,
    VITE_GLOB_API_URL,
    VITE_GLOB_APP_SHORT_NAME,
    VITE_GLOB_API_URL_PREFIX,
    VITE_GLOB_UPLOAD_URL,
    VITE_GLOB_APP_TENANT_ENABLE,
    VITE_GLOB_APP_CAPTCHA_ENABLE,
  } = ENV

  if (VITE_GLOB_APP_SHORT_NAME && !/^[a-zA-Z\_]*$/.test(VITE_GLOB_APP_SHORT_NAME)) {
    warn(
      'VITE_GLOB_APP_SHORT_NAME Variables can only be characters/underscores, please modify in the environment variables and re-running.',
    )
  }

  return {
    VITE_GLOB_APP_TITLE,
    VITE_GLOB_BASE_URL: VITE_GLOB_BASE_URL || '/',
    VITE_GLOB_API_URL: VITE_GLOB_API_URL || '/dev-api',
    VITE_GLOB_APP_SHORT_NAME: VITE_GLOB_APP_SHORT_NAME || 'IoT_Admin',
    VITE_GLOB_API_URL_PREFIX: VITE_GLOB_API_URL_PREFIX || '',
    VITE_GLOB_UPLOAD_URL: VITE_GLOB_UPLOAD_URL || '/admin-api',
    VITE_GLOB_APP_TENANT_ENABLE,
    VITE_GLOB_APP_CAPTCHA_ENABLE,
  }
}

/**
 * @description: Development mode
 */
export const devMode = 'development'

/**
 * @description: Production mode
 */
export const prodMode = 'production'

/**
 * @description: Get environment variables
 * @returns:
 * @example:
 */
export function getEnv(): string {
  return import.meta.env.MODE
}

/**
 * @description: Is it a development mode
 * @returns:
 * @example:
 */
export function isDevMode(): boolean {
  return import.meta.env.DEV
}

/**
 * @description: Is it a production mode
 * @returns:
 * @example:
 */
export function isProdMode(): boolean {
  return import.meta.env.PROD
}
