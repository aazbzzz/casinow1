import { type User } from '@/types';

export interface CheatSettings {
  // Global Cheats
  alwaysWin: boolean;
  customMultiplier: number;
  infiniteBalance: boolean;
  autoPlay: boolean;
  instantWin: boolean;
  instantLoss: boolean;
  freezeBalance: boolean;
  doubleWinnings: boolean;
  tripleWinnings: boolean;
  maxBetOverride: boolean;
  
  // Roulette Cheats
  forceRouletteNumber: number | null;
  forceRouletteColor: 'red' | 'black' | 'green' | null;
  forceRouletteParity: 'even' | 'odd' | null;
  rouletteNextPrediction: boolean;
  rouletteInstantPayout: boolean;
  
  // Slots Cheats
  forceSlotsSymbol: string | null;
  slotsAlwaysJackpot: boolean;
  slotsNoLoss: boolean;
  slotsHighWinRate: boolean;
  
  // Coinflip Cheats
  forceCoinflipSide: 'heads' | 'tails' | null;
  coinflipForceHeads: boolean;
  coinflipForceTails: boolean;
  
  // Dice Cheats
  forceDiceResult: number | null;
  diceAlwaysWin: boolean;
  diceMaxMultiplier: boolean;
  diceForceRoll: number | null;
  
  // Mines Cheats
  forceMinesSafe: boolean;
  minesRevealAll: boolean;
  minesInstantWin: boolean;
  minesMaxMultiplier: boolean;
  minesShowMines: boolean;
  minesForceSafe: boolean;
  minesAutoPick: boolean;
  minesPredictivePath: boolean;
  
  // Crash Cheats
  forceCrashMultiplier: number | null;
  crashNeverCrash: boolean;
  crashMaxMultiplier: boolean;
  crashStartMultiplier: number | null;
  
  // Plinko Cheats
  forcePlinkoWin: boolean;
  plinkoMaxMultiplier: boolean;
}

const DEFAULT_CHEATS: CheatSettings = {
  // Global
  alwaysWin: false,
  customMultiplier: 1,
  infiniteBalance: false,
  autoPlay: false,
  instantWin: false,
  instantLoss: false,
  freezeBalance: false,
  doubleWinnings: false,
  tripleWinnings: false,
  maxBetOverride: false,
  
  // Roulette
  forceRouletteNumber: null,
  forceRouletteColor: null,
  forceRouletteParity: null,
  rouletteNextPrediction: false,
  rouletteInstantPayout: false,
  
  // Slots
  forceSlotsSymbol: null,
  slotsAlwaysJackpot: false,
  slotsNoLoss: false,
  slotsHighWinRate: false,
  
  // Coinflip
  forceCoinflipSide: null,
  coinflipForceHeads: false,
  coinflipForceTails: false,
  
  // Dice
  forceDiceResult: null,
  diceAlwaysWin: false,
  diceMaxMultiplier: false,
  diceForceRoll: null,
  
  // Mines
  forceMinesSafe: false,
  minesRevealAll: false,
  minesInstantWin: false,
  minesMaxMultiplier: false,
  minesShowMines: false,
  minesForceSafe: false,
  minesAutoPick: false,
  minesPredictivePath: false,
  
  // Crash
  forceCrashMultiplier: null,
  crashNeverCrash: false,
  crashMaxMultiplier: false,
  crashStartMultiplier: null,
  
  // Plinko
  forcePlinkoWin: false,
  plinkoMaxMultiplier: false,
};

export function getCheats(user?: User | null): CheatSettings {
  if (!user || (!user.hasCheatAccess && user.role !== 'admin' && user.role !== 'moderator')) {
    return DEFAULT_CHEATS;
  }

  // 1. Priorité aux cheats spécifiques à l'utilisateur (Supabase)
  if (user.cheats) {
    return { ...DEFAULT_CHEATS, ...user.cheats };
  }

  // 2. Fallback aux cheats locaux (Admin sur son propre navigateur)
  const stored = localStorage.getItem('admin_cheats');
  return stored ? { ...DEFAULT_CHEATS, ...JSON.parse(stored) } : DEFAULT_CHEATS;
}

export function saveCheats(cheats: CheatSettings): void {
  localStorage.setItem('admin_cheats', JSON.stringify(cheats));
}

export function isCheatsActive(user?: User | null): boolean {
  const cheats = getCheats(user);
  return Object.entries(cheats).some(([key, value]) => {
    if (key === 'customMultiplier') return value > 1;
    if (typeof value === 'boolean') return value === true;
    if (value === null) return false;
    return true;
  });
}