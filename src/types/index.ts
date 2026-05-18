import { CheatSettings } from '@/lib/cheats';

export interface User {
  id: string;
  username: string;
  password?: string;
  isGuest?: boolean;
  role: 'player' | 'moderator' | 'admin' | 'cheat';
  showBadge: boolean;
  showModBadge: boolean;
  hideFromLeaderboard: boolean;
  hasCheatAccess: boolean;
  cheatExpiresAt?: number | null;
  balance: number;
  bankBalance: number;
  vipLevel: number;
  totalWagered: number;
  createdAt: string;
  hasDeposited?: boolean;
  usedPromoCodes?: string[];
  unlockedTitles?: string[];
  equippedTitle?: string | null;
  lastSeen?: number | null;
  isBanned?: boolean;
  cheats?: CheatSettings;
  version: number;
  activeMultiplier?: {
    value: number;
    expiresAt: number;
  } | null;
  // Titles System
  titleProgress?: Record<string, number>;
  completedTitleChallenges?: string[];
  titleCategoryProgress?: Record<string, number>;
  stats?: {
    totalWins?: Record<string, number>;
    totalLosses?: Record<string, number>;
    maxWinStreak?: number;
    currentWinStreak?: number;
    maxCrashMultiplier?: number;
    crash10xCount?: number;
    plinkoX16Count?: number;
    mines24SuccessCount?: number;
    mines20DiamondsCount?: number;
    rouletteExactWinCount?: number;
    slots3StarsCount?: number;
    diceLowChanceWin?: number;
    maxSingleBet?: number;
    totalCryptoDeposited?: number;
    totalTransferSent?: number;
  };
}

export type TitleRarity = 'Commun' | 'Rare' | 'Épique' | 'Légendaire' | 'Mythique' | 'Divin' | 'Ultime';

export interface TitleChallenge {
  id: string;
  title: string;
  description: string;
  rarity: TitleRarity;
  category: 'Casino' | 'Économie' | 'Défis Rares' | 'ULTIME';
  target: number;
  rewardTitle: string;
  nextChallengeId?: string;
  isHidden?: boolean;
  statKey?: string; // Key in stats object to track
}

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  avgBuyPrice: number;
}

export interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss';
  amount: number;
  game?: string;
  timestamp: string;
  balanceAfter: number;
}

export interface GameHistory {
  id: string;
  userId: string;
  game: string;
  betAmount: number;
  result: 'win' | 'loss';
  payout: number;
  multiplier: number;
  timestamp: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'play' | 'wager' | 'win' | 'streak' | 'vip';
  game?: string; // Add game field for quest matching
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

export interface BetSlip {
  id: string;
  matches: SportsBet[];
  type: 'single' | 'combo';
  stake: number;
  potentialWin: number;
  status: 'pending' | 'won' | 'lost';
}

export interface SportsBet {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  selectedOutcome?: 'home' | 'draw' | 'away';
}

export type GameType = 'coinflip' | 'mines' | 'dice' | 'plinko' | 'crash' | 'slots' | 'roulette';

export interface VIPLevel {
  level: number;
  maxBet: number;
  wagerRequired: number;
  benefits: string[];
}