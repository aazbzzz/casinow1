import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Coins, Trophy, Bomb, Gem, AlertCircle } from 'lucide-react';
import { vibrate } from '@aippy/runtime/device';
import { useGameSounds } from '@/hooks/useGameSounds';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { getCheats } from '@/lib/cheats';
import { getVIPLevelByNumber } from '@/lib/vip';
import { getUser } from '@/lib/storage';

const tweaks = aippyTweaks(tweaksConfig as any);

interface MinesGameProps {
  balance: number;
  onBet: (amount: number, game: string) => boolean;
  onWin: (betAmount: number, payout: number, multiplier: number, game: string) => number;
  onLoss: (betAmount: number, game: string) => void;
  onBack: () => void;
}

export function MinesGame({ balance, onBet, onWin, onLoss, onBack }: MinesGameProps) {
  const [betAmount, setBetAmount] = useState(10);
  const [minesCount, setMinesCount] = useState(3);
  const [gameActive, setGameActive] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [gameError, setGameError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const enableHaptics = tweaks.enableHaptics.useState();
  const enableSounds = tweaks.enableSounds.useState();
  
  const handleMaxBet = () => {
    const user = getUser();
    const vip = getVIPLevelByNumber(user.vipLevel);
    // Si VIP 10, le max est la balance entière, sinon c'est le maxBet du VIP
    const maxAllowed = user.vipLevel === 10 ? balance : Math.min(balance, vip.maxBet);
    setBetAmount(maxAllowed);
    if (enableHaptics) vibrate(30);
  };
  
  const startGame = () => {
    if (!onBet(betAmount, 'Mines')) {
      if (enableSounds) playError();
      if (enableHaptics) vibrate([100, 50, 100]);
      return;
    }
    
    if (enableSounds) playConfirm();
    if (enableHaptics) vibrate(50);
    
    const mines = new Set<number>();
    while (mines.size < minesCount) {
      mines.add(Math.floor(Math.random() * 25));
    }
    
    setMinePositions(mines);
    setRevealed(new Set());
    setGameActive(true);
    setGameOver(false);
    setLastWin(null);
    setCurrentMultiplier(1);
    
    // Auto-scroll slightly to grid for better focus
    setTimeout(() => {
      containerRef.current?.scrollTo({ top: 100, behavior: 'smooth' });
    }, 100);
  };
  
  const revealTile = (index: number) => {
    if (!gameActive || revealed.has(index) || gameOver) return;
    
    const newRevealed = new Set(revealed);
    newRevealed.add(index);
    setRevealed(newRevealed);
    
    const user = getUser();
    const cheats = getCheats(user);
    const hitMine = cheats.forceMinesSafe ? false : minePositions.has(index);
    
    if (hitMine) {
      setGameOver(true);
      setGameActive(false);
      onLoss(betAmount, 'Mines');
      if (enableSounds) playError();
      if (enableHaptics) vibrate([150, 80, 150]);
    } else {
      const safeCount = newRevealed.size;
      // Multiplier logic: 1.0 + (profit margin)
      // For a 1.20x win, profit is 0.20x.
      // We want payout = betAmount * multiplier.
      const newMultiplier = 1 + (safeCount / (25 - minesCount)) * (minesCount * 0.5);
      setCurrentMultiplier(newMultiplier);
      if (enableSounds) playConfirm();
      if (enableHaptics) vibrate(30);
    }
  };
  
  const cashout = () => {
    if (!gameActive || revealed.size === 0) return;
    
    const cheats = getCheats();
    const baseMultiplier = cheats.minesMaxMultiplier ? Math.max(currentMultiplier, 10) : currentMultiplier;
    const finalMultiplier = Number(cheats.customMultiplier) > 1 ? baseMultiplier * Number(cheats.customMultiplier) : baseMultiplier;
    const totalPayout = Number(betAmount) * finalMultiplier;
    
    console.log({ 
      game: 'Mines', 
      betAmount: Number(betAmount), 
      payout: totalPayout, 
      multiplier: finalMultiplier, 
      payoutType: typeof totalPayout, 
      multiplierType: typeof finalMultiplier 
    });
    
    const payoutResult = onWin(Number(betAmount), totalPayout, finalMultiplier, 'Mines');
    console.log('ONWIN RETURN =', payoutResult);
    setLastWin(payoutResult);
    setGameActive(false);
    setGameOver(true);
    if (enableSounds) playWin();
    if (enableHaptics) vibrate(200);
  };

  const handleBack = (e?: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (enableHaptics) vibrate(40);
    onBack();
  };
  
  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[200] flex flex-col bg-black overflow-y-auto overflow-x-hidden select-none"
    >
      {/* Background Layer */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#1a0a1f] via-black to-[#0a0a1f]" />
      </div>

      {/* Sticky Header */}
      <div className="relative z-50 p-4 flex items-center justify-between shrink-0 sticky top-0 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <button 
          onPointerDown={handleBack}
          className="flex items-center gap-2 text-gray-400 active:scale-90 transition-all p-3 -m-3 touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <ArrowLeft className="size-7" />
          <span className="font-bold text-lg">Back</span>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 shadow-lg" style={{ backgroundColor: cardBg, borderColor: primaryAccent, boxShadow: `0 0 20px ${primaryAccent}40` }}>
          <Coins className="size-5" style={{ color: primaryAccent }} />
          <span className="font-bold text-white text-lg">{balance.toFixed(2)}</span>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 py-8 gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Bomb className="size-10" style={{ color: primaryAccent }} />
            <h2 className="text-5xl font-black text-white italic tracking-tighter uppercase">Mines</h2>
          </div>
          <div className="h-1 w-20 rounded-full" style={{ backgroundColor: primaryAccent }} />
        </div>
        
        {!gameActive && !gameOver && (
          <div className="w-full max-w-sm space-y-6 p-8 rounded-[2.5rem] border-2 bg-black/40 backdrop-blur-xl" style={{ borderColor: `${primaryAccent}40`, boxShadow: `0 0 40px ${primaryAccent}20` }}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-black text-white/60 uppercase tracking-widest flex items-center gap-2">
                  <Coins className="size-4" style={{ color: primaryAccent }} />
                  Bet
                </label>
                <button 
                  onPointerDown={(e) => { e.preventDefault(); handleMaxBet(); }}
                  className="text-[10px] font-black px-3 py-1.5 rounded-lg border transition-all active:scale-90"
                  style={{ color: primaryAccent, borderColor: primaryAccent }}
                >
                  MAX
                </button>
              </div>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-6 py-4 rounded-2xl bg-white/5 border-2 text-white font-black text-2xl focus:outline-none transition-all"
                style={{ borderColor: gameError ? '#ff1a1a' : `${primaryAccent}30` }}
              />
              {gameError && (
                <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="size-4 text-red-500" />
                  <p className="text-red-500 text-[10px] font-bold uppercase">{gameError}</p>
                </div>
              )}
            </div>
            
            <div>
              <label className="text-xs font-black text-white/60 uppercase tracking-widest mb-4 block flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bomb className="size-4" style={{ color: primaryAccent }} />
                  Mines Count
                </span>
                <span className="text-2xl font-black italic" style={{ color: primaryAccent }}>{minesCount}</span>
              </label>
              <input
                type="range"
                min="1"
                max="24"
                value={minesCount}
                onChange={(e) => setMinesCount(Number(e.target.value))}
                className="w-full h-3 rounded-full appearance-none cursor-pointer bg-white/10 touch-pan-x"
                style={{
                  background: `linear-gradient(to right, ${primaryAccent} 0%, ${primaryAccent} ${(minesCount / 24) * 100}%, rgba(255,255,255,0.1) ${(minesCount / 24) * 100}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
              <div className="flex justify-between text-[10px] font-black text-white/20 mt-3 uppercase tracking-widest">
                <span>Safe</span>
                <span>Danger</span>
              </div>
            </div>
          </div>
        )}
        
        {gameActive && (
          <div className="w-full max-w-sm p-5 rounded-3xl border-2 flex items-center justify-between bg-black/60 backdrop-blur-xl" style={{ borderColor: primaryAccent, boxShadow: `0 0 40px ${primaryAccent}40` }}>
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl flex items-center justify-center border-2" style={{ borderColor: primaryAccent, backgroundColor: `${primaryAccent}10` }}>
                <Trophy className="size-6" style={{ color: primaryAccent }} />
              </div>
              <div>
                <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">Payout</div>
                <div className="text-3xl font-black italic tracking-tighter" style={{ color: primaryAccent }}>
                  {currentMultiplier.toFixed(2)}x
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">Current Win</div>
              <div className="text-2xl font-black text-white">
                {(betAmount * currentMultiplier).toFixed(2)}
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-5 gap-3 w-full max-w-sm p-5 rounded-[2.5rem] bg-white/5 border border-white/10 relative">
          {Array.from({ length: 25 }, (_, i) => {
            const isRevealed = revealed.has(i);
            const isMine = minePositions.has(i);
            const showMine = isRevealed && isMine;
            const showSafe = isRevealed && !isMine;
            
            // Cheat: Show mines
            const user = getUser();
            const cheats = getCheats(user);
            const shouldShowCheatMine = gameActive && !isRevealed && isMine && cheats.forceMinesSafe;

            return (
              <button
                key={i}
                onPointerDown={(e) => { e.preventDefault(); revealTile(i); }}
                disabled={!gameActive || isRevealed}
                className="aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:scale-100 relative overflow-hidden group touch-manipulation"
                style={{
                  backgroundColor: isRevealed ? (isMine ? '#ff1a1a' : primaryAccent) : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${isRevealed ? (isMine ? '#ff1a1a' : '#fff') : (shouldShowCheatMine ? '#ff1a1a60' : 'rgba(255,255,255,0.1)')}`,
                  boxShadow: isRevealed ? `0 0 25px ${isMine ? '#ff1a1a' : primaryAccent}60` : (shouldShowCheatMine ? `inset 0 0 15px #ff1a1a40` : 'none'),
                  pointerEvents: !gameActive || isRevealed ? 'none' : 'auto'
                }}
              >
                {showMine && <Bomb className="size-7 text-white" />}
                {showSafe && <Gem className="size-7 text-black" />}
                {shouldShowCheatMine && <Bomb className="size-5 text-red-500/40" />}
                {!isRevealed && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent group-active:from-white/20" />
                )}
              </button>
            );
          })}
        </div>
        
        {gameOver && (
          <div className="w-full max-w-sm p-8 rounded-[2.5rem] border-2 text-center animate-in zoom-in-95 duration-300" 
            style={{ 
              backgroundColor: cardBg, 
              borderColor: revealed.size > 0 && !minePositions.has(Array.from(revealed)[revealed.size - 1]) ? primaryAccent : '#ff1a1a',
              boxShadow: `0 0 50px ${revealed.size > 0 && !minePositions.has(Array.from(revealed)[revealed.size - 1]) ? primaryAccent : '#ff1a1a'}40`
            }}
          >
            <div className="text-7xl mb-4 leading-none">
              {revealed.size > 0 && minePositions.has(Array.from(revealed)[revealed.size - 1]) ? '💥' : '👑'}
            </div>
            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">
              {revealed.size > 0 && minePositions.has(Array.from(revealed)[revealed.size - 1]) ? 'Game Over' : 'Victory!'}
            </h3>
            <div className="text-white/60 font-bold uppercase tracking-widest text-sm mb-2">
              {revealed.size > 0 && minePositions.has(Array.from(revealed)[revealed.size - 1]) ? 'You hit a mine!' : `${currentMultiplier.toFixed(2)}x multiplier`}
            </div>
            {lastWin !== null && lastWin > 0 && (
              <div className="text-4xl font-black italic tracking-tighter animate-bounce mt-2" style={{ color: primaryAccent }}>
                +{lastWin.toFixed(2)} 🎉
              </div>
            )}
          </div>
        )}

        {/* Spacer for bottom sticky bar */}
        <div className="h-40 shrink-0" />
      </div>
      
      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-md z-50">
        {!gameActive && !gameOver && (
          <button
            onPointerDown={(e) => { e.preventDefault(); startGame(); }}
            disabled={betAmount > balance || betAmount <= 0}
            className="w-full py-5 rounded-2xl font-black text-black transition-all active:scale-95 disabled:opacity-30 shadow-2xl text-xl uppercase tracking-widest italic touch-manipulation"
            style={{ backgroundColor: primaryAccent, boxShadow: `0 10px 40px ${primaryAccent}60` }}
          >
            Bet & Play
          </button>
        )}
        {gameActive && (
            <button
              onPointerDown={(e) => { e.preventDefault(); cashout(); }}
              disabled={revealed.size === 0}
              className="w-full py-5 rounded-2xl font-black text-black transition-all active:scale-95 disabled:opacity-30 shadow-2xl text-xl uppercase tracking-widest italic touch-manipulation"
              style={{ backgroundColor: primaryAccent, boxShadow: `0 10px 40px ${primaryAccent}60` }}
            >
              Cashout {currentMultiplier.toFixed(2)}x
            </button>
        )}
        {gameOver && (
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              setGameOver(false);
              setGameActive(false);
              setRevealed(new Set());
              setMinePositions(new Set());
              setCurrentMultiplier(1);
            }}
            className="w-full py-5 rounded-2xl font-black text-black transition-all active:scale-95 shadow-2xl text-xl uppercase tracking-widest italic touch-manipulation"
            style={{ backgroundColor: primaryAccent, boxShadow: `0 10px 40px ${primaryAccent}60` }}
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}