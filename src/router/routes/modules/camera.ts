import type { AppRouteModule } from '@/router/types'
import { LAYOUT } from '@/router/constant'

const camera: AppRouteModule = {
  path: '/camera',
  name: 'Camera',
  component: LAYOUT,
  redirect: '/camera/devices',
  meta: {
    orderNo: 20,
    icon: 'ant-design:video-camera-outlined',
    title: '流媒体',
    hideMenu: false,
    hideChildrenInMenu: false,
    alwaysShow: true,
  },
  children: [
    {
      path: 'devices',
      name: 'CameraDevices',
      component: () => import('@/views/camera/devices/index.vue'),
      meta: {
        title: '设备列表',
        icon: 'ant-design:unordered-list-outlined',
      },
    },
    {
      path: 'snap-space',
      name: 'CameraSnapSpace',
      component: () => import('@/views/camera/snap-space/index.vue'),
      meta: {
        title: '抓拍空间',
        icon: 'ant-design:camera-outlined',
      },
    },
    {
      path: 'record-space',
      name: 'CameraRecordSpace',
      component: () => import('@/views/camera/record-space/index.vue'),
      meta: {
        title: '录像空间',
        icon: 'ant-design:play-square-outlined',
      },
    },
    {
      path: 'index',
      name: 'CameraLegacyIndex',
      component: () => import('@/views/camera/index.vue'),
      meta: {
        title: '设备列表',
        hideMenu: true,
        hideTab: true,
      },
    },
  ],
}

export default camera
