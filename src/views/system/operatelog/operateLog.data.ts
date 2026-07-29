import { h } from 'vue'
import type { BasicColumn, FormSchema } from '@/components/Table'
import { useRender } from '@/components/Table'
import type { DescItem } from '@/components/Description/index'

export const columns: BasicColumn[] = [
  { title: '日志编号', dataIndex: 'id', width: 100 },
  { title: '操作模块', dataIndex: 'type', width: 180 },
  { title: '操作名称', dataIndex: 'subType', width: 180 },
  { title: '操作人', dataIndex: 'userName', width: 120 },
  { title: '操作内容', dataIndex: 'action', ellipsis: true },
  { title: '请求路径', dataIndex: 'requestUrl', ellipsis: true },
  {
    title: '操作时间',
    dataIndex: 'createTime',
    width: 180,
    customRender: ({ text }) => useRender.renderDate(text),
  },
]

export const searchFormSchema: FormSchema[] = [
  {
    label: '操作模块',
    field: 'type',
    component: 'Input',
    colProps: { span: 8 },
  },
  {
    label: '操作名称',
    field: 'subType',
    component: 'Input',
    colProps: { span: 8 },
  },
  {
    label: '操作内容',
    field: 'action',
    component: 'Input',
    colProps: { span: 8 },
  },
  {
    label: '用户编号',
    field: 'userId',
    component: 'InputNumber',
    colProps: { span: 8 },
  },
  {
    label: '操作时间',
    field: 'createTime',
    component: 'RangePicker',
    colProps: { span: 8 },
  },
]

const httpMethods = [
  { value: 'GET', color: '#108ee9' },
  { value: 'POST', color: '#2db7f5' },
  { value: 'PUT', color: 'warning' },
  { value: 'PATCH', color: 'warning' },
  { value: 'DELETE', color: '#f50' },
]

export const infoSchema: DescItem[] = [
  { field: 'type', label: '操作模块' },
  { field: 'subType', label: '操作名称' },
  {
    field: 'userName',
    label: '操作人',
    render(_, data) {
      return useRender.renderTags([data?.userName || '未知', `uid: ${data?.userId ?? '-'}`])
    },
  },
  { field: 'bizId', label: '业务编号' },
  { field: 'action', label: '操作内容' },
  { field: 'userIp', label: '请求 IP' },
  {
    field: 'createTime',
    label: '操作时间',
    render(value) {
      return useRender.renderDate(value)
    },
  },
  {
    field: 'requestUrl',
    label: '请求路径',
    render(_, data) {
      const requestMethod = data?.requestMethod || ''
      const current = httpMethods.find(item => item.value === requestMethod.toUpperCase())
      const methodTag = current ? useRender.renderTag(requestMethod, current.color) : requestMethod
      return h('span', {}, [methodTag, ` ${data?.requestUrl || ''}`])
    },
  },
  {
    field: 'extra',
    label: '扩展信息',
    show(data) {
      return Boolean(data?.extra)
    },
    render(value) {
      return useRender.renderJsonPreview(value)
    },
  },
  { field: 'userAgent', label: 'User Agent' },
]
