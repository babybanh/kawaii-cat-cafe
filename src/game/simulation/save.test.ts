import { describe, expect, it } from 'vitest'
import { SAVE_VERSION } from './types'
import { createInitialProgressSave, loadProgressSave, normalizeProgressSave } from './save'

function createMemoryStorage(initialValue?: string) {
  let current = initialValue ?? null

  return {
    getItem() {
      return current
    },
    setItem(_key: string, value: string) {
      current = value
    },
  }
}

describe('save helpers', () => {
  it('falls back to a fresh save when storage is corrupted', () => {
    const storage = createMemoryStorage('{not-valid-json')
    expect(loadProgressSave(storage)).toEqual(createInitialProgressSave())
  })

  it('rejects saves from the wrong schema version', () => {
    const normalized = normalizeProgressSave({
      version: SAVE_VERSION + 1,
      totalCoins: 99,
    })

    expect(normalized).toEqual(createInitialProgressSave())
  })

  it('keeps valid saved progression data', () => {
    const normalized = normalizeProgressSave({
      version: SAVE_VERSION,
      totalCoins: 44,
      totalHearts: 12,
      highestDayUnlocked: 2,
      unlockedRecipes: ['sunny_cookie', 'berry_cupcake'],
      unlockedCats: ['momo', 'tofu', 'sumi'],
      availableUpgrades: ['paper_lanterns'],
      ownedUpgrades: [],
      bestDayScore: 140,
      tutorialFlags: {
        dayOneComplete: true,
      },
    })

    expect(normalized.totalCoins).toBe(44)
    expect(normalized.highestDayUnlocked).toBe(2)
    expect(normalized.tutorialFlags.dayOneComplete).toBe(true)
  })
})
