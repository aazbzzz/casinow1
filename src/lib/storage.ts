import { type User, type Quest } from '@/types';
export { supabase } from './supabase';

const STORAGE_KEYS = {
  USER_DATA_PREFIX: 'casino_user_data_',
  CURRENT_UID: 'casino_current_uid',
  // On garde ces clés uniquement pour le cache local (performance)
  CACHE_USERS: 'casino_cache_users',
  CACHE_PROMO: 'casino_cache_promo',
} as const;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
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
    console.log(`[storage] fetchUser from Supabase:`, { targetUid });
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetUid)
      .single();
    
    if (!error && data) {
      // Nettoyage robuste des nombres venant de la DB (Postgres BIGINT/NUMERIC -> JS Number)
      const cleanDBNum = (val: any, fieldName: string): number => {
        if (val === null || val === undefined) return 0;
        const type = typeof val;
        let result = 0;
        
        if (type === 'number') {
          result = isNaN(val) ? 0 : val;
        } else if (type === 'string') {
          const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
          result = parseFloat(cleaned) || 0;
        }
        
        console.log(`[storage] Type check (${fieldName}):`, { 
          raw: val, 
          rawType: type, 
          cleaned: result, 
          finalType: typeof result 
        });
        return result;
      };

      const rawBalance = data.balance !== undefined ? data.balance : (data as any).balance_amount;
      const rawBank = data.bank_balance !== undefined ? data.bank_balance : (data as any).bank_balance_amount;

      const user: User = {
        id: data.id,
        username: data.username,
        balance: cleanDBNum(rawBalance, 'balance'),
        bankBalance: cleanDBNum(rawBank, 'bank_balance'),
        vipLevel: Math.max(1, cleanDBNum(data.vip_level, 'vip_level')),
        totalWagered: cleanDBNum(data.total_wagered, 'total_wagered'),
        createdAt: data.created_at,
        hasDeposited: !!data.has_deposited,
        usedPromoCodes: data.used_promo_codes || [],
      };
      
      localStorage.setItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${user.id}`, JSON.stringify(user));
      return user;
    }
  }

  const stored = localStorage.getItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${targetUid}`);
  return stored ? JSON.parse(stored) : getDefaultUser(targetUid);
}

export async function saveUser(user: User): Promise<void> {
  if (!user.id) return;

  const cleanNum = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  // On conserve les décimales car nous passons en NUMERIC/DOUBLE PRECISION
  const cleanUser = {
    ...user,
    balance: cleanNum(user.balance),
    bankBalance: cleanNum(user.bankBalance),
    totalWagered: cleanNum(user.totalWagered),
    vipLevel: Math.max(1, Math.floor(cleanNum(user.vipLevel)))
  };

  if (isSupabaseConfigured()) {
    const dbData: any = {
      id: cleanUser.id,
      username: cleanUser.username,
      balance: cleanUser.balance,
      bank_balance: cleanUser.bankBalance,
      vip_level: cleanUser.vipLevel,
      total_wagered: cleanUser.totalWagered,
      has_deposited: cleanUser.hasDeposited,
      used_promo_codes: cleanUser.usedPromoCodes || [],
    };
    
    const { error } = await supabase.from('users').upsert(dbData);
    if (error) {
      console.error("[Supabase] Error saving user (upsert):", error);
    }
  }

  localStorage.setItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${cleanUser.id}`, JSON.stringify(cleanUser));
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
 * PROMO CODES (CLOUD ONLY + REALTIME)
 */
export async function getGlobalPromoCodes(): Promise<PromoCode[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*');
    
    if (!error && data) {
      const cleanNum = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (typeof val === 'string') return parseFloat(val) || 0;
        return 0;
      };

      const codes = data.map(p => ({
        code: p.code,
        type: p.type as any,
        value: cleanNum(p.value),
        duration: cleanNum(p.duration),
        rewardText: p.reward_text,
        maxUses: cleanNum(p.max_uses),
        usedCount: cleanNum(p.used_count),
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

/**
 * Sync Promo Code to Cloud (Upsert)
 */
export async function syncPromoCodeToCloud(code: PromoCode): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('promo_codes').upsert({
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
    if (error) console.error("[Supabase] Error syncing promo code:", error);
  }
}

/**
 * LEADERBOARD (CLOUD ONLY)
 */
export async function getLeaderboard(limit = 10): Promise<User[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('balance', { ascending: false })
      .limit(limit);
    
    if (!error && data) {
      const cleanDBNum = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
        return 0;
      };

      return data.map(d => ({
        id: d.id,
        username: d.username,
        balance: cleanDBNum(d.balance),
        bankBalance: cleanDBNum(d.bank_balance),
        vipLevel: cleanDBNum(d.vip_level) || 1,
        totalWagered: cleanDBNum(d.total_wagered),
        createdAt: d.created_at,
        hasDeposited: d.has_deposited,
        usedPromoCodes: d.used_promo_codes || [],
      }));
    }
  }
  return [];
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

  const cleanNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  if (isSupabaseConfigured()) {
    const dbData = {
      user_id: uid,
      type: transaction.type,
      amount: cleanNum(transaction.amount),
      game: transaction.game,
      balance_after: cleanNum(transaction.balanceAfter),
    };
    console.log(`[storage] addTransaction Supabase:`, dbData);
    const { error } = await supabase.from('transactions').insert(dbData);
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

  const cleanNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  if (isSupabaseConfigured()) {
    const dbData = {
      user_id: uid,
      game: history.game,
      bet: Math.round(cleanNum(history.bet)),
      multiplier: cleanNum(history.multiplier),
      payout: Math.round(cleanNum(history.payout)),
      outcome: history.outcome,
    };
    console.log(`[storage] addGameHistory Supabase:`, dbData);
    const { error } = await supabase.from('game_history').insert(dbData);
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
