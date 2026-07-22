<template>
  <div class="defense-schedule-picker">
    <div class="full-day-row">
      <span class="full-day-label">是否全天布防</span>
      <Switch
        v-model:checked="fullDayDefense"
        checked-children="是"
        un-checked-children="否"
        :disabled="disabled"
        @change="handleFullDayChange"
      />
    </div>

    <template v-if="!fullDayDefense">
      <div class="toolbar toolbar-under-full-day">
        <Button type="primary" size="small" :disabled="disabled" @click="saveCurrentWeek">
          保存
        </Button>
        <Button size="small" :disabled="disabled" @click="clearCurrentWeek">
          清空
        </Button>
        <Button
          size="small"
          :disabled="disabled || !canApplyToAllWeeks"
          @click="applyToAllWeeks"
        >
          应用到全部周
        </Button>
      </div>

      <div class="week-range-row">
        <span class="field-label">选择周</span>
        <DatePicker
          :value="weekPickerDate"
          :format="formatWeekRangeDisplay"
          placeholder="选择周内任意一天"
          :disabled="disabled"
          :show-today="false"
          class="week-date-picker"
          @change="handleWeekDateChange"
        />
        <Tag v-if="isCurrentWeekSaved" color="success">已保存</Tag>
        <Tag v-else-if="isDirty" color="warning">未保存</Tag>
      </div>

      <div v-if="savedWeekList.length" class="saved-weeks">
        <span class="saved-label">已配置周：</span>
        <Tag
          v-for="item in savedWeekList"
          :key="item.key"
          :color="item.key === currentWeekKey ? 'processing' : 'default'"
          class="saved-week-tag"
          :closable="!disabled"
          @click="switchToSavedWeek(item.key)"
          @close.prevent="removeSavedWeek(item.key)"
        >
          {{ item.label }}<template v-if="item.key === appliedToAllWeeksKey">（已应用到全部周）</template>
        </Tag>
      </div>

      <div class="day-schedule-list">
        <div
          v-for="day in weekDays"
          :key="day.value"
          class="day-row"
        >
          <Checkbox
            :checked="isDayEnabled(day.value)"
            :disabled="disabled"
            @change="(e) => toggleDayEnabled(day.value, e.target.checked)"
          />
          <span class="day-name">{{ day.label }}</span>
          <div class="timeline-wrap">
            <div class="timeline-track">
              <div
                v-for="hour in 24"
                :key="`${day.value}-${hour - 1}`"
                class="timeline-segment"
                :class="{ active: schedule[day.value][hour - 1] === 1 }"
                @mousedown="(e) => handleSegmentMouseDown(e, day.value, hour - 1)"
                @mouseenter="handleSegmentMouseEnter(day.value, hour - 1)"
                @mouseup="handleSegmentMouseUp"
              />
            </div>
            <div class="timeline-scale">
              <span v-for="mark in scaleMarks" :key="mark">{{ mark }}</span>
            </div>
          </div>
          <div class="row-actions">
            <CopyOutlined
              class="action-icon"
              :class="{ disabled }"
              title="复制到其他天"
              @click="!disabled && copyDayToAll(day.value)"
            />
            <DeleteOutlined
              class="action-icon"
              :class="{ disabled }"
              title="清空该天"
              @click="!disabled && clearDay(day.value)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch, onUnmounted } from 'vue';
import { Button, Checkbox, DatePicker, Modal, Switch, Tag } from 'ant-design-vue';
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import dayjs, { type Dayjs } from 'dayjs';
import { useMessage } from '@/hooks/web/useMessage';
import type { DefenseSchedulePickerValue } from '../../utils/taskUtils';
import {
  cloneScheduleMatrix,
  createEmptyDefenseSchedule,
  createFullDefenseSchedule,
  getCurrentWeekRange,
  getWeekRangeFromDate,
  getWeekRangeKey,
  isFullDefenseSchedule,
  mapToWeekSchedules,
  parseWeekRangeKey,
  weekSchedulesToMap,
} from '../../utils/taskUtils';

interface Props {
  modelValue?: DefenseSchedulePickerValue;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({
    is_full_day_defense: true,
    mode: 'full',
    schedule: createFullDefenseSchedule(),
  }),
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: DefenseSchedulePickerValue];
}>();

const { createMessage } = useMessage();

const weekDays = [
  { label: '周一', value: 0 },
  { label: '周二', value: 1 },
  { label: '周三', value: 2 },
  { label: '周四', value: 3 },
  { label: '周五', value: 4 },
  { label: '周六', value: 5 },
  { label: '周日', value: 6 },
];

