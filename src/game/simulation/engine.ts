import { CAT_PROFILES, CAT_LIST } from '../content/cats'
import { DAY_DEFINITIONS } from '../content/days'
import { RECIPE_DEFINITIONS } from '../content/recipes'
import { UPGRADES } from '../content/upgrades'
import { clamp, evaluateTimingAttempt, getRecipeQuality, getServeOutcome } from './rules'
import { createInitialProgressSave, persistProgressSave } from './save'
import type { StorageLike } from './save'
import type {
  ActiveRecipeSession,
  CatState,
  DayId,
  DaySummary,
  GameAction,
  GameState,
  OrderTicket,
  PreparedItem,
  ProgressSave,
  RecipeDefinition,
  RecipeId,
  StationId,
  StationState,
  TutorialFlags,
} from './types'

const GUEST_NAMES = [
  'Mina',
  'Noah',
  'Rina',
  'Theo',
  'Sora',
  'Lila',
  'Avery',
  'Jun',
]

const STATION_STATES: Record<StationId, StationState> = {
  pantry: {
    id: 'pantry',
    label: 'Pantry',
    description: 'Pick ingredients, whisk dough, and start most baked recipes.',
  },
  oven: {
    id: 'oven',
    label: 'Oven',
    description: 'Catch the baking window before the sweets lose their softness.',
  },
  decor: {
    id: 'decor',
    label: 'Decorating Tray',
    description: 'Finish sweets with frosting and charming cat-cafe details.',
  },
  tea: {
    id: 'tea',
    label: 'Tea Bar',
    description: 'Whisk matcha, steam milk, and pour the warm drinks.',
  },
  service: {
    id: 'service',
    label: 'Service Counter',
    description: 'Plate dishes, finish drinks, and hand orders to waiting guests.',
  },
  'cat-lounge': {
    id: 'cat-lounge',
    label: 'Cat Lounge',
    description: 'Check on the cats, soothe their moods, and keep the room serene.',
  },
}

const BASE_TUTORIAL_FLAGS: TutorialFlags = {
  introSeen: false,
  firstOrderSeen: false,
  firstRecipeStarted: false,
  firstServe: false,
  firstCatCare: false,
  dayOneComplete: false,
}

const TIMING_STEP_MS = 720

function createCatStates() {
  return CAT_LIST.map<CatState>((cat, index) => ({
    id: cat.id,
    mood: 76 - index * 4,
    attentionMs: cat.attentionResetMs,
    needsAttention: false,
    locationLabel: cat.favoriteSpot,
  }))
}

function hydrateTutorialFlags(progress: ProgressSave): TutorialFlags {
  return {
    ...BASE_TUTORIAL_FLAGS,
    dayOneComplete: progress.tutorialFlags.dayOneComplete,
  }
}

function createBaseState(progress: ProgressSave): GameState {
  return {
    phase: 'title',
    currentDay: progress.highestDayUnlocked,
    dayDefinition: null,
    paused: false,
    timeRemainingMs: 0,
    dayElapsedMs: 0,
    nextOrderInMs: 0,
    totalSpawnedOrders: 0,
    selectedStation: 'service',
    focusedCatId: null,
    activeRecipe: null,
    preparedItems: [],
    activeOrders: [],
    catStates: createCatStates(),
    stationStates: STATION_STATES,
    playerRewards: {
      sessionCoins: 0,
      sessionHearts: 0,
    },
    tutorialFlags: hydrateTutorialFlags(progress),
    hint:
      'Open the cafe when you are ready. Yuto handles the kitchen, and Akari keeps the floor welcoming.',
    dialogueLines: [],
    toast: null,
    dayStats: {
      ordersServed: 0,
      missedOrders: 0,
      perfectServes: 0,
      catInteractions: 0,
    },
    progress,
    summary: null,
  }
}

