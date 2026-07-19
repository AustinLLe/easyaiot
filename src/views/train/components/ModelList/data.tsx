import {BasicColumn, FormProps} from "@/components/Table";

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
      width: 120,
    },
    {
      title: '算法版本',
      dataIndex: 'version',
      width: 120,
    },
    {
      title: '算法描述',
      dataIndex: 'description',
      width: 180,
      customRender: ({text}) => text || '--',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 120,
      customRender: ({text}) => formatDateTime(text),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 120,
      customRender: ({text}) => formatDateTime(text),
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

export function getFormConfig(modelOptions: any[] = []): Partial<FormProps> {
  return {
    labelWidth: 80,
    baseColProps: {span: 6},
    schemas: [
      {
        field: 'model_id',
        label: `算法名称`,
        component: 'Select',
        componentProps: {
          placeholder: '请选择算法',
          showSearch: true,
          allowClear: true,
          filterOption: (input: string, option: any) => {
            return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
          },
          options: [
            {label: '全部', value: ''},
            ...modelOptions,
          ],
        },
      },
      {
        field: `status`,
        label: `状态`,
        component: 'Select',
        componentProps: {
          options: [
            {label: '未部署', value: 0},
            {label: '已部署', value: 1},
            {label: '已下线', value: 3},
          ],
        },
      },
    ],
  };
}

function formatDateTime(dateString: string): string {
  if (!dateString) return '--';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}
