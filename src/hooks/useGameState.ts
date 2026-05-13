import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Quest } from '@/types';
import { fetchUser, saveUser, getQuests, saveQuests, addTransaction, addGameHistory, getCurrentUID } from '@/lib/storage';
import { getVIPLevel } from '@/lib/vip';
import { updateQuestProgress, claimQuestReward } from '@/lib/quests';
import { reportScore } from '@aippy/runtime/leaderboard';
import { getCheats } from '@/lib/cheats';

export function useGameState() {
  const [user, setUser] = useState<User>(() => fetchUserSync());
  const [quests, setQuests] = useState<Quest[]>(getQuests());
  const isInitialMount = useRef(true);

  // Sync with backend on mount
  useEffect(() => {
    const syncUser = async () => {
      const remoteUser = await fetchUser();
      setUser(remoteUser);
    };
    syncUser();
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
    saveQuests(quests);
  }, [quests]);
  
  const updateBalance = useCallback(async (amount: number, type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss', game?: string) => {
    setUser(prev => {
      const newBalance = prev.balance + amount;
      addTransaction({
        userId: prev.id,
        type,
        amount,
        game,
        balanceAfter: newBalance,
      });
      return { ...prev, balance: newBalance };
    });
  }, []);
  
  const placeBet = useCallback((amount: number, game: string): boolean => {
    const cheats = getCheats();
    
    // We use the current state 'user' which is already synced
    if (!cheats.infiniteBalance && user.balance < amount) return false;
    
    setUser(prev => {
      if (!cheats.infiniteBalance && prev.balance < amount) return prev;

      const newBalance = cheats.infiniteBalance ? prev.balance : prev.balance - amount;
      const newWagered = prev.totalWagered + amount;
      const vipLevel = getVIPLevel(newWagered);
      
      addTransaction({
        userId: prev.id,
        type: 'bet',
        amount: -amount,
        game,
        balanceAfter: newBalance,
      });
      
      return {
        ...prev,
        balance: newBalance,
        totalWagered: newWagered,
        vipLevel: vipLevel.level,
      };
    });
    
    setQuests(prev => updateQuestProgress(prev, 'play', 1));
    setQuests(prev => updateQuestProgress(prev, 'wager', amount));
    
    return true;
  }, [user.balance]);

  // Helper for synchronous initial state (from LocalStorage)
  function fetchUserSync(): User {
    const uid = getCurrentUID();
    if (uid) {
      const stored = localStorage.getItem(`casino_user_data_${uid}`);
      if (stored) return JSON.parse(stored);
    }
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
  
  const recordWin = useCallback((betAmount: number, totalPayout: number, multiplier: number, game: string) => {
    const vipMultiplier = getVIPLevel(user.totalWagered).multiplier;
    const activeBoost = user.activeMultiplier?.expiresAt && user.activeMultiplier.expiresAt > Date.now() 
      ? user.activeMultiplier.value 
      : 1;
    
    const combinedMultiplier = multiplier * vipMultiplier * activeBoost;
    const finalPayout = Math.floor(betAmount * combinedMultiplier);
    const profit = finalPayout - betAmount;
    
    setUser(prev => {
      const newBalance = prev.balance + finalPayout;
      addTransaction({
        userId: prev.id,
        type: 'win',
        amount: finalPayout,
        game,
        balanceAfter: newBalance,
      });
      
      addGameHistory({
        userId: prev.id,
        game,
        betAmount,
        result: 'win',
        payout: finalPayout,
        multiplier: combinedMultiplier,
      });
      
      return { ...prev, balance: newBalance };
    });
    
    setQuests(prev => updateQuestProgress(prev, 'win', 1));
    
    return profit;
  }, [user.totalWagered, user.activeMultiplier]);
  
  const recordLoss = useCallback((betAmount: number, game: string) => {
    addGameHistory({
      userId: user.id,
      game,
      betAmount,
      result: 'loss',
      payout: 0,
      multiplier: 0,
    });
  }, [user.id]);
  
  const claimQuest = useCallback((questId: string) => {
    const result = claimQuestReward(quests, questId);
    if (result.reward > 0) {
      setQuests(result.quests);
      updateBalance(result.reward, 'win', 'Quest Reward');
      return result.reward;
    }
    return 0;
  }, [quests, updateBalance]);
  
  useEffect(() => {
    reportScore(user.balance);
  }, [user.balance]);
  
  const depositToBank = useCallback((amount: number) => {
    setUser(prev => {
      if (prev.balance < amount) return prev;
      
      const newBalance = prev.balance - amount;
      const newBankBalance = prev.bankBalance + amount;
      
      addTransaction({
        userId: prev.id,
        type: 'deposit',
        amount: -amount,
        balanceAfter: newBalance,
      });
      
      return {
        ...prev,
        balance: newBalance,
        bankBalance: newBankBalance,
        hasDeposited: true,
      };
    });
  }, []);
  
  const withdrawFromBank = useCallback((amount: number) => {
    setUser(prev => {
      if (prev.bankBalance < amount) return prev;
      
      const newBalance = prev.balance + amount;
      const newBankBalance = prev.bankBalance - amount;
      
      addTransaction({
        userId: prev.id,
        type: 'withdraw',
        amount,
        balanceAfter: newBalance,
      });
      
      return {
        ...prev,
        balance: newBalance,
        bankBalance: newBankBalance,
      };
    });
  }, []);
  
  const refreshUser = useCallback(() => {
    setUser(getUser());
    setQuests(getQuests());
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