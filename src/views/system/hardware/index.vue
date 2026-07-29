<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { HardwareStatus } from '@/api/system/hardware'
import { getHardwareStatus } from '@/api/system/hardware'

defineOptions({ name: 'SystemHardwareStatus' })

const status = ref<HardwareStatus>()
const loading = ref(true)
const failed = ref(false)
let timer: number | undefined
let requestInFlight = false

const cards = computed(() => {
  const current = status.value
  if (!current)
    return []
  return [
    {
      key: 'load',
      title: '负载',
      percent: current.load.percent,
      value: loadDescription(current.load.percent),
      detail: `1 / 5 / 15 分钟：${current.load.oneMinute} / ${current.load.fiveMinutes} / ${current.load.fifteenMinutes}`,
    },
    {
      key: 'cpu',
      title: 'CPU',
      percent: current.cpu.percent,
      value: `${current.cpu.cores} 核心`,
      detail: '当前 CPU 使用率',
    },
    {
      key: 'memory',
      title: '内存',
      percent: current.memory.percent,
      value: `${current.memory.usedGiB} GB / ${current.memory.totalGiB} GB`,
      detail: '已用 / 总容量',
    },
    {
      key: 'root',
      title: '/',
      percent: current.rootDisk.percent,
      value: `${current.rootDisk.usedGiB} GB / ${current.rootDisk.totalGiB} GB`,
      detail: '系统根分区',
    },
    {
      key: 'data',
      title: '/srv/easyaiot-data',
      percent: current.dataDisk.percent,
      value: `${current.dataDisk.usedGiB} GB / ${current.dataDisk.totalGiB} GB`,
      detail: '业务数据分区',
    },
  ]
})

function loadDescription(percent: number) {
  if (percent < 50)
    return '运行流畅'
  if (percent < 80)
    return '负载适中'
  return '负载较高'
}

function ringColor(percent: number) {
  if (percent >= 90)
    return '#ef4444'
  if (percent >= 75)
    return '#f59e0b'
  return '#16a34a'
}

async function refresh() {
  if (requestInFlight || document.hidden)
    return
  requestInFlight = true
  try {
    status.value = await getHardwareStatus()
    failed.value = false
  }
  catch {
    failed.value = true
  }
  finally {
    loading.value = false
    requestInFlight = false
  }
}

function handleVisibilityChange() {
  if (!document.hidden)
    refresh()
}

onMounted(() => {
  refresh()
  timer = window.setInterval(refresh, 1000)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  if (timer)
    window.clearInterval(timer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div class="hardware-page">
    <div class="page-heading">
      <div>
        <h2>硬件状态</h2>
        <p>服务器资源每秒自动更新</p>
      </div>
      <div class="live-state" :class="{ offline: failed }">
        <span class="live-dot"></span>
        {{ failed ? '更新中断，正在重试' : '实时更新' }}
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="metric-grid">
        <section v-for="card in cards" :key="card.key" class="metric-card">
          <div class="progress-ring" :aria-label="`${card.title} ${Math.round(card.percent)}%`">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle class="ring-track" cx="60" cy="60" r="52" />
              <circle
                class="ring-progress"
                cx="60"
                cy="60"
                r="52"
                :stroke="ringColor(card.percent)"
                :stroke-dashoffset="326.73 * (1 - card.percent / 100)"
              />
            </svg>
            <div class="ring-label">
              <span class="ring-number">{{ Math.round(card.percent) }}</span>
              <span class="ring-unit">%</span>
            </div>
          </div>
          <div class="metric-copy">
            <div class="metric-title" :title="card.title">{{ card.title }}</div>
            <div class="metric-value">{{ card.value }}</div>
            <div class="metric-detail">{{ card.detail }}</div>
          </div>
        </section>
      </div>
    </a-spin>
  </div>
</template>

<style lang="less" scoped>
.hardware-page {
  min-height: 100%;
  padding: 24px;
  background: #f5f7f6;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    color: #1f2937;
    font-size: 24px;
    font-weight: 700;
  }

  p {
    margin: 5px 0 0;
    color: #7a847e;
  }
}

.live-state {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #168a43;
  font-weight: 600;

  &.offline {
    color: #d97706;
  }
}

.live-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px rgb(22 163 74 / 12%);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(210px, 1fr));
  gap: 16px;
}

.metric-card {
  display: flex;
  min-height: 300px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 26px 22px;
  border: 1px solid #eef1ef;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 5px 18px rgb(24 39 30 / 6%);
}

.progress-ring {
  position: relative;
  width: 148px;
  height: 148px;
  flex: 0 0 148px;

  svg {
    display: block;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
}

.ring-track,
.ring-progress {
  fill: none;
  stroke-width: 9;
}

.ring-track {
  stroke: #edf0ee;
}

.ring-progress {
  stroke-dasharray: 326.73;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.65s ease, stroke 0.3s ease;
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-number {
  color: #16a34a;
  font-size: 42px;
  font-weight: 800;
  line-height: 1;
}

.ring-unit {
  margin-left: 2px;
  color: #16a34a;
  font-size: 15px;
  font-weight: 700;
}

.metric-copy {
  width: 100%;
  margin-top: 22px;
  text-align: left;
}

.metric-title {
  overflow: hidden;
  color: #303632;
  font-size: 18px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-value {
  margin-top: 6px;
  color: #242a26;
  font-size: 25px;
  font-weight: 800;
  line-height: 1.25;
}

.metric-detail {
  margin-top: 8px;
  color: #8a938d;
  font-size: 13px;
}

@media (max-width: 1500px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(230px, 1fr));
  }
}

@media (max-width: 900px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }
}

@media (max-width: 600px) {
  .hardware-page {
    padding: 14px;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .page-heading {
    align-items: flex-start;
  }
}
</style>
