import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Quest } from '@/types';
import { fetchUser, saveUser, getQuests, saveQuests, addTransaction, addGameHistory, getCurrentUID, getUser } from '@/lib/storage';
import { getVIPLevel } from '@/lib/vip';
import { updateQuestProgress, claimQuestReward } from '@/lib/quests';
import { reportScore } from '@aippy/runtime/leaderboard';
import { getCheats } from '@/lib/cheats';

export function useGameState() {
  const [user, setUser] = useState<User>(() => getUser());
  const [quests, setQuests] = useState<Quest[]>([]);
  const isInitialMount = useRef(true);

  const fetchLatestData = useCallback(async () => {
    const [remoteUser, remoteQuests] = await Promise.all([
      fetchUser(),
      getQuests()
    ]);
    if (remoteUser) setUser(remoteUser);
    if (remoteQuests) setQuests(remoteQuests);
  }, []);

  // Sync with backend on mount
  useEffect(() => {
    fetchLatestData();

    // Listener pour les mises à jour de solde externes (ex: promo codes)
    const handleBalanceUpdate = () => {
      fetchLatestData();
    };
    window.addEventListener('casino_balance_update', handleBalanceUpdate);
    return () => window.removeEventListener('casino_balance_update', handleBalanceUpdate);
  }, [fetchLatestData]);
  
  const refreshUser = useCallback(async () => {
    await fetchLatestData();
  }, [fetchLatestData]);

  const updateBalance = useCallback(async (amount: number | string, type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss', game?: string) => {
    // Nettoyage rigoureux de l'entrée
    const cleanAmount = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    const numericAmount = cleanAmount(amount);
    console.log(`[useGameState] updateBalance start:`, { amount, numericAmount, type, game });
    
    if (isNaN(numericAmount)) {
      console.error(`[useGameState] updateBalance: numericAmount is NaN`, { amount });
      return;
    }

    // Mise à jour de l'état local d'abord pour la réactivité
    let newUser: any;
    setUser(prev => {
      const currentBalance = cleanAmount(prev.balance);
      const newBalance = currentBalance + numericAmount;
      
      console.log(`[useGameState] updateBalance execution:`, { 
        oldBalance: currentBalance, 
        change: numericAmount, 
        newBalance: newBalance,
        userId: prev.id 
      });
      
      newUser = { ...prev, balance: newBalance };
      return newUser;
    });

    // Side effect en dehors de setUser
    if (newUser) {
      saveUser(newUser).catch(err => console.error("[useGameState] updateBalance saveUser error:", err));
    }
  }, []);
  
  const placeBet = useCallback((amount: number | string, game: string): boolean => {
    const cleanAmount = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    const numericAmount = cleanAmount(amount);
    console.log(`[useGameState] placeBet start:`, { game, amount, numericAmount });

    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.warn(`[useGameState] placeBet: Invalid amount`, { amount, numericAmount });
      return false;
    }

    const cheats = getCheats();
    
    const currentBalance = cleanAmount(user.balance);
    if (!cheats.infiniteBalance && currentBalance < numericAmount) {
      console.warn(`[useGameState] placeBet: Insufficient balance`, { currentBalance, numericAmount });
      return false;
    }
    
    let updatedUser: any;
    setUser(prev => {
      const prevBalance = cleanAmount(prev.balance);
      if (!cheats.infiniteBalance && prevBalance < numericAmount) return prev;

      const newBalance = cheats.infiniteBalance ? prevBalance : prevBalance - numericAmount;
      const newWagered = (cleanAmount(prev.totalWagered)) + numericAmount;
      const vipLevel = getVIPLevel(newWagered);
      
      console.log(`[useGameState] placeBet execution:`, { 
        oldBalance: prevBalance, 
        bet: numericAmount, 
        newBalance, 
        newWagered 
      });

      updatedUser = {
        ...prev,
        balance: newBalance,
        totalWagered: newWagered,
        vipLevel: vipLevel.level,
      };
      
      return updatedUser;
    });

    if (updatedUser) {
      addTransaction({
        userId: updatedUser.id,
        type: 'bet',
        amount: -numericAmount,
        game,
        balanceAfter: updatedUser.balance,
      }).catch(console.error);

      saveUser(updatedUser).catch(console.error);
    }
    
    setQuests(prev => updateQuestProgress(prev, 'play', 1));
    setQuests(prev => updateQuestProgress(prev, 'wager', numericAmount));
    
    return true;
  }, [user.balance, user.id]);

  const recordWin = useCallback((betAmount: number | string, payout: number | string, multiplier: number | string, game: string) => {
    const cheats = getCheats();
    
    const cleanAmount = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    const numBet = cleanAmount(betAmount);
    const numPayout = cleanAmount(payout);
    const numMultiplier = cleanAmount(multiplier);

    console.log(`[useGameState] recordWin start:`, { game, numBet, numPayout, numMultiplier });

    // Calcul du gain réel
    let calculatedPayout = numPayout;
    
    // Si payout est 0 ou non fourni, on calcule à partir du multiplicateur
    if (calculatedPayout <= 0 && numMultiplier > 0) {
      calculatedPayout = numBet * numMultiplier;
      console.log(`[useGameState] recordWin: calculated from multiplier:`, { calculatedPayout });
    }
    
    // Sécurité : si on a gagné (numMultiplier >= 1), le gain doit être au moins la mise
    if (calculatedPayout < numBet && numMultiplier >= 1) {
      calculatedPayout = numBet * Math.max(1, numMultiplier);
      console.log(`[useGameState] recordWin: adjusted to min bet:`, { calculatedPayout });
    }
    
    // Application du multiplicateur actif (On utilise l'état local 'user' plus fiable que getUser() ici)
    if (user.activeMultiplier && user.activeMultiplier.expiresAt > Date.now()) {
      const bonusMult = cleanAmount(user.activeMultiplier.value) || 1;
      calculatedPayout *= bonusMult;
      console.log(`[useGameState] recordWin: active multiplier applied:`, { bonusMult, newPayout: calculatedPayout });
    }
    
    // Si infiniteBalance est activé, on ne gagne rien (mais on ne perd rien non plus)
    // On vérifie que cheats n'est pas activé involontairement
    const isInfinite = !!cheats.infiniteBalance;
    const finalAmount = isInfinite ? 0 : calculatedPayout;
    const safeFinalAmount = isNaN(finalAmount) ? 0 : Math.max(0, finalAmount);
    
    console.log(`[useGameState] recordWin final result:`, { 
      game, 
      numBet, 
      calculatedPayout,
      isInfinite,
      finalAmount: safeFinalAmount,
      multiplier: numMultiplier
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
  }, [updateBalance, user.activeMultiplier]);

  const recordLoss = useCallback((amount: number | string, game: string) => {
    const cheats = getCheats();
    if (cheats.infiniteBalance) return;
    
    const cleanAmount = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned) || 0;
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

      saveUser(newUser).catch(console.error);

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

      saveUser(newUser).catch(console.error);

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
    refreshUser,
  };
}

let onRewardClaimed: (() => void) | undefined;
export function setOnRewardClaimed(callback: () => void) {
  onRewardClaimed = callback;
}
