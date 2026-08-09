/**
 * 算法列表筛选参数（对接 GET /model/list）
 *
 * 后端支持：
 * - search: 算法名称/版本/描述模糊匹配
 * - model_format: pt | onnx | rknn（精确匹配，忽略大小写）
 * - base_model: 基础模型模糊匹配
 * - pageNo, pageSize: 分页
 */

export const MODEL_FORMAT_FILTER_OPTIONS = [
  { label: '全部', value: '' },
  { label: 'PT', value: 'pt' },
  { label: 'ONNX', value: 'onnx' },
  { label: 'RKNN', value: 'rknn' },
];

type ModelPageResult = {
  data?: Record<string, unknown>[];
  total?: number;
};

type ModelPageFetcher = (params: Record<string, any>) => Promise<ModelPageResult>;

export function normalizeModelListParams(params: Record<string, any> = {}) {
  const requestParams: Record<string, any> = {
    pageNo: Number(params.pageNo || params.page || 1),
    pageSize: Number(params.pageSize || 10),
  };

  const search = String(params.search ?? '').trim();
  if (search)
    requestParams.search = search;

  const modelFormat = String(params.model_format ?? '').trim();
  if (modelFormat)
    requestParams.model_format = modelFormat.toLowerCase();

  const baseModel = String(params.base_model ?? '').trim();
  if (baseModel)
    requestParams.base_model = baseModel;

  return requestParams;
}

export async function queryModelPage(
  getModelPage: ModelPageFetcher,
  params: Record<string, any> = {},
): Promise<ModelPageResult> {
  return getModelPage(normalizeModelListParams(params));
}
