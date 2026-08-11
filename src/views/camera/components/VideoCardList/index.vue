<template>
  <div class="camera-card-list-wrapper p-2">
    <div class="p-4 bg-white" style="margin-bottom: 10px">
      <BasicForm @register="registerForm"/>
    </div>
    <div class="p-2 bg-white">
      <Spin :spinning="state.loading">
        <List
          :split="false"
          :grid="{ gutter: 12, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 4 }"
          :data-source="data"
          :pagination="paginationProp"
        >
          <template #header>
            <div
              style="display: flex;align-items: center;justify-content: space-between;flex-direction: row;">
              <span style="padding-left: 7px;font-size: 16px;font-weight: 500;line-height: 24px;">摄像头列表</span>
              <div style="display: flex; gap: 8px;">
                <slot name="header"></slot>
              </div>
            </div>
          </template>
          <template #renderItem="{ item }">
            <ListItem :class="getStreamStatusClass(item)">
              <div class="camera-info">
                <div class="status">{{ getStreamStatusLabel(item) }}</div>
                <div class="title o2">{{ item.name || item.id }}</div>
                <div class="props">
                  <div class="flex" style="justify-content: space-between;">
                    <div class="prop">
                      <div class="label">设备型号</div>
                      <div class="value model-value" style="cursor: pointer;" @click="handleCopy(item.model)">
                        <span class="model-text">{{ item.model || '-' }}</span>
                        <Icon 
                          icon="tdesign:copy-filled" 
                          :size="14" 
                          color="#4287FCFF" 
                          class="model-copy-icon"
                        />
                      </div>
                    </div>
                    <div class="prop">
                      <div class="label">制造商</div>
                      <div class="value">{{ item.manufacturer || '-' }}</div>
                    </div>
                  </div>
                  <div class="flex" style="justify-content: space-between;">
                    <div class="prop">
                      <div class="label">IP地址</div>
                      <div class="value">{{ item.ip || '-' }}</div>
                    </div>
                    <div class="prop">
                      <div class="label">端口</div>
                      <div class="value">{{ item.port || '-' }}</div>
                    </div>
                  </div>
                </div>
                <div class="card-actions-wrap">
                <div class="btns">
                  <div v-if="item.rtmp_stream || item.http_stream" class="btn" @click="onPlay(item)">
                    <Icon icon="octicon:play-16" :size="15" color="#3B82F6" />
                  </div>
                  <div class="btn" @click="onView(item)">
                    <Icon icon="ant-design:eye-filled" :size="15" color="#3B82F6" />
                  </div>
                  <div class="btn" @click="onEdit(item)">
                    <Icon icon="ant-design:edit-filled" :size="15" color="#3B82F6" />
                  </div>
                  <Popconfirm
                    title="是否确认删除？"
                    ok-text="是"
                    cancel-text="否"
                    @confirm="onDelete(item)"
                  >
                    <div class="btn">
                      <Icon icon="material-symbols:delete-outline-rounded" :size="15" color="#DC2626" />
                    </div>
                  </Popconfirm>
                </div>
                </div>
              </div>
              <div class="camera-img">
                <img
                  :src="getCameraImage(item.manufacturer)"
                  alt="" 
                  class="img" 
                  @click="onView(item)">
              </div>
            </ListItem>
          </template>
        </List>
      </Spin>
    </div>
  </div>
</template>
<script lang="ts" setup>
import {onMounted, reactive, ref} from 'vue';
import {List, Popconfirm, Spin, Tag} from 'ant-design-vue';
import {BasicForm, useForm} from '@/components/Form';
import {propTypes} from '@/utils/propTypes';
import {isFunction} from '@/utils/is';
import {Icon} from '@/components/Icon';
import {useMessage} from "@/hooks/web/useMessage";
import {usePermission} from '@/hooks/web/usePermission';
import HAIKANG_IMAGE from "@/assets/images/video/haikang.png";
import DAHUA_IMAGE from "@/assets/images/video/dahua.png";
import HUAWEI_IMAGE from "@/assets/images/video/huawei.png";
import OTHER_IMAGE from "@/assets/images/video/other.png";
import type { DeviceInfo } from '@/api/device/camera';

const ListItem = List.Item;

