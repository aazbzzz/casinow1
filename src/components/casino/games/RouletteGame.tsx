import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Coins, Info, Lock, AlertCircle } from 'lucide-react';
import { vibrate } from '@aippy/runtime/device';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { getCheats } from '@/lib/cheats';
import { getVIPLevelByNumber } from '@/lib/vip';
import { getUser } from '@/lib/storage';

const tweaks = aippyTweaks(tweaksConfig as any);

interface RouletteGameProps {
  balance: number;
  onBet: (amount: number, game: string) => boolean;
  onWin: (betAmount: number, payout: number, multiplier: number, game: string) => number;
  onLoss: (betAmount: number, game: string) => void;
  onBack: () => void;
}

type ColorBet = 'red' | 'black';
type ParityBet = 'even' | 'odd';
type RangeBet = 'low' | 'high';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export function RouletteGame({ balance, onBet, onWin, onLoss, onBack }: RouletteGameProps) {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedColor, setSelectedColor] = useState<ColorBet | null>(null);
  const [selectedParity, setSelectedParity] = useState<ParityBet | null>(null);
  const [selectedRange, setSelectedRange] = useState<RangeBet | null>(null);
  
  const [isSpinning, setIsSpinning] = useState(false);
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
  
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const secondaryAccent = tweaks.secondaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  const animSpeed = tweaks.animationSpeed.useState();
  
  const isReady = selectedColor !== null && selectedParity !== null && selectedRange !== null;

  const spin = async () => {
    if (isSpinning || !isReady) {
      if (enableHaptics) vibrate([100, 50, 100]);
      return;
    }
    
    if (!onBet(betAmount, 'Roulette (Combo)')) {
      if (enableHaptics) vibrate([100, 50, 100]);
      return;
    }
    
    if (enableHaptics) vibrate(50);
    
    setIsSpinning(true);
    setResult(null);
    setLastWin(null);
    
    setTimeout(() => {
      gameAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    setTimeout(() => {
      const cheats = getCheats();
      let finalNumber: number;
      
      if (cheats.forceRouletteNumber !== null && cheats.forceRouletteNumber >= 0 && cheats.forceRouletteNumber <= 36) {
        finalNumber = cheats.forceRouletteNumber;
      } else if (cheats.forceRouletteColor || cheats.forceRouletteParity) {
        const validNumbers: number[] = [];
        for (let num = 0; num <= 36; num++) {
          const isRed = RED_NUMBERS.includes(num);
          const isBlack = !isRed && num !== 0;
          const isGreen = num === 0;
          const isEven = num !== 0 && num % 2 === 0;
          const isOdd = num % 2 === 1;
          const colorMatch = !cheats.forceRouletteColor || (cheats.forceRouletteColor === 'red' && isRed) || (cheats.forceRouletteColor === 'black' && isBlack) || (cheats.forceRouletteColor === 'green' && isGreen);
          const parityMatch = !cheats.forceRouletteParity || (cheats.forceRouletteParity === 'even' && isEven) || (cheats.forceRouletteParity === 'odd' && isOdd);
          if (colorMatch && parityMatch) {
            validNumbers.push(num);
          }
        }
        finalNumber = validNumbers.length > 0 ? validNumbers[Math.floor(Math.random() * validNumbers.length)] : Math.floor(Math.random() * 37);
      } else if (cheats.alwaysWin) {
        const validNumbers: number[] = [];
        for (let num = 1; num <= 36; num++) {
          const isRed = RED_NUMBERS.includes(num);
          const isBlack = !isRed;
          const isEven = num % 2 === 0;
          const isOdd = num % 2 === 1;
          const isLow = num >= 1 && num <= 18;
          const isHigh = num >= 19 && num <= 36;
          
          const colorMatch = (selectedColor === 'red' && isRed) || (selectedColor === 'black' && isBlack);
          const parityMatch = (selectedParity === 'even' && isEven) || (selectedParity === 'odd' && isOdd);
          const rangeMatch = (selectedRange === 'low' && isLow) || (selectedRange === 'high' && isHigh);
          
          if (cheats.rouletteInstantPayout || (colorMatch && parityMatch && rangeMatch)) {
            validNumbers.push(num);
          }
        }
        finalNumber = validNumbers.length > 0 ? validNumbers[Math.floor(Math.random() * validNumbers.length)] : Math.floor(Math.random() * 37);
      } else {
        finalNumber = Math.floor(Math.random() * 37);
      }
      
      setResult(finalNumber);
      
      const isRed = RED_NUMBERS.includes(finalNumber);
      const isBlack = !isRed && finalNumber !== 0;
      const isEven = finalNumber !== 0 && finalNumber % 2 === 0;
      const isOdd = finalNumber % 2 === 1;
      const isLow = finalNumber >= 1 && finalNumber <= 18;
      const isHigh = finalNumber >= 19 && finalNumber <= 36;

      const colorMatch = (selectedColor === 'red' && isRed) || (selectedColor === 'black' && isBlack);
      const parityMatch = (selectedParity === 'even' && isEven) || (selectedParity === 'odd' && isOdd);
      const rangeMatch = (selectedRange === 'low' && isLow) || (selectedRange === 'high' && isHigh);

      if (colorMatch && parityMatch && rangeMatch) {
        const cheats = getCheats();
        const baseMultiplier = cheats.rouletteInstantPayout ? 8 : 8;
        const finalMultiplier = Number(cheats.customMultiplier) > 1 ? baseMultiplier * Number(cheats.customMultiplier) : baseMultiplier;
        const totalPayout = Number(betAmount) * finalMultiplier;
        
        console.log({ 
          game: 'Roulette (Combo)', 
          betAmount: Number(betAmount), 
          payout: totalPayout, 
          multiplier: finalMultiplier, 
          payoutType: typeof totalPayout, 
          multiplierType: typeof finalMultiplier 
        });
        
        const payout = onWin(Number(betAmount), totalPayout, finalMultiplier, 'Roulette (Combo)');
        console.log('ONWIN RETURN =', payout);
        setLastWin(payout);
        if (enableHaptics) vibrate(300);
      } else {
        onLoss(betAmount, 'Roulette (Combo)');
        if (enableHaptics) vibrate([100, 50, 100]);
      }
      
      setIsSpinning(false);
    }, animSpeed * 3);
  };
  
  const getNumberColor = (num: number) => {
    if (num === 0) return '#00FF00';
    if (RED_NUMBERS.includes(num)) return '#FF0000';
    return '#000000';
  };
  
  return (
    <div className="fixed inset-0 flex flex-col bg-black overflow-y-auto overflow-x-hidden">
      <div className="p-4 flex items-center justify-between shrink-0 sticky top-0 z-20 bg-black/80 backdrop-blur-md">
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
          <span className="text-sm font-bold text-white uppercase tracking-tighter">Rules</span>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2" style={{ backgroundColor: cardBg, borderColor: primaryAccent }}>
          <Coins className="size-5" style={{ color: primaryAccent }} />
          <span className="font-bold text-white">{balance.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-8">
        <div className="text-center">
          <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">Combo Roulette</h2>
          <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mt-1">Triple Match Strategy</p>
        </div>
        
        <div 
          ref={gameAreaRef}
          className={`size-48 rounded-full border-8 flex items-center justify-center relative ${isSpinning ? 'animate-spin' : ''}`}
          style={{ 
            backgroundColor: cardBg, 
            borderColor: primaryAccent,
            boxShadow: `0 0 50px ${primaryAccent}40`
          }}
        >
          <div className="absolute inset-2 rounded-full border border-white/5" />
          {result !== null && (
            <div 
              className="size-24 rounded-full flex items-center justify-center text-5xl font-black text-white border-4 shadow-2xl"
              style={{ 
                backgroundColor: getNumberColor(result),
                borderColor: '#fff'
              }}
            >
              {result}
            </div>
          )}
          {result === null && (
            <div className="text-7xl drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">🎡</div>
          )}
        </div>
        
        {lastWin !== null && (
          <div className="text-4xl font-black animate-bounce" style={{ color: primaryAccent }}>
            +{lastWin.toFixed(2)} 🎉
          </div>
        )}
        
        {result !== null && lastWin === null && (
          <div className="text-xl font-bold text-red-500 animate-pulse uppercase tracking-widest">
            Combo Failed
          </div>
        )}
        
        <div className="w-full max-w-sm space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Color Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">1. Color</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setSelectedColor('red'); if (enableHaptics) vibrate(20); }}
                  disabled={isSpinning}
                  className="py-3 rounded-xl font-black text-sm transition-all active:scale-95 border-2 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedColor === 'red' ? '#FF0000' : 'transparent',
                    color: '#fff',
                    borderColor: selectedColor === 'red' ? '#fff' : '#FF000030',
                    boxShadow: selectedColor === 'red' ? '0 0 20px #FF000060' : 'none'
                  }}
                >
                  RED
                </button>
                <button
                  onClick={() => { setSelectedColor('black'); if (enableHaptics) vibrate(20); }}
                  disabled={isSpinning}
                  className="py-3 rounded-xl font-black text-sm transition-all active:scale-95 border-2 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedColor === 'black' ? '#111' : 'transparent',
                    color: '#fff',
                    borderColor: selectedColor === 'black' ? '#fff' : '#ffffff20',
                    boxShadow: selectedColor === 'black' ? '0 0 20px #ffffff20' : 'none'
                  }}
                >
                  BLACK
                </button>
              </div>
            </div>

            {/* Parity Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">2. Parity</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setSelectedParity('even'); if (enableHaptics) vibrate(20); }}
                  disabled={isSpinning}
                  className="py-3 rounded-xl font-black text-sm transition-all active:scale-95 border-2"
                  style={{
                    backgroundColor: selectedParity === 'even' ? primaryAccent : 'transparent',
                    color: selectedParity === 'even' ? '#000' : '#fff',
                    borderColor: selectedParity === 'even' ? '#fff' : `${primaryAccent}30`,
                    boxShadow: selectedParity === 'even' ? `0 0 20px ${primaryAccent}40` : 'none'
                  }}
                >
                  EVEN
                </button>
                <button
                  onClick={() => { setSelectedParity('odd'); if (enableHaptics) vibrate(20); }}
                  disabled={isSpinning}
                  className="py-3 rounded-xl font-black text-sm transition-all active:scale-95 border-2"
                  style={{
                    backgroundColor: selectedParity === 'odd' ? secondaryAccent : 'transparent',
                    color: selectedParity === 'odd' ? '#000' : '#fff',
                    borderColor: selectedParity === 'odd' ? '#fff' : `${secondaryAccent}30`,
                    boxShadow: selectedParity === 'odd' ? `0 0 20px ${secondaryAccent}40` : 'none'
                  }}
                >
                  ODD
                </button>
              </div>
            </div>

            {/* Range Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">3. Range</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setSelectedRange('low'); if (enableHaptics) vibrate(20); }}
                  disabled={isSpinning}
                  className="py-3 rounded-xl font-black text-sm transition-all active:scale-95 border-2"
                  style={{
                    backgroundColor: selectedRange === 'low' ? primaryAccent : 'transparent',
                    color: selectedRange === 'low' ? '#000' : '#fff',
                    borderColor: selectedRange === 'low' ? '#fff' : `${primaryAccent}30`,
                    boxShadow: selectedRange === 'low' ? `0 0 20px ${primaryAccent}40` : 'none'
                  }}
                >
                  1 - 18
                </button>
                <button
                  onClick={() => { setSelectedRange('high'); if (enableHaptics) vibrate(20); }}
                  disabled={isSpinning}
                  className="py-3 rounded-xl font-black text-sm transition-all active:scale-95 border-2"
                  style={{
                    backgroundColor: selectedRange === 'high' ? secondaryAccent : 'transparent',
                    color: selectedRange === 'high' ? '#000' : '#fff',
                    borderColor: selectedRange === 'high' ? '#fff' : `${secondaryAccent}30`,
                    boxShadow: selectedRange === 'high' ? `0 0 20px ${secondaryAccent}40` : 'none'
                  }}
                >
                  19 - 36
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black uppercase tracking-widest text-white/60">Total Bet</label>
              <div className="flex gap-2">
                {[10, 50, 100].map(val => (
                  <button 
                    key={val}
                    onClick={() => { setBetAmount(val); if (enableHaptics) vibrate(10); }}
                    className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white active:scale-90"
                  >
                    {val}
                  </button>
                ))}
                <button 
                  onClick={() => {
                    const user = getUser();
                    const vip = getVIPLevelByNumber(user.vipLevel);
                    const maxAllowed = user.vipLevel === 10 ? balance : Math.min(balance, vip.maxBet);
                    setBetAmount(maxAllowed);
                    if (enableHaptics) vibrate(30);
                  }}
                  className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-[10px] font-black text-white active:scale-90"
                  style={{ color: primaryAccent, borderColor: primaryAccent }}
                >
                  MAX
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                disabled={isSpinning}
                className="w-full px-6 py-4 rounded-2xl bg-white/5 border-2 text-white font-black text-2xl tracking-tighter italic text-center outline-none transition-all"
                style={{ borderColor: gameError ? '#ff1a1a' : primaryAccent }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                <Coins className="size-6 text-white" />
              </div>
            </div>
            {gameError && (
              <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="size-4 text-red-500" />
                <p className="text-red-500 text-[10px] font-bold uppercase">{gameError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4 shrink-0 sticky bottom-0 bg-black/80 backdrop-blur-md">
        <button
          onClick={spin}
          disabled={isSpinning || !isReady || betAmount > balance || betAmount <= 0}
          className="w-full py-5 rounded-2xl font-black text-black transition-all active:scale-95 disabled:opacity-30 shadow-2xl overflow-hidden relative group uppercase tracking-widest text-lg italic"
          style={{ backgroundColor: isReady ? primaryAccent : '#333', boxShadow: isReady ? `0 0 30px ${primaryAccent}60` : 'none' }}
        >
          {isSpinning ? (
              <span className="animate-pulse">SPINNING...</span>
          ) : !isReady ? (
            <span className="flex items-center justify-center gap-2">
              <Lock className="size-5" /> COMPLETE COMBO
            </span>
          ) : (
            `Spin x8 ( ${betAmount} )`
          )}
          {isReady && !isSpinning && (
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-active:translate-x-[0%] transition-transform duration-300" />
          )}
        </button>
      </div>
      
      {showRules && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-6" onClick={() => setShowRules(false)}>
          <div 
            className="w-full max-w-md p-8 rounded-[2rem] border-2 bg-[#050505] relative overflow-hidden" 
            style={{ borderColor: primaryAccent, boxShadow: `0 0 50px ${primaryAccent}40` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: primaryAccent }} />
            <h3 className="text-3xl font-black text-white mb-6 tracking-tighter italic uppercase">Combo Strategy</h3>
            <div className="space-y-4 text-sm text-white/70">
              <div className="flex gap-4">
                <div className="size-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-white">1</div>
                <p>Select <strong>one option in each category</strong> (Color + Parity + Range).</p>
              </div>
              <div className="flex gap-4">
                <div className="size-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-white">2</div>
                <p>Payout awarded <strong>only if all 3 predictions are correct</strong> simultaneously.</p>
              </div>
              <div className="flex gap-4">
                <div className="size-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-white">3</div>
                <p>Multiplier is fixed at <strong style={{ color: primaryAccent }}>x8</strong> (Perfect combo).</p>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-white/30 text-center">Number 0 cancels all combinations.</p>
              </div>
            </div>
            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-8 py-4 rounded-xl font-black text-black transition-all active:scale-95 uppercase tracking-widest"
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

export default RouletteGame;