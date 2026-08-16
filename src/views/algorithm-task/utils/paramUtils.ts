// ---- from algorithmParamSchema.ts ----
import { ref } from 'vue';
import { secureUint32 } from '@/utils/secureRandom';
import type { AlgorithmParamPreset } from '../algorithmTaskDraft.types';

export type ParamFieldType = 'number' | 'integer';

export type ParamFieldStore = 'detection_config' | 'algorithm_params';

export interface AlgorithmParamField {
  key: string;
  label: string;
  type: ParamFieldType;
  storeIn?: ParamFieldStore;
  min?: number;
  max?: number;
  step?: number;
  default: number;
  hint?: string;
  group?: 'basic' | 'advanced';
}

export interface AlgorithmParamSchema {
  id: string;
  model_id?: number;
  match?: RegExp;
  /** 模型可识别的全部类别，用于 Tag 展示与勾选 */
  recognizable_classes?: string[];
  /** 新建配置时默认勾选的参与检测类别 */
  default_class_whitelist?: string[];
  presets: Record<AlgorithmParamPreset, Record<string, number>>;
  preset_hints: Partial<Record<AlgorithmParamPreset, string>>;
  fields: AlgorithmParamField[];
}

export const PRESET_OPTIONS: Array<{ label: string; value: AlgorithmParamPreset }> = [
  { label: '高精度', value: 'high_precision' },
  { label: '均衡', value: 'balanced' },
  { label: '高检出', value: 'high_recall' },
];

/** 接口就绪前的假类别；后续改为从 .pt / 模型详情接口读取 */
export const MOCK_RECOGNIZABLE_CLASSES = ['person', 'helmet', 'no_helmet', 'head'] as const;

/** 新建配置时默认勾选的参与检测类别 */
export const MOCK_DEFAULT_CLASS_WHITELIST = ['person', 'helmet', 'no_helmet'] as const;

const HELMET_SCHEMA: AlgorithmParamSchema = {
  id: 'helmet',
  match: /安全帽|helmet|no_helmet|head/i,
  recognizable_classes: [...MOCK_RECOGNIZABLE_CLASSES],
  default_class_whitelist: [...MOCK_DEFAULT_CLASS_WHITELIST],
  presets: {
    high_precision: { conf: 0.55, iou: 0.5, min_box_area: 300, max_detections: 80 },
    balanced: { conf: 0.35, iou: 0.45, min_box_area: 200, max_detections: 100 },
    high_recall: { conf: 0.2, iou: 0.4, min_box_area: 100, max_detections: 150 },
  },
  preset_hints: {
    high_precision: '高精度模式下，误报数量可能减少，但漏报数量可能增加',
    balanced: '均衡模式在误报与漏报之间折中',
    high_recall: '高检出模式下更容易检出目标，但误报可能增加',
  },
  fields: [
    {
      key: 'conf',
      label: '置信度阈值',
      type: 'number',
      storeIn: 'detection_config',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.35,
      hint: '低了误报多，高了可能漏检',
      group: 'basic',
    },
    {
      key: 'iou',
      label: '重叠框过滤',
      type: 'number',
      storeIn: 'detection_config',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.45,
      hint: '用来过滤重复框',
      group: 'basic',
    },
    {
      key: 'min_box_area',
      label: '最小目标面积',
      type: 'integer',
      storeIn: 'detection_config',
      min: 0,
      step: 1,
      default: 200,
      hint: '过滤远处小目标',
      group: 'basic',
    },
    {
      key: 'max_detections',
      label: '单帧最大目标数',
      type: 'integer',
      storeIn: 'detection_config',
      min: 1,
      step: 1,
      default: 100,
      hint: '防止目标过多影响性能',
      group: 'basic',
    },
  ],
};

const DEFAULT_YOLO_SCHEMA: AlgorithmParamSchema = {
  id: 'default_yolo',
  recognizable_classes: [...MOCK_RECOGNIZABLE_CLASSES],
  default_class_whitelist: [...MOCK_DEFAULT_CLASS_WHITELIST],
  presets: {
    high_precision: { conf: 0.55, iou: 0.5, min_box_area: 300, max_detections: 80 },
    balanced: { conf: 0.35, iou: 0.45, min_box_area: 200, max_detections: 100 },
    high_recall: { conf: 0.2, iou: 0.4, min_box_area: 100, max_detections: 150 },
  },
  preset_hints: {
    high_precision: '高精度模式下，误报数量可能减少，但漏报数量可能增加',
    balanced: '均衡模式在误报与漏报之间折中',
    high_recall: '高检出模式下更容易检出目标，但误报可能增加',
  },
  fields: [
    {
      key: 'conf',
      label: '置信度阈值',
      type: 'number',
      storeIn: 'detection_config',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.35,
      hint: '调小，升检出；调大，降误报',
      group: 'basic',
    },
    {
      key: 'iou',
      label: '重叠框过滤 (IOU)',
      type: 'number',
      storeIn: 'detection_config',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.45,
      hint: '用来过滤重复检测框',
      group: 'basic',
    },
    {
      key: 'min_box_area',
      label: '最小目标面积',
      type: 'integer',
      storeIn: 'detection_config',
      min: 0,
      step: 1,
      default: 200,
      hint: '过滤远处小目标',
      group: 'advanced',
    },
    {
      key: 'max_detections',
      label: '单帧最大目标数',
      type: 'integer',
      storeIn: 'detection_config',
      min: 1,
      step: 1,
      default: 100,
      hint: '防止目标过多影响性能',
      group: 'advanced',
    },
  ],
};

