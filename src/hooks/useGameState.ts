import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Quest } from '@/types';
import { fetchUser, saveUser, getQuests, saveQuests, addTransaction, addGameHistory, getCurrentUID, getUser, supabase, isSupabaseConfigured } from '@/lib/storage';
import { getVIPLevel, VIP_LEVELS } from '@/lib/vip';
import { updateQuestProgress, claimQuestReward } from '@/lib/quests';
import { reportScore } from '@aippy/runtime/leaderboard';
import { getCheats } from '@/lib/cheats';

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
        // On n'écrase QUE si la version distante est strictement plus récente
        if (remoteUser.version > prev.version) {
          console.log(`[useGameState] State updated from server: Remote (v${remoteUser.version}) > Local (v${prev.version})`);
          return remoteUser;
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
            return {
              ...prev,
              balance: Number(newUser.balance) || 0,
              bankBalance: Number(newUser.bank_balance) || 0,
              vipLevel: Number(newUser.vip_level) || 1,
              totalWagered: Number(newUser.total_wagered) || 0,
              role: newUser.role,
              hasCheatAccess: !!newUser.has_cheat_access,
              cheatExpiresAt: newUser.cheat_expires_at,
              showBadge: !!newUser.show_badge,
              showModBadge: !!newUser.show_mod_badge,
              hideFromLeaderboard: !!newUser.hide_from_leaderboard,
              isBanned: !!newUser.is_banned,
              cheats: newUser.cheats,
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

  const refreshUser = useCallback(async (updatedUser?: User) => {
     if (updatedUser) {
       setUser(updatedUser);
     } else {
       await fetchLatestData(true);
     }
   }, [fetchLatestData]);

  const updateBalance = useCallback(async (amount: number | string, type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss', game?: string) => {
    const cleanAmount = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const numericAmount = cleanAmount(amount);
    if (numericAmount === 0 && type !== 'bet') return;

    isPendingSync.current = true;
    
    // On met à jour l'état local immédiatement pour la réactivité (Optimistic)
    // Mais on laisse saveUser gérer la version finale
    setUser(prev => {
      const currentBalance = cleanAmount(prev.balance);
      const newBalance = currentBalance + numericAmount;
      const newUser = { ...prev, balance: newBalance };
      
      saveUser(newUser).then(finalUser => {
        setUser(finalUser); // On se synchronise avec la version confirmée par le serveur
        isPendingSync.current = false;
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
      });

      if (type === 'win' || type === 'deposit' || type === 'withdraw') {
        reportScore(newUser.balance);
      }
      
      return newUser;
    });
  }, []);
  
  const placeBet = useCallback((amount: number | string, game: string): boolean => {
    const cleanAmount = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const numericAmount = cleanAmount(amount);
    if (numericAmount <= 0) return false;

    const currentBalance = cleanAmount(user.balance);
    const cheats = getCheats(user);

    if (!cheats.infiniteBalance && currentBalance < numericAmount) return false;
    
    isPendingSync.current = true;

    setUser(prev => {
      const prevBalance = cleanAmount(prev.balance);
      if (!cheats.infiniteBalance && prevBalance < numericAmount) {
        isPendingSync.current = false;
        return prev;
      }

      const newBalance = cheats.infiniteBalance ? prevBalance : prevBalance - numericAmount;
      const newWagered = cleanAmount(prev.totalWagered) + numericAmount;
      const vipLevel = getVIPLevel(newWagered);
      
      const updatedUser = {
        ...prev,
        balance: newBalance,
        totalWagered: newWagered,
        vipLevel: Math.max(prev.vipLevel || 1, vipLevel.level),
      };

      saveUser(updatedUser).then(finalUser => {
        setUser(finalUser);
        isPendingSync.current = false;
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
      });
      
      reportScore(updatedUser.balance);

      addTransaction({
        userId: updatedUser.id,
        type: 'bet',
        amount: -numericAmount,
        game,
        balanceAfter: updatedUser.balance,
      }).catch(console.error);

      return updatedUser;
    });
    
    setQuests(prev => updateQuestProgress(prev, 'play', 1));
    setQuests(prev => updateQuestProgress(prev, 'wager', numericAmount));
    
    return true;
  }, [user.balance, user.id]);

  const recordWin = useCallback((betAmount: number | string, payout: number | string, multiplier: number | string, game: string) => {
    const cleanAmount = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const numBet = cleanAmount(betAmount);
    const numPayout = cleanAmount(payout);
    const numMultiplier = cleanAmount(multiplier);

    // Calcul du gain réel
    let calculatedPayout = numPayout;
    
    if (calculatedPayout <= 0 && numMultiplier > 0) {
      calculatedPayout = numBet * numMultiplier;
    }
    
    if (calculatedPayout < numBet && numMultiplier >= 1) {
      calculatedPayout = numBet * Math.max(1, numMultiplier);
    }
    
    // On utilise les données de l'état actuel pour le multiplicateur
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
  }, [updateBalance, user.activeMultiplier]);

  const recordLoss = useCallback((amount: number | string, game: string) => {
    const cheats = getCheats(user);
    if (cheats.infiniteBalance) return;
    
    const cleanAmount = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const numBet = cleanAmount(amount);
    
    addGameHistory({
      game,
      bet: numBet,
      multiplier: 0,
      payout: 0,
      outcome: 'loss',
    }).catch(console.error);
  }, [user]);

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
