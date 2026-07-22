import { defHttp } from '@/utils/http/axios';

enum Api {
  Model = '/model',
  InferenceTask = '/model/inference_task',
  Export = '/model/export',
  DeployService = '/model/deploy_service',
}

type HttpMethod = 'get' | 'post' | 'delete' | 'put';

const authHeaders = () => ({
  'X-Authorization': `Bearer ${localStorage.getItem('jwt_token') || ''}`,
});

const commonApi = (
  method: HttpMethod,
  url: string,
  params: Record<string, any> = {},
  headers: Record<string, string> = {},
  isTransformResponse = true,
) => {
  return defHttp[method](
    {
      url,
      headers: {
        ...authHeaders(),
        ...headers,
      },
      ...params,
    },
    {
      isTransformResponse,
    },
  );
};

export const getModelPage = (params) => commonApi('get', `${Api.Model}/list`, { params });

export const createModel = (params) => commonApi('post', `${Api.Model}/create`, { data: params });

export const listCloudModelCatalog = () => commonApi('get', `${Api.Model}/cloud/catalog`);

export const syncModelFromCloud = (remoteId: number) =>
  commonApi('post', `${Api.Model}/sync_from_cloud`, { data: { remote_id: remoteId } });

export const updateModel = (params) =>
  commonApi('put', `${Api.Model}/${params.id}/update`, { data: params });

export const deleteModel = (modelId) => commonApi('post', `${Api.Model}/${modelId}/delete`);

export const getModelDetail = (modelId) => commonApi('get', `${Api.Model}/${modelId}`);

export const getModelInferenceTasks = (modelId, params) =>
  commonApi('get', `${Api.Model}/${modelId}/inference_tasks`, { params });

export const otaCheck = (params) => commonApi('get', `${Api.Model}/ota_check`, { params });

export const uploadModelFile = (formData: FormData) => {
  return defHttp.post({
    url: `${Api.Model}/upload`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...authHeaders(),
    },
  });
};

export const getInferenceTasks = (params) =>
  commonApi('get', `${Api.InferenceTask}/list`, { params });

export const createInferenceTask = (params) =>
  commonApi('post', `${Api.InferenceTask}/create`, { data: params });

export const updateInferenceTask = (recordId, params) =>
  commonApi('put', `${Api.InferenceTask}/update/${recordId}`, { data: params });

export const deleteInferenceTask = (recordId) =>
  commonApi('delete', `${Api.InferenceTask}/delete/${recordId}`);

export const getInferenceRecords = (params) =>
  commonApi('get', Api.InferenceTask, { params });

export const getInferenceTaskDetail = (recordId) =>
  commonApi('get', `${Api.InferenceTask}/detail/${recordId}`);

export const deleteInferenceRecord = (recordId) =>
  commonApi('delete', `${Api.InferenceTask}/delete/${recordId}`);

export const runInference = (modelId, formData) => {
  return defHttp.post(
    {
      url: `${Api.InferenceTask}/${modelId}/inference/run`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...authHeaders(),
      },
    },
    { isTransformResponse: false },
  );
};

export const runClusterInference = (modelId, formData) => {
  return defHttp.post(
    {
      url: `/model/cluster/${modelId}/inference/run`,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...authHeaders(),
      },
    },
    { isTransformResponse: false },
  );
};

export const streamInferenceProgress = (recordId: number) => {
  return new EventSource(`${Api.InferenceTask}/${recordId}/stream?token=${localStorage.getItem('jwt_token')}`);
};

export const exportModel = (modelId, format, params) =>
  commonApi('post', `${Api.Export}/${modelId}/export/${format}`, { data: params });

export const downloadExportedModel = (exportId) => {
  return defHttp.get(
    {
      url: `${Api.Export}/download/${exportId}`,
      responseType: 'blob',
      headers: authHeaders(),
    },
    { isTransformResponse: false },
  );
};

export const deleteExportedModel = (exportId) =>
  commonApi('delete', `${Api.Export}/delete/${exportId}`);

export const getExportModelList = (params) =>
  commonApi('get', `${Api.Export}/list`, { params });

export const getExportStatus = (taskIdOrExportId: string | number) =>
  commonApi('get', `${Api.Export}/status/${taskIdOrExportId}`);

