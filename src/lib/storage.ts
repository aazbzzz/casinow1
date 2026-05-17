import { type User, type Quest } from '@/types';
import { supabase } from './supabase';
import { getVIPLevel } from './vip';
export { supabase };

export interface PromoCode {
  code: string;
  type: 'currency' | 'multiplier' | 'crypto' | 'cheat_access';
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
  
  // Plus permissif : si on a une URL et une clé, on considère que c'est configuré.
  return !!url && !!key && url !== 'VOTRE_PROJET_URL';
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
  localStorage.removeItem('casino_remembered_account'); // Clear auto-login on logout
}

/**
 * USER MANAGEMENT (CLOUD FIRST)
 * Supabase est la source de vérité unique.
 * localStorage est utilisé uniquement pour le cache (lecture rapide au démarrage).
 */
/**
 * Robust User Mapper
 * Handles both snake_case (DB) and camelCase (JS)
 */
function mapDBUserToUser(data: any): User {
  const cleanDBNum = (val: any, fallback = 0): number => {
    if (val === null || val === undefined) return fallback;
    let num = fallback;
    if (typeof val === 'number') {
      num = isNaN(val) ? fallback : val;
    } else if (typeof val === 'string') {
      let cleaned = val.replace(/\s/g, '');
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      if (lastComma > lastDot) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else if (lastDot > lastComma) {
        cleaned = cleaned.replace(/,/g, '');
      } else {
        cleaned = cleaned.replace(',', '.');
      }
      const parsed = parseFloat(cleaned);
      num = isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
    }
    return Math.ceil(num);
  };

  // Try both snake_case and camelCase for each field
  const totalWagered = Math.max(0, cleanDBNum(data.total_wagered ?? data.totalWagered, 0));
  const balance = Math.max(0, cleanDBNum(data.balance, 0));
  const bankBalance = Math.max(0, cleanDBNum(data.bank_balance ?? data.bankBalance, 0));
  
  // ALWAYS recalculate VIP level from totalWagered to prevent freezing
  // RÈGLE ABSOLUE : VIP = getVIPLevel(totalWagered)
  const computedVip = getVIPLevel(totalWagered);
  const finalVipLevel = computedVip.level;

  console.log("[VIP DB READ]", { 
    raw_total_wagered: data.total_wagered, 
    mapped_total_wagered: totalWagered, 
    raw_vip: data.vip_level, 
    final_vip: finalVipLevel 
  });

  const user: User = {
    id: data.id,
    username: data.username,
    password: data.password,
    role: data.role || 'player',
    showBadge: !!(data.show_badge ?? data.showBadge),
    showModBadge: !!(data.show_mod_badge ?? data.showModBadge),
    hideFromLeaderboard: !!(data.hide_from_leaderboard ?? data.hideFromLeaderboard),
    hasCheatAccess: !!(data.has_cheat_access ?? data.hasCheatAccess),
    cheatExpiresAt: data.cheat_expires_at ?? data.cheatExpiresAt ?? null,
    balance: balance,
    bankBalance: bankBalance,
    vipLevel: finalVipLevel,
    totalWagered: totalWagered,
    createdAt: data.created_at ?? data.createdAt,
    hasDeposited: !!(data.has_deposited ?? data.hasDeposited),
    usedPromoCodes: data.used_promo_codes ?? data.usedPromoCodes ?? [],
    isBanned: !!(data.is_banned ?? data.isBanned),
    cheats: data.cheats || null,
    version: data.version || 0,
    activeMultiplier: data.active_multiplier ?? data.activeMultiplier ?? null,
  };

  return user;
}

export async function fetchUser(uid?: string): Promise<User> {
  const targetUid = uid || getCurrentUID();
  if (!targetUid) return getDefaultUser();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUid)
        .single();
      
      if (!error && data) {
        console.log("[FETCH USER RAW]", data);
        const user = mapDBUserToUser(data);
        localStorage.setItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${user.id}`, JSON.stringify(user));
        return user;
      } else if (error && error.code !== 'PGRST116') {
        console.error("[storage] fetchUser Cloud error:", error);
      }
    } catch (err) {
      console.error("[storage] fetchUser critical error:", err);
    }
  }

  const stored = localStorage.getItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${targetUid}`);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return mapDBUserToUser(parsed);
    } catch (e) {
      return getDefaultUser(targetUid);
    }
  }
  return getDefaultUser(targetUid);
}

