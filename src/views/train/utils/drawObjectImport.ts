import type { ModelDrawObjectItem } from '../modelDraft.types';

export type DrawObjectDuplicateReason = 'file-duplicate' | 'existing-duplicate';

export interface DrawObjectImportSkippedItem {
  class_key: string;
  row: number;
  reason: DrawObjectDuplicateReason;
}

export interface DrawObjectImportResult {
  items: ModelDrawObjectItem[];
  skipped: DrawObjectImportSkippedItem[];
}

export function normalizeDrawObjectClassKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function classifyDrawObjectDuplicate(
  classKey: unknown,
  seenKeys: ReadonlySet<string>,
  reservedKeys: ReadonlySet<string>,
): DrawObjectDuplicateReason | null {
  const normalized = normalizeDrawObjectClassKey(classKey);
  if (seenKeys.has(normalized))
    return 'file-duplicate';
  if (reservedKeys.has(normalized))
    return 'existing-duplicate';
  return null;
}
