import { CAT_PROFILES } from '../content/cats'
import { UPGRADES } from '../content/upgrades'
import type {
  CatState,
  OrderTicket,
  PreparedItem,
  ProgressSave,
  RecipeDefinition,
  RecipeQuality,
} from './types'

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function evaluateTimingAttempt(
  timingValue: number,
  targetValue: number,
  window: number,
) {
  const distance = Math.abs(timingValue - targetValue)

  return clamp(1 - distance / window, 0.2, 1)
}

export function getRecipeQuality(scores: number[]): RecipeQuality {
  const average =
    scores.reduce((total, value) => total + value, 0) / Math.max(scores.length, 1)

  if (average >= 0.86) {
    return 'perfect'
  }

  if (average >= 0.64) {
    return 'good'
  }

  return 'messy'
}

export function getPatienceDecayMultiplier(
  catStates: CatState[],
  progress: ProgressSave,
) {
  let multiplier = 1
  const momo = catStates.find((cat) => cat.id === 'momo')

  if (momo && momo.mood >= 72) {
    multiplier *= 0.86
  }

  for (const upgradeId of progress.ownedUpgrades) {
    multiplier *= 1 - UPGRADES[upgradeId].patienceBonus
  }

  return clamp(multiplier, 0.6, 1)
}

export function getServeOutcome(
  recipe: RecipeDefinition,
  order: OrderTicket,
  item: PreparedItem,
  catStates: CatState[],
) {
  const patienceRatio = clamp(order.patienceMs / order.maxPatienceMs, 0, 1)
  const qualityMultiplier =
    item.quality === 'perfect' ? 1.2 : item.quality === 'good' ? 1 : 0.76
  const tofu = catStates.find((cat) => cat.id === 'tofu')
  const sumi = catStates.find((cat) => cat.id === 'sumi')
  const tipMultiplier = tofu && tofu.mood >= 72 ? 1.12 : 1
  const heartBonus = sumi && sumi.mood >= 72 ? 1 : 0
  const patienceTip = recipe.baseCoins * patienceRatio * 0.7
  const coins = Math.round((recipe.baseCoins + patienceTip) * qualityMultiplier * tipMultiplier)
  const hearts =
    recipe.baseHearts +
    (item.quality === 'perfect' ? 1 : 0) +
    (patienceRatio >= 0.75 ? 1 : 0) +
    heartBonus

  return {
    coins,
    hearts,
    rating:
      item.quality === 'perfect'
        ? 'A lovely cafe moment'
        : item.quality === 'good'
          ? 'A cozy, steady service'
          : 'A gentle save',
  }
}

export function getCatMoodLabel(mood: number) {
  if (mood >= 78) {
    return 'content'
  }

  if (mood >= 56) {
    return 'curious'
  }

  return 'needs care'
}

export function getCatDisplayName(catId: CatState['id']) {
  return CAT_PROFILES[catId].name
}
