import type { BasicColumn, FormSchema } from '@/components/Table'
import { useRender } from '@/components/Table'

const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(value => ({
  label: value,
  value,
}))

export const searchFormSchema: FormSchema[] = [
  {
    label: '应用名',
    field: 'applicationName',
    component: 'Input',
    colProps: { span: 8 },
  },
  {
    label: '请求地址',
    field: 'requestUrl',
    component: 'Input',
    colProps: { span: 8 },
  },
  {
    label: '请求方法',
    field: 'requestMethod',
    component: 'Select',
    componentProps: { options: methodOptions },
    colProps: { span: 8 },
  },
  {
    label: '用户 IP',
    field: 'userIp',
    component: 'Input',
    colProps: { span: 8 },
  },
  {
    label: '记录时间',
    field: 'createTime',
    component: 'RangePicker',
    colProps: { span: 8 },
  },
]

export const accessColumns: BasicColumn[] = [
  { title: '编号', dataIndex: 'id', width: 90 },
  { title: '应用', dataIndex: 'applicationName', width: 150 },
  { title: '方法', dataIndex: 'requestMethod', width: 90 },
  { title: '请求地址', dataIndex: 'requestUrl', ellipsis: true },
  { title: '用户 IP', dataIndex: 'userIp', width: 135 },
  {
    title: '结果',
    dataIndex: 'resultCode',
    width: 100,
    customRender: ({ text }) =>
      useRender.renderTag(Number(text) === 0 ? '成功' : String(text), Number(text) === 0 ? '#16a34a' : '#ef4444'),
  },
  {
    title: '耗时',
    dataIndex: 'duration',
    width: 100,
    customRender: ({ text }) => useRender.renderText(text, ' ms'),
  },
  {
    title: '访问时间',
    dataIndex: 'createTime',
    width: 180,
    customRender: ({ text }) => useRender.renderDate(text),
  },
]

export const errorColumns: BasicColumn[] = [
  { title: '编号', dataIndex: 'id', width: 90 },
  { title: '应用', dataIndex: 'applicationName', width: 150 },
  { title: '方法', dataIndex: 'requestMethod', width: 90 },
  { title: '请求地址', dataIndex: 'requestUrl', ellipsis: true },
  { title: '异常类型', dataIndex: 'exceptionName', width: 190, ellipsis: true },
  { title: '异常信息', dataIndex: 'exceptionMessage', ellipsis: true },
  {
    title: '处理状态',
    dataIndex: 'processStatus',
    width: 100,
    customRender: ({ text }) =>
      useRender.renderTag(Number(text) === 1 ? '已处理' : '未处理', Number(text) === 1 ? '#16a34a' : '#f59e0b'),
  },
  {
    title: '异常时间',
    dataIndex: 'exceptionTime',
    width: 180,
    customRender: ({ text }) => useRender.renderDate(text),
  },
]
