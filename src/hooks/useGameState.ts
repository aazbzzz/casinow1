import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Quest } from '@/types';
import { fetchUser, saveUser, getQuests, saveQuests, addTransaction, addGameHistory, getCurrentUID, getUser, supabase, isSupabaseConfigured } from '@/lib/storage';
import { getVIPLevel, VIP_LEVELS } from '@/lib/vip';
import { updateQuestProgress, claimQuestReward } from '@/lib/quests';
import { reportScore } from '@aippy/runtime/leaderboard';
import { getCheats } from '@/lib/cheats';

const cleanAmount = (val: any): number => {
  if (val === null || val === undefined) return 0;
  let num = 0;
  if (typeof val === 'number') {
    num = isNaN(val) ? 0 : val;
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
    num = isNaN(parsed) ? 0 : parsed;
  }
  return Math.ceil(num);
};

export function useGameState() {
  const [user, setUser] = useState<User>(() => getUser());
  const [quests, setQuests] = useState<Quest[]>([]);
  const isInitialMount = useRef(true);
  const isPendingSync = useRef(false);
  const lastUpdateRef = useRef(Date.now());

  const fetchLatestData = useCallback(async (force = false) => {
    const uid = getCurrentUID();
    if (!uid || uid === 'guest') return;

    // Ne pas écraser si une mise à jour locale est en cours
    if (!force && isPendingSync.current) return;

    const [remoteUser, remoteQuests] = await Promise.all([
      fetchUser(uid),
      getQuests()
    ]);
    
    if (remoteUser) {
      setUser(prev => {
        // Sanitisation forcée des données distantes
        const sanitizedRemote = {
          ...remoteUser,
          balance: Math.max(0, Number(remoteUser.balance) || 0),
          bankBalance: Math.max(0, Number(remoteUser.bankBalance) || 0),
          totalWagered: Math.max(0, Number(remoteUser.totalWagered) || 0),
          vipLevel: Math.max(1, Math.floor(Number(remoteUser.vipLevel) || 1)),
        };

        // On n'écrase QUE si la version distante est strictement plus récente
        if (sanitizedRemote.version > prev.version) {
          console.log(`[useGameState] State updated from server: Remote (v${sanitizedRemote.version}) > Local (v${prev.version})`);
          
          const now = Date.now();
          const hasLocalActiveCheat = prev.hasCheatAccess && prev.cheatExpiresAt && prev.cheatExpiresAt > now;
          const hasRemoteActiveCheat = sanitizedRemote.hasCheatAccess && sanitizedRemote.cheatExpiresAt && sanitizedRemote.cheatExpiresAt > now;
          
          // CRITICAL: Jamais écraser un cheat actif localement par un état "null" si la version est proche
          // On priorise l'état "actif" du cheat pour éviter les micro-reset
          return {
            ...sanitizedRemote,
            cheats: (hasLocalActiveCheat && !hasRemoteActiveCheat && prev.role !== 'cheat') 
              ? prev.cheats 
              : sanitizedRemote.cheats,
            hasCheatAccess: (hasLocalActiveCheat && !hasRemoteActiveCheat && prev.role !== 'cheat')
              ? prev.hasCheatAccess
              : sanitizedRemote.hasCheatAccess,
            cheatExpiresAt: (hasLocalActiveCheat && !hasRemoteActiveCheat && prev.role !== 'cheat')
              ? prev.cheatExpiresAt
              : sanitizedRemote.cheatExpiresAt,
          };
        }
        return prev;
      });
    }
    if (remoteQuests) setQuests(remoteQuests);
  }, []);

  // Synchronisation avec le backend au montage & Realtime subscription
  useEffect(() => {
    fetchLatestData(true);

    const uid = getCurrentUID();
    if (!uid || !isSupabaseConfigured() || uid === 'guest') return;

    // REALTIME: Écouter les changements spécifiques à CET utilisateur
    const userChannel = supabase
      .channel(`user-sync-${uid}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users', 
        filter: `id=eq.${uid}` 
      }, (payload: any) => {
        const newUser = payload.new;
        if (!newUser) return;

        setUser(prev => {
          if (newUser.version > prev.version) {
            console.log(`[useGameState] Realtime sync: v${newUser.version} > v${prev.version}`);
            
            const now = Date.now();
            const hasLocalActiveCheat = prev.hasCheatAccess && prev.cheatExpiresAt && prev.cheatExpiresAt > now;
            const hasRemoteActiveCheat = !!newUser.has_cheat_access && newUser.cheat_expires_at && newUser.cheat_expires_at > now;

            // Strict merging: preserve local cheat if remote doesn't have it yet
            const finalCheats = (hasLocalActiveCheat && !hasRemoteActiveCheat && prev.role !== 'cheat')
              ? prev.cheats
              : newUser.cheats;
            
            const finalHasCheat = (hasLocalActiveCheat && !hasRemoteActiveCheat && prev.role !== 'cheat')
              ? prev.hasCheatAccess
              : !!newUser.has_cheat_access;

            const finalExpires = (hasLocalActiveCheat && !hasRemoteActiveCheat && prev.role !== 'cheat')
              ? prev.cheatExpiresAt
              : newUser.cheat_expires_at;

            // PROTECTION: Never overwrite totalWagered/vipLevel with older values
            const remoteWagered = Number(newUser.total_wagered) || 0;
            const localWagered = Number(prev.totalWagered) || 0;
            
            const finalTotalWagered = remoteWagered >= localWagered ? remoteWagered : localWagered;
            
            const realtimeVip = getVIPLevel(finalTotalWagered);

            console.log("[VIP REALTIME]", { 
              remoteWagered, 
              localWagered, 
              finalTotalWagered, 
              remoteVip: Number(newUser.vip_level) || 1, 
              localVip: Number(prev.vipLevel) || 1, 
              finalVipLevel: realtimeVip.level 
            });

            return {
              ...prev,
              balance: Math.max(0, Number(newUser.balance) || 0),
              bankBalance: Math.max(0, Number(newUser.bank_balance) || 0),
              vipLevel: realtimeVip.level,
              totalWagered: finalTotalWagered,
              role: newUser.role,
              hasCheatAccess: finalHasCheat,
              cheatExpiresAt: finalExpires,
              showBadge: !!newUser.show_badge,
              showModBadge: !!newUser.show_mod_badge,
              hideFromLeaderboard: !!newUser.hide_from_leaderboard,
              isBanned: !!newUser.is_banned,
              cheats: finalCheats,
              version: newUser.version
            };
          }
          return prev;
        });
      })
      .subscribe();

    const handleBalanceUpdate = () => fetchLatestData(true);
    window.addEventListener('casino_balance_update', handleBalanceUpdate);

    return () => {
      supabase.removeChannel(userChannel);
      window.removeEventListener('casino_balance_update', handleBalanceUpdate);
    };
  }, [fetchLatestData]);

  // AUTO-EXPIRE CHEATS
  useEffect(() => {
    if (!user.hasCheatAccess || !user.cheatExpiresAt || user.role === 'cheat') return;
    
    const checkExpiration = async () => {
      const now = Date.now();
      if (now > (user.cheatExpiresAt || 0)) {
        console.log('[useGameState] Cheat expired, triggering cloud expiration...');
        try {
          // Utilise la nouvelle fonction robuste de storage.ts
          const { expireUserCheat } = await import('@/lib/storage');
          const finalUser = await expireUserCheat(user.id);
          if (finalUser) {
            setUser(finalUser);
            window.dispatchEvent(new CustomEvent('leaderboard_update'));
          }
        } catch (err) {
          console.error("[useGameState] Error during cheat expiration:", err);
        }
      }
    };

    const interval = setInterval(checkExpiration, 5000);
    return () => clearInterval(interval);
  }, [user.hasCheatAccess, user.cheatExpiresAt, user.role, user.id]);

  const refreshUser = useCallback(async (updatedUser?: User) => {
     if (updatedUser) {
       setUser(updatedUser);
     } else {
       await fetchLatestData(true);
     }
   }, [fetchLatestData]);

  const updateBalance = useCallback(async (amount: number | string, type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss', game?: string) => {
    const numericAmount = cleanAmount(amount);
    if (numericAmount === 0 && type !== 'bet') return;

    isPendingSync.current = true;
    
    setUser(prev => {
      const currentBalance = cleanAmount(prev.balance);
      const newBalance = currentBalance + numericAmount;
      
      // Calculate VIP on update
      const newWagered = prev.totalWagered;
      const computedVip = getVIPLevel(newWagered);
      const finalVipLevel = Math.max(Number(prev.vipLevel) || 1, computedVip.level);

      const newUser = { 
        ...prev, 
        balance: newBalance,
        vipLevel: finalVipLevel
      };
      
      saveUser(newUser).then(finalUser => {
        setUser(finalUser);
        isPendingSync.current = false;
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
      });

      if (type === 'win' || type === 'deposit' || type === 'withdraw') {
        reportScore(newUser.balance);
      }
      
      return newUser;
    });
  }, []);
  
  const recordWin = useCallback((betAmount: number | string, payout: number | string, multiplier: number | string, game: string) => {
    const numBet = cleanAmount(betAmount);
    const numPayout = cleanAmount(payout);
    const numMultiplier = cleanAmount(multiplier);

    let calculatedPayout = numPayout;
    
    if (calculatedPayout <= 0 && numMultiplier > 0) {
      calculatedPayout = numBet * numMultiplier;
    }
    
    if (calculatedPayout < numBet && numMultiplier >= 1) {
      calculatedPayout = numBet * Math.max(1, numMultiplier);
    }
    
    if (user.activeMultiplier && user.activeMultiplier.expiresAt > Date.now()) {
      const bonusMult = cleanAmount(user.activeMultiplier.value) || 1;
      calculatedPayout *= bonusMult;
    }
    
    const cheats = getCheats(user);
    if (cheats.doubleWinnings) calculatedPayout *= 2;
    if (cheats.tripleWinnings) calculatedPayout *= 3;
    const safeFinalAmount = cheats.freezeBalance ? 0 : Math.max(0, calculatedPayout);
    
    updateBalance(safeFinalAmount, 'win', game);
    
    addGameHistory({ 
      game,
      bet: numBet,
      multiplier: numMultiplier,
      payout: safeFinalAmount,
      outcome: 'win',
    }).catch(console.error);
    
    return safeFinalAmount;
  }, [updateBalance, user]);

  const recordLoss = useCallback((amount: number | string, game: string) => {
    const cheats = getCheats(user);
    if (cheats.infiniteBalance) return;
    
    const numBet = cleanAmount(amount);
    
    addGameHistory({
      game,
      bet: numBet,
      multiplier: 0,
      payout: 0,
      outcome: 'loss',
    }).catch(console.error);
  }, [user]);

  const placeBet = useCallback((amount: number | string, game: string): boolean => {
    const numericAmount = cleanAmount(amount);
    if (numericAmount <= 0) return false;

    const currentBalance = cleanAmount(user.balance);
    const cheats = getCheats(user);

    if (!cheats.infiniteBalance && currentBalance < numericAmount) return false;
    
    if (cheats.instantLoss) {
      recordLoss(numericAmount, game);
      return false;
    }

    if (cheats.instantWin) {
      const winMultiplier = cheats.customMultiplier > 1 ? cheats.customMultiplier : 2;
      recordWin(numericAmount, numericAmount * winMultiplier, winMultiplier, game);
      return false;
    }

    isPendingSync.current = true;
    
    setUser(prev => {
      const prevBalance = Number(prev.balance) || 0;
      const newBalance = Math.max(0, prevBalance - numericAmount);
      const newWagered = (Number(prev.totalWagered) || 0) + numericAmount;
      
      const vipData = getVIPLevel(newWagered);

      console.log("[VIP CALC]", { 
        newWagered, 
        calculatedVip: vipData.level 
      });

      // On crée l'objet utilisateur mis à jour
      const updatedUser: User = {
        ...prev,
        balance: newBalance,
        totalWagered: newWagered,
        vipLevel: vipData.level,
        version: (prev.version || 0) + 1
      };

      console.log("[VIP DEBUG] Bet:", numericAmount);
      console.log("[VIP DEBUG] New wagered:", newWagered);
      console.log("[VIP DEBUG] New VIP:", vipData.level);

      // Sauvegarde Cloud et Cache
      saveUser(updatedUser).then(finalUser => {
        setUser(finalUser);
        isPendingSync.current = false;
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
        // Event global pour forcer les composants VIP à se rafraîchir si nécessaire
        window.dispatchEvent(new CustomEvent('user_updated_global', { detail: finalUser }));
      });

      return updatedUser;
    });

    return true;
  }, [user.balance, user.id, user.totalWagered, recordLoss, recordWin]);

  const claimQuest = useCallback((questId: string) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || !quest.completed || quest.claimed) return;

    setQuests(prev => prev.map(q => q.id === questId ? { ...q, claimed: true } : q));
    
    updateBalance(quest.reward, 'deposit', `Quest: ${quest.title}`);
    
    if (onRewardClaimed) onRewardClaimed();
  }, [quests, updateBalance]);

  const depositToBank = useCallback((amount: number) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    isPendingSync.current = true;
    setUser(prev => {
      const currentBalance = Number(prev.balance) || 0;
      if (currentBalance < numAmount) {
        isPendingSync.current = false;
        return prev;
      }

      const newBalance = currentBalance - numAmount;
      const newBankBalance = (Number(prev.bankBalance) || 0) + numAmount;
      
      const newUser = {
        ...prev,
        balance: newBalance,
        bankBalance: newBankBalance,
      };

      saveUser(newUser).then(finalUser => {
        setUser(finalUser);
        isPendingSync.current = false;
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
      });
      
      reportScore(newUser.balance);

      addTransaction({
        userId: prev.id,
        type: 'withdraw',
        amount: -numAmount,
        game: 'Bank Deposit',
        balanceAfter: newBalance,
      }).catch(console.error);

      return newUser;
    });
  }, []);

  const withdrawFromBank = useCallback((amount: number) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    isPendingSync.current = true;
    setUser(prev => {
      const currentBankBalance = Number(prev.bankBalance) || 0;
      if (currentBankBalance < numAmount) {
        isPendingSync.current = false;
        return prev;
      }

      const newBalance = (Number(prev.balance) || 0) + numAmount;
      const newBankBalance = currentBankBalance - numAmount;
      
      const newUser = {
        ...prev,
        balance: newBalance,
        bankBalance: newBankBalance,
      };

      saveUser(newUser).then(finalUser => {
        setUser(finalUser);
        isPendingSync.current = false;
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
      });
      
      reportScore(newUser.balance);

      addTransaction({
        userId: prev.id,
        type: 'deposit',
        amount: numAmount,
        game: 'Bank Withdrawal',
        balanceAfter: newBalance,
      }).catch(console.error);

      return newUser;
    });
  }, []);

  const updateBankBalance = useCallback(async (amount: number) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return;

    isPendingSync.current = true;
    setUser(prev => {
      const currentBankBalance = Number(prev.bankBalance) || 0;
      const newBankBalance = currentBankBalance + numAmount;
      
      const newUser = {
        ...prev,
        bankBalance: newBankBalance,
      };

      saveUser(newUser).then(finalUser => {
        setUser(finalUser);
        isPendingSync.current = false;
      });
      
      return newUser;
    });
  }, []);

  return {
    user,
    quests,
    updateBalance,
    placeBet,
    recordWin,
    recordLoss,
    claimQuest,
    depositToBank,
    withdrawFromBank,
    updateBankBalance,
    refreshUser,
  };
}

let onRewardClaimed: (() => void) | undefined;
export function setOnRewardClaimed(callback: () => void) {
  onRewardClaimed = callback;
}
