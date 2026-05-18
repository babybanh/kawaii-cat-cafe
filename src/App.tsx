import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent, PointerEvent } from 'react'
import './App.css'

type RecipeId = 'cookie' | 'pancake' | 'latte' | 'soda'
type CharacterId = 'yuto' | 'akari'

type Recipe = {
  id: RecipeId
  name: string
  emoji: string
  owner: CharacterId
  intro: string
  ingredients: string[]
  finishLabel: string
}

type IngredientMeta = {
  icon: string
  image: string
  tint: string
  accent: string
  subtitle: string
}

type IngredientLayout = {
  left: string
  top: string
  width: string
  height?: string
  imageScale?: string
  rotation?: string
  zIndex?: number
}

const BEST_SCORE_KEY = 'kawaii-cat-cafe-best-score'
const LAYOUT_STORAGE_KEY = 'kawaii-cat-cafe-layout-overrides-v5'
const BACKGROUND_MUSIC_SRC = '/assets/audio/kawaii-cat-cafe-score.mp3'
const MUSIC_RESTART_GAP_MS = 1000
const MOCHI_TIMER_DURATIONS_MS = [40000, 30000, 20000]
const MOCHI_FOCUS_OVERLAY_DELAYS_MS = [5000, 7000, 10000]
const MOCHI_STREAK_TARGET = 3
const INGREDIENT_NUDGE_DELAY_MS = 5000
const RECIPE_TEXT_MIN_WIDTH = 210
const RECIPE_TEXT_MIN_HEIGHT = 205
const RECIPE_TEXT_MIN_ROW_HEIGHT = 58
const RECIPE_EXTREME_ZOOM_RATIO = 1.75
const POINTS_PER_DISH = 10
const POINTS_PER_NEEDED_PET = 14
const POINTS_STREAK_BONUS = 6
const SHOW_LAYOUT_BOXES = false
const SHOW_INGREDIENT_HITBOXES = false
const SHOW_CHARACTER_ANCHORS = false

type LayoutTargetMode = 'move' | 'resize'
type LayoutEditSession = {
  id: string
  mode: LayoutTargetMode
  startX: number
  startY: number
  stageWidth: number
  stageHeight: number
  startLayout: IngredientLayout
}

type IngredientFlyAnimation = {
  id: number
  image: string
  fromX: number
  fromY: number
  midX: number
  midY: number
  deltaX: number
  deltaY: number
  size: number
}

const INGREDIENT_LAYOUT: Record<string, IngredientLayout> = {
  'Butter Dough': { left: '29.4%', top: '59.9%', width: '7%', height: '7%', imageScale: '2.1', zIndex: 2 },
  Sugar: { left: '72.5%', top: '54.8%', width: '7%', height: '7%', imageScale: '2.2', zIndex: 1 },
  Ice: { left: '78.3%', top: '71.5%', width: '7%', height: '7%', imageScale: '2.3', zIndex: 1 },
  Milk: { left: '22.1%', top: '50.9%', width: '7%', height: '7%', imageScale: '2.7', zIndex: 1 },
  Honey: { left: '16%', top: '60.5%', width: '7%', height: '7%', imageScale: '2.4', zIndex: 2 },
  'Strawberry Syrup': { left: '11.7%', top: '68.9%', width: '7%', height: '7%', imageScale: '2.9', zIndex: 3 },
  Soda: { left: '23.8%', top: '69%', width: '7%', height: '7%', imageScale: '2.9', zIndex: 3 },
  'Berry Batter': { left: '62.9%', top: '62.5%', width: '7%', height: '7%', imageScale: '2.2', zIndex: 3 },
  Berries: { left: '60.4%', top: '52.8%', width: '7%', height: '7%', imageScale: '2.2', zIndex: 1 },
  'Cat Icing': { left: '4.5%', top: '62.6%', width: '7%', height: '7%', imageScale: '2.5', zIndex: 1 },
  Matcha: { left: '74.6%', top: '62.9%', width: '7%', height: '7%', imageScale: '2.1', zIndex: 3 },
  'Whipped Cream': { left: '65.9%', top: '71.6%', width: '7%', height: '7%', imageScale: '2.1', zIndex: 3 },
}

const ALL_INGREDIENTS = Object.keys(INGREDIENT_LAYOUT)

const STAGE_LAYOUT: Record<string, IngredientLayout> = {
  prep: { left: '31.9%', top: '53.1%', width: '33.9%', height: '25.2%', imageScale: '2', rotation: '0', zIndex: 1 },
  prepHit: { left: '39.4%', top: '57.7%', width: '19%', height: '14.7%', imageScale: '1', rotation: '0', zIndex: 1 },
  prepHint: { left: '38.8%', top: '73.7%', width: '20.3%', height: '4.7%', imageScale: '1', rotation: '0', zIndex: 1 },
  finishButton: { left: '43%', top: '73.4%', width: '12.4%', height: '4.8%', imageScale: '1', rotation: '0', zIndex: 1 },
  mochi: { left: '39.9%', top: '84%', width: '18.4%', height: '12.5%', imageScale: '1.5', rotation: '0', zIndex: 1 },
  recipe: { left: '7.4%', top: '12.7%', width: '23.4%', height: '20.4%', imageScale: '1', rotation: '-5', zIndex: 1 },
  yuto: { left: '21.5%', top: '17.1%', width: '46.6%', height: '50.3%', imageScale: '1', rotation: '0', zIndex: 1 },
  akari: { left: '44.3%', top: '1.2%', width: '40.1%', height: '70%', imageScale: '1', rotation: '0', zIndex: 1 },
}

const STAGE_LAYOUT_LABELS: Record<string, string> = {
  prep: 'Prep mat',
  prepHit: 'Prep hit area',
  prepHint: 'Prep hint',
  finishButton: 'Finish button',
  mochi: 'Mochi',
  recipe: 'Recipe note',
  yuto: 'Yuto',
  akari: 'Akari',
}

const CHEFS: Record<
  CharacterId,
  { name: string; emoji: string; image: string; accent: string; role: string; vibe: string }
> = {
  yuto: {
    name: 'Yuto',
    emoji: '🧑‍🍳',
    image: '/assets/characters/yuto.png',
    accent: '#df7c69',
    role: 'Dish Cook',
    vibe: 'Handles the warm plates, stacks, and bakery sweets.',
  },
  akari: {
    name: 'Akari',
    emoji: '👩‍🍳',
    image: '/assets/characters/akari.png',
    accent: '#79b394',
    role: 'Drink Maker',
    vibe: 'Handles creamy lattes, chilled sodas, and cafe drinks.',
  },
}

const RECIPES: Recipe[] = [
  {
    id: 'cookie',
    name: 'Cat Cookie',
    emoji: '🍪',
    owner: 'yuto',
    intro: 'Build the cookie filling in order, then bake it.',
    ingredients: ['Butter Dough', 'Sugar', 'Cat Icing'],
    finishLabel: 'Bake Cookie',
  },
  {
    id: 'pancake',
    name: 'Berry Pancake',
    emoji: '🥞',
    owner: 'yuto',
    intro: 'Layer the pancake ingredients in order, then flip and serve.',
    ingredients: ['Berry Batter', 'Berries', 'Whipped Cream'],
    finishLabel: 'Flip Pancake',
  },
  {
    id: 'latte',
    name: 'Honey Latte',
    emoji: '🍵',
    owner: 'akari',
    intro: 'Build the latte from base to topping, then steam it.',
    ingredients: ['Matcha', 'Milk', 'Honey'],
    finishLabel: 'Steam Latte',
  },
  {
    id: 'soda',
    name: 'Strawberry Soda',
    emoji: '🥤',
    owner: 'akari',
    intro: 'Stack the soda ingredients cleanly, then pour it cold.',
    ingredients: ['Strawberry Syrup', 'Soda', 'Ice'],
    finishLabel: 'Pour Soda',
  },
]

