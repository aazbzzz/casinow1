import { User, TitleChallenge } from '@/types';
import { Target, Trophy, Crown, Star, Shield, Zap, Lock, ChevronDown, CheckCircle2, Award, Sparkles } from 'lucide-react';
import { vibrate } from '@aippy/runtime/device';
import { useGameSounds } from '@/hooks/useGameSounds';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { TITLE_CHALLENGES, RARITY_COLORS, RARITY_GLOW } from '@/lib/titles';
import { useMemo, useState, useEffect } from 'react';

const tweaks = aippyTweaks(tweaksConfig as any);

interface TitlesSectionProps {
  user: User;
  onEquipTitle: (title: string | null) => void;
  updateTitleProgress: () => void;
}

export function TitlesSection({ user, onEquipTitle, updateTitleProgress }: TitlesSectionProps) {
  const { playWin } = useGameSounds();
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  const enableSounds = tweaks.enableSounds.useState();

  const [showSelector, setShowSelector] = useState(false);
  const [lastUnlockedCount, setLastUnlockedCount] = useState(user.unlockedTitles?.length || 0);

  // Animation on new title unlock
  useEffect(() => {
    const currentCount = user.unlockedTitles?.length || 0;
    if (currentCount > lastUnlockedCount) {
      if (enableSounds) playWin();
      if (enableHaptics) vibrate([100, 50, 100]);
      setLastUnlockedCount(currentCount);
    }
  }, [user.unlockedTitles, lastUnlockedCount]);

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
    const normalChallenges = TITLE_CHALLENGES.filter(c => c.category !== 'ULTIME');
    return normalChallenges.every(c => isChallengeCompleted(c.id));
  }, [user.completedTitleChallenges]);

  if (!isVip10) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
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
              style={{ width: `${Math.min(100, (user.vipLevel / 10) * 100)}%`, backgroundColor: primaryAccent }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER SECTION */}
      <div className="relative p-8 rounded-3xl border-2 overflow-hidden shadow-2xl" style={{ backgroundColor: cardBg, borderColor: `${primaryAccent}40` }}>
        <div className="absolute top-0 right-0 p-4">
          <Award className="size-24 opacity-10 rotate-12" style={{ color: primaryAccent }} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="size-6" style={{ color: primaryAccent }} />
            <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: primaryAccent }}>Statut Légendaire</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-tighter">Mes Titres</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Selector Dropdown */}
            <div className="relative">
              <div className="text-[10px] font-black text-gray-500 uppercase mb-2 ml-1">Titre Équipé</div>
              <button 
                onClick={() => setShowSelector(!showSelector)}
                className="w-full p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between group transition-all hover:border-white/20"
              >
                <div className="flex items-center gap-3">
                  <Star className="size-5" style={{ color: user.equippedTitle ? primaryAccent : '#333' }} fill={user.equippedTitle ? 'currentColor' : 'none'} />
                  <span className="text-xl font-black text-white tracking-tight">
                    {user.equippedTitle || 'Aucun Titre'}
                  </span>
                </div>
                <ChevronDown className={`size-5 text-gray-500 transition-transform duration-300 ${showSelector ? 'rotate-180' : ''}`} />
              </button>

              {showSelector && (
                <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl z-[100] max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  <button 
                    onClick={() => { onEquipTitle(null); setShowSelector(false); }}
                    className="w-full p-3 rounded-xl text-left text-sm font-black uppercase text-gray-500 hover:bg-white/5 transition-colors mb-1"
                  >
                    Retirer le titre
                  </button>
                  {user.unlockedTitles?.map(title => (
                    <button 
                      key={title}
                      onClick={() => { onEquipTitle(title); setShowSelector(false); }}
                      className={`w-full p-4 rounded-xl text-left text-lg font-black transition-all mb-1 flex items-center justify-between ${user.equippedTitle === title ? 'bg-white/10' : 'hover:bg-white/5'}`}
                      style={{ color: user.equippedTitle === title ? primaryAccent : '#fff' }}
                    >
                      {title}
                      {user.equippedTitle === title && <CheckCircle2 className="size-5" />}
                    </button>
                  ))}
                  {(!user.unlockedTitles || user.unlockedTitles.length === 0) && (
                    <div className="p-4 text-center text-xs font-bold text-gray-600">Aucun titre débloqué</div>
                  )}
                </div>
              )}
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
                  className="h-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                  style={{ width: `${((user.completedTitleChallenges?.length || 0) / TITLE_CHALLENGES.length) * 100}%`, backgroundColor: primaryAccent }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORIES */}
      {categories.map(cat => {
        const isUltimate = cat === 'ULTIME';
        if (isUltimate && !allNonUltimateCompleted) return null;
        
        return (
          <div key={cat} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className={`text-xl font-black uppercase tracking-tighter flex items-center gap-3 ${isUltimate ? 'text-white' : 'text-gray-400'}`}>
                <div className="size-2 rounded-full" style={{ backgroundColor: isUltimate ? '#fff' : primaryAccent }} />
                {cat}
              </h3>
              {isUltimate && <Sparkles className="size-5 text-yellow-400 animate-pulse" />}
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
                    className={`group relative p-6 rounded-3xl border-2 transition-all duration-500 ${isCompleted ? 'bg-black/20 border-green-500/20' : 'hover:scale-[1.01]'}`}
                    style={{ 
                      backgroundColor: isCompleted ? undefined : cardBg, 
                      borderColor: isCompleted ? undefined : `${rarityColor}20`,
                      boxShadow: isCompleted ? 'none' : RARITY_GLOW[challenge.rarity]
                    }}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full" 
                                style={{ backgroundColor: `${rarityColor}20`, color: rarityColor }}>
                            {challenge.rarity}
                          </span>
                          {isCompleted && <CheckCircle2 className="size-4 text-green-500" />}
                        </div>
                        <h4 className="text-xl font-black text-white leading-tight mb-1 group-hover:text-white transition-colors">
                          {challenge.title}
                        </h4>
                        <p className="text-xs font-bold text-gray-500 leading-relaxed">
                          {challenge.description}
                        </p>
                      </div>
                      
                      {!isCompleted && (
                        <div className="text-right ml-4">
                          <div className="text-lg font-black text-white tabular-nums">
                            {Math.floor(percent)}%
                          </div>
                          <div className="text-[9px] font-black text-gray-600 uppercase">Progression</div>
                        </div>
                      )}
                    </div>

                    {!isCompleted ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                          <span>{Math.floor(progress).toLocaleString()}</span>
                          <span>{challenge.target.toLocaleString()}</span>
                        </div>
                        <div className="h-2 rounded-full bg-black/40 overflow-hidden p-0.5">
                          <div 
                            className="h-full rounded-full transition-all duration-700 shadow-[0_0_10px_currentColor]"
                            style={{ width: `${percent}%`, backgroundColor: rarityColor, color: rarityColor }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <Trophy className="size-4" style={{ color: rarityColor }} />
                          <span className="text-xs font-black text-white uppercase tracking-tight">Récompense: {challenge.rewardTitle}</span>
                        </div>
                        <button 
                          onClick={() => {
                            onEquipTitle(challenge.rewardTitle);
                            if (enableHaptics) vibrate(50);
                          }}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${user.equippedTitle === challenge.rewardTitle ? 'bg-white text-black scale-105 shadow-xl' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
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
      <div className="text-center p-12 opacity-30">
        <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-4">Système de progression sécurisé v2.0</div>
        <div className="flex justify-center gap-6 text-gray-600">
          <Shield className="size-5" />
          <Star className="size-5" />
          <Zap className="size-5" />
        </div>
      </div>
    </div>
  );
}
