import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Coins, Target, Info, AlertCircle } from 'lucide-react';
import { vibrate } from '@aippy/runtime/device';
import { useGameSounds } from '@/hooks/useGameSounds';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { getCheats } from '@/lib/cheats';
import { getVIPLevelByNumber } from '@/lib/vip';
import { getUser } from '@/lib/storage';

const tweaks = aippyTweaks(tweaksConfig as any);

interface PlinkoGameProps {
  balance: number;
  onBet: (amount: number, game: string) => boolean;
  onWin: (betAmount: number, payout: number, multiplier: number, game: string) => number;
  onLoss: (betAmount: number, game: string) => void;
  onBack: () => void;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  radius: number;
}

const MULTIPLIERS = [16, 9, 4.2, 2, 1.2, 0.6, 0.3, 0.2, 0.3, 0.6, 1.2, 2, 4.2, 9, 16];
const ROWS = 14;

export function PlinkoGame({ balance, onBet, onWin, onLoss, onBack }: PlinkoGameProps) {
  const [betAmount, setBetAmount] = useState(10);
  const [isDropping, setIsDropping] = useState(false);
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleError = (e: any) => {
      setGameError(e.detail.message);
      setTimeout(() => setGameError(null), 3000);
    };
    window.addEventListener('casino_game_error', handleError);
    return () => window.removeEventListener('casino_game_error', handleError);
  }, []);
  
  const ballRef = useRef<Ball | null>(null);
  const animFrameRef = useRef<number>(0);
  const pegsRef = useRef<{ x: number; y: number }[]>([]);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  
  const { playConfirm, playWin, playError } = useGameSounds();
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  const enableSounds = tweaks.enableSounds.useState();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const pegRadius = 4;
    const ballRadius = 8;
    const pegSpacingY = (height - 120) / (ROWS + 2);
    const pegSpacingX = (width - 40) / (MULTIPLIERS.length - 1);
    
    pegsRef.current = [];
    for (let row = 0; row < ROWS; row++) {
      const pegsInRow = row + 3;
      const rowWidth = (pegsInRow - 1) * pegSpacingX;
      const offsetX = (width - rowWidth) / 2;
      for (let col = 0; col < pegsInRow; col++) {
        pegsRef.current.push({
          x: offsetX + col * pegSpacingX,
          y: 60 + row * pegSpacingY,
        });
      }
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      ctx.fillStyle = `${primaryAccent}`;
      ctx.shadowColor = primaryAccent;
      ctx.shadowBlur = 10;
      pegsRef.current.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, pegRadius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      
      const slotWidth = width / MULTIPLIERS.length;
      const slotY = height - 60;
      const slotHeight = 50;
      
      MULTIPLIERS.forEach((mult, i) => {
        const x = i * slotWidth;
        let color: string;
        if (mult >= 9) color = primaryAccent;
        else if (mult >= 4) color = '#FFD700';
        else if (mult >= 1.5) color = '#90EE90';
        else if (mult >= 1) color = '#87CEEB';
        else color = '#FF6B6B';
        
        ctx.fillStyle = `${color}20`;
        ctx.fillRect(x + 2, slotY, slotWidth - 4, slotHeight);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, slotY, slotWidth - 4, slotHeight);
        
        ctx.fillStyle = color;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${mult}x`, x + slotWidth / 2, slotY + slotHeight / 2);
      });
      
      if (ballRef.current && ballRef.current.active) {
        const ball = ballRef.current;
        
        ball.vy += 0.5;
        
        // Cheat Steering
         const user = getUser();
         const cheats = getCheats(user);
         let targetX: number | null = null;
         
         if (cheats.forcePlinkoMultiplier !== null) {
           // Direct multiplier target
           const targetIdx = MULTIPLIERS.indexOf(cheats.forcePlinkoMultiplier);
           if (targetIdx !== -1) targetX = targetIdx * slotWidth + slotWidth / 2;
         } else if (cheats.plinkoMaxMultiplier) {
            // Slots 0 or 14 (16x)
            targetX = ball.x < width / 2 ? slotWidth / 2 : width - slotWidth / 2;
          } else if (cheats.forcePlinkoWin) {
            // Slots with mult >= 4
            const validIndices = MULTIPLIERS.map((m, i) => m >= 4 ? i : -1).filter(i => i !== -1);
            const targetIdx = validIndices.reduce((prev, curr) => {
              const prevX = prev * slotWidth + slotWidth / 2;
              const currX = curr * slotWidth + slotWidth / 2;
              return Math.abs(currX - ball.x) < Math.abs(prevX - ball.x) ? curr : prev;
            });
            targetX = targetIdx * slotWidth + slotWidth / 2;
          } else if (cheats.alwaysWin) {
            // Slots with mult >= 1
            const validIndices = MULTIPLIERS.map((m, i) => m >= 1 ? i : -1).filter(i => i !== -1);
            const targetIdx = validIndices.reduce((prev, curr) => {
              const prevX = prev * slotWidth + slotWidth / 2;
              const currX = curr * slotWidth + slotWidth / 2;
              return Math.abs(currX - ball.x) < Math.abs(prevX - ball.x) ? curr : prev;
            });
            targetX = targetIdx * slotWidth + slotWidth / 2;
          }
  
          if (targetX !== null) {
            const dx = targetX - ball.x;
            ball.vx += dx * 0.015; // Slightly stronger pull
          }

        ball.x += ball.vx;
        ball.y += ball.vy;
        
        ball.vx *= 0.98;
        
        if (ball.x - ballRadius < 10) {
          ball.x = 10 + ballRadius;
          ball.vx = Math.abs(ball.vx) * 0.8;
        }
        if (ball.x + ballRadius > width - 10) {
          ball.x = width - 10 - ballRadius;
          ball.vx = -Math.abs(ball.vx) * 0.8;
        }
        
        pegsRef.current.forEach(peg => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = ballRadius + pegRadius;
          
          if (dist < minDist) {
            const angle = Math.atan2(dy, dx);
            ball.x = peg.x + Math.cos(angle) * minDist;
            ball.y = peg.y + Math.sin(angle) * minDist;
            
            const deflection = (Math.random() - 0.5) * 3;
            ball.vx = Math.cos(angle) * 3 + deflection;
            ball.vy = Math.abs(Math.sin(angle)) * 3;
            
            if (enableHaptics) vibrate(15);
          }
        });
        
        const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ballRadius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, primaryAccent);
        ctx.fillStyle = gradient;
        ctx.shadowColor = primaryAccent;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        if (ball.y >= slotY - ballRadius) {
          ball.active = false;
          const user = getUser();
          const cheats = getCheats(user);
          let slotIndex = Math.floor(ball.x / slotWidth);
          
          if (cheats.forcePlinkoMultiplier !== null) {
            // Force the EXACT multiplier index
            const targetIdx = MULTIPLIERS.indexOf(cheats.forcePlinkoMultiplier);
            if (targetIdx !== -1) slotIndex = targetIdx;
          } else if (cheats.plinkoMaxMultiplier) {
            // Force 16x (nearest)
            slotIndex = ball.x < width / 2 ? 0 : MULTIPLIERS.length - 1;
          } else if (cheats.forcePlinkoWin) {
            const winningSlots = MULTIPLIERS.map((m, i) => ({ mult: m, idx: i })).filter(s => s.mult >= 4);
            const nearest = winningSlots.reduce((prev, curr) => {
              const prevDist = Math.abs((prev.idx * slotWidth + slotWidth/2) - ball.x);
              const currDist = Math.abs((curr.idx * slotWidth + slotWidth/2) - ball.x);
              return currDist < prevDist ? curr : prev;
            });
            slotIndex = nearest.idx;
          } else if (cheats.alwaysWin) {
            const winningSlots = MULTIPLIERS.map((m, i) => ({ mult: m, idx: i })).filter(s => s.mult >= 1);
            const nearest = winningSlots.reduce((prev, curr) => {
              const prevDist = Math.abs((prev.idx * slotWidth + slotWidth/2) - ball.x);
              const currDist = Math.abs((curr.idx * slotWidth + slotWidth/2) - ball.x);
              return currDist < prevDist ? curr : prev;
            });
            slotIndex = nearest.idx;
          }
          
          const finalSlot = Math.max(0, Math.min(MULTIPLIERS.length - 1, slotIndex));
          const baseMultiplier = cheats.plinkoMaxMultiplier ? Math.max(MULTIPLIERS[finalSlot], 16) : MULTIPLIERS[finalSlot];
          const finalMultiplier = Number(cheats.customMultiplier) > 1 ? baseMultiplier * Number(cheats.customMultiplier) : baseMultiplier;
          const totalPayout = Number(betAmount) * finalMultiplier;
          
          // Toujours utiliser onWin pour Plinko car même un multi < 1 (ex: 0.5x) 
          // doit rendre une partie de la mise à l'utilisateur.
          // Le système useGameState gère les multiplicateurs < 1 correctement.
          console.log({ 
            game: 'Plinko', 
            betAmount: Number(betAmount), 
            payout: totalPayout, 
            multiplier: finalMultiplier, 
            payoutType: typeof totalPayout, 
            multiplierType: typeof finalMultiplier 
          });

          const payoutResult = onWin(Number(betAmount), totalPayout, finalMultiplier, 'Plinko');

          // QUEST UPDATE (NO CHEATS)
          const isCheating = cheats.forcePlinkoMultiplier !== null || cheats.plinkoMaxMultiplier || cheats.forcePlinkoWin || cheats.alwaysWin;
          if (!isCheating) {
            window.dispatchEvent(new CustomEvent('quest_update', {
              detail: {
                game: 'Plinko',
                status: finalMultiplier >= 1 ? 'completed' : 'failed',
                betAmount: Number(betAmount),
                payout: payoutResult,
                multiplier: finalMultiplier,
              }
            }));
          }

          // TRACK PLINKO X16 STAT
          if (finalMultiplier >= 16) {
            window.dispatchEvent(new CustomEvent('stat_update', { 
              detail: { key: 'plinkoX16Count', value: 1 } 
            }));
          }

          console.log('ONWIN RETURN =', payoutResult);
          setLastMultiplier(finalMultiplier);
          setLastPayout(payoutResult);
          
          if (finalMultiplier >= 1) {
            if (enableSounds) playWin();
            if (enableHaptics) vibrate(200);
          } else {
            if (enableHaptics) vibrate([50, 50]);
          }
          
          setIsDropping(false);
        }
      }
      
      animFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [primaryAccent, betAmount, enableHaptics, enableSounds, onWin, onLoss, playWin]);
  
  const dropBall = () => {
    if (isDropping || !onBet(betAmount, 'Plinko')) {
      if (enableSounds) playError();
      if (enableHaptics) vibrate([100, 50, 100]);
      return;
    }
    
    if (enableSounds) playConfirm();
    if (enableHaptics) vibrate(50);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDropping(true);
    setLastMultiplier(null);
    setLastPayout(null);
    
    setTimeout(() => {
      gameAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    ballRef.current = {
      x: canvas.width / 2 + (Math.random() - 0.5) * 30,
      y: 30,
      vx: (Math.random() - 0.5) * 2,
      vy: 0,
      active: true,
      radius: 8,
    };
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
          <span className="font-bold text-white">{Math.ceil(balance).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-6 gap-6">
        <div className="flex items-center gap-3">
          <Target className="size-8" style={{ color: primaryAccent }} />
          <h2 className="text-4xl font-black text-white">Plinko</h2>
        </div>
        
        <div ref={gameAreaRef} className="w-full max-w-md p-4 rounded-2xl border-2" style={{ backgroundColor: `${cardBg}`, borderColor: `${primaryAccent}40`, boxShadow: `0 0 30px ${primaryAccent}20` }}>
          <canvas
            ref={canvasRef}
            width={360}
            height={560}
            className="w-full rounded-xl"
            style={{ backgroundColor: '#0a0a0f' }}
          />
        </div>
        
        {lastMultiplier !== null && lastPayout !== null && (
          <div className="w-full max-w-sm p-6 rounded-2xl border-2 text-center animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ backgroundColor: cardBg, borderColor: lastMultiplier >= 1 ? primaryAccent : '#ff0000', boxShadow: `0 0 30px ${lastMultiplier >= 1 ? primaryAccent : '#ff0000'}40` }}>
            <div className="text-6xl mb-4">{lastMultiplier >= 1 ? '🎉' : '😢'}</div>
            <div className="text-3xl font-black mb-2" style={{ color: lastMultiplier >= 1 ? primaryAccent : '#ff0000' }}>
              {lastMultiplier}x
            </div>
            <div className="text-xl font-bold text-white">
              {lastMultiplier >= 1 ? `+${Math.ceil(lastPayout).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}` : `${Math.ceil(lastPayout).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`}
            </div>
          </div>
        )}
        
        <div className="w-full max-w-sm p-6 rounded-2xl border-2" style={{ backgroundColor: cardBg, borderColor: gameError ? '#ff1a1a' : `${primaryAccent}40`, boxShadow: `0 0 30px ${primaryAccent}20` }}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <Coins className="size-4" style={{ color: primaryAccent }} />
              Bet Amount
            </label>
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
            disabled={isDropping}
            className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold text-lg focus:outline-none focus:ring-2 transition-all"
            style={{ borderColor: gameError ? '#ff1a1a' : `${primaryAccent}60`, boxShadow: `0 0 15px ${primaryAccent}20` }}
          />
          {gameError && (
            <div className="mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="size-4 text-red-500" />
              <p className="text-red-500 text-[10px] font-bold uppercase">{gameError}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 shrink-0 sticky bottom-0 bg-gradient-to-t from-[#0a0a0f] to-transparent backdrop-blur-sm">
        <button
          onClick={dropBall}
          disabled={isDropping || betAmount > balance}
          className="w-full py-4 rounded-xl font-black text-black transition-all active:scale-95 disabled:opacity-50 shadow-lg text-lg"
          style={{ backgroundColor: primaryAccent, boxShadow: `0 0 30px ${primaryAccent}60` }}
        >
          {isDropping ? 'Dropping...' : 'Drop Ball'}
        </button>
      </div>
      
      {showRules && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6" onClick={() => setShowRules(false)}>
          <div className="w-full max-w-md p-6 rounded-2xl border-2" style={{ backgroundColor: cardBg, borderColor: primaryAccent }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-white mb-4">📜 Plinko Rules</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <p><strong style={{ color: primaryAccent }}>Goal:</strong> Drop the ball and hope it lands in a high multiplier slot</p>
              <p><strong style={{ color: primaryAccent }}>Physics:</strong> Ball bounces on pegs and falls randomly</p>
              <p><strong style={{ color: primaryAccent }}>Slots:</strong> 13 landing zones with different multipliers</p>
              <p><strong style={{ color: primaryAccent }}>Multipliers:</strong> From 0.5x (loss) to 16x (jackpot)</p>
              <p><strong style={{ color: primaryAccent }}>Colors:</strong> Red = loss, Blue/Green = moderate win, Gold/Neon = big win</p>
              <div className="pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-400">Center slots are more likely than extremes</p>
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