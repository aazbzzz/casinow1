import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { Trophy, Timer, TrendingUp } from 'lucide-react';

const tweaks = aippyTweaks(tweaksConfig as any);

const MATCHES = [
  { id: 1, home: 'Real Madrid', away: 'FC Barcelona', homeOdd: 2.1, drawOdd: 3.4, awayOdd: 3.2, time: '82\'' },
  { id: 2, home: 'Manchester City', away: 'Liverpool', homeOdd: 1.8, drawOdd: 3.8, awayOdd: 4.5, time: '15\'' },
  { id: 3, home: 'PSG', away: 'Bayern Munich', homeOdd: 2.5, drawOdd: 3.2, awayOdd: 2.8, time: '44\'' },
];

export function SportsSection() {
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">
            Sports
          </h2>
          <div className="h-1 w-12 mt-1 rounded-full" style={{ backgroundColor: primaryAccent }} />
        </div>
        <Trophy className="size-6 text-white/20" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic px-2">
          <div className="size-1.5 rounded-full bg-red-500 animate-pulse" /> Live Now
        </div>

        {MATCHES.map((match) => (
          <div 
            key={match.id}
            className="p-4 rounded-[2rem] border border-white/5 space-y-4"
            style={{ backgroundColor: `${cardBg}80` }}
          >
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <span className="flex items-center gap-1"><Timer className="size-3" /> {match.time}</span>
              <span className="flex items-center gap-1 text-green-500"><TrendingUp className="size-3" /> Live Odds</span>
            </div>

            <div className="flex justify-between items-center px-2">
              <div className="flex flex-col items-center gap-2 w-1/3 text-center">
                <div className="size-10 rounded-full bg-white/5 flex items-center justify-center text-xl">⚽</div>
                <span className="text-xs font-black text-white uppercase leading-tight">{match.home}</span>
              </div>
              <div className="text-xl font-black text-white italic opacity-20 italic">VS</div>
              <div className="flex flex-col items-center gap-2 w-1/3 text-center">
                <div className="size-10 rounded-full bg-white/5 flex items-center justify-center text-xl">⚽</div>
                <span className="text-xs font-black text-white uppercase leading-tight">{match.away}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '1', odd: match.homeOdd },
                { label: 'X', odd: match.drawOdd },
                { label: '2', odd: match.awayOdd }
              ].map((bet) => (
                <button 
                  key={bet.label}
                  className="flex flex-col items-center py-2 rounded-xl border border-white/5 hover:border-white/20 transition-all bg-black/40 group active:scale-95"
                >
                  <span className="text-[10px] font-black text-gray-500 group-hover:text-white/60">{bet.label}</span>
                  <span className="text-sm font-black italic" style={{ color: primaryAccent }}>{bet.odd.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 rounded-[2rem] text-center border-2 border-dashed border-white/10 opacity-50">
        <h3 className="text-sm font-black text-white uppercase tracking-widest italic mb-2">More Markets Coming Soon</h3>
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
          Basketball, Tennis and E-sports betting will be available in the next update.
        </p>
      </div>
    </div>
  );
}
