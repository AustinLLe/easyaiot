import { describe, expect, it, vi } from 'vitest'
import { createPtzCommandController } from './ptzControl'

describe('ptz command controller', () => {
  it('emits at most one STOP for each active movement', () => {
    const emit = vi.fn()
    const controller = createPtzCommandController(emit)

    controller.start('LEFT', 30)
    expect(controller.stop()).toBe(true)
    expect(controller.stop()).toBe(false)

    expect(emit.mock.calls).toEqual([
      ['LEFT', 30],
      ['STOP', 30],
    ])
  })

  it('stops the previous movement before changing direction', () => {
    const emit = vi.fn()
    const controller = createPtzCommandController(emit)

    controller.start('UP', 12)
    controller.start('ZOOM_IN', 40)

    expect(emit.mock.calls).toEqual([
      ['UP', 12],
      ['STOP', 12],
      ['ZOOM_IN', 40],
    ])
  })
})
