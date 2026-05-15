import { VIPLevel } from '@/types';

export const VIP_LEVELS: VIPLevel[] = [
  { level: 1, maxBet: 10000, wagerRequired: 0, benefits: ['Mise max: 10K', 'Cashback 1%'] },
  { level: 2, maxBet: 25000, wagerRequired: 10000, benefits: ['Mise max: 25K', 'Cashback 2%'] },
  { level: 3, maxBet: 50000, wagerRequired: 50000, benefits: ['Mise max: 50K', 'Cashback 3%'] },
  { level: 4, maxBet: 100000, wagerRequired: 200000, benefits: ['Mise max: 100K', 'Cashback 4%'] },
  { level: 5, maxBet: 250000, wagerRequired: 1000000, benefits: ['Mise max: 250K', 'Cashback 5%'] },
  { level: 6, maxBet: 500000, wagerRequired: 5000000, benefits: ['Mise max: 500K', 'Cashback 7%'] },
  { level: 7, maxBet: 1000000, wagerRequired: 20000000, benefits: ['Mise max: 1M', 'Cashback 10%'] },
  { level: 8, maxBet: 5000000, wagerRequired: 100000000, benefits: ['Mise max: 5M', 'Cashback 15%'] },
  { level: 9, maxBet: 10000000, wagerRequired: 500000000, benefits: ['Mise max: 10M', 'Cashback 20%'] },
  { level: 10, maxBet: Infinity, wagerRequired: 1000000000, benefits: ['Mise Illimitée', 'Cashback 25%'] },
];

export function getVIPLevel(totalWagered: number): VIPLevel {
  for (let i = VIP_LEVELS.length - 1; i >= 0; i--) {
    if (totalWagered >= VIP_LEVELS[i].wagerRequired) {
      return VIP_LEVELS[i];
    }
  }
  return VIP_LEVELS[0];
}

export function getNextVIPLevel(currentLevel: number): VIPLevel | null {
  return VIP_LEVELS.find(l => l.level === currentLevel + 1) || null;
}

export function getVIPProgress(totalWagered: number, currentLevel: number): number {
  const nextLevel = getNextVIPLevel(currentLevel);
  if (!nextLevel) return 100;
  
  const currentLevelData = VIP_LEVELS.find(l => l.level === currentLevel);
  if (!currentLevelData) return 0;
  
  const wagerNeeded = nextLevel.wagerRequired - currentLevelData.wagerRequired;
  const wagerProgress = totalWagered - currentLevelData.wagerRequired;
  
  return Math.min(100, (wagerProgress / wagerNeeded) * 100);
}