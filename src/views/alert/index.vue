<script lang="ts" setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineOptions({ name: 'AlertLegacyRedirect' })

const route = useRoute()
const router = useRouter()

const tabRouteMap: Record<string, string> = {
  events: '/alert/events',
  'push-settings': '/alert/push-settings',
  'message-config': '/alert/message-config',
  'push-history': '/alert/push-history',
}

onMounted(() => {
  const tab = String(route.query.tab || 'events')
  router.replace(tabRouteMap[tab] || '/alert/events')
})
</script>

<template>
  <div />
</template>