const scaleMarks = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

const fullDayDefense = ref(true);
const schedule = ref<number[][]>(createEmptyDefenseSchedule());
const [defaultWeekStart, defaultWeekEnd] = getCurrentWeekRange();
const weekRange = ref<[Dayjs, Dayjs]>([defaultWeekStart, defaultWeekEnd]);
const weekSchedulesMap = ref<Record<string, number[][]>>({});
const appliedToAllWeeksKey = ref<string | null>(null);
const isDirty = ref(false);
const isSwitchingWeek = ref(false);

const isDragging = ref(false);
const dragDay = ref<number | null>(null);
const dragStartHour = ref<number | null>(null);
const dragTargetValue = ref<number>(1);

const currentWeekKey = computed(() => {
  const [start, end] = weekRange.value;
  return getWeekRangeKey(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
});

const isCurrentWeekSaved = computed(() => !!weekSchedulesMap.value[currentWeekKey.value]);

const weekRangeDisplay = computed(() => {
  const [start, end] = weekRange.value;
  return `${start.format('YYYY-MM-DD')} ~ ${end.format('YYYY-MM-DD')}`;
});

const weekPickerDate = computed(() => weekRange.value[0]);

function formatWeekRangeDisplay(value: Dayjs | string | null | undefined) {
  if (!value)
    return weekRangeDisplay.value;
  const [start, end] = getWeekRangeFromDate(dayjs(value));
  return `${start.format('YYYY-MM-DD')} ~ ${end.format('YYYY-MM-DD')}`;
}

const savedWeekList = computed(() =>
  mapToWeekSchedules(weekSchedulesMap.value).map(entry => ({
    key: getWeekRangeKey(entry.week_start, entry.week_end),
    label: `${entry.week_start} ~ ${entry.week_end}`,
  })),
);

const canApplyToAllWeeks = computed(() => {
  if (!Object.keys(weekSchedulesMap.value).length)
    return false;
  const source = weekSchedulesMap.value[currentWeekKey.value] ?? schedule.value;
  return source.some(day => day.some(hour => hour === 1));
});

function isDayEnabled(day: number) {
  return schedule.value[day]?.some(hour => hour === 1) ?? false;
}

function markDirty() {
  isDirty.value = true;
  if (appliedToAllWeeksKey.value === currentWeekKey.value)
    appliedToAllWeeksKey.value = null;
}

function syncWeekRangeFromStrings(start?: string, end?: string) {
  if (start && end) {
    weekRange.value = [dayjs(start), dayjs(end)];
    return;
  }
  const [monday, sunday] = getCurrentWeekRange();
  weekRange.value = [monday, sunday];
}

function resolveAppliedTemplate(): number[][] | null {
  if (!appliedToAllWeeksKey.value)
    return null;
  const template = weekSchedulesMap.value[appliedToAllWeeksKey.value];
  return template ? cloneScheduleMatrix(template) : null;
}

function loadScheduleForCurrentWeek() {
  const saved = weekSchedulesMap.value[currentWeekKey.value];
  if (saved) {
    schedule.value = cloneScheduleMatrix(saved);
    isDirty.value = false;
    return;
  }
  const template = resolveAppliedTemplate();
  schedule.value = template ? cloneScheduleMatrix(template) : createEmptyDefenseSchedule();
  isDirty.value = false;
}

function buildEmitValue(): DefenseSchedulePickerValue {
  const [start, end] = weekRange.value;
  const weekSchedules = mapToWeekSchedules(weekSchedulesMap.value);
  const activeSchedule = cloneScheduleMatrix(schedule.value);
  const isFull = fullDayDefense.value;
  const primarySchedule = weekSchedules.length
    ? cloneScheduleMatrix(weekSchedules[0].schedule)
    : activeSchedule;

  return {
    is_full_day_defense: isFull,
    mode: isFull || isFullDefenseSchedule(primarySchedule) ? 'full' : 'half',
    schedule: isFull ? createFullDefenseSchedule() : primarySchedule,
    defense_week_start: start.format('YYYY-MM-DD'),
    defense_week_end: end.format('YYYY-MM-DD'),
    defense_week_schedules: isFull ? [] : weekSchedules,
    defense_applied_to_all_week_key: isFull ? null : appliedToAllWeeksKey.value,
  };
}

function emitValue() {
  emit('update:modelValue', buildEmitValue());
}

function syncFromModelValue(value: DefenseSchedulePickerValue) {
  fullDayDefense.value = value.is_full_day_defense !== false;
  weekSchedulesMap.value = weekSchedulesToMap(value.defense_week_schedules);
  appliedToAllWeeksKey.value = value.defense_applied_to_all_week_key ?? null;
  syncWeekRangeFromStrings(value.defense_week_start, value.defense_week_end);
  loadScheduleForCurrentWeek();
  if (fullDayDefense.value)
    schedule.value = createFullDefenseSchedule();
}

function handleFullDayChange(checked: boolean) {
  fullDayDefense.value = checked;
  isDirty.value = false;
  if (checked) {
    schedule.value = createFullDefenseSchedule();
    weekSchedulesMap.value = {};
    appliedToAllWeeksKey.value = null;
  }
  emitValue();
}

function switchWeekRange(start: Dayjs, end: Dayjs) {
  isSwitchingWeek.value = true;
  weekRange.value = [start, end];
  loadScheduleForCurrentWeek();
  isSwitchingWeek.value = false;
  emitValue();
}

function confirmDiscardDirty(onOk: () => void) {
  if (!isDirty.value) {
    onOk();
    return;
  }
  Modal.confirm({
    title: '当前周尚未保存',
    content: '切换后将丢失当前未保存的布防配置，是否继续？',
    okText: '继续切换',
    cancelText: '取消',
    onOk,
  });
}

function handleWeekDateChange(date: Dayjs | string | null) {
  if (!date) {
    const [start, end] = getCurrentWeekRange();
    switchWeekRange(start, end);
    return;
  }
  const picked = dayjs(date);
  const [start, end] = getWeekRangeFromDate(picked);
  confirmDiscardDirty(() => switchWeekRange(start, end));
}

function saveCurrentWeek() {
  if (!schedule.value.some(day => day.some(hour => hour === 1))) {
    createMessage.warning('请先配置至少一个布防时段');
    return;
  }
  weekSchedulesMap.value = {
    ...weekSchedulesMap.value,
    [currentWeekKey.value]: cloneScheduleMatrix(schedule.value),
  };
  isDirty.value = false;
  emitValue();
  const [start, end] = weekRange.value;
  createMessage.success(`已保存 ${start.format('YYYY-MM-DD')} ~ ${end.format('YYYY-MM-DD')} 的布防配置`);
}

function clearCurrentWeek() {
  schedule.value = createEmptyDefenseSchedule();
  markDirty();
}

function applyToAllWeeks() {
  const templateSource = weekSchedulesMap.value[currentWeekKey.value] ?? schedule.value;
  if (!templateSource.some(day => day.some(hour => hour === 1))) {
    createMessage.warning('请先配置并保存当前周的布防时段');
    return;
  }
  if (!Object.keys(weekSchedulesMap.value).length) {
    createMessage.warning('请先保存当前周配置');
    return;
  }

  const template = cloneScheduleMatrix(templateSource);
  const next: Record<string, number[][]> = {};
  for (const key of Object.keys(weekSchedulesMap.value))
    next[key] = cloneScheduleMatrix(template);

  weekSchedulesMap.value = next;
  schedule.value = cloneScheduleMatrix(template);
  appliedToAllWeeksKey.value = currentWeekKey.value;
  isDirty.value = false;
  emitValue();
  createMessage.success('已将当前周配置应用到全部已配置周，切换其他周时将自动沿用该布防时间');
}

function switchToSavedWeek(key: string) {
  confirmDiscardDirty(() => {
    const [start, end] = parseWeekRangeKey(key);
    switchWeekRange(dayjs(start), dayjs(end));
  });
}

function removeSavedWeek(key: string) {
  const next = { ...weekSchedulesMap.value };
  delete next[key];
  weekSchedulesMap.value = next;
  if (appliedToAllWeeksKey.value === key)
    appliedToAllWeeksKey.value = null;
  if (key === currentWeekKey.value)
    loadScheduleForCurrentWeek();
  emitValue();
}

function toggleDayEnabled(day: number, enabled: boolean) {
  schedule.value[day] = enabled ? Array(24).fill(1) : Array(24).fill(0);
  markDirty();
}

function copyDayToAll(sourceDay: number) {
  const template = [...schedule.value[sourceDay]];
  if (!template.some(hour => hour === 1)) {
    createMessage.warning('请先为当前天设置布防时段');
    return;
  }
  schedule.value = schedule.value.map(() => [...template]);
  markDirty();
  createMessage.success(`已将${weekDays[sourceDay].label}的配置复制到当前周全部日期`);
}

function clearDay(day: number) {
  schedule.value[day] = Array(24).fill(0);
  markDirty();
}

function handleSegmentMouseDown(e: MouseEvent, day: number, hour: number) {
  if (props.disabled || e.button !== 0)
    return;
  e.preventDefault();
  isDragging.value = true;
  dragDay.value = day;
  dragStartHour.value = hour;
  dragTargetValue.value = schedule.value[day][hour] === 1 ? 0 : 1;
  schedule.value[day][hour] = dragTargetValue.value;
  markDirty();
}

function handleSegmentMouseEnter(day: number, hour: number) {
  if (props.disabled || !isDragging.value || dragDay.value !== day || dragStartHour.value == null)
    return;
  const start = Math.min(dragStartHour.value, hour);
  const end = Math.max(dragStartHour.value, hour);
  for (let h = start; h <= end; h++)
    schedule.value[day][h] = dragTargetValue.value;
  markDirty();
}

function handleSegmentMouseUp(e: MouseEvent) {
  if (e.button !== 0)
    return;
  isDragging.value = false;
  dragDay.value = null;
  dragStartHour.value = null;
}

function handleGlobalMouseUp(e: MouseEvent) {
  handleSegmentMouseUp(e);
}

watch(
  () => props.modelValue,
  (value) => {
    if (!value || isSwitchingWeek.value)
      return;
    const incoming = JSON.stringify(buildEmitValueFrom(value));
    const current = JSON.stringify(buildEmitValue());
    if (incoming === current)
      return;
    syncFromModelValue(value);
  },
  { deep: true, immediate: true },
);

function buildEmitValueFrom(value: DefenseSchedulePickerValue): DefenseSchedulePickerValue {
  const isFull = value.is_full_day_defense !== false;
  const weekSchedules = value.defense_week_schedules ?? [];
  const map = weekSchedulesToMap(weekSchedules);
  const [start, end] = value.defense_week_start && value.defense_week_end
    ? [dayjs(value.defense_week_start), dayjs(value.defense_week_end)]
    : getCurrentWeekRange();
  const primarySchedule = weekSchedules.length
    ? cloneScheduleMatrix(weekSchedules[0].schedule)
    : cloneScheduleMatrix(value.schedule ?? createEmptyDefenseSchedule());

  return {
    is_full_day_defense: isFull,
    mode: isFull || isFullDefenseSchedule(primarySchedule) ? 'full' : 'half',
    schedule: isFull ? createFullDefenseSchedule() : primarySchedule,
    defense_week_start: start.format('YYYY-MM-DD'),
    defense_week_end: end.format('YYYY-MM-DD'),
    defense_week_schedules: isFull ? [] : weekSchedules,
    defense_applied_to_all_week_key: isFull ? null : (value.defense_applied_to_all_week_key ?? null),
  };
}

if (typeof window !== 'undefined')
  window.addEventListener('mouseup', handleGlobalMouseUp);

onUnmounted(() => {
  if (typeof window !== 'undefined')
    window.removeEventListener('mouseup', handleGlobalMouseUp);
});
</script>

<style lang="less" scoped>
.defense-schedule-picker {
  width: 100%;
  max-width: 860px;
}

.full-day-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .full-day-label {
    font-size: 14px;
    color: rgba(0, 0, 0, 0.88);
  }
}

