<template>
  <div class="message-config-page">
    <BasicTable @register="registerTable">
      <template #toolbar>
        <Button type="primary" preIcon="ant-design:plus-outlined" @click="openConfigModal(true, { type: 'add' })">
          新增设置
        </Button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'action'">
          <TableAction
            :actions="[
              {
                icon: 'ant-design:eye-filled',
                tooltip: { title: '详情', placement: 'top' },
                onClick: openDetailDrawer.bind(null, true, { record }),
              },
              {
                tooltip: { title: '编辑', placement: 'top' },
                icon: 'ant-design:edit-filled',
                onClick: openConfigModal.bind(null, true, { type: 'edit', record }),
              },
              {
                tooltip: { title: '删除', placement: 'top' },
                icon: 'material-symbols:delete-outline-rounded',
                popConfirm: {
                  placement: 'topRight',
                  title: '是否确认删除？',
                  confirm: handleDelete.bind(null, record),
                },
              },
            ]"
          />
        </template>
      </template>
    </BasicTable>
    <ConfigModal @register="registerConfigModal" @success="handleSuccess" />
    <DetailDrawer @register="registerDetailDrawer" />
  </div>
</template>

<script lang="ts" setup>
import { BasicTable, TableAction, useTable } from '@/components/Table';
import { useMessage } from '@/hooks/web/useMessage';
import { useModal } from '@/components/Modal';
import { useDrawer } from '@/components/Drawer';
import { Button } from '@/components/Button';
import { getFormConfig, getTableColumns } from './Data';
import ConfigModal from './ConfigModal.vue';
import DetailDrawer from './DetailDrawer.vue';
import { messageConfigDelete, messageConfigQuery } from '@/api/modules/notice';

defineOptions({ name: 'AlertMessageConfig' });

const [registerConfigModal, { openModal: openConfigModal }] = useModal();
const [registerDetailDrawer, { openDrawer: openDetailDrawer }] = useDrawer();
const { createMessage } = useMessage();

const [registerTable, { reload }] = useTable({
  canResize: true,
  resizeHeightOffset: 36,
  showIndexColumn: false,
  title: '消息配置',
  api: messageConfigQuery,
  columns: getTableColumns(),
  useSearchForm: true,
  showTableSetting: false,
  pagination: true,
  formConfig: getFormConfig(),
  rowKey: 'id',
});

function handleSuccess() {
  reload();
}

async function handleDelete({ id }) {
  try {
    await messageConfigDelete({ id });
    createMessage.success('删除成功');
    handleSuccess();
  }
  catch (error) {
    console.error(error);
    createMessage.error('删除失败');
  }
}
</script>

<style lang="less" scoped>
.message-config-page {
  height: 100%;
  padding: 0 4px;

  :deep(.iot-basic-table-action.left) {
    justify-content: center;
  }
}
</style>