function createDayState(progress: ProgressSave, dayId: DayId): GameState {
  const dayDefinition = DAY_DEFINITIONS[dayId]

  return withHint({
    ...createBaseState(progress),
    phase: 'playing',
    currentDay: dayId,
    dayDefinition,
    paused: true,
    timeRemainingMs: dayDefinition.durationMs,
    nextOrderInMs: 5000,
    selectedStation: 'service',
    dialogueLines: dayDefinition.introLines,
    tutorialFlags: hydrateTutorialFlags(progress),
  })
}

function getRecipe(recipeId: RecipeId) {
  return RECIPE_DEFINITIONS[recipeId]
}

function getCurrentStep(session: ActiveRecipeSession | null) {
  if (!session) {
    return null
  }

  return getRecipe(session.recipeId).steps[session.stepIndex] ?? null
}

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function pickRecommendedOrderId(activeOrders: OrderTicket[], recipeId: RecipeId) {
  return activeOrders.find((order) => order.recipeId === recipeId)?.id ?? null
}

function unlockDayRewards(state: GameState, progress: ProgressSave) {
  const newUnlocks: string[] = []
  let nextProgress = progress

  if (state.currentDay === 1) {
    if (!nextProgress.unlockedRecipes.includes('berry_cupcake')) {
      nextProgress = {
        ...nextProgress,
        unlockedRecipes: [...nextProgress.unlockedRecipes, 'berry_cupcake'],
      }
      newUnlocks.push('New recipe: Berry Blossom Cupcake')
    }

    if (nextProgress.highestDayUnlocked < 2) {
      nextProgress = {
        ...nextProgress,
        highestDayUnlocked: 2,
      }
      newUnlocks.push('New day: Twilight Tea Hour')
    }

    if (
      !nextProgress.availableUpgrades.includes('paper_lanterns') &&
      !nextProgress.ownedUpgrades.includes('paper_lanterns')
    ) {
      nextProgress = {
        ...nextProgress,
        availableUpgrades: [...nextProgress.availableUpgrades, 'paper_lanterns'],
      }
      newUnlocks.push(`Decor upgrade unlocked: ${UPGRADES.paper_lanterns.name}`)
    }

    if (!nextProgress.tutorialFlags.dayOneComplete) {
      nextProgress = {
        ...nextProgress,
        tutorialFlags: {
          dayOneComplete: true,
        },
      }
    }
  }

  return { nextProgress, newUnlocks }
}

function finalizeDay(state: GameState, storage?: StorageLike | null) {
  const unresolvedMisses = state.activeOrders.length
  const resolvedMisses = state.dayStats.missedOrders + unresolvedMisses
  const score =
    state.playerRewards.sessionCoins * 3 +
    state.playerRewards.sessionHearts * 7 +
    state.dayStats.perfectServes * 12
  let progress: ProgressSave = {
    ...state.progress,
    totalCoins: state.progress.totalCoins + state.playerRewards.sessionCoins,
    totalHearts: state.progress.totalHearts + state.playerRewards.sessionHearts,
    bestDayScore: Math.max(state.progress.bestDayScore, score),
  }
  const { nextProgress, newUnlocks } = unlockDayRewards(state, progress)
  progress = nextProgress
  persistProgressSave(storage, progress)

  const summary: DaySummary = {
    dayId: state.currentDay,
    title: `${DAY_DEFINITIONS[state.currentDay].title} Complete`,
    subtitle: DAY_DEFINITIONS[state.currentDay].subtitle,
    sessionCoins: state.playerRewards.sessionCoins,
    sessionHearts: state.playerRewards.sessionHearts,
    ordersServed: state.dayStats.ordersServed,
    missedOrders: resolvedMisses,
    perfectServes: state.dayStats.perfectServes,
    catInteractions: state.dayStats.catInteractions,
    score,
    newUnlocks,
    outroLines: DAY_DEFINITIONS[state.currentDay].outroLines,
  }

  return withHint({
    ...createBaseState(progress),
    phase: 'summary',
    currentDay: state.currentDay,
    dayDefinition: DAY_DEFINITIONS[state.currentDay],
    summary,
    progress,
  })
}

