import type { AppRouteModule } from '@/router/types';
import { LAYOUT } from '@/router/constant';

const storage: AppRouteModule = {
  path: '/storage',
  name: 'Storage',
  component: LAYOUT,
  redirect: '/storage/index',
  meta: {
    orderNo: 15,
    icon: 'ant-design:database-outlined',
    title: '录像存储',
    hideMenu: false,
    hideChildrenInMenu: true,
  },
  children: [
    {
      path: 'index',
      name: 'StorageCenter',
      component: () => import('@/views/storage/index.vue'),
      meta: {
        title: '录像存储',
        icon: 'ant-design:database-outlined',
        hideBreadcrumb: false,
      },
    },
  ],
};

export default storage;
