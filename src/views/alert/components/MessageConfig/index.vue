<template>
  <div class="message-config-page">
    <BasicTable @register="registerTable">
      <template #toolbar>
        <Button v-auth="['notice:message-config:create']" type="primary" preIcon="ant-design:plus-outlined" @click="openConfigModal(true, { type: 'add' })">
          新增设置
        </Button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'action'">
          <div class="message-config-table-action">
            <TableAction :actions="getTableActions(record)" />
          </div>
        </template>
      </template>
    </BasicTable>
    <ConfigModal @register="registerConfigModal" @success="handleSuccess" />
  </div>
</template>

<script lang="ts" setup>
import { BasicTable, TableAction, useTable } from '@/components/Table';
import { useMessage } from '@/hooks/web/useMessage';
import { useModal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { getFormConfig, getTableColumns } from './Data';
import ConfigModal from './ConfigModal.vue';
import {
  messageConfigDelete,
  messageConfigQuery,
  messageConfigSetDefault,
} from '@/api/modules/notice';

defineOptions({ name: 'AlertMessageConfig' });

const [registerConfigModal, { openModal: openConfigModal }] = useModal();
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

function getTableActions(record) {
  const actions: any[] = [
    {
      icon: 'ant-design:eye-filled',
      tooltip: { title: '查看', placement: 'top' },
      auth: 'notice:message-config:view',
      onClick: openConfigModal.bind(null, true, { type: 'view', record }),
    },
    {
      tooltip: { title: '编辑', placement: 'top' },
      icon: 'ant-design:edit-filled',
      auth: 'notice:message-config:update',
      onClick: openConfigModal.bind(null, true, { type: 'edit', record }),
    },
  ];
  if (+record.msgType === 3 && !record.isDefault) {
    actions.push({
      tooltip: { title: '设为默认发件账号', placement: 'top' },
      icon: 'ant-design:star-outlined',
      auth: 'notice:message-config:update',
      popConfirm: {
        placement: 'topRight',
        title: `确定将 ${record.configurationMap?.mailFrom || '该账号'} 设为默认发件账号？`,
        confirm: handleSetDefault.bind(null, record),
      },
    });
  }
  actions.push({
    tooltip: { title: '删除', placement: 'top' },
    icon: 'material-symbols:delete-outline-rounded',
    auth: 'notice:message-config:delete',
    popConfirm: {
      placement: 'topRight',
      title: +record.msgType === 3
        ? '确认删除该发件账号？关联邮件模板会自动迁移到默认账号。'
        : '是否确认删除？',
      confirm: handleDelete.bind(null, record),
    },
  });
  return actions;
}

async function handleSetDefault({ id }) {
  try {
    await messageConfigSetDefault(id);
    createMessage.success('已设为默认发件账号');
    reload();
  }
  catch (error: any) {
    console.error(error);
    createMessage.error(error?.message || error?.msg || '设置默认账号失败');
  }
}

async function handleDelete({ id, msgType }) {
  try {
    await messageConfigDelete({ id, msgType });
    createMessage.success('删除成功');
    handleSuccess();
  }
  catch (error: any) {
    console.error(error);
    createMessage.error(error?.message || error?.msg || '删除失败');
  }
}
</script>

<style lang="less" scoped>
.message-config-page {
  height: 100%;
  padding: 0 4px;

  .message-config-table-action {
    display: flex;
    justify-content: center;
    width: 100%;

    :deep([class*='-basic-table-action']) {
      justify-content: center !important;
    }
  }

  :deep(.message-config-action-column) {
    text-align: center !important;
  }
}
</style>
