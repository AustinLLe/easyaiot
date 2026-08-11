// 修改后的Data.tsx文件
import {BasicColumn, FormProps} from "@/components/Table";
import {Tag} from "ant-design-vue";

export function getBasicColumns(): BasicColumn[] {
  return [
    {
      title: '设备ID',
      dataIndex: 'id',
      width: 120,
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      width: 120,
    },
    {
      title: '设备型号',
      dataIndex: 'model',
      width: 120,
    },
    {
      title: '推流状态',
      dataIndex: 'online',
      width: 60,
      customRender: ({text, record}) => {
        const status = record.stream_status || (text ? 'pushing' : 'not_pushing');
        const label = status === 'pushing' ? '推流中' : status === 'unknown' ? '状态未知' : '未推流';
        const color = status === 'pushing' ? 'green' : status === 'unknown' ? 'orange' : 'red';
        return <Tag
          color={color}>{label}</Tag>;
      },
    },
    {
      title: '制造商',
      dataIndex: 'manufacturer',
      width: 90,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      width: 120,
    },
    {
      title: '端口',
      dataIndex: 'port',
      width: 60,
    },
    {
      title: '拉流地址',
      dataIndex: 'source',
      width: 70,
    },
    {
      title: '推流地址',
      dataIndex: 'rtmp_stream',
      width: 70,
    },
    {
      width: 180,
      title: '操作',
      dataIndex: 'action',
      align: 'center',
      className: 'camera-action-column',
    },
  ];
}

export function getFormConfig(): Partial<FormProps> {
  return {
    labelWidth: 80,
    baseColProps: {span: 6},
    actionColOptions: {
      span: 12,
      style: { textAlign: 'right' }
    },
    schemas: [
      {
        field: `deviceName`,
        label: `设备名称`,
        component: 'Input',
      },
      {
        field: `online`,
        label: `推流状态`,
        component: 'Select',
        componentProps: {
          options: [
            {value: '', label: '全部'},
            {value: true, label: '推流中'},
            {value: false, label: '未推流'},
          ]
        }
      }
    ]
  }
}
