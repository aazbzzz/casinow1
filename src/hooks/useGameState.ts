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
    if (!uid) return;

    // Ne pas écraser si une mise à jour locale est en attente (race condition protection)
    if (!force && isPendingSync.current && Date.now() - lastUpdateRef.current < 2000) {
      console.log(`[useGameState] fetchLatestData skipped: local update pending`);
      return;
    }

    const [remoteUser, remoteQuests] = await Promise.all([
      fetchUser(uid),
      getQuests()
    ]);
    
    if (remoteUser) {
      setUser(prev => {
        // Si c'est un refresh forcé (ex: Realtime), on accepte les données distantes
        if (force) return remoteUser;

        // Protection supplémentaire: on ne recule pas le solde si on a une version locale plus récente
        if (isPendingSync.current && remoteUser.balance < prev.balance) {
          console.warn(`[useGameState] remote balance is lower than local, skipping sync`);
          return prev;
        }
        return remoteUser;
      });
    }
    if (remoteQuests) setQuests(remoteQuests);
  }, []);

  // Sync with backend on mount & Realtime subscription
  useEffect(() => {
    fetchLatestData(true);

    const uid = getCurrentUID();
    if (!uid || !isSupabaseConfigured()) return;

    // REALTIME: Écouter les changements spécifiques à CET utilisateur
    console.log(`[useGameState] Subscribing to self-updates for ${uid}...`);
    const userChannel = supabase
      .channel(`user-sync-${uid}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users', 
        filter: `id=eq.${uid}` 
      }, (payload: any) => {
        console.log(`[useGameState] Realtime self-update detected:`, payload.new);
        // On rafraîchit les données depuis la source de vérité
        fetchLatestData(true);
      })
      .subscribe((status) => {
        console.log(`[useGameState] Self-sync subscription status: ${status}`);
      });

    // Listener pour les mises à jour de solde externes (ex: promo codes locaux)
    const handleBalanceUpdate = () => {
      fetchLatestData(true);
    };
    window.addEventListener('casino_balance_update', handleBalanceUpdate);

    return () => {
      supabase.removeChannel(userChannel);
      window.removeEventListener('casino_balance_update', handleBalanceUpdate);
    };
  }, [fetchLatestData]);

  // Sauvegarde automatique du profil utilisateur lors des changements (Débit/Crédit)
  // On ne sauvegarde automatiquement QUE si le solde de jeu ou le wagered a changé
  // Les transferts Bank sont gérés manuellement dans les composants pour éviter les rollbacks
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Si c'est un changement de balance lié au jeu, on active la synchronisation
    isPendingSync.current = true;
    lastUpdateRef.current = Date.now();

    const timer = setTimeout(async () => {
      if (user && user.id && user.id !== 'guest') {
        console.log(`[useGameState] Debounced sync: saving latest state to Supabase...`, { balance: user.balance });
        await saveUser(user);
        isPendingSync.current = false;
      }
    }, 1500); 
    
    return () => clearTimeout(timer);
  }, [user.balance, user.totalWagered, user.vipLevel]); // On restreint les triggers
  
  const refreshUser = useCallback(async (updatedUser?: User) => {
     if (updatedUser) {
       setUser(updatedUser);
       // On ne fetch pas immédiatement après pour éviter de récupérer des données potentiellement 
       // pas encore propagées dans le cache Supabase, ce qui écraserait l'état local propre.
       // Le Realtime se chargera de la synchro si nécessaire plus tard.
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
    
    setUser(prev => {
      const currentBalance = cleanAmount(prev.balance);
      const newBalance = currentBalance + numericAmount;
      const newUser = { ...prev, balance: newBalance };
      
      console.log(`[useGameState] Balance update check:`, {
        type,
        game,
        old: currentBalance,
        change: numericAmount,
        new: newBalance
      });
      
      // Save inside functional update to ensure we have the right state
      if (type === 'win' || type === 'deposit' || type === 'withdraw') {
        saveUser(newUser).catch(err => console.error("[useGameState] updateBalance saveUser error:", err));
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
    console.log(`[useGameState] placeBet start:`, { game, amount, numericAmount });

    if (numericAmount <= 0) {
      console.warn(`[useGameState] placeBet: Invalid amount`, { amount, numericAmount });
      return false;
    }

    const currentVIP = VIP_LEVELS.find(l => l.level === user.vipLevel) || VIP_LEVELS[0];
    const cheats = getCheats(user);

    if (!cheats.maxBetOverride && numericAmount > currentVIP.maxBet) {
      // Dispatch custom event instead of alert
      window.dispatchEvent(new CustomEvent('casino_game_error', { 
        detail: { message: "Vous n’avez pas le VIP requis pour miser cette somme." } 
      }));
      return false;
    }

    const currentBalance = cleanAmount(user.balance);
    
    if (!cheats.infiniteBalance && currentBalance < numericAmount) {
      console.warn(`[useGameState] placeBet: Insufficient balance`, { currentBalance, numericAmount });
      return false;
    }
    
    setUser(prev => {
      const prevBalance = cleanAmount(prev.balance);
      if (!cheats.infiniteBalance && prevBalance < numericAmount) return prev;

      const newBalance = cheats.infiniteBalance ? prevBalance : prevBalance - numericAmount;
      const newWagered = cleanAmount(prev.totalWagered) + numericAmount;
      const vipLevel = getVIPLevel(newWagered);
      
      console.log(`[useGameState] placeBet execution:`, { 
        oldBalance: prevBalance, 
        bet: numericAmount, 
        newBalance, 
        newWagered 
      });

      const updatedUser = {
        ...prev,
        balance: newBalance,
        totalWagered: newWagered,
        vipLevel: Math.max(prev.vipLevel || 1, vipLevel.level),
      };

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
      console.log(`[useGameState] Multiplier applied: x${bonusMult}`, { 
        before: numPayout, 
        after: calculatedPayout 
      });
    }
    
    const cheats = getCheats(user);
    if (cheats.doubleWinnings) calculatedPayout *= 2;
    if (cheats.tripleWinnings) calculatedPayout *= 3;
    const safeFinalAmount = cheats.freezeBalance ? 0 : Math.max(0, calculatedPayout);
    
    console.log('WIN CALCULATION EXECUTION', { 
      game,
      numBet,
      numMultiplier,
      calculatedPayout, 
      finalAmount: safeFinalAmount 
    });

    updateBalance(safeFinalAmount, 'win', game);
    
    addGameHistory({ 
      game,
      bet: numBet,
      multiplier: numMultiplier,
      payout: safeFinalAmount,
      outcome: 'win',
    }).catch(console.error);
    
    return safeFinalAmount;
  }, [updateBalance]);

  const recordLoss = useCallback((amount: number | string, game: string) => {
    const cheats = getCheats();
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
    });
  }, []);

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

    setUser(prev => {
      const currentBalance = Number(prev.balance) || 0;
      if (currentBalance < numAmount) return prev;

      const newBalance = currentBalance - numAmount;
      const newBankBalance = (Number(prev.bankBalance) || 0) + numAmount;
      
      const newUser = {
        ...prev,
        balance: newBalance,
        bankBalance: newBankBalance,
      };

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

    setUser(prev => {
      const currentBankBalance = Number(prev.bankBalance) || 0;
      if (currentBankBalance < numAmount) return prev;

      const newBalance = (Number(prev.balance) || 0) + numAmount;
      const newBankBalance = currentBankBalance - numAmount;
      
      const newUser = {
        ...prev,
        balance: newBalance,
        bankBalance: newBankBalance,
      };

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

    setUser(prev => {
      const currentBankBalance = Number(prev.bankBalance) || 0;
      const newBankBalance = currentBankBalance + numAmount;
      
      const newUser = {
        ...prev,
        bankBalance: newBankBalance,
      };

      saveUser(newUser).catch(err => console.error("[useGameState] updateBankBalance saveUser error:", err));
      
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
