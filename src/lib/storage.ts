import { type User } from '@/types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  USER_DATA_PREFIX: 'casino_user_data_',
  CURRENT_UID: 'casino_current_uid',
  USERS_DB: 'casino_users_db',
  PROMO_CODES: 'casino_promo_codes',
} as const;

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
  try {
    const url = (supabase as any).supabaseUrl;
    return url && !url.includes('VOTRE_PROJET');
  } catch {
    return false;
  }
};

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
  
  return getDefaultUser(targetUid || undefined);
}

export function getDefaultUser(uid?: string): User {
  return {
    id: uid || 'guest',
    username: 'Player',
    balance: 1000,
    bankBalance: 0,
    vipLevel: 1,
    totalWagered: 0,
    createdAt: new Date().toISOString(),
    hasDeposited: false,
    usedPromoCodes: [],
  };
}

export async function fetchUser(uid?: string): Promise<User> {
  const targetUid = uid || getCurrentUID();
  if (!targetUid) return getDefaultUser();

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetUid)
      .single();
    
    if (!error && data) {
      // Map DB fields to User type
      const user = {
        id: data.id,
        username: data.username,
        balance: data.balance,
        bankBalance: data.bank_balance,
        vipLevel: data.vip_level,
        totalWagered: data.total_wagered,
        createdAt: data.created_at,
        hasDeposited: data.has_deposited,
        usedPromoCodes: data.used_promo_codes || [],
      };
      // Cache locally
      localStorage.setItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${user.id}`, JSON.stringify(user));
      return user;
    }
  }

  return getUser(targetUid);
}

export async function saveUser(user: User): Promise<void> {
  if (!user.id) return;

  if (isSupabaseConfigured()) {
    await supabase.from('users').upsert({
      id: user.id,
      username: user.username,
      balance: user.balance,
      bank_balance: user.bankBalance,
      vip_level: user.vipLevel,
      total_wagered: user.totalWagered,
      has_deposited: user.hasDeposited,
      used_promo_codes: user.usedPromoCodes || [],
    });
  }

  // Always keep a local copy for offline/fast access
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

export async function getGlobalPromoCodes(): Promise<PromoCode[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('is_active', true);
    
    if (!error && data) {
      return data.map(p => ({
        code: p.code,
        type: p.type as any,
        value: p.value,
        duration: p.duration,
        rewardText: p.reward_text,
        maxUses: p.max_uses,
        usedCount: p.used_count,
        cryptoSymbol: p.crypto_symbol,
        isActive: p.is_active,
        isUnlimited: p.is_unlimited,
      }));
    }
  }

  const stored = localStorage.getItem(STORAGE_KEYS.PROMO_CODES);
  return stored ? JSON.parse(stored) : [];
}

export function savePromoCodes(codes: PromoCode[]): void {
  localStorage.setItem(STORAGE_KEYS.PROMO_CODES, JSON.stringify(codes));
}

export function getPromoCodes(): PromoCode[] {
  const stored = localStorage.getItem(STORAGE_KEYS.PROMO_CODES);
  return stored ? JSON.parse(stored) : [];
}

export async function getGlobalLeaderboard(): Promise<any[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, balance, vip_level')
      .order('balance', { ascending: false })
      .limit(50);
    
    if (!error && data) return data;
  }
  
  return getAllUsers().sort((a, b) => b.balance - a.balance).slice(0, 50);
}

export function getAllUsers(): User[] {
  const stored = localStorage.getItem(STORAGE_KEYS.USERS_DB);
  return stored ? JSON.parse(stored) : [];
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_UID);
}

export function getTransactions(): any[] {
  const uid = getCurrentUID();
  if (!uid) return [];
  const stored = localStorage.getItem(`casino_transactions_${uid}`);
  return stored ? JSON.parse(stored) : [];
}

export async function addTransaction(transaction: any): Promise<void> {
  const uid = getCurrentUID();
  if (!uid) return;

  if (isSupabaseConfigured()) {
    await supabase.from('transactions').insert({
      user_id: uid,
      type: transaction.type,
      amount: transaction.amount,
      game: transaction.game,
      balance_after: transaction.balanceAfter,
    });
  }

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

export async function addGameHistory(history: any): Promise<void> {
  const uid = getCurrentUID();
  if (!uid) return;

  if (isSupabaseConfigured()) {
    await supabase.from('game_history').insert({
      user_id: uid,
      game: history.game,
      bet: history.bet,
      multiplier: history.multiplier,
      payout: history.payout,
      outcome: history.outcome,
    });
  }

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
