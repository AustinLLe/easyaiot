import type { AppRouteModule } from '@/router/types'

import { LAYOUT } from '@/router/constant'
import { t } from '@/hooks/web/useI18n'

const dashboard: AppRouteModule = {
  path: '/dashboard',
  name: 'Dashboard',
  component: LAYOUT,
  redirect: '/dashboard/index',
  meta: {
    orderNo: 10,
    icon: 'clarity:dashboard-line',
    title: t('routes.dashboard.dashboard'),
    hideMenu: false,
    hideChildrenInMenu: true,
  },
  children: [
    {
      path: 'index',
      name: 'DashboardPage',
      component: () => import('@/views/dashboard/monitor/index.vue'),
      meta: {
        title: t('routes.dashboard.dashboard'),
        icon: 'clarity:dashboard-line',
        hideMenu: false,
        hideBreadcrumb: true,
        hideTab: true,
      },
    },
    {
      path: 'config',
      name: 'DashboardConfig',
      component: () => import('@/views/dashboard/settings/index.vue'),
      meta: {
        title: '页面配置',
        icon: 'ant-design:setting-outlined',
        hideMenu: true,
      },
    },
    {
      path: '/dashboard-config',
      name: 'DashboardConfigStandalone',
      component: () => import('@/views/dashboard/settings/index.vue'),
      meta: {
        title: '页面配置',
        icon: 'ant-design:setting-outlined',
        hideMenu: true,
      },
    },
    {
      path: 'settings',
      name: 'DashboardSettingsRedirect',
      redirect: '/dashboard/config',
      meta: {
        title: '首页看板配置',
        icon: 'ant-design:setting-outlined',
        hideMenu: true,
      },
    },
  ],
}

export default dashboard
