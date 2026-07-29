<script lang="ts" setup>
import { errorColumns, searchFormSchema } from '../apiLog.data'
import ApiLogDetailModal from '../ApiLogDetailModal.vue'
import { BasicTable, TableAction, useTable } from '@/components/Table'
import { useModal } from '@/components/Modal'
import { getApiErrorLogPage } from '@/api/infra/apiLog'
import { IconEnum } from '@/enums/appEnum'

defineOptions({ name: 'InfraApiErrorLog' })

const [registerTable] = useTable({
  title: 'API 错误日志',
  api: getApiErrorLogPage,
  columns: errorColumns,
  formConfig: { labelWidth: 90, schemas: searchFormSchema },
  useSearchForm: true,
  showTableSetting: true,
  showIndexColumn: false,
  actionColumn: { width: 90, title: '操作', dataIndex: 'action', fixed: 'right' },
})

const [registerModal, { openModal }] = useModal()
</script>

<template>
  <div>
    <BasicTable @register="registerTable">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <TableAction
            :actions="[{
              icon: IconEnum.VIEW,
              label: '详情',
              onClick: () => openModal(true, { type: 'error', id: record.id }),
            }]"
          />
        </template>
      </template>
    </BasicTable>
    <ApiLogDetailModal @register="registerModal" />
  </div>
</template>
