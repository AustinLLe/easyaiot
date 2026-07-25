import { BasicColumn, FormProps } from '@/components/Table';
import { queryAlertCameras } from '@/api/device/calculate';
import {
  resolveAlertDescription,
  resolveRuleName,
} from './alertDisplayUtils';

/** 告警列表摄像头筛选 */
export const alertCameraSelectProps = {
  api: queryAlertCameras,
  resultField: 'data',
  labelField: 'label',
  valueField: 'value',
  showSearch: true,
  allowClear: true,
  placeholder: '请选择摄像头',
  filterOption: (input: string, option: any) => {
    const q = String(input ?? '').toLowerCase();
    return String(option?.label ?? '').toLowerCase().includes(q);
  },
};

/** 告警时间范围筛选（表格/宫格共用 RangePicker 配置） */
export const alertTimeRangeSchema = {
  field: '[begin_datetime, end_datetime]',
  component: 'RangePicker' as const,
  componentProps: {
    format: 'YYYY-MM-DD HH:mm:ss',
    placeholder: ['开始时间', '结束时间'],
    showTime: { format: 'HH:mm:ss' },
  },
};

export function normalizeAlertTimeRangeParams(params: Record<string, any>) {
  const timeRangeKey = alertTimeRangeSchema.field;
  if (params[timeRangeKey] && Array.isArray(params[timeRangeKey])) {
    const [begin, end] = params[timeRangeKey];
    params.begin_datetime = begin;
    params.end_datetime = end;
    delete params[timeRangeKey];
  }
  return params;
}

export type AlertClientFilters = {
  severity: string | null;
  process_status: string | null;
  archive_status: string | null;
};

/** 拆分 API 参数与本地展示筛选字段（表格/宫格共用） */
export function extractAlertClientFilters(params: Record<string, any>): AlertClientFilters {
  normalizeAlertTimeRangeParams(params);
  if (params._process_status)
    params.process_status = params._process_status;
  if (params._archive_status)
    params.archive_status = params._archive_status;
  const clientFilters: AlertClientFilters = {
    severity: params._severity ?? null,
    process_status: null,
    archive_status: null,
  };
  delete params._severity;
  delete params._process_status;
  delete params._archive_status;
  return clientFilters;
}

export function getBasicColumns(): BasicColumn[] {
  return [
    {
      title: '任务名称',
      dataIndex: 'event',
      key: 'event',
      width: '13%',
      ellipsis: true,
      customRender: ({ text, record }) => text || record?.object || '--',
    },
    {
      title: '摄像头名称',
      dataIndex: 'device_name',
      key: 'device_name',
      width: '9%',
      ellipsis: true,
      customRender: ({ text }) => text || '--',
    },
    {
      title: '报警规则名称',
      dataIndex: 'rule_name',
      key: 'rule_name',
      width: '10%',
      ellipsis: true,
      customRender: ({ record }) => resolveRuleName(record),
    },
    {
      title: '报警描述',
      dataIndex: 'alert_description',
      key: 'alert_description',
      width: '16%',
      ellipsis: true,
      customRender: ({ record }) => resolveAlertDescription(record),
    },
    {
      title: '报警时间',
      dataIndex: 'time',
      key: 'time',
      width: '11%',
      ellipsis: true,
    },
    {
      title: '报警截图',
      dataIndex: 'snapshot_thumb',
      key: 'snapshot_thumb',
      width: '12%',
      align: 'center',
    },
    {
      title: '录制片段',
      dataIndex: 'record_clip',
      key: 'record_clip',
      width: '6%',
      align: 'center',
    },
    {
      title: '报警等级',
      dataIndex: 'severity_level',
      key: 'severity_level',
      width: '7%',
      align: 'center',
    },
    {
      title: '处理状态',
      dataIndex: 'process_status',
      key: 'process_status',
      width: '8%',
      align: 'center',
    },
    {
      title: '归档状态',
      dataIndex: 'archive_status',
      key: 'archive_status',
      width: '8%',
      align: 'center',
    },
  ];
}

export function getFormConfig(): Partial<FormProps> {
  return {
    labelWidth: 72,
    baseColProps: { span: 3 },
    actionColOptions: {
      span: 4,
      style: { textAlign: 'right' },
    },
    schemas: [
      {
        field: 'event',
        label: '任务名称',
        component: 'Input',
        componentProps: {
          placeholder: '请输入任务名称',
          allowClear: true,
        },
      },
      {
        field: 'device_id',
        label: '摄像头',
        component: 'ApiSelect',
        componentProps: alertCameraSelectProps,
      },
      {
        field: '_process_status',
        label: '报警处理',
        component: 'Select',
        componentProps: {
          allowClear: true,
          placeholder: '全部',
          options: [
            { value: null, label: '全部' },
            { value: 'pending', label: '未处理' },
            { value: 'processed', label: '已处理' },
          ],
        },
      },
      {
        ...alertTimeRangeSchema,
        label: '报警时间',
        colProps: { span: 5 },
      },
      {
        field: '_archive_status',
        label: '报警归档',
        component: 'Select',
        componentProps: {
          allowClear: true,
          placeholder: '全部',
          options: [
            { value: null, label: '全部' },
            { value: 'none', label: '暂未归档' },
            { value: 'correct', label: '正确报警' },
            { value: 'incorrect', label: '错误报警' },
          ],
        },
      },
      {
        field: '_severity',
        label: '报警等级',
        component: 'Select',
        componentProps: {
          allowClear: true,
          placeholder: '全部',
          options: [
            { value: null, label: '全部' },
            { value: '一级', label: '一级' },
            { value: '二级', label: '二级' },
            { value: '三级', label: '三级' },
          ],
        },
      },
    ],
  };
}