function withHint(state: GameState): GameState {
  const currentStep = getCurrentStep(state.activeRecipe)

  if (state.phase === 'summary') {
    return {
      ...state,
      hint:
        state.summary?.newUnlocks[0] ??
        'The cafe settles into a warm glow while the siblings count the day’s little wins.',
    }
  }

  if (state.phase === 'title') {
    return {
      ...state,
      hint:
        state.progress.highestDayUnlocked > 1
          ? 'Twilight Tea Hour is unlocked. Choose a day and settle back into the room.'
          : 'Your soft opening is ready. Start Day 1 when you want to open the curtains.',
    }
  }

  if (state.paused) {
    return {
      ...state,
      hint:
        state.dayElapsedMs === 0
          ? 'Read the siblings’ note, then open the cafe when you feel ready.'
          : 'Service is paused. Timers and patience will wait for you.',
    }
  }

  if (currentStep) {
    const stationLabel = STATION_STATES[currentStep.stationId].label

    return {
      ...state,
      hint: `${currentStep.label}. Move to ${stationLabel} and press the step button when it feels right.`,
    }
  }

  const needyCat = state.catStates.find((cat) => cat.needsAttention)

  if (needyCat) {
    return {
      ...state,
      hint: `${CAT_PROFILES[needyCat.id].name} is asking for care near the ${needyCat.locationLabel.toLowerCase()}.`,
    }
  }

  if (state.preparedItems.length) {
    return {
      ...state,
      hint: 'Akari can serve a finished dish from the order queue whenever you are ready.',
    }
  }

  if (state.activeOrders.length) {
    return {
      ...state,
      hint: `There ${state.activeOrders.length === 1 ? 'is' : 'are'} ${
        state.activeOrders.length
      } waiting ${state.activeOrders.length === 1 ? 'guest' : 'guests'}. Start a dish from the kitchen or soothe the cats for a bonus.`,
    }
  }

  return {
    ...state,
    hint: 'The cafe is calm for a breath. Use the quiet to prep the next order or visit the cats.',
  }
}

function spawnOrder(state: GameState): GameState {
  if (!state.dayDefinition) {
    return state
  }

  if (state.totalSpawnedOrders >= state.dayDefinition.targetOrders) {
    return state
  }

  if (state.activeOrders.length >= state.dayDefinition.maxQueue) {
    return {
      ...state,
      nextOrderInMs: 2200,
      toast: 'The tables are full for a moment. Akari lets the next guest linger outside.',
    }
  }

  const orderIndex = state.totalSpawnedOrders
  const recipeId = state.dayDefinition.scriptedOrders[orderIndex]
  const order: OrderTicket = {
    id: nextId('order'),
    customerName: GUEST_NAMES[orderIndex % GUEST_NAMES.length],
    seatIndex: orderIndex % 3,
    recipeId,
    patienceMs: 62000 + (recipeId === 'berry_cupcake' ? 5000 : 0),
    maxPatienceMs: 62000 + (recipeId === 'berry_cupcake' ? 5000 : 0),
    createdAtMs: state.dayElapsedMs,
  }

  return withHint({
    ...state,
    activeOrders: [...state.activeOrders, order],
    nextOrderInMs: state.dayDefinition.spawnIntervalMs,
    totalSpawnedOrders: orderIndex + 1,
    tutorialFlags: {
      ...state.tutorialFlags,
      firstOrderSeen: true,
    },
    toast: `${order.customerName} settles in and asks for ${RECIPE_DEFINITIONS[recipeId].shortLabel.toLowerCase()}.`,
  })
}

function tickCats(catStates: CatState[], deltaMs: number) {
  return catStates.map((cat) => {
    const nextAttention = Math.max(0, cat.attentionMs - deltaMs)
    const nextMood = clamp(cat.mood - deltaMs / 2200, 20, 100)

    return {
      ...cat,
      attentionMs: nextAttention,
      mood: nextMood,
      needsAttention: nextAttention === 0 || nextMood < 54,
    }
  })
}

