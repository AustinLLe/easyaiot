<script lang="ts" setup>
import { columns, searchFormSchema } from './loginLog.data'
import { useI18n } from '@/hooks/web/useI18n'
import { useMessage } from '@/hooks/web/useMessage'
import { BasicTable, useTable } from '@/components/Table'
import type { LoginLogReqVO, LoginLogVO } from '@/api/system/loginLog'
import { exportLoginLog, getLoginLogPage } from '@/api/system/loginLog'
import { BasicModal, useModal } from '@/components/Modal'
import { IconEnum } from '@/enums/appEnum'
import { ref } from 'vue'


defineOptions({ name: 'SystemLoginLog' })

const { t } = useI18n()
const { createConfirm, createMessage } = useMessage()
const [registerTable, { getForm }] = useTable({
  title: '登录日志列表',
  api: getLoginLogPage,
  columns,
  formConfig: { labelWidth: 120, schemas: searchFormSchema },
  useSearchForm: true,
  showTableSetting: true,
  showIndexColumn: false,
  actionColumn: {
    width: 90,
    title: t('common.action'),
    dataIndex: 'action',
    fixed: 'right',
  },
})

const detail = ref<LoginLogVO>()
const [registerModal, { openModal }] = useModal()

function handleShowInfo(record: LoginLogVO) {
  detail.value = record
  openModal(true)
}

async function handleExport() {
  createConfirm({
    title: t('common.exportTitle'),
    iconType: 'warning',
    content: t('common.exportMessage'),
    async onOk() {
      await exportLoginLog(getForm().getFieldsValue() as LoginLogReqVO)
      createMessage.success(t('common.exportSuccessText'))
    },
  })
}
</script>

<template>
  <div>
    <BasicTable @register="registerTable">
      <template #toolbar>
        <a-button v-auth="['system:login-log:export']" @click="handleExport">
          {{ t('action.export') }}
        </a-button>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <a-button type="link" :pre-icon="IconEnum.VIEW" @click="handleShowInfo(record)">
            详情
          </a-button>
        </template>
      </template>
    </BasicTable>
    <BasicModal title="登录日志详情" width="760px" :show-ok-btn="false" @register="registerModal">
      <a-descriptions bordered :column="1" size="small">
        <a-descriptions-item label="访问编号">{{ detail?.id }}</a-descriptions-item>
        <a-descriptions-item label="链路编号">{{ detail?.traceId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="用户名称">{{ detail?.username }}</a-descriptions-item>
        <a-descriptions-item label="用户编号">{{ detail?.userId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="登录地址">{{ detail?.userIp }}</a-descriptions-item>
        <a-descriptions-item label="User Agent">{{ detail?.userAgent }}</a-descriptions-item>
        <a-descriptions-item label="登录时间">{{ detail?.createTime }}</a-descriptions-item>
      </a-descriptions>
    </BasicModal>
  </div>
</template>
