import {FormSchema} from '@/components/Table';

export const getFormConfig = (modelOptions: any[] = []): FormSchema[] => {
  return [
    {
      field: 'model_id',
      label: '算法名称',
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
      field: 'version',
      label: '算法版本',
      component: 'Input',
      componentProps: {
        placeholder: '请输入算法版本',
      },
    },
  ];
};
