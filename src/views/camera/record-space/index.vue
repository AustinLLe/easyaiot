<template>
  <div class="camera-sub-page">
    <RecordSpace ref="recordSpaceRef" />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import RecordSpace from '../components/RecordSpace/index.vue'

defineOptions({ name: 'CameraRecordSpace' })

const recordSpaceRef = ref<{ refresh?: () => void } | null>(null)

onMounted(() => recordSpaceRef.value?.refresh?.())
</script>

<style lang="less" scoped>
.camera-sub-page {
  height: calc(100vh - 96px);
  padding: 16px 19px 16px 15px;
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
