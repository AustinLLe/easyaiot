<template>
  <div class="alert-sub-page">
    <MessageConfig />
  </div>
</template>

<script lang="ts" setup>
import MessageConfig from '../components/MessageConfig/index.vue'

defineOptions({ name: 'AlertMessageConfigPage' })
</script>

<style lang="less" scoped>
.alert-sub-page {
  height: calc(100vh - 96px);
  padding: 16px 19px 0 15px;
  background: #fff;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  > :deep(*) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}
</style>
