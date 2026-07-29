<script lang="ts" setup>
import { computed, ref, unref, watchEffect } from 'vue'
import type { LocaleType } from '@/types/config'
import type { DropMenu } from '@/components/Dropdown'
import { Dropdown } from '@/components/Dropdown'
import { Icon } from '@/components/Icon'
import { useLocale } from '@/locales/useLocale'
import { localeList } from '@/settings/localeSetting'
import { usePlatformConfigStore } from '@/store/modules/platformConfig'
import { getAccessToken } from '@/utils/auth'

const props = defineProps({
  /**
   * Whether to display text
   */
  showText: { type: Boolean, default: true },
  /**
   * Whether to refresh the interface when changing
   */
  reload: { type: Boolean },
})

const selectedKeys = ref<string[]>([])

const { changeLocale, getLocale } = useLocale()
const platformConfigStore = usePlatformConfigStore()

const getLocaleText = computed(() => {
  const key = selectedKeys.value[0]
  if (!key)
    return ''

  return localeList.find(item => item.event === key)?.text
})

watchEffect(() => {
  selectedKeys.value = [unref(getLocale)]
})

async function toggleLocale(lang: LocaleType | string) {
  if (getAccessToken()) {
    await platformConfigStore.saveInterfaceConfig({
      ...platformConfigStore.interfaceConfig,
      defaultLocale: lang === 'en' ? 'en' : 'zh_CN',
    })
  }
  await changeLocale(lang as LocaleType)
  selectedKeys.value = [lang as string]
  props.reload && location.reload()
}

function handleMenuEvent(menu: DropMenu) {
  if (unref(getLocale) === menu.event)
    return

  toggleLocale(menu.event as string)
}
</script>

<template>
  <Dropdown
    placement="bottom"
    :trigger="['click']"
    :drop-menu-list="localeList"
    :selected-keys="selectedKeys"
    overlay-class-name="app-locale-picker-overlay"
    @menu-event="handleMenuEvent"
  >
    <span class="flex cursor-pointer items-center">
      <Icon icon="ion:language" />
      <span v-if="showText" class="ml-1">{{ getLocaleText }}</span>
    </span>
  </Dropdown>
</template>

<style lang="less">
.app-locale-picker-overlay {
  .ant-dropdown-menu-item {
    min-width: 160px;
  }
}
</style>
