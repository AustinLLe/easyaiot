import { describe, expect, it } from 'vitest'
import type { AlgorithmTaskDraft } from '../algorithmTaskDraft.types'
import { DEFAULT_DYNAMIC_TRIGGER } from './dynamicAlertDefaults'
import {
  buildDefenseFieldsFromDraft,
  createEmptyDefenseSchedule,
  validateDefenseSchedule,
} from './taskUtils'

function weekSchedule(activeHour: number): number[][] {
  const schedule = createEmptyDefenseSchedule()
  schedule[0][activeHour] = 1
  return schedule
}

describe('algorithm task defaults and defense contract', () => {
  it('rejects legacy multi-week data instead of silently saving only the first week', () => {
    const draft = {
      is_full_day_defense: false,
      defense_schedule: weekSchedule(8),
      defense_week_schedules: [
        { week_start: '2026-08-10', week_end: '2026-08-16', schedule: weekSchedule(8) },
        { week_start: '2026-08-17', week_end: '2026-08-23', schedule: weekSchedule(9) },
      ],
    } as AlgorithmTaskDraft

    expect(validateDefenseSchedule(draft)).toContain('仅支持一个每周循环布防模板')
    expect(() => buildDefenseFieldsFromDraft(draft)).toThrow('不能保存多自然周配置')
  })

  it('keeps formal dynamic tracking defaults', () => {
    expect(DEFAULT_DYNAMIC_TRIGGER.matching_threshold).toBe(0.2)
    expect(DEFAULT_DYNAMIC_TRIGGER.predict_boxes).toBe(false)
  })
})
