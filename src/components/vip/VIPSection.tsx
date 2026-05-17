import assetsData from "@/config/assets";
import { Trophy, TrendingUp, Crown } from 'lucide-react';
import { VIP_LEVELS, getVIPLevel, getNextVIPLevel, getVIPProgress } from '@/lib/vip';
import { useGameState } from '@/hooks/useGameState';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig as any);

export function VIPSection() {
  const { user } = useGameState();
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const secondaryAccent = tweaks.secondaryAccent.useState();
  
  const safeTotalWagered = Math.max(0, Number(user.totalWagered) || 0);
  
  // RÈGLE ABSOLUE : Recalculer le VIP en temps réel
  const currentVIP = getVIPLevel(safeTotalWagered);
  const nextVIP = getNextVIPLevel(currentVIP.level);
  const progress = getVIPProgress(safeTotalWagered, currentVIP.level);

  const formatAmount = (amount: number) => {
    const val = Math.ceil(Number(amount) || 0);
    if (val >= 1000000000) return (val / 1000000000).toFixed(1) + 'B';
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  return <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">🏆 VIP Program</h2>
      
      <div className="mb-6 p-6 rounded-xl border-2" style={{
      backgroundColor: cardBg,
      borderColor: `${primaryAccent}40`
    }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="size-20 rounded-2xl bg-white/5 flex items-center justify-center border-2" style={{ borderColor: primaryAccent }}>
            <Crown className="size-12" style={{ color: primaryAccent }} />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-400">Current Level</div>
            <div className="text-3xl font-black text-white italic">VIP {currentVIP.level}</div>
            <div className="text-lg font-semibold" style={{
            color: primaryAccent
          }}>
              Max Bet: {currentVIP.maxBet === Infinity ? 'Unlimited' : formatAmount(currentVIP.maxBet)}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Progression : {formatAmount(safeTotalWagered)} / {nextVIP ? formatAmount(nextVIP.wagerRequired) : 'MAX'}</span>
              <span className="font-black text-white">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-4 rounded-full bg-black/40 border border-white/10 overflow-hidden p-0.5">
              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${primaryAccent}, ${secondaryAccent})`,
                boxShadow: `0 0 15px ${primaryAccent}60`
              }} />
            </div>
          </div>

          {nextVIP && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Encore</div>
              <div className="text-xl font-black text-white">
                {formatAmount(nextVIP.wagerRequired - safeTotalWagered)} <span className="text-[10px] opacity-50 uppercase">pour VIP {nextVIP.level}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        {VIP_LEVELS.map(level => {
        const isUnlocked = currentVIP.level >= level.level;
        const isCurrent = currentVIP.level === level.level;
        return <div key={level.level} className="p-4 rounded-xl transition-all border-2" style={{
          backgroundColor: isCurrent ? `${primaryAccent}10` : cardBg,
          borderColor: isCurrent ? primaryAccent : 'transparent'
        }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-lg flex items-center justify-center ${isUnlocked ? 'bg-white/10' : 'bg-black/20'}`}>
                    <Trophy className="size-6" style={{
                      color: isUnlocked ? primaryAccent : '#444'
                    }} />
                  </div>
                  <div>
                    <div className={`font-black italic ${isUnlocked ? 'text-white' : 'text-gray-600'}`}>VIP {level.level}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase">
                      Mise max: {level.maxBet === Infinity ? 'Illimitée' : formatAmount(level.maxBet)}
                    </div>
                  </div>
                </div>
                {isCurrent && <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-black animate-pulse" style={{
              backgroundColor: primaryAccent
            }}>
                    Current
                  </div>}
              </div>
              
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase mb-2">
                <TrendingUp className="size-3" />
                <span>Required: {formatAmount(level.wagerRequired)}</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {level.benefits.map((benefit, i) => <div key={i} className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter" style={{
              backgroundColor: isUnlocked ? `${primaryAccent}20` : '#222',
              color: isUnlocked ? primaryAccent : '#444',
              border: `1px solid ${isUnlocked ? `${primaryAccent}40` : 'transparent'}`
            }}>
                    {benefit}
                  </div>)}
              </div>
            </div>;
      })}
      </div>
    </div>;
}