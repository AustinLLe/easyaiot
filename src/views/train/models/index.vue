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
