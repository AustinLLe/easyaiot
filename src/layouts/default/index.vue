<script lang="ts" setup>
import { computed, unref } from 'vue'
import { Layout } from 'ant-design-vue'

import LayoutHeader from './header/index.vue'
import LayoutContent from './content/index.vue'
import LayoutSideBar from './sider/index.vue'
import LayoutMultipleHeader from './header/MultipleHeader.vue'
import ResourceProtectionNotice from './ResourceProtectionNotice.vue'
import LayoutFooter from './footer/index.vue'

import { useHeaderSetting } from '@/hooks/setting/useHeaderSetting'
import { useMenuSetting } from '@/hooks/setting/useMenuSetting'
import { useDesign } from '@/hooks/web/useDesign'
import { useLockPage } from '@/hooks/web/useLockPage'

import { useAppInject } from '@/hooks/web/useAppInject'

import { useMultipleTabSetting } from '@/hooks/setting/useMultipleTabSetting'
import { useFullContent } from '@/hooks/web/useFullContent'

defineOptions({ name: 'DefaultLayout' })

const { prefixCls } = useDesign('default-layout')
const { getIsMobile } = useAppInject()
const { getShowFullHeaderRef } = useHeaderSetting()
const { getShowSidebar, getIsMixSidebar, getShowMenu } = useMenuSetting()
const { getFullContent } = useFullContent()

const { getAutoCollapse } = useMultipleTabSetting()

const lockEvents = useLockPage()

const layoutClass = computed(() => {
  const cls: string[] = ['ant-layout']
  if (unref(getIsMixSidebar) || unref(getShowMenu))
    cls.push('ant-layout-has-sider')

  if (!unref(getShowMenu) && unref(getAutoCollapse))
    cls.push('ant-layout-auto-collapse-tabs')

  return cls
})
</script>

<template>
  <Layout :class="[prefixCls, { [`${prefixCls}--mix-shell`]: getIsMixSidebar, [`${prefixCls}--mix-full`]: getIsMixSidebar && getFullContent }]" v-bind="lockEvents">
    <ResourceProtectionNotice />
    <LayoutHeader v-if="!getIsMixSidebar && getShowFullHeaderRef" fixed />
    <div v-if="getIsMixSidebar" :class="[`${prefixCls}-shell`, { [`${prefixCls}-shell--full`]: getFullContent }]">
      <div :class="`${prefixCls}-shell-row`">
        <div v-show="!getFullContent" :class="`${prefixCls}-sidebar-slot`">
          <LayoutSideBar v-if="getShowSidebar || getIsMobile" />
        </div>
        <Layout :class="`${prefixCls}-main`">
          <LayoutMultipleHeader v-show="!getFullContent" />
          <LayoutContent />
          <LayoutFooter v-show="!getFullContent" />
        </Layout>
      </div>
    </div>
    <Layout v-else :class="[layoutClass, `${prefixCls}-out`]">
      <LayoutSideBar v-if="getShowSidebar || getIsMobile" />
      <Layout :class="`${prefixCls}-main`">
        <LayoutMultipleHeader />
        <LayoutContent />
        <LayoutFooter />
      </Layout>
    </Layout>
  </Layout>
</template>

<style lang="less">
  @prefix-cls: ~'@{namespace}-default-layout';

  .@{prefix-cls} {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100%;
    background-color: @mix-page-bg;

    > .ant-layout {
      min-height: 100%;
    }

    &-main {
      width: 100%;
      margin-left: 0;
    }
  }

  .@{prefix-cls}--mix-full {
    min-height: 100vh;
    background-color: #070b16;

    .@{prefix-cls}-shell,
    .@{prefix-cls}-shell-row {
      min-height: 100vh;
    }

    .@{prefix-cls}-main {
      background: transparent;
    }

    .@{namespace}-layout-content {
      min-height: 100vh;
      padding: 0;
    }
  }

  .@{prefix-cls}--mix-shell {
    min-height: 100vh;
    background-color: @mix-page-bg;

    .@{prefix-cls}-shell {
      min-height: 100vh;
      padding: 0;
      background-color: @mix-page-bg;
    }

    .@{prefix-cls}-shell-row {
      display: flex;
      flex-direction: row;
      align-items: stretch;
      min-height: 100vh;
      background-color: @mix-page-bg;
    }

    .@{prefix-cls}-sidebar-slot {
      flex-shrink: 0;
      order: 0;
      height: 100vh;
      background-color: @mix-rail-sidebar-bg;
    }

    .@{prefix-cls}-main {
      display: flex;
      flex: 1;
      flex-direction: column;
      order: 1;
      min-width: 0;
      background: @mix-page-bg;
    }

    .@{namespace}-layout-multiple-header--fixed {
      position: sticky;
      top: 0;
      z-index: @layout-header-fixed-z-index;
      width: 100% !important;
    }
  }

  .@{prefix-cls}-out {
    &.ant-layout-has-sider {
      .@{prefix-cls} {
        &-main {
          margin-left: 1px;
        }
      }
    }
  }
</style>