function tickOrders(state: GameState, deltaMs: number) {
  const multiplier =
    state.catStates.find((cat) => cat.id === 'momo' && cat.mood >= 72)
      ? 0.86
      : 1
  const patienceMultiplier = state.progress.ownedUpgrades.includes('paper_lanterns')
    ? multiplier * (1 - UPGRADES.paper_lanterns.patienceBonus)
    : multiplier

  let missed = 0
  const activeOrders = state.activeOrders.filter((order) => {
    order.patienceMs = Math.max(0, order.patienceMs - deltaMs * patienceMultiplier)

    if (order.patienceMs === 0) {
      missed += 1
      return false
    }

    return true
  })

  return {
    activeOrders,
    missed,
  }
}

function tickRecipe(session: ActiveRecipeSession | null, deltaMs: number) {
  if (!session) {
    return null
  }

  const step = getCurrentStep(session)

  if (!step || step.kind !== 'timing') {
    return session
  }

  const timingPhase = session.timingPhase + deltaMs / TIMING_STEP_MS
  const timingValue = (Math.sin(timingPhase * Math.PI * 2) + 1) / 2

  return {
    ...session,
    timingPhase,
    timingValue,
  }
}

function shouldFinalize(state: GameState) {
  if (!state.dayDefinition) {
    return false
  }

  if (state.timeRemainingMs <= 0) {
    return true
  }

  return (
    state.totalSpawnedOrders >= state.dayDefinition.targetOrders &&
    state.activeOrders.length === 0
  )
}

function completePreparedItem(
  recipe: RecipeDefinition,
  session: ActiveRecipeSession,
  activeOrders: OrderTicket[],
) {
  const nextScores = session.qualityScores
  const quality = getRecipeQuality(nextScores)
  const qualityScore =
    nextScores.reduce((total, value) => total + value, 0) /
    Math.max(nextScores.length, 1)
  const item: PreparedItem = {
    id: nextId('dish'),
    recipeId: recipe.id,
    quality,
    qualityScore,
    recommendedOrderId: pickRecommendedOrderId(activeOrders, recipe.id),
  }

  return item
}

export class GameEngine {
  private state: GameState
  private listeners = new Set<(state: GameState) => void>()
  private storage?: StorageLike | null

  constructor(progress = createInitialProgressSave(), storage?: StorageLike | null) {
    this.state = createBaseState(progress)
    this.storage = storage
  }

  getSnapshot = () => this.state

