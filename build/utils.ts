import { existsSync, readFileSync } from 'node:fs'
import path, { join } from 'node:path'
import dotenv from 'dotenv'
import { loadEnv } from 'vite'

const PRODUCTION_ENV_FILE = 'env.production'

export function readEnvFile(fileName: string, cwd = process.cwd()): Recordable<string> {
  const filePath = join(cwd, fileName)
  if (!existsSync(filePath))
    return {}

  return dotenv.parse(readFileSync(filePath, { encoding: 'utf8' }))
}

export function loadProjectEnv(mode: string, root = process.cwd()): Recordable {
  const fallback = mode === 'production' ? readEnvFile(PRODUCTION_ENV_FILE, root) : {}
  return { ...fallback, ...loadEnv(mode, root) }
}

export function isDevFn(mode: string): boolean {
  return mode === 'development'
}

export function isProdFn(mode: string): boolean {
  return mode === 'production'
}

/**
 * Whether to generate package preview
 */
export function isReportMode(): boolean {
  return process.env.REPORT === 'true'
}

// Read all environment variable configuration files to process.env
export function wrapperEnv(envConf: Recordable): ViteEnv {
  const ret: any = {}

  for (const envName of Object.keys(envConf)) {
    let realName = envConf[envName].replaceAll(/\\n/g, '\n')
    realName = realName === 'true' ? true : realName === 'false' ? false : realName

    if (envName === 'VITE_PORT')
      realName = Number(realName)

    if (envName === 'VITE_PROXY' && realName) {
      try {
        realName = JSON.parse(realName.replaceAll(/'/g, '"'))
      }
      catch (error) {
        console.error(error)
        realName = ''
      }
    }
    ret[envName] = realName
    // if (typeof realName === 'string') {
    //   process.env[envName] = realName;
    // } else if (typeof realName === 'object') {
    //   process.env[envName] = JSON.stringify(realName);
    // }
  }
  return ret
}

/**
 * 获取当前环境下生效的配置文件名
 */
function getConfFiles() {
  const script = process.env.npm_lifecycle_script as string
  const reg = /--mode ([a-z_\d]+)/
  const result = reg.exec(script)
  if (result) {
    const mode = result[1]
    return mode === 'production'
      ? [PRODUCTION_ENV_FILE, '.env', `.env.${mode}`]
      : ['.env', `.env.${mode}`]
  }
  return [PRODUCTION_ENV_FILE, '.env', '.env.production']
}

/**
 * Get the environment variables starting with the specified prefix
 * @param match prefix
 * @param confFiles ext
 */
export function getEnvConfig(
  match = 'VITE_GLOB_',
  confFiles = getConfFiles(),
): Promise<{
  [key: string]: string
}> {
  let envConfig = {}

  for (const confFile of confFiles)
    envConfig = { ...envConfig, ...readEnvFile(confFile) }
  const reg = new RegExp(`^(${match})`)
  Object.keys(envConfig).forEach((key) => {
    if (!reg.test(key))
      Reflect.deleteProperty(envConfig, key)
  })
  return envConfig
}

/**
 * Get user root directory
 * @param dir file path
 */
export function getRootPath(...dir: string[]) {
  return path.resolve(process.cwd(), ...dir)
}
