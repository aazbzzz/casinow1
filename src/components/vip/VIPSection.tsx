import assetsData from "@/config/assets";
import { Trophy, TrendingUp, Crown, Zap } from 'lucide-react';
import { VIP_LEVELS, getVIPLevel, getNextVIPLevel, getVIPProgress } from '@/lib/vip';
import { useGameState } from '@/hooks/useGameState';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig as any);

export function VIPSection() {
  const { user } = useGameState();
  const cardBg = tweaks.cardBackground.useState() || '#1A1A2E';
  const primaryAccent = tweaks.primaryAccent.useState() || '#00efff';
  const secondaryAccent = tweaks.secondaryAccent.useState() || '#FF00FF';
  
  if (!user) return <div className="p-6 text-white text-center">Chargement de votre profil VIP...</div>;

  // Garantir des valeurs numériques sûres
  const safeTotalWagered = Math.max(0, Math.ceil(Number(user.totalWagered) || 0));
  
  // RÈGLE ABSOLUE : Recalculer le VIP en temps réel à partir de la mise totale
  const currentVIP = getVIPLevel(safeTotalWagered) || VIP_LEVELS[0];
  const nextVIP = getNextVIPLevel(currentVIP.level);
  
  // Progression calculée dynamiquement pour la barre
  const progressValue = getVIPProgress(safeTotalWagered, currentVIP.level);
  const safeProgress = isNaN(progressValue) ? 0 : Math.min(100, Math.max(0, progressValue));

  // Calcul du montant manquant pour le prochain niveau
  const amountToNext = nextVIP ? Math.max(0, nextVIP.wagerRequired - safeTotalWagered) : 0;

  const formatAmount = (amount: number, exact = false) => {
    const val = Math.ceil(Number(amount) || 0);
    if (!exact) {
      // Format compact pour les gros nombres
      if (val >= 1000000000) return (val / 1000000000).toFixed(1) + 'B';
      if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
      if (val >= 10000) return (val / 1000).toFixed(1) + 'K';
    }
    // Format avec séparateur de milliers (espace) pour le reste ou si exact demandé
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  return <div className="p-6 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">VIP Club</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Exclusive rewards & benefits</p>
        </div>
        <div className="size-14 rounded-2xl bg-white/5 flex items-center justify-center border-2" style={{ borderColor: `${primaryAccent}20` }}>
          <Crown className="size-8" style={{ color: primaryAccent }} />
        </div>
      </div>
      
      <div className="mb-8 p-8 rounded-[2.5rem] border-2 relative overflow-hidden group shadow-2xl" style={{
      backgroundColor: cardBg,
      borderColor: `${primaryAccent}30`
    }}>
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 size-48 rounded-full blur-[100px] opacity-20 transition-opacity group-hover:opacity-30" style={{ backgroundColor: primaryAccent }} />
        
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-8">
            <div className="size-24 rounded-3xl bg-black/40 flex items-center justify-center border-2 shadow-inner" style={{ borderColor: primaryAccent }}>
              <Crown className="size-14 drop-shadow-[0_0_10px_rgba(0,239,255,0.5)]" style={{ color: primaryAccent }} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-1">Status Actuel</div>
              <div className="text-4xl font-black text-white italic tracking-tighter uppercase">Niveau {currentVIP.level}</div>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <Zap className="size-3" style={{ color: primaryAccent }} />
                <span className="text-[10px] font-black uppercase text-white/80">
                  Mise Max: {currentVIP.maxBet === Infinity ? 'Illimitée' : formatAmount(currentVIP.maxBet)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest mb-3">
                <span className="text-gray-400">Progression : <span className="text-white">{formatAmount(safeTotalWagered, true)}</span> / <span className="text-white/60">{nextVIP ? formatAmount(nextVIP.wagerRequired, true) : 'MAX'}</span></span>
                <span style={{ color: primaryAccent }}>{safeProgress.toFixed(1)}%</span>
              </div>
              <div className="h-5 rounded-full bg-black/60 border border-white/10 overflow-hidden p-1 shadow-inner">
                <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(0,0,0,0.5)]" style={{
                  width: `${safeProgress}%`,
                  background: `linear-gradient(90deg, ${primaryAccent}, ${secondaryAccent})`,
                  boxShadow: `0 0 15px ${primaryAccent}60`
                }} />
              </div>
            </div>

            {nextVIP && (
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <TrendingUp className="size-3" /> Objectif Suivant
                </div>
                <div className="text-2xl font-black text-white italic tracking-tighter">
                  {formatAmount(amountToNext, true)} <span className="text-[10px] opacity-40 uppercase not-italic font-medium ml-3 tracking-[0.2em]">requis pour VIP {nextVIP.level}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid gap-4">
        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] px-2 mb-2">Paliers de récompenses</div>
        {VIP_LEVELS.map(level => {
          const isUnlocked = currentVIP.level >= level.level;
          const isCurrent = currentVIP.level === level.level;
          return <div key={level.level} className="p-5 rounded-[2rem] transition-all border-2 relative overflow-hidden" style={{
            backgroundColor: isCurrent ? `${primaryAccent}05` : `${cardBg}80`,
            borderColor: isCurrent ? `${primaryAccent}60` : 'rgba(255,255,255,0.03)'
          }}>
                {isCurrent && <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest text-black shadow-lg" style={{
                  backgroundColor: primaryAccent
                }}>
                    Niveau Actuel
                  </div>}
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`size-12 rounded-2xl flex items-center justify-center border-2 transition-colors ${isUnlocked ? '' : 'opacity-20'}`}
                         style={{ 
                           backgroundColor: isUnlocked ? `${primaryAccent}15` : 'transparent',
                           borderColor: isUnlocked ? primaryAccent : 'rgba(255,255,255,0.1)'
                         }}>
                      <Trophy className="size-6" style={{
                        color: isUnlocked ? primaryAccent : '#fff'
                      }} />
                    </div>
                    <div>
                      <div className={`text-xl font-black italic uppercase tracking-tighter ${isUnlocked ? 'text-white' : 'text-gray-600'}`}>VIP {level.level}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Requis: {formatAmount(level.wagerRequired)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {level.benefits.map((benefit, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center gap-2" style={{
                      backgroundColor: isUnlocked ? `${primaryAccent}15` : 'rgba(255,255,255,0.03)',
                      color: isUnlocked ? 'white' : 'rgba(255,255,255,0.2)',
                      border: `1px solid ${isUnlocked ? `${primaryAccent}30` : 'transparent'}`
                    }}>
                      <div className="size-1 rounded-full" style={{ backgroundColor: isUnlocked ? primaryAccent : 'currentColor' }} />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>;
        })}
      </div>
    </div>;
}