<script lang="ts" setup>
import { computed, unref } from 'vue'

import { Layout } from 'ant-design-vue'
import LayoutMenu from '../menu/index.vue'
import LayoutTrigger from '../trigger/index.vue'
import { ErrorAction, FullScreen, LayoutBreadcrumb, Notify, UserDropDown } from './components'
import { propTypes } from '@/utils/propTypes'

import { AppLocalePicker, AppLogo, AppSearch, AppSizePicker } from '@/components/Application'

import { useHeaderSetting } from '@/hooks/setting/useHeaderSetting'
import { useMenuSetting } from '@/hooks/setting/useMenuSetting'
import { useRootSetting } from '@/hooks/setting/useRootSetting'

import { MenuModeEnum, MenuSplitTyeEnum } from '@/enums/menuEnum'
import { SettingButtonPositionEnum } from '@/enums/appEnum'

import { useAppInject } from '@/hooks/web/useAppInject'
import { useDesign } from '@/hooks/web/useDesign'

import { createAsyncComponent } from '@/utils/factory/createAsyncComponent'
import { useLocale } from '@/locales/useLocale'
import { usePlatformConfigStore } from '@/store/modules/platformConfig'

defineOptions({ name: 'LayoutHeader' })
const props = defineProps({
  fixed: propTypes.bool,
})
const Header = Layout.Header
const SettingDrawer = createAsyncComponent(() => import('@/layouts/default/setting/index.vue'), {
  loading: true,
})
const { prefixCls } = useDesign('layout-header')
const { getShowTopMenu, getShowHeaderTrigger, getSplit, getIsMixMode, getMenuWidth, getIsMixSidebar } = useMenuSetting()
const { getUseErrorHandle, getShowSettingButton, getSettingButtonPosition } = useRootSetting()

const { getHeaderTheme, getShowFullScreen, getShowNotice, getShowContent, getShowBread, getShowHeaderLogo, getShowHeader, getShowSearch }
  = useHeaderSetting()

const { getShowLocalePicker } = useLocale()
const platformConfigStore = usePlatformConfigStore()

const { getIsMobile } = useAppInject()

const getHeaderClass = computed(() => {
  const theme = unref(getHeaderTheme)
  return [
    prefixCls,
    {
      [`${prefixCls}--fixed`]: props.fixed,
      [`${prefixCls}--mobile`]: unref(getIsMobile),
      [`${prefixCls}--${theme}`]: theme,
      [`${prefixCls}--mix-top`]: unref(getIsMixSidebar),
    },
  ]
})

const getShowSetting = computed(() => {
  if (!unref(getShowSettingButton))
    return false

  const settingButtonPosition = unref(getSettingButtonPosition)

  if (settingButtonPosition === SettingButtonPositionEnum.AUTO)
    return unref(getShowHeader)

  return settingButtonPosition === SettingButtonPositionEnum.HEADER
})

const getLogoWidth = computed(() => {
  if (!unref(getIsMixMode) || unref(getIsMobile))
    return {}

  const width = unref(getMenuWidth) < 180 ? 180 : unref(getMenuWidth)
  return { width: `${width}px` }
})

const getSplitType = computed(() => {
  return unref(getSplit) ? MenuSplitTyeEnum.TOP : MenuSplitTyeEnum.NONE
})

const getMenuMode = computed(() => {
  return unref(getSplit) ? MenuModeEnum.HORIZONTAL : null
})

const getHeaderLogoTheme = computed(() => {
  return unref(getHeaderTheme)
})
</script>

<template>
  <Header v-if="getShowHeader" :class="getHeaderClass">
    <!-- left start -->
    <div :class="`${prefixCls}-left`">
      <!-- logo -->
      <AppLogo
        v-if="getShowHeaderLogo || getIsMobile || getIsMixSidebar"
        :class="`${prefixCls}-logo`"
        :theme="getHeaderLogoTheme"
        :always-show-title="getIsMixSidebar"
        :compact="getIsMixSidebar"
      />
      <LayoutTrigger
        v-if="(getShowContent && getShowHeaderTrigger && !getSplit && !getIsMixSidebar) || getIsMobile"
        :theme="getHeaderTheme" :sider="false"
      />
      <div
        v-if="!getShowHeaderLogo && !getIsMobile && !getIsMixSidebar"
        :class="`${prefixCls}-platform-name`"
        :title="platformConfigStore.platformName"
      >
        {{ platformConfigStore.platformName }}
      </div>
      <LayoutBreadcrumb v-if="getShowContent && getShowBread" :theme="getHeaderTheme" />
    </div>
    <!-- left end -->

    <!-- menu start -->
    <div v-if="getShowTopMenu && !getIsMobile" :class="`${prefixCls}-menu`">
      <LayoutMenu :is-horizontal="true" :theme="getHeaderTheme" :split-type="getSplitType" :menu-mode="getMenuMode" />
    </div>
    <!-- menu-end -->

    <!-- action start -->
    <div :class="`${prefixCls}-action`">
      <AppSearch v-if="getShowSearch" :class="`${prefixCls}-action__item search-item`" />

      <ErrorAction v-if="getUseErrorHandle" :class="`${prefixCls}-action__item error-action`" />

      <Notify v-if="getShowNotice" :class="`${prefixCls}-action__item notify-item`" />

      <FullScreen v-if="getShowFullScreen" :class="`${prefixCls}-action__item fullscreen-item`" />

      <AppSizePicker :show-text="false" :class="`${prefixCls}-action__item size-item`" />

      <AppLocalePicker
        v-if="getShowLocalePicker" :reload="true" :show-text="false"
        :class="`${prefixCls}-action__item locale-item`"
      />

      <UserDropDown :theme="getHeaderLogoTheme" />

      <SettingDrawer v-if="getShowSetting" :class="`${prefixCls}-action__item`" />
    </div>
  </Header>
</template>

<style lang="less">
@import './index.less';
</style>
