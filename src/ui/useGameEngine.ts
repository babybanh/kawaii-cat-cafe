import { useEffect, useEffectEvent, useSyncExternalStore } from 'react'
import type { GameEngine } from '../game/simulation/engine'

const FIXED_TICK_MS = 80

export function useGameSnapshot(engine: GameEngine) {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
}

export function useGameLoop(engine: GameEngine) {
  const onFrame = useEffectEvent((deltaMs: number) => {
    engine.tick(deltaMs)
  })

  useEffect(() => {
    let frameId = 0
    let previous = 0
    let carry = 0

    const loop = (timestamp: number) => {
      if (!previous) {
        previous = timestamp
      }

      const delta = Math.min(240, timestamp - previous)
      previous = timestamp
      carry += delta

      while (carry >= FIXED_TICK_MS) {
        onFrame(FIXED_TICK_MS)
        carry -= FIXED_TICK_MS
      }

      frameId = window.requestAnimationFrame(loop)
    }

    frameId = window.requestAnimationFrame(loop)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [engine])
}
