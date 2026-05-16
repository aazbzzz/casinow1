import { VIPLevel } from '@/types';

export const VIP_LEVELS: VIPLevel[] = [
  { level: 1, maxBet: 10000, wagerRequired: 0, benefits: ['Mise max: 10K', 'Cashback 1%'] },
  { level: 2, maxBet: 100000, wagerRequired: 100000000, benefits: ['Mise max: 100K', 'Cashback 2%'] },
  { level: 3, maxBet: 500000, wagerRequired: 250000000, benefits: ['Mise max: 500K', 'Cashback 3%'] },
  { level: 4, maxBet: 1000000, wagerRequired: 500000000, benefits: ['Mise max: 1M', 'Cashback 4%'] },
  { level: 5, maxBet: 5000000, wagerRequired: 1000000000, benefits: ['Mise max: 5M', 'Cashback 5%'] },
  { level: 6, maxBet: 10000000, wagerRequired: 2500000000, benefits: ['Mise max: 10M', 'Cashback 7%'] },
  { level: 7, maxBet: 50000000, wagerRequired: 5000000000, benefits: ['Mise max: 50M', 'Cashback 10%'] },
  { level: 8, maxBet: 100000000, wagerRequired: 10000000000, benefits: ['Mise max: 100M', 'Cashback 15%'] },
  { level: 9, maxBet: 500000000, wagerRequired: 25000000000, benefits: ['Mise max: 500M', 'Cashback 20%'] },
  { level: 10, maxBet: Infinity, wagerRequired: 50000000000, benefits: ['Mise Illimitée', 'Cashback 25%'] },
];

export function getVIPLevel(totalWagered: number): VIPLevel {
  const wager = Math.max(0, Number(totalWagered) || 0);
  for (let i = VIP_LEVELS.length - 1; i >= 0; i--) {
    if (wager >= VIP_LEVELS[i].wagerRequired) {
      return VIP_LEVELS[i];
    }
  }
  return VIP_LEVELS[0];
}

export function getVIPLevelByNumber(level: number): VIPLevel {
  const lvl = Math.max(1, Math.floor(Number(level) || 1));
  return VIP_LEVELS.find(l => l.level === lvl) || VIP_LEVELS[0];
}

export function getNextVIPLevel(currentLevel: number): VIPLevel | null {
  const lvl = Math.max(1, Math.floor(Number(currentLevel) || 1));
  return VIP_LEVELS.find(l => l.level === lvl + 1) || null;
}

export function getVIPProgress(totalWagered: number, currentLevel: number): number {
  const wager = Math.max(0, Number(totalWagered) || 0);
  const lvl = Math.max(1, Math.floor(Number(currentLevel) || 1));
  
  const nextLevel = getNextVIPLevel(lvl);
  if (!nextLevel) return 100;
  
  const currentLevelData = VIP_LEVELS.find(l => l.level === lvl) || VIP_LEVELS[0];
  
  const wagerNeeded = Math.max(1, nextLevel.wagerRequired - currentLevelData.wagerRequired);
  const wagerProgress = Math.max(0, wager - currentLevelData.wagerRequired);
  
  const progress = (wagerProgress / wagerNeeded) * 100;
  return isNaN(progress) || !isFinite(progress) ? 0 : Math.min(100, progress);
}