export type PtzMoveCommand = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'ZOOM_IN' | 'ZOOM_OUT'

export function createPtzCommandController(
  emitCommand: (command: PtzMoveCommand | 'STOP', speed: number) => void,
) {
  let activeCommand: PtzMoveCommand | null = null
  let activeSpeed = 0

  function stop() {
    if (!activeCommand)
      return false
    activeCommand = null
    emitCommand('STOP', activeSpeed)
    return true
  }

  function start(command: PtzMoveCommand, speed: number) {
    if (activeCommand === command)
      return
    stop()
    activeCommand = command
    activeSpeed = speed
    emitCommand(command, speed)
  }

  return {
    start,
    stop,
    isActive: () => activeCommand !== null,
  }
}
