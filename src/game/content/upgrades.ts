import type { UpgradeDefinition, UpgradeId } from '../simulation/types'

export const UPGRADES: Record<UpgradeId, UpgradeDefinition> = {
  paper_lanterns: {
    id: 'paper_lanterns',
    name: 'Paper Lanterns',
    cost: 22,
    description:
      'Hang soft paper lanterns above the tables so guests linger longer.',
    patienceBonus: 0.12,
  },
}
