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
                tooltip: { title: '发送测试邮件', placement: 'top' },
                icon: 'ant-design:mail-outlined',
                ifShow: () => Number(record.msgType) === 3,
                onClick: openMailTest.bind(null, record),
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
    <Modal
      v-model:open="mailTestVisible"
      title="发送测试邮件"
      ok-text="发送"
      cancel-text="取消"
      :confirm-loading="mailTestSending"
      @ok="handleMailTest"
    >
      <Input v-model:value="mailTestAddress" placeholder="请输入实际收件邮箱" @press-enter="handleMailTest" />
    </Modal>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { Input, Modal } from 'ant-design-vue';
import { BasicTable, TableAction, useTable } from '@/components/Table';
import { useMessage } from '@/hooks/web/useMessage';
import { useModal } from '@/components/Modal';
import { useDrawer } from '@/components/Drawer';
import { Button } from '@/components/Button';
import { getFormConfig, getTableColumns } from './Data';
import ConfigModal from './ConfigModal.vue';
import DetailDrawer from './DetailDrawer.vue';
import { messageConfigDelete, messageConfigMailSendTest, messageConfigQuery } from '@/api/modules/notice';

defineOptions({ name: 'AlertMessageConfig' });

const [registerConfigModal, { openModal: openConfigModal }] = useModal();
const [registerDetailDrawer, { openDrawer: openDetailDrawer }] = useDrawer();
const { createMessage } = useMessage();
const mailTestVisible = ref(false);
const mailTestSending = ref(false);
const mailTestAddress = ref('');
const mailTestAccountId = ref<number>();

const [registerTable, { reload }] = useTable({
  canResize: true,
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

function openMailTest(record) {
  mailTestAddress.value = '';
  mailTestAccountId.value = record.id;
  mailTestVisible.value = true;
}

async function handleMailTest() {
  const address = mailTestAddress.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    createMessage.warning('请输入正确的收件邮箱');
    return;
  }
  mailTestSending.value = true;
  try {
    await messageConfigMailSendTest(address, mailTestAccountId.value);
    createMessage.success('测试邮件已提交，请在推送历史中查看最终结果');
    mailTestVisible.value = false;
  }
  catch (error) {
    console.error(error);
    createMessage.error('测试邮件提交失败');
  }
  finally {
    mailTestSending.value = false;
  }
}

async function handleDelete({ id, msgType }) {
  try {
    await messageConfigDelete({ id, msgType });
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
  padding: 0 4px;

  :deep(.iot-basic-table-action.left) {
    justify-content: center;
  }
}
</style>
