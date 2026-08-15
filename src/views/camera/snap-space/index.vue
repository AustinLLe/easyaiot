<template>
  <div class="camera-sub-page">
    <SnapSpace ref="snapSpaceRef" />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import SnapSpace from '../components/SnapSpace/index.vue'

defineOptions({ name: 'CameraSnapSpace' })

const snapSpaceRef = ref<{ refresh?: () => void } | null>(null)

onMounted(() => snapSpaceRef.value?.refresh?.())
</script>

<style lang="less" scoped>
.camera-sub-page {
  height: 100vh;
  padding: 16px 19px 16px 15px;
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
