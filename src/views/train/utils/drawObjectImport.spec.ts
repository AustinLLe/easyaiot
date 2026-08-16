import { describe, expect, it } from 'vitest';
import {
  classifyDrawObjectDuplicate,
  normalizeDrawObjectClassKey,
} from './drawObjectImport';

describe('draw object duplicate filtering', () => {
  it('normalizes trim and case before classifying file/existing duplicates', () => {
    const seen = new Set([normalizeDrawObjectClassKey('Person')]);
    const reserved = new Set([normalizeDrawObjectClassKey('truck')]);

    expect(classifyDrawObjectDuplicate(' PERSON ', seen, reserved)).toBe('file-duplicate');
    expect(classifyDrawObjectDuplicate(' TRUCK ', seen, reserved)).toBe('existing-duplicate');
    expect(classifyDrawObjectDuplicate('car', seen, reserved)).toBeNull();
  });
});
