<template>
  <div class="alert-sub-page">
    <PushHistory />
  </div>
</template>

<script lang="ts" setup>
import PushHistory from '../components/PushHistory/index.vue'

defineOptions({ name: 'AlertPushHistoryPage' })
</script>

<style lang="less" scoped>
.alert-sub-page {
  height: calc(100vh - 96px);
  padding: 16px 19px 0 15px;
  background: #fff;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
