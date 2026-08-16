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
          <FormItem label="设备名称" name="name" html-for="video-reg-name" v-bind=validateInfos.name>
            <Input id="video-reg-name" aria-label="设备名称" v-model:value="modelRef.name"/>
          </FormItem>
          <FormItem label="分组" name="directory_id" html-for="video-reg-directory">
            <TreeSelect
              id="video-reg-directory"
              aria-label="分组"
              v-model:value="modelRef.directory_id"
              placeholder="请选择分组（可选）"
              :tree-data="directoryTreeOptions"
              allow-clear
              tree-default-expand-all
              :field-names="{ label: 'name', value: 'id', children: 'children' }"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="码流索引" name="stream" html-for="video-reg-stream" v-bind=validateInfos.stream>
            <Select
              id="video-reg-stream"
              aria-label="码流索引"
              placeholder="码流索引"
              :options="state.streamList"
              @change="handleCLickChange"
              v-model:value="modelRef.stream"
              allowClear
            />
          </FormItem>
          <FormItem label="用户名" name="username" html-for="video-reg-username" v-bind=validateInfos.userName>
            <Input id="video-reg-username" aria-label="用户名" v-model:value="modelRef.username"/>
          </FormItem>
          <FormItem label="密码" name="password" html-for="video-reg-password" v-bind="validateInfos.password">
            <Input.Password id="video-reg-password" aria-label="密码" v-model:value="modelRef.password" />
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
import {
  fetchAllDeviceNames,
  type DeviceNameItem,
  validateDeviceNameUnique,
} from '../../utils/deviceNameUtils';

defineOptions({name: 'VideoRegisterModal'})

const state = reactive({
  record: null,
  editLoading: false,
  streamList: [
    {label: "主码流", value: 0},
    {label: "子码流", value: 1},
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
const existingDevices = ref<DeviceNameItem[]>([]);

async function loadExistingDevices() {
  try {
    existingDevices.value = await fetchAllDeviceNames();
  } catch (error) {
    console.error('加载设备列表失败', error);
    existingDevices.value = [];
  }
}

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
  await Promise.all([loadDirectoryOptions(), loadExistingDevices()]);
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
  name: [
    {required: true, message: '请输入设备名称', trigger: ['change']},
    {
      validator: (_rule, value) => {
        const error = validateDeviceNameUnique(value, existingDevices.value);
        if (error)
          return Promise.reject(error);
        return Promise.resolve();
      },
      trigger: ['change', 'blur'],
    },
  ],
  stream: [{required: true, message: '请选择码流索引', trigger: ['change']}],
  username: [{required: true, message: '请输入用户名', trigger: ['change']}],
  password: [{required: true, message: '请输入密码', trigger: ['change']}],
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
  validate().then(() => {
    emits('success', {...modelRef, ...state.record});
    closeModal();
    resetFields();
  }).catch(() => {
    // 表单校验失败，保持弹窗打开
  });
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
