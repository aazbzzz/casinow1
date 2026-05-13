import { type User } from '@/types';

const STORAGE_KEYS = {
  USER_DATA_PREFIX: 'casino_user_data_', // Prefix for UID-based storage
  CURRENT_UID: 'casino_current_uid',
  USERS_DB: 'casino_users_db',
  PROMO_CODES: 'casino_promo_codes',
} as const;

export interface PromoCode {
  code: string;
  type: 'currency' | 'multiplier' | 'crypto';
  value: number;
  duration?: number;
  rewardText: string;
  maxUses: number;
  usedCount: number;
  cryptoSymbol?: string;
  isActive: boolean;
  isUnlimited: boolean;
}

export function getCurrentUID(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_UID);
}

export function setCurrentUID(uid: string): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_UID, uid);
}

export function getUser(uid?: string): User {
  const targetUid = uid || getCurrentUID();
  
  if (targetUid) {
    const stored = localStorage.getItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${targetUid}`);
    if (stored) return JSON.parse(stored);
  }
  
  // Default user if not found
  return {
    id: targetUid || 'guest',
    username: 'Player',
    balance: 1000,
    bankBalance: 0,
    vipLevel: 1,
    totalWagered: 0,
    createdAt: new Date().toISOString(),
    hasDeposited: false,
  };
}

export function saveUser(user: User): void {
  if (!user.id) return;
  localStorage.setItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${user.id}`, JSON.stringify(user));
  
  // Update local DB for leaderboard fallback
  const users = getAllUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users.slice(0, 100)));
}

export function getAllUsers(): User[] {
  const stored = localStorage.getItem(STORAGE_KEYS.USERS_DB);
  return stored ? JSON.parse(stored) : [];
}

export function savePromoCodes(codes: PromoCode[]): void {
  localStorage.setItem(STORAGE_KEYS.PROMO_CODES, JSON.stringify(codes));
}

export function getPromoCodes(): PromoCode[] {
  const stored = localStorage.getItem(STORAGE_KEYS.PROMO_CODES);
  return stored ? JSON.parse(stored) : [];
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_UID);
}

// Transaction & History storage remains UID-scoped
export function getTransactions(): any[] {
  const uid = getCurrentUID();
  if (!uid) return [];
  const stored = localStorage.getItem(`casino_transactions_${uid}`);
  return stored ? JSON.parse(stored) : [];
}

export function addTransaction(transaction: any): void {
  const uid = getCurrentUID();
  if (!uid) return;
  const transactions = getTransactions();
  transactions.unshift({ ...transaction, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
  localStorage.setItem(`casino_transactions_${uid}`, JSON.stringify(transactions.slice(0, 50)));
}

export function getGameHistory(): any[] {
  const uid = getCurrentUID();
  if (!uid) return [];
  const stored = localStorage.getItem(`casino_history_${uid}`);
  return stored ? JSON.parse(stored) : [];
}

export function addGameHistory(history: any): void {
  const uid = getCurrentUID();
  if (!uid) return;
  const histories = getGameHistory();
  histories.unshift({ ...history, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
  localStorage.setItem(`casino_history_${uid}`, JSON.stringify(histories.slice(0, 50)));
}

export function getQuests(): any[] {
  const uid = getCurrentUID();
  if (!uid) return [];
  const stored = localStorage.getItem(`casino_quests_${uid}`);
  return stored ? JSON.parse(stored) : [];
}

export function saveQuests(quests: any[]): void {
  const uid = getCurrentUID();
  if (!uid) return;
  localStorage.setItem(`casino_quests_${uid}`, JSON.stringify(quests));
}

export function resetAllData(): void {
  localStorage.clear();
}