<template>
  <div class="train-sub-page">
    <ModelList />
  </div>
</template>

<script lang="ts" setup>
import ModelList from '../components/ModelList/index.vue'

defineOptions({ name: 'TrainModelsPage' })
</script>

<style lang="less" scoped>
.train-sub-page {
  padding: 16px 19px 0 15px;
  background: #fff;
  min-height: calc(100vh - 120px);
}
</style>
