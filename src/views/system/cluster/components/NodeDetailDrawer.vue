<script lang="ts" setup>
import type { EdgeNode } from '../mockData'
import { computed } from 'vue'
import {
  Alert as AAlert,
  Button as AButton,
  Descriptions as ADescriptions,
  DescriptionsItem as ADescriptionsItem,
  Drawer as ADrawer,
  Progress as AProgress,
  Table as ATable,
  Tag as ATag,
  Tooltip as ATooltip,
} from 'ant-design-vue'

const props = defineProps<{
  node?: EdgeNode
}>()

const emit = defineEmits<{
  close: []
}>()

const open = computed({
  get: () => !!props.node,
  set: (value: boolean) => {
    if (!value)
      emit('close')
  },
})

function statusLabel(status: EdgeNode['status']) {
  if (status === 'online')
    return '在线'
  if (status === 'warning')
    return '异常'
  return '离线'
}

function statusColor(status: EdgeNode['status']) {
  if (status === 'online')
    return 'success'
  if (status === 'warning')
    return 'warning'
  return 'default'
}

function taskStatusLabel(status: EdgeNode['tasks'][number]['status']) {
  if (status === 'running')
    return '运行中'
  if (status === 'error')
    return '异常'
  return '已停止'
}

function serviceStatusColor(status: EdgeNode['services'][number]['status']) {
  if (status === 'healthy')
    return 'success'
  if (status === 'degraded')
    return 'warning'
  return 'error'
}

function progressColor(percent: number) {
  if (percent >= 85)
    return '#ef4444'
  if (percent >= 70)
    return '#f59e0b'
  return '#16a34a'
}

function dataModeLabel(mode: EdgeNode['dataMode']) {
  return mode === 'cloud-sync' ? '云端同步（假设）' : '板端本地库（假设）'
}
</script>

<template>
  <ADrawer
    v-model:open="open"
    :title="node ? `节点详情 · ${node.name}` : '节点详情'"
    width="720"
    destroy-on-close
  >
    <template v-if="node">
      <AAlert
        type="info"
        show-icon
        class="prototype-note"
        message="原型说明"
        description="任务、服务与资源数据均为 Mock，用于与老师确认集群管理范围。"
      />

      <ADescriptions bordered size="small" :column="2" class="info-block">
        <ADescriptionsItem label="节点名称">{{ node.name }}</ADescriptionsItem>
        <ADescriptionsItem label="状态">
          <ATag :color="statusColor(node.status)">{{ statusLabel(node.status) }}</ATag>
        </ADescriptionsItem>
        <ADescriptionsItem label="IP 地址">{{ node.ip }}</ADescriptionsItem>
        <ADescriptionsItem label="型号">{{ node.model }}</ADescriptionsItem>
        <ADescriptionsItem label="Edge 版本">{{ node.edgeVersion }}</ADescriptionsItem>
        <ADescriptionsItem label="部署位置">{{ node.location || '-' }}</ADescriptionsItem>
        <ADescriptionsItem label="数据模式">{{ dataModeLabel(node.dataMode) }}</ADescriptionsItem>
        <ADescriptionsItem label="最后心跳">{{ node.lastHeartbeat }}</ADescriptionsItem>
        <ADescriptionsItem label="控制台" :span="2">
          <ATooltip title="远程打开单板 WEB 待后端确认">
            <AButton type="link" disabled>
              http://{{ node.ip }}:{{ node.webPort }}
            </AButton>
          </ATooltip>
        </ADescriptionsItem>
      </ADescriptions>

      <section class="section">
        <h3>资源占用</h3>
        <div class="metric-list">
          <div class="metric-item">
            <span>CPU</span>
            <AProgress :percent="node.cpuPercent" :stroke-color="progressColor(node.cpuPercent)" />
          </div>
          <div class="metric-item">
            <span>内存</span>
            <AProgress :percent="node.memoryPercent" :stroke-color="progressColor(node.memoryPercent)" />
          </div>
          <div class="metric-item">
            <span>磁盘</span>
            <AProgress :percent="node.diskPercent" :stroke-color="progressColor(node.diskPercent)" />
          </div>
        </div>
      </section>

      <section class="section">
        <h3>服务状态</h3>
        <div class="service-grid">
          <div v-for="service in node.services" :key="service.name" class="service-card">
            <div class="service-name">{{ service.name }}</div>
            <ATag :color="serviceStatusColor(service.status)">
              {{ service.status === 'healthy' ? '正常' : service.status === 'degraded' ? '降级' : '不可用' }}
            </ATag>
            <div v-if="service.detail" class="service-detail">{{ service.detail }}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <h3>算法任务</h3>
        <ATable
          size="small"
          :pagination="false"
          row-key="id"
          :data-source="node.tasks"
          :columns="[
            { title: '任务名称', dataIndex: 'name', key: 'name' },
            { title: '类型', dataIndex: 'taskType', key: 'taskType', width: 100 },
            { title: '摄像头', dataIndex: 'cameraCount', key: 'cameraCount', width: 80 },
            { title: '状态', key: 'status', width: 90 },
          ]"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <ATag :color="record.status === 'running' ? 'success' : record.status === 'error' ? 'error' : 'default'">
                {{ taskStatusLabel(record.status) }}
              </ATag>
            </template>
          </template>
        </ATable>
      </section>

      <section class="section actions">
        <ATooltip title="远程运维能力待需求确认">
          <AButton disabled>重启节点</AButton>
        </ATooltip>
        <ATooltip title="远程运维能力待需求确认">
          <AButton disabled>升级 Edge 包</AButton>
        </ATooltip>
        <ATooltip title="远程运维能力待需求确认">
          <AButton disabled>拉取日志</AButton>
        </ATooltip>
      </section>
    </template>
  </ADrawer>
</template>

<style lang="less" scoped>
.prototype-note {
  margin-bottom: 16px;
}

.info-block {
  margin-bottom: 20px;
}

.section {
  margin-bottom: 24px;

  h3 {
    margin: 0 0 12px;
    color: #1f2937;
    font-size: 15px;
    font-weight: 700;
  }
}

.metric-list {
  display: grid;
  gap: 12px;
}

.metric-item {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  align-items: center;

  span {
    color: #6b7280;
    font-size: 13px;
  }
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.service-card {
  padding: 12px;
  border: 1px solid #eef1ef;
  border-radius: 10px;
  background: #fafcfb;
}

.service-name {
  margin-bottom: 8px;
  color: #111827;
  font-weight: 700;
}

.service-detail {
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
