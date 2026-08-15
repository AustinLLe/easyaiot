<template>
  <div class="train-sub-page">
    <DeployService />
  </div>
</template>

<script lang="ts" setup>
import DeployService from '../components/DeployService/index.vue'

defineOptions({ name: 'TrainDeployPage' })
</script>

<style lang="less" scoped>
.train-sub-page {
  height: 100vh;
  padding: 16px 19px 0 15px;
  background: transparent;
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