  subscribe = (listener: (state: GameState) => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  private commit(nextState: GameState) {
    this.state = nextState
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }

  dispatch = (action: GameAction) => {
    const current = this.state
    let nextState = current

    switch (action.type) {
      case 'startDay': {
        const requestedDay = action.day ?? current.progress.highestDayUnlocked
        const safeDay = requestedDay <= current.progress.highestDayUnlocked ? requestedDay : 1
        nextState = createDayState(current.progress, safeDay)
        break
      }
      case 'selectStation': {
        nextState = withHint({
          ...current,
          selectedStation: action.stationId,
          focusedCatId: action.stationId === 'cat-lounge' ? current.focusedCatId : null,
          toast: `${STATION_STATES[action.stationId].label} is ready.`,
        })
        break
      }
      case 'beginRecipe': {
        if (current.phase !== 'playing' || current.paused || current.activeRecipe) {
          break
        }

        if (!current.progress.unlockedRecipes.includes(action.recipeId)) {
          nextState = {
            ...current,
            toast: 'That recipe is not unlocked yet.',
          }
          break
        }

        const recipe = getRecipe(action.recipeId)

        nextState = withHint({
          ...current,
          selectedStation: recipe.steps[0].stationId,
          activeRecipe: {
            recipeId: action.recipeId,
            stepIndex: 0,
            qualityScores: [],
            timingPhase: 0,
            timingValue: 0.5,
          },
          tutorialFlags: {
            ...current.tutorialFlags,
            firstRecipeStarted: true,
          },
          toast: `${recipe.name} has started. ${recipe.steps[0].detail}`,
        })
        break
      }
      case 'advanceRecipeStep': {
        if (current.phase !== 'playing' || current.paused || !current.activeRecipe) {
          break
        }

        const recipe = getRecipe(current.activeRecipe.recipeId)
        const step = recipe.steps[current.activeRecipe.stepIndex]

        if (!step) {
          break
        }

        if (current.selectedStation !== step.stationId) {
          nextState = withHint({
            ...current,
            toast: `Move to ${STATION_STATES[step.stationId].label} to finish this step.`,
          })
          break
        }

        const score =
          step.kind === 'timing' && step.targetValue !== undefined && step.window !== undefined
            ? evaluateTimingAttempt(
                current.activeRecipe.timingValue,
                step.targetValue,
                step.window,
              )
            : step.kind === 'finish'
              ? 0.9
              : 0.84
        const qualityScores = [...current.activeRecipe.qualityScores, score]
        const nextStepIndex = current.activeRecipe.stepIndex + 1

        if (nextStepIndex >= recipe.steps.length) {
          const preparedItem = completePreparedItem(
            recipe,
            {
              ...current.activeRecipe,
              qualityScores,
            },
            current.activeOrders,
          )

          nextState = withHint({
            ...current,
            activeRecipe: null,
            preparedItems: [preparedItem, ...current.preparedItems].slice(0, 4),
            toast: `${recipe.name} is ready for Akari to serve.`,
          })
          break
        }

        nextState = withHint({
          ...current,
          activeRecipe: {
            ...current.activeRecipe,
            stepIndex: nextStepIndex,
            qualityScores,
            timingPhase: 0,
            timingValue: 0.5,
          },
          toast: recipe.steps[nextStepIndex].detail,
        })
        break
      }
      case 'serveOrder': {
        if (current.phase !== 'playing' || current.paused) {
          break
        }

        const order = current.activeOrders.find((item) => item.id === action.orderId)
        const preparedItem = current.preparedItems.find(
          (item) => item.id === action.preparedItemId,
        )

        if (!order || !preparedItem) {
          break
        }

        if (preparedItem.recipeId !== order.recipeId) {
          const remainingItems = current.preparedItems.filter(
            (item) => item.id !== preparedItem.id,
          )
          const activeOrders = current.activeOrders.map((item) =>
            item.id === order.id
              ? {
                  ...item,
                  patienceMs: Math.max(0, item.patienceMs - item.maxPatienceMs * 0.25),
                }
              : item,
          )
          const missedOrder = activeOrders.find((item) => item.id === order.id)?.patienceMs === 0

          nextState = withHint({
            ...current,
            activeOrders: activeOrders.filter((item) => item.patienceMs > 0),
            preparedItems: remainingItems,
            dayStats: {
              ...current.dayStats,
              missedOrders: current.dayStats.missedOrders + (missedOrder ? 1 : 0),
            },
            toast: `${order.customerName} got the wrong order, but Akari smooths it over with a quiet apology.`,
          })
          break
        }

        const recipe = getRecipe(order.recipeId)
        const outcome = getServeOutcome(recipe, order, preparedItem, current.catStates)
        nextState = withHint({
          ...current,
          activeOrders: current.activeOrders.filter((item) => item.id !== order.id),
          preparedItems: current.preparedItems.filter((item) => item.id !== preparedItem.id),
          playerRewards: {
            sessionCoins: current.playerRewards.sessionCoins + outcome.coins,
            sessionHearts: current.playerRewards.sessionHearts + outcome.hearts,
          },
          tutorialFlags: {
            ...current.tutorialFlags,
            firstServe: true,
          },
          dayStats: {
            ordersServed: current.dayStats.ordersServed + 1,
            missedOrders: current.dayStats.missedOrders,
            perfectServes:
              current.dayStats.perfectServes +
              (preparedItem.quality === 'perfect' ? 1 : 0),
            catInteractions: current.dayStats.catInteractions,
          },
          toast: `${order.customerName} smiles. ${outcome.rating}.`,
        })
        break
      }
      case 'interactWithCat': {
        if (current.phase !== 'playing' || current.paused) {
          break
        }

        nextState = withHint({
          ...current,
          selectedStation: 'cat-lounge',
          focusedCatId: action.catId,
          catStates: current.catStates.map((cat) =>
            cat.id === action.catId
              ? {
                  ...cat,
                  mood: clamp(cat.mood + 22, 0, 100),
                  attentionMs: CAT_PROFILES[action.catId].attentionResetMs,
                  needsAttention: false,
                }
              : cat,
          ),
          tutorialFlags: {
            ...current.tutorialFlags,
            firstCatCare: true,
          },
          dayStats: {
            ...current.dayStats,
            catInteractions: current.dayStats.catInteractions + 1,
          },
          toast: `${CAT_PROFILES[action.catId].name} settles happily into the room.`,
        })
        break
      }
      case 'purchaseUpgrade': {
        if (
          current.progress.ownedUpgrades.includes(action.upgradeId) ||
          !current.progress.availableUpgrades.includes(action.upgradeId)
        ) {
          break
        }

        const upgrade = UPGRADES[action.upgradeId]

        if (current.progress.totalCoins < upgrade.cost) {
          nextState = {
            ...current,
            toast: `You need ${upgrade.cost} coins to hang the ${upgrade.name.toLowerCase()}.`,
          }
          break
        }

        const progress: ProgressSave = {
          ...current.progress,
          totalCoins: current.progress.totalCoins - upgrade.cost,
          availableUpgrades: current.progress.availableUpgrades.filter(
            (item) => item !== action.upgradeId,
          ),
          ownedUpgrades: [...current.progress.ownedUpgrades, action.upgradeId],
        }
        persistProgressSave(this.storage, progress)

        nextState = withHint({
          ...current,
          progress,
          toast: `${upgrade.name} now warms the room with a little extra patience.`,
        })
        break
      }
      case 'pauseGame': {
        if (current.phase === 'playing') {
          nextState = withHint({
            ...current,
            paused: true,
            dialogueLines: [
              'Akari dims the music for a moment while the room takes a breath.',
              'Your orders and cat moods will wait until you resume.',
            ],
          })
        }
        break
      }
      case 'resumeGame': {
        if (current.phase === 'playing') {
          nextState = withHint({
            ...current,
            paused: false,
            dialogueLines: [],
            tutorialFlags: {
              ...current.tutorialFlags,
              introSeen: true,
            },
          })
        }
        break
      }
      default:
        break
    }

    if (nextState !== current) {
      this.commit(nextState)
    }
  }

  tick = (deltaMs: number) => {
    if (
      this.state.phase !== 'playing' ||
      this.state.paused ||
      !this.state.dayDefinition ||
      deltaMs <= 0
    ) {
      return
    }

    let nextState = this.state
    nextState = {
      ...nextState,
      dayElapsedMs: nextState.dayElapsedMs + deltaMs,
      timeRemainingMs: Math.max(0, nextState.timeRemainingMs - deltaMs),
      nextOrderInMs: nextState.nextOrderInMs - deltaMs,
      activeRecipe: tickRecipe(nextState.activeRecipe, deltaMs),
      catStates: tickCats(nextState.catStates, deltaMs),
    }

    const orderTick = tickOrders(nextState, deltaMs)
    nextState = {
      ...nextState,
      activeOrders: orderTick.activeOrders,
      dayStats: {
        ...nextState.dayStats,
        missedOrders: nextState.dayStats.missedOrders + orderTick.missed,
      },
      toast:
        orderTick.missed > 0
          ? 'One guest slipped away before their order was ready.'
          : nextState.toast,
    }

    if (nextState.nextOrderInMs <= 0) {
      nextState = spawnOrder(nextState)
    } else {
      nextState = withHint(nextState)
    }

    if (shouldFinalize(nextState)) {
      nextState = finalizeDay(nextState, this.storage)
    }

    this.commit(nextState)
  }
}
