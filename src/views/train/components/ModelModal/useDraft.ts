import {
  applyPresetToConfig,
  getAlgorithmParamSchema,
} from '@/views/algorithm-task/utils/paramUtils';
import type { DrawStyleCardConfig, ModelDraft, ModelDrawObjectItem, ModelDrawStyleDraft, ModelPreviewRect } from '../../modelDraft.types';
import { LIMB_TYPE_OPTIONS } from '../../modelDraft.types';
import {
  DEFAULT_DRAW_OBJECT_PRESETS,
  buildDefaultPreviewRegions,
  DEFAULT_DRAW_CLASS_ID,
  normalizeDrawRegions,
} from '../../utils/drawUtils';
import { isAsciiClassLabel, translateClassLabel } from '../../utils/classLabelUtils';

let drawObjectIdSeq = 1;

function normalizePreviewRect(raw: unknown): ModelPreviewRect | undefined {
  if (!raw || typeof raw !== 'object')
    return undefined;
  const row = raw as Record<string, unknown>;
  const x = Number(row.x);
  const y = Number(row.y);
  const w = Number(row.w);
  const h = Number(row.h);
  if ([x, y, w, h].some(v => Number.isNaN(v)))
    return undefined;
  return { x, y, w, h };
}

export { DEFAULT_MODEL_PREVIEW } from '../../utils/drawUtils';

const LEGACY_DEFAULT_DRAW_LABEL = '人员入侵识别';
const LEGACY_PLACEHOLDER_DRAW_LABELS = new Set(['', '识别', LEGACY_DEFAULT_DRAW_LABEL]);
const LEGACY_DEFAULT_CLASS_KEYS = new Set(['person', '']);

export function isDefaultDrawObjectBundle(item: ModelDrawObjectItem): boolean {
  return (item.preview_regions?.length ?? 0) > 0;
}

export function isAutoManagedDrawLabel(label: string, modelName: string): boolean {
  void modelName;
  const trimmed = label.trim();
  if (!trimmed)
    return true;
  if (LEGACY_PLACEHOLDER_DRAW_LABELS.has(trimmed))
    return true;
  return false;
}

export function createDrawObjectItem(
  partial?: Partial<ModelDrawObjectItem>,
): ModelDrawObjectItem {
  return {
    id: String(drawObjectIdSeq++),
    class_key: '',
    class_label: '',
    label: '',
    color: '#81807a',
    enabled: true,
    ...partial,
  };
}

export function createDefaultDrawObjectItems(modelName = ''): ModelDrawObjectItem[] {
  void modelName;
  return [];
}

function mergeLegacyDrawObjectRows(items: ModelDrawObjectItem[], modelName: string): ModelDrawObjectItem[] {
  const bundleItems = items.filter(isDefaultDrawObjectBundle);
  const customItems = items.filter(item => !isDefaultDrawObjectBundle(item));
  if (bundleItems.length)
    return [...bundleItems, ...customItems];

  const legacyRows = items.filter(item => item.preview_bbox || item.title_bbox);
  if (legacyRows.length === 1 && legacyRows.every(item => !item.preview_regions?.length)) {
    const row = legacyRows[0];
    const rawLabel = row.label?.trim() ?? '';
    return [
      createDrawObjectItem({
        id: row.id,
        class_key: LEGACY_DEFAULT_CLASS_KEYS.has(row.class_key?.trim() ?? '')
          ? DEFAULT_DRAW_CLASS_ID
          : row.class_key,
        class_label: row.class_label,
        label: rawLabel && rawLabel !== LEGACY_DEFAULT_DRAW_LABEL ? rawLabel : '',
        color: row.color,
        enabled: row.enabled,
        preview_regions: buildDefaultPreviewRegions(),
      }),
      ...customItems,
    ];
  }

  if (legacyRows.length >= 2 && legacyRows.every(item => !item.preview_regions?.length)) {
    const first = legacyRows[0];
    const rawLabel = first.label?.trim() ?? '';
    return [
      createDrawObjectItem({
        id: first.id,
        class_key: LEGACY_DEFAULT_CLASS_KEYS.has(first.class_key?.trim() ?? '')
          ? DEFAULT_DRAW_CLASS_ID
          : first.class_key,
        class_label: first.class_label,
        label: rawLabel && rawLabel !== LEGACY_DEFAULT_DRAW_LABEL ? rawLabel : '',
        color: first.color,
        enabled: first.enabled,
        preview_regions: legacyRows.map(item => ({
          preview_bbox: item.preview_bbox ? { ...item.preview_bbox } : undefined,
          title_bbox: item.title_bbox ? { ...item.title_bbox } : undefined,
        })),
      }),
      ...customItems,
    ];
  }
  return items;
}

