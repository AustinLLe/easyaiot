<template>
  <div class="model-card-list-wrapper">
    <div class="model-card-list-form p-4 bg-white">
      <BasicForm @register="registerForm" @reset="handleSubmit"/>
    </div>
    <div class="model-card-list-body bg-white">
      <Spin :spinning="state.loading">
        <List
          :grid="{ gutter: 12, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }"
          :data-source="data"
          :pagination="paginationProp"
        >
          <template #header>
            <div
              style="display: flex;align-items: center;justify-content: space-between;flex-direction: row;">
              <span style="padding-left: 7px;font-size: 16px;font-weight: 500;line-height: 24px;">算法列表</span>
              <div class="space-x-2">
                <slot name="header"></slot>
              </div>
            </div>
          </template>
          <template #renderItem="{ item }">
            <ListItem class="model-list-item">
              <div class="model-card-box">
                <div class="model-card-body">
                  <div class="model-image-container" @click="handleView(item)">
                    <img
                      :src="item.imageUrl || '/images/model-preview.jpg'"
                      alt="算法图片"
                      class="model-image"
                    />
                  </div>

                  <div class="model-card-info">
                    <h6 class="model-card-title">
                      <a @click.prevent="handleView(item)">{{ item.name }}</a>
                    </h6>

                    <div class="model-tags">
                      <Tag color="#1890ff">ID: {{ item.id }}</Tag>
                      <Tag color="#52c41a">版本: {{ item.version || '未指定' }}</Tag>
                      <Tag color="#8c8c8c">{{ formatDate(item.created_at) }}</Tag>
                    </div>

                    <div class="model-description">
                      {{ item.description || '暂无描述' }}
                    </div>

                    <div class="btns">
                      <div class="btn-group">
                        <Button
                          type="text"
                          shape="circle"
                          class="card-action-btn"
                          title="查看详情"
                          @click.stop="handleView(item)"
                        >
                          <template #icon><EyeOutlined /></template>
                        </Button>
                        <Button
                          type="text"
                          shape="circle"
                          class="card-action-btn"
                          title="编辑算法"
                          @click.stop="handleEdit(item)"
                        >
                          <template #icon><EditOutlined /></template>
                        </Button>
                        <Popconfirm
                          title="是否确认删除？"
                          @confirm="handleDelete(item)"
                        >
                          <Button
                            type="text"
                            shape="circle"
                            class="card-action-btn"
                            title="删除"
                            @click.stop
                          >
                            <template #icon><DeleteOutlined /></template>
                          </Button>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ListItem>
          </template>
        </List>
      </Spin>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, reactive, ref, watch} from 'vue';
import {Button, List, Popconfirm, Spin, Tag} from 'ant-design-vue';
import {BasicForm, useForm} from '@/components/Form';
import {propTypes} from '@/utils/propTypes';
import {isFunction} from '@/utils/is';
import {DeleteOutlined, EditOutlined, EyeOutlined} from '@ant-design/icons-vue';
import {getModelPage} from '@/api/device/model';
import {getFormConfig} from './Data';

defineOptions({name: 'ModelCardList'})

const ListItem = List.Item;

const props = defineProps({
  params: propTypes.object.def({}),
  api: propTypes.func,
  modelOptions: propTypes.array.def([]),
});

const emit = defineEmits(['getMethod', 'delete', 'edit', 'view']);

const data = ref([]);
const state = reactive({
  loading: true,
});

const modelOptions = ref<any[]>([]);

