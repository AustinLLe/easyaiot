<template>
  <div class="directory-manage-wrapper">
    <div class="directory-layout">
      <DirectorySidebar ref="directorySidebarRef" @select="handleSelectDirectory" />

      <!-- 右侧：设备列表 -->
      <div class="device-content">
        <div class="device-button-group">
          <a-button type="primary" @click="handleAddDevice" :disabled="!selectedDirectoryId">
            <template #icon>
              <PlusOutlined />
            </template>
            添加摄像头
          </a-button>
        </div>
        <BasicTable @register="registerTable">
          <template #bodyCell="{ column, record }">
            <!-- 统一复制功能组件 -->
            <template
              v-if="['id', 'name', 'model'].includes(column.key)">
              <span style="cursor: pointer" @click="handleCopy(record[column.key])">
                <Icon icon="tdesign:copy-filled" color="#4287FCFF"/> {{ record[column.key] }}
              </span>
            </template>

            <!-- 在线状态显示 -->
            <template v-else-if="column.dataIndex === 'online'">
              <a-tag :color="record.online ? 'green' : 'red'">
                {{ record.online ? '在线' : '离线' }}
              </a-tag>
            </template>

            <template v-else-if="column.dataIndex === 'action'">
              <TableAction :actions="getTableActions(record)" />
            </template>
          </template>
        </BasicTable>
      </div>
    </div>

    <!-- 添加目录/摄像头模态框 -->
    <AddDirectoryOrDeviceModal
      @register="registerAddModal"
      @success="handleSuccess"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useMessage } from '@/hooks/web/useMessage';
import { useModal } from '@/components/Modal';
import { BasicTable, TableAction, useTable } from '@/components/Table';
import { Icon } from '@/components/Icon';
import { Tag as ATag } from 'ant-design-vue';
import {
  getDirectoryDevices,
  getStreamStatus,
  moveDeviceToDirectory,
  type DeviceDirectory,
  type DeviceInfo,
  type StreamStatusResponse,
} from '@/api/device/camera';
import AddDirectoryOrDeviceModal from './AddDirectoryOrDeviceModal.vue';
import DirectorySidebar from '../DirectorySidebar/index.vue';
import {
  PlusOutlined,
} from '@ant-design/icons-vue';

const { createMessage } = useMessage();
const [registerAddModal, { openModal: openAddModal }] = useModal();
const directorySidebarRef = ref<InstanceType<typeof DirectorySidebar>>();

// 目录相关
const selectedDirectoryId = ref<number | null>(null);
const selectedDirectoryName = ref<string>('');

// 设备流状态映射
const deviceStreamStatuses = ref<Record<string, string>>({});

// 选择目录
const handleSelectDirectory = (directory: DeviceDirectory | null) => {
  if (!directory) {
    selectedDirectoryId.value = null;
    selectedDirectoryName.value = '';
    reloadDeviceTable();
    return;
  }

  selectedDirectoryId.value = directory.id;
  selectedDirectoryName.value = directory.name;
  reloadDeviceTable();
};

// 获取设备表格列配置
const getDeviceColumns = () => {
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
      width: 100,
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
      width: 80,
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 100,
      fixed: 'right',
    },
  ];
};

// 设备表格配置
const [registerTable, { reload: reloadDeviceTable }] = useTable({
  title: '设备列表',
  api: async (params) => {
    // 如果没有选择目录，返回空数据
    if (!selectedDirectoryId.value) {
      return { data: [], total: 0 };
    }

    try {
      const response = await getDirectoryDevices(selectedDirectoryId.value, {
        pageNo: params.pageNo || 1,
        pageSize: params.pageSize || 10,
        search: params.search || '',
        name: params.name || '',
        online: params.online !== undefined ? params.online : undefined,
        model: params.model || '',
      });
      
      const data = response.code !== undefined ? response.data : response;
      const total = response.code !== undefined ? response.total : (Array.isArray(data) ? data.length : 0);
      
      if (data && Array.isArray(data)) {
        // 应用筛选条件
        let filteredData = data;
        
        if (params.name) {
          filteredData = filteredData.filter((device: DeviceInfo) => 
            device.name && device.name.toLowerCase().includes(params.name.toLowerCase())
          );
        }
        
        if (params.online !== undefined && params.online !== '') {
          filteredData = filteredData.filter((device: DeviceInfo) => 
            device.online === params.online
          );
        }
        
        if (params.model) {
          filteredData = filteredData.filter((device: DeviceInfo) => 
            device.model && device.model.toLowerCase().includes(params.model.toLowerCase())
          );
        }
        
        // 初始化设备流状态
        const devicesWithStatus = filteredData.map((device: DeviceInfo) => {
          if (!deviceStreamStatuses.value[device.id]) {
            deviceStreamStatuses.value[device.id] = 'unknown';
          }
          return {
            ...device,
            stream_status: deviceStreamStatuses.value[device.id] || 'unknown',
          };
        });
        
        // 检查设备流状态
        // 已禁用自动检查设备流状态
        // checkAllDevicesStreamStatus(filteredData);
        
        return {
          data: devicesWithStatus,
          total: devicesWithStatus.length,
        };
      }
      return { data: [], total: 0 };
    } catch (error) {
      console.error('加载设备列表失败', error);
      return { data: [], total: 0 };
    }
  },
  fetchSetting: {
    listField: 'data',
    totalField: 'total',
  },
  columns: getDeviceColumns(),
  useSearchForm: true,
  formConfig: {
    labelWidth: 80,
    baseColProps: { span: 6 },
    actionColOptions: {
      span: 6,
      style: { textAlign: 'right' }
    },
    schemas: [
      {
        field: 'name',
        label: '设备名称',
        component: 'Input',
        componentProps: {
          placeholder: '请输入设备名称',
        },
      },
      {
        field: 'online',
        label: '在线状态',
        component: 'Select',
        componentProps: {
          placeholder: '请选择在线状态',
          allowClear: true,
          options: [
            { label: '在线', value: true },
            { label: '离线', value: false },
          ],
        },
      },
      {
        field: 'model',
        label: '设备型号',
        component: 'Input',
        componentProps: {
          placeholder: '请输入设备型号',
        },
      },
    ],
  },
  showTableSetting: true,
  pagination: true,
  rowKey: 'id',
  canResize: true,
  resizeHeightOffset: 36,
});

