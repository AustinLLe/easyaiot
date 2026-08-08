<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { HardwareStatus, ResourceContributor } from '@/api/system/hardware'
import { getHardwareStatus } from '@/api/system/hardware'

defineOptions({ name: 'SystemHardwareStatus' })

const status = ref<HardwareStatus>()
const loading = ref(true)
const failed = ref(false)
let timer: number | undefined
let requestInFlight = false
const circumference = 339.29

const cards = computed(() => {
  const current = status.value
  if (!current)
    return []
  return [
    {
      key: 'cpu',
      title: 'CPU',
      percent: current.cpu.percent,
      value: `${current.cpu.cores} 核心`,
      detail: '各进程占整机 CPU 容量',
      contributors: current.cpu.contributors || [],
    },
    {
      key: 'memory',
      title: '内存',
      percent: current.memory.percent,
      value: `${current.memory.usedGiB} GB / ${current.memory.totalGiB} GB`,
      detail: '各进程占整机内存容量',
      contributors: current.memory.contributors || [],
    },
    {
      key: 'root',
      title: '系统盘 /',
      percent: current.rootDisk.percent,
      value: `${current.rootDisk.usedGiB} GB / ${current.rootDisk.totalGiB} GB`,
      detail: '系统根分区空间构成',
      contributors: current.rootDisk.contributors || [],
    },
    {
      key: 'data',
      title: '业务数据盘',
      percent: current.dataDisk.percent,
      value: `${current.dataDisk.usedGiB} GB / ${current.dataDisk.totalGiB} GB`,
      detail: '/srv/easyaiot-data 空间构成',
      contributors: current.dataDisk.contributors || [],
    },
  ]
})

function ringColor(percent: number) {
  if (percent >= 90)
    return '#ef4444'
  if (percent >= 75)
    return '#f59e0b'
  return '#16a34a'
}

function ringSegments(contributors: ResourceContributor[], totalPercent: number) {
  const values = contributors.length
    ? contributors
    : [{ key: 'total', label: '已使用', percent: totalPercent, color: ringColor(totalPercent) }]
  let offset = 0
  return values.map((item) => {
    const percent = Math.max(0, Math.min(100, item.percent))
    const segment = {
      ...item,
      dasharray: `${circumference * percent / 100} ${circumference}`,
      dashoffset: -circumference * offset / 100,
    }
    offset += percent
    return segment
  })
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
  timer = window.setInterval(refresh, 500)
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
        <p>服务器资源每 0.5 秒自动更新 · 当前负载 {{ status?.load.percent ?? '--' }}%</p>
      </div>
      <div class="live-state" :class="{ offline: failed }">
        <span class="live-dot" />
        {{ failed ? '更新中断，正在重试' : '实时更新' }}
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="metric-grid">
        <section v-for="card in cards" :key="card.key" class="metric-card">
          <div class="metric-main">
            <div class="progress-ring" :aria-label="`${card.title} ${Math.round(card.percent)}%`">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle class="ring-track" cx="60" cy="60" r="54" />
                <circle
                  v-for="segment in ringSegments(card.contributors, card.percent)"
                  :key="segment.key"
                  class="ring-segment"
                  cx="60"
                  cy="60"
                  r="54"
                  :stroke="segment.color"
                  :stroke-dasharray="segment.dasharray"
                  :stroke-dashoffset="segment.dashoffset"
                />
              </svg>
              <div class="ring-label">
                <span class="ring-number">{{ Math.round(card.percent) }}</span>
                <span class="ring-unit">%</span>
              </div>
            </div>
            <div class="metric-copy">
              <div class="metric-title" :title="card.title">
                {{ card.title }}
              </div>
              <div class="metric-value">
                {{ card.value }}
              </div>
              <div class="metric-detail">
                {{ card.detail }}
              </div>
            </div>
          </div>

          <div class="contributor-list">
            <div v-for="item in card.contributors" :key="item.key" class="contributor-row">
              <span class="legend-dot" :style="{ backgroundColor: item.color }" />
              <span class="contributor-name" :title="item.label">{{ item.label }}</span>
              <strong>{{ item.percent.toFixed(1) }}%</strong>
            </div>
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
    font-size: 24px;
    font-weight: 700;
    color: #1f2937;
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
  font-weight: 600;
  color: #168a43;

  &.offline {
    color: #d97706;
  }
}

.live-dot {
  width: 9px;
  height: 9px;
  background: currentcolor;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(22 163 74 / 12%);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(460px, 1fr));
  gap: 18px;
}

.metric-card {
  min-height: 390px;
  padding: 28px;
  background: #fff;
  border: 1px solid #eef1ef;
  border-radius: 14px;
  box-shadow: 0 5px 18px rgb(24 39 30 / 6%);
}

.metric-main {
  display: flex;
  gap: 32px;
  align-items: center;
}

.progress-ring {
  position: relative;
  flex: 0 0 230px;
  width: 230px;
  height: 230px;

  svg {
    display: block;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
}

.ring-track,
.ring-segment {
  fill: none;
  stroke-width: 11;
}

.ring-track {
  stroke: #edf0ee;
}

.ring-segment {
  transition: stroke-dasharray 0.35s ease, stroke-dashoffset 0.35s ease;
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-number {
  font-size: 52px;
  font-weight: 800;
  line-height: 1;
  color: #111827;
}

.ring-unit {
  margin-left: 3px;
  font-size: 17px;
  font-weight: 700;
  color: #64748b;
}

.metric-copy {
  min-width: 0;
}

.metric-title {
  overflow: hidden;
  font-size: 22px;
  font-weight: 700;
  color: #303632;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-value {
  margin-top: 8px;
  font-size: 25px;
  font-weight: 800;
  line-height: 1.25;
  color: #242a26;
}

.metric-detail {
  margin-top: 10px;
  font-size: 14px;
  color: #8a938d;
}

.contributor-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 22px;
  padding-top: 20px;
  margin-top: 24px;
  border-top: 1px solid #eef1ef;
}

.contributor-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  color: #4b5563;

  strong {
    font-variant-numeric: tabular-nums;
    color: #1f2937;
  }
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.contributor-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1150px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .hardware-page {
    padding: 14px;
  }

  .page-heading,
  .metric-main {
    align-items: flex-start;
  }

  .metric-main {
    flex-direction: column;
  }

  .progress-ring {
    align-self: center;
  }

  .contributor-list {
    grid-template-columns: 1fr;
  }
}
</style>
