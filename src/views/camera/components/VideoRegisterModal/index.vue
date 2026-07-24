<template>
  <BasicModal
    @register="register"
    :title="getTitle"
    @cancel="handleCancel"
    :width="700"
    @ok="handleOk"
    :canFullscreen="false"
  >
    <div class="product-modal">
      <Spin :spinning="state.editLoading">
        <Form
          :labelCol="{ span: 3 }"
          :model="validateInfos"
          :wrapperCol="{ span: 21 }"
        >
          <FormItem label="设备名称" name="name" v-bind=validateInfos.name>
            <Input v-model:value="modelRef.name"/>
          </FormItem>
          <FormItem label="分组" name="directory_id">
            <TreeSelect
              v-model:value="modelRef.directory_id"
              placeholder="请选择分组（可选）"
              :tree-data="directoryTreeOptions"
              allow-clear
              tree-default-expand-all
              :field-names="{ label: 'name', value: 'id', children: 'children' }"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="码流索引" name="stream" v-bind=validateInfos.stream>
            <Select
              placeholder="码流索引"
              :options="state.streamList"
              @change="handleCLickChange"
              v-model:value="modelRef.stream"
              allowClear
            />
          </FormItem>
          <FormItem label="用户�? name="username" v-bind=validateInfos.userName>
            <Input v-model:value="modelRef.username"/>
          </FormItem>
          <FormItem label="密码" name="password" v-bind="validateInfos.password">
            <Input.Password v-model:value="modelRef.password" />
          </FormItem>
        </Form>
      </Spin>
    </div>
  </BasicModal>
</template>
<script lang="ts" setup>
import {computed, reactive, ref} from 'vue';
import {BasicModal, useModalInner} from '@/components/Modal';
import {Form, FormItem, Input, Select, Spin, TreeSelect} from 'ant-design-vue';
import {getDirectoryList} from '@/api/device/camera';
import {convertDirectoryTreeForSelect} from '../../utils/directoryUtils';

defineOptions({name: 'VideoRegisterModal'})

const state = reactive({
  record: null,
  editLoading: false,
  streamList: [
    {label: "主码�?, value: 0},
    {label: "子码�?, value: 1},
  ],
});

const modelRef = reactive({
  name: '',
  stream: 0,
  username: '',
  password: '',
  directory_id: undefined as number | undefined,
});

const directoryTreeOptions = ref<any[]>([]);

async function loadDirectoryOptions() {
  try {
    const response = await getDirectoryList();
    const data = response.code !== undefined ? response.data : response;
    directoryTreeOptions.value = data && Array.isArray(data)
      ? convertDirectoryTreeForSelect(data)
      : [];
  } catch (error) {
    console.error('加载分组列表失败', error);
    directoryTreeOptions.value = [];
  }
}

const getTitle = computed(() => ('注册设备'));

const [register, {closeModal}] = useModalInner(async (data) => {
  const {record, defaultDirectoryId} = data;
  state.record = record;
  await loadDirectoryOptions();
  modelRef.directory_id = defaultDirectoryId ?? undefined;
});

const emits = defineEmits(['success']);

const checkedKeys = ref<Array<string>>([]);

function onSelect(record, selected) {
  if (selected) {
    checkedKeys.value = [...checkedKeys.value, record.ip];
  } else {
    checkedKeys.value = checkedKeys.value.filter((ip) => ip !== record.ip);
  }
}

function onSelectAll(selected, selectedRows, changeRows) {
  const changeIds = changeRows.map((item) => item.ip);
  if (selected) {
    checkedKeys.value = [...checkedKeys.value, ...changeIds];
  } else {
    checkedKeys.value = checkedKeys.value.filter((ip) => {
      return !changeIds.includes(ip);
    });
  }
}

const rulesRef = reactive({
  deviceVersion: [{required: true, message: '请输入视频设备号', trigger: ['change']}],
});

function handleCLickChange(value) {
  //console.log('handleCLickChange', value)
}

const useForm = Form.useForm;
const {validate, resetFields, validateInfos} = useForm(modelRef, rulesRef);

function handleCancel() {
  //console.log('handleCancel');
  resetFields();
}

function handleOk() {
  // alert(JSON.stringify(modelRef));
  emits('success', {...modelRef, ...state.record});
  closeModal();
  resetFields();
}
</script>
<style lang="less" scoped>
.product-modal {
  :deep(.ant-form-item-label) {
    & > label::after {
      content: '';
    }
  }
}
</style>
