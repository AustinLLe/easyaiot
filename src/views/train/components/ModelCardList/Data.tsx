import { FormSchema } from '@/components/Table';
import { MODEL_FORMAT_FILTER_OPTIONS } from '../../utils/modelListQuery';

export const getFormConfig = (): FormSchema[] => {
  return [
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
  ];
};
