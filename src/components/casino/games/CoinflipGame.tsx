import { useState, useRef } from 'react';
import { ArrowLeft, Coins, Info } from 'lucide-react';
import { vibrate } from '@aippy/runtime/device';
import { useGameSounds } from '@/hooks/useGameSounds';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { getCheats } from '@/lib/cheats';

const tweaks = aippyTweaks(tweaksConfig as any);

interface CoinflipGameProps {
  balance: number;
  onBet: (amount: number, game: string) => boolean;
  onWin: (betAmount: number, payout: number, multiplier: number, game: string) => number;
  onLoss: (betAmount: number, game: string) => void;
  onBack: () => void;
}

export function CoinflipGame({ balance, onBet, onWin, onLoss, onBack }: CoinflipGameProps) {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  
  const { playConfirm, playWin, playError } = useGameSounds();
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  const enableSounds = tweaks.enableSounds.useState();
  const animSpeed = tweaks.animationSpeed.useState();
  
  const handleFlip = async () => {
    if (isFlipping || !onBet(betAmount, 'Coinflip')) {
      if (enableSounds) playError();
      if (enableHaptics) vibrate([100, 50, 100]);
      return;
    }
    
    if (enableSounds) playConfirm();
    if (enableHaptics) vibrate(50);
    
    setIsFlipping(true);
    setResult(null);
    setLastWin(null);
    
    setTimeout(() => {
      gameAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    const cheats = getCheats();
    let coinResult: 'heads' | 'tails';
    
    if (cheats.forceCoinflipSide) {
      coinResult = cheats.forceCoinflipSide;
    } else if (cheats.alwaysWin) {
      coinResult = selectedSide;
    } else {
      coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
    }
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = rotation + (spins * 360) + (coinResult === 'heads' ? 0 : 180);
    setRotation(finalRotation);
    
    setTimeout(() => {
      setResult(coinResult);
      
      if (coinResult === selectedSide) {
        const baseMultiplier = 2;
        const finalMultiplier = cheats.customMultiplier > 1 ? baseMultiplier * cheats.customMultiplier : baseMultiplier;
        const totalPayout = betAmount * finalMultiplier;
        
        console.log({ 
          game: 'Coinflip', 
          betAmount, 
          payout: totalPayout, 
          multiplier: finalMultiplier, 
          payoutType: typeof totalPayout, 
          multiplierType: typeof finalMultiplier 
        });
        
        const payout = onWin(betAmount, totalPayout, finalMultiplier, 'Coinflip');
        setLastWin(payout);
        if (enableSounds) playWin();
        if (enableHaptics) vibrate(200);
      } else {
        onLoss(betAmount, 'Coinflip');
        if (enableHaptics) vibrate([100, 50, 100]);
      }
      
      setIsFlipping(false);
    }, animSpeed);
  };
  
  return (
    <div 
      className="fixed inset-0 flex flex-col bg-gradient-to-br from-[#0a0a0f] via-[#1a0a1f] to-[#0f0a1a] overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFlipping) {
          handleFlip();
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
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2" style={{ backgroundColor: cardBg, borderColor: primaryAccent }}>
          <Coins className="size-5" style={{ color: primaryAccent }} />
          <span className="font-bold text-white">{balance.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-4">
        <h2 className="text-3xl font-black text-white">🪙 Coinflip</h2>
        
        <div ref={gameAreaRef} className="relative size-32">
          <div 
            className="size-32 rounded-full flex items-center justify-center text-6xl transition-transform duration-1000 ease-out"
            style={{ 
              backgroundColor: cardBg,
              transform: `rotateY(${rotation}deg)`,
              boxShadow: `0 0 30px ${primaryAccent}40`
            }}
          >
            {result === null ? '🪙' : result === 'heads' ? '👑' : '⚡'}
          </div>
        </div>
        
        {lastWin !== null && (
          <div className="text-3xl font-black animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ color: primaryAccent }}>
            +{lastWin.toFixed(2)} 🎉
          </div>
        )}
        
        {result !== null && lastWin === null && (
          <div className="text-2xl font-bold text-red-500 animate-in fade-in slide-in-from-bottom-4 duration-500">
            Lost 😢
          </div>
        )}
        
        <div className="w-full max-w-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedSide('heads')}
              disabled={isFlipping}
              className="py-4 rounded-xl font-bold transition-all active:scale-95 border-2"
              style={{
                backgroundColor: selectedSide === 'heads' ? primaryAccent : cardBg,
                color: selectedSide === 'heads' ? '#000' : '#fff',
                borderColor: selectedSide === 'heads' ? primaryAccent : '#333',
              }}
            >
              👑 Heads
            </button>
            <button
              onClick={() => setSelectedSide('tails')}
              disabled={isFlipping}
              className="py-4 rounded-xl font-bold transition-all active:scale-95 border-2"
              style={{
                backgroundColor: selectedSide === 'tails' ? primaryAccent : cardBg,
                color: selectedSide === 'tails' ? '#000' : '#fff',
                borderColor: selectedSide === 'tails' ? primaryAccent : '#333',
              }}
            >
              ⚡ Tails
            </button>
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
              disabled={isFlipping}
              className="w-full px-4 py-3 rounded-xl bg-black/30 border-2 text-white font-semibold text-lg"
              style={{ borderColor: primaryAccent }}
            />
          </div>
        </div>
      </div>
      
      <div className="p-4 shrink-0">
        <button
          onClick={handleFlip}
          disabled={isFlipping || betAmount > balance}
          className="w-full py-4 rounded-xl font-bold text-black transition-all active:scale-95 disabled:opacity-50 shadow-lg"
          style={{ backgroundColor: primaryAccent, boxShadow: `0 0 20px ${primaryAccent}60` }}
        >
          {isFlipping ? 'Flipping...' : 'Flip Coin'}
        </button>
      </div>
      
      {showRules && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setShowRules(false)}>
          <div className="w-full max-w-md p-6 rounded-2xl border-2" style={{ backgroundColor: cardBg, borderColor: primaryAccent }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-white mb-4">📜 Coinflip Rules</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <p><strong style={{ color: primaryAccent }}>Goal:</strong> Guess the coin side</p>
              <p><strong style={{ color: primaryAccent }}>Heads (👑):</strong> Crown side</p>
              <p><strong style={{ color: primaryAccent }}>Tails (⚡):</strong> Lightning side</p>
              <p><strong style={{ color: primaryAccent }}>Payout:</strong> 2x bet if correct</p>
              <p><strong style={{ color: primaryAccent }}>Probability:</strong> 50% chance each side</p>
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