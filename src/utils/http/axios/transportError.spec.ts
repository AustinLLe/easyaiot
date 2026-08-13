import { describe, expect, it } from 'vitest'
import { throwOriginalTransportError } from './transportError'

describe('throwOriginalTransportError', () => {
  it('rethrows the same transport error object', () => {
    const error = { code: 'ECONNABORTED', response: { status: 504 } }

    let caught: unknown
    try {
      throwOriginalTransportError(error)
    }
    catch (thrown) {
      caught = thrown
    }
    expect(caught).toBe(error)
  })
})
