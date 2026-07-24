<template>
  <div class="train-sub-page">
    <AiModelTool />
  </div>
</template>

<script lang="ts" setup>
import AiModelTool from '../components/AiModelTool/index.vue'

defineOptions({ name: 'TrainTestPage' })
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
