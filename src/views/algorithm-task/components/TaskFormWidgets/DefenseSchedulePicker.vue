<script lang="ts" setup>
import { onUnmounted, ref, watch } from 'vue'
import { Alert, Button, Checkbox, Switch } from 'ant-design-vue'
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import type { DefenseSchedulePickerValue } from '../../utils/taskUtils'
import {
  cloneScheduleMatrix,
  createEmptyDefenseSchedule,
  createFullDefenseSchedule,
  isFullDefenseSchedule,
} from '../../utils/taskUtils'
import { useMessage } from '@/hooks/web/useMessage'

interface Props {
  modelValue?: DefenseSchedulePickerValue
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({
    is_full_day_defense: true,
    mode: 'full',
    schedule: createFullDefenseSchedule(),
  }),
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: DefenseSchedulePickerValue]
}>()

const { createMessage } = useMessage()

const weekDays = [
  { label: '周一', value: 0 },
  { label: '周二', value: 1 },
  { label: '周三', value: 2 },
  { label: '周四', value: 3 },
  { label: '周五', value: 4 },
  { label: '周六', value: 5 },
  { label: '周日', value: 6 },
]

const scaleMarks = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]

const fullDayDefense = ref(true)
const schedule = ref<number[][]>(createEmptyDefenseSchedule())
const isDirty = ref(false)
let warnedAboutLegacyMultiWeek = false

const isDragging = ref(false)
const dragDay = ref<number | null>(null)
const dragStartHour = ref<number | null>(null)
const dragTargetValue = ref<number>(1)

function isDayEnabled(day: number) {
  return schedule.value[day]?.some(hour => hour === 1) ?? false
}

function markDirty() {
  isDirty.value = true
}

function buildEmitValue(): DefenseSchedulePickerValue {
  const isFull = fullDayDefense.value
  const activeSchedule = isFull ? createFullDefenseSchedule() : cloneScheduleMatrix(schedule.value)

  return {
    is_full_day_defense: isFull,
    mode: isFull || isFullDefenseSchedule(activeSchedule) ? 'full' : 'half',
    schedule: activeSchedule,
    defense_week_schedules: [],
    defense_applied_to_all_week_key: null,
  }
}

function emitValue() {
  emit('update:modelValue', buildEmitValue())
}

function syncFromModelValue(value: DefenseSchedulePickerValue) {
  fullDayDefense.value = value.is_full_day_defense !== false
  const legacyWeeks = value.defense_week_schedules ?? []
  if (legacyWeeks.length > 1 && !warnedAboutLegacyMultiWeek) {
    warnedAboutLegacyMultiWeek = true
    createMessage.warning('检测到旧版多自然周布防草稿；后端仅支持单个每周循环模板，请重新确认并应用当前时段。')
  }
  schedule.value = fullDayDefense.value
    ? createFullDefenseSchedule()
    : cloneScheduleMatrix(value.schedule ?? legacyWeeks[0]?.schedule ?? createEmptyDefenseSchedule())
  isDirty.value = legacyWeeks.length > 1
}

function handleFullDayChange(checked: boolean) {
  fullDayDefense.value = checked
  isDirty.value = false
  if (checked)
    schedule.value = createFullDefenseSchedule()

  emitValue()
}

function saveSchedule() {
  if (!schedule.value.some(day => day.includes(1))) {
    createMessage.warning('请先配置至少一个布防时段')
    return
  }
  isDirty.value = false
  emitValue()
  createMessage.success('已应用每周循环布防时段')
}

function clearSchedule() {
  schedule.value = createEmptyDefenseSchedule()
  markDirty()
}

function toggleDayEnabled(day: number, enabled: boolean) {
  schedule.value[day] = enabled ? new Array(24).fill(1) : new Array(24).fill(0)
  markDirty()
}

function copyDayToAll(sourceDay: number) {
  const template = [...schedule.value[sourceDay]]
  if (!template.includes(1)) {
    createMessage.warning('请先为当前天设置布防时段')
    return
  }
  schedule.value = schedule.value.map(() => [...template])
  markDirty()
  createMessage.success(`已将${weekDays[sourceDay].label}的配置复制到当前周全部日期`)
}

