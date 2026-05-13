import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Quest } from '@/types';
import { fetchUser, saveUser, getQuests, saveQuests, addTransaction, addGameHistory, getCurrentUID, getUser } from '@/lib/storage';
import { getVIPLevel } from '@/lib/vip';
import { updateQuestProgress, claimQuestReward } from '@/lib/quests';
import { reportScore } from '@aippy/runtime/leaderboard';
import { getCheats } from '@/lib/cheats';

export function useGameState() {
  const [user, setUser] = useState<User>(() => getUser());
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
  
  const refreshUser = useCallback(() => {
    setUser(getUser());
    setQuests(getQuests());
  }, []);

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
    
    // Use the current state 'user' which is already synced
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

  const recordWin = useCallback((betAmount: number, payout: number, multiplier: number, game: string) => {
    const cheats = getCheats();
    const finalAmount = cheats.infiniteBalance ? 0 : payout;
    
    updateBalance(finalAmount, 'win', game);
    addGameHistory({
      game,
      bet: betAmount,
      multiplier,
      payout: finalAmount,
      outcome: 'win',
    });
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
    if (user.balance < amount) return;
    setUser(prev => ({
      ...prev,
      balance: prev.balance - amount,
      bankBalance: prev.bankBalance + amount,
    }));
    addTransaction({
      userId: user.id,
      type: 'withdraw',
      amount: -amount,
      game: 'Bank Deposit',
      balanceAfter: user.balance - amount,
    });
  }, [user.balance, user.id]);

  const withdrawFromBank = useCallback((amount: number) => {
    if (user.bankBalance < amount) return;
    setUser(prev => ({
      ...prev,
      balance: prev.balance + amount,
      bankBalance: prev.bankBalance - amount,
    }));
    addTransaction({
      userId: user.id,
      type: 'deposit',
      amount,
      game: 'Bank Withdrawal',
      balanceAfter: user.balance + amount,
    });
  }, [user.bankBalance, user.id]);

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
