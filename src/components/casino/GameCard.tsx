import { GameType } from '@/types';
import { ChevronRight } from 'lucide-react';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig);

interface GameCardProps {
  game: GameType;
  title: string;
  description: string;
  icon: string;
  onPlay: () => void;
}

export function GameCard({ title, description, icon, onPlay }: GameCardProps) {
  const primaryAccent = tweaks.primaryAccent.useState();
  
  return (
    <button
      onClick={onPlay}
      className="relative w-full group overflow-hidden rounded-[2rem] p-5 text-left transition-all active:scale-95 border-2 shadow-xl"
      style={{ 
        backgroundColor: '#050505',
        borderColor: 'rgba(255,255,255,0.05)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}
    >
      {/* Dynamic Background Effect */}
      <div 
        className="absolute -top-10 -right-10 size-32 blur-[40px] opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
        style={{ backgroundColor: primaryAccent }}
      />
      
      {/* Icon Float Background */}
      <div className="absolute top-2 right-4 text-7xl opacity-[0.03] grayscale italic font-black pointer-events-none group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div 
            className="size-14 rounded-2xl flex items-center justify-center text-3xl shadow-2xl border border-white/10 group-hover:scale-110 transition-transform duration-300"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.03)',
              boxShadow: `0 0 20px rgba(0,0,0,0.4)`
            }}
          >
            {icon}
          </div>
          <div 
            className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: primaryAccent }}
          >
            <ChevronRight className="size-5" />
          </div>
        </div>
        
        <h3 className="text-xl font-black text-white mb-0.5 italic tracking-tighter uppercase leading-none">
          {title}
        </h3>
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-4 truncate">
          {description}
        </p>
        
        <div 
          className="mt-auto py-2 rounded-xl text-[10px] font-black text-center uppercase tracking-[0.2em] transition-all group-hover:translate-y-[-2px]"
          style={{ 
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          Enter Game
        </div>
      </div>
      
      {/* Bottom Border Accent */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-t-full opacity-0 group-hover:opacity-100 transition-all"
        style={{ backgroundColor: primaryAccent, boxShadow: `0 -5px 15px ${primaryAccent}80` }}
      />
    </button>
  );
}