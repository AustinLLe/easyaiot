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
  padding: 16px 19px 0 15px;
  background: #fff;
  min-height: calc(100vh - 120px);
}
</style>