export function syncClassWhitelistFromDrawObjects(draft: ModelDraft) {
  draft.detection_config.class_whitelist = dedupeDrawObjectItems(draft.draw_objects.items)
    .filter(item => item.enabled && item.class_key.trim())
    .map(item => item.class_key.trim());
}

function normalizeDrawObjectItems(raw: unknown, modelName = ''): ModelDrawObjectItem[] {
  if (!Array.isArray(raw) || raw.length === 0)
    return [];

  void modelName;

  const items = raw.map((item, index) => {
    const row = item as Record<string, unknown>;
    const classKey = String(row.class_key ?? row.classKey ?? '').trim();
    const preset = DEFAULT_DRAW_OBJECT_PRESETS[index];
    const rawClassLabel = String(row.class_label ?? row.classLabel ?? row.class_name ?? row.className ?? row.name ?? '').trim();
    const rawLabel = String(row.label ?? row.description ?? '').trim();
    const classLabel = rawClassLabel || (isAsciiClassLabel(rawLabel) ? rawLabel : '');
    const description = rawLabel && rawLabel !== LEGACY_DEFAULT_DRAW_LABEL && rawLabel !== classLabel
      ? rawLabel
      : translateClassLabel(classLabel);
    const previewRegions = normalizeDrawRegions(row.preview_regions);
    return createDrawObjectItem({
      id: String(row.id ?? index + 1),
      class_key: classKey || DEFAULT_DRAW_CLASS_ID,
      class_label: classLabel,
      label: description,
      color: String(row.color ?? '#ff0000'),
      enabled: row.enabled !== false,
      preview_regions: previewRegions,
      preview_bbox: previewRegions ? undefined : normalizePreviewRect(row.preview_bbox) ?? (preset ? { ...preset.preview_bbox } : undefined),
      title_bbox: previewRegions ? undefined : normalizePreviewRect(row.title_bbox) ?? (preset ? { ...preset.title_bbox } : undefined),
    });
  });

  return dedupeDrawObjectItems(mergeLegacyDrawObjectRows(items, modelName));
}

function dedupeDrawObjectItems(items: ModelDrawObjectItem[]): ModelDrawObjectItem[] {
  const result: ModelDrawObjectItem[] = [];
  const seenKeys = new Set<string>();
  for (const item of items) {
    const classKey = item.class_key.trim();
    const key = classKey || `__empty__${item.id}`;
    if (seenKeys.has(key))
      continue;
    seenKeys.add(key);
    result.push(item);
  }
  return result;
}

function createDefaultStyleCard(partial?: Partial<DrawStyleCardConfig>): DrawStyleCardConfig {
  return {
    enabled: true,
    border_width: 2,
    color: '#ff0000',
    ...partial,
  };
}

export function createDefaultDrawStyle(): ModelDrawStyleDraft {
  return {
    detection_area: createDefaultStyleCard(),
    object_box: createDefaultStyleCard(),
    object_box_title: createDefaultStyleCard({
      border_width: 0,
      color: '#ffffff',
      bg_color: '#ff0000',
    }),
    segmentation: createDefaultStyleCard(),
    limb: createDefaultStyleCard({
      limb_types: [...LIMB_TYPE_OPTIONS],
    }),
  };
}

