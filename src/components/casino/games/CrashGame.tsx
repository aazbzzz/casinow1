import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Coins, Info, AlertCircle } from 'lucide-react';
import { vibrate } from '@aippy/runtime/device';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { getCheats } from '@/lib/cheats';
import { getVIPLevelByNumber } from '@/lib/vip';
import { getUser } from '@/lib/storage';

const tweaks = aippyTweaks(tweaksConfig as any);

interface CrashGameProps {
  balance: number;
  onBet: (amount: number, game: string) => boolean;
  onWin: (betAmount: number, payout: number, multiplier: number, game: string) => number;
  onLoss: (betAmount: number, game: string) => void;
  onBack: () => void;
}

export function CrashGame({ balance, onBet, onWin, onLoss, onBack }: CrashGameProps) {
  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState<'idle' | 'betting' | 'running' | 'crashed'>('idle');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(1.00);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [blink, setBlink] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const startTimeRef = useRef(0);
  const animFrameRef = useRef(0);
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
  const enableHaptics = tweaks.enableHaptics.useState();
  
  useEffect(() => {
    if (gameState === 'running') {
      const blinkInterval = setInterval(() => {
        setBlink(prev => !prev);
      }, 300);
      return () => clearInterval(blinkInterval);
    } else {
      setBlink(false);
    }
  }, [gameState]);
  
  useEffect(() => {
    if (gameState !== 'running') return;
    
    const animate = () => {
      const user = getUser();
      const cheats = getCheats(user);
      
      const startMult = cheats.crashStartMultiplier || 1.0;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newMultiplier = startMult + elapsed * 0.5;
      
      if (!cheats.crashNeverCrash && newMultiplier >= crashPoint) {
        setCurrentMultiplier(crashPoint);
        setGameState('crashed');
        if (hasBet && !cashedOut) {
          onLoss(betAmount, 'Crash');
          if (enableHaptics) vibrate([100, 50, 100]);
        }
        return;
      }
      
      setCurrentMultiplier(newMultiplier);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameState, crashPoint, hasBet, cashedOut, betAmount, onLoss, enableHaptics]);
  
  const placeBet = () => {
    if (!onBet(betAmount, 'Crash')) {
      if (enableHaptics) vibrate([100, 50, 100]);
      return;
    }
    
    if (enableHaptics) vibrate(50);
    
    setHasBet(true);
    setGameState('betting');
    
    const user = getUser();
    const cheats = getCheats(user);
    let crash: number;
    
    if (cheats.crashNeverCrash) {
      crash = 1000000; // Multiplier virtually infinite
    } else if (cheats.crashMaxMultiplier) {
      crash = 100;
    } else if (cheats.forceCrashMultiplier !== null && cheats.forceCrashMultiplier > 1) {
      crash = cheats.forceCrashMultiplier;
    } else if (cheats.alwaysWin) {
      crash = 10 + Math.random() * 10;
    } else {
      const randomValue = Math.random();
      if (randomValue < 0.5) {
        crash = 1 + Math.random() * 2;
      } else if (randomValue < 0.8) {
        crash = 2 + Math.random() * 3;
      } else if (randomValue < 0.95) {
        crash = 5 + Math.random() * 5;
      } else {
        crash = 10 + Math.random() * 10;
      }
    }
    
    setCrashPoint(crash);
    
    setTimeout(() => {
      const user = getUser();
      const cheats = getCheats(user);
      const startMult = cheats.crashStartMultiplier || 1.0;
      
      setGameState('running');
      setCurrentMultiplier(startMult);
      startTimeRef.current = Date.now();
      gameAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 1500);
  };
  
  const cashOut = () => {
    if (gameState !== 'running' || !hasBet || cashedOut) return;
    
    const user = getUser();
    const cheats = getCheats(user);
    const baseMultiplier = cheats.crashMaxMultiplier ? Math.max(currentMultiplier, 100) : currentMultiplier;
    const finalMultiplier = Number(cheats.customMultiplier) > 1 ? baseMultiplier * Number(cheats.customMultiplier) : baseMultiplier;
    
    setCashedOut(true);
    const totalPayout = Number(betAmount) * finalMultiplier;
    
    console.log({ 
      game: 'Crash', 
      betAmount: Number(betAmount), 
      payout: totalPayout, 
      multiplier: finalMultiplier, 
      payoutType: typeof totalPayout, 
      multiplierType: typeof finalMultiplier 
    });
    
    const bonusWon = onWin(Number(betAmount), totalPayout, finalMultiplier, 'Crash');
    console.log('ONWIN RETURN =', bonusWon);
    setLastWin(bonusWon);
    if (enableHaptics) vibrate(200);
    
    setTimeout(() => {
      resetGame();
    }, 2000);
  };
  
  const resetGame = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setGameState('idle');
    setCurrentMultiplier(1.00);
    setHasBet(false);
    setCashedOut(false);
    setLastWin(null);
    setCrashPoint(1.00);
    startTimeRef.current = 0;
  };
  
  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-[#0a0a0f] via-[#1a0a1f] to-[#0f0a1a] overflow-y-auto overflow-x-hidden">
      <div className="p-4 flex items-center justify-between shrink-0 sticky top-0 z-20 bg-gradient-to-b from-[#0a0a0f] to-transparent backdrop-blur-sm">
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
          <span className="font-bold text-white text-lg">{Math.ceil(balance)}</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-start gap-6 px-4 pb-4">
        <h2 className="text-3xl font-black text-white mt-6">🚀 Crash</h2>
        
        {gameState === 'idle' && (
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: primaryAccent }}>Bet Amount</label>
              <button 
                onClick={() => {
                  const user = getUser();
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
        )}
        
        <div 
          ref={gameAreaRef}
          className="w-full max-w-md aspect-square rounded-2xl border-4 flex flex-col items-center justify-center p-8" 
          style={{ 
            backgroundColor: cardBg, 
            borderColor: gameState === 'crashed' ? '#ff0000' : primaryAccent,
            boxShadow: gameState === 'running' ? `0 0 40px ${primaryAccent}60` : 'none'
          }}
        >
          <div 
            className={`text-9xl font-black transition-all duration-300 ${blink && gameState === 'running' ? 'scale-110' : 'scale-100'}`}
            style={{ 
              color: gameState === 'crashed' ? '#ff0000' : primaryAccent,
              textShadow: gameState === 'running' ? `0 0 40px ${primaryAccent}` : 'none',
              lineHeight: 1
            }}
          >
            {currentMultiplier.toFixed(2)}x
          </div>
          
          {gameState === 'betting' && (
            <div className="text-xl text-gray-400 animate-pulse mt-4">
              Starting...
            </div>
          )}
          
          {gameState === 'crashed' && (
            <div className="text-4xl font-bold text-red-500 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
              💥 CRASH!
            </div>
          )}
          
          {cashedOut && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
              <div className="text-3xl font-bold" style={{ color: primaryAccent }}>
                ✅ Cashed Out!
              </div>
              {lastWin !== null && (
                <div className="text-4xl font-black mt-2" style={{ color: primaryAccent }}>
                  +{Math.ceil(lastWin)} 🎉
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 shrink-0 sticky bottom-0 bg-gradient-to-t from-[#0a0a0f] to-transparent backdrop-blur-sm">
        {gameState === 'idle' && (
          <button
            onClick={placeBet}
            disabled={betAmount > balance}
            className="w-full py-4 rounded-xl font-bold text-black transition-all active:scale-95 disabled:opacity-50 shadow-lg"
            style={{ backgroundColor: primaryAccent, boxShadow: `0 0 20px ${primaryAccent}60` }}
          >
            Place Bet
          </button>
        )}
        
        {gameState === 'running' && hasBet && !cashedOut && (
          <button
            onClick={cashOut}
            className="w-full py-4 rounded-xl font-bold text-black transition-all active:scale-95 shadow-lg animate-pulse"
            style={{ backgroundColor: primaryAccent, boxShadow: `0 0 20px ${primaryAccent}60` }}
          >
            Cashout {Math.ceil(betAmount * currentMultiplier)}
          </button>
        )}
        
        {(gameState === 'crashed' || cashedOut) && (
          <button
            onClick={resetGame}
            className="w-full py-4 rounded-xl font-bold text-black transition-all active:scale-95 shadow-lg"
            style={{ backgroundColor: primaryAccent, boxShadow: `0 0 20px ${primaryAccent}60` }}
          >
            New Round
          </button>
        )}
      </div>
      
      {showRules && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setShowRules(false)}>
          <div className="w-full max-w-md p-6 rounded-2xl border-2" style={{ backgroundColor: cardBg, borderColor: primaryAccent }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-white mb-4">📜 Crash Rules</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <p><strong style={{ color: primaryAccent }}>Goal:</strong> Cash out before the multiplier crashes</p>
              <p><strong style={{ color: primaryAccent }}>Rising:</strong> Multiplier increases gradually</p>
              <p><strong style={{ color: primaryAccent }}>Cashout:</strong> Cash out anytime to secure winnings</p>
              <p><strong style={{ color: primaryAccent }}>Crash:</strong> If you don't cash out before crash, you lose everything</p>
              <p><strong style={{ color: primaryAccent }}>Strategy:</strong> Wait longer for higher payout, but higher risk</p>
              <div className="pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-400">Crash point is random between 1x and 20x</p>
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