<template>
  <div class="camera-sub-page">
    <StreamForward ref="streamForwardRef" />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import StreamForward from '../components/StreamForward/index.vue'

defineOptions({ name: 'CameraStreamForward' })

const streamForwardRef = ref<{ refresh?: () => void } | null>(null)

onMounted(() => streamForwardRef.value?.refresh?.())
</script>

<style lang="less" scoped>
.camera-sub-page {
  padding: 16px 19px 16px 15px;
  background: #fff;
  min-height: calc(100vh - 120px);
}
</style>
