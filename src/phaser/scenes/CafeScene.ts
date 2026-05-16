import Phaser from 'phaser'
import { CAT_PROFILES } from '../../game/content/cats'
import { RECIPE_DEFINITIONS } from '../../game/content/recipes'
import { getCatMoodLabel } from '../../game/simulation/rules'
import type { GameState, StationId } from '../../game/simulation/types'
import type { SceneBridge } from '../adapters/sceneBridge'

type StationVisual = {
  id: StationId
  body: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
}

type TableVisual = {
  body: Phaser.GameObjects.Rectangle
  name: Phaser.GameObjects.Text
  order: Phaser.GameObjects.Text
  patienceBg: Phaser.GameObjects.Rectangle
  patienceFill: Phaser.GameObjects.Rectangle
}

type CatVisual = {
  id: keyof typeof CAT_PROFILES
  body: Phaser.GameObjects.Ellipse
  ring: Phaser.GameObjects.Ellipse
  label: Phaser.GameObjects.Text
}

export class CafeScene extends Phaser.Scene {
  private bridge!: SceneBridge
  private state!: GameState
  private unsubscribe?: () => void
  private stations = new Map<StationId, StationVisual>()
  private tables: TableVisual[] = []
  private cats = new Map<keyof typeof CAT_PROFILES, CatVisual>()
  private trayLabels: Phaser.GameObjects.Text[] = []
  private phaseLabel!: Phaser.GameObjects.Text
  private hintLabel!: Phaser.GameObjects.Text
  private injectedBridge: SceneBridge

  constructor(injectedBridge: SceneBridge) {
    super('cafe')
    this.injectedBridge = injectedBridge
  }

  create() {
    this.bridge =
      (this.registry.get('sceneBridge') as SceneBridge | undefined) ?? this.injectedBridge
    this.state = this.bridge.getSnapshot()
    this.buildRoom()
    this.renderState(this.state)
    this.unsubscribe = this.bridge.subscribe((state) => {
      this.state = state
      this.renderState(state)
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.()
    })
  }