function normalizeDrawStyle(raw: unknown): ModelDrawStyleDraft {
  const defaults = createDefaultDrawStyle();
  if (!raw || typeof raw !== 'object')
    return defaults;

  const style = raw as Record<string, unknown>;

  if ('box_color' in style || 'box_thickness' in style) {
    const color = String(style.box_color ?? '#ff0000');
    const border = Number(style.box_thickness ?? 2);
    defaults.object_box.color = color;
    defaults.object_box.border_width = border;
    defaults.detection_area.color = color;
    defaults.detection_area.border_width = border;
    defaults.segmentation.color = color;
    defaults.limb.color = color;
    if (style.show_label === false)
      defaults.object_box_title.enabled = false;
  }

  const keys = [
    'detection_area',
    'object_box',
    'object_box_title',
    'segmentation',
    'limb',
  ] as const;

  for (const key of keys) {
    if (style[key] && typeof style[key] === 'object') {
      const card = style[key] as Record<string, unknown>;
      defaults[key] = {
        enabled: card.enabled !== false,
        border_width: Number(card.border_width ?? defaults[key].border_width),
        color: String(card.color ?? defaults[key].color),
        bg_color: card.bg_color != null ? String(card.bg_color) : defaults[key].bg_color,
        limb_types: Array.isArray(card.limb_types)
          ? [...card.limb_types as string[]]
          : defaults[key].limb_types,
      };
    }
  }

  return defaults;
}

export function createDefaultModelDraft(): ModelDraft {
  const applied = applyPresetToConfig(getAlgorithmParamSchema(0, ''), 'balanced', 0);
  return {
    id: null,
    name: '',
    version: '',
    description: '',
    status: 0,
    filePath: '',
    model_format: '',
    base_model: '',
    class_labels_text: '',
    imageUrl: '',
    custom_enabled: false,
    algorithm_params: {},
    algorithm_param_descriptions: {},
    detection_config: {
      conf: applied.detection_config.conf,
      iou: applied.detection_config.iou,
      imgsz: applied.detection_config.imgsz,
      min_box_area: applied.detection_config.min_box_area,
      max_detections: applied.detection_config.max_detections,
      extract_interval: applied.detection_config.extract_interval,
      class_whitelist: [],
    },
    draw_objects: {
      items: [],
    },
    draw_style: createDefaultDrawStyle(),
  };
}

export type ModelClassLabelDraft = {
  class_key?: string;
  classKey?: string;
  label?: string;
  class_label?: string;
  classLabel?: string;
  description?: string;
  name?: string;
};

function normalizeClassLabelDrafts(labels?: ModelClassLabelDraft[]): Array<{ class_key: string; label: string }> {
  const normalized: Array<{ class_key: string; label: string }> = [];
  const seen = new Set<string>();
  for (const [index, item] of (labels ?? []).entries()) {
    const classKey = String(item.class_key ?? item.classKey ?? index).trim();
    const label = String(item.class_label ?? item.classLabel ?? item.label ?? item.name ?? '').trim();
    if (!classKey || !label || seen.has(classKey))
      continue;
    seen.add(classKey);
    normalized.push({ class_key: classKey, label });
  }
  return normalized;
}

export function parseClassLabelsText(text: string): ModelClassLabelDraft[] {
  const parsed = text
    .split(/[\r\n,;]+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^(\d+|[A-Za-z_][\w.-]*)\s*[:=\s]\s*(.+)$/);
      if (match)
        return { class_key: match[1], label: match[2].trim() };
      return { class_key: String(index), label: line };
    });
  return normalizeClassLabelDrafts(parsed);
}

export function classLabelsToText(labels?: ModelClassLabelDraft[]): string {
  return normalizeClassLabelDrafts(labels)
    .map(item => `${item.class_key} ${item.label}`.trim())
    .filter(Boolean)
    .join('\n');
}

export function validateDrawObjectRow(row: ModelDrawObjectItem): string | null {
  if (!row.class_key?.trim())
    return '类别ID不能为空';
  if (!row.class_label?.trim())
    return '类别标签不能为空';
  return null;
}

export function findDuplicateClassKey(
  items: ModelDrawObjectItem[],
  excludeId?: string,
): string | null {
  const seen = new Set<string>();
  for (const item of items) {
    if (excludeId && item.id === excludeId)
      continue;
    const classKey = item.class_key?.trim();
    if (!classKey)
      continue;
    if (seen.has(classKey))
      return classKey;
    seen.add(classKey);
  }
  return null;
}

