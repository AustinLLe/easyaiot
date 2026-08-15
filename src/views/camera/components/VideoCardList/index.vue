<template>
  <div class="camera-card-list-wrapper p-2">
    <div class="p-4" style="margin-bottom: 10px">
      <BasicForm @register="registerForm" />
    </div>
    <div class="p-2">
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
            <ListItem class="device-card-item">
              <article class="device-capability-card">
                <div class="card-top">
                  <span class="card-icon">
                    <Icon icon="ant-design:video-camera-outlined" :size="21" />
                  </span>
                  <div class="card-head">
                    <div class="card-title-row">
                      <h3 class="card-title" :title="item.name || item.id">{{ item.name || item.id }}</h3>
                      <i class="card-status" :class="{ enabled: item.online }">{{ item.online ? '在线' : '离线' }}</i>
                    </div>
                    <div class="device-meta">
                      <div class="device-meta__line">
                        <span class="device-meta__label">设备 ID</span>
                        <span class="device-meta__value">{{ item.id || '-' }}</span>
                      </div>
                      <div class="device-meta__line">
                        <span class="device-meta__label">设备型号</span>
                        <span class="device-meta__value">{{ item.model || '-' }}</span>
                      </div>
                      <div class="device-meta__line">
                        <span class="device-meta__label">IP 地址</span>
                        <span class="device-meta__value">{{ item.ip || '-' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="card-action-row">
                  <button
                    v-if="item.rtmp_stream || item.http_stream"
                    type="button"
                    class="card-action-btn"
                    title="播放"
                    @click="onPlay(item)"
                  >
                    <Icon icon="octicon:play-16" :size="15" />
                    <span>播放</span>
                  </button>
                  <button type="button" class="card-action-btn" title="查看" @click="onView(item)">
                    <Icon icon="ant-design:eye-outlined" :size="15" />
                    <span>查看</span>
                  </button>
                  <button type="button" class="card-action-btn" title="编辑" @click="onEdit(item)">
                    <Icon icon="ant-design:edit-outlined" :size="15" />
                    <span>编辑</span>
                  </button>
                  <Popconfirm
                    title="是否确认删除？"
                    ok-text="是"
                    cancel-text="否"
                    @confirm="onDelete(item)"
                  >
                    <button type="button" class="card-action-btn card-action-btn--danger" title="删除">
                      <Icon icon="material-symbols:delete-outline-rounded" :size="15" />
                      <span>删除</span>
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
import { onMounted, reactive, ref } from 'vue'
import { List, Popconfirm, Spin } from 'ant-design-vue'
import { BasicForm, useForm } from '@/components/Form'
import { propTypes } from '@/utils/propTypes'
import { isFunction } from '@/utils/is'
import { Icon } from '@/components/Icon'
import { usePermission } from '@/hooks/web/usePermission'
import type { DeviceInfo } from '@/api/device/camera'

const ListItem = List.Item

const props = defineProps({
  params: propTypes.object.def({}),
  api: propTypes.func,
})

const { runWithPermission } = usePermission()

const onPlay = (item: DeviceInfo) => runWithPermission('camera:devices:play', () => handlePlay(item))
const onView = (item: DeviceInfo) => runWithPermission('camera:devices:view', () => handleView(item))
const onEdit = (item: DeviceInfo) => runWithPermission('camera:devices:update', () => handleEdit(item))
const onDelete = (item: DeviceInfo) => runWithPermission('camera:devices:delete', () => handleDelete(item))

const emit = defineEmits(['getMethod', 'delete', 'edit', 'view', 'play'])

const data = ref<DeviceInfo[]>([])
const state = reactive({
  loading: true,
})

const [registerForm, { validate }] = useForm({
  schemas: [
    {
      field: 'deviceName',
      label: '设备名称',
      component: 'Input',
    },
    {
      field: 'online',
      label: '在线状态',
      component: 'Select',
      componentProps: {
        options: [
          { value: '', label: '全部' },
          { value: true, label: '在线' },
          { value: false, label: '离线' },
        ],
      },
    },
  ],
  labelWidth: 80,
  baseColProps: { span: 6 },
  actionColOptions: {
    span: 12,
    style: { textAlign: 'right' },
  },
  autoSubmitOnEnter: true,
  submitFunc: handleSubmit,
})

async function handleSubmit() {
  const formData = await validate()
  await fetch(formData)
}

onMounted(() => {
  fetch()
  emit('getMethod', fetch)
})

async function fetch(p: Record<string, any> = {}) {
  const { api, params } = props
  if (api && isFunction(api)) {
    try {
      state.loading = true
      const apiParams: Record<string, any> = {
        ...params,
        pageNo: page.value,
        pageSize: pageSize.value,
      }

      if (p.deviceName)
        apiParams.search = p.deviceName

      if (p.online !== undefined && p.online !== '')
        apiParams.online = p.online

      Object.keys(p).forEach((key) => {
        if (key !== 'deviceName' && key !== 'online')
          apiParams[key] = p[key]
      })

      const res = await api(apiParams)
      if (res && res.data) {
        data.value = res.data || []
        total.value = res.total || 0
      }
      else if (Array.isArray(res)) {
        data.value = res
        total.value = res.length
      }
      else {
        data.value = []
        total.value = 0
      }
    }
    catch (error) {
      console.error('获取数据失败:', error)
      data.value = []
      total.value = 0
    }
    finally {
      hideLoading()
    }
  }
}

function hideLoading() {
  state.loading = false
}

const page = ref(1)
const pageSize = ref(9)
const total = ref(0)
const paginationProp = ref({
  showSizeChanger: false,
  showQuickJumper: true,
  pageSize,
  current: page,
  total,
  showTotal: (count: number) => `总 ${count} 条`,
  onChange: pageChange,
  onShowSizeChange: pageSizeChange,
})

function pageChange(p: number, pz: number) {
  page.value = p
  pageSize.value = pz
  fetch()
}

function pageSizeChange(_current: number, size: number) {
  pageSize.value = size
  fetch()
}

async function handleView(record: DeviceInfo) {
  emit('view', record)
}

async function handleEdit(record: DeviceInfo) {
  emit('edit', record)
}

async function handleDelete(record: DeviceInfo) {
  emit('delete', record)
}

async function handlePlay(record: DeviceInfo) {
  emit('play', record)
}

defineExpose({
  fetch,
})
</script>

<style lang="less" scoped>
@card-brand: #2457a7;
@card-border: #e1e7f0;
@card-muted: #778397;

.camera-card-list-wrapper {
  :deep(.ant-form) {
    background: transparent;
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
  }

  :deep(.ant-list-grid .ant-row) {
    row-gap: 15px;
  }

  :deep(.device-card-item) {
    margin: 0;
    padding: 0;
    border-block-end: none !important;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;

    &__title {
      padding-left: 4px;
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
      color: rgb(0 0 0 / 88%);
    }

    &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }

  .device-capability-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    min-height: 0;
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

  .card-icon {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    color: @card-brand;
    background: rgb(36 87 167 / 7%);
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

  .card-status {
    flex-shrink: 0;
    padding: 3px 7px;
    border-radius: 5px;
    background: #f1f3f7;
    color: #7e899a;
    font-size: 10px;
    font-style: normal;
    line-height: 1.4;

    &.enabled {
      background: #e9f7f0;
      color: #14845c;
    }

    &:not(.enabled) {
      background: #fdeeee;
      color: #c94b55;
    }
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
  }

  .device-meta {
    display: grid;
    gap: 8px;
  }

  .device-meta__line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }

  .device-meta__label {
    flex-shrink: 0;
    color: @card-muted;
    font-size: 12px;
    line-height: 1.5;
  }

  .device-meta__value {
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
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: center;
    justify-content: flex-end;
    padding-top: 12px;
    margin-top: 4px;
    border-top: 1px solid #edf0f5;
  }

  .card-action-btn {
    display: inline-flex;
    gap: 4px;
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

    &--danger {
      color: @card-brand;
    }
  }

  :deep(.ant-popconfirm) {
    display: inline-flex;
  }
}
</style>
