<template>
  <div class="alert-sub-page">
    <AlertEvents />
  </div>
</template>

<script lang="ts" setup>
import AlertEvents from '../components/AlertEvents/index.vue'

defineOptions({ name: 'AlertEventsPage' })
</script>

<style lang="less" scoped>
.alert-sub-page {
  height: calc(100vh - 96px);
  padding: 16px 19px 0 15px;
  background: #fff;
  overflow: auto;
  box-sizing: border-box;
}
</style>
