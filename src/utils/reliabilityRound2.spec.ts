import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateUploadProgress } from '../components/Upload/src/helper'
import { darken, lighten } from './color'
import { buildUUID } from './uuid'

describe('reliability round 2 boundaries', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps upload progress finite when the total size is unavailable', () => {
    expect(calculateUploadProgress(50, 100)).toBe(50)
    expect(calculateUploadProgress(0, 0)).toBe(0)
    expect(calculateUploadProgress(1, 0)).toBe(0)
    expect(calculateUploadProgress(Number.POSITIVE_INFINITY, 100)).toBe(0)
  })

  it('keeps color truncation within the expected RGB result', () => {
    expect(darken('#ffffff', 10)).toBe('#e6e6e6')
    expect(lighten('#000000', 10)).toBe('#191919')
  })

  it('keeps UUID shape, version and variant bits', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    const uuid = buildUUID()

    expect(uuid).toMatch(/^[0-9a-f]{32}$/)
    expect(uuid[12]).toBe('4')
    expect(uuid[16]).toBe('a')
  })
})
