import { User, TitleChallenge } from '@/types';
import { Target, Trophy, Crown, Star, Shield, Zap, Lock, ChevronRight, CheckCircle2, Award } from 'lucide-react';
import { vibrate } from '@aippy/runtime/device';
import { useGameSounds } from '@/hooks/useGameSounds';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { TITLE_CHALLENGES, RARITY_COLORS, RARITY_GLOW } from '@/lib/titles';
import { useMemo } from 'react';

const tweaks = aippyTweaks(tweaksConfig as any);

interface TitlesSectionProps {
  user: User;
  onEquipTitle: (title: string | null) => void;
  updateTitleProgress: (challengeId: string, value: number, isAbsolute?: boolean) => void;
}

export function TitlesSection({ user, onEquipTitle }: TitlesSectionProps) {
  const { playConfirm, playWin } = useGameSounds();
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  const enableSounds = tweaks.enableSounds.useState();

  const isVip10 = user.vipLevel >= 10;

  const categories = ['Casino', 'Économie', 'Défis Rares', 'ULTIME'] as const;

  const challengesByCategory = useMemo(() => {
    const map: Record<string, TitleChallenge[]> = {};
    categories.forEach(cat => {
      map[cat] = TITLE_CHALLENGES.filter(c => c.category === cat);
    });
    return map;
  }, []);

  const getProgress = (challenge: TitleChallenge) => {
    return user.titleProgress?.[challenge.id] || 0;
  };

  const isChallengeCompleted = (challengeId: string) => {
    return user.completedTitleChallenges?.includes(challengeId);
  };

  const allNonUltimateCompleted = useMemo(() => {
    return TITLE_CHALLENGES
      .filter(c => c.category !== 'ULTIME')
      .every(c => isChallengeCompleted(c.id));
  }, [user.completedTitleChallenges]);

  if (!isVip10) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center min-h-[60vh]">
        <div className="relative mb-6">
          <Crown className="size-24 text-gray-700" />
          <Lock className="size-10 text-red-500 absolute -bottom-2 -right-2 bg-black rounded-full p-2 border-2 border-red-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Accès Restreint</h2>
        <p className="text-gray-500 max-w-md font-bold mb-8">
          Le système de <span style={{ color: primaryAccent }}>Titres Légendaires</span> est réservé aux joueurs d'élite. Atteignez le <span className="text-white">VIP 10 (Légende)</span> pour commencer votre ascension.
        </p>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 w-full max-w-sm">
          <div className="flex justify-between text-xs font-black text-gray-500 uppercase mb-2">
            <span>Progression VIP</span>
            <span>Niveau {user.vipLevel} / 10</span>
          </div>
          <div className="h-3 rounded-full bg-black/50 overflow-hidden border border-white/5">
            <div 
              className="h-full transition-all duration-1000"
              style={{ width: `${(user.vipLevel / 10) * 100}%`, backgroundColor: primaryAccent }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* HEADER SECTION */}
      <div className="relative p-8 rounded-3xl border-2 overflow-hidden" style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}40` }}>
        <div className="absolute top-0 right-0 p-4">
          <Award className="size-24 opacity-10 rotate-12" style={{ color: primaryAccent }} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="size-6" style={{ color: primaryAccent }} />
            <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: primaryAccent }}>Statut Légendaire</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-tighter">Système de Titres</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
              <div className="text-[10px] font-black text-gray-500 uppercase mb-2">Titre Actuel</div>
              <div className="text-2xl font-black text-white flex items-center gap-3">
                {user.equippedTitle ? (
                  <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 shadow-xl" 
                        style={{ color: primaryAccent, textShadow: `0 0 10px ${primaryAccent}40` }}>
                    {user.equippedTitle}
                  </span>
                ) : (
                  <span className="text-gray-600 italic">Aucun titre</span>
                )}
                {user.equippedTitle && (
                  <button 
                    onClick={() => onEquipTitle(null)}
                    className="text-[10px] uppercase font-black text-red-500/50 hover:text-red-500 transition-colors"
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
              <div className="text-[10px] font-black text-gray-500 uppercase mb-2">Progression Globale</div>
              <div className="flex items-end justify-between mb-2">
                <div className="text-2xl font-black text-white">
                  {user.completedTitleChallenges?.length || 0} <span className="text-xs text-gray-500 font-bold uppercase">/ {TITLE_CHALLENGES.length}</span>
                </div>
                <div className="text-xs font-black" style={{ color: primaryAccent }}>
                  {Math.round(((user.completedTitleChallenges?.length || 0) / TITLE_CHALLENGES.length) * 100)}%
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div 
                  className="h-full transition-all duration-1000"
                  style={{ width: `${((user.completedTitleChallenges?.length || 0) / TITLE_CHALLENGES.length) * 100}%`, backgroundColor: primaryAccent }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORIES */}
      {categories.map(cat => {
        if (cat === 'ULTIME' && !allNonUltimateCompleted) return null;
        
        return (
          <div key={cat} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <div className="size-2 rounded-full" style={{ backgroundColor: cat === 'ULTIME' ? '#fff' : primaryAccent }} />
                {cat}
              </h3>
              {cat === 'ULTIME' && <Zap className="size-5 text-yellow-400 animate-pulse" />}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {challengesByCategory[cat].map(challenge => {
                const isCompleted = isChallengeCompleted(challenge.id);
                const progress = getProgress(challenge);
                const percent = Math.min(100, (progress / challenge.target) * 100);
                const rarityColor = RARITY_COLORS[challenge.rarity];
                
                return (
                  <div 
                    key={challenge.id}
                    className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${isCompleted ? 'opacity-60' : 'hover:scale-[1.02]'}`}
                    style={{ 
                      backgroundColor: cardBg, 
                      borderColor: isCompleted ? '#22c55e40' : `${rarityColor}20`,
                      boxShadow: isCompleted ? 'none' : RARITY_GLOW[challenge.rarity]
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full" 
                                style={{ backgroundColor: `${rarityColor}20`, color: rarityColor }}>
                            {challenge.rarity}
                          </span>
                          {isCompleted && <CheckCircle2 className="size-4 text-green-500" />}
                        </div>
                        <h4 className="text-lg font-black text-white leading-tight">{challenge.title}</h4>
                        <p className="text-xs font-bold text-gray-500 mt-1">{challenge.description}</p>
                      </div>
                      
                      {!isCompleted && (
                        <div className="text-right">
                          <div className="text-xs font-black text-white">
                            {progress.toLocaleString()} <span className="text-[10px] text-gray-600">/ {challenge.target.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isCompleted ? (
                      <div className="space-y-2">
                        <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{ width: `${percent}%`, backgroundColor: rarityColor }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Award className="size-4" style={{ color: primaryAccent }} />
                          <span className="text-xs font-black text-white uppercase">{challenge.rewardTitle}</span>
                        </div>
                        <button 
                          onClick={() => {
                            onEquipTitle(challenge.rewardTitle);
                            if (enableHaptics) vibrate(50);
                          }}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${user.equippedTitle === challenge.rewardTitle ? 'bg-white text-black' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                        >
                          {user.equippedTitle === challenge.rewardTitle ? 'Équipé' : 'Équiper'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* FOOTER INFO */}
      <div className="text-center p-8 opacity-40">
        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Les titres sont définitifs et liés à votre compte cloud.</div>
        <div className="flex justify-center gap-4">
          <Shield className="size-4" />
          <Star className="size-4" />
          <Zap className="size-4" />
        </div>
      </div>
    </div>
  );
}
