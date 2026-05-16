import type Phaser from 'phaser'
import { useEffect, useEffectEvent, useRef } from 'react'
import type { GameEngine } from '../game/simulation/engine'
import { createPhaserGame } from '../phaser/createPhaserGame'
import { createSceneBridge } from '../phaser/adapters/sceneBridge'

type PhaserCanvasProps = {
  engine: GameEngine
}

export function PhaserCanvas({ engine }: PhaserCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  const refreshLayout = useEffectEvent(() => {
    gameRef.current?.scale.refresh()
  })

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const game = createPhaserGame(containerRef.current, createSceneBridge(engine))
    gameRef.current = game
    refreshLayout()
    window.addEventListener('resize', refreshLayout)

    return () => {
      window.removeEventListener('resize', refreshLayout)
      game.destroy(true)
      gameRef.current = null
    }
  }, [engine])

  return <div ref={containerRef} className="playfield-canvas" />
}
