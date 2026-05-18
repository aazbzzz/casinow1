import { useState, useCallback, useEffect, useRef } from 'react';
import { User, Quest } from '@/types';
import { fetchUser, saveUser, getQuests, saveQuests, addTransaction, addGameHistory, getCurrentUID, getUser, supabase, isSupabaseConfigured, expireUserCheat, getDefaultUser, logout as storageLogout, mergeUserData, mapDBUserToUser, sendMoney } from '@/lib/storage';
import { getVIPLevel, VIP_LEVELS } from '@/lib/vip';
import { updateQuestProgress, claimQuestReward } from '@/lib/quests';
import { reportScore } from '@aippy/runtime/leaderboard';
import { getCheats } from '@/lib/cheats';
import { TITLE_CHALLENGES } from '@/lib/titles';

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

        // MERGE INTELLIGENT (TITRES, CHEATS, VERSIONS)
        const merged = mergeUserData(prev, remoteUser);
        
        if (merged.version > prev.version || merged.totalWagered > prev.totalWagered) {
          console.log(`[useGameState] State updated (Fetch): v${merged.version} | Wager: ${merged.totalWagered}`);
          return merged;
        }
        
        return prev;
      });
    }
    if (remoteQuests) setQuests(remoteQuests);
  }, []);

  // Synchronisation périodique du "lastSeen" pour l'indicateur en ligne
  useEffect(() => {
    const uid = getCurrentUID();
    if (!uid || uid === 'guest') return;

    const updatePresence = async () => {
      // Protection: Ne pas mettre à jour la présence si une action critique est en cours
      if (isPendingSync.current) return;

      try {
        // On récupère les données les plus fraîches du serveur
        const freshUser = await fetchUser(uid);
        if (!freshUser) return;

        // On fusionne avec l'état local actuel pour ne pas perdre de mises récentes
        // (ex: si une mise vient d'être faite mais n'est pas encore en DB)
        setUser(prev => {
          const merged = mergeUserData(prev, freshUser);
          const updated = { 
            ...merged, 
            lastSeen: Date.now()
          };
          
          // On sauvegarde la version fusionnée
          saveUser(updated).then(saved => {
            setUser(current => {
              if (saved.version >= current.version) return saved;
              return current;
            });
          });

          return updated;
        });
      } catch (err) {
        console.error("[useGameState] Presence update failed:", err);
      }
    };

    const interval = setInterval(updatePresence, 60000); // Toutes les 60s
    return () => clearInterval(interval);
  }, [user.id]);

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

          // MAPPAGE DES DONNÉES REALTIME via la fonction centrale
          const mappedRemote = mapDBUserToUser(newUser);

          // MERGE INTELLIGENT
          const merged = mergeUserData(prev, mappedRemote);

          if (merged.version > prev.version || merged.totalWagered > prev.totalWagered) {
            console.log(`[REALTIME MERGE] v${merged.version} | Wager: ${merged.totalWagered} | Titles: ${merged.unlockedTitles?.length}`);
            return merged;
          }
          return prev;
        });
      })
      .subscribe();

    const handleBalanceUpdate = () => fetchLatestData(true);
    window.addEventListener('casino_balance_update', handleBalanceUpdate);

    // ADDED: STAT UPDATE LISTENER
    const handleStatUpdate = (e: any) => {
      const { key, value, isAbsolute } = e.detail;
      setUser(prev => {
        const newStats = { ...(prev.stats || {}) };
        const currentVal = (newStats as any)[key] || 0;
        (newStats as any)[key] = isAbsolute ? value : currentVal + value;
        return { ...prev, stats: newStats };
      });
    };
    window.addEventListener('stat_update', handleStatUpdate);

    return () => {
      supabase.removeChannel(userChannel);
      window.removeEventListener('casino_balance_update', handleBalanceUpdate);
      window.removeEventListener('stat_update', handleStatUpdate);
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

  const refreshUser = useCallback(async (updatedUser?: any) => {
     if (updatedUser) {
       // On s'assure que l'objet est bien mappé s'il vient de la DB (snake_case)
       const cleanUser = (updatedUser.id && (updatedUser.total_wagered !== undefined || updatedUser.bank_balance !== undefined || updatedUser.vip_level !== undefined)) 
         ? mapDBUserToUser(updatedUser) 
         : updatedUser;
       setUser(cleanUser);
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
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
      }).catch(err => {
        console.error("[useGameState] updateBalance save error:", err);
      }).finally(() => {
        isPendingSync.current = false;
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

    // STATS TRACKING
    setUser(prev => {
      const newStats = { ...(prev.stats || {}) };
      const totalWins = { ...(newStats.totalWins || {}) };
      totalWins[game] = (totalWins[game] || 0) + 1;
      
      const currentStreak = (newStats.currentWinStreak || 0) + 1;
      const maxStreak = Math.max(newStats.maxWinStreak || 0, currentStreak);
      
      newStats.totalWins = totalWins;
      newStats.currentWinStreak = currentStreak;
      newStats.maxWinStreak = maxStreak;

      if (game === 'Crash') {
        newStats.maxCrashMultiplier = Math.max(newStats.maxCrashMultiplier || 0, numMultiplier);
      }
      
      return { ...prev, stats: newStats };
    });
    
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

    // STATS TRACKING
    setUser(prev => {
      const newStats = { ...(prev.stats || {}) };
      const totalLosses = { ...(newStats.totalLosses || {}) };
      totalLosses[game] = (totalLosses[game] || 0) + 1;
      
      newStats.totalLosses = totalLosses;
      newStats.currentWinStreak = 0; // Reset streak on loss
      
      return { ...prev, stats: newStats };
    });
    
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

    const cheats = getCheats(user);

    // VÉRIFICATION LIMITE VIP
    const currentVIP = getVIPLevel(user.totalWagered);
    if (numericAmount > currentVIP.maxBet && !cheats.maxBetOverride) {
      setError(`Votre niveau VIP ${currentVIP.level} limite vos mises à ${currentVIP.maxBet.toLocaleString()} crédits. Misez plus pour augmenter votre limite !`);
      return false;
    }

    const currentBalance = cleanAmount(user.balance);

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

      // STATS TRACKING
      const newStats = { ...(prev.stats || {}) };
      newStats.maxSingleBet = Math.max(newStats.maxSingleBet || 0, numericAmount);

      // On crée l'objet utilisateur mis à jour (Optimistic)
      const updatedUser: User = {
        ...prev,
        balance: newBalance,
        totalWagered: newWagered,
        vipLevel: vipData.level,
        version: (Number(prev.version) || 0) + 1,
        stats: newStats
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
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
        window.dispatchEvent(new CustomEvent('user_updated_global', { detail: finalUser }));
        window.dispatchEvent(new CustomEvent('casino_balance_update'));
      }).catch(err => {
        console.error("[useGameState] placeBet save error:", err);
      }).finally(() => {
        isPendingSync.current = false;
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
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
      }).catch(err => {
        console.error("[useGameState] bank operation save error:", err);
      }).finally(() => {
        isPendingSync.current = false;
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
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
      }).catch(err => {
        console.error("[useGameState] withdrawFromBank save error:", err);
      }).finally(() => {
        isPendingSync.current = false;
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
        window.dispatchEvent(new CustomEvent('leaderboard_update'));
      }).catch(err => {
        console.error("[useGameState] updateBankBalance save error:", err);
      }).finally(() => {
        isPendingSync.current = false;
      });

      return newUser;
    });
  }, []);

  const updateTitleProgress = useCallback(() => {
    if (user.vipLevel < 10) return;

    setUser(prev => {
      let hasChanges = false;
      const newTitleProgress = { ...(prev.titleProgress || {}) };
      const newCompletedChallenges = [...(prev.completedTitleChallenges || [])];
      const newUnlockedTitles = [...(prev.unlockedTitles || [])];
      const stats = prev.stats || {};

      TITLE_CHALLENGES.forEach(challenge => {
        if (newCompletedChallenges.includes(challenge.id)) return;

        let currentVal = 0;
        if (challenge.statKey === 'totalWagered') currentVal = prev.totalWagered;
        else if (challenge.statKey === 'balance') currentVal = prev.balance;
        else if (challenge.statKey === 'vipLevel') currentVal = prev.vipLevel;
        else if (challenge.statKey === 'rouletteWins') currentVal = stats.totalWins?.['Roulette'] || 0;
        else if (challenge.statKey === 'coinflipWins') currentVal = stats.totalWins?.['Coinflip'] || 0;
        else if (challenge.statKey === 'diceStreak') currentVal = stats.maxWinStreak || 0; // Simplified
        else if (challenge.statKey === 'maxCrashMultiplier') currentVal = stats.maxCrashMultiplier || 0;
        else if (challenge.statKey === 'maxSingleBet') currentVal = stats.maxSingleBet || 0;
        else if (challenge.statKey === 'totalTransferSent') currentVal = stats.totalTransferSent || 0;
        else if (challenge.statKey === 'totalCryptoDeposited') currentVal = stats.totalCryptoDeposited || 0;
        else if (challenge.statKey === 'mines24SuccessCount') currentVal = stats.mines24SuccessCount || 0;
        else if (challenge.statKey === 'plinkoX16Count') currentVal = stats.plinkoX16Count || 0;
        else if (challenge.statKey === 'rouletteExactWinCount') currentVal = stats.rouletteExactWinCount || 0;
        else if (challenge.statKey === 'slots3StarsCount') currentVal = stats.totalWins?.['Slots'] || 0; // Placeholder
        else if (challenge.statKey === 'maxWinStreak') currentVal = stats.maxWinStreak || 0;
        else if (challenge.statKey === 'completedNormalChallenges') currentVal = newCompletedChallenges.length;

        if (currentVal !== newTitleProgress[challenge.id]) {
          newTitleProgress[challenge.id] = currentVal;
          hasChanges = true;
        }

        if (currentVal >= challenge.target) {
          newCompletedChallenges.push(challenge.id);
          if (!newUnlockedTitles.includes(challenge.rewardTitle)) {
            newUnlockedTitles.push(challenge.rewardTitle);
          }
          hasChanges = true;
        }
      });

      if (!hasChanges) return prev;

      const updatedUser: User = {
        ...prev,
        titleProgress: newTitleProgress,
        completedTitleChallenges: newCompletedChallenges,
        unlockedTitles: newUnlockedTitles,
        version: (prev.version || 0) + 1
      };

      saveUser(updatedUser).then(finalUser => {
        setUser(current => (finalUser.version >= current.version ? finalUser : current));
      });

      return updatedUser;
    });
  }, [user.vipLevel, user.totalWagered, user.balance, user.stats]);

  // AUTO-TRACK TITLES
  useEffect(() => {
    const timeout = setTimeout(() => {
      updateTitleProgress();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [user.totalWagered, user.balance, user.stats, updateTitleProgress]);

  const equipTitle = useCallback((title: string | null) => {
    if (title && !user.unlockedTitles?.includes(title)) return;

    setUser(prev => {
      const updatedUser: User = {
        ...prev,
        equippedTitle: title,
        version: (prev.version || 0) + 1
      };

      saveUser(updatedUser).then(finalUser => {
        setUser(current => (finalUser.version >= current.version ? finalUser : current));
      });

      return updatedUser;
    });
  }, [user.unlockedTitles]);

  // Auto-unlock "Légende" at VIP 10
  useEffect(() => {
    if (user.vipLevel >= 10 && !user.unlockedTitles?.includes('Légende')) {
      setUser(prev => {
        const newTitles = [...(prev.unlockedTitles || []), 'Légende'];
        const updatedUser: User = {
          ...prev,
          unlockedTitles: newTitles,
          equippedTitle: prev.equippedTitle || 'Légende',
          version: (prev.version || 0) + 1
        };
        saveUser(updatedUser).then(finalUser => {
          setUser(current => (finalUser.version >= current.version ? finalUser : current));
        });
        return updatedUser;
      });
    }
  }, [user.vipLevel, user.unlockedTitles]);

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
    updateTitleProgress,
    equipTitle,
  };
}

export function setOnRewardClaimed(callback: () => void) {}
