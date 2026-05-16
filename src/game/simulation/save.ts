import { SAVE_VERSION } from './types'
import type {
  CatId,
  DayId,
  ProgressSave,
  RecipeId,
  UpgradeId,
} from './types'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const SAVE_KEY = 'kawaii-cat-cafe-save'

const defaultRecipes: RecipeId[] = ['sunny_cookie', 'honey_matcha_latte']
const defaultCats: CatId[] = ['momo', 'tofu', 'sumi']

export function createInitialProgressSave(): ProgressSave {
  return {
    version: SAVE_VERSION,
    totalCoins: 0,
    totalHearts: 0,
    highestDayUnlocked: 1,
    unlockedRecipes: defaultRecipes,
    unlockedCats: defaultCats,
    availableUpgrades: [],
    ownedUpgrades: [],
    bestDayScore: 0,
    tutorialFlags: {
      dayOneComplete: false,
    },
  }
}

function uniqueItems<T extends string>(values: unknown, fallback: T[]) {
  if (!Array.isArray(values)) {
    return fallback
  }

  const clean = values.filter((value): value is T => typeof value === 'string')

  return clean.length ? Array.from(new Set(clean)) : fallback
}

function safeDay(value: unknown): DayId {
  return value === 2 ? 2 : 1
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function normalizeProgressSave(raw: unknown): ProgressSave {
  const fallback = createInitialProgressSave()

  if (!raw || typeof raw !== 'object') {
    return fallback
  }

  const candidate = raw as Record<string, unknown>

  if (candidate.version !== SAVE_VERSION) {
    return fallback
  }

  return {
    version: SAVE_VERSION,
    totalCoins: safeNumber(candidate.totalCoins),
    totalHearts: safeNumber(candidate.totalHearts),
    highestDayUnlocked: safeDay(candidate.highestDayUnlocked),
    unlockedRecipes: uniqueItems(candidate.unlockedRecipes, defaultRecipes),
    unlockedCats: uniqueItems(candidate.unlockedCats, defaultCats),
    availableUpgrades: uniqueItems(
      candidate.availableUpgrades,
      fallback.availableUpgrades,
    ) as UpgradeId[],
    ownedUpgrades: uniqueItems(
      candidate.ownedUpgrades,
      fallback.ownedUpgrades,
    ) as UpgradeId[],
    bestDayScore: safeNumber(candidate.bestDayScore),
    tutorialFlags: {
      dayOneComplete:
        !!(
          candidate.tutorialFlags &&
          typeof candidate.tutorialFlags === 'object' &&
          (candidate.tutorialFlags as Record<string, unknown>).dayOneComplete
        ),
    },
  }
}

export function loadProgressSave(storage?: StorageLike | null) {
  if (!storage) {
    return createInitialProgressSave()
  }

  try {
    const raw = storage.getItem(SAVE_KEY)

    if (!raw) {
      return createInitialProgressSave()
    }

    return normalizeProgressSave(JSON.parse(raw))
  } catch {
    return createInitialProgressSave()
  }
}

export function persistProgressSave(
  storage: StorageLike | null | undefined,
  save: ProgressSave,
) {
  if (!storage) {
    return
  }

  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // Ignore storage write failures so the game still runs in private modes.
  }
}