export const uploadInputFile = (formData: FormData) => {
  return defHttp.post({
    url: `${Api.InferenceTask}/upload_input`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...authHeaders(),
    },
  });
};

export const downloadModel = (modelId, modelPath) => {
  if (modelPath && (modelPath.startsWith('http://') || modelPath.startsWith('https://')))
    return modelPath;
  if (modelPath && modelPath.startsWith('/'))
    return `${window.location.origin}${modelPath}`;
  return `${Api.Model}/${modelId}/download`;
};

export const getDeployServicePage = (params) =>
  commonApi('get', `${Api.DeployService}/list`, { params });

export const deployModel = (params) => {
  return defHttp.post(
    {
      url: `${Api.DeployService}/deploy`,
      data: params,
      timeout: 5 * 60 * 1000,
      headers: authHeaders(),
    },
    { isTransformResponse: true },
  );
};

export const startDeployService = (serviceId) =>
  commonApi('post', `${Api.DeployService}/${serviceId}/start`);

export const stopDeployService = (serviceId) =>
  commonApi('post', `${Api.DeployService}/${serviceId}/stop`);

export const restartDeployService = (serviceId) =>
  commonApi('post', `${Api.DeployService}/${serviceId}/restart`);

export const getDeployServiceLogs = (serviceId, params) =>
  commonApi('get', `${Api.DeployService}/${serviceId}/logs`, { params });

export const deleteDeployService = (serviceId) =>
  commonApi('post', `${Api.DeployService}/${serviceId}/delete`);

export const batchStartDeployService = (serviceName) =>
  commonApi('post', `${Api.DeployService}/batch/start`, { data: { service_name: serviceName } }, {}, false);

export const batchStopDeployService = (serviceName) =>
  commonApi('post', `${Api.DeployService}/batch/stop`, { data: { service_name: serviceName } }, {}, false);

export const batchRestartDeployService = (serviceName) =>
  commonApi('post', `${Api.DeployService}/batch/restart`, { data: { service_name: serviceName } }, {}, false);

export const getDeployServiceReplicas = (serviceName, pageNo?: number, pageSize?: number) => {
  const params: Record<string, any> = { service_name: serviceName };
  if (pageNo !== undefined && pageNo !== null)
    params.pageNo = pageNo;
  if (pageSize !== undefined && pageSize !== null)
    params.pageSize = pageSize;
  return commonApi('get', `${Api.DeployService}/replicas`, { params }, {}, false);
};

export const getSorter = (serviceName) =>
  commonApi('get', `${Api.DeployService}/sorter`, { params: { service_name: serviceName } });

export const startSorter = (serviceName) =>
  commonApi('post', `${Api.DeployService}/sorter/${serviceName}/start`);

export const stopSorter = (serviceName) =>
  commonApi('post', `${Api.DeployService}/sorter/${serviceName}/stop`);

export const restartSorter = (serviceName) =>
  commonApi('post', `${Api.DeployService}/sorter/${serviceName}/restart`);

export const getSorterLogs = (serviceName, params) =>
  commonApi('get', `${Api.DeployService}/sorter/${serviceName}/logs`, { params });

export const getExtractor = (cameraName) =>
  commonApi('get', `${Api.DeployService}/extractor/${cameraName}`);

export const getExtractorList = (params) =>
  commonApi('get', `${Api.DeployService}/extractor/list`, { params });

export const startExtractor = (cameraName) =>
  commonApi('post', `${Api.DeployService}/extractor/${cameraName}/start`);

export const stopExtractor = (cameraName) =>
  commonApi('post', `${Api.DeployService}/extractor/${cameraName}/stop`);

export const restartExtractor = (cameraName) =>
  commonApi('post', `${Api.DeployService}/extractor/${cameraName}/restart`);

export const enableExtractor = (cameraName) =>
  commonApi('post', `${Api.DeployService}/extractor/${cameraName}/enable`);

export const disableExtractor = (cameraName) =>
  commonApi('post', `${Api.DeployService}/extractor/${cameraName}/disable`);

export const getExtractorLogs = (cameraName, params) =>
  commonApi('get', `${Api.DeployService}/extractor/${cameraName}/logs`, { params });
