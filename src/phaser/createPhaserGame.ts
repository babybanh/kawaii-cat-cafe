import Phaser from 'phaser'
import type { SceneBridge } from './adapters/sceneBridge'
import { BootScene } from './scenes/BootScene'
import { CafeScene } from './scenes/CafeScene'

export function createPhaserGame(parent: HTMLElement, bridge: SceneBridge) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#efe2cd',
    scene: [new BootScene(bridge), new CafeScene(bridge)],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1200,
      height: 720,
    },
    render: {
      antialias: true,
      powerPreference: 'high-performance',
    },
  })
}
