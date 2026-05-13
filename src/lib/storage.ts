import { type User, type Quest } from '@/types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  USER_DATA_PREFIX: 'casino_user_data_',
  CURRENT_UID: 'casino_current_uid',
  // On garde ces clés uniquement pour le cache local (performance)
  CACHE_USERS: 'casino_cache_users',
  CACHE_PROMO: 'casino_cache_promo',
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

/**
 * AUTH & UID
 */
export function getCurrentUID(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_UID);
}

export function setCurrentUID(uid: string): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_UID, uid);
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_UID);
}

/**
 * USER MANAGEMENT (CLOUD FIRST)
 */
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
      const user: User = {
        id: data.id,
        username: data.username,
        balance: Number(data.balance) || 0,
        bankBalance: Number(data.bank_balance) || 0,
        vipLevel: Number(data.vip_level) || 1,
        totalWagered: Number(data.total_wagered) || 0,
        createdAt: data.created_at,
        hasDeposited: data.has_deposited,
        usedPromoCodes: data.used_promo_codes || [],
      };
      // Sync local cache
      localStorage.setItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${user.id}`, JSON.stringify(user));
      return user;
    }
  }

  // Fallback cache local
  const stored = localStorage.getItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${targetUid}`);
  return stored ? JSON.parse(stored) : getDefaultUser(targetUid);
}

