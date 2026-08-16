/** 浏览器侧安全随机数（替代 Math.random，满足 Sonar S2245） */
function getCrypto(): Crypto {
  const cryptoObj = globalThis.crypto || (globalThis as any).msCrypto
  if (!cryptoObj?.getRandomValues)
    throw new Error('Secure random is not available')
  return cryptoObj
}

export function secureUint32(): number {
  const array = new Uint32Array(1)
  getCrypto().getRandomValues(array)
  return array[0]
}

export function fillSecureUint32(length: number): Uint32Array {
  const array = new Uint32Array(length)
  getCrypto().getRandomValues(array)
  return array
}

export function secureUuid(): string {
  const cryptoObj = getCrypto()
  if (typeof cryptoObj.randomUUID === 'function')
    return cryptoObj.randomUUID()

  const bytes = new Uint8Array(16)
  cryptoObj.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
