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
      title: '在线状态',
      dataIndex: 'online',
      width: 60,
      customRender: ({text}) => {
        return <Tag
          color={text ? 'green' : 'red'}>{text ? '在线' : '离线'}</Tag>;
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
    // 暂时隐藏拉流/推流地址列
    // {
    //   title: '拉流地址',
    //   dataIndex: 'source',
    //   width: 70,
    // },
    // {
    //   title: '推流地址',
    //   dataIndex: 'rtmp_stream',
    //   width: 70,
    // },
    {
      width: 240,
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
        label: `在线状态`,
        component: 'Select',
        componentProps: {
          options: [
            {value: '', label: '全部'},
            {value: true, label: '在线'},
            {value: false, label: '离线'},
          ]
        }
      }
    ]
  }
}
