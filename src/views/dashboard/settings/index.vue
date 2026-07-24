<template>
  <div class="dashboard-config-page">
    <div class="page-header">
      <div>
        <h2>首页大屏配置</h2>
        <p>控制首页大屏右侧告警、底部录像和刷新参数�?/p>
      </div>
      <div class="actions">
        <button class="secondary-btn" @click="handleReset">恢复默认</button>
        <button class="primary-btn" @click="handleSave">保存配置</button>
      </div>
    </div>

    <div class="config-panel">
      <div class="config-row">
        <div>
          <div class="label">右侧告警事件栏目</div>
          <div class="hint">关闭后首页大屏右侧告警列表不显示，中间视频区域自动变宽�?/div>
        </div>
        <label class="switch">
          <input v-model="form.showRightAlarmPanel" type="checkbox" />
          <span></span>
        </label>
      </div>

      <div class="config-row">
        <div>
          <div class="label">底部告警录像栏目</div>
          <div class="hint">关闭后首页大屏底部录像列表不显示，视频区域占满中间区域�?/div>
        </div>
        <label class="switch">
          <input v-model="form.showBottomRecords" type="checkbox" />
          <span></span>
        </label>
      </div>

      <div class="config-grid">
        <label class="field">
          <span>右侧告警显示条数</span>
          <input v-model.number="form.rightAlarmPageSize" min="1" max="50" type="number" />
        </label>
        <label class="field">
          <span>底部录像显示条数</span>
          <input v-model.number="form.bottomRecordPageSize" min="1" max="100" type="number" />
        </label>
        <label class="field">
          <span>刷新间隔（秒�?/span>
          <input v-model.number="form.refreshIntervalSeconds" min="3" max="300" type="number" />
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import { useMessage } from '@/hooks/web/useMessage'
import {
  getMonitorDashboardConfig,
  resetMonitorDashboardConfig,
  saveMonitorDashboardConfig,
} from '@/views/dashboard/monitor/config'

defineOptions({
  name: 'DashboardConfigPage',
})

const { createMessage } = useMessage()
const form = reactive(getMonitorDashboardConfig())

const assignForm = (config: typeof form) => {
  Object.assign(form, config)
}

const handleSave = () => {
  assignForm(saveMonitorDashboardConfig(form))
  createMessage.success('配置已保存，刷新或重新进入首页大屏后生效')
}

const handleReset = () => {
  assignForm(resetMonitorDashboardConfig())
  createMessage.success('已恢复默认配�?)
}
</script>

<style lang="less" scoped>
.dashboard-config-page {
  padding: 24px;
  min-height: 100%;
  background: #f5f7fb;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    color: #1f2937;
  }

  p {
    margin: 8px 0 0;
    color: #64748b;
  }
}

.actions {
  display: flex;
  gap: 10px;
}

.primary-btn,
.secondary-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  background: #fff;
}

.primary-btn {
  color: #fff;
  background: #1677ff;
  border-color: #1677ff;
}

.config-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 0;
  border-bottom: 1px solid #eef2f7;
}

.label {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.hint {
  margin-top: 6px;
  color: #64748b;
}

.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
  flex-shrink: 0;

  input {
    display: none;
  }

  span {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: #cbd5e1;
    cursor: pointer;
    transition: .2s;
  }

  span::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    left: 2px;
    top: 2px;
    border-radius: 50%;
    background: #fff;
    transition: .2s;
    box-shadow: 0 1px 4px rgba(15, 23, 42, .25);
  }

  input:checked + span {
    background: #1677ff;
  }

  input:checked + span::before {
    transform: translateX(22px);
  }
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 16px;
  padding-top: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #334155;
  font-weight: 500;

  input {
    height: 34px;
    padding: 0 10px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    outline: none;
  }
}
</style>
