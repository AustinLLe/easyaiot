<template>
  <div class="train-sub-page">
    <ModelExport />
  </div>
</template>

<script lang="ts" setup>
import ModelExport from '../components/ModelExport/index.vue'

defineOptions({ name: 'TrainExportPage' })
</script>

<style lang="less" scoped>
.train-sub-page {
  height: calc(100vh - 96px);
  padding: 16px 19px 0 15px;
  background: #fff;
  overflow: hidden;
  box-sizing: border-box;
}
</style>