const loadModelOptions = async () => {
  if (props.modelOptions.length > 0) {
    modelOptions.value = props.modelOptions as any[];
    return;
  }
  try {
    const res = await getModelPage({pageNo: 1, pageSize: 1000});
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

function syncModelSelectOptions() {
  updateSchema({
    field: 'model_id',
    componentProps: {
      options: [
        {label: '全部', value: ''},
        ...modelOptions.value,
      ],
    },
  });
}

const formConfig = getFormConfig(modelOptions.value);
const [registerForm, {validate, updateSchema}] = useForm({
  schemas: formConfig,
  labelWidth: 80,
  baseColProps: {span: 6},
  actionColOptions: {span: 12},
  autoSubmitOnEnter: true,
  submitFunc: handleSubmit,
});

onMounted(async () => {
  await loadModelOptions();
  syncModelSelectOptions();
  fetch();
  emit('getMethod', fetch);
});

watch(
  () => props.modelOptions,
  async (options) => {
    if (options.length > 0) {
      modelOptions.value = options as any[];
      syncModelSelectOptions();
    }
  },
  {deep: true},
);

async function handleSubmit() {
  const formData = await validate();
  await fetch(formData);
}

async function fetch(p = {}) {
  const {api, params} = props;
  if (api && isFunction(api)) {
    const requestParams: Record<string, any> = {...params, pageNo: page.value, pageSize: pageSize.value, ...p};
    if (requestParams.model_id === '' || requestParams.model_id === undefined) {
      delete requestParams.model_id;
    }
    const res = await api(requestParams);
    data.value = res.data;
    total.value = res.total;
    hideLoading();
  }
}

function hideLoading() {
  state.loading = false;
}

const page = ref(1);
const pageSize = ref(12);
const total = ref(0);
const paginationProp = ref({
  showSizeChanger: false,
  showQuickJumper: true,
  pageSize,
  current: page,
  total,
  showTotal: (total: number) => `总 ${total} 条`,
  onChange: pageChange,
  onShowSizeChange: pageSizeChange,
});

function pageChange(p: number, pz: number) {
  page.value = p;
  pageSize.value = pz;
  fetch();
}

function pageSizeChange(_current: number, size: number) {
  pageSize.value = size;
  fetch();
}

function getStatusColor(status: number) {
  switch (status) {
    case 0:
      return '#8c8c8c';
    case 1:
      return '#52c41a';
    case 3:
      return '#ff4d4f';
    default:
      return '#d9d9d9';
  }
}

function getStatusText(status: number) {
  switch (status) {
    case 0:
      return '未部署';
    case 1:
      return '已部署';
    case 3:
      return '已下线';
    default:
      return '未知';
  }
}

function formatDate(dateString: string) {
  return dateString ? new Date(dateString).toLocaleDateString() : '--';
}

function getFormatText(item: any): string {
  // 根据模型路径判断格式
  if (item.onnx_model_path) {
    return 'ONNX';
  }
  if (item.model_path) {
    const path = item.model_path.toLowerCase();
    if (path.endsWith('.onnx')) {
      return 'ONNX';
    }
    if (path.endsWith('.pt') || path.endsWith('.pth')) {
      return 'PyTorch';
    }
    if (path.includes('openvino')) {
      return 'OpenVINO';
    }
    if (path.endsWith('.tflite')) {
      return 'TensorFlow Lite';
    }
    // 默认返回 PyTorch（因为大多数模型是 PyTorch 格式）
    return 'PyTorch';
  }
  // 如果没有路径信息，返回空字符串
  return '';
}

function handleDelete(record: object) {
  emit('delete', record);
}

function handleView(record: object) {
  emit('view', record);
}

function handleEdit(record: object) {
  emit('edit', record);
}
</script>

<style lang="less" scoped>
.model-card-list-wrapper {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.ant-list-header) {
    border: 0;
  }

  :deep(.ant-list) {
    padding: 6px;
  }

  :deep(.ant-list-item) {
    margin: 6px;
    padding: 0 !important;
  }

  :deep(.ant-list-pagination) {
    margin: 12px 16px 16px;
    text-align: right;
  }
}

.model-card-list-form {
  flex-shrink: 0;
  margin-bottom: 10px;
}

.model-card-list-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.model-list-item {
  padding: 0 !important;
  display: flex;
}

.model-card-box {
  background: #fff;
  box-shadow: 0 0 4px rgba(24, 24, 24, 0.1);
  width: 100%;
  transition: all 0.3s;
  border-radius: 8px;
  overflow: hidden;

  &:hover {
    box-shadow: 0 2px 8px rgba(24, 24, 24, 0.12);
  }
}

.model-card-body {
  display: flex;
  gap: 12px;
  padding: 12px;
  align-items: stretch;
}

.model-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.model-card-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: #181818;
  margin: 0 0 8px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  a {
    color: inherit;
    cursor: pointer;

    &:hover {
      color: #1890ff;
    }
  }
}

.model-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  flex-shrink: 0;
  align-items: center;
}

.model-description {
  font-size: 13px;
  color: #8c8c8c;
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.btns {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-top: 0;
  flex-shrink: 0;
  margin-top: 0;
}

.btn-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.card-action-btn {
  width: 32px;
  min-width: 32px;
  height: 32px;
  padding: 0;
  transition: background-color 0.2s;

  :deep(.anticon) {
    color: #266cfb;
    font-size: 16px;
  }

  &:hover :deep(.anticon) {
    color: #1890ff;
  }
}

.model-image-container {
  position: relative;
  width: 120px;
  min-width: 120px;
  height: 120px;
  overflow: hidden;
  border-radius: 6px;
  background-color: #f5f5f5;
  cursor: pointer;
  flex-shrink: 0;
}

.model-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-badges {
  position: absolute;
  top: 6px;
  left: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  color: #fff;

  &.badge-format {
    background: rgba(24, 144, 255, 0.85);
  }

  &.badge-version {
    background: rgba(82, 196, 26, 0.85);
  }
}

:deep(.ant-tag) {
  border-radius: 4px;
  font-size: 12px;
  padding: 0 8px;
  height: 24px;
  line-height: 22px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  max-width: 100%;
  margin: 0;
}
</style>
