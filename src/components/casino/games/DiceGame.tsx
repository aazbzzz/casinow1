import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Coins, TrendingUp, TrendingDown, Info, AlertCircle } from 'lucide-react';
import { User } from '@/types';
import { vibrate } from '@aippy/runtime/device';
import { useGameSounds } from '@/hooks/useGameSounds';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { getCheats } from '@/lib/cheats';
import { getVIPLevelByNumber } from '@/lib/vip';

const tweaks = aippyTweaks(tweaksConfig as any);

interface DiceGameProps {
  user: User;
  balance: number;
  onBet: (amount: number, game: string) => boolean;
  onWin: (betAmount: number, payout: number, multiplier: number, game: string) => number;
  onLoss: (betAmount: number, game: string) => void;
  onBack: () => void;
}

export function DiceGame({ user, balance, onBet, onWin, onLoss, onBack }: DiceGameProps) {
  const cheats = getCheats(user);
  const [betAmount, setBetAmount] = useState(10);
  const [target, setTarget] = useState(50);
  const [mode, setMode] = useState<'over' | 'under'>('over');
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleError = (e: any) => {
      setGameError(e.detail.message);
      setTimeout(() => setGameError(null), 3000);
    };
    window.addEventListener('casino_game_error', handleError);
    return () => window.removeEventListener('casino_game_error', handleError);
  }, []);
  
  const { playConfirm, playWin, playError } = useGameSounds();
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const secondaryAccent = tweaks.secondaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  const enableSounds = tweaks.enableSounds.useState();
  const animSpeed = tweaks.animationSpeed.useState();
  
  const winChance = mode === 'over' ? (100 - target) : target;
  const multiplier = (100 / winChance) * 0.98;
  
  const handleRoll = async () => {
    if (isRolling || !onBet(betAmount, 'Dice')) {
      if (enableSounds) playError();
      if (enableHaptics) vibrate([100, 50, 100]);
      return;
    }
    
    if (enableSounds) playConfirm();
    if (enableHaptics) vibrate(50);
    
    setIsRolling(true);
    setResult(null);
    setLastWin(null);
    
    setTimeout(() => {
      gameAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    setTimeout(() => {
      let roll: number;
      
      if (cheats.diceForceRoll !== null && cheats.diceForceRoll >= 0 && cheats.diceForceRoll <= 100) {
        roll = cheats.diceForceRoll;
      } else if (cheats.forceDiceResult !== null && cheats.forceDiceResult >= 1 && cheats.forceDiceResult <= 100) {
        roll = cheats.forceDiceResult;
      } else if (cheats.alwaysWin || cheats.diceAlwaysWin) {
        if (mode === 'over') {
          roll = Math.floor(Math.random() * (100 - target)) + target + 1;
        } else {
          roll = Math.floor(Math.random() * (target - 1)) + 1;
        }
      } else {
        roll = Math.floor(Math.random() * 100) + 1;
      }
      
      setResult(roll);
      
      const won = mode === 'over' ? roll > target : roll < target;
      
      if (won || cheats.diceAlwaysWin) {
        const baseMultiplier = cheats.diceMaxMultiplier ? 1000 : multiplier;
        const finalMultiplier = Number(cheats.customMultiplier) > 1 ? baseMultiplier * Number(cheats.customMultiplier) : baseMultiplier;
        const totalPayout = Number(betAmount) * finalMultiplier;
        
        console.log({ 
          game: 'Dice', 
          betAmount: Number(betAmount), 
          payout: totalPayout, 
          multiplier: finalMultiplier, 
          payoutType: typeof totalPayout, 
          multiplierType: typeof finalMultiplier 
        });
        
        const payout = onWin(Number(betAmount), totalPayout, finalMultiplier, 'Dice');
        
        // QUEST UPDATE (NO CHEATS)
        const isCheating = cheats.diceAlwaysWin || cheats.diceForceRoll !== null || cheats.forceDiceResult !== null || cheats.alwaysWin || cheats.diceMaxMultiplier;
        if (!isCheating) {
          window.dispatchEvent(new CustomEvent('quest_update', {
            detail: {
              game: 'Dice',
              status: 'completed',
              betAmount: Number(betAmount),
              payout: payout,
              multiplier: finalMultiplier,
            }
          }));
        }

        // TRACK DICE LOW CHANCE STAT
        if (winChance < 5) {
          window.dispatchEvent(new CustomEvent('stat_update', { 
            detail: { key: 'diceLowChanceWin', value: 1 } 
          }));
        }
        
        console.log('ONWIN RETURN =', payout);
        setLastWin(payout);
        if (enableSounds) playWin();
        if (enableHaptics) vibrate(200);
      } else {
        onLoss(betAmount, 'Dice');

        // QUEST UPDATE (NO CHEATS)
        const isCheating = cheats.diceAlwaysWin || cheats.diceForceRoll !== null || cheats.forceDiceResult !== null || cheats.alwaysWin;
        if (!isCheating) {
          window.dispatchEvent(new CustomEvent('quest_update', {
            detail: {
              game: 'Dice',
              status: 'failed',
              betAmount: Number(betAmount),
              payout: 0,
              multiplier: 0,
            }
          }));
        }

        if (enableHaptics) vibrate([100, 50, 100]);
      }
      
      setIsRolling(false);
    }, animSpeed);
  };
  
  return (
    <div 
      className="fixed inset-0 flex flex-col bg-gradient-to-br from-[#0a0a0f] via-[#1a0a1f] to-[#0f0a1a] overflow-y-auto overflow-x-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRolling) {
          handleRoll();
        }
      }}
    >
      <div className="p-4 flex items-center justify-between shrink-0">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }} 
          className="flex items-center gap-2 text-gray-400 active:scale-95 transition-transform touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <ArrowLeft className="size-5" />
          <span className="font-semibold">Back</span>
        </button>
        <button
          onClick={() => setShowRules(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all active:scale-95"
          style={{ backgroundColor: `${cardBg}80`, borderColor: `${primaryAccent}60` }}
        >
          <Info className="size-5" style={{ color: primaryAccent }} />
          <span className="text-sm font-bold text-white">Rules</span>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 shadow-lg" style={{ backgroundColor: cardBg, borderColor: primaryAccent, boxShadow: `0 0 20px ${primaryAccent}40` }}>
          <Coins className="size-5" style={{ color: primaryAccent }} />
          <span className="font-bold text-white text-lg">{Math.ceil(balance).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-start gap-6 px-4 pb-4">
        <h2 className="text-3xl font-black text-white mt-6">🎲 Dice</h2>
        
        <div className="w-full max-w-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('over')}
              disabled={isRolling}
              className="py-3 rounded-xl font-bold transition-all active:scale-95 border-2 flex items-center justify-center gap-2"
              style={{
                backgroundColor: mode === 'over' ? primaryAccent : cardBg,
                color: mode === 'over' ? '#000' : '#fff',
                borderColor: mode === 'over' ? primaryAccent : '#333',
              }}
            >
              <TrendingUp className="size-5" />
              Over
            </button>
            <button
              onClick={() => setMode('under')}
              disabled={isRolling}
              className="py-3 rounded-xl font-bold transition-all active:scale-95 border-2 flex items-center justify-center gap-2"
              style={{
                backgroundColor: mode === 'under' ? secondaryAccent : cardBg,
                color: mode === 'under' ? '#000' : '#fff',
                borderColor: mode === 'under' ? secondaryAccent : '#333',
              }}
            >
              <TrendingDown className="size-5" />
              Under
            </button>
          </div>
          
          <div className="p-3 rounded-xl border-2" style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}40` }}>
            <label className="text-sm font-semibold mb-2 block" style={{ color: primaryAccent }}>
              Target: <span className="text-white text-lg">{target}</span>
            </label>
            <input
              type="range"
              min="1"
              max="99"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              disabled={isRolling}
              className="w-full h-2 rounded-full appearance-none cursor-pointer mb-2"
              style={{
                background: `linear-gradient(to right, ${primaryAccent} 0%, ${primaryAccent} ${target}%, #333 ${target}%, #333 100%)`
              }}
            />
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Chance: <span className="font-bold text-white">{winChance.toFixed(1)}%</span></span>
              <span className="text-gray-400">Multi: <span className="font-bold" style={{ color: primaryAccent }}>{multiplier.toFixed(2)}x</span></span>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: primaryAccent }}>Bet Amount</label>
              <button 
                onClick={() => {
                  const vip = getVIPLevelByNumber(user.vipLevel);
                  const maxAllowed = user.vipLevel === 10 ? balance : Math.min(balance, vip.maxBet);
                  setBetAmount(maxAllowed);
                  if (enableHaptics) vibrate(30);
                }}
                className="text-xs font-black px-2 py-1 rounded bg-gray-800 text-white active:scale-90"
                style={{ color: primaryAccent, borderColor: primaryAccent, borderWidth: 1 }}
              >
                MAX
              </button>
            </div>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
              disabled={isRolling}
              className="w-full px-4 py-3 rounded-xl bg-black/30 border-2 text-white font-semibold text-lg"
              style={{ borderColor: gameError ? '#ff1a1a' : primaryAccent }}
            />
            {gameError && (
              <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="size-4 text-red-500" />
                <p className="text-red-500 text-[10px] font-bold uppercase">{gameError}</p>
              </div>
            )}
          </div>
        </div>
        
        <div ref={gameAreaRef} className="relative">
          <div 
            className={`size-32 rounded-3xl flex items-center justify-center text-6xl font-black transition-all duration-300 border-4 ${isRolling ? 'animate-bounce' : ''}`}
            style={{ 
              backgroundColor: cardBg, 
              color: result !== null && lastWin !== null ? primaryAccent : result !== null ? '#ff0000' : '#fff',
              borderColor: result !== null && lastWin !== null ? primaryAccent : result !== null ? '#ff0000' : '#333',
              boxShadow: result !== null ? `0 0 30px ${lastWin !== null ? primaryAccent : '#ff0000'}60` : 'none'
            }}
          >
            {result !== null ? result : '?'}
          </div>
        </div>
        
        {lastWin !== null && (
          <div className="text-3xl font-black animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ color: primaryAccent }}>
            +{Math.ceil(lastWin).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} 🎉
          </div>
        )}
        
        {result !== null && lastWin === null && (
          <div className="text-2xl font-bold text-red-500 animate-in fade-in slide-in-from-bottom-4 duration-500">
            Lost 😢
          </div>
        )}
      </div>
      
      <div className="p-4 shrink-0 sticky bottom-0 bg-gradient-to-t from-[#0a0a0f] to-transparent backdrop-blur-sm">
        <button
          onClick={handleRoll}
          disabled={isRolling || betAmount > balance}
          className="w-full py-4 rounded-xl font-bold text-black transition-all active:scale-95 disabled:opacity-50 shadow-lg"
          style={{ backgroundColor: primaryAccent, boxShadow: `0 0 20px ${primaryAccent}60` }}
        >
          {isRolling ? 'Rolling...' : 'Roll'}
        </button>
      </div>
      
      {showRules && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setShowRules(false)}>
          <div className="w-full max-w-md p-6 rounded-2xl border-2" style={{ backgroundColor: cardBg, borderColor: primaryAccent }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-white mb-4">📜 Dice Rules</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <p><strong style={{ color: primaryAccent }}>Goal:</strong> Predict if dice will be over or under target</p>
              <p><strong style={{ color: primaryAccent }}>Over:</strong> Result must be higher than target</p>
              <p><strong style={{ color: primaryAccent }}>Under:</strong> Result must be lower than target</p>
              <p><strong style={{ color: primaryAccent }}>Target:</strong> Adjust between 1 and 99</p>
              <p><strong style={{ color: primaryAccent }}>Multiplier:</strong> Calculated by probability (riskier = higher payout)</p>
              <div className="pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-400">Formula: 100 / win chance × 0.98</p>
              </div>
            </div>
            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-6 py-3 rounded-xl font-bold text-black transition-all active:scale-95"
              style={{ backgroundColor: primaryAccent }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}