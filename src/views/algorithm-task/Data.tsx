// 算法任务表格列定义
import { BasicColumn, FormProps } from "@/components/Table";
import { Tag } from "ant-design-vue";

function isTaskRunning(value: unknown) {
  if (value === true || value === 1)
    return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'running';
  }
  return false;
}

/** Normalize search-form is_enabled to 0/1 for list API; empty means no filter. */
export function normalizeIsEnabledFilter(value: unknown): 0 | 1 | undefined {
  if (value === '' || value === undefined || value === null)
    return undefined;
  return isTaskRunning(value) ? 1 : 0;
}

const RUNNING_STATUS_FILTER_OPTIONS = [
  { value: '', label: '全部' },
  { value: 1, label: '运行中' },
  { value: 0, label: '已停止' },
];

export function getBasicColumns(): BasicColumn[] {
  return [
    {
      title: '任务名称',
      dataIndex: 'task_name',
      width: 150,
    },
    {
      title: '任务类型',
      dataIndex: 'task_type',
      width: 120,
      customRender: ({ text }) => {
        return (
          <Tag color={text === 'realtime' ? 'blue' : 'green'}>
            {text === 'realtime' ? '实时算法任务' : '抓拍算法任务'}
          </Tag>
        );
      },
    },
    {
      title: '关联摄像头',
      dataIndex: 'device_names',
      width: 200,
      customRender: ({ text }) => {
        if (!text || !Array.isArray(text) || text.length === 0) {
          return '--';
        }
        return text.join(', ');
      },
    },
    {
      title: '运行状态',
      dataIndex: 'is_enabled',
      width: 100,
      customRender: ({ text }) => {
        const running = isTaskRunning(text);
        return (
          <Tag color={running ? 'green' : 'default'}>
            {running ? '运行中' : '已停止'}
          </Tag>
        );
      },
    },
    {
      title: '关联模型',
      dataIndex: 'model_names',
      width: 200,
      customRender: ({ text, record }) => {
        if (text) {
          return text;
        }
        // 如果没有 model_names 但有 model_ids，显示模型数量
        if (record.model_ids && Array.isArray(record.model_ids) && record.model_ids.length > 0) {
          return `已配置 ${record.model_ids.length} 个模型`;
        }
        // 兼容旧数据：显示算法服务
        if (record.algorithm_services && Array.isArray(record.algorithm_services) && record.algorithm_services.length > 0) {
          return record.algorithm_services.map((s: any) => s.service_name).join(', ');
        }
        return '--';
      },
    },
  ];
}

export function getFormConfig(): Partial<FormProps> {
  return {
    labelWidth: 80,
    baseColProps: { span: 4 },
    actionColOptions: {
      span: 12,
      style: { textAlign: 'right' },
    },
    schemas: [
      {
        field: 'search',
        label: '任务名称',
        component: 'Input',
        componentProps: {
          placeholder: '请输入任务名称',
        },
      },
      {
        field: 'task_type',
        label: '任务类型',
        component: 'Select',
        componentProps: {
          placeholder: '请选择任务类型',
          options: [
            { value: '', label: '全部' },
            { value: 'realtime', label: '实时算法任务' },
            { value: 'snap', label: '抓拍算法任务' },
          ],
        },
      },
      {
        field: 'is_enabled',
        label: '运行状态',
        component: 'Select',
        componentProps: {
          placeholder: '请选择运行状态',
          options: RUNNING_STATUS_FILTER_OPTIONS,
        },
      },
    ],
  };
}