export function validateDrawObjectRowUnique(
  row: ModelDrawObjectItem,
  items: ModelDrawObjectItem[],
): string | null {
  const classKey = row.class_key?.trim();
  if (!classKey)
    return null;
  const duplicated = items.some(
    item => item.id !== row.id && item.class_key?.trim() === classKey,
  );
  if (duplicated)
    return `类别ID「${classKey}」已存在`;
  return null;
}

export function validateDrawObjectRowComplete(
  row: ModelDrawObjectItem,
  items: ModelDrawObjectItem[],
): string | null {
  return validateDrawObjectRow(row) ?? validateDrawObjectRowUnique(row, items);
}

export function validateDrawObjects(items: ModelDrawObjectItem[]): string | null {
  for (const item of items) {
    const error = validateDrawObjectRow(item);
    if (error)
      return error;
  }
  const duplicateKey = findDuplicateClassKey(items);
  if (duplicateKey)
    return `类别ID「${duplicateKey}」重复，请修改后重试`;
  return null;
}

export function validateImportDrawObjects(
  existing: ModelDrawObjectItem[],
  imported: ModelDrawObjectItem[],
): string | null {
  for (const item of imported) {
    const error = validateDrawObjectRow(item);
    if (error)
      return error;
  }

  const existingKeys = new Set(
    existing.map(item => item.class_key.trim()).filter(Boolean),
  );
  for (const item of imported) {
    const classKey = item.class_key.trim();
    if (existingKeys.has(classKey))
      return `类别ID「${classKey}」与已有绘制对象重复`;
    existingKeys.add(classKey);
  }
  return null;
}

export function finalizeDrawObjectLabel(row: ModelDrawObjectItem) {
  if (!row.label?.trim() && row.class_label?.trim())
    row.label = translateClassLabel(row.class_label);
}

export function buildClassLabelsTextFromDrawObjects(items: ModelDrawObjectItem[]): string {
  return dedupeDrawObjectItems(items)
    .filter(item => item.class_key.trim() && (item.class_label || item.label).trim())
    .map(item => `${item.class_key.trim()} ${(item.class_label || item.label).trim()}`)
    .join('\n');
}

export function syncClassLabelsTextFromDrawObjects(draft: ModelDraft) {
  draft.class_labels_text = buildClassLabelsTextFromDrawObjects(draft.draw_objects.items);
}

export function applyClassLabelsToDraft(draft: ModelDraft, labels: ModelClassLabelDraft[]) {
  const normalized = normalizeClassLabelDrafts(labels);

  if (!normalized.length) {
    draft.draw_objects = { ...draft.draw_objects, items: [] };
    draft.class_labels_text = '';
    syncClassWhitelistFromDrawObjects(draft);
    return;
  }

  const existingByKey = new Map(
    dedupeDrawObjectItems(draft.draw_objects.items)
      .filter(item => item.class_key.trim())
      .map(item => [item.class_key.trim(), item]),
  );

  draft.draw_objects = {
    ...draft.draw_objects,
    items: normalized.map((item, index) => {
      const existing = existingByKey.get(item.class_key);
      return {
        id: existing?.id ?? String(index + 1),
        class_key: item.class_key,
        class_label: item.label,
        label: existing?.label?.trim() || translateClassLabel(item.label),
        color: existing?.color ?? ['#ff4d4f', '#1677ff', '#52c41a', '#faad14', '#722ed1'][index % 5],
        enabled: existing?.enabled ?? true,
        preview_regions: existing?.preview_regions,
        preview_bbox: existing?.preview_bbox,
        title_bbox: existing?.title_bbox,
      };
    }),
  };
  syncClassLabelsTextFromDrawObjects(draft);
  syncClassWhitelistFromDrawObjects(draft);
}

export function applyClassLabelsTextToDraft(draft: ModelDraft, text: string) {
  applyClassLabelsToDraft(draft, parseClassLabelsText(text));
}

function normalizeAlgorithmParams(raw: unknown): Record<string, number | string | boolean> {
  if (!raw || typeof raw !== 'object')
    return {};
  const next: Record<string, number | string | boolean> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key.trim() && value != null && value !== '')
      next[key.trim()] = value as number | string | boolean;
  }
  return next;
}