// 获取流状态文本
const getStreamStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'running': '运行中',
    'stopped': '已停止',
    'error': '错误',
    'unknown': '未知'
  };
  return statusMap[status] || status || '未知';
};

// 获取流状态颜色
const getStreamStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    'running': 'green',
    'stopped': 'red',
    'error': 'orange',
    'unknown': 'default'
  };
  return colorMap[status] || 'default';
};

// 安全获取设备流状态
const getDeviceStreamStatus = (deviceId: string) => {
  if (!deviceStreamStatuses.value || !deviceStreamStatuses.value[deviceId]) {
    return 'unknown';
  }
  return deviceStreamStatuses.value[deviceId];
};

// 检查单个设备的流状态
const checkDeviceStreamStatus = async (deviceId: string) => {
  try {
    if (!deviceStreamStatuses.value) {
      deviceStreamStatuses.value = {};
    }
    const response: StreamStatusResponse = await getStreamStatus(deviceId);
    if (response.code === 0) {
      deviceStreamStatuses.value[deviceId] = response.data.status;
    } else {
      deviceStreamStatuses.value[deviceId] = 'error';
    }
  } catch (error) {
    console.error(`检查设备 ${deviceId} 流状态失败`, error);
    if (!deviceStreamStatuses.value) {
      deviceStreamStatuses.value = {};
    }
    deviceStreamStatuses.value[deviceId] = 'error';
  }
};

// 检查所有设备的流状态
const checkAllDevicesStreamStatus = async (devices: DeviceInfo[]) => {
  try {
    const deviceIds = devices.map(device => device.id);
    for (const deviceId of deviceIds) {
      await checkDeviceStreamStatus(deviceId);
    }
  } catch (error) {
    console.error('检查设备流状态失败', error);
  }
};

// 获取表格操作按钮
const getTableActions = (record: DeviceInfo) => {
  const actions = [
    {
      icon: 'octicon:play-16',
      tooltip: '播放RTMP流',
      onClick: () => handlePlay(record)
    },
    {
      icon: 'ant-design:disconnect-outlined',
      tooltip: '解除关联目录',
      popConfirm: {
        title: '确定解除此设备与目录的关联？',
        confirm: () => handleUnbindDirectory(record)
      }
    },
  ];

  return actions;
};

// 播放
const handlePlay = (record: DeviceInfo) => {
  emit('play', record);
};

// 解除关联目录
const handleUnbindDirectory = async (record: DeviceInfo) => {
  try {
    createMessage.loading({ content: '正在解除关联...', key: 'unbind' });
    const response = await moveDeviceToDirectory(record.id, null);
    const result = response.code !== undefined ? response : { code: 0, msg: '解除关联成功' };
    if (result.code === 0) {
      createMessage.success({ content: '解除关联成功', key: 'unbind' });
      reloadDeviceTable();
    } else {
      createMessage.error({ content: result.msg || '解除关联失败', key: 'unbind' });
    }
  } catch (error) {
    console.error('解除关联失败', error);
    createMessage.error({ content: '解除关联失败', key: 'unbind' });
  }
};

// 复制功能
async function handleCopy(text: string) {
  if (!text || text === '-') {
    return;
  }
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    createMessage.success('复制成功');
  } catch (error) {
    console.error('复制失败', error);
    createMessage.error('复制失败');
  }
}

// 添加摄像头
const handleAddDevice = () => {
  if (!selectedDirectoryId.value) {
    createMessage.warning('请先选择目录');
    return;
  }
  openAddModal(true, {
    defaultType: 'device',
    defaultParentId: selectedDirectoryId.value,
  });
};

// 添加成功回调
const handleSuccess = () => {
  directorySidebarRef.value?.refresh();
  if (selectedDirectoryId.value) {
    reloadDeviceTable();
  }
};

// 暴露事件
const emit = defineEmits(['view', 'edit', 'delete', 'play', 'toggleStream']);

// 暴露刷新方法
defineExpose({
  refresh: () => {
    directorySidebarRef.value?.refresh();
    if (selectedDirectoryId.value) {
      reloadDeviceTable();
    }
  },
});
</script>

<style lang="less" scoped>
.directory-manage-wrapper {
  padding: 16px;
  background: #f0f2f5;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.directory-layout {
  display: flex;
  gap: 16px;
  height: 100%;
}

.device-content {
  flex: 1;
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.device-button-group {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