// 组件接收参数
const props = defineProps({
  // 请求API的参数
  params: propTypes.object.def({}),
  //api
  api: propTypes.func,
});

const { createMessage } = useMessage();
const { runWithPermission } = usePermission();

const onPlay = (item: DeviceInfo) => runWithPermission('camera:devices:play', () => handlePlay(item));
const onView = (item: DeviceInfo) => runWithPermission('camera:devices:view', () => handleView(item));
const onEdit = (item: DeviceInfo) => runWithPermission('camera:devices:update', () => handleEdit(item));
const onDelete = (item: DeviceInfo) => runWithPermission('camera:devices:delete', () => handleDelete(item));

//暴露内部方法
const emit = defineEmits(['getMethod', 'delete', 'edit', 'view', 'play']);

//数据
const data = ref<DeviceInfo[]>([]);
const state = reactive({
  loading: true,
});

//表单
const [registerForm, {validate}] = useForm({
  schemas: [
    {
      field: `deviceName`,
      label: `设备名称`,
      component: 'Input',
    },
    {
      field: `online`,
      label: `推流状态`,
      component: 'Select',
      componentProps: {
        options: [
          {value: '', label: '全部'},
          {value: true, label: '推流中'},
          {value: false, label: '未推流'},
        ]
      }
    },
  ],
  labelWidth: 80,
  baseColProps: {span: 6},
  actionColOptions: {
    span: 12,
    style: { textAlign: 'right' }
  },
  autoSubmitOnEnter: true,
  submitFunc: handleSubmit,
});

//表单提交
async function handleSubmit() {
  const data = await validate();
  await fetch(data);
}

// 根据制造商获取图片
const getCameraImage = (manufacturer: string) => {
  if (!manufacturer) return OTHER_IMAGE;
  const mfr = manufacturer.toLowerCase();
  if (mfr.includes('海康') || mfr.includes('hikvision') || mfr.includes('hik')) {
    return HAIKANG_IMAGE;
  } else if (mfr.includes('大华') || mfr.includes('dahua') || mfr.includes('dh')) {
    return DAHUA_IMAGE;
  } else if (mfr.includes('华为') || mfr.includes('huawei')) {
    return HUAWEI_IMAGE;
  }
  return OTHER_IMAGE;
};

const getStreamStatusLabel = (item: DeviceInfo) => {
  if (item.stream_status === 'unknown') return '状态未知';
  return item.online ? '推流中' : '未推流';
};

const getStreamStatusClass = (item: DeviceInfo) => ({
  'camera-item': true,
  normal: item.stream_status !== 'unknown' && item.online,
  error: item.stream_status !== 'unknown' && !item.online,
  unknown: item.stream_status === 'unknown',
});

// 自动请求并暴露内部方法
onMounted(() => {
  fetch();
  emit('getMethod', fetch);
});

async function fetch(p = {}) {
  const {api, params} = props;
  if (api && isFunction(api)) {
    try {
      state.loading = true;
      // 转换表单参数为API需要的格式
      const apiParams: any = {
        ...params,
        pageNo: page.value,
        pageSize: pageSize.value,
      };
      
      // 处理搜索参数
      if (p.deviceName) {
        apiParams.search = p.deviceName;
      }
      if (p.online !== undefined && p.online !== '') {
        // 如果API支持online参数，直接传递；否则可能需要其他处理
        apiParams.online = p.online;
      }
      
      // 合并其他参数
      Object.keys(p).forEach(key => {
        if (key !== 'deviceName' && key !== 'online') {
          apiParams[key] = p[key];
        }
      });
      
      const res = await api(apiParams);
      // 根据API返回格式，处理数据
      if (res && res.data) {
        data.value = res.data || [];
        total.value = res.total || 0;
      } else if (Array.isArray(res)) {
        data.value = res;
        total.value = res.length;
      } else {
        data.value = [];
        total.value = 0;
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      data.value = [];
      total.value = 0;
    } finally {
      hideLoading();
    }
  }
}

function hideLoading() {
  state.loading = false;
}

//分页相关
const page = ref(1);
const pageSize = ref(8);
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

function pageSizeChange(_current, size: number) {
  pageSize.value = size;
  fetch();
}

async function handleView(record: DeviceInfo) {
  emit('view', record);
}

async function handleEdit(record: DeviceInfo) {
  emit('edit', record);
}

async function handleDelete(record: DeviceInfo) {
  emit('delete', record);
}

async function handlePlay(record: DeviceInfo) {
  emit('play', record);
}

// 复制功能
async function handleCopy(text: string) {
  if (!text || text === '-') {
    return;
  }
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    createMessage.success('复制成功');
  } catch (error) {
    console.error('复制失败', error);
    createMessage.error('复制失败');
  }
}

