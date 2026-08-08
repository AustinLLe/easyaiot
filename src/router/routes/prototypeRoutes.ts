import type { AppRouteRecordRaw } from '@/router/types'

const CLUSTER_MENU: AppRouteRecordRaw = {
  name: '边缘集群',
  path: 'cluster',
  component: 'system/cluster/index',
  visible: true,
  keepAlive: true,
  icon: 'ant-design:cluster-outlined',
  sort: 2,
  parentId: 1,
  meta: {
    title: '边缘集群',
  },
}

function normalizePath(path?: string) {
  if (!path)
    return ''
  return path.startsWith('/') ? path : `/${path}`
}

function injectChildRoute(parent: AppRouteRecordRaw, child: AppRouteRecordRaw) {
  parent.children = parent.children || []
  const exists = parent.children.some(item => item.path === child.path)
  if (!exists)
    parent.children.push(child)
  parent.children.sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

/** WEB-test 原型：在未配置后端菜单时，将集群管理挂到「系统管理」下 */
export function injectPrototypeRoutes(routes: AppRouteRecordRaw[]) {
  const systemRoute = routes.find(route => normalizePath(route.path) === '/system')
  if (systemRoute)
    injectChildRoute(systemRoute, CLUSTER_MENU)
  return routes
}