export function getUser(uid?: string): User {
  const targetUid = uid || getCurrentUID();
  if (targetUid) {
    const stored = localStorage.getItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${targetUid}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return mapDBUserToUser(parsed);
      } catch (e) {
        console.error("[storage] getUser parse error", e);
      }
    }
  }
  return getDefaultUser(targetUid || undefined);
}

export async function saveUser(user: User): Promise<User> {
  if (!user.id || user.id === 'guest') return user;

  const cleanNum = (val: any, fallback = 0): number => {
    if (val === null || val === undefined) return fallback;
    let num = fallback;
    if (typeof val === 'number') {
      num = isNaN(val) || !isFinite(val) ? fallback : val;
    } else if (typeof val === 'string') {
      let cleaned = val.replace(/\s/g, '');
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      
      if (lastComma > lastDot) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else if (lastDot > lastComma) {
        cleaned = cleaned.replace(/,/g, '');
      } else {
        cleaned = cleaned.replace(',', '.');
      }
      
      const parsed = parseFloat(cleaned);
      num = isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
    }
    return Math.ceil(num);
  };

  const totalWagered = Math.max(0, cleanNum(user.totalWagered, 0));
  const computedVip = getVIPLevel(totalWagered);

  const cleanUser: User = {
    ...user,
    balance: Math.max(0, cleanNum(user.balance, 0)),
    bankBalance: Math.max(0, cleanNum(user.bankBalance, 0)),
    totalWagered: totalWagered,
    vipLevel: computedVip.level,
    version: (user.version || 0) + 1
  };

  console.log("[VIP DB SAVE]", { 
    total_wagered: cleanUser.totalWagered, 
    vip_level: cleanUser.vipLevel 
  });
  
  // Cache local immédiat
  localStorage.setItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${cleanUser.id}`, JSON.stringify(cleanUser));

  if (isSupabaseConfigured()) {
    try {
      const dbData: any = {
        id: cleanUser.id,
        username: cleanUser.username,
        password: cleanUser.password,
        role: cleanUser.role,
        balance: cleanUser.balance,
        bank_balance: cleanUser.bankBalance,
        vip_level: cleanUser.vipLevel,
        total_wagered: cleanUser.totalWagered,
        show_badge: cleanUser.showBadge,
        show_mod_badge: cleanUser.showModBadge,
        hide_from_leaderboard: cleanUser.hideFromLeaderboard,
        has_cheat_access: cleanUser.hasCheatAccess,
        cheat_expires_at: cleanUser.cheatExpiresAt,
        has_deposited: cleanUser.hasDeposited,
        is_banned: cleanUser.isBanned,
        cheats: cleanUser.cheats,
        used_promo_codes: cleanUser.usedPromoCodes,
        active_multiplier: cleanUser.activeMultiplier,
        version: cleanUser.version,
      };
      
      const { error } = await supabase.from('users').upsert(dbData, { onConflict: 'id' });
      if (error) {
        console.error("[storage] saveUser Cloud error:", error);
      } else {
        console.log("[VIP DB SUCCESS]");
      }
    } catch (err) {
      console.error("[storage] saveUser critical error:", err);
    }
  }

  return cleanUser;
}

export async function getAllUsers(): Promise<User[]> {
  if (isSupabaseConfigured()) {
    try {
      console.log("[storage] Fetching all users from Cloud...");
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('balance', { ascending: false });
      
      if (!error && data) {
        const cleanDBNum = (val: any, fallback = 0): number => {
          if (val === null || val === undefined) return fallback;
          let num = fallback;
          if (typeof val === 'number') {
            num = isNaN(val) || !isFinite(val) ? fallback : val;
          } else if (typeof val === 'string') {
            let cleaned = val.replace(/\s/g, '');
            const lastComma = cleaned.lastIndexOf(',');
            const lastDot = cleaned.lastIndexOf('.');
            
            if (lastComma > lastDot) {
              cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else if (lastDot > lastComma) {
              cleaned = cleaned.replace(/,/g, '');
            } else {
              cleaned = cleaned.replace(',', '.');
            }
            const parsed = parseFloat(cleaned);
            num = isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
          }
          return Math.ceil(num);
        };

        const users = data.map(d => ({
          id: d.id,
          username: d.username,
          password: d.password,
          role: d.role || 'player',
          showBadge: !!d.show_badge,
          showModBadge: !!d.show_mod_badge,
          hideFromLeaderboard: !!d.hide_from_leaderboard,
          hasCheatAccess: !!d.has_cheat_access,
          cheatExpiresAt: d.cheat_expires_at || null,
          balance: Math.max(0, cleanDBNum(d.balance, 0)),
          bankBalance: Math.max(0, cleanDBNum(d.bank_balance, 0)),
          vipLevel: Math.max(1, Math.floor(cleanDBNum(d.vip_level, 1))),
          totalWagered: Math.max(0, cleanDBNum(d.total_wagered, 0)),
          createdAt: d.created_at,
          hasDeposited: d.has_deposited,
          isBanned: !!d.is_banned,
          cheats: d.cheats || null,
          version: d.version || 0,
          usedPromoCodes: d.used_promo_codes || [],
          activeMultiplier: d.active_multiplier || null,
        }));
        
        // On met à jour le cache local pour la performance
        localStorage.setItem(STORAGE_KEYS.CACHE_USERS, JSON.stringify(users));
        return users;
      } else if (error) {
        console.error("[storage] getAllUsers Cloud error:", error);
      }
    } catch (err) {
      console.error("[storage] getAllUsers critical error:", err);
    }
  }
  
  console.log("[storage] Falling back to local users cache");
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
        .or('hide_from_leaderboard.eq.false,hide_from_leaderboard.is.null')
        .order('balance', { ascending: false })
        .limit(limit);
      
      if (!error && data) {
        const cleanDBNum = (val: any, fallback = 0): number => {
          if (val === null || val === undefined) return fallback;
          if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? fallback : val;
          if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]/g, '')) || fallback;
          return fallback;
        };

        const users = data.map(d => ({
          id: d.id,
          username: d.username,
          role: d.role || 'player',
          showBadge: !!d.show_badge,
          showModBadge: !!d.show_mod_badge,
          hideFromLeaderboard: !!d.hide_from_leaderboard,
          hasCheatAccess: !!d.has_cheat_access,
          balance: Math.max(0, cleanDBNum(d.balance, 0)),
          bankBalance: Math.max(0, cleanDBNum(d.bank_balance, 0)),
          vipLevel: Math.max(1, Math.floor(cleanDBNum(d.vip_level, 1))),
          totalWagered: Math.max(0, cleanDBNum(d.total_wagered, 0)),
          createdAt: d.created_at,
          hasDeposited: d.has_deposited,
          isBanned: !!d.is_banned,
          cheats: d.cheats || null,
          version: d.version || 0,
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
      console.log(`[storage] Quests loaded from DB for ${uid}:`, data.length);
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
    } else {
      console.log(`[storage] No quests in DB for ${uid}, loading initial quests...`);
      // No quests in DB yet, return initial quests
      const { INITIAL_QUESTS } = await import('./quests');
      const initial = INITIAL_QUESTS.map((q, i) => ({
        ...q,
        id: `q-${i}`,
        progress: 0,
        completed: false,
        claimed: false
      }));
      return initial;
    }
  }

  const stored = localStorage.getItem(`casino_quests_${uid}`);
  if (stored) return JSON.parse(stored);

  // Default fallback if no DB and no LocalStorage
  const { INITIAL_QUESTS } = await import('./quests');
  console.log(`[storage] Loading default fallback quests`);
  return INITIAL_QUESTS.map((q, i) => ({
    ...q,
    id: `q-${i}`,
    progress: 0,
    completed: false,
    claimed: false
  }));
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

export async function getGlobalLogs(): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const [historyRes, transRes, promoRes] = await Promise.all([
      supabase.from('game_history').select('*, users(username)').order('timestamp', { ascending: false }).limit(100),
      supabase.from('transactions').select('*, users(username)').order('timestamp', { ascending: false }).limit(100),
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }).limit(50)
    ]);

    const logs: any[] = [];

    if (historyRes.data) {
      historyRes.data.forEach((h: any) => {
        logs.push({
          id: `h-${h.id}`,
          timestamp: h.timestamp,
          username: h.users?.username || 'Unknown',
          type: 'GAME',
          game: h.game,
          amount: h.payout - h.bet,
          details: `${h.game}: ${h.outcome.toUpperCase()} (Bet: ${h.bet}, Payout: ${h.payout})`
        });
      });
    }

    if (transRes.data) {
      transRes.data.forEach((t: any) => {
        logs.push({
          id: `t-${t.id}`,
          timestamp: t.timestamp,
          username: t.users?.username || 'Unknown',
          type: 'TRANSACTION',
          game: t.game || 'System',
          amount: t.amount,
          details: `${t.type.toUpperCase()}: ${t.amount >= 0 ? '+' : ''}${t.amount} (${t.game || 'N/A'})`
        });
      });
    }
    
    // Simuler des logs d'activation de codes si on avait une table pour ça, 
    // ou simplement lister les codes créés pour l'instant
    if (promoRes.data) {
      promoRes.data.forEach((p: any) => {
        logs.push({
          id: `p-${p.code}`,
          timestamp: p.created_at,
          username: 'System',
          type: 'PROMO',
          game: 'Admin',
          amount: 0,
          details: `NEW CODE: ${p.code} (${p.reward_text})`
        });
      });
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error("[storage] Error fetching global logs:", err);
    return [];
  }
}

export async function sendMoney(receiverId: string, amount: number): Promise<{ success: boolean; error?: string }> {
  const senderId = getCurrentUID();
  if (!senderId) return { success: false, error: 'Not logged in' };
  
  const cleanReceiverId = receiverId.trim();
  if (senderId === cleanReceiverId) return { success: false, error: 'Cannot send to yourself' };

  if (isSupabaseConfigured()) {
    try {
      // 1. Fetch sender first
      const { data: senderData, error: senderFetchError } = await supabase
        .from('users')
        .select('id, bank_balance, username')
        .eq('id', senderId)
        .single();

      if (senderFetchError || !senderData) {
        return { success: false, error: 'Sender not found in database' };
      }

      // 2. Fetch receiver (by ID or Username)
      // On utilise une syntaxe plus simple pour éviter les erreurs de parsing Supabase
      const { data: receiverResults, error: receiverFetchError } = await supabase
        .from('users')
        .select('id, bank_balance, username')
        .or(`id.eq.${cleanReceiverId},username.ilike.${cleanReceiverId}`);

      if (receiverFetchError || !receiverResults || receiverResults.length === 0) {
        console.error("[storage] sendMoney: Receiver not found", { cleanReceiverId, error: receiverFetchError });
        return { success: false, error: 'User not found. Check ID or Username.' };
      }

      const sender = senderData;
      const receiver = receiverResults[0];

      if (sender.id === receiver.id) return { success: false, error: 'Cannot send to yourself' };
      
      // Nettoyage des montants (BIGINT peut revenir sous forme de string)
      const parseAmount = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
        return 0;
      };

      const senderBank = parseAmount(sender.bank_balance);
      const receiverBank = parseAmount(receiver.bank_balance);

      if (senderBank < amount) return { success: false, error: `Insufficient bank balance. You have ${senderBank}.` };

      const newSenderBankBalance = senderBank - amount;
      const newReceiverBankBalance = receiverBank + amount;

      console.log(`[storage] Sending ${amount} from ${sender.username} to ${receiver.username}`, {
        senderId: sender.id,
        receiverId: receiver.id,
        senderOld: senderBank,
        senderNew: newSenderBankBalance,
        receiverOld: receiverBank,
        receiverNew: newReceiverBankBalance
      });

      // 3. Update Sender
      const { error: sUpdateError } = await supabase
        .from('users')
        .update({ bank_balance: newSenderBankBalance })
        .eq('id', sender.id);

      if (sUpdateError) {
        console.error("[storage] Sender update error:", sUpdateError);
        throw sUpdateError;
      }

      // 4. Update Receiver
      // On s'assure d'utiliser l'ID exact trouvé en DB
      const { error: rUpdateError } = await supabase
        .from('users')
        .update({ bank_balance: newReceiverBankBalance })
        .eq('id', receiver.id);

      if (rUpdateError) {
        console.error("[storage] Receiver update error:", rUpdateError);
        throw rUpdateError;
      }

      // 5. Record transfer
      const { error: tInsertError } = await supabase.from('transfers').insert({
        sender_id: sender.id,
        receiver_id: receiver.id,
        amount: amount
      });

      if (tInsertError) console.warn("[storage] Transfer log error (non-blocking):", tInsertError);

      // 6. Record transactions for history
      await addTransaction({
        userId: sender.id,
        type: 'withdraw',
        amount: -amount,
        game: `Transfer (Bank) to ${receiver.username}`,
        balanceAfter: newSenderBankBalance
      });

      // Update local cache for sender (immediate UI feedback)
      const localSender = getUser(sender.id);
      localSender.bankBalance = newSenderBankBalance;
      localStorage.setItem(`${STORAGE_KEYS.USER_DATA_PREFIX}${sender.id}`, JSON.stringify(localSender));

      // IMPORTANT: On déclenche l'événement pour que useGameState recharge les données de Supabase
      // Cela évite que useGameState n'écrase la banque avec une vieille valeur locale
      window.dispatchEvent(new CustomEvent('casino_balance_update'));

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



export async function disableUserCheats(userId: string): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const freshUser = await fetchUser(userId);
    const updatedUser = {
      ...freshUser,
      hasCheatAccess: false,
      cheatExpiresAt: null,
      cheats: undefined,
      version: (freshUser.version || 0) + 1
    };
    return await saveUser(updatedUser);
  } catch (err) {
    console.error("[storage] Error disabling user cheats:", err);
    return null;
  }
}

export async function expireUserCheat(userId: string): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const freshUser = await fetchUser(userId);
    const updatedUser = {
      ...freshUser,
      cheatExpiresAt: Date.now() - 1000,
      version: (freshUser.version || 0) + 1
    };
    return await saveUser(updatedUser);
  } catch (err) {
    console.error("[storage] Error expiring user cheat:", err);
    return null;
  }
}

export function getDefaultUser(uid?: string): User {
  return {
    id: uid || 'guest',
    username: 'Player',
    isGuest: !uid || uid === 'guest',
    role: 'player',
    showBadge: false,
    showModBadge: false,
    hideFromLeaderboard: false,
    hasCheatAccess: false,
    balance: 1000,
    bankBalance: 0,
    vipLevel: 1,
    totalWagered: 0,
    createdAt: new Date().toISOString(),
    hasDeposited: false,
    usedPromoCodes: [],
    version: 0,
    activeMultiplier: undefined,
  };
}

export async function resetAllData(): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      console.log("[storage] Resetting ALL data (keeping user accounts & unbanning)...");

      // 1. Supprimer l'historique et les données liées de TOUS les utilisateurs
      // Utilisation d'un filtre bidon pour autoriser la suppression massive sur Supabase
      const dummyFilter = '00000000-0000-0000-0000-000000000000';
      await Promise.all([
        supabase.from('transactions').delete().neq('id', dummyFilter),
        supabase.from('game_history').delete().neq('id', dummyFilter),
        supabase.from('quests').delete().neq('id', dummyFilter),
        supabase.from('transfers').delete().neq('id', dummyFilter),
        supabase.from('promo_codes').delete().neq('code', 'RESET_ALL_DATA_BYPASS')
      ]);

      // 2. Réinitialiser les comptes : 1000 Credits, VIP 1, Bank 0, Débannir
      // Note: On fait l'update champ par champ ou on capture l'erreur pour identifier la colonne manquante
      const resetPayload: any = { 
        balance: 1000, 
        bank_balance: 0, 
        vip_level: 1, 
        total_wagered: 0,
        total_won: 0,
        total_lost: 0,
        last_daily_claim: null,
        referral_uses: 0,
        is_banned: false,
        cheats: null,
        active_multiplier: null,
        show_badge: false,
        show_mod_badge: false,
        hide_from_leaderboard: false,
        has_cheat_access: false
      };

      console.log("[storage] Sending reset update to users table...");
      const { error: userResetError } = await supabase.from('users').update(resetPayload).neq('id', dummyFilter);

      if (userResetError) {
        console.error("[storage] Supabase Reset Error details:", userResetError);
        // Si l'erreur est liée à une colonne manquante, on affiche un message clair
        if (userResetError.message?.includes("column")) {
          alert(`Database Schema Error: ${userResetError.message}. Please run the SQL migration in Supabase dashboard.`);
        }
        throw userResetError;
      }
    }

    // On ne clear que les données de jeu locales pour éviter de déconnecter l'admin si possible
    // mais pour être sûr que tout est synchro, on peut vider les préfixes spécifiques
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('casino_') || key === 'app_cheats') {
        localStorage.removeItem(key);
      }
    });

    console.log("[storage] Reset complete. Database cleaned, users unbanned and reset to 1000 credits.");
  } catch (err) {
    console.error("[storage] Global reset error:", err);
    throw err;
  }
}