const INGREDIENT_META: Record<string, IngredientMeta> = {
  'Butter Dough': {
    icon: '🧈',
    image: '/assets/ingredients/butter-dough.png',
    tint: '#f5d989',
    accent: '#efc35d',
    subtitle: 'Soft cookie base',
  },
  Sugar: {
    icon: '🍬',
    image: '/assets/ingredients/sugar.png',
    tint: '#e9d8ff',
    accent: '#b995ff',
    subtitle: 'Sweet crystal pop',
  },
  'Cat Icing': {
    icon: '🐾',
    image: '/assets/ingredients/cat-icing.png',
    tint: '#ffe2e5',
    accent: '#e28f9f',
    subtitle: 'Cute paw topping',
  },
  'Berry Batter': {
    icon: '🥣',
    image: '/assets/ingredients/berry-batter.png',
    tint: '#d5ebff',
    accent: '#89b8eb',
    subtitle: 'Fluffy batter mix',
  },
  Berries: {
    icon: '🍓',
    image: '/assets/ingredients/berries.png',
    tint: '#ffd7dd',
    accent: '#e67b8f',
    subtitle: 'Fresh berry burst',
  },
  'Whipped Cream': {
    icon: '🍦',
    image: '/assets/ingredients/whipped-cream.png',
    tint: '#fff0d9',
    accent: '#f0c98b',
    subtitle: 'Cloud-soft finish',
  },
  Matcha: {
    icon: '🍵',
    image: '/assets/ingredients/matcha.png',
    tint: '#d9f0d4',
    accent: '#91bf73',
    subtitle: 'Earthy green tea',
  },
  Milk: {
    icon: '🥛',
    image: '/assets/ingredients/milk.png',
    tint: '#f3f4ff',
    accent: '#bcc6f3',
    subtitle: 'Velvet foam layer',
  },
  Honey: {
    icon: '🍯',
    image: '/assets/ingredients/honey.png',
    tint: '#ffe39f',
    accent: '#f1b942',
    subtitle: 'Golden drizzle',
  },
  'Strawberry Syrup': {
    icon: '🍓',
    image: '/assets/ingredients/strawberry-syrup.png',
    tint: '#ffd2d8',
    accent: '#eb7288',
    subtitle: 'Pink syrup base',
  },
  Soda: {
    icon: '🫧',
    image: '/assets/ingredients/soda.png',
    tint: '#dcf7ff',
    accent: '#8ed4e9',
    subtitle: 'Sparkling fizz',
  },
  Ice: {
    icon: '🧊',
    image: '/assets/ingredients/ice.png',
    tint: '#e9f8ff',
    accent: '#9fd9f3',
    subtitle: 'Cold crystal cubes',
  },
}

const RECIPE_LAYER_ASSETS: Partial<Record<RecipeId, Record<string, string>>> = {
  cookie: {
    'Butter Dough': '/assets/recipes/cookie/base.png',
    Sugar: '/assets/recipes/cookie/sugar.png',
    'Cat Icing': '/assets/recipes/cookie/cat-icing.png',
  },
  pancake: {
    'Berry Batter': '/assets/recipes/pancake/base.png',
    Berries: '/assets/recipes/pancake/berries.png',
    'Whipped Cream': '/assets/recipes/pancake/whipped-cream.png',
  },
  latte: {
    Matcha: '/assets/recipes/latte/matcha.png',
    Milk: '/assets/recipes/latte/milk.png',
    Honey: '/assets/recipes/latte/honey.png',
  },
  soda: {
    'Strawberry Syrup': '/assets/recipes/soda/strawberry-syrup.png',
    Soda: '/assets/recipes/soda/soda.png',
    Ice: '/assets/recipes/soda/ice.png',
  },
}

