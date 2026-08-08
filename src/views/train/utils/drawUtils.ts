import * as XLSX from 'xlsx';
import { createDrawObjectItem } from '../components/ModelModal/useDraft';
import {
  DRAW_OBJECT_IMPORT_COLUMNS,
  DRAW_OBJECT_IMPORT_EXAMPLE_ROW,
  DRAW_OBJECT_IMPORT_HEADERS,
  DRAW_OBJECT_IMPORT_SHEET_NAME,
  DRAW_OBJECT_IMPORT_TEMPLATE_FILENAME,
} from '../constants/drawObjectImportTemplate';
import type { ModelDrawObjectItem, ModelDrawRegion, ModelPreviewRect } from '../modelDraft.types';
import { translateClassLabel } from './classLabelUtils';

export const DEFAULT_MODEL_PREVIEW = '/images/model-preview.jpg';

export const MODEL_PREVIEW_IMAGE_SIZE = {
  width: 1024,
  height: 564,
};

export function pixelRectToPercent(
  topLeft: { x: number; y: number },
  bottomRight: { x: number; y: number },
): ModelPreviewRect {
  const { width, height } = MODEL_PREVIEW_IMAGE_SIZE;
  return {
    x: (topLeft.x / width) * 100,
    y: (topLeft.y / height) * 100,
    w: ((bottomRight.x - topLeft.x) / width) * 100,
    h: ((bottomRight.y - topLeft.y) / height) * 100,
  };
}

/** 默认演示标注（1024×564 原始像素） */
export const DEFAULT_DRAW_OBJECT_PRESETS = [
  {
    preview_bbox: pixelRectToPercent({ x: 338, y: 116 }, { x: 442, y: 326 }),
    title_bbox: pixelRectToPercent({ x: 338, y: 93 }, { x: 443, y: 116 }),
  },
  {
    preview_bbox: pixelRectToPercent({ x: 529, y: 66 }, { x: 632, y: 344 }),
    title_bbox: pixelRectToPercent({ x: 529, y: 43 }, { x: 632, y: 66 }),
  },
  {
    preview_bbox: pixelRectToPercent({ x: 658, y: 164 }, { x: 751, y: 352 }),
    title_bbox: pixelRectToPercent({ x: 658, y: 141 }, { x: 752, y: 164 }),
  },
  {
    preview_bbox: pixelRectToPercent({ x: 239, y: 188 }, { x: 326, y: 371 }),
    title_bbox: pixelRectToPercent({ x: 239, y: 165 }, { x: 327, y: 188 }),
  },
  {
    preview_bbox: pixelRectToPercent({ x: 447, y: 205 }, { x: 516, y: 338 }),
    title_bbox: pixelRectToPercent({ x: 447, y: 182 }, { x: 517, y: 205 }),
  },
] as const;

export type PreviewEdgeStyle = Record<string, string | number>;

/** 将多边形轮廓转为 CSS 线段（border_width 为屏幕像素，与对象框一致） */
export function buildPolygonEdgeStyles(
  points: ReadonlyArray<{ x: number; y: number }>,
  borderWidth: number,
  color: string,
  closed = true,
): PreviewEdgeStyle[] {
  const { width, height } = MODEL_PREVIEW_IMAGE_SIZE;
  if (points.length < 2 || borderWidth <= 0)
    return [];

  const edges: PreviewEdgeStyle[] = [];
  const segmentCount = closed ? points.length : points.length - 1;

  for (let i = 0; i < segmentCount; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy);
    const widthPercent = (length / width) * 100;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    edges.push({
      position: 'absolute',
      left: `${(p1.x / width) * 100}%`,
      top: `${(p1.y / height) * 100}%`,
      width: `${widthPercent}%`,
      height: `${borderWidth}px`,
      background: color,
      transformOrigin: '0 50%',
      transform: `translateY(-50%) rotate(${angleDeg}deg)`,
      pointerEvents: 'none',
    });
  }

  return edges;
}

/** 检测区域多边形（1024×564 原始像素，闭合） */
export const DEFAULT_DETECTION_AREA_POLYGON = [
  { x: 412, y: 29 },
  { x: 38, y: 264 },
  { x: 68, y: 514 },
  { x: 946, y: 495 },
  { x: 918, y: 64 },
] as const;

/** 分割绘制多边形（1024×564 原始像素） */
export const DEFAULT_SEGMENTATION_POLYGONS = [
  [
    { x: 325, y: 115 },
    { x: 153, y: 308 },
    { x: 196, y: 413 },
    { x: 355, y: 161 },
  ],
  [
    { x: 752, y: 132 },
    { x: 736, y: 222 },
    { x: 889, y: 475 },
    { x: 934, y: 358 },
  ],
] as const;

export function rectToCssStyle(rect: ModelPreviewRect) {
  return {
    top: `${rect.y}%`,
    left: `${rect.x}%`,
    width: `${rect.w}%`,
    height: `${rect.h}%`,
  };
}

export function buildPreviewTitleBoxStyle(
  region: ModelDrawRegion,
  item: { color: string },
  titleStyle: { color: string; bg_color?: string },
) {
  if (!region.title_bbox)
    return {};
  return {
    ...rectToCssStyle(region.title_bbox),
    color: titleStyle.color,
    background: titleStyle.bg_color || item.color,
  };
}