const SMOKE_SCHEMA: AlgorithmParamSchema = {
  id: 'smoke',
  match: /吸烟|smoke|抽烟/i,
  recognizable_classes: ['person', 'head', 'smoke', 'cigarette'],
  default_class_whitelist: ['person', 'head'],
  presets: {
    high_precision: { conf: 0.55, iou: 0.5, head_det_threshold: 0.85, smoke_cls_threshold: 0.85 },
    balanced: { conf: 0.35, iou: 0.45, head_det_threshold: 0.75, smoke_cls_threshold: 0.75 },
    high_recall: { conf: 0.2, iou: 0.4, head_det_threshold: 0.55, smoke_cls_threshold: 0.55 },
  },
  preset_hints: {
    high_precision: '高精度模式下，误报数量可能减少，但漏报数量可能增加',
  },
  fields: [
    {
      key: 'head_det_threshold',
      label: '人头检测阈值',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.75,
      hint: '调小，升检出；调大，降误报',
      group: 'basic',
    },
    {
      key: 'smoke_cls_threshold',
      label: '抽烟分类阈值',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.75,
      hint: '调小，升检出；调大，降误报',
      group: 'basic',
    },
    {
      key: 'conf',
      label: '置信度阈值',
      type: 'number',
      storeIn: 'detection_config',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.35,
      group: 'advanced',
    },
    {
      key: 'iou',
      label: '重叠框过滤 (IOU)',
      type: 'number',
      storeIn: 'detection_config',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.45,
      group: 'advanced',
    },
  ],
};

const INTRUSION_SCHEMA: AlgorithmParamSchema = {
  id: 'intrusion',
  match: /入侵|intrusion|人员/i,
  recognizable_classes: ['person'],
  default_class_whitelist: ['person'],
  presets: {
    high_precision: { conf: 0.6, iou: 0.5, person_det_threshold: 0.85, intrusion_iou: 0.4 },
    balanced: { conf: 0.4, iou: 0.45, person_det_threshold: 0.75, intrusion_iou: 0.35 },
    high_recall: { conf: 0.25, iou: 0.4, person_det_threshold: 0.55, intrusion_iou: 0.3 },
  },
  preset_hints: {
    high_precision: '高精度模式下，误报数量可能减少，但漏报数量可能增加',
  },
  fields: [
    {
      key: 'person_det_threshold',
      label: '人员检测阈值',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.75,
      hint: '调小，升检出；调大，降误报',
      group: 'basic',
    },
    {
      key: 'intrusion_iou',
      label: '入侵区域重叠阈值',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.35,
      hint: '目标与入侵区域的重叠比例阈值',
      group: 'basic',
    },
    {
      key: 'conf',
      label: '置信度阈值',
      type: 'number',
      storeIn: 'detection_config',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.4,
      group: 'advanced',
    },
  ],
};

const SCHEMA_REGISTRY: AlgorithmParamSchema[] = [
  SMOKE_SCHEMA,
  INTRUSION_SCHEMA,
  HELMET_SCHEMA,
  DEFAULT_YOLO_SCHEMA,
];

export function getRecognizableClasses(_schema?: AlgorithmParamSchema): string[] {
  // 接口就绪前统一使用假类别；后续改为从模型详情 / .pt 读取
  return [...MOCK_RECOGNIZABLE_CLASSES];
}

export function getDefaultClassWhitelist(_schema?: AlgorithmParamSchema): string[] {
  return [];
}

export function getAlgorithmParamSchema(modelId: number, modelName: string): AlgorithmParamSchema {
  const byId = SCHEMA_REGISTRY.find(schema => schema.model_id === modelId);
  if (byId)
    return byId;

  const name = modelName || '';
  const byName = SCHEMA_REGISTRY.find(
    schema => schema.match && schema.match.test(name),
  );
  if (byName)
    return byName;

  return DEFAULT_YOLO_SCHEMA;
}

export function getPresetHint(schema: AlgorithmParamSchema, preset: AlgorithmParamPreset): string {
  return schema.preset_hints[preset]
    ?? schema.preset_hints.high_precision
    ?? '调整预设后参数将自动更新，开启扩展编辑后可手动微调';
}

export function getFieldStore(field: AlgorithmParamField): ParamFieldStore {
  return field.storeIn ?? 'algorithm_params';
}

export function getDefaultValuesFromSchema(schema: AlgorithmParamSchema): Record<string, number> {
  const values: Record<string, number> = {};
  for (const field of schema.fields)
    values[field.key] = field.default;
  return values;
}

export function applyPresetToConfig(
  schema: AlgorithmParamSchema,
  preset: AlgorithmParamPreset,
  modelId: number,
  globalDefaults?: { imgsz?: number; extract_interval?: number },
) {
  const presetValues = schema.presets[preset] ?? schema.presets.balanced;
  const detection_config = {
    model_id: modelId,
    conf: 0.35,
    iou: 0.45,
    imgsz: globalDefaults?.imgsz ?? 416,
    extract_interval: globalDefaults?.extract_interval ?? 25,
    class_whitelist: getDefaultClassWhitelist(schema),
    min_box_area: 200,
    max_detections: 100,
  };
  const algorithm_params: Record<string, number> = {};

  for (const field of schema.fields) {
    const value = presetValues[field.key] ?? field.default;
    if (getFieldStore(field) === 'detection_config')
      (detection_config as Record<string, unknown>)[field.key] = value;
    else
      algorithm_params[field.key] = value;
  }

  for (const [key, value] of Object.entries(presetValues)) {
    const field = schema.fields.find(item => item.key === key);
    if (!field) {
      if (key in detection_config)
        (detection_config as Record<string, unknown>)[key] = value;
      else
        algorithm_params[key] = value;
    }
  }

  return {
    preset,
    custom_enabled: false,
    detection_config,
    algorithm_params: {},
  };
}

