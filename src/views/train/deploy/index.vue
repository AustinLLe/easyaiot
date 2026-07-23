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
  padding: 16px 19px 0 15px;
  background: #fff;
  min-height: calc(100vh - 120px);
}
</style>
