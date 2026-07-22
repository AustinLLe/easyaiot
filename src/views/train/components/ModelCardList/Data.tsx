import { FormSchema } from '@/components/Table';

export const getFormConfig = (modelOptions: any[] = []): FormSchema[] => {
  return [
    {
      field: 'model_id',
      label: '算法',
      component: 'Select',
      componentProps: {
        placeholder: '请选择算法',
        showSearch: true,
        allowClear: true,
        filterOption: (input: string, option: any) =>
          option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0,
        options: [
          { label: '全部', value: '' },
          ...modelOptions,
        ],
      },
    },
    {
      field: 'version',
      label: '版本',
      component: 'Input',
      componentProps: {
        placeholder: '请输入版本',
      },
    },
  ];
};
