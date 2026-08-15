<template>
  <div class="alert-sub-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">ALERT EVENTS</span>
        <h1>告警事件</h1>
        <p>查看算法检测产生的告警记录，支持处理、归档与推送。</p>
      </div>
    </header>
    <div class="alert-sub-page__body">
      <AlertEvents />
    </div>
  </div>
</template>

<script lang="ts" setup>
import AlertEvents from '../components/AlertEvents/index.vue'

defineOptions({ name: 'AlertEventsPage' })
</script>

<style lang="less" scoped>
.alert-sub-page {
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

  .alert-sub-page__body {
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
