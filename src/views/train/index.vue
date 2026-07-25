<script lang="ts" setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineOptions({ name: 'TrainLegacyRedirect' })

const route = useRoute()
const router = useRouter()

const tabRouteMap: Record<string, string> = {
  1: '/train/models',
  2: '/train/test',
  3: '/train/export',
  4: '/train/deploy',
}

onMounted(() => {
  const tab = String(route.query.tab || '')
  router.replace(tabRouteMap[tab] || '/train/models')
})
</script>

<template>
  <div />
</template>
