import type { RecipeDefinition, RecipeId } from '../simulation/types'

export const RECIPE_DEFINITIONS: Record<RecipeId, RecipeDefinition> = {
  sunny_cookie: {
    id: 'sunny_cookie',
    name: 'Sunbeam Cookie',
    shortLabel: 'Cookie',
    description: 'A buttery cat-face cookie with a tiny apricot smile.',
    accent: '#f1aa62',
    baseCoins: 15,
    baseHearts: 2,
    steps: [
      {
        id: 'mix-dough',
        kind: 'prep',
        label: 'Fold butter into the dough',
        detail: 'Blend the pantry bowl until it looks soft and glossy.',
        stationId: 'pantry',
      },
      {
        id: 'golden-bake',
        kind: 'timing',
        label: 'Bake until the edges glow honey-gold',
        detail: 'Stop the oven meter in the golden band for the best crunch.',
        stationId: 'oven',
        targetValue: 0.7,
        window: 0.16,
      },
      {
        id: 'cat-face',
        kind: 'finish',
        label: 'Pipe the cat face',
        detail: 'Add the whisker frosting before the cookie cools.',
        stationId: 'decor',
      },
    ],
  },
  berry_cupcake: {
    id: 'berry_cupcake',
    name: 'Berry Blossom Cupcake',
    shortLabel: 'Cupcake',
    description: 'A fluffy berry sponge topped with a blush-pink swirl.',
    accent: '#d97f88',
    baseCoins: 19,
    baseHearts: 3,
    steps: [
      {
        id: 'whisk-batter',
        kind: 'prep',
        label: 'Whisk the berry batter',
        detail: 'Yuto folds jam through the sponge mix at the pantry.',
        stationId: 'pantry',
      },
      {
        id: 'rise-bake',
        kind: 'timing',
        label: 'Pull the cakes as they rise',
        detail: 'Catch the oven meter just before the cakes dry out.',
        stationId: 'oven',
        targetValue: 0.64,
        window: 0.15,
      },
      {
        id: 'swirl-frosting',
        kind: 'finish',
        label: 'Pipe the frosting swirl',
        detail: 'Finish with a blossom topper at the decorating tray.',
        stationId: 'decor',
      },
    ],
  },
  honey_matcha_latte: {
    id: 'honey_matcha_latte',
    name: 'Honey Matcha Latte',
    shortLabel: 'Latte',
    description: 'A velvety matcha latte with a honey leaf foam.',
    accent: '#8aa36d',
    baseCoins: 14,
    baseHearts: 2,
    steps: [
      {
        id: 'whisk-matcha',
        kind: 'prep',
        label: 'Whisk the matcha base',
        detail: 'Sift matcha and honey at the tea bar until smooth.',
        stationId: 'tea',
      },
      {
        id: 'steam-milk',
        kind: 'timing',
        label: 'Steam the milk until silky',
        detail: 'Stop the tea kettle meter in the soft jade band.',
        stationId: 'tea',
        targetValue: 0.58,
        window: 0.18,
      },
      {
        id: 'leaf-finish',
        kind: 'finish',
        label: 'Pour the honey leaf finish',
        detail: 'Serve the latte with a gentle leaf pattern at the counter.',
        stationId: 'service',
      },
    ],
  },
}

export const RECIPE_LIST = Object.values(RECIPE_DEFINITIONS)
