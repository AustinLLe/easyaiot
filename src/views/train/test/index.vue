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