// ---- from algorithmParamUtils.ts ----
import type {
  AlgorithmParamConfigDraft,
  AlgorithmTaskDraft,
  DetectionConfigDraft,
  ParamConfigMode,
  ThresholdTableRow,
} from '../algorithmTaskDraft.types';

export function buildComboParamKey(deviceId: string, modelId: number) {
  return `${deviceId}__${modelId}`;
}

export function buildModelNameMapFromDraft(draft: AlgorithmTaskDraft): Map<number, string> {
  const map = new Map<number, string>();
  for (const [id, name] of Object.entries(draft.model_name_map || {})) {
    if (name)
      map.set(Number(id), name);
  }
  return map;
}

function resolveModelName(
  draft: AlgorithmTaskDraft,
  modelNameMap: Map<number, string>,
  modelId: number,
) {
  return modelNameMap.get(modelId)
    ?? draft.model_name_map?.[modelId]
    ?? `模型 ${modelId}`;
}

export function expandComboRows(
  draft: AlgorithmTaskDraft,
  modelNameMap: Map<number, string>,
): ThresholdTableRow[] {
  return draft.camera_bindings.flatMap((binding) => {
    return binding.model_ids.map((rawModelId) => {
      const modelId = Number(rawModelId);
      return {
        key: buildComboParamKey(binding.device_id, modelId),
        device_id: binding.device_id,
        device_name: binding.device_name,
        model_id: modelId,
        model_name: resolveModelName(draft, modelNameMap, modelId),
      };
    });
  });
}

export function expandAlgorithmRows(
  draft: AlgorithmTaskDraft,
  modelNameMap: Map<number, string>,
): ThresholdTableRow[] {
  const seen = new Set<number>();
  const rows: ThresholdTableRow[] = [];

  for (const binding of draft.camera_bindings) {
    for (const rawModelId of binding.model_ids) {
      const modelId = Number(rawModelId);
      if (seen.has(modelId))
        continue;
      seen.add(modelId);
      rows.push({
        key: String(modelId),
        model_id: modelId,
        model_name: resolveModelName(draft, modelNameMap, modelId),
      });
    }
  }

  return rows;
}

export function getThresholdTableRows(
  draft: AlgorithmTaskDraft,
  modelNameMap: Map<number, string>,
): ThresholdTableRow[] {
  return draft.param_config_mode === 'combo'
    ? expandComboRows(draft, modelNameMap)
    : expandAlgorithmRows(draft, modelNameMap);
}

export interface ModelDefaultProfile {
  custom_enabled: boolean;
  detection_config: Partial<AlgorithmParamConfigDraft['detection_config']>;
  algorithm_params: Record<string, number | string | boolean>;
  algorithm_param_descriptions: Record<string, string>;
  recognizable_classes: string[];
  class_options: ClassOption[];
}

const modelDefaultProfileCache = new Map<number, ModelDefaultProfile>();
const modelDefaultProfileCacheVersion = ref(0);

export interface ClassOption {
  label: string;
  value: string;
  raw_label?: string;
}

function markModelDefaultProfileCacheChanged() {
  modelDefaultProfileCacheVersion.value += 1;
}

function numberOrUndefined(value: unknown): number | undefined {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function normalizeClassWhitelist(value: unknown): string[] | undefined {
  if (!Array.isArray(value))
    return undefined;
  return value.map(item => String(item).trim()).filter(Boolean);
}

function createClassOption(value: unknown, label?: unknown): ClassOption | null {
  const normalizedValue = String(value ?? '').trim();
  const normalizedLabel = String(label ?? value ?? '').trim();
  if (!normalizedValue && !normalizedLabel)
    return null;
  const finalValue = normalizedValue || normalizedLabel;
  const finalLabel = normalizedLabel || finalValue;
  const displayLabel = finalLabel !== finalValue && /^\d+$/.test(finalValue)
    ? finalLabel
    : finalLabel !== finalValue
      ? `${finalLabel} (${finalValue})`
      : finalLabel;
  return {
    label: displayLabel,
    value: finalValue,
    raw_label: finalLabel,
  };
}

function normalizeClassLabels(value: unknown): ClassOption[] {
  if (!Array.isArray(value))
    return [];
  return value
    .map((item, index) => {
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        return createClassOption(
          row.class_key ?? row.classKey ?? row.class_id ?? row.classId ?? row.value ?? index,
          row.label ?? row.name ?? row.class_name ?? row.className,
        );
      }
      return createClassOption(item);
    })
    .filter((item): item is ClassOption => !!item);
}

function normalizeDrawObjectClasses(value: unknown): ClassOption[] {
  if (!value || typeof value !== 'object')
    return [];
  const row = value as Record<string, unknown>;
  const items = Array.isArray(row.items) ? row.items : [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object')
        return null;
      const objectRow = item as Record<string, unknown>;
      return createClassOption(
        objectRow.class_key ?? objectRow.classKey ?? objectRow.value,
        objectRow.label ?? objectRow.name ?? objectRow.class_name ?? objectRow.className,
      );
    })
    .filter((item): item is ClassOption => !!item);
}

