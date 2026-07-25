<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useMessage } from '@/hooks/web/useMessage';
import { getResourceProtectionStatus } from '@/api/device/algorithm_task';

const { createWarningModal } = useMessage();
const lastShownAt = ref<string | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;

async function checkResourceProtection() {
  try {
    const response = await getResourceProtectionStatus();
    const state = (response as any)?.data ?? response;
    if (!state?.active || !state.triggered_at || state.triggered_at === lastShownAt.value) return;
    lastShownAt.value = state.triggered_at;
    const memory = state.available_memory_mib == null ? '' : `（剩余 ${state.available_memory_mib} MiB）`;
    createWarningModal({
      title: '内存不足：算法任务已自动停止',
      content: `${state.message || '服务器可用内存过低，算法任务已停止以保护主服务。'}${memory}。可在算法管理页面手动重新启动任务。`,
    });
  } catch {
    // Do not turn a transient polling failure into a user-facing error loop.
  }
}

onMounted(() => {
  checkResourceProtection();
  timer = setInterval(checkResourceProtection, 10000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<template><span class="hidden" /></template>
