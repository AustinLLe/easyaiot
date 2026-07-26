<script lang="ts" setup>
import { computed, unref } from 'vue'
import { useMenuSetting } from '@/hooks/setting/useMenuSetting'
import { useDesign } from '@/hooks/web/useDesign'
import { useGo } from '@/hooks/web/usePage'
import { PageEnum } from '@/enums/pageEnum'
import { usePlatformConfigStore } from '@/store/modules/platformConfig'

const props = defineProps({
  // 当前父组件的主题
  theme: { type: String, validator: (v: string) => ['light', 'dark'].includes(v) },
  // 是否显示标题
  showTitle: { type: Boolean, default: true },
  // 折叠菜单时也会显示标题
  alwaysShowTitle: { type: Boolean },
})

const { prefixCls } = useDesign('app-logo')
const { getCollapsedShowTitle } = useMenuSetting()
const platformConfigStore = usePlatformConfigStore()
const go = useGo()

const getAppLogoClass = computed(() => [prefixCls, props.theme, { 'collapsed-show-title': unref(getCollapsedShowTitle) }])

const getTitleClass = computed(() => [
  `${prefixCls}__title`,
  {
    'xs:opacity-0': !props.alwaysShowTitle,
  },
])

const logoSrc = computed(() => {
  return props.theme === 'dark'
    ? platformConfigStore.logoForDarkTheme
    : platformConfigStore.logoForLightTheme
})

const displayTitle = computed(() => platformConfigStore.platformName)

function goHome() {
  go(PageEnum.BASE_HOME)
}
</script>

<template>
  <div class="ant-icon" :class="getAppLogoClass" @click="goHome">
    <div class="logo-icon">
      <img class="uc-logo" :src="logoSrc" alt="" />
    </div>
    <div v-show="showTitle" class="truncate md:opacity-100 logo-title" :class="getTitleClass">
      {{ displayTitle }}
    </div>
  </div>
</template>

<style lang="less" scoped>
.ant-icon{
  margin-top: -1.28rem;
  display: flex;
  align-items: center;
  gap:0.58rem;
  .logo-icon{
    width: 32px;height: 32px;
    .uc-logo {
      width: 100% !important;
      height: 100%;
      object-fit: contain;
    }
  }
  .logo-title{
    font-family: moon,sans-serif;font-size: 2rem !important;margin-top: -5px;
  }
}

@prefix-cls: ~'@{namespace}-app-logo';

.@{prefix-cls} {
  display: flex;
  align-items: center;
  padding-left: 7px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0;

  &.light {
    border-bottom: 1px solid var(--border-color);
  }

  &.collapsed-show-title {
    padding-left: 20px;
  }

  &.dark &__title {
    color: @white;
  }

  &__title {
    font-size: 16px;
    font-weight: 700;
    line-height: normal;
    transition: all 0.5s;
  }
}
</style>
