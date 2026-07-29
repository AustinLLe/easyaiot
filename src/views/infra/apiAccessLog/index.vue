<script lang="ts" setup>
import { accessColumns, searchFormSchema } from '../apiLog.data'
import ApiLogDetailModal from '../ApiLogDetailModal.vue'
import { BasicTable, TableAction, useTable } from '@/components/Table'
import { useModal } from '@/components/Modal'
import { getApiAccessLogPage } from '@/api/infra/apiLog'
import { IconEnum } from '@/enums/appEnum'

defineOptions({ name: 'InfraApiAccessLog' })

const [registerTable] = useTable({
  title: 'API 访问日志',
  api: getApiAccessLogPage,
  columns: accessColumns,
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
              onClick: () => openModal(true, { type: 'access', id: record.id }),
            }]"
          />
        </template>
      </template>
    </BasicTable>
    <ApiLogDetailModal @register="registerModal" />
  </div>
</template>
