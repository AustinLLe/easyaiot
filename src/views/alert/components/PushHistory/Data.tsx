import type { FormProps } from '@/components/Form';
import { BasicColumn } from '@/components/Table/src/types/table';
import { formatToDateTime } from '@/utils/dateUtil';
import { Tooltip, Tag } from 'ant-design-vue';

const msgTypeOptions: Record<number, string> = {
  1: '阿里云短信',
  2: '腾讯云短信',
  3: '邮件',
  4: '企业微信',
  5: '网络回调',
  6: '钉钉',
  7: '飞书',
  8: '服务器',
};

export const pushTypeFilterOptions = [
  { label: '全部', value: '' },
  { label: '服务器', value: '8' },
  { label: '阿里云短信', value: '1' },
  { label: '腾讯云短信', value: '2' },
  { label: '邮件', value: '3' },
  { label: '企业微信', value: '4' },
  { label: '网络回调', value: '5' },
  { label: '钉钉', value: '6' },
  { label: '飞书', value: '7' },
];

export const pushTimeRangeSchema = {
  field: '[createTimeFrom, createTimeTo]',
  label: '推送时间',
  component: 'RangePicker' as const,
  componentProps: {
    format: 'YYYY-MM-DD HH:mm:ss',
    placeholder: ['开始时间', '结束时间'],
    showTime: { format: 'HH:mm:ss' },
  },
};

export const getMsgTypeLabel = (msgType: number | string) =>
  msgTypeOptions[Number(msgType)] || String(msgType ?? '-');

export function normalizePushHistoryParams(params: Record<string, any>) {
  const timeRangeKey = pushTimeRangeSchema.field;
  if (params[timeRangeKey] && Array.isArray(params[timeRangeKey])) {
    const [begin, end] = params[timeRangeKey];
    if (begin)
      params.createTimeFrom = formatToDateTime(begin);
    if (end)
      params.createTimeTo = formatToDateTime(end);
    delete params[timeRangeKey];
  }

  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '')
      delete params[key];
  });

  if ('msgType' in params && !Number.isFinite(Number(params.msgType)))
    delete params.msgType;

  return params;
}

export const getHistoryDetailSchema = () => [
  {
    field: 'msgName',
    label: '推送标题',
  },
  {
    field: 'msgTypeLabel',
    label: '推送类型',
  },
  {
    field: 'createTimeLabel',
    label: '推送时间',
  },
  {
    field: 'result',
    label: '推送结果',
    render: (val) => {
      const text = val || '-';
      const ok = typeof text === 'string' && text.startsWith('成功');
      return <Tag color={ok ? 'success' : 'error'}>{text}</Tag>;
    },
  },
  {
    field: 'msgId',
    label: '消息ID',
  },
];

export const getColumns = (): BasicColumn[] => {
  return [
    {
      title: '推送标题',
      dataIndex: 'msgName',
      width: 240,
      ellipsis: true,
    },
    {
      title: '推送类型',
      dataIndex: 'msgType',
      width: 120,
      customRender({ record }) {
        const typeLabel = getMsgTypeLabel(record?.msgType);
        return <Tag color="blue">{typeLabel}</Tag>;
      },
    },
    {
      title: '推送时间',
      dataIndex: 'createTime',
      width: 180,
      format(val) {
        return val ? formatToDateTime(val) : '-';
      },
    },
    {
      title: '推送结果',
      dataIndex: 'result',
      ellipsis: true,
      customRender({ value }) {
        const text = value || '-';
        const ok = typeof text === 'string' && text.startsWith('成功');
        const tag = <Tag color={ok ? 'success' : 'error'}>{ok ? '成功' : '失败'}</Tag>;
        return (
          <Tooltip title={text}>
            {tag}
          </Tooltip>
        );
      },
    },
  ];
};

export const getFormConfig = (): FormProps => {
  return {
    labelWidth: 80,
    baseColProps: { span: 6 },
    schemas: [
      {
        field: 'msgName',
        label: '推送标题',
        component: 'Input',
        componentProps: {
          placeholder: '请输入推送标题',
        },
      },
      {
        field: 'msgType',
        label: '推送类型',
        component: 'Select',
        componentProps: {
          placeholder: '请选择推送类型',
          allowClear: true,
          options: pushTypeFilterOptions,
        },
      },
      {
        ...pushTimeRangeSchema,
      },
    ],
  };
};