function clearDay(day: number) {
  schedule.value[day] = new Array(24).fill(0)
  markDirty()
}

function handleSegmentMouseDown(e: MouseEvent, day: number, hour: number) {
  if (props.disabled || e.button !== 0)
    return
  e.preventDefault()
  isDragging.value = true
  dragDay.value = day
  dragStartHour.value = hour
  dragTargetValue.value = schedule.value[day][hour] === 1 ? 0 : 1
  schedule.value[day][hour] = dragTargetValue.value
  markDirty()
}

function handleSegmentMouseEnter(day: number, hour: number) {
  if (props.disabled || !isDragging.value || dragDay.value !== day || dragStartHour.value == null)
    return
  const start = Math.min(dragStartHour.value, hour)
  const end = Math.max(dragStartHour.value, hour)
  for (let h = start; h <= end; h++)
    schedule.value[day][h] = dragTargetValue.value
  markDirty()
}

function handleSegmentMouseUp(e: MouseEvent) {
  if (e.button !== 0)
    return
  isDragging.value = false
  dragDay.value = null
  dragStartHour.value = null
}

function handleGlobalMouseUp(e: MouseEvent) {
  handleSegmentMouseUp(e)
}

watch(
  () => props.modelValue,
  (value) => {
    if (!value)
      return
    const incomingIsFull = value.is_full_day_defense !== false
    const incomingSchedule = incomingIsFull
      ? createFullDefenseSchedule()
      : (value.schedule ?? value.defense_week_schedules?.[0]?.schedule ?? createEmptyDefenseSchedule())
    if (incomingIsFull === fullDayDefense.value
      && JSON.stringify(incomingSchedule) === JSON.stringify(schedule.value))
      return
    syncFromModelValue(value)
  },
  { deep: true, immediate: true },
)

if (typeof window !== 'undefined')
  window.addEventListener('mouseup', handleGlobalMouseUp)

onUnmounted(() => {
  if (typeof window !== 'undefined')
    window.removeEventListener('mouseup', handleGlobalMouseUp)
})
</script>

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
      <Alert
        type="info"
        show-icon
        message="该布防模板按周一至周日循环生效；后端当前不支持按自然周保存不同模板。"
        class="schedule-contract-tip"
      />
      <div class="toolbar toolbar-under-full-day">
        <Button type="primary" size="small" :disabled="disabled" @click="saveSchedule">
          应用布防时段
        </Button>
        <Button size="small" :disabled="disabled" @click="clearSchedule">
          清空
        </Button>
        <span v-if="isDirty" class="dirty-tip">修改尚未应用</span>
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

<style lang="less" scoped>
.defense-schedule-picker {
  width: 100%;
  max-width: 860px;
}

.full-day-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;

  .full-day-label {
    font-size: 14px;
    color: rgb(0 0 0 / 88%);
  }
}

.week-range-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;

  .field-label {
    flex-shrink: 0;
    font-size: 14px;
    color: rgb(0 0 0 / 88%);
  }

  .week-date-picker {
    flex-shrink: 0;
    width: 280px;
  }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar-under-full-day {
  margin-top: -8px;
  margin-bottom: 16px;
}

.saved-weeks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;

  .saved-label {
    font-size: 13px;
    color: rgb(0 0 0 / 65%);
  }

  .saved-week-tag {
    cursor: pointer;
  }
}

.day-schedule-list {
  overflow: hidden;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.day-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  .day-name {
    flex-shrink: 0;
    width: 40px;
    font-size: 13px;
    color: rgb(0 0 0 / 88%);
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
  overflow: hidden;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.timeline-segment {
  cursor: pointer;
  user-select: none;
  border-right: 1px solid #f0f0f0;
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
  padding: 0 1px;
  margin-top: 4px;

  span {
    font-size: 11px;
    line-height: 1;
    color: rgb(0 0 0 / 45%);
  }
}

.row-actions {
  display: flex;
  flex-shrink: 0;
  gap: 10px;

  .action-icon {
    font-size: 15px;
    color: #1677ff;
    cursor: pointer;

    &.disabled {
      color: rgb(0 0 0 / 25%);
      cursor: not-allowed;
    }

    &:hover:not(.disabled) {
      color: #0958d9;
    }
  }
}
</style>
