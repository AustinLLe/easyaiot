<template>
  <div class="model-list-page">
    <BasicTable @register="registerTable" v-if="state.isTableMode">
      <template #toolbar>
        <div class="model-list-toolbar">
          <a-button type="primary" @click="openAddModal(true, { isEdit: false, isView: false })" data-test-id="upload-local-model">
            上传本地算法
          </a-button>
          <a-button type="primary" @click="openSyncModal(true)">
            从云端同步算法到本地
          </a-button>
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
                onClick: openViewModal.bind(null, record),
              },
              {
                tooltip: {
                  title: '编辑',
                  placement: 'top',
                },
                icon: 'ant-design:edit-filled',
                onClick: openAddModal.bind(null, true, { isEdit: true, isView: false, record }),
              },
              {
                tooltip: {
                  title: '删除',
                  placement: 'top',
                },
                icon: 'material-symbols:delete-outline-rounded',
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
    <div v-else>
      <ModelCardList
        :params="params"
        :api="getModelPage"
        :model-options="modelOptions"
        @get-method="getMethod"
        @delete="handleDel"
        @view="handleView"
        @edit="handleEdit"
      >
      <template #header>
        <a-button type="primary" @click="openAddModal(true, { isEdit: false, isView: false })">
          上传本地算法
        </a-button>
        <a-button type="primary" @click="openSyncModal(true)">
          从云端同步算法到本地
        </a-button>
        <a-button type="default" @click="handleClickSwap" preIcon="ant-design:swap-outlined">
          切换视图
        </a-button>
      </template>
      </ModelCardList>
    </div>
    <ModelModal @register="registerAddModel" @success="handleSuccess"/>
    <CloudSyncModal @register="registerSyncModal" @success="handleSuccess"/>
  </div>
</template>

<script lang="ts" setup name="modelManagement">
import { onMounted, reactive, ref, watch } from 'vue';
import { BasicTable, TableAction, useTable } from '@/components/Table';
import { useMessage } from '@/hooks/web/useMessage';
import { getBasicColumns, getFormConfig } from "./data";
import ModelModal from "../ModelModal/index.vue";
import CloudSyncModal from "../CloudSyncModal/index.vue";
import { useModal } from "@/components/Modal";
import { deleteModel, getModelPage } from "@/api/device/model";
import ModelCardList from "../ModelCardList/index.vue";

const { createMessage } = useMessage();

const [registerAddModel, { openModal: openAddModal }] = useModal();
const [registerSyncModal, { openModal: openSyncModal }] = useModal();

defineOptions({ name: 'ModelList' })

const state = reactive({
  isTableMode: true,
});

const modelOptions = ref<any[]>([]);

const loadModelOptions = async () => {
  try {
    const res = await getModelPage({ pageNo: 1, pageSize: 1000 });
    const models = res.data || [];
    modelOptions.value = models.map((model: any) => ({
      label: `${model.name} (${model.version})`,
      value: model.id,
    }));
  } catch (error) {
    console.error('获取算法列表失败:', error);
    modelOptions.value = [];
  }
};

onMounted(() => {
  loadModelOptions();
});

const params = {};
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
  loadModelOptions();
}

const [registerTable, { reload, getForm }] = useTable({
  canResize: true,
  resizeHeightOffset: 36,
  showIndexColumn: false,
  title: '算法管理',
  api: async (params) => {
    const requestParams = { ...params };
    if (requestParams.model_id === '' || requestParams.model_id === undefined) {
      delete requestParams.model_id;
    }
    return getModelPage(requestParams);
  },
  columns: getBasicColumns(),
  useSearchForm: true,
  showTableSetting: false,
  pagination: true,
  formConfig: getFormConfig(modelOptions.value),
  fetchSetting: {
    listField: 'data',
    totalField: 'total',
  },
  rowKey: 'id',
});

watch(() => modelOptions.value, (newOptions) => {
  if (newOptions.length > 0) {
    const form = getForm();
    if (form) {
      form.updateSchema({
        field: 'model_id',
        componentProps: {
          options: [
            { label: '全部', value: '' },
            ...newOptions,
          ],
        },
      });
    }
  }
}, { deep: true });

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
}

.model-list-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 16px;
}
</style>