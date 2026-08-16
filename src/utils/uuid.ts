import { secureUint32, secureUuid } from '@/utils/secureRandom'

export function buildUUID(): string {
  return secureUuid().replaceAll('-', '')
}

let unique = 0
export function buildShortUUID(prefix = ''): string {
  unique++
  return `${prefix}_${secureUint32() % 1000000000}${unique}${Date.now()}`
}
