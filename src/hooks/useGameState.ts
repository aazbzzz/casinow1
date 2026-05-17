import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Quest } from '@/types';
import { fetchUser, saveUser, getQuests, saveQuests, addTransaction, addGameHistory, getCurrentUID, getUser, supabase, isSupabaseConfigured, expireUserCheat, getDefaultUser, logout as storageLogout } from '@/lib/storage';
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
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const isPendingSync = useRef(false);
  const lastUpdateRef = useRef(Date.now());

  const clearError = useCallback(() => setError(null), []);

  const fetchLatestData = useCallback(async (force = false) => {
    const uid = getCurrentUID();
    
    // Si pas de UID ou 'guest', on réinitialise au state par défaut
    if (!uid || uid === 'guest') {
      const defaultUser = getDefaultUser(uid || 'guest');
      setUser(defaultUser);
      setQuests([]);
      return;
    }

    // Protection contre les fetchs inutiles si déjà en cours
    if (isPendingSync.current && !force) return;

    const [remoteUser, remoteQuests] = await Promise.all([
      fetchUser(uid),
      getQuests()
    ]);
    
    if (remoteUser) {
      setUser(prev => {
        // PROTECTION CRITIQUE: Ne jamais écraser si une mise à jour locale est en cours
        if (isPendingSync.current) {
          console.log("[useGameState] Fetch ignored: Sync pending");
          return prev;
        }

        const remoteVersion = Number(remoteUser.version) || 0;
        const localVersion = Number(prev.version) || 0;

        // RÈGLE DU MAX: On ne recule jamais sur le wagered ou la version
        const remoteWagered = Number(remoteUser.totalWagered) || 0;
        const localWagered = Number(prev.totalWagered) || 0;

        if (remoteVersion > localVersion || remoteWagered > localWagered) {
          console.log(`[useGameState] State updated (Fetch): v${remoteVersion} > v${localVersion} | Wager: ${remoteWagered} > ${localWagered}`);
          return remoteUser;
        }
        
        return prev;
      });
    }
    if (remoteQuests) setQuests(remoteQuests);
  }, []);

  // Synchronisation avec le backend au montage & Realtime subscription
  useEffect(() => {
    const uid = getCurrentUID();
    fetchLatestData(true);

    if (!uid || uid === 'guest' || !isSupabaseConfigured()) return;

    // REALTIME: Écouter les changements spécifiques à CET utilisateur
    // On utilise un ID unique pour le canal pour éviter les conflits si le hook est utilisé plusieurs fois
    const channelId = `user-sync-${uid}-${Math.random().toString(36).slice(2, 11)}`;
    
    // Nettoyage préventif au cas où un canal avec le même ID existerait déjà
    const existingChannel = supabase.getChannels().find(c => (c as any).topic === channelId);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const userChannel = supabase
      .channel(channelId)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users', 
        filter: `id=eq.${uid}` 
      }, (payload: any) => {
        const newUser = payload.new;
        if (!newUser) return;

        setUser(prev => {
          // PROTECTION: Ignorer si une action locale est en cours
          if (isPendingSync.current) {
            console.log("[useGameState] Realtime sync ignored: Sync pending");
            return prev;
          }

          const remoteVersion = Number(newUser.version) || 0;
          const localVersion = Number(prev.version) || 0;
          const remoteWagered = Number(newUser.total_wagered) || 0;
          const localWagered = Number(prev.totalWagered) || 0;

          // RÈGLE DU MAX : Ne jamais reculer la version ou le wagered
          if (remoteVersion > localVersion || remoteWagered > localWagered) {
            console.log(`[useGameState] Realtime sync: v${remoteVersion} > v${localVersion} | Wager: ${remoteWagered} > ${localWagered}`);
            
            // Calcul du VIP centralisé côté client
            const realtimeVip = getVIPLevel(remoteWagered);

            return {
              ...prev,
              balance: Math.max(0, Number(newUser.balance) || 0),
              bankBalance: Math.max(0, Number(newUser.bank_balance) || 0),
              vipLevel: realtimeVip.level,
              totalWagered: Math.max(localWagered, remoteWagered), // Protection supplémentaire
              role: newUser.role,
              hasCheatAccess: !!newUser.has_cheat_access,
              cheatExpiresAt: newUser.cheat_expires_at,
              showBadge: !!newUser.show_badge,
              showModBadge: !!newUser.show_mod_badge,
              hideFromLeaderboard: !!newUser.hide_from_leaderboard,
              isBanned: !!newUser.is_banned,
              cheats: newUser.cheats,
              version: Math.max(localVersion, remoteVersion)
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
  }, [fetchLatestData, user.id]);

  // AUTO-EXPIRE CHEATS
  useEffect(() => {
    if (!user.hasCheatAccess || !user.cheatExpiresAt || user.role === 'cheat') return;
    
    const checkExpiration = async () => {
      const now = Date.now();
      if (now > (user.cheatExpiresAt || 0)) {
        console.log('[useGameState] Cheat expired, triggering cloud expiration...');
        try {
          // Utilisation de l'importation statique déjà définie en haut du fichier
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
      const newWagered = Number(prev.totalWagered) || 0;
      const computedVip = getVIPLevel(newWagered);

      const newUser = { 
        ...prev, 
        balance: newBalance,
        vipLevel: computedVip.level,
        version: (Number(prev.version) || 0) + 1
      };
      
      saveUser(newUser).then(finalUser => {
        setUser(current => {
          if (finalUser.version >= current.version) {
            return finalUser;
          }
          return current;
        });
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

    // VÉRIFICATION LIMITE VIP
    const currentVIP = getVIPLevel(user.totalWagered);
    if (numericAmount > currentVIP.maxBet) {
      setError(`Votre niveau VIP ${currentVIP.level} limite vos mises à ${currentVIP.maxBet.toLocaleString()} crédits. Misez plus pour augmenter votre limite !`);
      return false;
    }

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

      // On crée l'objet utilisateur mis à jour (Optimistic)
      const updatedUser: User = {
        ...prev,
        balance: newBalance,
        totalWagered: newWagered,
        vipLevel: vipData.level,
        version: (Number(prev.version) || 0) + 1
      };

      console.log(`[VIP CALC] Bet: ${numericAmount} | Total: ${newWagered} | VIP: ${vipData.level} | v${updatedUser.version}`);

      // Sauvegarde Cloud
      saveUser(updatedUser).then(finalUser => {
        setUser(current => {
          // On ne remplace que si le retour du serveur est cohérent avec l'état actuel
          if (finalUser.version >= current.version) {
            return finalUser;
          }
          return current;
        });
        isPendingSync.current = false;
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
        window.dispatchEvent(new CustomEvent('user_updated_global', { detail: finalUser }));
        window.dispatchEvent(new CustomEvent('casino_balance_update'));
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
        version: (Number(prev.version) || 0) + 1
      };

      saveUser(newUser).then(finalUser => {
        setUser(current => {
          if (finalUser.version >= current.version) {
            return finalUser;
          }
          return current;
        });
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
        version: (Number(prev.version) || 0) + 1
      };

      saveUser(newUser).then(finalUser => {
        setUser(current => {
          if (finalUser.version >= current.version) {
            return finalUser;
          }
          return current;
        });
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
        version: (Number(prev.version) || 0) + 1
      };

      saveUser(newUser).then(finalUser => {
        setUser(current => {
          if (finalUser.version >= current.version) {
            return finalUser;
          }
          return current;
        });
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
    error,
    clearError,
  };
}

let onRewardClaimed: (() => void) | undefined;
export function setOnRewardClaimed(callback: () => void) {
  onRewardClaimed = callback;
}
