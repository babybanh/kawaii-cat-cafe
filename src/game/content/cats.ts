import type { CatId, CatProfile } from '../simulation/types'

export const CAT_PROFILES: Record<CatId, CatProfile> = {
  momo: {
    id: 'momo',
    name: 'Momo',
    accent: '#f3b38f',
    portrait: 'Peach tabby',
    favoriteSpot: 'Window perch',
    careActionLabel: 'Brush Momo',
    bonusText: 'Happy Momo slows customer patience loss by 14%.',
    bonusType: 'patience',
    attentionResetMs: 32000,
  },
  tofu: {
    id: 'tofu',
    name: 'Tofu',
    accent: '#f5e4c8',
    portrait: 'Cream loaf',
    favoriteSpot: 'Sun cushion',
    careActionLabel: 'Offer Tofu a toy',
    bonusText: 'Happy Tofu raises tips by 12%.',
    bonusType: 'tips',
    attentionResetMs: 36000,
  },
  sumi: {
    id: 'sumi',
    name: 'Sumi',
    accent: '#786b7f',
    portrait: 'Dusky shadow',
    favoriteSpot: 'Book cart',
    careActionLabel: 'Tidy Sumi’s blanket',
    bonusText: 'Happy Sumi adds 1 extra heart to lovely service.',
    bonusType: 'hearts',
    attentionResetMs: 30000,
  },
}

export const CAT_LIST = Object.values(CAT_PROFILES)
