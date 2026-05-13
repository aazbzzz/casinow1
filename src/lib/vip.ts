import { VIPLevel } from '@/types';

export const VIP_LEVELS: VIPLevel[] = [
  { level: 1, multiplier: 1.00, wagerRequired: 0, benefits: ['Standard gains', 'Cashback 1%'] },
  { level: 2, multiplier: 1.10, wagerRequired: 10000, benefits: ['10% bonus gains', 'Cashback 2%'] },
  { level: 3, multiplier: 1.20, wagerRequired: 50000, benefits: ['20% bonus gains', 'Cashback 3%'] },
  { level: 4, multiplier: 1.30, wagerRequired: 200000, benefits: ['30% bonus gains', 'Cashback 4%'] },
  { level: 5, multiplier: 1.40, wagerRequired: 1000000, benefits: ['40% bonus gains', 'Cashback 5%'] },
  { level: 6, multiplier: 1.50, wagerRequired: 5000000, benefits: ['50% bonus gains', 'Cashback 7%'] },
  { level: 7, multiplier: 1.60, wagerRequired: 20000000, benefits: ['60% bonus gains', 'Cashback 10%'] },
  { level: 8, multiplier: 1.80, wagerRequired: 100000000, benefits: ['80% bonus gains', 'Cashback 15%'] },
  { level: 9, multiplier: 2.00, wagerRequired: 500000000, benefits: ['100% bonus gains', 'Cashback 20%'] },
  { level: 10, multiplier: 2.50, wagerRequired: 1000000000, benefits: ['150% bonus gains', 'Cashback 25%', 'Max Bet Unlocked'] },
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