function normalizeParamDescriptions(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object')
    return {};
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const trimmedKey = key.trim();
    const desc = value == null ? '' : String(value).trim();
    if (trimmedKey && desc)
      next[trimmedKey] = desc;
  }
  return next;
}

export function mapRecordToModelDraft(record: Record<string, unknown>): ModelDraft {
  const draft = createDefaultModelDraft();
  const modelId = Number(record.id ?? 0) || null;
  const name = String(record.name ?? '');
  const schema = getAlgorithmParamSchema(modelId ?? 0, name);

  if (record.detection_config && typeof record.detection_config === 'object') {
    const cfg = record.detection_config as Record<string, unknown>;
    draft.detection_config = {
      conf: Number(cfg.conf ?? draft.detection_config.conf),
      iou: Number(cfg.iou ?? draft.detection_config.iou),
      imgsz: Number(cfg.imgsz ?? draft.detection_config.imgsz),
      min_box_area: Number(cfg.min_box_area ?? draft.detection_config.min_box_area),
      max_detections: Number(cfg.max_detections ?? draft.detection_config.max_detections),
      extract_interval: Number(cfg.extract_interval ?? draft.detection_config.extract_interval),
      class_whitelist: Array.isArray(cfg.class_whitelist)
        ? [...cfg.class_whitelist as string[]]
        : draft.detection_config.class_whitelist,
    };
  }
  else {
    const applied = applyPresetToConfig(schema, 'balanced', modelId ?? 0);
    draft.detection_config = {
      conf: applied.detection_config.conf,
      iou: applied.detection_config.iou,
      imgsz: applied.detection_config.imgsz,
      min_box_area: applied.detection_config.min_box_area,
      max_detections: applied.detection_config.max_detections,
      extract_interval: applied.detection_config.extract_interval,
      class_whitelist: [...applied.detection_config.class_whitelist],
    };
  }

  draft.algorithm_params = normalizeAlgorithmParams(
    record.algorithm_params ?? (record.detection_config as Record<string, unknown> | undefined)?.algorithm_params,
  );
  draft.algorithm_param_descriptions = normalizeParamDescriptions(
    record.algorithm_param_descriptions
    ?? (record.detection_config as Record<string, unknown> | undefined)?.algorithm_param_descriptions,
  );
  // 阈值 UI 每次打开固定「默认」模式，扩展参数仍保留作 stash
  draft.custom_enabled = false;

  if (record.draw_objects && typeof record.draw_objects === 'object') {
    const drawObjects = record.draw_objects as Record<string, unknown>;
    if (Array.isArray(drawObjects.items)) {
      draft.draw_objects.items = normalizeDrawObjectItems(drawObjects.items, name);
    }
    else if (Array.isArray(drawObjects.class_whitelist)) {
      draft.draw_objects.items = dedupeDrawObjectItems((drawObjects.class_whitelist as unknown[])
        .map((classKey, index) => createDrawObjectItem({
          id: String(index + 1),
          class_key: String(classKey).trim(),
          class_label: String(classKey).trim(),
          label: translateClassLabel(String(classKey).trim()),
          enabled: true,
          preview_regions: index === 0 ? buildDefaultPreviewRegions() : undefined,
        }))
        .filter(item => item.class_key));
    }
  }

  syncClassWhitelistFromDrawObjects(draft);
  draft.class_labels_text = Array.isArray(record.class_labels)
    ? classLabelsToText(record.class_labels as ModelClassLabelDraft[])
    : buildClassLabelsTextFromDrawObjects(draft.draw_objects.items);

  if (record.draw_style && typeof record.draw_style === 'object') {
    draft.draw_style = normalizeDrawStyle(record.draw_style);
  }

  draft.id = modelId;
  draft.name = name;
  draft.version = String(record.version ?? '');
  draft.description = String(record.description ?? '');
  draft.status = Number(record.status ?? 0);
  draft.filePath = String(
    record.filePath ?? record.model_path ?? record.onnx_model_path ?? '',
  );
  draft.model_format = String(
    record.model_format ?? record.modelFormat ?? '',
  ).toLowerCase() as ModelDraft['model_format'];
  draft.base_model = String(record.base_model ?? record.baseModel ?? '');
  draft.imageUrl = String(record.imageUrl ?? record.image_url ?? '');

  return draft;
}
