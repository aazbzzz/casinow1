import { User, Transaction, GameHistory, Quest } from '@/types';
import { INITIAL_QUESTS } from './quests';
import { sendEvent } from '@aippy/runtime/leaderboard';
import tweaksConfig from '@/config/tweaksConfig.json';

const STORAGE_KEYS = {
  USER: 'casino_user',
  USERS_DB: 'casino_users_db', // Simuler une base de données d'utilisateurs
  CURRENT_USER_ID: 'casino_current_user_id',
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

export function getAllUsers(): User[] {
  const stored = localStorage.getItem(STORAGE_KEYS.USERS_DB);
  return stored ? JSON.parse(stored) : [];
}

export function saveAllUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
}

export function getUser(): User {
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  const users = getAllUsers();
  
  if (currentId) {
    const user = users.find(u => u.id === currentId);
    if (user) return user;
  }
  
  // Fallback or legacy support
  const legacyStored = localStorage.getItem(STORAGE_KEYS.USER);
  if (legacyStored) {
    const user = JSON.parse(legacyStored);
    // Migrate legacy user to DB if not exists
    if (!users.find(u => u.id === user.id)) {
      users.push(user);
      saveAllUsers(users);
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    return user;
  }

  // No user found, but we won't create one here anymore to force Auth
  // We'll return a default object but AuthModal should handle the creation
  return {
    id: '',
    username: 'Guest',
    balance: 0,
    bankBalance: 0,
    vipLevel: 1,
    totalWagered: 0,
    createdAt: new Date().toISOString(),
    hasDeposited: false,
  };
}

export function saveUser(user: User): void {
  if (!user.id) return;
  
  const users = getAllUsers();
  const index = users.findIndex(u => u.id === user.id);
  
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  
  saveAllUsers(users);
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
  // Keep legacy for safety
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
}

export function getTransactions(): Transaction[] {
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!currentId) return [];
  const stored = localStorage.getItem(`${STORAGE_KEYS.TRANSACTIONS}_${currentId}`);
  return stored ? JSON.parse(stored) : [];
}

export function addTransaction(transaction: Omit<Transaction, 'id' | 'timestamp'>): void {
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!currentId) return;
  const transactions = getTransactions();
  const newTransaction: Transaction = {
    ...transaction,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  transactions.unshift(newTransaction);
  localStorage.setItem(`${STORAGE_KEYS.TRANSACTIONS}_${currentId}`, JSON.stringify(transactions.slice(0, 100)));
}

export function getGameHistory(): GameHistory[] {
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!currentId) return [];
  const stored = localStorage.getItem(`${STORAGE_KEYS.GAME_HISTORY}_${currentId}`);
  return stored ? JSON.parse(stored) : [];
}

export function addGameHistory(history: Omit<GameHistory, 'id' | 'timestamp'>): void {
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!currentId) return;
  const histories = getGameHistory();
  const newHistory: GameHistory = {
    ...history,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  histories.unshift(newHistory);
  localStorage.setItem(`${STORAGE_KEYS.GAME_HISTORY}_${currentId}`, JSON.stringify(histories.slice(0, 100)));
}

export function getQuests(): Quest[] {
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!currentId) return [];
  const stored = localStorage.getItem(`${STORAGE_KEYS.QUESTS}_${currentId}`);
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
  
  localStorage.setItem(`${STORAGE_KEYS.QUESTS}_${currentId}`, JSON.stringify(initialQuests));
  return initialQuests;
}

export function saveQuests(quests: Quest[]): void {
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!currentId) return;
  localStorage.setItem(`${STORAGE_KEYS.QUESTS}_${currentId}`, JSON.stringify(quests));
}

// Global promo codes logic
export function getPromoCodes(): PromoCode[] {
  // Source 1: LocalStorage (Fallback/Local tests)
  const localStored = localStorage.getItem(STORAGE_KEYS.PROMO_CODES);
  const localCodes: PromoCode[] = localStored ? JSON.parse(localStored) : [];

  // Source 2: Tweaks (Shared Source of Truth)
  // Note: Since tweaks are usually read-only for users, we merge them
  const globalCodesStr = (tweaksConfig as any).globalPromoCodes?.value || "[]";
  let globalCodes: PromoCode[] = [];
  try {
    globalCodes = JSON.parse(globalCodesStr);
  } catch (e) {
    console.error("Failed to parse global codes from tweaks", e);
  }

  // Merge codes by unique code string, preferring local if available for admin tests
  const mergedMap = new Map<string, PromoCode>();
  globalCodes.forEach(p => mergedMap.set(p.code, p));
  localCodes.forEach(p => mergedMap.set(p.code, p));

  return Array.from(mergedMap.values());
}

export function savePromoCodes(codes: PromoCode[]): void {
  localStorage.setItem(STORAGE_KEYS.PROMO_CODES, JSON.stringify(codes));
  // Notify system of new/updated promo code via leaderboard event
  sendEvent('global_promo_codes_update', { 
    codes: JSON.stringify(codes),
    timestamp: Date.now()
  });
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