function uniqueClasses(...groups: Array<string[] | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const group of groups) {
    for (const item of group ?? []) {
      const value = String(item).trim();
      if (!value || seen.has(value))
        continue;
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function uniqueClassOptions(...groups: Array<ClassOption[] | undefined>): ClassOption[] {
  const seen = new Set<string>();
  const result: ClassOption[] = [];
  for (const group of groups) {
    for (const item of group ?? []) {
      const value = String(item.value).trim();
      if (!value || seen.has(value))
        continue;
      seen.add(value);
      result.push({ ...item, value });
    }
  }
  return result;
}

export function parseModelDefaultProfile(record: Record<string, unknown>): ModelDefaultProfile {
  const detectionConfig = record.detection_config && typeof record.detection_config === 'object'
    ? record.detection_config as Record<string, unknown>
    : {};
  const drawObjects = record.draw_objects && typeof record.draw_objects === 'object'
    ? record.draw_objects as Record<string, unknown>
    : detectionConfig.draw_objects && typeof detectionConfig.draw_objects === 'object'
      ? detectionConfig.draw_objects as Record<string, unknown>
      : undefined;
  const drawStyle = record.draw_style && typeof record.draw_style === 'object'
    ? record.draw_style as Record<string, unknown>
    : detectionConfig.draw_style && typeof detectionConfig.draw_style === 'object'
      ? detectionConfig.draw_style as Record<string, unknown>
      : undefined;
  const algorithm_params = normalizeAlgorithmParams(
    record.algorithm_params ?? detectionConfig.algorithm_params,
  );
  const algorithm_param_descriptions = normalizeParamDescriptions(
    record.algorithm_param_descriptions ?? detectionConfig.algorithm_param_descriptions,
  );
  let custom_enabled = false;
  if (detectionConfig.custom_enabled != null)
    custom_enabled = detectionConfig.custom_enabled === true;
  if (record.custom_enabled != null)
    custom_enabled = record.custom_enabled === true;

  const classLabels = normalizeClassLabels(record.class_labels ?? detectionConfig.class_labels);
  const classWhitelist = normalizeClassWhitelist(detectionConfig.class_whitelist);
  const classWhitelistOptions = (classWhitelist ?? [])
    .map(item => createClassOption(item))
    .filter((item): item is ClassOption => !!item);
  const drawObjectClasses = normalizeDrawObjectClasses(drawObjects);
  const classOptions = uniqueClassOptions(classLabels, drawObjectClasses, classWhitelistOptions);

  return {
    custom_enabled,
    algorithm_params,
    algorithm_param_descriptions,
    class_options: classOptions,
    recognizable_classes: classOptions.map(item => item.value),
    detection_config: {
      conf: numberOrUndefined(detectionConfig.conf),
      iou: numberOrUndefined(detectionConfig.iou),
      imgsz: numberOrUndefined(detectionConfig.imgsz),
      extract_interval: numberOrUndefined(detectionConfig.extract_interval),
      min_box_area: numberOrUndefined(detectionConfig.min_box_area),
      max_detections: numberOrUndefined(detectionConfig.max_detections),
      class_whitelist: classWhitelist,
      draw_objects: drawObjects,
      draw_style: drawStyle,
    },
  };
}

export function seedModelDefaultProfiles(records: Array<Record<string, unknown>>) {
  let changed = false;
  for (const record of records) {
    const modelId = Number(record.id);
    if (!Number.isFinite(modelId) || modelId <= 0)
      continue;
    modelDefaultProfileCache.set(modelId, parseModelDefaultProfile(record));
    changed = true;
  }
  if (changed)
    markModelDefaultProfileCacheChanged();
}

export function clearModelDefaultProfileCache(modelId?: number) {
  if (modelId != null)
    modelDefaultProfileCache.delete(modelId);
  else
    modelDefaultProfileCache.clear();
  markModelDefaultProfileCacheChanged();
}

export function getModelClassOptions(modelId?: number | null): Array<{ label: string; value: string }> {
  void modelDefaultProfileCacheVersion.value;
  const profile = modelId != null ? modelDefaultProfileCache.get(Number(modelId)) : undefined;
  if (profile?.class_options?.length)
    return profile.class_options.map(({ label, value }) => ({ label, value }));
  return [];
}

export function getModelAlertClassOptions(modelId?: number | null): Array<{ label: string; value: string; class_key?: string }> {
  void modelDefaultProfileCacheVersion.value;
  const profile = modelId != null ? modelDefaultProfileCache.get(Number(modelId)) : undefined;
  if (profile?.class_options?.length) {
    return profile.class_options.map(({ label, value }) => ({
      label,
      value,
      class_key: value,
    }));
  }
  return [];
}

export function getClassOptionsForDraftModels(draft: AlgorithmTaskDraft): Array<{ label: string; value: string }> {
  void modelDefaultProfileCacheVersion.value;
  const options = uniqueClassOptions(
    ...((draft.model_ids ?? []).map(modelId => modelDefaultProfileCache.get(Number(modelId))?.class_options)),
    (draft.detection_config.class_whitelist ?? [])
      .map(item => createClassOption(item))
      .filter((item): item is ClassOption => !!item),
  );
  return options.map(({ label, value }) => ({ label, value }));
}

export function getAlertClassOptionsForDraftModels(draft: AlgorithmTaskDraft): Array<{ label: string; value: string; class_key?: string }> {
  void modelDefaultProfileCacheVersion.value;
  const options = uniqueClassOptions(
    ...((draft.model_ids ?? []).map(modelId => modelDefaultProfileCache.get(Number(modelId))?.class_options)),
    (draft.detection_config.class_whitelist ?? [])
      .map(item => createClassOption(item))
      .filter((item): item is ClassOption => !!item),
  );
  return options.map(({ label, value }) => ({
    label,
    value,
    class_key: value,
  }));
}

function applyModelDefaultProfile(
  config: AlgorithmParamConfigDraft,
  profile: ModelDefaultProfile,
): AlgorithmParamConfigDraft {
  const detection = profile.detection_config || {};
  const next: AlgorithmParamConfigDraft = {
    ...config,
    custom_enabled: false,
    detection_config: {
      ...config.detection_config,
      ...Object.fromEntries(
        Object.entries(detection).filter(([key, value]) => value !== undefined && key !== 'custom_enabled'),
      ),
      class_whitelist: detection.class_whitelist
        ? [...detection.class_whitelist]
        : [...config.detection_config.class_whitelist],
      draw_objects: detection.draw_objects ? { ...detection.draw_objects } : config.detection_config.draw_objects,
      draw_style: detection.draw_style ? { ...detection.draw_style } : config.detection_config.draw_style,
    },
    algorithm_params: { ...profile.algorithm_params },
  };
  return next;
}

function isGeneratedDefaultParamConfig(
  config: AlgorithmParamConfigDraft,
  modelId: number,
  modelName: string,
  globalDefaults?: { imgsz?: number; extract_interval?: number },
): boolean {
  if (config.custom_enabled || Object.keys(config.algorithm_params || {}).length)
    return false;
  if (config.detection_config.draw_objects || config.detection_config.draw_style)
    return false;

  const schema = getAlgorithmParamSchema(modelId, modelName);
  const generated = applyPresetToConfig(schema, 'balanced', modelId, globalDefaults);
  const current = config.detection_config;
  const expected = generated.detection_config;
  const keys: Array<keyof typeof expected> = [
    'conf',
    'iou',
    'imgsz',
    'extract_interval',
    'min_box_area',
    'max_detections',
  ];
  if (keys.some(key => Number(current[key]) !== Number(expected[key])))
    return false;
  return JSON.stringify(current.class_whitelist || []) === JSON.stringify(expected.class_whitelist || []);
}

export function createDefaultParamConfig(
  modelId: number,
  modelName: string,
  globalDefaults?: { imgsz?: number; extract_interval?: number },
): AlgorithmParamConfigDraft {
  const schema = getAlgorithmParamSchema(modelId, modelName);
  const config = applyPresetToConfig(schema, 'balanced', modelId, globalDefaults);
  const profile = modelDefaultProfileCache.get(modelId);
  return profile ? applyModelDefaultProfile(config, profile) : config;
}

export function ensureParamConfigs(
  draft: AlgorithmTaskDraft,
  modelNameMap: Map<number, string>,
) {
  const globalDefaults = {
    imgsz: draft.detection_config.imgsz,
    extract_interval: draft.detection_config.extract_interval,
  };
  const comboRows = expandComboRows(draft, modelNameMap);

  for (const row of comboRows) {
    const key = buildComboParamKey(row.device_id!, row.model_id);
    if (!draft.combo_param_configs[key]) {
      draft.combo_param_configs[key] = createDefaultParamConfig(
        row.model_id,
        row.model_name,
        globalDefaults,
      );
    }
    else {
      const profile = modelDefaultProfileCache.get(row.model_id);
      if (
        profile
        && isGeneratedDefaultParamConfig(draft.combo_param_configs[key], row.model_id, row.model_name, globalDefaults)
      ) {
        draft.combo_param_configs[key] = applyModelDefaultProfile(draft.combo_param_configs[key], profile);
      }
      else {
        backfillDetectionConfig(draft.combo_param_configs[key], row.model_id, globalDefaults);
      }
    }
  }

  for (const row of expandAlgorithmRows(draft, modelNameMap)) {
    if (!draft.model_param_configs[row.model_id]) {
      draft.model_param_configs[row.model_id] = createDefaultParamConfig(
        row.model_id,
        row.model_name,
        globalDefaults,
      );
    }
    else {
      const profile = modelDefaultProfileCache.get(row.model_id);
      if (
        profile
        && isGeneratedDefaultParamConfig(draft.model_param_configs[row.model_id], row.model_id, row.model_name, globalDefaults)
      ) {
        draft.model_param_configs[row.model_id] = applyModelDefaultProfile(
          draft.model_param_configs[row.model_id],
          profile,
        );
      }
      else {
        backfillDetectionConfig(draft.model_param_configs[row.model_id], row.model_id, globalDefaults);
      }
    }
  }

  pruneStaleParamConfigs(draft, comboRows);
}

function backfillDetectionConfig(
  config: AlgorithmParamConfigDraft,
  modelId: number,
  globalDefaults: { imgsz?: number; extract_interval?: number },
) {
  config.detection_config.model_id = modelId;
  if (config.detection_config.imgsz == null)
    config.detection_config.imgsz = globalDefaults.imgsz ?? 416;
  if (config.detection_config.extract_interval == null)
    config.detection_config.extract_interval = globalDefaults.extract_interval ?? 25;
}

function pruneStaleParamConfigs(
  draft: AlgorithmTaskDraft,
  comboRows: ThresholdTableRow[],
) {
  const validComboKeys = new Set(comboRows.map(row => row.key));
  for (const key of Object.keys(draft.combo_param_configs)) {
    if (!validComboKeys.has(key))
      delete draft.combo_param_configs[key];
  }

  const validModelIds = new Set(
    comboRows.map(row => row.model_id),
  );
  for (const modelId of Object.keys(draft.model_param_configs)) {
    if (!validModelIds.has(Number(modelId)))
      delete draft.model_param_configs[Number(modelId)];
  }
}

export function getParamConfigForRow(
  draft: AlgorithmTaskDraft,
  row: ThresholdTableRow,
): AlgorithmParamConfigDraft {
  const globalDefaults = {
    imgsz: draft.detection_config.imgsz,
    extract_interval: draft.detection_config.extract_interval,
  };
  if (draft.param_config_mode === 'combo') {
    const key = row.key;
    return draft.combo_param_configs[key]
      ?? createDefaultParamConfig(row.model_id, row.model_name, globalDefaults);
  }

  return draft.model_param_configs[row.model_id]
    ?? createDefaultParamConfig(row.model_id, row.model_name, globalDefaults);
}

export function saveParamConfigForRow(
  draft: AlgorithmTaskDraft,
  row: ThresholdTableRow,
  config: AlgorithmParamConfigDraft,
) {
  if (draft.param_config_mode === 'combo')
    draft.combo_param_configs[row.key] = config;
  else
    draft.model_param_configs[row.model_id] = config;
}

export function handleParamConfigModeChange(
  draft: AlgorithmTaskDraft,
  mode: ParamConfigMode,
  modelNameMap: Map<number, string>,
) {
  draft.param_config_mode = mode;
  ensureParamConfigs(draft, modelNameMap);

  if (mode === 'combo') {
    for (const row of expandComboRows(draft, modelNameMap)) {
      const modelConfig = draft.model_param_configs[row.model_id];
      if (modelConfig)
        draft.combo_param_configs[row.key] = cloneParamConfig(modelConfig, row.model_id);
    }
  }
  else {
    for (const row of expandAlgorithmRows(draft, modelNameMap)) {
      const comboRow = expandComboRows(draft, modelNameMap).find(item => item.model_id === row.model_id);
      if (comboRow && draft.combo_param_configs[comboRow.key]) {
        draft.model_param_configs[row.model_id] = cloneParamConfig(
          draft.combo_param_configs[comboRow.key],
          row.model_id,
        );
      }
    }
  }
}

function cloneParamConfig(
  config: AlgorithmParamConfigDraft,
  modelId: number,
): AlgorithmParamConfigDraft {
  const customEnabled = config.custom_enabled === true;
  return {
    preset: config.preset,
    custom_enabled: customEnabled,
    detection_config: {
      ...config.detection_config,
      model_id: modelId,
      class_whitelist: [...config.detection_config.class_whitelist],
      imgsz: config.detection_config.imgsz ?? 416,
      extract_interval: config.detection_config.extract_interval ?? 25,
    },
    algorithm_params: { ...(config.algorithm_params || {}) },
  };
}

/** 组装文档格式的 detection_config（含任务级 enable_tracking / device） */
export function buildFullDetectionConfig(
  itemConfig: AlgorithmParamConfigDraft['detection_config'],
  modelId: number,
  global: DetectionConfigDraft,
) {
  return {
    model_id: modelId,
    conf: itemConfig.conf,
    iou: itemConfig.iou,
    imgsz: itemConfig.imgsz ?? global.imgsz ?? 416,
    class_whitelist: [...(itemConfig.class_whitelist || [])],
    min_box_area: itemConfig.min_box_area,
    max_detections: itemConfig.max_detections,
    extract_interval: itemConfig.extract_interval ?? global.extract_interval ?? 25,
    enable_tracking: global.enable_tracking,
    device: global.device,
    draw_objects: itemConfig.draw_objects ? { ...itemConfig.draw_objects } : undefined,
    draw_style: itemConfig.draw_style ? { ...itemConfig.draw_style } : undefined,
  };
}

function buildItemDetectionPayload(
  row: ThresholdTableRow,
  config: AlgorithmParamConfigDraft,
  global: DetectionConfigDraft,
) {
  const detection_config = buildFullDetectionConfig(
    config.detection_config,
    row.model_id,
    global,
  );
  const payload: Record<string, unknown> = {
    model_id: row.model_id,
    model_name: row.model_name,
    detection_config,
  };

  if (row.device_id) {
    payload.device_id = row.device_id;
    payload.device_name = row.device_name;
  }

  if (config.custom_enabled === true && Object.keys(config.algorithm_params || {}).length)
    payload.algorithm_params = { ...config.algorithm_params };

  return payload;
}

export function buildThresholdPayloadFromDraft(draft: AlgorithmTaskDraft) {
  draft.param_config_mode = 'combo';
  const modelNameMap = buildModelNameMapFromDraft(draft);
  ensureParamConfigs(draft, modelNameMap);

  const global = draft.detection_config;
  const primaryModelId = draft.model_ids[0] ?? draft.detection_config.model_id;

  if (draft.param_config_mode === 'algorithm') {
    const rows = expandAlgorithmRows(draft, modelNameMap);
    const model_detection_configs = rows.map((row) => {
      const config = getParamConfigForRow(draft, row);
      return buildItemDetectionPayload(row, config, global);
    });

    const primaryRow = rows.find(row => row.model_id === primaryModelId) ?? rows[0];
    const primaryConfig = primaryRow
      ? getParamConfigForRow(draft, primaryRow)
      : null;

    return {
      param_config_mode: draft.param_config_mode,
      detection_config: primaryConfig
        ? buildFullDetectionConfig(primaryConfig.detection_config, primaryRow!.model_id, global)
        : buildFullDetectionConfig(
            {
              model_id: primaryModelId ?? 0,
              conf: global.conf,
              iou: global.iou,
              imgsz: global.imgsz,
              class_whitelist: global.class_whitelist,
              min_box_area: global.min_box_area,
              max_detections: global.max_detections,
              extract_interval: global.extract_interval,
            },
            primaryModelId ?? 0,
            global,
          ),
      model_detection_configs,
    };
  }

  const rows = expandComboRows(draft, modelNameMap);
  const binding_detection_configs = rows.map((row) => {
    const config = getParamConfigForRow(draft, row);
    return buildItemDetectionPayload(row, config, global);
  });

  const primaryRow = rows.find(row => row.model_id === primaryModelId) ?? rows[0];
  const primaryConfig = primaryRow
    ? getParamConfigForRow(draft, primaryRow)
    : null;

  return {
    param_config_mode: draft.param_config_mode,
    detection_config: primaryConfig
      ? buildFullDetectionConfig(primaryConfig.detection_config, primaryRow!.model_id, global)
      : buildFullDetectionConfig(
          {
            model_id: primaryModelId ?? 0,
            conf: global.conf,
            iou: global.iou,
            imgsz: global.imgsz,
            class_whitelist: global.class_whitelist,
            min_box_area: global.min_box_area,
            max_detections: global.max_detections,
            extract_interval: global.extract_interval,
          },
          primaryModelId ?? 0,
          global,
        ),
    binding_detection_configs,
  };
}

// ---- from modelExtensionParamsUtils.ts ----
import { getModelDetail } from '@/api/device/model';

export interface ModelExtensionProfile {
  custom_enabled: boolean;
  algorithm_params: Record<string, number | string | boolean>;
  algorithm_param_descriptions: Record<string, string>;
}

const profileCache = new Map<number, ModelExtensionProfile>();

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

/** 与模型管理 mapRecordToModelDraft 对齐，从 GET /model/:id 解析扩展参数 */
export function parseModelExtensionProfile(record: Record<string, unknown>): ModelExtensionProfile {
  let custom_enabled = false;
  const detectionConfig = record.detection_config;
  if (detectionConfig && typeof detectionConfig === 'object') {
    const cfg = detectionConfig as Record<string, unknown>;
    if (cfg.custom_enabled != null)
      custom_enabled = cfg.custom_enabled === true;
  }
  if (record.custom_enabled != null)
    custom_enabled = record.custom_enabled === true;

  const algorithm_params = normalizeAlgorithmParams(
    record.algorithm_params
    ?? (detectionConfig && typeof detectionConfig === 'object'
      ? (detectionConfig as Record<string, unknown>).algorithm_params
      : undefined),
  );

  const algorithm_param_descriptions = normalizeParamDescriptions(
    record.algorithm_param_descriptions
    ?? (detectionConfig && typeof detectionConfig === 'object'
      ? (detectionConfig as Record<string, unknown>).algorithm_param_descriptions
      : undefined),
  );

  return { custom_enabled, algorithm_params, algorithm_param_descriptions };
}

export function mergeExtensionParamsForTask(
  template: Record<string, number | string | boolean>,
  taskValues?: Record<string, number | string | boolean>,
): Record<string, number | string | boolean> {
  const next: Record<string, number | string | boolean> = {};
  for (const key of Object.keys(template)) {
    const taskVal = taskValues?.[key];
    next[key] = taskVal !== undefined && taskVal !== '' ? taskVal : template[key];
  }
  return next;
}

export function getExtensionParamKeys(profile: ModelExtensionProfile): string[] {
  return Object.keys(profile.algorithm_params || {});
}

export async function fetchModelExtensionProfile(modelId: number): Promise<ModelExtensionProfile> {
  if (!Number.isFinite(Number(modelId)) || Number(modelId) <= 0)
    return { custom_enabled: false, algorithm_params: {}, algorithm_param_descriptions: {} };

  const cached = profileCache.get(modelId);
  if (cached)
    return cached;

  try {
    const res = await getModelDetail(modelId) as Record<string, unknown>;
    const record = (res?.data && typeof res.data === 'object' ? res.data : res) as Record<string, unknown>;
    seedModelDefaultProfiles([record]);
    const profile = parseModelExtensionProfile(record);
    profileCache.set(modelId, profile);
    return profile;
  }
  catch {
    return { custom_enabled: false, algorithm_params: {}, algorithm_param_descriptions: {} };
  }
}

export function clearModelExtensionProfileCache(modelId?: number) {
  clearModelDefaultProfileCache(modelId);
  if (modelId != null)
    profileCache.delete(modelId);
  else
    profileCache.clear();
}

// ---- from regionParamUtils.ts ----
import type {
  AlgorithmTaskDraft,
  ParamConfigMode,
  RegionConfigDraft,
  RegionDraft,
  RegionScopeMode,
  RegionTableRow,
  ThresholdTableRow,
} from '../algorithmTaskDraft.types';
import type { DeviceDetectionRegion } from '@/api/device/device_detection_region';

export function createDefaultRegionConfig(): RegionConfigDraft {
  return {
    scope_mode: 'default',
    regions: [],
  };
}

export function isCustomRegionConfig(config: RegionConfigDraft): boolean {
  if (config.scope_mode === 'custom')
    return true;
  return config.regions.some(region => region.points?.length > 0);
}

export function getRegionScopeLabel(config: RegionConfigDraft): string {
  return isCustomRegionConfig(config) ? '自定义' : '默认';
}

function cloneRegionConfig(config: RegionConfigDraft): RegionConfigDraft {
  return {
    scope_mode: config.scope_mode,
    regions: config.regions.map(region => ({
      ...region,
      points: region.points.map(point => [...point]),
    })),
  };
}

function pruneStaleRegionConfigs(
  draft: AlgorithmTaskDraft,
  comboRows: ThresholdTableRow[],
) {
  const validComboKeys = new Set(comboRows.map(row => row.key));
  for (const key of Object.keys(draft.combo_region_configs)) {
    if (!validComboKeys.has(key))
      delete draft.combo_region_configs[key];
  }

  const validModelIds = new Set(comboRows.map(row => row.model_id));
  for (const modelId of Object.keys(draft.model_region_configs)) {
    if (!validModelIds.has(Number(modelId)))
      delete draft.model_region_configs[Number(modelId)];
  }
}

export function ensureRegionConfigs(
  draft: AlgorithmTaskDraft,
  modelNameMap: Map<number, string>,
) {
  const comboRows = expandComboRows(draft, modelNameMap);

  for (const row of comboRows) {
    const key = buildComboParamKey(row.device_id!, row.model_id);
    if (!draft.combo_region_configs[key])
      draft.combo_region_configs[key] = createDefaultRegionConfig();
  }

  for (const row of expandAlgorithmRows(draft, modelNameMap)) {
    if (!draft.model_region_configs[row.model_id])
      draft.model_region_configs[row.model_id] = createDefaultRegionConfig();
  }

  pruneStaleRegionConfigs(draft, comboRows);
}

export function getRegionConfigForRow(
  draft: AlgorithmTaskDraft,
  row: ThresholdTableRow,
): RegionConfigDraft {
  if (draft.param_config_mode === 'combo') {
    return draft.combo_region_configs[row.key]
      ?? createDefaultRegionConfig();
  }

  return draft.model_region_configs[row.model_id]
    ?? createDefaultRegionConfig();
}

export function saveRegionConfigForRow(
  draft: AlgorithmTaskDraft,
  row: ThresholdTableRow,
  config: RegionConfigDraft,
) {
  const cloned = cloneRegionConfig(config);
  if (draft.param_config_mode === 'combo')
    draft.combo_region_configs[row.key] = cloned;
  else
    draft.model_region_configs[row.model_id] = cloned;
}

export function handleRegionConfigModeChange(
  draft: AlgorithmTaskDraft,
  mode: ParamConfigMode,
  modelNameMap: Map<number, string>,
) {
  draft.param_config_mode = mode;
  ensureRegionConfigs(draft, modelNameMap);

  if (mode === 'combo') {
    for (const row of expandComboRows(draft, modelNameMap)) {
      const modelConfig = draft.model_region_configs[row.model_id];
      if (modelConfig)
        draft.combo_region_configs[row.key] = cloneRegionConfig(modelConfig);
    }
  }
  else {
    for (const row of expandAlgorithmRows(draft, modelNameMap)) {
      const comboRow = expandComboRows(draft, modelNameMap)
        .find(item => item.model_id === row.model_id);
      if (comboRow && draft.combo_region_configs[comboRow.key]) {
        draft.model_region_configs[row.model_id] = cloneRegionConfig(
          draft.combo_region_configs[comboRow.key],
        );
      }
    }
  }
}

export function getRegionTableRows(
  draft: AlgorithmTaskDraft,
  modelNameMap: Map<number, string>,
): RegionTableRow[] {
  return getThresholdTableRows(draft, modelNameMap).map((row) => {
    const config = getRegionConfigForRow(draft, row);
    return {
      ...row,
      scope_mode: isCustomRegionConfig(config) ? 'custom' : 'default',
      scope_label: getRegionScopeLabel(config),
    };
  });
}

function generateRandomColor() {
  const colors = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];
  return colors[secureUint32() % colors.length];
}

export function resolveDeviceIdsForModel(
  draft: AlgorithmTaskDraft,
  modelId: number,
): Array<{ device_id: string; device_name: string }> {
  return draft.camera_bindings
    .filter(binding => binding.model_ids.some(id => Number(id) === modelId))
    .map(binding => ({
      device_id: binding.device_id,
      device_name: binding.device_name,
    }));
}

export function resolveDeviceIdForRow(
  draft: AlgorithmTaskDraft,
  row: ThresholdTableRow,
): string {
  if (row.device_id)
    return row.device_id;

  const candidates = resolveDeviceIdsForModel(draft, row.model_id);
  return candidates[0]?.device_id ?? '';
}

export function draftRegionsToDeviceRegions(
  regions: RegionDraft[],
  deviceId: string,
  modelId: number,
): DeviceDetectionRegion[] {
  return regions.map((region, index) => ({
    id: Number.isFinite(Number(region.region_id)) ? Number(region.region_id) : -(index + 1),
    device_id: deviceId,
    region_name: region.region_name || `区域 ${index + 1}`,
    region_type: 'polygon' as const,
    points: (region.points || []).map(([x, y]) => ({ x, y })),
    color: generateRandomColor(),
    opacity: 0.35,
    is_enabled: true,
    sort_order: index,
    model_ids: [modelId],
  }));
}

export function deviceRegionsToDraftRegions(
  regions: DeviceDetectionRegion[],
  deviceId: string,
): RegionDraft[] {
  return regions.map((region, index) => ({
    region_id: String(region.id ?? `region_${Date.now()}_${index}`),
    region_name: region.region_name || `区域 ${index + 1}`,
    device_id: deviceId,
    points: (region.points || []).map(point => [point.x, point.y]),
  }));
}

export function buildRegionConfigFromDrawResult(
  regions: DeviceDetectionRegion[],
  deviceId: string,
  imageId?: number | null,
  imagePath?: string | null,
): RegionConfigDraft {
  const draftRegions = deviceRegionsToDraftRegions(regions, deviceId);
  const hasCustom = draftRegions.some(region => region.points?.length > 0);
  return {
    scope_mode: hasCustom ? 'custom' : 'default',
    regions: draftRegions,
    image_id: imageId ?? null,
    image_path: imagePath ?? null,
  };
}

export function syncFlattenRegionsFromConfigs(draft: AlgorithmTaskDraft) {
  const modelNameMap = buildModelNameMapFromDraft(draft);
  ensureRegionConfigs(draft, modelNameMap);
  const rows = getThresholdTableRows(draft, modelNameMap);
  const merged = new Map<string, RegionDraft>();

  for (const row of rows) {
    const config = getRegionConfigForRow(draft, row);
    for (const region of config.regions) {
      merged.set(region.region_id, { ...region });
    }
  }

  draft.regions = [...merged.values()];
}
