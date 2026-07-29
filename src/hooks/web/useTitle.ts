import { unref, watch } from 'vue'
import { useTitle as usePageTitle } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { useI18n } from '@/hooks/web/useI18n'
import { useGlobSetting } from '@/hooks/setting'
import { useLocaleStore } from '@/store/modules/locale'
import { usePlatformConfigStore } from '@/store/modules/platformConfig'

import { REDIRECT_NAME } from '@/router/constant'

/**
 * Listening to page changes and dynamically changing site titles
 */
export function useTitle() {
  const { title } = useGlobSetting()
  const { t } = useI18n()
  const { currentRoute } = useRouter()
  const localeStore = useLocaleStore()
  const platformConfigStore = usePlatformConfigStore()

  const pageTitle = usePageTitle()

  watch(
    [
      () => currentRoute.value.path,
      () => localeStore.getLocale,
      () => platformConfigStore.platformName,
    ],
    () => {
      const route = unref(currentRoute)

      if (route.name === REDIRECT_NAME)
        return

      const tTitle = t(route?.meta?.title)
      const platformTitle = platformConfigStore.platformName || title
      pageTitle.value = tTitle ? ` ${tTitle} - ${platformTitle} ` : `${platformTitle}`
    },
    { immediate: true },
  )
}
