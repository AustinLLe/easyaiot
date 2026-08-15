<template>
  <div class="model-card-list-wrapper">
    <div class="model-card-list-form p-4">
      <BasicForm @register="registerForm" @reset="handleSubmit" />
    </div>
    <div class="model-card-list-body">
      <Spin :spinning="state.loading">
        <List
          :split="false"
          :grid="{ gutter: 15, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 3 }"
          :data-source="data"
          :pagination="paginationProp"
        >
          <template #header>
            <div class="list-header">
              <div class="list-header__actions">
                <slot name="header" />
              </div>
            </div>
          </template>
          <template #renderItem="{ item }">
            <ListItem class="model-card-item">
              <article class="model-capability-card">
                <div class="card-top">
                  <div class="card-image" @click="onView(item)">
                    <img
                      :src="getPreviewUrl(item)"
                      alt="算法图片"
                    />
                  </div>
                  <div class="card-head">
                    <div class="card-title-row">
                      <h3 class="card-title" :title="item.name">
                        <a @click.prevent="onView(item)">{{ item.name || '--' }}</a>
                      </h3>
                      <i class="card-format">{{ getFormatText(item) }}</i>
                    </div>
                    <div class="model-meta">
                      <div class="model-meta__line">
                        <span class="model-meta__label">版本</span>
                        <span class="model-meta__text">{{ item.version || '--' }}</span>
                      </div>
                      <div class="model-meta__line">
                        <span class="model-meta__label">基础模型</span>
                        <span class="model-meta__text">{{ item.base_model || '--' }}</span>
                      </div>
                      <div class="model-meta__line">
                        <span class="model-meta__label">描述</span>
                        <span class="model-meta__text">{{ item.description || '--' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="card-action-row">
                  <button type="button" class="card-action-btn" @click.stop="onView(item)">
                    查看
                  </button>
                  <button type="button" class="card-action-btn" @click.stop="onEdit(item)">
                    编辑
                  </button>
                  <Popconfirm title="是否确认删除？" ok-text="是" cancel-text="否" @confirm="onDelete(item)">
                    <button type="button" class="card-action-btn" @click.stop>
                      删除
                    </button>
                  </Popconfirm>
                </div>
              </article>
            </ListItem>
          </template>
        </List>
      </Spin>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { usePermission } from '@/hooks/web/usePermission';
import { List, Popconfirm, Spin } from 'ant-design-vue';
import { BasicForm, useForm } from '@/components/Form';
import { propTypes } from '@/utils/propTypes';
import { isFunction } from '@/utils/is';
import { getFormConfig } from './Data';
import { resolveModelPreviewUrl } from '../../utils/drawUtils';

defineOptions({ name: 'ModelCardList' })

const ListItem = List.Item;

const props = defineProps({
  params: propTypes.object.def({}),
  api: propTypes.func,
});

const emit = defineEmits(['getMethod', 'delete', 'edit', 'view']);

const { runWithPermission } = usePermission();
const onView = (item: any) => runWithPermission('train:models:view', () => handleView(item));
const onEdit = (item: any) => runWithPermission('train:models:update', () => handleEdit(item));
const onDelete = (item: any) => runWithPermission('train:models:delete', () => handleDelete(item));

const data = ref([]);
const state = reactive({
  loading: true,
});

const [registerForm, { validate }] = useForm({
  schemas: getFormConfig(),
  labelWidth: 80,
  baseColProps: { span: 6 },
  actionColOptions: { span: 6, style: { textAlign: 'right' } },
  showAdvancedButton: false,
  autoSubmitOnEnter: true,
  submitFunc: handleSubmit,
});

onMounted(() => {
  fetch();
  emit('getMethod', fetch);
});

async function handleSubmit() {
  const formData = await validate();
  await fetch(formData);
}

async function fetch(p = {}) {
  const { api, params } = props;
  if (api && isFunction(api)) {
    const requestParams: Record<string, any> = { ...params, pageNo: page.value, pageSize: pageSize.value, ...p };
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
const pageSize = ref(9);
const total = ref(0);
const paginationProp = ref({
  showSizeChanger: false,
  showQuickJumper: true,
  pageSize,
  current: page,
  total,
  showTotal: (count: number) => `总 ${count} 条`,
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

function getPreviewUrl(item: any): string {
  return resolveModelPreviewUrl(item?.imageUrl || item?.image_url);
}

function getFormatText(item: any): string {
  const format = String(item?.model_format || '').trim();
  if (format)
    return format.toUpperCase();
  if (item?.onnx_model_path)
    return 'ONNX';
  if (item?.model_path) {
    const path = String(item.model_path).toLowerCase();
    if (path.endsWith('.onnx'))
      return 'ONNX';
    if (path.endsWith('.pt') || path.endsWith('.pth'))
      return 'PT';
    if (path.includes('openvino'))
      return 'OPENVINO';
    if (path.endsWith('.rknn'))
      return 'RKNN';
    if (path.endsWith('.tflite'))
      return 'TFLITE';
  }
  return '--';
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
@card-brand: #2457a7;
@card-border: #e1e7f0;
@card-muted: #778397;

.model-card-list-wrapper {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overflow-x: hidden;

  :deep(.ant-form) {
    background: transparent;
  }

  :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  :deep(.ant-row) {
    align-items: center;
  }

  :deep(.ant-input),
  :deep(.ant-input-affix-wrapper),
  :deep(.ant-select-selector),
  :deep(.ant-picker) {
    background-color: #fff !important;
  }

  :deep(.ant-list-header) {
    padding-top: 0;
    padding-bottom: 12px;
    background: transparent;
    border-block-end: 0;
  }

  :deep(.ant-list) {
    padding: 0;
    background: transparent;
    overflow-x: hidden;
  }

  :deep(.ant-list-grid .ant-row) {
    row-gap: 15px;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  :deep(.ant-list-grid .ant-col) {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  :deep(.model-card-item) {
    margin: 0;
    padding: 0;
    border-block-end: none !important;
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
  overflow-x: hidden;
  overflow-y: auto;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

.model-capability-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 19px;
  background: #fff;
  border: 1px solid @card-border;
  border-radius: 15px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover {
    border-color: #cfd8e6;
    box-shadow: 0 6px 18px rgb(36 87 167 / 6%);
  }
}

.card-top {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.card-image {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  overflow: hidden;
  border-radius: 12px;
  background: #f5f7fb;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.card-head {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.card-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: #26354e;
  text-overflow: ellipsis;
  white-space: nowrap;

  a {
    color: inherit;
    cursor: pointer;

    &:hover {
      color: @card-brand;
    }
  }
}

.card-format {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 5px;
  background: rgb(36 87 167 / 8%);
  color: @card-brand;
  font-size: 10px;
  font-style: normal;
  font-weight: 600;
  line-height: 1.4;
}

.model-meta {
  display: grid;
  gap: 8px;
}

.model-meta__line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.model-meta__label {
  flex-shrink: 0;
  color: @card-muted;
  font-size: 12px;
  line-height: 1.5;
}

.model-meta__text {
  min-width: 0;
  overflow: hidden;
  color: #435169;
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-action-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px 12px;
  align-items: center;
  justify-content: flex-end;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px solid #edf0f5;
}

.card-action-btn {
  display: inline-flex;
  align-items: center;
  padding: 0;
  color: @card-brand;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  background: none;
  border: 0;

  &:hover {
    opacity: 0.82;
  }
}

:deep(.ant-popconfirm) {
  display: inline-flex;
}
</style>
