/**
 * Global authority directive
 * Hides elements when the current account lacks the declared permission.
 * @Example v-auth="RoleEnum.TEST"
 */
import type { App, Directive, DirectiveBinding } from 'vue'

import { usePermission } from '@/hooks/web/usePermission'

const AUTH_ORIGINAL_DISPLAY = '__vAuthOriginalDisplay__'

function applyAuthVisibility(el: Element, binding: DirectiveBinding<any>) {
  const target = el as HTMLElement & Record<string, unknown>
  if (target[AUTH_ORIGINAL_DISPLAY] === undefined)
    target[AUTH_ORIGINAL_DISPLAY] = target.style.display
  const value = binding.value
  const { hasPermission } = usePermission()
  target.style.display = !value || hasPermission(value)
    ? String(target[AUTH_ORIGINAL_DISPLAY] ?? '')
    : 'none'
}

const authDirective: Directive = {
  mounted(el: Element, binding: DirectiveBinding<any>) {
    applyAuthVisibility(el, binding)
  },
  updated(el: Element, binding: DirectiveBinding<any>) {
    applyAuthVisibility(el, binding)
  },
  unmounted(el: Element) {
    delete (el as HTMLElement & Record<string, unknown>)[AUTH_ORIGINAL_DISPLAY]
  },
}

export function setupPermissionDirective(app: App<Element>) {
  app.directive('auth', authDirective)
}

export default authDirective
