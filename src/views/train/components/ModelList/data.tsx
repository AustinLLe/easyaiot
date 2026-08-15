import { BasicColumn, FormProps } from '@/components/Table';
import { MODEL_FORMAT_FILTER_OPTIONS } from '../../utils/modelListQuery';

export function getBasicColumns(): BasicColumn[] {
  return [
    {
      title: '算法ID',
      dataIndex: 'id',
      width: 90,
    },
    {
      title: '算法名称',
      dataIndex: 'name',
      width: 140,
    },
    {
      title: '版本',
      dataIndex: 'version',
      width: 110,
    },
    {
      title: '格式',
      dataIndex: 'model_format',
      width: 90,
      customRender: ({ text }) => String(text || '--').toUpperCase(),
    },
    {
      title: '基础模型',
      dataIndex: 'base_model',
      width: 120,
      customRender: ({ text }) => text || '--',
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 180,
      customRender: ({ text }) => text || '--',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 150,
      customRender: ({ text }) => formatDateTime(text),
    },
    {
      width: 90,
      title: '操作',
      dataIndex: 'action',
      align: 'center',
      flag: 'ACTION',
    },
  ];
}

export function getFormConfig(): Partial<FormProps> {
  return {
    labelWidth: 90,
    baseColProps: { span: 6 },
    schemas: [
      {
        field: 'search',
        label: '算法',
        component: 'Input',
        componentProps: {
          placeholder: '请输入算法名称',
          allowClear: true,
        },
      },
      {
        field: 'model_format',
        label: '格式',
        component: 'Select',
        componentProps: {
          allowClear: true,
          placeholder: '全部',
          options: MODEL_FORMAT_FILTER_OPTIONS,
        },
      },
      {
        field: 'base_model',
        label: '基础模型',
        component: 'Input',
        componentProps: {
          placeholder: '请输入基础模型',
          allowClear: true,
        },
      },
    ],
  };
}

function formatDateTime(dateString: string): string {
  if (!dateString)
    return '--';
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}
