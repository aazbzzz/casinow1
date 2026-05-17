import { VIPLevel } from '@/types';

export const VIP_LEVELS: VIPLevel[] = [
  { 
    level: 1, 
    maxBet: 10000, 
    wagerRequired: 0, 
    benefits: ['Mise max: 10K', 'Cashback 1%'] 
  },
  { 
    level: 2, 
    maxBet: 25000, 
    wagerRequired: 500000, 
    benefits: ['Mise max: 25K', 'Cashback 2%'] 
  },
  { 
    level: 3, 
    maxBet: 50000, 
    wagerRequired: 2500000, 
    benefits: ['Mise max: 50K', 'Cashback 3%'] 
  },
  { 
    level: 4, 
    maxBet: 100000, 
    wagerRequired: 10000000, 
    benefits: ['Mise max: 100K', 'Cashback 4%'] 
  },
  { 
    level: 5, 
    maxBet: 250000, 
    wagerRequired: 50000000, 
    benefits: ['Mise max: 250K', 'Cashback 5%'] 
  },
  { 
    level: 6, 
    maxBet: 500000, 
    wagerRequired: 250000000, 
    benefits: ['Mise max: 500K', 'Cashback 7%'] 
  },
  { 
    level: 7, 
    maxBet: 1000000, 
    wagerRequired: 1000000000, 
    benefits: ['Mise max: 1M', 'Cashback 10%'] 
  },
  { 
    level: 8, 
    maxBet: 5000000, 
    wagerRequired: 5000000000, 
    benefits: ['Mise max: 5M', 'Cashback 15%'] 
  },
  { 
    level: 9, 
    maxBet: 10000000, 
    wagerRequired: 25000000000, 
    benefits: ['Mise max: 10M', 'Cashback 20%'] 
  },
  { 
    level: 10, 
    maxBet: Infinity, 
    wagerRequired: 100000000000, 
    benefits: ['Mise illimitée', 'Cashback 30%'] 
  }
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

export function getVIPProgress(
  totalWagered: number,
  currentLevel: number
): number {
  const wager = Math.max(0, Number(totalWagered) || 0);

  const currentVIP = getVIPLevelByNumber(currentLevel);
  const nextVIP = getNextVIPLevel(currentLevel);

  if (!nextVIP) return 100;

  const currentRequired = currentVIP.wagerRequired;
  const nextRequired = nextVIP.wagerRequired;

  const needed = nextRequired - currentRequired;

  if (needed <= 0) return 100;

  const currentProgress = wager - currentRequired;

  const progress = (currentProgress / needed) * 100;

  return Math.max(0, Math.min(100, progress));
}