import Phaser from 'phaser'
import type { SceneBridge } from '../adapters/sceneBridge'

export class BootScene extends Phaser.Scene {
  private bridge: SceneBridge

  constructor(bridge: SceneBridge) {
    super('boot')
    this.bridge = bridge
  }

  create() {
    this.registry.set('sceneBridge', this.bridge)
    this.scene.start('cafe')
  }
}
