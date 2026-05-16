import type { DayDefinition, DayId } from '../simulation/types'

export const DAY_DEFINITIONS: Record<DayId, DayDefinition> = {
  1: {
    id: 1,
    title: 'Day 1',
    subtitle: 'Soft Opening',
    durationMs: 150000,
    targetOrders: 4,
    maxQueue: 2,
    spawnIntervalMs: 18000,
    availableRecipes: ['sunny_cookie', 'honey_matcha_latte'],
    scriptedOrders: [
      'sunny_cookie',
      'honey_matcha_latte',
      'sunny_cookie',
      'honey_matcha_latte',
    ],
    introLines: [
      'Akari: The sign is up, the cats are brushed, and our first guests are peeking in.',
      'Yuto: Let’s keep it gentle. I’ll handle the baking, and you keep the room warm.',
    ],
    outroLines: [
      'Akari: We made it through our first afternoon together.',
      'Yuto: The regulars are already asking about new sweets for tomorrow.',
    ],
  },
  2: {
    id: 2,
    title: 'Day 2',
    subtitle: 'Twilight Tea Hour',
    durationMs: 185000,
    targetOrders: 6,
    maxQueue: 3,
    spawnIntervalMs: 15000,
    availableRecipes: [
      'sunny_cookie',
      'honey_matcha_latte',
      'berry_cupcake',
    ],
    scriptedOrders: [
      'sunny_cookie',
      'berry_cupcake',
      'honey_matcha_latte',
      'berry_cupcake',
      'sunny_cookie',
      'honey_matcha_latte',
    ],
    introLines: [
      'Akari: The lantern glow looks perfect tonight. We can handle a fuller room now.',
      'Yuto: I finished the new berry sponge. If we stay calm, the rush will feel cozy.',
    ],
    outroLines: [
      'Akari: The cafe feels like home now, even with the tables full.',
      'Yuto: Tomorrow we can dream a little bigger, but tonight this is enough.',
    ],
  },
}
