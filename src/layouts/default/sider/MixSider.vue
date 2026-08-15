<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { computed, ref, unref, watch } from 'vue'
import { AppLogo } from '@/components/Application'
import { ScrollContainer } from '@/components/Container'
import { SimpleMenu } from '@/components/SimpleMenu'
import { useMenuSetting } from '@/hooks/setting/useMenuSetting'
import { usePermissionStore } from '@/store/modules/permission'
import { useDesign } from '@/hooks/web/useDesign'
import { useGo } from '@/hooks/web/usePage'
import { SIDE_BAR_MINI_WIDTH, SIDE_BAR_SHOW_TIT_MINI_WIDTH } from '@/enums/appEnum'
import { getMenus } from '@/router/menus'
import type { Menu } from '@/router/types'
import { UserDropDown } from '@/layouts/default/header/components'

const menus = ref<Menu[]>([])

const { prefixCls } = useDesign('layout-mix-sider')
const go = useGo()
const {
  getMenuTheme,
  getAccordion,
  getCollapsed,
  toggleCollapsed,
} = useMenuSetting()

const permissionStore = usePermissionStore()

const sidebarWidth = computed(() => {
  return unref(getCollapsed) ? SIDE_BAR_MINI_WIDTH : SIDE_BAR_SHOW_TIT_MINI_WIDTH
})

const rootStyle = computed((): CSSProperties => {
  const width = `${unref(sidebarWidth)}px`
  return {
    width,
    maxWidth: width,
    minWidth: width,
    flex: `0 0 ${width}`,
  }
})

async function loadMenus() {
  menus.value = await getMenus()
}

watch(
  [() => permissionStore.getLastBuildMenuTime, () => permissionStore.getBackMenuList],
  () => {
    loadMenus()
  },
  { immediate: true },
)

function handleMenuClick(path: string) {
  go(path)
}
</script>

<template>
  <aside
    :class="[
      prefixCls,
      `${prefixCls}--rank`,
      getMenuTheme,
      { [`${prefixCls}--collapsed`]: getCollapsed },
    ]"
    :style="rootStyle"
  >
    <div v-if="!getCollapsed" :class="`${prefixCls}__head`">
      <AppLogo
        :class="`${prefixCls}__logo`"
        theme="light"
        :compact="true"
        :always-show-title="true"
      />
      <button
        type="button"
        :class="`${prefixCls}__collapse-btn`"
        aria-label="收起侧栏"
        @click="toggleCollapsed"
      >
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1.5" y="1.5" width="17" height="17" rx="3" stroke="currentColor" stroke-width="1.2" />
          <line x1="7.5" y1="1.5" x2="7.5" y2="18.5" stroke="currentColor" stroke-width="1.2" />
          <line x1="4" y1="7.5" x2="4" y2="12.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <button
      v-else
      type="button"
      :class="[`${prefixCls}__expand-btn`, `${prefixCls}__menu-hit`]"
      aria-label="展开侧栏"
      @click="toggleCollapsed"
    >
      <svg viewBox="0 0 20 20" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="17" height="17" rx="3" stroke="currentColor" stroke-width="1.2" />
        <line x1="7.5" y1="1.5" x2="7.5" y2="18.5" stroke="currentColor" stroke-width="1.2" />
        <line x1="5" y1="10" x2="3" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        <line x1="5" y1="10" x2="3" y2="12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      </svg>
    </button>

    <ScrollContainer :class="`${prefixCls}__menu-scroll`">
      <div :class="`${prefixCls}__menu-body`">
        <SimpleMenu
          :items="menus"
          :theme="getMenuTheme"
          :collapse="getCollapsed"
          :accordion="getAccordion"
          :icon-size="18"
          @menu-click="handleMenuClick"
        />
      </div>
    </ScrollContainer>

    <div :class="`${prefixCls}__foot`">
      <UserDropDown theme="light" />
    </div>
  </aside>
</template>

<style lang="less">
@prefix-cls: ~'@{namespace}-layout-mix-sider';
@menu-prefix-cls: ~'@{namespace}-menu';
@simple-prefix-cls: ~'@{namespace}-simple-menu';

