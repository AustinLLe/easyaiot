<template>
  <div class="alert-container">
    <div class="alert-tab">
      <Tabs
        :activeKey="state.activeKey"
        :animated="{ inkBar: true, tabPane: true }"
        :tabBarGutter="60"
        @tabClick="handleTabClick"
      >
        <TabPane key="events" tab="告警事件">
          <AlertEvents />
        </TabPane>
        <TabPane key="push-settings" tab="推送设置">
          <PushSettings />
        </TabPane>
        <TabPane key="message-config" tab="消息配置">
          <MessageConfig />
        </TabPane>
        <TabPane key="push-history" tab="推送历史">
          <PushHistory />
        </TabPane>
      </Tabs>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive } from 'vue';
import { TabPane, Tabs } from 'ant-design-vue';
import AlertEvents from '@/views/alert/components/AlertEvents/index.vue';
import PushSettings from '@/views/alert/components/PushSettings/index.vue';
import MessageConfig from '@/views/alert/components/MessageConfig/index.vue';
import PushHistory from '@/views/alert/components/PushHistory/index.vue';

defineOptions({ name: 'Alarm' });

const state = reactive({
  activeKey: 'events',
});

function handleTabClick(key: string) {
  state.activeKey = key;
}
</script>

<style lang="less" scoped>
.alert-container {
  .alert-tab {
    padding: 16px 19px 0 15px;

    :deep(.ant-tabs-nav) {
      padding: 5px 0 0 25px;
    }

    :deep(.ant-tabs) {
      background-color: #fff;
    }
  }
}
</style>
