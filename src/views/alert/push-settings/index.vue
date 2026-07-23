<template>
  <div class="alert-sub-page">
    <PushSettings />
  </div>
</template>

<script lang="ts" setup>
import PushSettings from '../components/PushSettings/index.vue'

defineOptions({ name: 'AlertPushSettingsPage' })
</script>

<style lang="less" scoped>
.alert-sub-page {
  padding: 16px 19px 0 15px;
  background: #fff;
  min-height: calc(100vh - 120px);
}
</style>
