import type { GameEngine } from '../../game/simulation/engine'
import type { GameAction, GameState } from '../../game/simulation/types'

export interface SceneBridge {
  getSnapshot: () => GameState
  subscribe: (listener: (state: GameState) => void) => () => void
  dispatch: (action: GameAction) => void
}

export function createSceneBridge(engine: GameEngine): SceneBridge {
  return {
    getSnapshot: engine.getSnapshot,
    subscribe: engine.subscribe,
    dispatch: engine.dispatch,
  }
}
