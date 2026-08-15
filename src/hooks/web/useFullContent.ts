import { computed, unref } from 'vue'

import { useRouter } from 'vue-router'
import { useAppStore } from '@/store/modules/app'

/**
 * @description: Full screen display content
 */
export function useFullContent() {
  const appStore = useAppStore()
  const router = useRouter()
  const { currentRoute } = router

  // Whether to display the content in full screen without displaying the menu
  const getFullContent = computed(() => {
    const route = unref(currentRoute)
    const path = route.path
    if (
      route.meta?.fullContent
      || path === '/dashboard'
      || path === '/dashboard/index'
      || route.name === 'DashboardPage'
    )
      return true

    const query = route.query
    if (query && Reflect.has(query, '__full__'))
      return true

    return appStore.getProjectConfig.fullContent
  })

  return { getFullContent }
}
