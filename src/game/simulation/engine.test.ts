import { describe, expect, it } from 'vitest'
import { RECIPE_DEFINITIONS } from '../content/recipes'
import { GameEngine } from './engine'
import { createInitialProgressSave } from './save'
import { evaluateTimingAttempt } from './rules'
import type { RecipeId } from './types'

function createMemoryStorage() {
  const store = new Map<string, string>()

  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

function completeRecipe(engine: GameEngine, recipeId: RecipeId) {
  const recipe = RECIPE_DEFINITIONS[recipeId]
  engine.dispatch({ type: 'beginRecipe', recipeId })

  for (const step of recipe.steps) {
    engine.dispatch({ type: 'selectStation', stationId: step.stationId })

    if (step.kind === 'timing' && step.targetValue !== undefined && step.window !== undefined) {
      for (let attempts = 0; attempts < 80; attempts += 1) {
        const active = engine.getSnapshot().activeRecipe
        if (!active) {
          break
        }

        if (Math.abs(active.timingValue - step.targetValue) <= step.window * 0.55) {
          break
        }

        engine.tick(80)
      }
    }

    engine.dispatch({ type: 'advanceRecipeStep' })
  }
}

describe('game engine', () => {
  it('scores timing windows with a higher value near the target', () => {
    expect(evaluateTimingAttempt(0.7, 0.7, 0.16)).toBeCloseTo(1)
    expect(evaluateTimingAttempt(0.4, 0.7, 0.16)).toBeLessThan(
      evaluateTimingAttempt(0.66, 0.7, 0.16),
    )
  })

  it('builds a prepared item when all recipe steps are completed', () => {
    const engine = new GameEngine(createInitialProgressSave(), createMemoryStorage())
    engine.dispatch({ type: 'startDay', day: 1 })
    engine.dispatch({ type: 'resumeGame' })
    completeRecipe(engine, 'sunny_cookie')

    expect(engine.getSnapshot().preparedItems).toHaveLength(1)
    expect(engine.getSnapshot().activeRecipe).toBeNull()
  })

  it('keeps the game running after a wrong serve and reduces patience instead', () => {
    const engine = new GameEngine(createInitialProgressSave(), createMemoryStorage())
    engine.dispatch({ type: 'startDay', day: 1 })
    engine.dispatch({ type: 'resumeGame' })
    engine.tick(6000)
    const order = engine.getSnapshot().activeOrders[0]
    completeRecipe(engine, 'honey_matcha_latte')
    const preparedItem = engine.getSnapshot().preparedItems[0]
    const previousPatience = order.patienceMs

    engine.dispatch({
      type: 'serveOrder',
      orderId: order.id,
      preparedItemId: preparedItem.id,
    })

    const currentOrder = engine.getSnapshot().activeOrders.find((item) => item.id === order.id)
    expect(currentOrder).toBeTruthy()
    expect(currentOrder!.patienceMs).toBeLessThan(previousPatience)
    expect(engine.getSnapshot().playerRewards.sessionCoins).toBe(0)
  })

  it('tracks cat care as tutorial progress and raises the cat mood', () => {
    const engine = new GameEngine(createInitialProgressSave(), createMemoryStorage())
    engine.dispatch({ type: 'startDay', day: 1 })
    engine.dispatch({ type: 'resumeGame' })
    const before = engine.getSnapshot().catStates.find((cat) => cat.id === 'momo')!

    engine.dispatch({ type: 'interactWithCat', catId: 'momo' })

    const after = engine.getSnapshot().catStates.find((cat) => cat.id === 'momo')!
    expect(after.mood).toBeGreaterThan(before.mood)
    expect(engine.getSnapshot().tutorialFlags.firstCatCare).toBe(true)
  })

  it('finishes day one, unlocks day two, and persists the new recipe reward', () => {
    const storage = createMemoryStorage()
    const engine = new GameEngine(createInitialProgressSave(), storage)
    engine.dispatch({ type: 'startDay', day: 1 })
    engine.dispatch({ type: 'resumeGame' })
    engine.tick(200000)

    expect(engine.getSnapshot().phase).toBe('summary')
    expect(engine.getSnapshot().progress.highestDayUnlocked).toBe(2)
    expect(engine.getSnapshot().progress.unlockedRecipes).toContain('berry_cupcake')
    expect(engine.getSnapshot().progress.availableUpgrades).toContain('paper_lanterns')
    expect(storage.getItem('kawaii-cat-cafe-save')).toContain('berry_cupcake')
  })
})
