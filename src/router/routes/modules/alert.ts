import type { AppRouteModule } from '@/router/types'
import { LAYOUT } from '@/router/constant'

const alert: AppRouteModule = {
  path: '/alert',
  name: 'Alert',
  component: LAYOUT,
  redirect: '/alert/events',
  meta: {
    orderNo: 25,
    icon: 'ant-design:alert-outlined',
    title: '告警管理',
    hideMenu: false,
    hideChildrenInMenu: false,
    alwaysShow: true,
  },
  children: [
    {
      path: 'events',
      name: 'AlertEventsPage',
      component: () => import('@/views/alert/events/index.vue'),
      meta: {
        title: '告警事件',
        icon: 'ant-design:alert-outlined',
      },
    },
    {
      path: 'push-settings',
      name: 'AlertPushSettingsPage',
      component: () => import('@/views/alert/push-settings/index.vue'),
      meta: {
        title: '推送设置',
        icon: 'ant-design:send-outlined',
      },
    },
    {
      path: 'message-config',
      name: 'AlertMessageConfigPage',
      component: () => import('@/views/alert/message-config/index.vue'),
      meta: {
        title: '消息配置',
        icon: 'ant-design:message-outlined',
      },
    },
    {
      path: 'push-history',
      name: 'AlertPushHistoryPage',
      component: () => import('@/views/alert/push-history/index.vue'),
      meta: {
        title: '推送历史',
        icon: 'ant-design:history-outlined',
      },
    },
    {
      path: 'index',
      name: 'AlertLegacyIndex',
      component: () => import('@/views/alert/index.vue'),
      meta: {
        title: '告警事件',
        hideMenu: true,
        hideTab: true,
      },
    },
  ],
}

export default alert
