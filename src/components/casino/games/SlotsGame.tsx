import { useState, useRef } from 'react';
import { ArrowLeft, Coins, Info } from 'lucide-react';
import { vibrate } from '@aippy/runtime/device';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { getCheats } from '@/lib/cheats';

const tweaks = aippyTweaks(tweaksConfig as any);

interface SlotsGameProps {
  balance: number;
  onBet: (amount: number, game: string) => boolean;
  onWin: (betAmount: number, payout: number, multiplier: number, game: string) => number;
  onLoss: (betAmount: number, game: string) => void;
  onBack: () => void;
}

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐'];
const PAYOUTS: Record<string, number> = {
  '🍒': 2,
  '🍋': 3,
  '🍊': 4,
  '🍇': 5,
  '💎': 10,
  '7️⃣': 20,
  '⭐': 50,
};

export function SlotsGame({ balance, onBet, onWin, onLoss, onBack }: SlotsGameProps) {
  const [betAmount, setBetAmount] = useState(10);
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  const animSpeed = tweaks.animationSpeed.useState();
  
  const spin = async () => {
    if (isSpinning || !onBet(betAmount, 'Slots')) {
      if (enableHaptics) vibrate([100, 50, 100]);
      return;
    }
    
    if (enableHaptics) vibrate(50);
    
    setIsSpinning(true);
    setLastWin(null);
    
    setTimeout(() => {
      gameAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    const spinDuration = animSpeed * 3;
    const spinInterval = 100;
    const spinCount = spinDuration / spinInterval;
    
    let count = 0;
    const interval = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
      count++;
      
      if (count >= spinCount) {
        clearInterval(interval);
        
        const cheats = getCheats();
        let finalReels: string[];
        
        if (cheats.forceSlotsSymbol && SYMBOLS.includes(cheats.forceSlotsSymbol)) {
          finalReels = [cheats.forceSlotsSymbol, cheats.forceSlotsSymbol, cheats.forceSlotsSymbol];
        } else if (cheats.alwaysWin) {
          const winSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          finalReels = [winSymbol, winSymbol, winSymbol];
        } else {
          finalReels = [
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          ];
        }
        setReels(finalReels);
        
        const allSame = finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2];
        const twoSame = finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2] || finalReels[0] === finalReels[2];
        
        if (allSame) {
          const baseMultiplier = PAYOUTS[finalReels[0]] || 1;
          const finalMultiplier = cheats.customMultiplier > 1 ? baseMultiplier * cheats.customMultiplier : baseMultiplier;
          const totalPayout = betAmount * finalMultiplier;
          
          console.log({ 
            game: 'Slots', 
            betAmount, 
            payout: totalPayout, 
            multiplier: finalMultiplier, 
            payoutType: typeof totalPayout, 
            multiplierType: typeof finalMultiplier 
          });
          
          const payout = onWin(betAmount, totalPayout, finalMultiplier, 'Slots');
          setLastWin(payout);
          if (enableHaptics) vibrate(200);
        } else if (twoSame) {
          const symbol = finalReels[0] === finalReels[1] ? finalReels[0] : finalReels[1] === finalReels[2] ? finalReels[1] : finalReels[0];
          const baseMultiplier = (PAYOUTS[symbol] || 1) * 0.5;
          const finalMultiplier = cheats.customMultiplier > 1 ? baseMultiplier * cheats.customMultiplier : baseMultiplier;
          const totalPayout = betAmount * finalMultiplier;
          
          console.log({ 
            game: 'Slots', 
            betAmount, 
            payout: totalPayout, 
            multiplier: finalMultiplier, 
            payoutType: typeof totalPayout, 
            multiplierType: typeof finalMultiplier 
          });
          
          const payout = onWin(betAmount, totalPayout, finalMultiplier, 'Slots');
          setLastWin(payout);
          if (enableHaptics) vibrate(100);
        } else {
          onLoss(betAmount, 'Slots');
          if (enableHaptics) vibrate([100, 50, 100]);
        }
        
        setIsSpinning(false);
      }
    }, spinInterval);
  };
  
  return (
    <div 
      className="fixed inset-0 flex flex-col bg-gradient-to-br from-[#0a0a0f] via-[#1a0a1f] to-[#0f0a1a] overflow-y-auto overflow-x-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSpinning) {
          spin();
        }
      }}
    >
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
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2" style={{ backgroundColor: cardBg, borderColor: primaryAccent }}>
          <Coins className="size-5" style={{ color: primaryAccent }} />
          <span className="font-bold text-white">{balance.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-4">
        <h2 className="text-3xl font-black text-white">🎰 Slots</h2>
        
        <div ref={gameAreaRef} className="flex gap-3 p-6 rounded-3xl border-4" 
             style={{ 
               backgroundColor: cardBg, 
               borderColor: primaryAccent,
               boxShadow: isSpinning ? `0 0 40px ${primaryAccent}60` : 'none'
             }}>
          {reels.map((symbol, i) => (
            <div
              key={i}
              className={`size-20 rounded-2xl flex items-center justify-center text-5xl border-2 ${isSpinning ? 'animate-bounce' : ''}`}
              style={{ 
                backgroundColor: '#000',
                borderColor: primaryAccent,
              }}
            >
              {symbol}
            </div>
          ))}
        </div>
        
        {lastWin !== null && (
          <div className="text-3xl font-black animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ color: primaryAccent }}>
            +{lastWin.toFixed(2)} 🎉
          </div>
        )}
        
        <div className="w-full max-w-sm space-y-3">
          <div className="p-3 rounded-xl border-2" style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}40` }}>
            <div className="text-xs font-semibold mb-2 text-center" style={{ color: primaryAccent }}>Payouts (3 matching symbols)</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(PAYOUTS).map(([symbol, mult]) => (
                <div key={symbol} className="flex items-center justify-between text-white px-2 py-1 rounded" style={{ backgroundColor: '#00000040' }}>
                  <span className="text-base">{symbol}{symbol}{symbol}</span>
                  <span className="font-bold" style={{ color: primaryAccent }}>{mult}x</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 text-center mb-1">2 matching symbols = 50% payout</div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold" style={{ color: primaryAccent }}>Bet Amount</label>
              <button 
                onClick={() => setBetAmount(balance)}
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
              disabled={isSpinning}
              className="w-full px-4 py-3 rounded-xl bg-black/30 border-2 text-white font-semibold text-lg"
              style={{ borderColor: primaryAccent }}
            />
          </div>
        </div>
      </div>
      
      <div className="p-4 shrink-0 sticky bottom-0 bg-gradient-to-t from-[#0a0a0f] to-transparent backdrop-blur-sm">
        <button
          onClick={spin}
          disabled={isSpinning || betAmount > balance}
          className="w-full py-4 rounded-xl font-bold text-black transition-all active:scale-95 disabled:opacity-50 shadow-lg"
          style={{ backgroundColor: primaryAccent, boxShadow: `0 0 20px ${primaryAccent}60` }}
        >
          {isSpinning ? 'Spinning...' : 'Spin'}
        </button>
      </div>
      
      {showRules && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setShowRules(false)}>
          <div className="w-full max-w-md p-6 rounded-2xl border-2" style={{ backgroundColor: cardBg, borderColor: primaryAccent }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-white mb-4">📜 Slots Rules</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <p><strong style={{ color: primaryAccent }}>Goal:</strong> Align 3 matching symbols to win</p>
              <p><strong style={{ color: primaryAccent }}>3 matching symbols:</strong> Full payout per table</p>
              <p><strong style={{ color: primaryAccent }}>2 matching symbols:</strong> 50% of symbol payout</p>
              <p><strong style={{ color: primaryAccent }}>No match:</strong> Lose bet</p>
              <div className="pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-400">Winnings multiplied by VIP level</p>
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