function App() {
  const stageRef = useRef<HTMLElement | null>(null)
  const recipeNoteRef = useRef<HTMLElement | null>(null)
  const prepHitRef = useRef<HTMLDivElement | null>(null)
  const ingredientRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const initialDevicePixelRatioRef = useRef(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
  const layoutEditRef = useRef<LayoutEditSession | null>(null)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const musicEnabledRef = useRef(true)
  const musicGapTimerRef = useRef<number | null>(null)
  const ingredientFlyIdRef = useRef(0)
  const [recipeIndex, setRecipeIndex] = useState(0)
  const [placedIngredients, setPlacedIngredients] = useState<string[]>([])
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null)
  const [draggedIngredient, setDraggedIngredient] = useState<string | null>(null)
  const [ingredientFly, setIngredientFly] = useState<IngredientFlyAnimation | null>(null)
  const [served, setServed] = useState(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(loadBestScore)
  const [toast, setToast] = useState<string | null>(null)
  const [toastTone, setToastTone] = useState<'good' | 'wrong' | 'cat' | 'hint'>('hint')
  const [instructionMessage, setInstructionMessage] = useState<string | null>(null)
  const [instructionTone, setInstructionTone] = useState<'good' | 'wrong' | 'cat' | 'hint'>('hint')
  const [shakeIngredient, setShakeIngredient] = useState<string | null>(null)
  const [nudgedIngredient, setNudgedIngredient] = useState<string | null>(null)
  const [ingredientNudgeToken, setIngredientNudgeToken] = useState(0)
  const [mochiTimerStep, setMochiTimerStep] = useState(0)
  const [mochiTimerDuration, setMochiTimerDuration] = useState(MOCHI_TIMER_DURATIONS_MS[0])
  const [mochiDeadline, setMochiDeadline] = useState(() => Date.now() + MOCHI_TIMER_DURATIONS_MS[0])
  const [mochiTimeLeft, setMochiTimeLeft] = useState(MOCHI_TIMER_DURATIONS_MS[0])
  const [mochiRecipeStreak, setMochiRecipeStreak] = useState(0)
  const [mochiCelebrating, setMochiCelebrating] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [mochiFocusOverlay, setMochiFocusOverlay] = useState(false)
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [musicStarted, setMusicStarted] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [conceptOpen, setConceptOpen] = useState(false)
  const [compactRecipeNote, setCompactRecipeNote] = useState(false)
  const [editMode, setEditMode] = useState(loadInitialEditMode)
  const [layoutOverrides, setLayoutOverrides] = useState(loadLayoutOverrides)
  const [selectedLayoutId, setSelectedLayoutId] = useState('prep')
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const toastTimerRef = useRef<number | null>(null)
  const instructionTimerRef = useRef<number | null>(null)
  const shakeTimerRef = useRef<number | null>(null)
  const ingredientNudgeTimerRef = useRef<number | null>(null)
  const mochiCelebrateTimerRef = useRef<number | null>(null)

  const recipe = RECIPES[recipeIndex]
  const chef = CHEFS[recipe.owner]
  const nextIngredient = recipe.ingredients[placedIngredients.length] ?? null
  const introActive = !gameStarted
  const catNeedsPet = gameStarted && mochiTimeLeft <= 0
  const modalOpen = creditsOpen || conceptOpen
  const mochiFocusActive = (introActive || mochiFocusOverlay) && !modalOpen
  const mochiPromptActive = introActive || catNeedsPet
  const recipeReadyToFinish = placedIngredients.length === recipe.ingredients.length
  const mochiTimerProgress = clamp(mochiTimeLeft / mochiTimerDuration, 0, 1)
  const mochiSecondsLeft = Math.max(0, Math.ceil(mochiTimeLeft / 1000))
  const akariBubbleMode = catNeedsPet ? 'cat' : recipeReadyToFinish ? 'action' : null
  const defaultPrepInstruction = catNeedsPet
    ? 'Tap Mochi to keep cooking'
    : introActive
      ? 'Tap Mochi to keep cooking'
    : nextIngredient
      ? selectedIngredient
        ? `Tap mat to add ${selectedIngredient}`
        : `Tap ${nextIngredient}`
      : recipe.finishLabel
  const desktopPrepInstruction =
    instructionMessage ?? defaultPrepInstruction
  const mobilePrepInstruction = instructionMessage ?? defaultPrepInstruction
  const playBackgroundMusic = useCallback(
    (force = false) => {
      const audio = musicRef.current

      if (!audio || (!force && !musicEnabledRef.current)) {
        return Promise.resolve()
      }

      if (document.hidden) {
        audio.pause()
        setMusicStarted(false)
        return Promise.resolve()
      }

      if (musicGapTimerRef.current) {
        window.clearTimeout(musicGapTimerRef.current)
        musicGapTimerRef.current = null
      }

      return audio
        .play()
        .then(() => {
          setMusicStarted(true)
        })
        .catch(() => {
          setMusicStarted(false)
        })
    },
    [],
  )
  const stageDebugClasses = [
    editMode ? 'is-editing-layout' : '',
    mochiFocusActive ? 'mochi-focus-active' : '',
    introActive ? 'intro-active' : '',
    SHOW_LAYOUT_BOXES ? 'show-layout-boxes' : '',
    SHOW_INGREDIENT_HITBOXES ? 'show-ingredient-hitboxes' : '',
    SHOW_CHARACTER_ANCHORS ? 'show-character-anchors' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const getLayout = (id: string, fallback: IngredientLayout) => layoutOverrides[id] ?? fallback
  const selectedFallback = getFallbackLayout(selectedLayoutId)
  const selectedLayout = getLayout(selectedLayoutId, selectedFallback)
  const layoutRows = getLayoutRows(layoutOverrides)

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
      if (instructionTimerRef.current) {
        window.clearTimeout(instructionTimerRef.current)
      }
      if (shakeTimerRef.current) {
        window.clearTimeout(shakeTimerRef.current)
      }
      if (ingredientNudgeTimerRef.current) {
        window.clearTimeout(ingredientNudgeTimerRef.current)
      }
      if (musicGapTimerRef.current) {
        window.clearTimeout(musicGapTimerRef.current)
      }
      if (mochiCelebrateTimerRef.current) {
        window.clearTimeout(mochiCelebrateTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    const audio = new Audio(BACKGROUND_MUSIC_SRC)
    audio.preload = 'auto'
    audio.volume = 0.42
    musicRef.current = audio

    const handleEnded = () => {
      if (!musicEnabledRef.current || document.hidden) {
        return
      }

      if (musicGapTimerRef.current) {
        window.clearTimeout(musicGapTimerRef.current)
      }

      musicGapTimerRef.current = window.setTimeout(() => {
        void playBackgroundMusic()
      }, MUSIC_RESTART_GAP_MS)
    }

    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.pause()
      audio.removeEventListener('ended', handleEnded)
      musicRef.current = null
    }
  }, [playBackgroundMusic])

  useEffect(() => {
    musicEnabledRef.current = musicEnabled

    if (!musicEnabled) {
      musicRef.current?.pause()
      return
    }

    const keepMusicAlive = () => {
      if (!gameStarted || document.hidden) {
        return
      }

      const audio = musicRef.current

      if (!audio || !audio.paused) {
        return
      }

      void playBackgroundMusic()
    }

    window.addEventListener('pointerdown', keepMusicAlive, { capture: true })
    window.addEventListener('keydown', keepMusicAlive, { capture: true })

    return () => {
      window.removeEventListener('pointerdown', keepMusicAlive, { capture: true })
      window.removeEventListener('keydown', keepMusicAlive, { capture: true })
    }
  }, [gameStarted, musicEnabled, playBackgroundMusic])

  useEffect(() => {
    const pauseMusicForBackground = (event: Event) => {
      const appIsBackgrounded = document.hidden || document.visibilityState === 'hidden' || event.type === 'pagehide'

      if (!appIsBackgrounded) {
        return
      }

      if (musicGapTimerRef.current) {
        window.clearTimeout(musicGapTimerRef.current)
        musicGapTimerRef.current = null
      }

      musicRef.current?.pause()
      setMusicStarted(false)
    }

    document.addEventListener('visibilitychange', pauseMusicForBackground)
    window.addEventListener('pagehide', pauseMusicForBackground)
    window.addEventListener('blur', pauseMusicForBackground)

    return () => {
      document.removeEventListener('visibilitychange', pauseMusicForBackground)
      window.removeEventListener('pagehide', pauseMusicForBackground)
      window.removeEventListener('blur', pauseMusicForBackground)
    }
  }, [])

  useEffect(() => {
    if (!gameStarted) {
      return
    }

    const timer = window.setInterval(() => {
      const nextTimeLeft = Math.max(0, mochiDeadline - Date.now())
      setMochiTimeLeft(nextTimeLeft)
      if (nextTimeLeft <= 0) {
        setMochiRecipeStreak(0)
      }
    }, 100)

    return () => window.clearInterval(timer)
  }, [gameStarted, mochiDeadline, mochiTimerDuration])

  useEffect(() => {
    if (!catNeedsPet) {
      return
    }

    const focusTimer = window.setTimeout(() => {
      setMochiFocusOverlay(true)
    }, MOCHI_FOCUS_OVERLAY_DELAYS_MS[mochiTimerStep] ?? MOCHI_FOCUS_OVERLAY_DELAYS_MS[MOCHI_FOCUS_OVERLAY_DELAYS_MS.length - 1])

    return () => window.clearTimeout(focusTimer)
  }, [catNeedsPet, mochiTimerStep])

  useEffect(() => {
    if (ingredientNudgeTimerRef.current) {
      window.clearTimeout(ingredientNudgeTimerRef.current)
      ingredientNudgeTimerRef.current = null
    }

    if (!gameStarted || catNeedsPet || !nextIngredient || selectedIngredient) {
      return
    }

    ingredientNudgeTimerRef.current = window.setTimeout(() => {
      setNudgedIngredient(nextIngredient)
      ingredientNudgeTimerRef.current = null
    }, INGREDIENT_NUDGE_DELAY_MS)

    return () => {
      if (ingredientNudgeTimerRef.current) {
        window.clearTimeout(ingredientNudgeTimerRef.current)
        ingredientNudgeTimerRef.current = null
      }
    }
  }, [catNeedsPet, gameStarted, ingredientNudgeToken, nextIngredient, selectedIngredient])

  useEffect(() => {
    const note = recipeNoteRef.current

    if (!note) {
      return
    }

    const measureRecipeNote = () => {
      const checklist = note.querySelector<HTMLElement>('.recipe-checklist')

      if (!checklist) {
        return
      }

      note.classList.remove('compact-steps')
      note.style.setProperty('--recipe-compact-y', '0px')
      const viewportScale = window.visualViewport?.scale ?? 1
      const deviceZoomRatio = (window.devicePixelRatio || 1) / initialDevicePixelRatioRef.current
      const zoomedPastCompactPoint = deviceZoomRatio >= RECIPE_EXTREME_ZOOM_RATIO || viewportScale >= RECIPE_EXTREME_ZOOM_RATIO
      const noteRect = note.getBoundingClientRect()
      const rowsDoNotFit = checklist.scrollHeight > checklist.clientHeight + 2
      const recipeRows = Array.from(checklist.querySelectorAll<HTMLElement>('li'))
      const shortestRowHeight = recipeRows.reduce(
        (shortest, row) => Math.min(shortest, row.getBoundingClientRect().height),
        Number.POSITIVE_INFINITY,
      )
      const isPortraitPhoneLayout = window.matchMedia('(max-width: 760px) and (orientation: portrait)').matches
      const cardTooSmallForText =
        noteRect.width < RECIPE_TEXT_MIN_WIDTH ||
        noteRect.height < RECIPE_TEXT_MIN_HEIGHT ||
        (isPortraitPhoneLayout && shortestRowHeight < RECIPE_TEXT_MIN_ROW_HEIGHT)
      const shouldCompact = isPortraitPhoneLayout || cardTooSmallForText || zoomedPastCompactPoint || rowsDoNotFit || checklist.scrollWidth > checklist.clientWidth + 2
      note.classList.toggle('compact-steps', shouldCompact)
      if (shouldCompact) {
        const compactHeight = note.getBoundingClientRect().height
        const compactOffset = Math.max(0, (noteRect.height - compactHeight) / 2)
        note.style.setProperty('--recipe-compact-y', `${compactOffset}px`)
      }
      setCompactRecipeNote(shouldCompact)
    }

    let frame = 0
    const scheduleMeasureRecipeNote = () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0
        measureRecipeNote()
      })
    }

    scheduleMeasureRecipeNote()
    const resizeObserver = new ResizeObserver(scheduleMeasureRecipeNote)
    resizeObserver.observe(note)

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
      resizeObserver.disconnect()
    }
  }, [recipeIndex, placedIngredients.length, catNeedsPet])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutOverrides))
  }, [layoutOverrides])

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const session = layoutEditRef.current

      if (!session) {
        return
      }

      const deltaX = ((event.clientX - session.startX) / session.stageWidth) * 100
      const deltaY = ((event.clientY - session.startY) / session.stageHeight) * 100
      const startLeft = percentToNumber(session.startLayout.left)
      const startTop = percentToNumber(session.startLayout.top)
      const startWidth = percentToNumber(session.startLayout.width)
      const startHeight = percentToNumber(session.startLayout.height ?? session.startLayout.width)
      const resizeLimits = getLayoutResizeLimits(session.id)

      setLayoutOverrides((current) => {
        const nextLayout =
          session.mode === 'resize'
            ? {
                ...session.startLayout,
                width: `${roundPercent(clamp(startWidth + deltaX, resizeLimits.minWidth, resizeLimits.maxWidth))}%`,
                height: `${roundPercent(clamp(startHeight + deltaY, resizeLimits.minHeight, resizeLimits.maxHeight))}%`,
              }
            : {
                ...session.startLayout,
                left: `${roundPercent(clamp(startLeft + deltaX, -8, 96))}%`,
                top: `${roundPercent(clamp(startTop + deltaY, -8, 96))}%`,
              }

        return { ...current, [session.id]: nextLayout }
      })
    }

    const handlePointerUp = () => {
      layoutEditRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const startLayoutEdit = (
    event: PointerEvent<HTMLElement>,
    id: string,
    fallbackLayout: IngredientLayout,
    mode: LayoutTargetMode = 'move',
  ) => {
    if (!editMode || !stageRef.current) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setSelectedLayoutId(id)

    const stageRect = stageRef.current.getBoundingClientRect()
    layoutEditRef.current = {
      id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
      startLayout: getLayout(id, fallbackLayout),
    }
  }

  const resetLayout = () => {
    setLayoutOverrides({})
    showToast('Layout reset', 'hint')
  }

  const copyLayout = async () => {
    const layoutText = JSON.stringify(layoutOverrides, null, 2)

    try {
      await navigator.clipboard.writeText(layoutText)
      showToast('Layout copied', 'good')
    } catch {
      console.info('Kawaii Cat Cafe layout overrides:', layoutOverrides)
      showToast('Layout logged', 'hint')
    }
  }

  const updateLayoutNumber = (id: string, key: keyof IngredientLayout, value: number) => {
    const fallback = getFallbackLayout(id)
    const current = getLayout(id, fallback)
    const limits = getLayoutResizeLimits(id)

    let nextValue: string | number

    if (key === 'width') {
      nextValue = `${roundPercent(clamp(value, limits.minWidth, limits.maxWidth))}%`
    } else if (key === 'height') {
      nextValue = `${roundPercent(clamp(value, limits.minHeight, limits.maxHeight))}%`
    } else if (key === 'left') {
      nextValue = `${roundPercent(clamp(value, -8, 96))}%`
    } else if (key === 'top') {
      nextValue = `${roundPercent(clamp(value, -8, 96))}%`
    } else if (key === 'imageScale') {
      nextValue = String(roundPercent(clamp(value, 0.5, 5)))
    } else if (key === 'rotation') {
      nextValue = String(roundPercent(clamp(value, -45, 45)))
    } else if (key === 'zIndex') {
      nextValue = Math.round(clamp(value, 0, 99))
    } else {
      return
    }

    setLayoutOverrides((currentOverrides) => ({
      ...currentOverrides,
      [id]: { ...current, [key]: nextValue },
    }))
  }

  const toggleMusic = () => {
    if (musicEnabled && !musicStarted) {
      void playBackgroundMusic(true)
      showToast('Music on', 'hint')
      return
    }

    const nextEnabled = !musicEnabled
    musicEnabledRef.current = nextEnabled
    setMusicEnabled(nextEnabled)

    if (!nextEnabled) {
      musicRef.current?.pause()
      setMusicStarted(false)
      showToast('Music off', 'hint')
      return
    }

    void playBackgroundMusic(true)
    showToast('Music on', 'hint')
  }

  const resetMochiTimer = () => {
    setMochiTimerStep((currentStep) => {
      const nextStep = Math.min(currentStep + 1, MOCHI_TIMER_DURATIONS_MS.length - 1)
      const nextDuration = MOCHI_TIMER_DURATIONS_MS[nextStep]
      setMochiTimerDuration(nextDuration)
      setMochiDeadline(() => Date.now() + nextDuration)
      setMochiTimeLeft(nextDuration)
      return nextStep
    })
  }

  const celebrateMochi = () => {
    if (mochiCelebrateTimerRef.current) {
      window.clearTimeout(mochiCelebrateTimerRef.current)
    }

    setMochiCelebrating(true)
    mochiCelebrateTimerRef.current = window.setTimeout(() => {
      setMochiCelebrating(false)
    }, 1200)
  }

  const showToast = (text: string, tone: typeof toastTone = 'hint') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }

    setToast(text)
    setToastTone(tone)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
    }, 1300)
  }

  const showInstruction = (text: string, tone: typeof instructionTone = 'hint', duration = 1400) => {
    if (instructionTimerRef.current) {
      window.clearTimeout(instructionTimerRef.current)
    }

    setInstructionMessage(text)
    setInstructionTone(tone)
    instructionTimerRef.current = window.setTimeout(() => {
      setInstructionMessage(null)
    }, duration)
  }

  const restartIngredientNudge = () => {
    setNudgedIngredient(null)
    setIngredientNudgeToken((token) => token + 1)
  }

  const addScore = (points: number) => {
    const nextScore = score + points
    setScore(nextScore)
    maybeStoreBest(nextScore, best, setBest)
  }

  const bumpIngredient = (ingredient: string) => {
    if (shakeTimerRef.current) {
      window.clearTimeout(shakeTimerRef.current)
    }

    setShakeIngredient(ingredient)
    shakeTimerRef.current = window.setTimeout(() => {
      setShakeIngredient(null)
    }, 360)
  }

  const animateIngredientToMat = (ingredient: string) => {
    const stage = stageRef.current
    const source = ingredientRefs.current[ingredient]
    const target = prepHitRef.current

    if (!stage || !source || !target) {
      return
    }

    const stageRect = stage.getBoundingClientRect()
    const sourceRect = source.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const fromX = sourceRect.left + sourceRect.width / 2 - stageRect.left
    const fromY = sourceRect.top + sourceRect.height / 2 - stageRect.top
    const toX = targetRect.left + targetRect.width / 2 - stageRect.left
    const toY = targetRect.top + targetRect.height / 2 - stageRect.top
    const deltaX = toX - fromX
    const deltaY = toY - fromY
    const size = Math.min(sourceRect.width, sourceRect.height) * 1.55

    setIngredientFly({
      id: ingredientFlyIdRef.current + 1,
      image: INGREDIENT_META[ingredient].image,
      fromX,
      fromY,
      midX: deltaX * 0.72,
      midY: deltaY * 0.72 - 18,
      deltaX,
      deltaY,
      size,
    })
    ingredientFlyIdRef.current += 1
  }

  const chooseIngredient = (ingredient: string) => {
    if (introActive) {
      showInstruction('Tap Mochi to keep cooking', 'cat')
      return
    }

    if (catNeedsPet) {
      showInstruction('Tap Mochi to keep cooking', 'cat')
      return
    }

    if (!nextIngredient) {
      showInstruction('Ready to serve', 'good')
      return
    }

    restartIngredientNudge()

    if (ingredient !== nextIngredient) {
      setSelectedIngredient(null)
      bumpIngredient(ingredient)
      showInstruction(`Need ${nextIngredient}`, 'wrong')
      return
    }

    setSelectedIngredient(ingredient)
    showInstruction(`Tap mat to add ${ingredient}`, 'good')
  }

  const placeIngredient = (ingredient: string | null, animateFromSelection = false) => {
    if (introActive) {
      showInstruction('Tap Mochi to keep cooking', 'cat')
      return
    }

    if (catNeedsPet) {
      showInstruction('Tap Mochi to keep cooking', 'cat')
      return
    }

    if (!nextIngredient) {
      showInstruction('Ready to serve', 'good')
      return
    }

    restartIngredientNudge()

    const ingredientToPlace = ingredient ?? selectedIngredient

    if (!ingredientToPlace) {
      showInstruction(`Need ${nextIngredient}`, 'hint')
      return
    }

    if (ingredientToPlace !== nextIngredient) {
      bumpIngredient(ingredientToPlace)
      showInstruction(`Need ${nextIngredient}`, 'wrong')
      return
    }

    if (animateFromSelection) {
      animateIngredientToMat(ingredientToPlace)
    }

    const nextPlaced = [...placedIngredients, ingredientToPlace]
    setPlacedIngredients(nextPlaced)
    setSelectedIngredient(null)
    setDraggedIngredient(null)

    if (nextPlaced.length === recipe.ingredients.length) {
      showInstruction('Ready to serve', 'good')
      return
    }

    showInstruction(`${ingredientToPlace} added`, 'good')
  }

  const finishRecipe = () => {
    if (introActive) {
      showInstruction('Tap Mochi to keep cooking', 'cat')
      return
    }

    if (catNeedsPet) {
      showInstruction('Tap Mochi to keep cooking', 'cat')
      return
    }

    if (placedIngredients.length !== recipe.ingredients.length) {
      showInstruction(`Need ${nextIngredient}`, 'hint')
      return
    }

    const nextServed = served + 1
    const nextRecipeIndex = (recipeIndex + 1) % RECIPES.length
    const nextStreak = mochiRecipeStreak + 1
    const earnedMochiBonus = nextStreak >= MOCHI_STREAK_TARGET
    const pointsEarned = POINTS_PER_DISH + (earnedMochiBonus ? POINTS_STREAK_BONUS : 0)

    setServed(nextServed)
    addScore(pointsEarned)
    setPlacedIngredients([])
    setSelectedIngredient(null)
    setDraggedIngredient(null)
    setRecipeIndex(nextRecipeIndex)

    if (earnedMochiBonus) {
      setMochiRecipeStreak(0)
      resetMochiTimer()
      celebrateMochi()
      showInstruction(`${recipe.name} served +${POINTS_PER_DISH}`, 'good', 820)
      window.setTimeout(() => {
        showInstruction(`Cafe rush bonus +${POINTS_STREAK_BONUS}`, 'cat', 1400)
      }, 900)
      return
    }

    setMochiRecipeStreak(nextStreak)
    showInstruction(`${recipe.name} served +${POINTS_PER_DISH}`, 'good', 1050)
  }

  const petCat = () => {
    if (musicEnabledRef.current) {
      void playBackgroundMusic(true)
    }

    if (introActive) {
      setGameStarted(true)
      setMochiFocusOverlay(false)
      setMochiDeadline(() => Date.now() + mochiTimerDuration)
      setMochiTimeLeft(mochiTimerDuration)
      restartIngredientNudge()
      showInstruction('Mochi purrs', 'cat')
      return
    }

    const wasWaiting = catNeedsPet

    if (!wasWaiting) {
      setMochiFocusOverlay(false)
      showInstruction('Mochi purrs', 'cat')
      return
    }

    resetMochiTimer()
    setMochiRecipeStreak(0)
    setMochiFocusOverlay(false)
    restartIngredientNudge()

    addScore(POINTS_PER_NEEDED_PET)
    showInstruction(`Mochi is happy +${POINTS_PER_NEEDED_PET}`, 'cat')
  }

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, ingredient: string) => {
    if (introActive) {
      event.preventDefault()
      showInstruction('Tap Mochi to keep cooking', 'cat')
      return
    }

    if (catNeedsPet) {
      event.preventDefault()
      showInstruction('Tap Mochi to keep cooking', 'cat')
      return
    }

    const dragImage = document.createElement('img')
    dragImage.src = INGREDIENT_META[ingredient].image
    dragImage.alt = ''
    Object.assign(dragImage.style, {
      position: 'fixed',
      left: '-1000px',
      top: '-1000px',
      width: '112px',
      height: '112px',
      objectFit: 'contain',
      pointerEvents: 'none',
    })
    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, 56, 56)
    window.setTimeout(() => dragImage.remove(), 0)

    setDraggedIngredient(ingredient)

    if (ingredient !== nextIngredient) {
      setSelectedIngredient(null)
      showInstruction(`Need ${nextIngredient}`, 'wrong')
      return
    }

    setSelectedIngredient(ingredient)
    showInstruction(`Drop ${ingredient} on mat`, 'good')
  }

  const handleDragEnd = () => {
    setDraggedIngredient(null)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedIngredient = event.dataTransfer.getData('text/plain') || draggedIngredient
    placeIngredient(droppedIngredient || null)
  }

  return (
    <div className="play-shell">
      <main ref={stageRef} className={`game-stage ${stageDebugClasses}`} aria-label="Kawaii Cat Cafe cooking stage">
        <img src="/assets/backgrounds/kawaii-room-layer.png" alt="" className="stage-layer room-layer" draggable={false} />
        <button
          type="button"
          className="wall-title-button"
          aria-label="Open original game concept artwork"
          onClick={() => setConceptOpen(true)}
        >
          <img src="/assets/backgrounds/gametitle.png" alt="" draggable={false} />
        </button>

        <div className="characters-layer" aria-label="Cafe helpers">
          {Object.values(CHEFS).map((person) => (
            <div
              key={person.name}
              className={`layout-edit-target character-sticker ${chef.name === person.name ? 'active' : 'inactive'} ${person.name.toLowerCase()}-character`}
              data-layout-label={person.name}
              onPointerDown={(event) => startLayoutEdit(event, person.name.toLowerCase(), STAGE_LAYOUT[person.name.toLowerCase()])}
              style={{
                ...getLayout(person.name.toLowerCase(), STAGE_LAYOUT[person.name.toLowerCase()]),
                ['--chef-accent' as string]: person.accent,
                ['--image-scale' as string]: getLayout(person.name.toLowerCase(), STAGE_LAYOUT[person.name.toLowerCase()]).imageScale ?? '1',
                ['--rotation' as string]: `${getLayout(person.name.toLowerCase(), STAGE_LAYOUT[person.name.toLowerCase()]).rotation ?? '0'}deg`,
              }}
            >
              <img src={person.image} alt={person.name} />
              <ResizeHandle editMode={editMode} onPointerDown={(event) => startLayoutEdit(event, person.name.toLowerCase(), STAGE_LAYOUT[person.name.toLowerCase()], 'resize')} />
            </div>
          ))}
        </div>

        <img src="/assets/backgrounds/kawaii-table-foreground.png" alt="" className="stage-layer table-layer" draggable={false} />

        <section className="ingredients-layer" aria-label="Ingredient table">
          {ALL_INGREDIENTS.map((ingredient) => {
            const meta = INGREDIENT_META[ingredient]
            const fallbackLayout = INGREDIENT_LAYOUT[ingredient]
            const layout = getLayout(`ingredient:${ingredient}`, fallbackLayout)
            const selected = selectedIngredient === ingredient
            const highlighted = nextIngredient === ingredient
            const shaking = shakeIngredient === ingredient
            const nudged = nudgedIngredient === ingredient && highlighted && gameStarted && !catNeedsPet && !selectedIngredient

            if (!fallbackLayout) {
              return null
            }

            return (
              <button
                key={ingredient}
                type="button"
                className={`layout-edit-target table-ingredient ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''} ${nudged ? 'nudged' : ''} ${shaking ? 'shake' : ''} ${draggedIngredient === ingredient ? 'dragging' : ''}`}
                aria-label={ingredient}
                data-layout-label={ingredient}
                ref={(node) => {
                  ingredientRefs.current[ingredient] = node
                }}
                draggable={!editMode}
                onPointerDown={(event) => startLayoutEdit(event, `ingredient:${ingredient}`, fallbackLayout)}
                onClick={() => {
                  if (!editMode) {
                    chooseIngredient(ingredient)
                  }
                }}
                onDragStart={(event) => {
                  if (editMode) {
                    event.preventDefault()
                    return
                  }
                  event.dataTransfer.setData('text/plain', ingredient)
                  handleDragStart(event, ingredient)
                }}
                onDragEnd={handleDragEnd}
                style={{
                  ...layout,
                  height: layout.height ?? layout.width,
                  zIndex: getRenderZIndex(`ingredient:${ingredient}`, layout),
                  ['--image-scale' as string]: layout.imageScale ?? '1',
                  ['--rotation' as string]: `${layout.rotation ?? '0'}deg`,
                  ['--ingredient-tint' as string]: meta.tint,
                  ['--ingredient-accent' as string]: meta.accent,
                }}
              >
                <img src={meta.image} alt="" draggable={false} />
                <ResizeHandle editMode={editMode} onPointerDown={(event) => startLayoutEdit(event, `ingredient:${ingredient}`, fallbackLayout, 'resize')} />
              </button>
            )
          })}
        </section>

        <section
          className="layout-edit-target prep-layer"
          data-layout-label="Prep mat"
          onPointerDown={(event) => startLayoutEdit(event, 'prep', STAGE_LAYOUT.prep)}
          style={{
            ...getLayout('prep', STAGE_LAYOUT.prep),
            zIndex: getRenderZIndex('prep', getLayout('prep', STAGE_LAYOUT.prep)),
            ['--image-scale' as string]: getLayout('prep', STAGE_LAYOUT.prep).imageScale ?? '1',
            ['--rotation' as string]: `${getLayout('prep', STAGE_LAYOUT.prep).rotation ?? '0'}deg`,
          }}
        >
          <div className="prep-art">
            <div className="sparkle sparkle-a">✦</div>
            <div className="sparkle sparkle-b">✦</div>
            <div className="sparkle sparkle-c">✦</div>
            <LiveDish recipe={recipe} placedIngredients={placedIngredients} />
          </div>
          <ResizeHandle editMode={editMode} onPointerDown={(event) => startLayoutEdit(event, 'prep', STAGE_LAYOUT.prep, 'resize')} />
        </section>

        <div
          ref={prepHitRef}
          className={`layout-edit-target prep-hit-area ${nextIngredient ? 'waiting' : 'complete'}`}
          data-testid="prep-hit-area"
          data-layout-label="Prep hit area"
          onPointerDown={(event) => startLayoutEdit(event, 'prepHit', STAGE_LAYOUT.prepHit)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          onClick={(event) => {
            if (editMode) {
              event.preventDefault()
              return
            }
            placeIngredient(selectedIngredient, true)
          }}
          style={{
            ...getLayout('prepHit', STAGE_LAYOUT.prepHit),
            zIndex: getRenderZIndex('prepHit', getLayout('prepHit', STAGE_LAYOUT.prepHit)),
            ['--rotation' as string]: `${getLayout('prepHit', STAGE_LAYOUT.prepHit).rotation ?? '0'}deg`,
          }}
        >
          <ResizeHandle editMode={editMode} onPointerDown={(event) => startLayoutEdit(event, 'prepHit', STAGE_LAYOUT.prepHit, 'resize')} />
        </div>

        {ingredientFly ? (
          <div
            key={ingredientFly.id}
            className="ingredient-flyer"
            aria-hidden="true"
            onAnimationEnd={() => setIngredientFly(null)}
            style={{
              ['--fly-from-x' as string]: `${ingredientFly.fromX}px`,
              ['--fly-from-y' as string]: `${ingredientFly.fromY}px`,
              ['--fly-mid-x' as string]: `${ingredientFly.midX}px`,
              ['--fly-mid-y' as string]: `${ingredientFly.midY}px`,
              ['--fly-delta-x' as string]: `${ingredientFly.deltaX}px`,
              ['--fly-delta-y' as string]: `${ingredientFly.deltaY}px`,
              ['--fly-size' as string]: `${ingredientFly.size}px`,
            }}
          >
            <img src={ingredientFly.image} alt="" draggable={false} />
          </div>
        ) : null}

        <div
          className="layout-edit-target prep-hint-layer"
          data-layout-label="Prep hint"
          onPointerDown={(event) => startLayoutEdit(event, 'prepHint', STAGE_LAYOUT.prepHint)}
          style={{
            ...getLayout('prepHint', STAGE_LAYOUT.prepHint),
            zIndex: getRenderZIndex('prepHint', getLayout('prepHint', STAGE_LAYOUT.prepHint)),
            ['--rotation' as string]: `${getLayout('prepHint', STAGE_LAYOUT.prepHint).rotation ?? '0'}deg`,
          }}
        >
          <div className={`prep-copy ${mochiPromptActive ? 'cat mochi-prompt' : instructionTone}`}>
            {recipeReadyToFinish && !catNeedsPet ? (
              <button
                type="button"
                className="prep-action-button"
                data-testid="prep-action-button"
                aria-disabled={catNeedsPet}
                onClick={(event) => {
                  event.stopPropagation()
                  if (!editMode) {
                    finishRecipe()
                  }
                }}
              >
                <img src={getRecipeThumbnail(recipe)} alt="" />
                <strong>{recipe.finishLabel}</strong>
              </button>
            ) : (
              <>
                <strong className="prep-copy-text desktop-copy">{desktopPrepInstruction}</strong>
                <strong className="prep-copy-text mobile-copy">{mobilePrepInstruction}</strong>
              </>
            )}
          </div>
          <ResizeHandle editMode={editMode} onPointerDown={(event) => startLayoutEdit(event, 'prepHint', STAGE_LAYOUT.prepHint, 'resize')} />
        </div>

        <button
          type="button"
          className={`layout-edit-target finish-action ${recipeReadyToFinish ? 'ready' : 'not-ready'}`}
          data-testid="finish-button"
          data-layout-label="Finish button"
          aria-disabled={!recipeReadyToFinish || catNeedsPet}
          onPointerDown={(event) => startLayoutEdit(event, 'finishButton', STAGE_LAYOUT.finishButton)}
          onClick={(event) => {
            if (editMode) {
              event.preventDefault()
              return
            }
            finishRecipe()
          }}
          style={{
            ...getLayout('finishButton', STAGE_LAYOUT.finishButton),
            zIndex: getRenderZIndex('finishButton', getLayout('finishButton', STAGE_LAYOUT.finishButton)),
            ['--rotation' as string]: `${getLayout('finishButton', STAGE_LAYOUT.finishButton).rotation ?? '0'}deg`,
          }}
        >
          <img src={getRecipeThumbnail(recipe)} alt="" />
          <strong>{recipe.finishLabel}</strong>
          <ResizeHandle editMode={editMode} onPointerDown={(event) => startLayoutEdit(event, 'finishButton', STAGE_LAYOUT.finishButton, 'resize')} />
        </button>

        <div
          className={`layout-edit-target mochi-layer ${mochiPromptActive ? 'needs-pet' : ''} ${mochiCelebrating ? 'celebrating' : ''}`}
          data-layout-label="Mochi"
          onPointerDown={(event) => startLayoutEdit(event, 'mochi', STAGE_LAYOUT.mochi)}
          style={{
            ...getLayout('mochi', STAGE_LAYOUT.mochi),
            zIndex: getRenderZIndex('mochi', getLayout('mochi', STAGE_LAYOUT.mochi)),
            ['--image-scale' as string]: getLayout('mochi', STAGE_LAYOUT.mochi).imageScale ?? '1',
            ['--rotation' as string]: `${getLayout('mochi', STAGE_LAYOUT.mochi).rotation ?? '0'}deg`,
          }}
        >
          <button
            type="button"
            aria-label="Mochi"
            data-testid="mochi-button"
            className={`cat-button ${mochiPromptActive ? 'active' : ''}`}
            onClick={() => {
              if (!editMode) {
                petCat()
              }
            }}
          >
            <img src="/assets/characters/mochi.png" alt="Mochi" className="cat-art" />
            {mochiPromptActive ? <span className="cat-bubble">pet?</span> : null}
          </button>
          {mochiCelebrating ? <div className="mochi-heart-burst" aria-hidden="true">♥</div> : null}
          <ResizeHandle editMode={editMode} onPointerDown={(event) => startLayoutEdit(event, 'mochi', STAGE_LAYOUT.mochi, 'resize')} />
        </div>

        {mochiFocusActive ? (
          <>
            <div className="mochi-focus-scrim" aria-hidden="true" />
            <button type="button" className="focus-credits-toggle" onClick={() => setCreditsOpen(true)}>
              Credits
            </button>
          </>
        ) : null}

        {akariBubbleMode && !creditsOpen && !conceptOpen ? (
          <div className={`akari-thought-bubble ${akariBubbleMode}`} role="status" aria-live="polite">
            {akariBubbleMode === 'cat' ? (
              <>
                <strong>Tap Mochi to keep cooking.</strong>
                <span>Mochi will be happy.</span>
              </>
            ) : (
              <>
                <strong>All set.</strong>
                <span>Tap {recipe.finishLabel}.</span>
              </>
            )}
          </div>
        ) : null}

        {toast ? <div className={`game-toast ${toastTone}`}>{toast}</div> : null}

        <section className="ui-layer" aria-label="Game status">
          <div className="stage-title">Kawaii Cat Cafe</div>
          <div className="mini-score-strip" aria-live="polite">
            <span>Points: {score}</span>
          </div>

          <article
            ref={recipeNoteRef}
            className={`layout-edit-target recipe-note ${catNeedsPet ? 'pet-needed' : ''} ${compactRecipeNote ? 'compact-steps' : ''}`}
            data-layout-label="Recipe note"
            onPointerDown={(event) => startLayoutEdit(event, 'recipe', STAGE_LAYOUT.recipe)}
            style={{
              ...getLayout('recipe', STAGE_LAYOUT.recipe),
              zIndex: getRenderZIndex('recipe', getLayout('recipe', STAGE_LAYOUT.recipe)),
              ['--mochi-progress' as string]: mochiTimerProgress,
              ['--rotation' as string]: `${getLayout('recipe', STAGE_LAYOUT.recipe).rotation ?? '-1.4'}deg`,
            }}
          >
            <div
              className={`recipe-timer-border ${catNeedsPet ? 'empty' : ''}`}
              data-testid="mochi-mood-meter"
              aria-label={`Mochi pet timer ${mochiSecondsLeft} seconds left`}
            />
            <div className="recipe-pin" aria-hidden="true" />
            <div className="order-hero">
              <img src={getRecipeThumbnail(recipe)} alt="" className="order-thumb" />
              <div>
                <strong>{recipe.name}</strong>
                <small>
                  {chef.name} · {placedIngredients.length}/{recipe.ingredients.length}
                </small>
              </div>
            </div>
            <ol className="recipe-checklist">
              {recipe.ingredients.map((ingredient, index) => {
                const done = placedIngredients.length > index
                const current = placedIngredients.length === index
                const meta = INGREDIENT_META[ingredient]

                return (
                  <li key={ingredient} className={`${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                    <span
                      className="ingredient-badge"
                      style={{ ['--ingredient-tint' as string]: meta.tint, ['--ingredient-accent' as string]: meta.accent }}
                    >
                      <img src={meta.image} alt="" />
                    </span>
                    <div>
                      <strong>{ingredient}</strong>
                      <small>{done ? 'Done' : current ? 'Next' : meta.subtitle}</small>
                    </div>
                  </li>
                )
              })}
            </ol>
            <ResizeHandle editMode={editMode} onPointerDown={(event) => startLayoutEdit(event, 'recipe', STAGE_LAYOUT.recipe, 'resize')} />
          </article>

          <div className={`layout-editor ${editMode ? 'open' : ''}`}>
            <button type="button" className="music-toggle" onClick={toggleMusic} aria-pressed={musicEnabled}>
              {musicEnabled ? (musicStarted ? 'Music On' : 'Music Ready') : 'Music Off'}
            </button>
            <button type="button" className="credits-toggle" onClick={() => setCreditsOpen(true)}>
              Credits
            </button>
            {editMode ? (
              <>
                <button type="button" onClick={() => setEditMode(false)}>Done Layout</button>
                <button type="button" onClick={copyLayout}>Copy JSON</button>
                <button type="button" onClick={resetLayout}>Reset</button>
              </>
            ) : null}
          </div>

          {creditsOpen ? (
            <div
              className="credits-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="credits-title"
              onClick={() => setCreditsOpen(false)}
            >
              <div className="credits-panel" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="credits-close" aria-label="Close credits" onClick={() => setCreditsOpen(false)}>
                  x
                </button>
                <a
                  id="credits-title"
                  className="credits-title"
                  href="https://youtube.com/playlist?list=PLhhleIn9mEjhNAztK55u86m13lu6xpqoM&si=QUe8safgKSOMwsG5"
                  target="_blank"
                  rel="noreferrer"
                >
                  PIK Composition Contest 2026
                </a>
                <p>
                  <span>Original music and characters by</span>
                  <a
                    href="https://youtu.be/-HrfhpKqa1M?si=AvwrTodbaiPvLMZg"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Janelle Y.
                  </a>
                </p>
                <p>
                  <span>Game design and development by</span>
                  <a href="mailto:binhanhpiano96@gmail.com">Le Binh Anh Nguyen</a>
                </p>
              </div>
            </div>
          ) : null}

          {conceptOpen ? (
            <div
              className="concept-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Original game concept artwork"
              onClick={() => setConceptOpen(false)}
            >
              <div className="concept-panel" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="credits-close" aria-label="Close concept art" onClick={() => setConceptOpen(false)}>
                  x
                </button>
                <img src="/assets/backgrounds/gameconcept.jpeg" alt="Original Kawaii Cat Cafe game concept by Janelle Y" />
              </div>
            </div>
          ) : null}

          {editMode ? (
            <>
            <aside className={`layout-inspector ${inspectorCollapsed ? 'collapsed' : ''}`} aria-label="Layout inspector">
              <div className="inspector-heading">
                <div>
                  <strong>Layout editor</strong>
                  <small>Click an object, then tune its box and depth.</small>
                </div>
                <button type="button" className="inspector-collapse" onClick={() => setInspectorCollapsed((value) => !value)}>
                  {inspectorCollapsed ? 'Open' : 'Hide'}
                </button>
              </div>

              {!inspectorCollapsed ? (
                <>
                  <label className="inspector-select">
                    <span>Selected</span>
                    <select value={selectedLayoutId} onChange={(event) => setSelectedLayoutId(event.target.value)}>
                      {layoutRows.map((row) => (
                        <option key={row.id} value={row.id}>{row.label}</option>
                      ))}
                    </select>
                  </label>

                  <div className="inspector-grid">
                    <NumberControl label="Left" value={percentToNumber(selectedLayout.left)} step={0.5} onChange={(value) => updateLayoutNumber(selectedLayoutId, 'left', value)} />
                    <NumberControl label="Top" value={percentToNumber(selectedLayout.top)} step={0.5} onChange={(value) => updateLayoutNumber(selectedLayoutId, 'top', value)} />
                    <NumberControl label="Hit W" value={percentToNumber(selectedLayout.width)} step={0.5} onChange={(value) => updateLayoutNumber(selectedLayoutId, 'width', value)} />
                    <NumberControl label="Hit H" value={percentToNumber(selectedLayout.height ?? selectedLayout.width)} step={0.5} onChange={(value) => updateLayoutNumber(selectedLayoutId, 'height', value)} />
                    <NumberControl label="Art scale" value={Number.parseFloat(selectedLayout.imageScale ?? '1')} min={0.5} max={5} step={0.05} onChange={(value) => updateLayoutNumber(selectedLayoutId, 'imageScale', value)} />
                    <NumberControl label="Rotate" value={Number.parseFloat(selectedLayout.rotation ?? '0')} min={-45} max={45} step={0.5} onChange={(value) => updateLayoutNumber(selectedLayoutId, 'rotation', value)} />
                    <NumberControl label="Layer" value={selectedLayout.zIndex ?? 1} min={0} max={99} step={1} onChange={(value) => updateLayoutNumber(selectedLayoutId, 'zIndex', value)} />
                  </div>

                  <div className="layout-position-table" aria-label="Current layout values">
                    <div className="table-head">
                      <span>Thing</span>
                      <span>L</span>
                      <span>T</span>
                      <span>W</span>
                      <span>H</span>
                      <span>S</span>
                      <span>R</span>
                      <span>Z</span>
                    </div>
                    {layoutRows.map((row) => {
                      const rowLayout = getLayout(row.id, row.fallback)

                      return (
                        <button
                          key={row.id}
                          type="button"
                          className={row.id === selectedLayoutId ? 'selected-row' : ''}
                          onClick={() => setSelectedLayoutId(row.id)}
                        >
                          <span>{row.label}</span>
                          <span>{formatPercent(rowLayout.left)}</span>
                          <span>{formatPercent(rowLayout.top)}</span>
                          <span>{formatPercent(rowLayout.width)}</span>
                          <span>{formatPercent(rowLayout.height ?? rowLayout.width)}</span>
                          <span>{formatNumber(rowLayout.imageScale ?? '1')}</span>
                          <span>{formatNumber(rowLayout.rotation ?? '0')}</span>
                          <span>{rowLayout.zIndex ?? 1}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : null}
            </aside>
            <InlineLayoutEditor
              layout={selectedLayout}
              label={layoutRows.find((row) => row.id === selectedLayoutId)?.label ?? selectedLayoutId}
              onChange={(key, value) => updateLayoutNumber(selectedLayoutId, key, value)}
            />
            </>
          ) : null}
        </section>
      </main>
    </div>
  )
}

function LiveDish({
  recipe,
  placedIngredients,
}: {
  recipe: Recipe
  placedIngredients: string[]
}) {
  const count = placedIngredients.length
  const assetLayers = RECIPE_LAYER_ASSETS[recipe.id]

  if (assetLayers) {
    return (
      <div className={`live-dish image-dish ${recipe.id}-image-dish`}>
        {recipe.ingredients.map((ingredient, index) => (
          <img
            key={ingredient}
            src={assetLayers[ingredient]}
            alt=""
            className={`dish-layer ${count > index ? 'visible' : ''}`}
            draggable={false}
          />
        ))}
      </div>
    )
  }

  if (recipe.id === 'cookie') {
    return (
      <div className="live-dish cookie-preview">
        <div className={`cookie-base ${count >= 1 ? 'visible' : ''}`} />
        <div className={`cookie-sugar ${count >= 2 ? 'visible' : ''}`}>✦ ✦ ✦</div>
        <div className={`cookie-icing ${count >= 3 ? 'visible' : ''}`}>🐾</div>
      </div>
    )
  }

  if (recipe.id === 'pancake') {
    return (
      <div className="live-dish pancake-preview">
        <div className="plate" />
        <div className={`pancake-stack ${count >= 1 ? 'visible' : ''}`} />
        <div className={`berry-layer ${count >= 2 ? 'visible' : ''}`}>🍓 🍓 🍓</div>
        <div className={`cream-top ${count >= 3 ? 'visible' : ''}`}>🍦</div>
      </div>
    )
  }

  if (recipe.id === 'latte') {
    return (
      <div className="live-dish latte-preview">
        <div className="cup-outline">
          <div className={`latte-layer matcha ${count >= 1 ? 'visible' : ''}`} />
          <div className={`latte-layer milk ${count >= 2 ? 'visible' : ''}`} />
          <div className={`latte-layer honey ${count >= 3 ? 'visible' : ''}`}>🍯</div>
        </div>
      </div>
    )
  }

  return (
    <div className="live-dish soda-preview">
      <div className="glass-outline">
        <div className={`soda-layer syrup ${count >= 1 ? 'visible' : ''}`} />
        <div className={`soda-layer bubbles ${count >= 2 ? 'visible' : ''}`}>🫧</div>
        <div className={`soda-layer ice ${count >= 3 ? 'visible' : ''}`}>🧊 🧊</div>
      </div>
    </div>
  )
}

function ResizeHandle({
  editMode,
  onPointerDown,
}: {
  editMode: boolean
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
}) {
  if (!editMode) {
    return null
  }

  return <span className="layout-resize-handle" aria-hidden="true" onPointerDown={onPointerDown} />
}

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function InlineLayoutEditor({
  layout,
  label,
  onChange,
}: {
  layout: IngredientLayout
  label: string
  onChange: (key: keyof IngredientLayout, value: number) => void
}) {
  return (
    <div
      className="layout-inline-editor"
      style={{ left: layout.left, top: layout.top }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <strong>{label}</strong>
      <NumberControl label="L" value={percentToNumber(layout.left)} step={0.5} onChange={(value) => onChange('left', value)} />
      <NumberControl label="T" value={percentToNumber(layout.top)} step={0.5} onChange={(value) => onChange('top', value)} />
      <NumberControl label="W" value={percentToNumber(layout.width)} step={0.5} onChange={(value) => onChange('width', value)} />
      <NumberControl label="H" value={percentToNumber(layout.height ?? layout.width)} step={0.5} onChange={(value) => onChange('height', value)} />
      <NumberControl label="S" value={Number.parseFloat(layout.imageScale ?? '1')} min={0.5} max={5} step={0.05} onChange={(value) => onChange('imageScale', value)} />
      <NumberControl label="R" value={Number.parseFloat(layout.rotation ?? '0')} min={-45} max={45} step={0.5} onChange={(value) => onChange('rotation', value)} />
      <NumberControl label="Z" value={layout.zIndex ?? 1} min={0} max={99} step={1} onChange={(value) => onChange('zIndex', value)} />
    </div>
  )
}

function getRecipeThumbnail(recipe: Recipe) {
  const assetLayers = RECIPE_LAYER_ASSETS[recipe.id]
  const finalIngredient = recipe.ingredients[recipe.ingredients.length - 1]

  return assetLayers?.[finalIngredient] ?? INGREDIENT_META[recipe.ingredients[0]].image
}

function loadBestScore() {
  if (typeof window === 'undefined') {
    return 0
  }

  const value = Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0)
  return Number.isFinite(value) ? value : 0
}

function loadInitialEditMode() {
  if (typeof window === 'undefined') {
    return false
  }

  return new URLSearchParams(window.location.search).has('edit')
}

function loadLayoutOverrides(): Record<string, IngredientLayout> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) ?? '{}') as Record<string, IngredientLayout>

    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return sanitizeLayoutOverrides(parsed)
  } catch {
    return {}
  }
}

function sanitizeLayoutOverrides(overrides: Record<string, IngredientLayout>) {
  return Object.entries(overrides).reduce<Record<string, IngredientLayout>>((cleaned, [id, layout]) => {
    if (!isUsableLayout(layout)) {
      return cleaned
    }

    const limits = getLayoutResizeLimits(id)
    const imageScale = Number.parseFloat(layout.imageScale ?? '1')
    const rotation = Number.parseFloat(layout.rotation ?? '0')
    const zIndex = Number(layout.zIndex ?? getDefaultZIndex(id))
    cleaned[id] = {
      left: `${roundPercent(clamp(percentToNumber(layout.left), -8, 96))}%`,
      top: `${roundPercent(clamp(percentToNumber(layout.top), -8, 96))}%`,
      width: `${roundPercent(clamp(percentToNumber(layout.width), limits.minWidth, limits.maxWidth))}%`,
      height: `${roundPercent(clamp(percentToNumber(layout.height ?? layout.width), limits.minHeight, limits.maxHeight))}%`,
      imageScale: String(roundPercent(clamp(imageScale, 0.5, 5))),
      rotation: String(roundPercent(clamp(Number.isFinite(rotation) ? rotation : 0, -45, 45))),
      zIndex: Math.round(clamp(Number.isFinite(zIndex) ? zIndex : getDefaultZIndex(id), 0, 99)),
    }

    return cleaned
  }, {})
}

function isUsableLayout(layout: IngredientLayout | undefined) {
  return Boolean(
    layout &&
      typeof layout.left === 'string' &&
      typeof layout.top === 'string' &&
      typeof layout.width === 'string' &&
      Number.isFinite(Number.parseFloat(layout.left)) &&
      Number.isFinite(Number.parseFloat(layout.top)) &&
      Number.isFinite(Number.parseFloat(layout.width)),
  )
}

function getLayoutResizeLimits(id: string) {
  if (id.startsWith('ingredient:')) {
    return { minWidth: 4, maxWidth: 13, minHeight: 4, maxHeight: 11 }
  }

  if (id === 'mochi') {
    return { minWidth: 7, maxWidth: 22, minHeight: 6, maxHeight: 18 }
  }

  return { minWidth: 3, maxWidth: 70, minHeight: 3, maxHeight: 70 }
}

function getDefaultZIndex(id: string) {
  if (id.startsWith('ingredient:')) {
    return 1
  }

  if (id === 'recipe') {
    return 4
  }

  return 1
}

function getRenderZIndex(id: string, layout: IngredientLayout) {
  const localZ = Math.round(clamp(Number(layout.zIndex ?? getDefaultZIndex(id)), 0, 99))

  if (id.startsWith('ingredient:')) {
    return localZ
  }

  const safeBases: Record<string, number> = {
    prep: 35,
    prepHit: 42,
    prepHint: 43,
    finishButton: 44,
    mochi: 45,
    recipe: 50,
  }

  return (safeBases[id] ?? 30) + localZ
}

function getFallbackLayout(id: string): IngredientLayout {
  if (id.startsWith('ingredient:')) {
    return INGREDIENT_LAYOUT[id.replace('ingredient:', '')] ?? { left: '50%', top: '50%', width: '8%', height: '8%' }
  }

  return STAGE_LAYOUT[id] ?? { left: '50%', top: '50%', width: '10%', height: '10%' }
}

function getLayoutRows(overrides: Record<string, IngredientLayout>) {
  const stageRows = ['recipe', 'prep', 'prepHit', 'prepHint', 'finishButton', 'mochi', 'yuto', 'akari'].map((id) => ({
    id,
    label: STAGE_LAYOUT_LABELS[id],
    fallback: STAGE_LAYOUT[id],
  }))

  const ingredientRows = ALL_INGREDIENTS.map((ingredient) => ({
    id: `ingredient:${ingredient}`,
    label: ingredient,
    fallback: INGREDIENT_LAYOUT[ingredient],
  }))

  return [...stageRows, ...ingredientRows].map((row) => ({
    ...row,
    fallback: { ...row.fallback, ...overrides[row.id] },
  }))
}

function formatPercent(value: string) {
  return roundPercent(percentToNumber(value))
}

function formatNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? roundPercent(parsed) : 0
}

function maybeStoreBest(score: number, best: number, setBest: (value: number) => void) {
  if (typeof window === 'undefined' || score <= best) {
    return
  }

  window.localStorage.setItem(BEST_SCORE_KEY, String(score))
  setBest(score)
}

function percentToNumber(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default App
