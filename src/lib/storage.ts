import { User, Transaction, GameHistory, Quest } from '@/types';
import { INITIAL_QUESTS } from './quests';

const STORAGE_KEYS = {
  USER: 'casino_user',
  TRANSACTIONS: 'casino_transactions',
  GAME_HISTORY: 'casino_game_history',
  QUESTS: 'casino_quests',
  PROMO_CODES: 'casino_promo_codes',
  USED_PROMO_CODES: 'casino_used_promo_codes',
} as const;

export interface PromoCode {
  code: string;
  type: 'currency' | 'multiplier' | 'crypto';
  value: number;
  duration?: number; // In seconds, for multipliers
  rewardText: string;
  maxUses: number;
  usedCount: number;
  cryptoSymbol?: string;
  isActive: boolean;
  isUnlimited: boolean;
}

export function getUser(): User {
  const stored = localStorage.getItem(STORAGE_KEYS.USER);
  if (stored) {
    return JSON.parse(stored);
  }
  
  const newUser: User = {
    id: crypto.randomUUID(),
    username: 'Player',
    balance: 1000,
    bankBalance: 0,
    vipLevel: 1,
    totalWagered: 0,
    createdAt: new Date().toISOString(),
    hasDeposited: false,
  };
  
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
  return newUser;
}

export function saveUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function getTransactions(): Transaction[] {
  const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return stored ? JSON.parse(stored) : [];
}

export function addTransaction(transaction: Omit<Transaction, 'id' | 'timestamp'>): void {
  const transactions = getTransactions();
  const newTransaction: Transaction = {
    ...transaction,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  transactions.unshift(newTransaction);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions.slice(0, 100)));
}

export function getGameHistory(): GameHistory[] {
  const stored = localStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
  return stored ? JSON.parse(stored) : [];
}

export function addGameHistory(history: Omit<GameHistory, 'id' | 'timestamp'>): void {
  const histories = getGameHistory();
  const newHistory: GameHistory = {
    ...history,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  histories.unshift(newHistory);
  localStorage.setItem(STORAGE_KEYS.GAME_HISTORY, JSON.stringify(histories.slice(0, 100)));
}

export function getQuests(): Quest[] {
  const stored = localStorage.getItem(STORAGE_KEYS.QUESTS);
  if (stored) {
    return JSON.parse(stored);
  }
  
  const initialQuests: Quest[] = INITIAL_QUESTS.map((q, index) => ({
    ...q,
    id: `quest_${index}`,
    progress: 0,
    completed: false,
    claimed: false,
  }));
  
  localStorage.setItem(STORAGE_KEYS.QUESTS, JSON.stringify(initialQuests));
  return initialQuests;
}

export function saveQuests(quests: Quest[]): void {
  localStorage.setItem(STORAGE_KEYS.QUESTS, JSON.stringify(quests));
}

export function getPromoCodes(): PromoCode[] {
  const stored = localStorage.getItem(STORAGE_KEYS.PROMO_CODES);
  return stored ? JSON.parse(stored) : [];
}

export function savePromoCodes(codes: PromoCode[]): void {
  localStorage.setItem(STORAGE_KEYS.PROMO_CODES, JSON.stringify(codes));
}

export function getUsedPromoCodes(): string[] {
  const stored = localStorage.getItem(STORAGE_KEYS.USED_PROMO_CODES);
  return stored ? JSON.parse(stored) : [];
}

export function saveUsedPromoCodes(codes: string[]): void {
  localStorage.setItem(STORAGE_KEYS.USED_PROMO_CODES, JSON.stringify(codes));
}

export function resetAllData(): void {
  const keysToRemove = [
    STORAGE_KEYS.USER,
    STORAGE_KEYS.TRANSACTIONS,
    STORAGE_KEYS.GAME_HISTORY,
    STORAGE_KEYS.QUESTS,
    STORAGE_KEYS.PROMO_CODES,
    STORAGE_KEYS.USED_PROMO_CODES,
    'admin_cheats',
    'crypto_portfolio',
    'app_language',
    'vip_progress'
  ];
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('casino_') || key.includes('cheats') || key.includes('portfolio'))) {
      localStorage.removeItem(key);
    }
  }
}