.@{prefix-cls}--rank {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  min-height: inherit;
  padding: 8px 6px 6px;
  overflow: hidden;
  background-color: @mix-rail-sidebar-bg;
  border-right: 1px solid @mix-stroke-color;
  box-shadow: 1px 0 0 rgb(0 0 0 / 2%);
  box-sizing: border-box;
  transition: width 0.25s ease, min-width 0.25s ease;

  &.@{prefix-cls}--collapsed {
    padding: 8px 3px 6px;
  }

  .@{prefix-cls}__head {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 44px;
    margin-bottom: 4px;
    padding: 0 4px 0 2px;
  }

  .@{prefix-cls}__logo {
    flex: 1;
    min-width: 0;
    padding-left: 0 !important;
  }

  .@{prefix-cls}__collapse-btn,
  .@{prefix-cls}__expand-btn {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    color: @mix-rail-text-secondary;
    cursor: pointer;
    background: transparent;
    border: none;
    border-radius: 6px;
    transition: color 0.15s ease, background 0.15s ease;

    &:hover {
      color: @mix-rail-text;
      background: @mix-highlight-bg;
    }
  }

  .@{prefix-cls}__expand-btn {
    width: 100%;
    margin-bottom: 4px;
  }

  .@{prefix-cls}__menu-scroll {
    flex: 1;
    min-height: 0;

    .scrollbar__wrap {
      overflow-x: hidden;
    }
  }

  .@{prefix-cls}__menu-body {
    padding: 4px 0 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

    .@{simple-prefix-cls} {
      width: 100%;
    }

    .@{simple-prefix-cls}-sub-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 20px;
    }

    .@{menu-prefix-cls}-light.@{menu-prefix-cls}-vertical {
      background-color: transparent !important;
      border-right: none !important;
      font-family: inherit;

      .@{menu-prefix-cls}-item,
      .@{menu-prefix-cls}-submenu-title {
        min-height: 38px;
        margin: 0 @mix-rail-item-inset 2px;
        padding: 8px 10px 8px 14px !important;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        color: @mix-rail-text;
        border-radius: @mix-menu-radius;

        .anticon,
        .app-iconify {
          color: @mix-rail-text-secondary;
        }

        &:hover {
          color: @mix-rail-text !important;
          background-color: @mix-highlight-bg !important;

          .anticon,
          .app-iconify {
            color: @mix-rail-text !important;
          }
        }
      }

      .@{menu-prefix-cls}-submenu .@{menu-prefix-cls}-item {
        padding-left: 24px !important;
      }

      .@{menu-prefix-cls}-item-selected,
      .@{menu-prefix-cls}-item-active:not(.@{menu-prefix-cls}-submenu),
      .@{menu-prefix-cls}-item-selected:hover,
      .@{menu-prefix-cls}-submenu-active > .@{menu-prefix-cls}-submenu-title {
        color: @mix-brand-color !important;
        background-color: @mix-highlight-bg !important;

        .anticon,
        .app-iconify,
        span {
          color: @mix-brand-color !important;
        }

        &::after {
          display: none !important;
        }
      }

      .@{menu-prefix-cls}-submenu .@{menu-prefix-cls}-item-selected,
      .@{menu-prefix-cls}-submenu .@{menu-prefix-cls}-item-active {
        color: @mix-brand-color !important;
        background-color: @mix-highlight-bg !important;

        .anticon,
        .app-iconify,
        span {
          color: @mix-brand-color !important;
        }
      }
    }

    .@{menu-prefix-cls}-collapse {
      width: 100%;

      .@{menu-prefix-cls}-submenu-title,
      .@{menu-prefix-cls}-item {
        display: flex;
        justify-content: center;
        padding: 9px 0 !important;
        margin: 0 0 2px !important;
      }
    }
  }

  .@{prefix-cls}__foot {
    flex-shrink: 0;
    padding: 8px 4px 4px;
    border-top: 1px solid @mix-stroke-color;

    .@{namespace}-header-user-dropdown {
      width: 100%;
      height: auto;
      padding: 6px 8px;
      border-radius: @mix-menu-radius;

      &:hover {
        background: @mix-highlight-bg;
      }
    }
  }
}
</style>