  private buildRoom() {
    this.cameras.main.setBackgroundColor('#efe2cd')
    this.add.rectangle(600, 360, 1200, 720, 0xf7ecde)
    this.add.rectangle(300, 360, 500, 620, 0xe6c9a9, 0.88).setStrokeStyle(4, 0xc59969)
    this.add.rectangle(910, 360, 500, 620, 0xf5efe4, 0.92).setStrokeStyle(4, 0xd7baa0)
    this.add.rectangle(614, 360, 48, 620, 0xd0aa7c, 0.9)

    this.add
      .text(110, 80, "Yuto's Kitchen", {
        fontFamily: 'Nunito',
        fontSize: '34px',
        color: '#603a24',
        fontStyle: '700',
      })
      .setResolution(2)
    this.add
      .text(742, 80, "Akari's Lounge", {
        fontFamily: 'Nunito',
        fontSize: '34px',
        color: '#603a24',
        fontStyle: '700',
      })
      .setResolution(2)

    this.phaseLabel = this.add
      .text(600, 46, '', {
        fontFamily: 'Nunito',
        fontSize: '22px',
        color: '#6f4c3d',
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setResolution(2)

    this.hintLabel = this.add
      .text(600, 680, '', {
        fontFamily: 'Nunito',
        fontSize: '18px',
        color: '#5d5048',
        wordWrap: { width: 940 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setResolution(2)

    this.createStation('pantry', 210, 210, 190, 100, 0xf7d9b8)
    this.createStation('oven', 210, 364, 190, 100, 0xf0b47d)
    this.createStation('decor', 210, 520, 190, 100, 0xf7d3d9)
    this.createStation('tea', 430, 520, 190, 100, 0xc7d8b2)
    this.createStation('service', 430, 210, 190, 100, 0xefd9ba)
    this.createStation('cat-lounge', 910, 560, 290, 120, 0xf7e8d2)

    const tablePoints = [
      [854, 204],
      [1010, 372],
      [836, 532],
    ] as const

    for (const [x, y] of tablePoints) {
      const table = this.add
        .rectangle(x, y, 150, 92, 0xfdf6ea, 1)
        .setStrokeStyle(4, 0xd9c0a2)
      const name = this.add
        .text(x, y - 58, 'Open table', {
          fontFamily: 'Nunito',
          fontSize: '18px',
          color: '#6f4c3d',
          fontStyle: '700',
        })
        .setOrigin(0.5)
        .setResolution(2)
      const order = this.add
        .text(x, y, '', {
          fontFamily: 'Nunito',
          fontSize: '18px',
          color: '#5b4236',
          align: 'center',
        })
        .setOrigin(0.5)
        .setResolution(2)
      const patienceBg = this.add.rectangle(x, y + 56, 120, 10, 0xe4d7ca, 1)
      const patienceFill = this.add.rectangle(x - 60, y + 56, 120, 10, 0x7ea86b, 1)
      patienceFill.setOrigin(0, 0.5)
      this.tables.push({
        body: table,
        name,
        order,
        patienceBg,
        patienceFill,
      })
    }

    this.createCat('momo', 792, 238)
    this.createCat('tofu', 1020, 548)
    this.createCat('sumi', 1022, 188)

    this.add
      .text(468, 598, 'Ready tray', {
        fontFamily: 'Nunito',
        fontSize: '20px',
        color: '#6f4c3d',
        fontStyle: '700',
      })
      .setResolution(2)
    for (let index = 0; index < 3; index += 1) {
      this.add
        .ellipse(490 + index * 76, 642, 62, 42, 0xfffbf6)
        .setStrokeStyle(4, 0xd7baa0)
      const trayLabel = this.add
        .text(490 + index * 76, 642, 'Empty', {
          fontFamily: 'Nunito',
          fontSize: '14px',
          color: '#776357',
          align: 'center',
        })
        .setOrigin(0.5)
        .setResolution(2)
      this.trayLabels.push(trayLabel)
    }
  }

  private createStation(
    id: StationId,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
  ) {
    const body = this.add
      .rectangle(x, y, width, height, fillColor)
      .setStrokeStyle(4, 0xb37b56)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.bridge.dispatch({ type: 'selectStation', stationId: id })
      })
    const label = this.add
      .text(x, y, this.state.stationStates[id].label, {
        fontFamily: 'Nunito',
        fontSize: '22px',
        color: '#603a24',
        fontStyle: '800',
        align: 'center',
      })
      .setOrigin(0.5)
      .setResolution(2)
    this.stations.set(id, { id, body, label })
  }

  private createCat(id: keyof typeof CAT_PROFILES, x: number, y: number) {
    const ring = this.add.ellipse(x, y, 88, 66, 0xfff4d9, 0).setStrokeStyle(6, 0xe9bf74)
    const body = this.add
      .ellipse(x, y, 62, 44, parseInt(CAT_PROFILES[id].accent.slice(1), 16))
      .setStrokeStyle(4, 0x6f5242)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.bridge.dispatch({ type: 'interactWithCat', catId: id })
      })
    const label = this.add
      .text(x, y + 44, '', {
        fontFamily: 'Nunito',
        fontSize: '16px',
        color: '#5b4236',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setResolution(2)
    this.cats.set(id, { id, body, ring, label })
  }

  private renderState(state: GameState) {
    this.phaseLabel.setText(
      state.phase === 'summary'
        ? state.summary?.title ?? 'Cafe Summary'
        : state.phase === 'title'
          ? 'Kawaii Cat Cafe'
          : `${state.dayDefinition?.title ?? 'Cafe Day'} • ${state.dayDefinition?.subtitle ?? ''}`,
    )
    this.hintLabel.setText(state.hint)

    for (const [id, station] of this.stations.entries()) {
      const isSelected = state.selectedStation === id
      const isRecipeTarget = getRecipeTargetStation(state) === id
      station.body.setScale(isSelected ? 1.03 : 1)
      station.body.setStrokeStyle(4, isRecipeTarget ? 0x7a9e6f : isSelected ? 0xd97f88 : 0xb37b56)
    }

    for (const [index, table] of this.tables.entries()) {
      const order = state.activeOrders.find((entry) => entry.seatIndex === index)
      if (!order) {
        table.name.setText('Open table')
        table.order.setText('Fresh flowers\nand soft music')
        table.patienceFill.width = 0
        table.patienceBg.setVisible(false)
        table.patienceFill.setVisible(false)
        continue
      }

      const recipe = RECIPE_DEFINITIONS[order.recipeId]
      table.name.setText(order.customerName)
      table.order.setText(recipe.name)
      table.patienceBg.setVisible(true)
      table.patienceFill.setVisible(true)
      table.patienceFill.width = 120 * (order.patienceMs / order.maxPatienceMs)
      table.patienceFill.setFillStyle(order.patienceMs / order.maxPatienceMs > 0.45 ? 0x7ea86b : 0xe28768)
    }

    for (const catState of state.catStates) {
      const visual = this.cats.get(catState.id)
      if (!visual) {
        continue
      }

      visual.ring.setVisible(catState.needsAttention || state.focusedCatId === catState.id)
      visual.ring.setStrokeStyle(
        6,
        catState.needsAttention ? 0xe6a35d : state.focusedCatId === catState.id ? 0xc07d93 : 0xe9bf74,
      )
      visual.label.setText(
        `${CAT_PROFILES[catState.id].name}\n${getCatMoodLabel(catState.mood)}`,
      )
    }

    for (let index = 0; index < this.trayLabels.length; index += 1) {
      const item = state.preparedItems[index]
      if (!item) {
        this.trayLabels[index].setText('Empty')
        continue
      }

      const recipe = RECIPE_DEFINITIONS[item.recipeId]
      this.trayLabels[index].setText(
        `${recipe.shortLabel}\n${item.quality === 'perfect' ? 'Lovely' : item.quality === 'good' ? 'Warm' : 'Rustic'}`,
      )
    }
  }
}

function getRecipeTargetStation(state: GameState) {
  if (!state.activeRecipe) {
    return null
  }

  return RECIPE_DEFINITIONS[state.activeRecipe.recipeId].steps[state.activeRecipe.stepIndex]
    ?.stationId ?? null
}
