<script lang="ts" setup>
defineOptions({ name: 'PageIntro' })

defineProps({
  eyebrow: { type: String, required: true },
  title: { type: String, required: true },
  desc: { type: String, default: '' },
})
</script>

<template>
  <div class="page-intro">
    <header class="page-header">
      <div>
        <span class="eyebrow">{{ eyebrow }}</span>
        <h1>{{ title }}</h1>
        <p v-if="desc">{{ desc }}</p>
      </div>
    </header>
    <div class="page-intro__body">
      <slot />
    </div>
  </div>
</template>

<style lang="less" scoped>
.page-intro {
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

  .page-intro__body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    > :deep(*:first-child) {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
  }
}
</style>
