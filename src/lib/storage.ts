import { type User, type Quest } from '@/types';
import { supabase } from './supabase';
export { supabase };

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

const STORAGE_KEYS = {
  USER_DATA_PREFIX: 'casino_user_data_',
  CURRENT_UID: 'casino_current_uid',
  // On garde ces clés uniquement pour le cache local (performance)
  CACHE_USERS: 'casino_cache_users',
  CACHE_PROMO: 'casino_cache_promo',
} as const;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || 'https://hshjdcxhjzsecsrfecsp.supabase.co';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzaGpkY3hoanpzZWNzcmZlY3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDA4MDcsImV4cCI6MjA5NDI3NjgwN30.pbdD8BB5Zd5nY3LsPG82OThWxK68o0zUZNtX5YHvquU';
  
  return !!url && !!key && !url.includes('VOTRE_PROJET');
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
          // Remove spaces and handle both dot and comma
          let cleaned = val.replace(/\s/g, '');
          if (cleaned.includes(',') && cleaned.includes('.')) {
            if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
              cleaned = cleaned.replace(/,/g, '');
            } else {
              cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            }
          } else {
            cleaned = cleaned.replace(',', '.');
          }
          result = parseFloat(cleaned.replace(/[^0-9.-]/g, '')) || 0;
        }
        
        // NO CEILING: Return the actual value, no matter how high
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
        activeMultiplier: data.active_multiplier || null,
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
      // Remove spaces and handle both dot and comma
      let cleaned = val.replace(/\s/g, '');
      if (cleaned.includes(',') && cleaned.includes('.')) {
        // Assume format like 1,234.56 or 1.234,56
        if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
          cleaned = cleaned.replace(/,/g, ''); // 1,234.56 -> 1234.56
        } else {
          cleaned = cleaned.replace(/\./g, '').replace(',', '.'); // 1.234,56 -> 1234.56
        }
      } else {
        cleaned = cleaned.replace(',', '.');
      }
      const parsed = parseFloat(cleaned.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
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
      active_multiplier: cleanUser.activeMultiplier || null,
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
        activeMultiplier: d.active_multiplier || null,
      }));
      localStorage.setItem(STORAGE_KEYS.CACHE_USERS, JSON.stringify(users));
      return users;
    }
  }
  
  const stored = localStorage.getItem(STORAGE_KEYS.CACHE_USERS);
  return stored ? JSON.parse(stored) : [];
}

/**
 * PROMO CODES (CLOUD FIRST)
 */
export async function getPromoCodes(): Promise<PromoCode[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*');
      
      if (!error && data) {
        const cleanNum = (val: any): number => {
          if (val === null || val === undefined) return 0;
          if (typeof val === 'number') return isNaN(val) ? 0 : val;
          if (typeof val === 'string') {
            const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
            return parseFloat(cleaned) || 0;
          }
          return 0;
        };

        const codes = data.map(p => {
          const rawValue = p.value !== undefined ? p.value : (p.value_amount !== undefined ? p.value_amount : 0);
          return {
            code: p.code,
            type: p.type as any,
            value: cleanNum(rawValue),
            duration: cleanNum(p.duration),
            rewardText: p.reward_text,
            maxUses: cleanNum(p.max_uses),
            usedCount: cleanNum(p.used_count),
            cryptoSymbol: p.crypto_symbol,
            isActive: p.is_active,
            isUnlimited: p.is_unlimited,
          };
        });
        
        localStorage.setItem(STORAGE_KEYS.CACHE_PROMO, JSON.stringify(codes));
        return codes;
      }
    } catch (err) {
      console.error("[storage] Error fetching promo codes from Supabase:", err);
    }
  }

  const stored = localStorage.getItem(STORAGE_KEYS.CACHE_PROMO);
  return stored ? JSON.parse(stored) : [];
}

export async function fetchPromoCodes(): Promise<PromoCode[]> {
  return getPromoCodes();
}

export async function getGlobalPromoCodes(): Promise<PromoCode[]> {
  return getPromoCodes();
}

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
    if (error) {
      console.error("[Supabase] Error syncing promo code:", error);
    } else {
      const current = await getPromoCodes();
      const updated = current.map(c => c.code === code.code ? code : c);
      if (!current.find(c => c.code === code.code)) updated.push(code);
      localStorage.setItem(STORAGE_KEYS.CACHE_PROMO, JSON.stringify(updated));
    }
  }
}

