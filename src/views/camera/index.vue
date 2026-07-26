<script lang="ts" setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineOptions({ name: 'CameraLegacyRedirect' })

const route = useRoute()
const router = useRouter()

const tabRouteMap: Record<string, string> = {
  1: '/camera/devices',
  3: '/camera/snap-space',
  4: '/camera/record-space',
  5: '/algorithm-task/index',
}

onMounted(() => {
  const tab = String(route.query.tab || '')
  if (tab === '5') {
    router.replace('/algorithm-task/index')
    return
  }
  router.replace(tabRouteMap[tab] || '/camera/devices')
})
</script>

<template>
  <div />
</template>
