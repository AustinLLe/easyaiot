<script lang="ts" setup>
import { reactive } from 'vue'
import UserModal from './UserModal.vue'
import UserRoleModal from './UserRoleModal.vue'
import ResetPwdModal from './ResetPwdModal.vue'
import DeptTree from './DeptTree.vue'
import { columns, searchFormSchema } from './user.data'
import { useI18n } from '@/hooks/web/useI18n'
import { useMessage } from '@/hooks/web/useMessage'
import { useModal } from '@/components/Modal'
import { IconEnum } from '@/enums/appEnum'
import { BasicTable, TableAction, useTable } from '@/components/Table'
import { BasicForm, useForm } from '@/components/Form'
import type { UserExportReqVO } from '@/api/system/user'
import { deleteUser, exportUser, getUserPage } from '@/api/system/user'
import { PageIntro } from '@/components/Page'

defineOptions({ name: 'SystemUser' })

const { t } = useI18n()
const { createConfirm, createMessage } = useMessage()
const [registerModal, { openModal }] = useModal()
const [registerRoleModal, { openModal: openRoleModal }] = useModal()
const [registerPwdModal, { openModal: openPwdModal }] = useModal()
const searchInfo = reactive<Recordable>({})

const [registerForm, { getFieldsValue }] = useForm({
  labelWidth: 72,
  schemas: searchFormSchema,
  autoSubmitOnEnter: true,
  submitOnReset: true,
  showAdvancedButton: false,
  compact: true,
  actionColOptions: { span: 4, style: { textAlign: 'right' } },
})

const [registerTable, { reload }] = useTable({
  title: '',
  api: getUserPage,
  columns,
  useSearchForm: false,
  searchInfo,
  showTableSetting: true,
  showIndexColumn: false,
  actionColumn: {
    width: 140,
    title: t('common.action'),
    dataIndex: 'action',
    fixed: 'right',
  },
})

function applyFormValues(values: Recordable = {}) {
  const deptId = searchInfo.deptId
  Object.keys(searchInfo).forEach((key) => {
    if (key !== 'deptId')
      delete searchInfo[key]
  })
  Object.assign(searchInfo, values)
  if (deptId)
    searchInfo.deptId = deptId
}

function handleFormSubmit(values: Recordable) {
  applyFormValues(values)
  reload()
}

/** 新增按钮操作 */
function handleCreate() {
  openModal(true, { isUpdate: false })
}

/** 导出按钮操作 */
async function handleExport() {
  createConfirm({
    title: t('common.exportTitle'),
    iconType: 'warning',
    content: t('common.exportMessage'),
    async onOk() {
      await exportUser({ ...getFieldsValue(), deptId: searchInfo.deptId } as UserExportReqVO)
      createMessage.success(t('common.exportSuccessText'))
    },
  })
}

/** 修改按钮操作 */
function handleEdit(record: Recordable) {
  openModal(true, { record, isUpdate: true })
}

/** 分配用户角色操作 */
function handleRole(record: Recordable) {
  openRoleModal(true, { record })
}

/** 重置密码按钮操作 */
function handleResetPwd(record: Recordable) {
  openPwdModal(true, { record })
}

/** 删除按钮操作 */
async function handleDelete(record: Recordable) {
  await deleteUser(record.id)
  createMessage.success(t('common.delSuccessText'))
  reload()
}
/** 点击部门操作 */
function handleSelect(deptId = '') {
  searchInfo.deptId = deptId
  reload()
}
</script>

<template>
  <PageIntro eyebrow="USERS" title="用户管理" desc="维护系统账号、部门归属与角色分配。">
    <div class="user-manage">
      <BasicForm class="user-manage__form" @register="registerForm" @submit="handleFormSubmit" />
      <div class="user-manage__main">
        <DeptTree class="user-manage__tree" @select="handleSelect" />
        <BasicTable class="user-manage__table" :search-info="searchInfo" @register="registerTable">
        <template #toolbar>
          <a-button v-auth="['system:user:create']" type="primary" :pre-icon="IconEnum.ADD" @click="handleCreate">
            {{ t('action.create') }}
          </a-button>
          <a-button v-auth="['system:user:export']" :pre-icon="IconEnum.EXPORT" @click="handleExport">
            {{ t('action.export') }}
          </a-button>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <TableAction
              :actions="[
                { icon: IconEnum.EDIT, label: t('action.edit'), auth: 'system:user:update', onClick: handleEdit.bind(null, record) },
              ]"
              :drop-down-actions="[
                {
                  icon: IconEnum.EDIT,
                  label: '分配角色',
                  auth: 'system:permission:assign-user-role',
                  onClick: handleRole.bind(null, record),
                },
                {
                  icon: IconEnum.EDIT,
                  label: '重置密码',
                  auth: 'system:user:update-password',
                  onClick: handleResetPwd.bind(null, record),
                },
                {
                  icon: IconEnum.DELETE,
                  danger: true,
                  label: t('action.delete'),
                  auth: 'system:user:delete',
                  popConfirm: {
                    title: t('common.delMessage'),
                    placement: 'left',
                    confirm: handleDelete.bind(null, record),
                  },
                },
              ]"
            />
          </template>
        </template>
      </BasicTable>
      </div>
    </div>
    <UserModal @register="registerModal" @success="reload()" />
    <UserRoleModal @register="registerRoleModal" @success="reload()" />
    <ResetPwdModal @register="registerPwdModal" @success="reload()" />
  </PageIntro>
</template>

<style lang="less" scoped>
.user-manage {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.user-manage__form {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.user-manage__main {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 12px;
}

.user-manage__tree {
  flex: 0 0 240px;
  width: 240px;
  min-width: 200px;
  height: 100%;
}

.user-manage__table {
  flex: 1;
  min-width: 0;
  height: 100%;
}
</style>
