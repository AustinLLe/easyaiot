<template>
  <div class="model-list-page">
    <BasicTable @register="registerTable" v-if="state.isTableMode">
      <template #toolbar>
        <div class="model-list-toolbar">
          <a-button v-auth="['train:models:create']" type="primary" @click="openAddModal(true, { isEdit: false, isView: false })" data-test-id="upload-local-model">
            上传本地算法
          </a-button>
          <!-- 暂时隐藏从云端同步
          <a-button v-auth="['train:models:sync']" type="primary" @click="openSyncModal(true)">
            从云端同步算法到本地
          </a-button>
          -->
          <a-button type="default" @click="handleClickSwap" preIcon="ant-design:swap-outlined">
            切换视图
          </a-button>
        </div>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'action'">
          <TableAction
            :actions="[
              {
                icon: 'ant-design:eye-filled',
                tooltip: {
                  title: '详情',
                  placement: 'top',
                },
                auth: 'train:models:view',
                onClick: openViewModal.bind(null, record),
              },
              {
                tooltip: {
                  title: '编辑',
                  placement: 'top',
                },
                icon: 'ant-design:edit-filled',
                auth: 'train:models:update',
                onClick: openAddModal.bind(null, true, { isEdit: true, isView: false, record }),
              },
              {
                tooltip: {
                  title: '删除',
                  placement: 'top',
                },
                icon: 'material-symbols:delete-outline-rounded',
                auth: 'train:models:delete',
                popConfirm: {
                  placement: 'topRight',
                  title: '是否确认删除？',
                  confirm: handleDelete.bind(null, record),
                },
              }
            ]"
          />
        </template>
      </template>
    </BasicTable>
    <div v-else class="model-card-mode">
      <ModelCardList
        :params="params"
        :api="queryModelList"
        @get-method="getMethod"
        @delete="handleDel"
        @view="handleView"
        @edit="handleEdit"
      >
      <template #header>
        <a-button v-auth="['train:models:create']" type="primary" @click="openAddModal(true, { isEdit: false, isView: false })">
          上传本地算法
        </a-button>
        <!-- 暂时隐藏从云端同步
        <a-button v-auth="['train:models:sync']" type="primary" @click="openSyncModal(true)">
          从云端同步算法到本地
        </a-button>
        -->
        <a-button type="default" @click="handleClickSwap" preIcon="ant-design:swap-outlined">
          切换视图
        </a-button>
      </template>
      </ModelCardList>
    </div>
    <ModelModal @register="registerAddModel" @success="handleSuccess"/>
    <!-- 暂时隐藏从云端同步
    <CloudSyncModal @register="registerSyncModal" @success="handleSuccess"/>
    -->
  </div>
</template>

<script lang="ts" setup name="modelManagement">
import { reactive } from 'vue';
import { BasicTable, TableAction, useTable } from '@/components/Table';
import { useMessage } from '@/hooks/web/useMessage';
import { getBasicColumns, getFormConfig } from "./data";
import ModelModal from "../ModelModal/index.vue";
// import CloudSyncModal from "../CloudSyncModal/index.vue";
import { useModal } from "@/components/Modal";
import { deleteModel, getModelPage } from "@/api/device/model";
import ModelCardList from "../ModelCardList/index.vue";
import { queryModelPage } from "../../utils/modelListQuery";

const { createMessage } = useMessage();

const [registerAddModel, { openModal: openAddModal }] = useModal();
// 暂时隐藏从云端同步
// const [registerSyncModal, { openModal: openSyncModal }] = useModal();

defineOptions({ name: 'ModelList' })

const state = reactive({
  isTableMode: true,
});

const params = {};
const queryModelList = (requestParams: Record<string, any> = {}) => queryModelPage(getModelPage, requestParams);
let cardListReload = () => {};

function getMethod(m: any) {
  cardListReload = m;
}

function handleView(record) {
  openViewModal(record);
}

function openViewModal(record) {
  openAddModal(true, { isEdit: false, isView: true, record });
}

function handleEdit(record) {
  openAddModal(true, { isEdit: true, isView: false, record });
}

function handleDel(record) {
  handleDelete(record);
  cardListReload();
}

function handleClickSwap() {
  state.isTableMode = !state.isTableMode;
}

function handleSuccess() {
  reload({ page: 0 });
  cardListReload();
}

const [registerTable, { reload }] = useTable({
  canResize: true,
  resizeHeightOffset: 36,
  showIndexColumn: false,
  title: '算法管理',
  api: queryModelList,
  columns: getBasicColumns(),
  useSearchForm: true,
  showTableSetting: false,
  pagination: true,
  formConfig: getFormConfig(),
  fetchSetting: {
    listField: 'data',
    totalField: 'total',
  },
  rowKey: 'id',
});

const handleDelete = async (record) => {
  try {
    await deleteModel(record.id);
    createMessage.success('删除成功');
    handleSuccess();
  } catch (error) {
    console.error(error);
    createMessage.error('删除失败');
  }
};

</script>

<style scoped>
.model-list-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.model-card-mode {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.model-list-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 16px;
}
</style>