export async function saveUser(user: User): Promise<void> {
  if (!user.id) return;

  // 1. Mise à jour Cloud (Source de vérité)
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      username: user.username,
      balance: user.balance,
      bank_balance: user.bankBalance,
      vip_level: user.vipLevel,
      total_wagered: user.totalWagered,
      has_deposited: user.hasDeposited,
      used_promo_codes: user.usedPromoCodes || [],
    });
    if (error) console.error("[Supabase] Error saving user:", error);
  }

  // 2. Mise à jour Cache Local (Offline / Fast UI)
  localStorage.setItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${user.id}`, JSON.stringify(user));
}

export async function getAllUsers(): Promise<User[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('balance', { ascending: false });
    
    if (!error && data) {
      const users = data.map(d => ({
        id: d.id,
        username: d.username,
        balance: Number(d.balance) || 0,
        bankBalance: Number(d.bank_balance) || 0,
        vipLevel: Number(d.vip_level) || 1,
        totalWagered: Number(d.total_wagered) || 0,
        createdAt: d.created_at,
        hasDeposited: d.has_deposited,
        usedPromoCodes: d.used_promo_codes || [],
      }));
      localStorage.setItem(STORAGE_KEYS.CACHE_USERS, JSON.stringify(users));
      return users;
    }
  }
  
  const stored = localStorage.getItem(STORAGE_KEYS.CACHE_USERS);
  return stored ? JSON.parse(stored) : [];
}

/**
 * PROMO CODES (CLOUD ONLY)
 */
export async function getGlobalPromoCodes(): Promise<PromoCode[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*');
    
    if (!error && data) {
      const codes = data.map(p => ({
        code: p.code,
        type: p.type as any,
        value: Number(p.value) || 0,
        duration: Number(p.duration) || 0,
        rewardText: p.reward_text,
        maxUses: Number(p.max_uses) || 0,
        usedCount: Number(p.used_count) || 0,
        cryptoSymbol: p.crypto_symbol,
        isActive: p.is_active,
        isUnlimited: p.is_unlimited,
      }));
      localStorage.setItem(STORAGE_KEYS.CACHE_PROMO, JSON.stringify(codes));
      return codes;
    }
  }

  const stored = localStorage.getItem(STORAGE_KEYS.CACHE_PROMO);
  return stored ? JSON.parse(stored) : [];
}

export async function savePromoCodes(codes: PromoCode[]): Promise<void> {
  // 1. Source de vérité : Supabase (upsert groupé)
  if (isSupabaseConfigured()) {
    const dbCodes = codes.map(p => ({
      code: p.code,
      type: p.type,
      value: p.value,
      duration: p.duration,
      reward_text: p.rewardText,
      max_uses: p.maxUses,
      used_count: p.usedCount,
      crypto_symbol: p.cryptoSymbol,
      is_active: p.isActive,
      is_unlimited: p.isUnlimited,
    }));
    const { error } = await supabase.from('promo_codes').upsert(dbCodes);
    if (error) console.error("[Supabase] Error saving promo codes:", error);
  }

  // 2. Mise à jour Cache local
  localStorage.setItem(STORAGE_KEYS.CACHE_PROMO, JSON.stringify(codes));
}

// Fonction utilitaire pour le panel admin
export async function syncPromoCodeToCloud(code: PromoCode): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.from('promo_codes').upsert({
      code: code.code,
      type: code.type,
      value: code.value,
      duration: code.duration,
      reward_text: code.rewardText,
      max_uses: code.maxUses,
      used_count: code.usedCount,
      crypto_symbol: code.cryptoSymbol,
      is_active: code.isActive,
      is_unlimited: code.isUnlimited,
    });
  }
}

/**
 * LEADERBOARD
 */
export async function getGlobalLeaderboard(): Promise<any[]> {
  // Déjà cloud-first via Supabase
  return getAllUsers();
}

/**
 * QUESTS (PER USER - CLOUD SYNC)
 */
export async function getQuests(): Promise<Quest[]> {
  const uid = getCurrentUID();
  if (!uid) return [];

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('user_id', uid);
    
    if (!error && data && data.length > 0) {
      return data.map(q => ({
        id: q.quest_id,
        title: q.title,
        description: q.description,
        reward: q.reward,
        target: q.requirement,
        type: q.type,
        progress: q.progress,
        completed: q.completed,
        claimed: q.claimed
      }));
    }
  }

  const stored = localStorage.getItem(`casino_quests_${uid}`);
  return stored ? JSON.parse(stored) : [];
}

export async function saveQuests(quests: Quest[]): Promise<void> {
  const uid = getCurrentUID();
  if (!uid) return;

  if (isSupabaseConfigured()) {
    // Upsert multiple quests
    const dbQuests = quests.map(q => ({
      user_id: uid,
      quest_id: q.id,
      title: q.title,
      description: q.description,
      reward: q.reward,
      requirement: q.target,
      type: q.type,
      progress: q.progress,
      completed: q.completed,
      claimed: q.claimed
    }));
    await supabase.from('quests').upsert(dbQuests, { onConflict: 'user_id,quest_id' });
  }

  localStorage.setItem(`casino_quests_${uid}`, JSON.stringify(quests));
}

/**
 * TRANSACTIONS & HISTORY (CLOUD SYNC)
 */
export async function addTransaction(transaction: any): Promise<void> {
  const uid = getCurrentUID();
  if (!uid) return;

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('transactions').insert({
      user_id: uid,
      type: transaction.type,
      amount: transaction.amount,
      game: transaction.game,
      balance_after: transaction.balanceAfter,
    });
    if (error) console.error("[Supabase] Error adding transaction:", error);
  }

  // Cache local pour affichage immédiat
  const local = await getTransactions();
  local.unshift({ ...transaction, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
  localStorage.setItem(`casino_transactions_${uid}`, JSON.stringify(local.slice(0, 50)));
}

export async function getTransactions(): Promise<any[]> {
  const uid = getCurrentUID();
  if (!uid) return [];

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', uid)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      const formatted = data.map(t => ({
        type: t.type,
        amount: t.amount,
        game: t.game,
        balanceAfter: t.balance_after,
        timestamp: t.timestamp
      }));
      localStorage.setItem(`casino_transactions_${uid}`, JSON.stringify(formatted));
      return formatted;
    }
  }

  const stored = localStorage.getItem(`casino_transactions_${uid}`);
  return stored ? JSON.parse(stored) : [];
}

export async function addGameHistory(history: any): Promise<void> {
  const uid = getCurrentUID();
  if (!uid) return;

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('game_history').insert({
      user_id: uid,
      game: history.game,
      bet: history.bet,
      multiplier: history.multiplier,
      payout: history.payout,
      outcome: history.outcome,
    });
    if (error) console.error("[Supabase] Error adding history:", error);
  }

  const local = await getGameHistory();
  local.unshift({ ...history, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
  localStorage.setItem(`casino_history_${uid}`, JSON.stringify(local.slice(0, 50)));
}

export async function getGameHistory(): Promise<any[]> {
  const uid = getCurrentUID();
  if (!uid) return [];

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('game_history')
      .select('*')
      .eq('user_id', uid)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      const formatted = data.map(h => ({
        game: h.game,
        bet: h.bet,
        multiplier: h.multiplier,
        payout: h.payout,
        outcome: h.outcome,
        timestamp: h.timestamp
      }));
      localStorage.setItem(`casino_history_${uid}`, JSON.stringify(formatted));
      return formatted;
    }
  }

  const stored = localStorage.getItem(`casino_history_${uid}`);
  return stored ? JSON.parse(stored) : [];
}

/**
 * HELPERS
 */
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

export function getPromoCodes(): PromoCode[] {
  // Cette fonction est synchrone et lit uniquement le cache.
  // Elle est utilisée pour le rendu immédiat de l'UI.
  const stored = localStorage.getItem(STORAGE_KEYS.CACHE_PROMO);
  return stored ? JSON.parse(stored) : [];
}

// Version asynchrone recommandée pour obtenir les données les plus fraîches
export async function fetchPromoCodes(): Promise<PromoCode[]> {
  return getGlobalPromoCodes();
}
