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
    const numericAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/,/g, '')) 
      : Number(amount);
      
    if (isNaN(numericAmount)) return;

    setUser(prev => {
      const currentBalance = typeof prev.balance === 'string' 
        ? parseFloat(prev.balance.replace(/,/g, '')) 
        : Number(prev.balance);
      
      const safeBalance = isNaN(currentBalance) ? 0 : currentBalance;
      const newBalance = safeBalance + numericAmount;
      
      const newUser = { ...prev, balance: newBalance };
      
      saveUser(newUser).catch(console.error);
      return newUser;
    });
  }, []);
  
  const placeBet = useCallback((amount: number | string, game: string): boolean => {
    const numericAmount = typeof amount === 'string' 
      ? parseFloat(amount.replace(/,/g, '')) 
      : Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) return false;

    const cheats = getCheats();
    
    const currentBalance = typeof user.balance === 'string' 
      ? parseFloat(user.balance.replace(/,/g, '')) 
      : Number(user.balance);
    
    const safeBalance = isNaN(currentBalance) ? 0 : currentBalance;
    
    if (!cheats.infiniteBalance && safeBalance < numericAmount) return false;
    
    setUser(prev => {
      const prevBalance = typeof prev.balance === 'string' 
        ? parseFloat(prev.balance.replace(/,/g, '')) 
        : Number(prev.balance);
      
      const safePrevBalance = isNaN(prevBalance) ? 0 : prevBalance;

      if (!cheats.infiniteBalance && safePrevBalance < numericAmount) return prev;

      const newBalance = cheats.infiniteBalance ? safePrevBalance : safePrevBalance - numericAmount;
      const newWagered = (Number(prev.totalWagered) || 0) + numericAmount;
      const vipLevel = getVIPLevel(newWagered);
      
      const newUser = {
        ...prev,
        balance: newBalance,
        totalWagered: newWagered,
        vipLevel: vipLevel.level,
      };

      addTransaction({
        userId: prev.id,
        type: 'bet',
        amount: -numericAmount,
        game,
        balanceAfter: newBalance,
      }).catch(console.error);

      saveUser(newUser).catch(console.error);
      
      return newUser;
    });
    
    setQuests(prev => updateQuestProgress(prev, 'play', 1));
    setQuests(prev => updateQuestProgress(prev, 'wager', numericAmount));
    
    return true;
  }, [user.balance, user.id]);

  const recordWin = useCallback((betAmount: number | string, payout: number | string, multiplier: number | string, game: string) => {
    const cheats = getCheats();
    
    const numBet = typeof betAmount === 'string' ? parseFloat(betAmount.replace(/,/g, '')) : Number(betAmount) || 0;
    const numPayout = typeof payout === 'string' ? parseFloat(payout.replace(/,/g, '')) : Number(payout) || 0;
    const numMultiplier = typeof multiplier === 'string' ? parseFloat(multiplier.replace(/,/g, '')) : Number(multiplier) || 0;

    // Calcul du gain réel : si payout est 0, on utilise bet * multiplier
    let calculatedPayout = numPayout;
    if (numPayout <= 0 && numMultiplier > 0) {
      calculatedPayout = numBet * numMultiplier;
    }
    
    // Si après calcul c'est toujours 0 ou moins, on s'assure que c'est au moins la mise si multiplier >= 1
    if (calculatedPayout <= 0 && numMultiplier >= 1) {
      calculatedPayout = numBet * numMultiplier;
    }
    
    // Application du multiplicateur actif de l'utilisateur s'il existe
    if (user.activeMultiplier && user.activeMultiplier.expiresAt > Date.now()) {
      calculatedPayout *= user.activeMultiplier.value;
    }
    
    const finalAmount = cheats.infiniteBalance ? 0 : calculatedPayout;
    
    updateBalance(finalAmount, 'win', game);
    
    addGameHistory({
      game,
      bet: numBet,
      multiplier: numMultiplier,
      payout: finalAmount,
      outcome: 'win',
    }).catch(console.error);
    
    return finalAmount;
  }, [updateBalance, user.activeMultiplier]);

  const recordLoss = useCallback((amount: number | string, game: string) => {
    const cheats = getCheats();
    if (cheats.infiniteBalance) return;
    
    addGameHistory({
      game,
      bet: amount,
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
