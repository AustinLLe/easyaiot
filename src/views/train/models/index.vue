<template>
  <div class="train-sub-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">ALGORITHMS</span>
        <h1>算法列表</h1>
        <p>管理本地算法模型，供算法任务选择与部署。</p>
      </div>
    </header>
    <div class="train-sub-page__body">
      <ModelList />
    </div>
  </div>
</template>

<script lang="ts" setup>
import ModelList from '../components/ModelList/index.vue'

defineOptions({ name: 'TrainModelsPage' })
</script>

<style lang="less" scoped>
.train-sub-page {
  height: 100vh;
  padding: 28px 24px 24px;
  background: transparent;
  overflow: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  .page-header {
    flex-shrink: 0;
    margin-bottom: 22px;
  }

  .eyebrow {
    color: #2457a7;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
  }

  .page-header h1 {
    margin: 7px 0 6px;
    color: #17233d;
    font-size: 28px;
    line-height: 1.2;
  }

  .page-header p {
    margin: 0;
    color: #7d889a;
    font-size: 14px;
  }

  .train-sub-page__body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    > :deep(*) {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  }
}
</style>
