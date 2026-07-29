<script lang="ts" setup>
import { computed, ref } from 'vue'
import { BasicModal, useModalInner } from '@/components/Modal'
import { getApiLog } from '@/api/infra/apiLog'

const loading = ref(false)
const detail = ref<Recordable>({})
const prettyDetail = computed(() => JSON.stringify(detail.value, null, 2))

const [registerModal] = useModalInner(async (data: { type: 'access' | 'error'; id: number }) => {
  loading.value = true
  detail.value = {}
  try {
    detail.value = await getApiLog(data.type, data.id)
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <BasicModal title="API 日志详情" width="900px" :show-ok-btn="false" @register="registerModal">
    <a-spin :spinning="loading">
      <pre class="log-detail">{{ prettyDetail }}</pre>
    </a-spin>
  </BasicModal>
</template>

<style scoped>
.log-detail {
  max-height: 65vh;
  margin: 0;
  padding: 16px;
  overflow: auto;
  border-radius: 6px;
  background: #f6f8fa;
  color: #24292f;
  font-family: Consolas, Monaco, monospace;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
