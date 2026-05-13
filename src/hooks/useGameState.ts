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

  // Sync with backend on mount
  useEffect(() => {
    const syncData = async () => {
      const [remoteUser, remoteQuests] = await Promise.all([
        fetchUser(),
        getQuests()
      ]);
      setUser(remoteUser);
      setQuests(remoteQuests);
    };
    syncData();

    // Listener pour les mises à jour de solde externes (ex: promo codes)
    const handleBalanceUpdate = () => {
      syncData();
    };
    window.addEventListener('casino_balance_update', handleBalanceUpdate);
    return () => window.removeEventListener('casino_balance_update', handleBalanceUpdate);
  }, []);
  
  // Persist changes to backend
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveUser(user);
  }, [user]);
  
  useEffect(() => {
    if (!isInitialMount.current) {
      saveQuests(quests);
    }
  }, [quests]);
  
  const refreshUser = useCallback(async () => {
    const remoteUser = await fetchUser();
    const remoteQuests = await getQuests();
    setUser(remoteUser);
    setQuests(remoteQuests);
  }, []);

  const updateBalance = useCallback(async (amount: number, type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss', game?: string) => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) return;

    setUser(prev => {
      const currentBalance = Number(prev.balance) || 0;
      const newBalance = currentBalance + numericAmount;
      
      const newUser = { ...prev, balance: newBalance };
      
      // On déclenche les effets secondaires sans bloquer
      addTransaction({
        userId: prev.id,
        type,
        amount: numericAmount,
        game,
        balanceAfter: newBalance,
      }).catch(console.error);

      saveUser(newUser).catch(console.error);
      
      return newUser;
    });
  }, []);
  
  const placeBet = useCallback((amount: number, game: string): boolean => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return false;

    const cheats = getCheats();
    const currentBalance = Number(user.balance) || 0;
    
    if (!cheats.infiniteBalance && currentBalance < numericAmount) return false;
    
    setUser(prev => {
      const prevBalance = Number(prev.balance) || 0;
      if (!cheats.infiniteBalance && prevBalance < numericAmount) return prev;

      const newBalance = cheats.infiniteBalance ? prevBalance : prevBalance - numericAmount;
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

  const recordWin = useCallback((betAmount: number, payout: number, multiplier: number, game: string) => {
    const cheats = getCheats();
    
    const numBet = Number(betAmount) || 0;
    const numPayout = Number(payout) || 0;
    const numMultiplier = Number(multiplier) || 0;

    // Calcul du gain réel
    let calculatedPayout = numPayout;
    if (numPayout <= 0 && numMultiplier > 0) {
      calculatedPayout = numBet * numMultiplier;
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
  }, [updateBalance]);

  const recordLoss = useCallback((amount: number, game: string) => {
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
