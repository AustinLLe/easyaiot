import { BasicColumn, FormProps } from '@/components/Table';

export function getBasicColumns(): BasicColumn[] {
  return [
    {
      title: 'Algorithm ID',
      dataIndex: 'id',
      width: 90,
    },
    {
      title: 'Algorithm Name',
      dataIndex: 'name',
      width: 140,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      width: 110,
    },
    {
      title: 'Format',
      dataIndex: 'model_format',
      width: 90,
      customRender: ({ text }) => String(text || '--').toUpperCase(),
    },
    {
      title: 'Base Model',
      dataIndex: 'base_model',
      width: 120,
      customRender: ({ text }) => text || '--',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: 180,
      customRender: ({ text }) => text || '--',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      width: 150,
      customRender: ({ text }) => formatDateTime(text),
    },
    {
      title: 'Updated',
      dataIndex: 'updated_at',
      width: 150,
      customRender: ({ text }) => formatDateTime(text),
    },
    {
      width: 90,
      title: 'Action',
      dataIndex: 'action',
      align: 'center',
      flag: 'ACTION',
    },
  ];
}

export function getFormConfig(modelOptions: any[] = []): Partial<FormProps> {
  return {
    labelWidth: 90,
    baseColProps: { span: 6 },
    schemas: [
      {
        field: 'model_id',
        label: 'Algorithm',
        component: 'Select',
        componentProps: {
          placeholder: 'Select algorithm',
          showSearch: true,
          allowClear: true,
          filterOption: (input: string, option: any) =>
            option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0,
          options: [
            { label: 'All', value: '' },
            ...modelOptions,
          ],
        },
      },
      {
        field: 'status',
        label: 'Status',
        component: 'Select',
        componentProps: {
          options: [
            { label: 'Draft', value: 0 },
            { label: 'Published', value: 1 },
            { label: 'Offline', value: 3 },
          ],
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
