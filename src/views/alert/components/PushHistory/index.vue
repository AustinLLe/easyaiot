<template>
  <div class="push-history-page">
    <BasicTable @register="registerTable">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'action'">
          <div class="push-history-table-action">
            <TableAction
              :actions="[
              {
                icon: 'ant-design:eye-filled',
                tooltip: {
                  title: '详情',
                  placement: 'top',
                },
                onClick: openDetailDrawer.bind(null, true, { record }),
              },
            ]"
            />
          </div>
        </template>
      </template>
    </BasicTable>
    <HistoryDetailDrawer @register="registerDetailDrawer" />
  </div>
</template>

<script lang="ts" setup>
import { BasicTable, TableAction, useTable } from '@/components/Table';
import { useDrawer } from '@/components/Drawer';
import { getColumns, getFormConfig, normalizePushHistoryParams } from './Data.tsx';
import { historyQuery } from '@/api/modules/task';
import HistoryDetailDrawer from './HistoryDetailDrawer.vue';

defineOptions({ name: 'AlertPushHistory' });

const [registerDetailDrawer, { openDrawer: openDetailDrawer }] = useDrawer();

const [registerTable] = useTable({
  canResize: true,
  resizeHeightOffset: 36,
  showIndexColumn: false,
  title: '推送历史',
  api: historyQuery,
  columns: [
    ...getColumns(),
    {
      width: 80,
      title: '操作',
      dataIndex: 'action',
      align: 'center',
      fixed: 'right',
      className: 'push-history-action-column',
    },
  ],
  useSearchForm: true,
  formConfig: getFormConfig(),
  rowKey: 'id',
  fetchSetting: {
    listField: 'data',
    totalField: 'total',
  },
  beforeFetch(ext) {
    return normalizePushHistoryParams({ ...ext });
  },
});
</script>

<style lang="less" scoped>
.push-history-page {
  padding: 0 4px;

  .push-history-table-action {
    display: flex;
    justify-content: center;
    width: 100%;

    :deep([class*='-basic-table-action']) {
      justify-content: center !important;
    }
  }

  :deep(.push-history-action-column) {
    text-align: center !important;
  }
}
</style>