// 仅暴露仍然存在的刷新方法；推流转发状态检查已随功能删除。
defineExpose({
  fetch,
});
</script>
<style lang="less" scoped>
.camera-card-list-wrapper {
  :deep(.ant-list-header) {
    border-block-end: 0;
  }
  :deep(.ant-list-header) {
    padding-top: 0;
    padding-bottom: 8px;
  }
  :deep(.ant-list) {
    padding: 6px;
  }
  :deep(.ant-list-item) {
    margin: 6px;
    border-block-end: none !important;
  }
  :deep(.camera-item) {
    overflow: hidden;
    box-shadow: 0 0 4px #00000026;
    border-radius: 8px;
    padding: 16px 0;
    position: relative;
    background-color: #fff;
    background-repeat: no-repeat;
    background-position: center center;
    background-size: 104% 104%;
    transition: all 0.5s;
    min-height: 208px;
    height: 100%;

    &.normal {
      background-image: url('@/assets/images/product/blue-bg.719b437a.png');

      .camera-info .status {
        background: #d9dffd;
        color: #266CFBFF;
      }
    }

    &.error {
      background-image: url('@/assets/images/product/red-bg.101af5ac.png');

      .camera-info .status {
        background: #fad7d9;
        color: #d43030;
      }
    }

    &.unknown {
      background-image: url('@/assets/images/product/blue-bg.719b437a.png');

      .camera-info .status {
        background: #fff1b8;
        color: #ad6800;
      }
    }

    .camera-info {
      flex-direction: column;
      max-width: calc(100% - 128px);
      padding-left: 16px;

      .status {
        min-width: 90px;
        height: 25px;
        border-radius: 6px 0 0 6px;
        font-size: 12px;
        font-weight: 500;
        line-height: 25px;
        text-align: center;
        position: absolute;
        right: 0;
        top: 16px;
        padding: 0 8px;
        white-space: nowrap;
      }

      .title {
        font-size: 16px;
        font-weight: 600;
        color: #050708;
        line-height: 20px;
        height: 40px;
        padding-right: 90px;
      }

      .props {
        margin-top: 10px;

        .prop {
          flex: 1;
          margin-bottom: 10px;

          .label {
            font-size: 12px;
            font-weight: 400;
            color: #666;
            line-height: 14px;
          }

          .value {
            font-size: 14px;
            font-weight: 600;
            color: #050708;
            line-height: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 6px;
          }
        }

        .model-value {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow: visible;

          .model-text {
            max-width: 90px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex-shrink: 1;
          }

          .model-copy-icon {
            flex-shrink: 0;
          }
        }
      }

      .card-actions-wrap {
        position: absolute;
        left: 16px;
        bottom: 16px;
        padding-top: 6px;
        background: #fff;
        border-radius: 8px;
      }

      .btns {
        display: flex;
        width: 200px;
        height: 28px;
        box-sizing: border-box;
        border-radius: 45px;
        justify-content: space-around;
        padding: 0 10px;
        align-items: center;
        overflow: hidden;
        border: 2px solid #266cfbff;

        :deep(.ant-popconfirm) {
          display: inline-flex;
          align-items: center;
          line-height: 1;
        }

        .btn {
          width: 28px;
          height: 100%;
          text-align: center;
          position: relative;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;

          & + .btn {
            border-left: 1px solid #e2e2e2;
          }

          :deep(.anticon) {
            display: flex;
            align-items: center;
            justify-content: center;
            color: #87CEEB;
            transition: color 0.3s;
          }

          &:hover :deep(.anticon) {
            color: #5BA3F5;
          }
        }
      }
    }

    .camera-img {
      position: absolute;
      right: 20px;
      top: 50px;

      img {
        cursor: pointer;
        width: 120px;
      }
    }
  }
}
</style>
