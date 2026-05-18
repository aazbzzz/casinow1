import { useState } from 'react';
import { GameCard } from './GameCard';
import { CoinflipGame } from './games/CoinflipGame';
import { MinesGame } from './games/MinesGame';
import { DiceGame } from './games/DiceGame';
import { PlinkoGame } from './games/PlinkoGame';
import { CrashGame } from './games/CrashGame';
import { SlotsGame } from './games/SlotsGame';
import { RouletteGame } from './games/RouletteGame';
import { GameType, User } from '@/types';
import { ChevronRight } from 'lucide-react';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig as any);

interface CasinoSectionProps {
  user: User;
  balance: number;
  onBet: (amount: number, game: string) => boolean;
  onWin: (betAmount: number, payout: number, multiplier: number, game: string) => number;
  onLoss: (betAmount: number, game: string) => void;
  onGameStatusChange?: (isInGame: boolean) => void;
  onSetCloseCallback?: (callback: () => void) => void;
}

export function CasinoSection({ user, balance, onBet, onWin, onLoss, onGameStatusChange, onSetCloseCallback }: CasinoSectionProps) {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const primaryAccent = tweaks.primaryAccent.useState();
  
  const handleGameChange = (game: GameType | null) => {
    setActiveGame(game);
    onGameStatusChange?.(game !== null);
    if (game !== null && onSetCloseCallback) {
      onSetCloseCallback(() => handleGameChange(null));
    }
  };
  
  const games = [
    { id: 'coinflip' as GameType, title: 'Coinflip', description: 'Double or Nothing', icon: '🪙', color: '#FFD700' },
    { id: 'mines' as GameType, title: 'Mines', description: 'Dodge the Bombs', icon: '💣', color: '#FF4444' },
    { id: 'dice' as GameType, title: 'Dice', description: 'Roll to Win', icon: '🎲', color: '#44FF44' },
    { id: 'plinko' as GameType, title: 'Plinko', description: 'Physics Master', icon: '🎯', color: '#44AAFF' },
    { id: 'crash' as GameType, title: 'Crash', description: 'Fly to the Moon', icon: '🚀', color: '#FF8800' },
    { id: 'slots' as GameType, title: 'Slots', description: 'Jackpot Mania', icon: '🎰', color: '#FF44FF' },
    { id: 'roulette' as GameType, title: 'Roulette', description: 'Classy Spins', icon: '🎡', color: '#FFFFFF' },
  ];
  
  if (activeGame !== null) {
    return (
      <div className="fixed inset-0 z-[100] bg-black">
        {activeGame === 'coinflip' && <CoinflipGame user={user} balance={balance} onBet={onBet} onWin={onWin} onLoss={onLoss} onBack={() => handleGameChange(null)} />}
        {activeGame === 'mines' && <MinesGame user={user} balance={balance} onBet={onBet} onWin={onWin} onLoss={onLoss} onBack={() => handleGameChange(null)} />}
        {activeGame === 'dice' && <DiceGame user={user} balance={balance} onBet={onBet} onWin={onWin} onLoss={onLoss} onBack={() => handleGameChange(null)} />}
        {activeGame === 'plinko' && <PlinkoGame user={user} balance={balance} onBet={onBet} onWin={onWin} onLoss={onLoss} onBack={() => handleGameChange(null)} />}
        {activeGame === 'crash' && <CrashGame user={user} balance={balance} onBet={onBet} onWin={onWin} onLoss={onLoss} onBack={() => handleGameChange(null)} />}
        {activeGame === 'slots' && <SlotsGame user={user} balance={balance} onBet={onBet} onWin={onWin} onLoss={onLoss} onBack={() => handleGameChange(null)} />}
        {activeGame === 'roulette' && <RouletteGame user={user} balance={balance} onBet={onBet} onWin={onWin} onLoss={onLoss} onBack={() => handleGameChange(null)} />}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
            Casino
          </h2>
          <div className="h-1 w-12 mt-1 rounded-full" style={{ backgroundColor: primaryAccent }} />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">
          Live Games <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 pb-8">
        {games.map((game, idx) => (
          <div 
            key={game.id} 
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <GameCard
              game={game.id}
              title={game.title}
              description={game.description}
              icon={game.icon}
              onPlay={() => handleGameChange(game.id)}
            />
          </div>
        ))}
        
        {/* Placeholder for "More Games" */}
        <div className="col-span-2 p-6 rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 opacity-50">
          <span className="text-xs font-black text-white uppercase tracking-widest italic">Coming Soon</span>
          <div className="flex gap-2">
            <div className="size-8 rounded-xl bg-white/5" />
            <div className="size-8 rounded-xl bg-white/5" />
            <div className="size-8 rounded-xl bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}