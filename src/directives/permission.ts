/**
 * Global authority directive
 * Intercepts click when permission is missing and shows a warning modal.
 * @Example v-auth="RoleEnum.TEST"
 */
import type { App, Directive, DirectiveBinding } from 'vue'

import { usePermission } from '@/hooks/web/usePermission'
import { showNoPermissionModal } from '@/utils/permissionGuard'

const AUTH_CLICK_HANDLER = '__vAuthClickHandler__'

function bindAuthClick(el: Element, binding: DirectiveBinding<any>) {
  unbindAuthClick(el)

  const value = binding.value
  if (!value)
    return

  const handler = (event: Event) => {
    const { hasPermission } = usePermission()
    if (hasPermission(value))
      return
    event.stopImmediatePropagation()
    event.preventDefault()
    showNoPermissionModal()
  }

  ;(el as HTMLElement & Record<string, unknown>)[AUTH_CLICK_HANDLER] = handler
  el.addEventListener('click', handler, true)
}

function unbindAuthClick(el: Element) {
  const handler = (el as HTMLElement & Record<string, unknown>)[AUTH_CLICK_HANDLER] as
    | ((event: Event) => void)
    | undefined
  if (handler)
    el.removeEventListener('click', handler, true)
  delete (el as HTMLElement & Record<string, unknown>)[AUTH_CLICK_HANDLER]
}

const authDirective: Directive = {
  mounted(el: Element, binding: DirectiveBinding<any>) {
    bindAuthClick(el, binding)
  },
  updated(el: Element, binding: DirectiveBinding<any>) {
    bindAuthClick(el, binding)
  },
  unmounted(el: Element) {
    unbindAuthClick(el)
  },
}

export function setupPermissionDirective(app: App<Element>) {
  app.directive('auth', authDirective)
}

export default authDirective
