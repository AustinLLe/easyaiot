import { describe, expect, it } from 'vitest'
import {
  isAsciiClassLabel,
  normalizeClassLabelKey,
  translateClassLabel,
} from './classLabelUtils'

describe('class label normalization', () => {
  it('normalizes separators and case for lookup', () => {
    expect(normalizeClassLabelKey('  Safety-Vest  ')).toBe('safety_vest')
  })

  it('translates known labels and preserves unknown labels', () => {
    expect(translateClassLabel('person')).toBe('人员')
    expect(translateClassLabel('custom_label')).toBe('custom_label')
  })

  it('recognizes non-empty printable ASCII labels', () => {
    expect(isAsciiClassLabel('car_01')).toBe(true)
    expect(isAsciiClassLabel('')).toBe(false)
    expect(isAsciiClassLabel('人员')).toBe(false)
  })
})
