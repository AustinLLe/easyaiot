import { Modal } from 'ant-design-vue'

export const NO_PERMISSION_MESSAGE = '您没有该操作权限，请联系管理员'

export function showNoPermissionModal() {
  Modal.warning({
    title: '无权限',
    content: NO_PERMISSION_MESSAGE,
    okText: '知道了',
  })
}
