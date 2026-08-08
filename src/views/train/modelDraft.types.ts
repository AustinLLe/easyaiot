export type ModelSectionKey = 'basic' | 'threshold' | 'draw_object' | 'draw_style';

export interface ModelPreviewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ModelDrawRegion {
  preview_bbox?: ModelPreviewRect;
  title_bbox?: ModelPreviewRect;
}

export interface ModelDrawObjectItem {
  id: string;
  class_key: string;
  class_label: string;
  label: string;
  color: string;
  enabled: boolean;
  preview_bbox?: ModelPreviewRect;
  title_bbox?: ModelPreviewRect;
  /** 一条记录对应多个绘制区域（默认行） */
  preview_regions?: ModelDrawRegion[];
}

export interface ModelDetectionConfigDraft {
  conf: number;
  iou: number;
  imgsz: number;
  min_box_area: number;
  max_detections: number;
  extract_interval: number;
  class_whitelist: string[];
}

export interface ModelDrawObjectDraft {
  items: ModelDrawObjectItem[];
}

export interface DrawStyleCardConfig {
  enabled: boolean;
  border_width: number;
  color: string;
  bg_color?: string;
  limb_types?: string[];
}

export interface ModelDrawStyleDraft {
  detection_area: DrawStyleCardConfig;
  object_box: DrawStyleCardConfig;
  object_box_title: DrawStyleCardConfig;
  segmentation: DrawStyleCardConfig;
  limb: DrawStyleCardConfig;
}

export interface ModelDraft {
  id: number | null;
  name: string;
  version: string;
  description: string;
  status: number;
  filePath: string;
  model_format: 'pt' | 'onnx' | 'rknn' | '';
  base_model: string;
  class_labels_text: string;
  imageUrl: string;
  custom_enabled: boolean;
  algorithm_params: Record<string, number | string | boolean>;
  /** 扩展参数描述，key 与 algorithm_params 对齐 */
  algorithm_param_descriptions?: Record<string, string>;
  detection_config: ModelDetectionConfigDraft;
  draw_objects: ModelDrawObjectDraft;
  draw_style: ModelDrawStyleDraft;
}

export const LIMB_TYPE_OPTIONS = ['头部', '身体', '手部', '脚部'] as const;

export { THRESHOLD_MODE_OPTIONS } from '@/views/algorithm-task/algorithmTaskDraft.types';
