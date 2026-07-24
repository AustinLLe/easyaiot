<template>
  <div class="section-panel">
    <div class="section-header">
      <h3>基础信息</h3>
      <p>配置任务名称、任务类型等基础属性。</p>
    </div>
    <Form layout="vertical" class="section-form">
      <FormItem label="任务名称" required>
        <Input
          v-model:value="payload.task_name"
          placeholder="例如：安全帽检测任务"
          allow-clear
          class="field-control"
        />
      </FormItem>
      <FormItem label="任务类型" required>
        <Select
          v-model:value="payload.task_type"
          :options="taskTypeOptions"
          class="field-control"
        />
      </FormItem>
      <FormItem v-if="payload.task_type === 'snap'" label="抓拍间隔" required>
        <div class="snap-interval-row">
          <InputNumber
            v-model:value="payload.snap_interval_value"
            :min="1"
            :max="snapIntervalMax"
            placeholder="间隔"
            class="snap-interval-value"
          />
          <Select
            v-model:value="payload.snap_interval_unit"
            :options="snapUnitOptions"
            class="snap-interval-unit"
          />
        </div>
      </FormItem>
      <DefenseSchedulePicker v-model:modelValue="defenseConfig" />
    </Form>
  </div>
</template>

<script lang="ts" setup>
import { computed, watch } from 'vue';
import { Form, FormItem, Input, InputNumber, Select } from 'ant-design-vue';
import type { AlgorithmTaskDraft, SnapIntervalUnit } from '../../../algorithmTaskDraft.types';
import DefenseSchedulePicker from '../../TaskFormWidgets/DefenseSchedulePicker.vue';
import {
  DEFAULT_SNAP_INTERVAL_UNIT,
  ensureSnapIntervalDefaults,
} from '../useDraft';
import {
  createEmptyDefenseSchedule,
  ensureDefenseDefaults,
  type DefenseSchedulePickerValue,
} from '../../../utils/taskUtils';

defineOptions({ name: 'BasicInfoSection' });

const payload = defineModel<AlgorithmTaskDraft>('payload', { required: true });

ensureDefenseDefaults(payload.value);

const taskTypeOptions = [
  { label: '实时算法任务', value: 'realtime' },
  { label: '抓拍算法任务', value: 'snap' },
];

const snapUnitOptions: Array<{ label: string; value: SnapIntervalUnit }> = [
  { label: '秒', value: 'second' },
  { label: '分钟', value: 'minute' },
  { label: '小时', value: 'hour' },
];

const snapIntervalMax = computed(() => {
  const unit = payload.value.snap_interval_unit ?? DEFAULT_SNAP_INTERVAL_UNIT;
  if (unit === 'second' || unit === 'minute')
    return 59;
  return 23;
});

const defenseConfig = computed({
  get: (): DefenseSchedulePickerValue => ({
    is_full_day_defense: payload.value.is_full_day_defense !== false,
    mode: payload.value.defense_mode ?? 'full',
    schedule: payload.value.defense_schedule ?? createEmptyDefenseSchedule(),
    defense_week_start: payload.value.defense_week_start,
    defense_week_end: payload.value.defense_week_end,
    defense_week_schedules: payload.value.defense_week_schedules ?? [],
    defense_applied_to_all_week_key: payload.value.defense_applied_to_all_week_key ?? null,
  }),
  set: (value: DefenseSchedulePickerValue) => {
    payload.value.is_full_day_defense = value.is_full_day_defense;
    payload.value.defense_mode = value.mode;
    payload.value.defense_schedule = value.schedule;
    payload.value.defense_week_start = value.defense_week_start;
    payload.value.defense_week_end = value.defense_week_end;
    payload.value.defense_week_schedules = value.defense_week_schedules ?? [];
    payload.value.defense_applied_to_all_week_key = value.defense_applied_to_all_week_key ?? null;
  },
});

watch(
  () => payload.value.task_type,
  (type) => {
    if (type === 'snap')
      ensureSnapIntervalDefaults(payload.value);
  },
  { immediate: true },
);

watch(
  () => payload.value.snap_interval_unit,
  (unit) => {
    if (payload.value.task_type !== 'snap' || !unit)
      return;
    const max = unit === 'hour' ? 23 : 59;
    const value = payload.value.snap_interval_value;
    if (value != null && value > max)
      payload.value.snap_interval_value = max;
  },
);
</script>

<style lang="less" scoped>
.section-panel {
  max-width: 900px;
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

.field-control {
  width: 100%;
  max-width: 360px;
}

.snap-interval-row {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 360px;
}

.snap-interval-value {
  flex: 1;
  min-width: 0;
  width: 100%;
}

.snap-interval-unit {
  width: 96px;
  flex-shrink: 0;
}
</style>