.week-range-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;

  .field-label {
    flex-shrink: 0;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.88);
  }

  .week-date-picker {
    width: 280px;
    flex-shrink: 0;
  }
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.toolbar-under-full-day {
  margin-top: -8px;
  margin-bottom: 16px;
}

.saved-weeks {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;

  .saved-label {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }

  .saved-week-tag {
    cursor: pointer;
  }
}

.day-schedule-list {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.day-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  .day-name {
    width: 40px;
    flex-shrink: 0;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.88);
  }
}

.timeline-wrap {
  flex: 1;
  min-width: 0;
}

.timeline-track {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  height: 28px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
  background: #fafafa;
}

.timeline-segment {
  cursor: pointer;
  border-right: 1px solid #f0f0f0;
  user-select: none;
  transition: background-color 0.15s;

  &:last-child {
    border-right: none;
  }

  &.active {
    background: #1677ff;
  }

  &:hover {
    background: #69b1ff;
  }

  &.active:hover {
    background: #0958d9;
  }
}

.timeline-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  padding: 0 1px;

  span {
    font-size: 11px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1;
  }
}

.row-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;

  .action-icon {
    font-size: 15px;
    color: #1677ff;
    cursor: pointer;

    &.disabled {
      color: rgba(0, 0, 0, 0.25);
      cursor: not-allowed;
    }

    &:hover:not(.disabled) {
      color: #0958d9;
    }
  }
}
</style>
