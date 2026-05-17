import { VIPLevel } from '@/types';

export const VIP_LEVELS: VIPLevel[] = [
  { 
    level: 1, 
    maxBet: 5000, 
    wagerRequired: 0, 
    benefits: ['Mise max: 5K', 'Cashback 1%'] 
  },
  { 
    level: 2, 
    maxBet: 15000, 
    wagerRequired: 50000, 
    benefits: ['Mise max: 15K', 'Cashback 2%', 'Bonus de Niveau'] 
  },
  { 
    level: 3, 
    maxBet: 50000, 
    wagerRequired: 250000, 
    benefits: ['Mise max: 50K', 'Cashback 3%', 'Retraits Prioritaires'] 
  },
  { 
    level: 4, 
    maxBet: 150000, 
    wagerRequired: 1000000, 
    benefits: ['Mise max: 150K', 'Cashback 5%', 'Support VIP'] 
  },
  { 
    level: 5, 
    maxBet: 500000, 
    wagerRequired: 5000000, 
    benefits: ['Mise max: 500K', 'Cashback 7%', 'Hôte Dédié'] 
  },
  { 
    level: 6, 
    maxBet: 1500000, 
    wagerRequired: 25000000, 
    benefits: ['Mise max: 1.5M', 'Cashback 10%', 'Cadeaux Exclusifs'] 
  },
  { 
    level: 7, 
    maxBet: 5000000, 
    wagerRequired: 100000000, 
    benefits: ['Mise max: 5M', 'Cashback 15%', 'Événements VIP'] 
  },
  { 
    level: 8, 
    maxBet: 15000000, 
    wagerRequired: 500000000, 
    benefits: ['Mise max: 15M', 'Cashback 20%', 'Retraits Illimités'] 
  },
  { 
    level: 9, 
    maxBet: 50000000, 
    wagerRequired: 2500000000, 
    benefits: ['Mise max: 50M', 'Cashback 25%', 'Manager de Compte Personnel'] 
  },
  { 
    level: 10, 
    maxBet: Infinity, 
    wagerRequired: 10000000000, 
    benefits: ['Mise illimitée', 'Cashback 35%', 'Statut Légende'] 
  }
];

export function getVIPLevel(totalWagered: number): VIPLevel {
  const wager = Math.max(0, Math.floor(Number(totalWagered) || 0));
  
  // Parcours inversé pour trouver le niveau le plus élevé atteint
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