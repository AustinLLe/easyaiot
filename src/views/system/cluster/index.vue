<script lang="ts" setup>
import { computed, ref } from 'vue'
import { ClusterOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import {
  Alert as AAlert,
  Button as AButton,
  Progress as AProgress,
  Table as ATable,
  Tag as ATag,
  Tooltip as ATooltip,
} from 'ant-design-vue'
import NodeDetailDrawer from './components/NodeDetailDrawer.vue'
import {
  MOCK_CLUSTER_SUMMARY,
  MOCK_EDGE_NODES,
  formatRelativeHeartbeat,
  type EdgeNode,
  type EdgeNodeStatus,
} from './mockData'

defineOptions({ name: 'SystemEdgeCluster' })

const selectedNode = ref<EdgeNode>()
const refreshing = ref(false)

const summaryCards = computed(() => [
  { key: 'total', label: '节点总数', value: MOCK_CLUSTER_SUMMARY.totalNodes, hint: '已注册边缘节点', tone: '#2563eb' },
  { key: 'online', label: '在线', value: MOCK_CLUSTER_SUMMARY.onlineNodes, hint: '心跳正常', tone: '#16a34a' },
  { key: 'offline', label: '离线', value: MOCK_CLUSTER_SUMMARY.offlineNodes, hint: '超过阈值未上报', tone: '#6b7280' },
  { key: 'warning', label: '异常', value: MOCK_CLUSTER_SUMMARY.warningNodes, hint: '资源或任务告警', tone: '#d97706' },
  { key: 'tasks', label: '运行任务', value: `${MOCK_CLUSTER_SUMMARY.runningTasks}/${MOCK_CLUSTER_SUMMARY.totalTasks}`, hint: '集群汇总', tone: '#7c3aed' },
  { key: 'alerts', label: '今日告警', value: MOCK_CLUSTER_SUMMARY.alertToday, hint: '各节点合计', tone: '#dc2626' },
])

const columns = [
  { title: '节点名称', dataIndex: 'name', key: 'name', width: 160 },
  { title: 'IP', dataIndex: 'ip', key: 'ip', width: 130 },
  { title: '状态', key: 'status', width: 90 },
  { title: 'CPU', key: 'cpu', width: 120 },
  { title: '内存', key: 'memory', width: 120 },
  { title: '版本', dataIndex: 'edgeVersion', key: 'edgeVersion', width: 110 },
  { title: '任务', key: 'tasks', width: 90 },
  { title: '摄像头', dataIndex: 'cameraCount', key: 'cameraCount', width: 80 },
  { title: '今日告警', dataIndex: 'alertToday', key: 'alertToday', width: 90 },
  { title: '最后心跳', key: 'heartbeat', width: 130 },
  { title: '操作', key: 'action', fixed: 'right' as const, width: 90 },
]

function statusLabel(status: EdgeNodeStatus) {
  if (status === 'online')
    return '在线'
  if (status === 'warning')
    return '异常'
  return '离线'
}

function statusColor(status: EdgeNodeStatus) {
  if (status === 'online')
    return 'success'
  if (status === 'warning')
    return 'warning'
  return 'default'
}

function progressColor(percent: number) {
  if (percent >= 85)
    return '#ef4444'
  if (percent >= 70)
    return '#f59e0b'
  return '#16a34a'
}

function openDetail(node: EdgeNode) {
  selectedNode.value = node
}

async function handleRefresh() {
  refreshing.value = true
  await new Promise(resolve => window.setTimeout(resolve, 600))
  refreshing.value = false
}
</script>

<template>
  <div class="cluster-page">
    <div class="page-heading">
      <div>
        <h1>边缘集群管理</h1>
        <p>统一管理多块 RK3588 开发板的在线状态、资源占用与算法任务概况</p>
      </div>
      <AButton :loading="refreshing" @click="handleRefresh">
        <template #icon><ReloadOutlined /></template>
        刷新
      </AButton>
    </div>

    <AAlert
      type="warning"
      show-icon
      class="prototype-banner"
      message="原型页面 · Mock 数据"
      description="本页用于与老师确认「集群管理」范围。节点列表、资源与任务数据均为本地模拟，尚未对接后端 API。"
    />

    <section class="summary-grid">
      <article v-for="card in summaryCards" :key="card.key" class="summary-card">
        <div class="summary-label">{{ card.label }}</div>
        <div class="summary-value" :style="{ color: card.tone }">{{ card.value }}</div>
        <div class="summary-hint">{{ card.hint }}</div>
      </article>
    </section>

    <section class="table-panel">
      <div class="table-toolbar">
        <div class="toolbar-title">
          <ClusterOutlined />
          <span>边缘节点列表</span>
          <ATag color="blue">{{ MOCK_EDGE_NODES.length }} 台</ATag>
        </div>
      </div>

      <ATable
        row-key="id"
        :columns="columns"
        :data-source="MOCK_EDGE_NODES"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :scroll="{ x: 1200 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <ATag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</ATag>
          </template>
          <template v-else-if="column.key === 'cpu'">
            <AProgress
              :percent="record.cpuPercent"
              size="small"
              :stroke-color="progressColor(record.cpuPercent)"
              :format="percent => `${percent}%`"
            />
          </template>
          <template v-else-if="column.key === 'memory'">
            <AProgress
              :percent="record.memoryPercent"
              size="small"
              :stroke-color="progressColor(record.memoryPercent)"
              :format="percent => `${percent}%`"
            />
          </template>
          <template v-else-if="column.key === 'tasks'">
            {{ record.runningTasks }}/{{ record.totalTasks }}
          </template>
          <template v-else-if="column.key === 'heartbeat'">
            <ATooltip :title="record.lastHeartbeat">
              {{ formatRelativeHeartbeat(record.lastHeartbeat) }}
            </ATooltip>
          </template>
          <template v-else-if="column.key === 'action'">
            <AButton type="link" @click="openDetail(record)">详情</AButton>
          </template>
        </template>
      </ATable>
    </section>

    <NodeDetailDrawer :node="selectedNode" @close="selectedNode = undefined" />
  </div>
</template>

<style lang="less" scoped>
.cluster-page {
  min-height: 100%;
  padding: 24px;
  background: #f5f7f6;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h1 {
    margin: 0;
    color: #1f2937;
    font-size: 24px;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    color: #7a847e;
  }
}

.prototype-banner {
  margin-bottom: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  padding: 16px;
  border: 1px solid #eef1ef;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 14px rgb(24 39 30 / 5%);
}

.summary-label {
  color: #6b7280;
  font-size: 13px;
}

.summary-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
}

.summary-hint {
  margin-top: 6px;
  color: #9ca3af;
  font-size: 12px;
}

.table-panel {
  padding: 16px;
  border: 1px solid #eef1ef;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 14px rgb(24 39 30 / 5%);
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-title {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(140px, 1fr));
  }
}

@media (max-width: 768px) {
  .cluster-page {
    padding: 14px;
  }

  .page-heading,
  .table-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
}
</style>
