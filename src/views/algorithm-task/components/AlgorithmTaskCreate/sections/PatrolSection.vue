<template>
  <div class="section-panel">
    <div class="section-header">
      <h3>轮巡配置</h3>
      <p>将已选摄像头分配到轮巡组，系统按组依次切换检测画面。</p>
    </div>

    <div class="patrol-stats">
      <div class="stat-card">
        <div class="stat-icon camera">
          <VideoCameraOutlined />
        </div>
        <div>
          <div class="stat-label">摄像头数量</div>
          <div class="stat-value">{{ stats.cameraCount }} 路</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon algorithm">
          <AppstoreOutlined />
        </div>
        <div>
          <div class="stat-label">算法数量</div>
          <div class="stat-value">{{ stats.algorithmCount }} 个</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon group">
          <ClusterOutlined />
        </div>
        <div>
          <div class="stat-label">轮巡组</div>
          <div class="stat-value">{{ stats.groupCount }} 组</div>
        </div>
      </div>
    </div>

    <div class="mode-block">
      <div class="block-title">轮巡分组模式</div>
      <div class="mode-options">
        <button
          type="button"
          :class="['mode-card', { active: patrolConfig.group_mode === 'auto' }]"
          @click="setGroupMode('auto')"
        >
          <span class="mode-radio" />
          <div>
            <div class="mode-name">自动分组</div>
            <div class="mode-desc">系统将按单组摄像头数量，自动完成轮巡分组及分组内的摄像头分配。</div>
          </div>
        </button>
        <button
          type="button"
          :class="['mode-card', { active: patrolConfig.group_mode === 'manual' }]"
          @click="setGroupMode('manual')"
        >
          <span class="mode-radio" />
          <div>
            <div class="mode-name">手动分组</div>
            <div class="mode-desc">自由分配轮巡组数量及组内摄像头数量。</div>
          </div>
        </button>
      </div>
    </div>

    <div v-if="patrolConfig.group_mode === 'auto'" class="settings-block">
      <div class="settings-title">设置</div>
      <Form layout="vertical" class="auto-form">
        <FormItem label="每组摄像头数量" required>
          <InputNumber
            v-model:value="patrolConfig.cameras_per_group"
            :min="1"
            :max="Math.max(stats.cameraCount, 1)"
            :precision="0"
            placeholder="请输入"
            class="auto-field"
            @change="handleAutoSettingsChange"
          />
        </FormItem>
        <FormItem label="每组分析时长" required>
          <div class="duration-row">
            <InputNumber
              v-model:value="patrolConfig.analysis_duration_sec"
              :min="1"
              :max="3600"
              :precision="0"
              placeholder="请输入"
              class="auto-field"
              @change="handleAutoSettingsChange"
            />
            <span class="duration-unit">秒</span>
          </div>
        </FormItem>
      </Form>
    </div>

    <div v-else class="settings-block">
      <div class="settings-toolbar">
        <div class="settings-title">设置</div>
        <div class="settings-actions">
          <a-button type="primary" @click="handleAddGroup">
            <template #icon>
              <PlusOutlined />
            </template>
            新增轮巡组
          </a-button>
        </div>
      </div>

      <div v-if="patrolConfig.groups.length" class="group-list">
        <div
          v-for="(group, index) in patrolConfig.groups"
          :key="group.group_id"
          class="group-card"
        >
          <div class="group-card-main">
            <div class="group-card-title">{{ group.group_name || '未命名轮巡组' }}</div>
            <div class="group-card-meta">
              <span>{{ group.device_ids.length }} 路摄像头</span>
              <span>{{ group.analysis_duration_sec ?? '-' }} 秒/组</span>
            </div>
            <div class="group-camera-tags">
              <a-tag v-for="deviceId in group.device_ids" :key="deviceId">
                {{ getCameraName(deviceId) }}
              </a-tag>
            </div>
          </div>
          <div class="group-card-actions">
            <a-button type="link" size="small" @click="handleEditGroup(group)">编辑</a-button>
            <a-button type="link" size="small" danger @click="handleRemoveGroup(index)">删除</a-button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <InboxOutlined class="empty-icon" />
        <span>请添加分组</span>
      </div>
    </div>

    <PatrolGroupEditModal
      v-model:open="groupModalOpen"
      v-model:group="editingGroup"
      :allowed-device-ids="allowedDeviceIds"
      :locked-device-ids="lockedDeviceIdsForEditor"
      @save="handleGroupSave"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import {
  AppstoreOutlined,
  ClusterOutlined,
  InboxOutlined,
  PlusOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';
import { Form, FormItem, InputNumber } from 'ant-design-vue';
import type { AlgorithmTaskDraft, PatrolGroupDraft } from '../../../algorithmTaskDraft.types';
import {
  buildAutoPatrolGroups,
  createEmptyPatrolGroupDraft,
  ensurePatrolDefaults,
  getAllocatedDeviceIds,
  getPatrolAlgorithmCount,
  syncAutoPatrolGroups,
} from '../../../utils/patrolUtils';
import PatrolGroupEditModal from './PatrolGroupEditModal.vue';

defineOptions({ name: 'PatrolSection' });

const payload = defineModel<AlgorithmTaskDraft>('payload', { required: true });

ensurePatrolDefaults(payload.value);

const groupModalOpen = ref(false);
const editingGroup = ref<PatrolGroupDraft | null>(null);
const editingGroupId = ref<string | null>(null);

const patrolConfig = computed(() => {
  ensurePatrolDefaults(payload.value);
  return payload.value.patrol_config!;
});

const stats = computed(() => ({
  cameraCount: payload.value.camera_bindings.length,
  algorithmCount: getPatrolAlgorithmCount(payload.value),
  groupCount: patrolConfig.value.groups.length,
}));

const allowedDeviceIds = computed(() =>
  payload.value.camera_bindings.map(binding => binding.device_id),
);

const cameraNameMap = computed(() =>
  Object.fromEntries(payload.value.camera_bindings.map(item => [item.device_id, item.device_name])),
);

const lockedDeviceIdsForEditor = computed(() => {
  const allocated = getAllocatedDeviceIds(patrolConfig.value.groups);
  if (!editingGroupId.value)
    return [...allocated];
  const current = patrolConfig.value.groups.find(group => group.group_id === editingGroupId.value);
  current?.device_ids.forEach(id => allocated.delete(id));
  return [...allocated];
});

function getCameraName(deviceId: string) {
  return cameraNameMap.value[deviceId] || deviceId;
}

function setGroupMode(mode: 'auto' | 'manual') {
  patrolConfig.value.group_mode = mode;
  groupModalOpen.value = false;
  editingGroup.value = null;
  editingGroupId.value = null;
  if (mode === 'auto')
    syncAutoPatrolGroups(payload.value);
}

function handleAutoSettingsChange() {
  if (patrolConfig.value.group_mode === 'auto')
    syncAutoPatrolGroups(payload.value);
}

function handleAddGroup() {
  editingGroupId.value = null;
  editingGroup.value = createEmptyPatrolGroupDraft();
  groupModalOpen.value = true;
}

function handleEditGroup(group: PatrolGroupDraft) {
  editingGroupId.value = group.group_id;
  editingGroup.value = {
    ...group,
    device_ids: [...group.device_ids],
  };
  groupModalOpen.value = true;
}

function handleGroupSave(group: PatrolGroupDraft) {
  const index = patrolConfig.value.groups.findIndex(item => item.group_id === group.group_id);
  if (index >= 0)
    patrolConfig.value.groups.splice(index, 1, group);
  else
    patrolConfig.value.groups.push(group);
  editingGroup.value = null;
  editingGroupId.value = null;
}

function handleRemoveGroup(index: number) {
  patrolConfig.value.groups.splice(index, 1);
}

watch(
  () => payload.value.camera_bindings.map(item => item.device_id).join(','),
  () => {
    if (patrolConfig.value.group_mode === 'auto') {
      patrolConfig.value.groups = buildAutoPatrolGroups(payload.value);
      return;
    }
    const validIds = new Set(payload.value.camera_bindings.map(item => item.device_id));
    patrolConfig.value.groups.forEach((group) => {
      group.device_ids = group.device_ids.filter(id => validIds.has(id));
    });
  },
);

watch(
  () => patrolConfig.value.group_mode,
  (mode) => {
    if (mode === 'auto')
      syncAutoPatrolGroups(payload.value);
  },
  { immediate: true },
);
</script>

<style lang="less" scoped>
.section-panel {
  max-width: 960px;
}

.section-header {
  margin-bottom: 20px;

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: rgba(0, 0, 0, 0.45);
  }
}