export async function getLeaderboard(limit = 10): Promise<User[]> {
  if (isSupabaseConfigured()) {
    try {
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

        const users = data.map(d => ({
          id: d.id,
          username: d.username,
          balance: cleanDBNum(d.balance),
          bankBalance: cleanDBNum(d.bank_balance),
          vipLevel: cleanDBNum(d.vip_level) || 1,
          totalWagered: cleanDBNum(d.total_wagered),
          createdAt: d.created_at,
          hasDeposited: d.has_deposited,
          usedPromoCodes: d.used_promo_codes || [],
          activeMultiplier: d.active_multiplier || null,
        }));

        localStorage.setItem(STORAGE_KEYS.CACHE_USERS, JSON.stringify(users));
        return users;
      }
    } catch (err) {
      console.error("[storage] Error fetching leaderboard from Supabase:", err);
    }
  }
  
  const stored = localStorage.getItem(STORAGE_KEYS.CACHE_USERS);
  return stored ? JSON.parse(stored) : [];
}

export async function savePromoCodes(codes: PromoCode[]): Promise<void> {
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
  localStorage.setItem(STORAGE_KEYS.CACHE_PROMO, JSON.stringify(codes));
}

export function subscribeToRealtime(table: 'promo_codes' | 'users', callback: (payload: any) => void) {
  if (!isSupabaseConfigured()) return null;

  return supabase
    .channel(`${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
}

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
    const { error } = await supabase.from('transactions').insert(dbData);
    if (error) console.error("[Supabase] Error adding transaction:", error);
  }

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

export async function sendMoney(receiverId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  const senderId = getCurrentUID();
  if (!senderId) return { success: false, error: 'Not logged in' };
  if (senderId === receiverId) return { success: false, error: 'Cannot send to yourself' };

  if (isSupabaseConfigured()) {
    try {
      // 1. Fetch current balances (More robust: find by ID or exact username)
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, bank_balance, username')
        .or(`id.eq.${senderId},id.eq.${receiverId},username.eq.${receiverId}`);

      if (fetchError || !users || users.length < 2) {
        console.error("[storage] sendMoney: User not found", { senderId, receiverId, found: users?.length });
        return { success: false, error: 'User not found' };
      }

      const sender = users.find(u => u.id === senderId);
      const receiver = users.find(u => u.id === receiverId || u.username === receiverId);

      if (!sender || !receiver) return { success: false, error: 'User not found' };
      if (Number(sender.bank_balance) < amount) return { success: false, error: 'Insufficient bank balance' };

      const newSenderBankBalance = Number(sender.bank_balance) - amount;
      const newReceiverBankBalance = Number(receiver.bank_balance) + amount;

      const { error: senderError } = await supabase
        .from('users')
        .update({ bank_balance: newSenderBankBalance })
        .eq('id', senderId);

      if (senderError) throw senderError;

      const { error: receiverError } = await supabase
        .from('users')
        .update({ bank_balance: newReceiverBankBalance })
        .eq('id', receiverId);

      if (receiverError) throw receiverError;

      await supabase.from('transfers').insert({
        sender_id: senderId,
        receiver_id: receiverId,
        amount: amount
      });

      await addTransaction({
        userId: senderId,
        type: 'withdraw',
        amount: -amount,
        game: `Transfer (Bank) to ${receiver.username}`,
        balanceAfter: newSenderBankBalance // Reference bank balance here
      });

      const localSender = getUser(senderId);
      localSender.bankBalance = newSenderBankBalance;
      localStorage.setItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${senderId}`, JSON.stringify(localSender));

      return { success: true };
    } catch (err: any) {
      console.error("[storage] sendMoney error:", err);
      return { success: false, error: err.message || 'Transfer failed' };
    }
  }

  return { success: false, error: 'Cloud sync required for transfers' };
}

export async function getOtherUsers(): Promise<{ id: string; username: string }[]> {
  const currentUid = getCurrentUID();
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username')
      .neq('id', currentUid || '')
      .limit(100);
    
    if (!error && data) return data;
  }
  return [];
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
    activeMultiplier: null,
  };
}

export function resetAllData(): void {
  localStorage.clear();
}