export function resolveModelPreviewUrl(imageUrl?: string) {
  return imageUrl?.trim() || DEFAULT_MODEL_PREVIEW;
}

export const DEFAULT_DRAW_CLASS_ID = '1';

export function buildDefaultPreviewRegions(): ModelDrawRegion[] {
  return DEFAULT_DRAW_OBJECT_PRESETS.map(preset => ({
    preview_bbox: { ...preset.preview_bbox },
    title_bbox: { ...preset.title_bbox },
  }));
}

export function expandDrawRegions(item: ModelDrawObjectItem): ModelDrawRegion[] {
  if (item.preview_regions?.length)
    return item.preview_regions;
  if (item.preview_bbox || item.title_bbox)
    return [{ preview_bbox: item.preview_bbox, title_bbox: item.title_bbox }];
  return [];
}

export function itemHasDrawRegions(item: ModelDrawObjectItem): boolean {
  return expandDrawRegions(item).some(
    region => region.preview_bbox || region.title_bbox,
  );
}

export function normalizeDrawRegions(raw: unknown): ModelDrawRegion[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0)
    return undefined;
  const regions: ModelDrawRegion[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object')
      continue;
    const row = entry as Record<string, unknown>;
    const preview_bbox = normalizePreviewRect(row.preview_bbox);
    const title_bbox = normalizePreviewRect(row.title_bbox);
    if (preview_bbox || title_bbox)
      regions.push({ preview_bbox, title_bbox });
  }
  return regions.length ? regions : undefined;
}

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

const DEFAULT_COLOR = '#81807a';

type DrawObjectImportField = typeof DRAW_OBJECT_IMPORT_COLUMNS[number]['field'];

function buildColumnIndexMap(headerRow: unknown[]): Record<DrawObjectImportField, number> {
  const headers = headerRow.map(cell => String(cell ?? '').trim());
  const expected = [...DRAW_OBJECT_IMPORT_HEADERS];

  if (headers.length < expected.length) {
    throw new Error(
      `模板表头不完整，请下载「${DRAW_OBJECT_IMPORT_TEMPLATE_FILENAME}」。需要列：${expected.join('、')}`,
    );
  }

  const map = {} as Record<DrawObjectImportField, number>;
  expected.forEach((header, index) => {
    if (headers[index] !== header) {
      throw new Error(
        `模板表头不正确，请下载最新「${DRAW_OBJECT_IMPORT_TEMPLATE_FILENAME}」。第 ${index + 1} 列应为「${header}」`,
      );
    }
    const field = DRAW_OBJECT_IMPORT_COLUMNS[index].field;
    map[field] = index;
  });

  return map;
}

function parseEnabled(value: unknown): boolean {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text)
    return true;
  if (['是', 'yes', 'y', 'true', '1', '启用', '绘制'].includes(text))
    return true;
  if (['否', 'no', 'n', 'false', '0', '不绘制', '禁用'].includes(text))
    return false;
  throw new Error(`「是否绘制」仅支持填写「是」或「否」，当前值：${String(value ?? '')}`);
}

function parseColor(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text)
    return DEFAULT_COLOR;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text))
    return text;
  throw new Error(`「颜色」需为 #RGB 或 #RRGGBB 格式，当前值：${text}`);
}

function isRowEmpty(cells: unknown[]): boolean {
  return cells.every(cell => String(cell ?? '').trim() === '');
}

/** 浏览器端生成并下载标准模板（非服务端静态文件） */
export function downloadDrawObjectTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    [...DRAW_OBJECT_IMPORT_HEADERS],
    [...DRAW_OBJECT_IMPORT_EXAMPLE_ROW],
  ]);
  ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, DRAW_OBJECT_IMPORT_SHEET_NAME);
  XLSX.writeFile(wb, DRAW_OBJECT_IMPORT_TEMPLATE_FILENAME);
}

export async function parseDrawObjectExcel(file: File): Promise<ModelDrawObjectItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName)
    throw new Error('Excel 文件中没有可用的工作表');

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as unknown[][];

  if (!rows.length)
    throw new Error('Excel 文件内容为空');

  const columnIndexMap = buildColumnIndexMap(rows[0] ?? []);

  const items: ModelDrawObjectItem[] = [];
  const classKeySet = new Set<string>();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] ?? [];
    if (isRowEmpty(row))
      continue;

    const lineNo = rowIndex + 1;
    const classKey = String(row[columnIndexMap.class_key] ?? '').trim();
    if (!classKey)
      throw new Error(`第 ${lineNo} 行 ClassID 不能为空`);

    if (classKeySet.has(classKey))
      throw new Error(`第 ${lineNo} 行 ClassID「${classKey}」在文件中重复`);

    classKeySet.add(classKey);

    items.push(createDrawObjectItem({
      class_key: classKey,
      class_label: String(row[columnIndexMap.class_label] ?? '').trim() || classKey,
      label: String(row[columnIndexMap.label] ?? '').trim()
        || translateClassLabel(String(row[columnIndexMap.class_label] ?? '').trim() || classKey),
      color: parseColor(row[columnIndexMap.color]),
      enabled: parseEnabled(row[columnIndexMap.enabled]),
    }));
  }

  if (!items.length)
    throw new Error('未解析到有效的绘制对象数据，请至少填写一行 ClassID');

  return items;
}
