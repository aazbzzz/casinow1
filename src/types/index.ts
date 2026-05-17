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
  isBanned?: boolean;
  cheats?: CheatSettings;
  version: number;
  activeMultiplier?: {
    value: number;
    expiresAt: number;
  } | null;
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