.patrol-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  background: #fafafa;
}

.stat-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 10px;
  font-size: 18px;

  &.camera,
  &.algorithm,
  &.group {
    color: #1677ff;
    background: #e6f4ff;
  }
}

.stat-label {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.stat-value {
  margin-top: 2px;
  font-size: 18px;
  font-weight: 600;
}

.mode-block,
.settings-block {
  margin-bottom: 20px;
}

.block-title,
.settings-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mode-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  text-align: left;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    border-color: #1677ff;
    background: #f0f7ff;
  }
}

.mode-radio {
  width: 14px;
  height: 14px;
  margin-top: 4px;
  border: 2px solid #d9d9d9;
  border-radius: 50%;
  flex-shrink: 0;

  .mode-card.active & {
    border-color: #1677ff;
    box-shadow: inset 0 0 0 3px #1677ff;
  }
}

.mode-name {
  font-size: 14px;
  font-weight: 600;
}

.mode-desc {
  margin-top: 6px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  line-height: 1.5;
}

.auto-form {
  max-width: 360px;
}

.auto-field {
  width: 100%;
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duration-unit {
  color: rgba(0, 0, 0, 0.65);
}

.settings-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.settings-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  background: #fff;
}

.group-card-title {
  font-size: 14px;
  font-weight: 600;
}

.group-card-meta {
  display: flex;
  gap: 16px;
  margin-top: 6px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.group-camera-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.group-card-actions {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 180px;
  color: rgba(0, 0, 0, 0.45);
  border: 1px dashed #d9d9d9;
  border-radius: 10px;
  background: #fafafa;
}

.empty-icon {
  font-size: 42px;
  color: rgba(0, 0, 0, 0.25);
}

@media (max-width: 900px) {
  .patrol-stats,
  .mode-options {
    grid-template-columns: 1fr;
  }

  .group-card {
    flex-direction: column;
  }
}
</style>
