export const SAVE_VERSION = 1 as const

export type DayId = 1 | 2
export type GamePhase = 'title' | 'playing' | 'summary'
export type StationId =
  | 'pantry'
  | 'oven'
  | 'decor'
  | 'tea'
  | 'service'
  | 'cat-lounge'
export type RecipeId =
  | 'sunny_cookie'
  | 'berry_cupcake'
  | 'honey_matcha_latte'
export type CatId = 'momo' | 'tofu' | 'sumi'
export type UpgradeId = 'paper_lanterns'
export type RecipeStepKind = 'prep' | 'timing' | 'finish'
export type RecipeQuality = 'perfect' | 'good' | 'messy'

export interface RecipeStepDefinition {
  id: string
  kind: RecipeStepKind
  label: string
  detail: string
  stationId: StationId
  targetValue?: number
  window?: number
}

export interface RecipeDefinition {
  id: RecipeId
  name: string
  shortLabel: string
  description: string
  accent: string
  baseCoins: number
  baseHearts: number
  steps: RecipeStepDefinition[]
}

export interface DayDefinition {
  id: DayId
  title: string
  subtitle: string
  durationMs: number
  targetOrders: number
  maxQueue: number
  spawnIntervalMs: number
  availableRecipes: RecipeId[]
  scriptedOrders: RecipeId[]
  introLines: string[]
  outroLines: string[]
}

export interface CatProfile {
  id: CatId
  name: string
  accent: string
  portrait: string
  favoriteSpot: string
  careActionLabel: string
  bonusText: string
  bonusType: 'patience' | 'tips' | 'hearts'
  attentionResetMs: number
}

export interface CatState {
  id: CatId
  mood: number
  attentionMs: number
  needsAttention: boolean
  locationLabel: string
}

export interface UpgradeDefinition {
  id: UpgradeId
  name: string
  cost: number
  description: string
  patienceBonus: number
}

export interface OrderTicket {
  id: string
  customerName: string
  seatIndex: number
  recipeId: RecipeId
  patienceMs: number
  maxPatienceMs: number
  createdAtMs: number
}

export interface PreparedItem {
  id: string
  recipeId: RecipeId
  quality: RecipeQuality
  qualityScore: number
  recommendedOrderId: string | null
}

export interface ActiveRecipeSession {
  recipeId: RecipeId
  stepIndex: number
  qualityScores: number[]
  timingPhase: number
  timingValue: number
}

export interface DayStats {
  ordersServed: number
  missedOrders: number
  perfectServes: number
  catInteractions: number
}

export interface TutorialFlags {
  introSeen: boolean
  firstOrderSeen: boolean
  firstRecipeStarted: boolean
  firstServe: boolean
  firstCatCare: boolean
  dayOneComplete: boolean
}

export interface PlayerRewards {
  sessionCoins: number
  sessionHearts: number
}

export interface DaySummary {
  dayId: DayId
  title: string
  subtitle: string
  sessionCoins: number
  sessionHearts: number
  ordersServed: number
  missedOrders: number
  perfectServes: number
  catInteractions: number
  score: number
  newUnlocks: string[]
  outroLines: string[]
}

export interface ProgressSave {
  version: number
  totalCoins: number
  totalHearts: number
  highestDayUnlocked: DayId
  unlockedRecipes: RecipeId[]
  unlockedCats: CatId[]
  availableUpgrades: UpgradeId[]
  ownedUpgrades: UpgradeId[]
  bestDayScore: number
  tutorialFlags: {
    dayOneComplete: boolean
  }
}

export type GameAction =
  | { type: 'startDay'; day?: DayId }
  | { type: 'selectStation'; stationId: StationId }
  | { type: 'beginRecipe'; recipeId: RecipeId }
  | { type: 'advanceRecipeStep' }
  | { type: 'serveOrder'; orderId: string; preparedItemId: string }
  | { type: 'interactWithCat'; catId: CatId }
  | { type: 'purchaseUpgrade'; upgradeId: UpgradeId }
  | { type: 'pauseGame' }
  | { type: 'resumeGame' }

export interface StationState {
  id: StationId
  label: string
  description: string
}

export interface GameState {
  phase: GamePhase
  currentDay: DayId
  dayDefinition: DayDefinition | null
  paused: boolean
  timeRemainingMs: number
  dayElapsedMs: number
  nextOrderInMs: number
  totalSpawnedOrders: number
  selectedStation: StationId | null
  focusedCatId: CatId | null
  activeRecipe: ActiveRecipeSession | null
  preparedItems: PreparedItem[]
  activeOrders: OrderTicket[]
  catStates: CatState[]
  stationStates: Record<StationId, StationState>
  playerRewards: PlayerRewards
  tutorialFlags: TutorialFlags
  hint: string
  dialogueLines: string[]
  toast: string | null
  dayStats: DayStats
  progress: ProgressSave
  summary: DaySummary | null
}
