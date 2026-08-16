<template>
  <div class="section-panel">
    <div class="section-header">
      <h3>基础信息</h3>
      <p>配置任务名称、任务类型等基础属性。</p>
    </div>
    <Form layout="vertical" class="section-form">
      <FormItem label="任务名称" required html-for="task-name">
        <Input
          id="task-name" aria-label="任务名称"
          v-model:value="payload.task_name"
          placeholder="例如：安全帽检测任务"
          :allow-clear="!readonly"
          :disabled="readonly"
          class="field-control"
        />
      </FormItem>
      <div class="task-mode-row">
        <FormItem label="任务类型" required class="task-mode-item" html-for="task-type">
          <Select
            id="task-type" aria-label="任务类型"
            v-model:value="payload.task_type"
            :options="taskTypeOptions"
            :disabled="readonly"
            class="field-control"
          />
        </FormItem>
        <FormItem label="分析模式" required class="task-mode-item" html-for="task-analysis-mode">
          <Select
            id="task-analysis-mode" aria-label="分析模式"
            v-model:value="payload.analysis_mode"
            :options="analysisModeOptions"
            :disabled="readonly || payload.task_type === 'snap' || payload.task_type === 'patrol'"
            class="field-control"
          />
        </FormItem>
      </div>
      <FormItem v-if="payload.task_type === 'realtime' && payload.analysis_mode !== 'dynamic'" label="抽帧间隔" required html-for="task-extract-interval">
        <InputNumber
          id="task-extract-interval" aria-label="抽帧间隔"
          v-model:value="payload.detection_config.extract_interval"
          :min="1"
          :max="1000"
          :step="1"
          :precision="0"
          :disabled="readonly"
          placeholder="例如：25"
          class="field-control"
        />
      </FormItem>
      <FormItem v-if="payload.task_type === 'snap'" label="抓拍间隔" required>
        <div class="snap-interval-row">
          <label for="task-snap-interval" class="sr-only">抓拍间隔</label>
          <InputNumber
            id="task-snap-interval" aria-label="抓拍间隔"
            v-model:value="payload.snap_interval_value"
            :min="1"
            :max="snapIntervalMax"
            :disabled="readonly"
            placeholder="间隔"
            class="snap-interval-value"
          />
          <label for="task-snap-unit" class="sr-only">间隔单位</label>
          <Select
            id="task-snap-unit" aria-label="间隔单位"
            v-model:value="payload.snap_interval_unit"
            :options="snapUnitOptions"
            :disabled="readonly"
            class="snap-interval-unit"
          />
        </div>
      </FormItem>
      <DefenseSchedulePicker v-model:modelValue="defenseConfig" :disabled="readonly" />
    </Form>
  </div>
</template>

<script lang="ts" setup>
import { computed, watch } from 'vue';
import { Form, FormItem, Input, InputNumber, Select } from 'ant-design-vue';
import type { AlgorithmTaskDraft, AnalysisMode, SnapIntervalUnit } from '../../../algorithmTaskDraft.types';
import DefenseSchedulePicker from '../../TaskFormWidgets/DefenseSchedulePicker.vue';
import {
  DEFAULT_SNAP_INTERVAL_UNIT,
  ensureSnapIntervalDefaults,
} from '../useDraft';
import { createDefaultPatrolConfig } from '../../../utils/patrolUtils';
import {
  createEmptyDefenseSchedule,
  ensureDefenseDefaults,
  type DefenseSchedulePickerValue,
} from '../../../utils/taskUtils';
import { useAlgorithmTaskReadonly } from '../useAlgorithmTaskReadonly';

defineOptions({ name: 'BasicInfoSection' });

const payload = defineModel<AlgorithmTaskDraft>('payload', { required: true });
const readonly = useAlgorithmTaskReadonly();

ensureDefenseDefaults(payload.value);

const taskTypeOptions = [
  { label: '实时算法任务', value: 'realtime' },
  { label: '抓拍算法任务', value: 'snap' },
  { label: '轮巡算法任务', value: 'patrol' },
];

const analysisModeOptions = computed<Array<{ label: string; value: AnalysisMode; disabled?: boolean }>>(() => [
  { label: '静态检测', value: 'static' },
  {
    label: '动态追踪',
    value: 'dynamic',
    disabled: payload.value.task_type === 'snap' || payload.value.task_type === 'patrol',
  },
]);

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
	    if (type === 'realtime' && !payload.value.detection_config.extract_interval)
	      payload.value.detection_config.extract_interval = 25;
	    if (type === 'realtime' && !payload.value.analysis_mode)
	      payload.value.analysis_mode = 'static';
	    if (type === 'snap') {
	      payload.value.analysis_mode = 'static';
	      payload.value.detection_config.enable_tracking = false;
	      ensureSnapIntervalDefaults(payload.value);
	    }
	    if (type === 'patrol') {
	      payload.value.analysis_mode = 'static';
	      payload.value.detection_config.enable_tracking = false;
	      if (!payload.value.patrol_config)
	        payload.value.patrol_config = createDefaultPatrolConfig();
	    }
	  },
	  { immediate: true },
	);

watch(
  () => payload.value.analysis_mode,
  (mode) => {
    if (payload.value.task_type === 'snap' && mode !== 'static') {
      payload.value.analysis_mode = 'static';
      return;
    }
    if (payload.value.task_type === 'patrol' && mode !== 'static') {
      payload.value.analysis_mode = 'static';
      return;
    }
    payload.value.detection_config.enable_tracking = payload.value.task_type === 'realtime' && mode === 'dynamic';
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
    margin: 0 0 6px;
    color: rgba(0, 0, 0, 0.9);
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  }

  p {
    margin: 0;
    color: rgba(0, 0, 0, 0.6);
    font-size: 14px;
    line-height: 1.5;
  }
}

.section-form {
  :deep(.ant-form-item-label > label) {
    color: rgba(0, 0, 0, 0.9);
    font-size: 15px;
    font-weight: 500;
  }
}

.field-control {
  width: 100%;
  max-width: 360px;
}

.task-mode-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 360px));
  gap: 16px;
  align-items: start;
}

.task-mode-item {
  margin-bottom: 24px;
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
