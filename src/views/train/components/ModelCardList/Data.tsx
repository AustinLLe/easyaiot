import { FormSchema } from '@/components/Table';

export const getFormConfig = (modelOptions: any[] = []): FormSchema[] => {
  return [
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
      field: 'version',
      label: 'Version',
      component: 'Input',
      componentProps: {
        placeholder: 'Enter version',
      },
    },
  ];
};
