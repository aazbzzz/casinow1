import { Quest } from '@/types';
import { Target, CheckCircle2, Gift } from 'lucide-react';
import { vibrate } from '@aippy/runtime/device';
import { useGameSounds } from '@/hooks/useGameSounds';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig);

interface QuestsSectionProps {
  quests: Quest[];
  onClaimQuest: (questId: string) => void;
}

export function QuestsSection({ quests, onClaimQuest }: QuestsSectionProps) {
  const { playConfirm, playWin } = useGameSounds();
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  const enableSounds = tweaks.enableSounds.useState();
  
  const handleClaim = (questId: string) => {
    onClaimQuest(questId);
    if (enableSounds) playWin();
    if (enableHaptics) vibrate(200);
  };
  
  const activeQuests = quests.filter(q => !q.completed);
  const completedQuests = quests.filter(q => q.completed);
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">🎯 Quests</h2>
      
      {activeQuests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Active</h3>
          <div className="space-y-3">
            {activeQuests.map(quest => {
              const progressPercent = (quest.progress / quest.target) * 100;
              
              return (
                <div key={quest.id} className="p-4 rounded-xl" style={{ backgroundColor: cardBg }}>
                  <div className="flex items-start gap-3 mb-3">
                    <Target className="size-6 mt-1" style={{ color: primaryAccent }} />
                    <div className="flex-1">
                      <div className="font-bold text-white mb-1">{quest.title}</div>
                      <div className="text-sm text-gray-400 mb-2">{quest.description}</div>
                      <div className="flex items-center gap-2">
                        <Gift className="size-4" style={{ color: primaryAccent }} />
                        <span className="text-sm font-semibold" style={{ color: primaryAccent }}>
                          Récompense: {quest.reward}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-400">Progress</span>
                      <span className="font-semibold text-white">
                        {quest.progress} / {quest.target}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${progressPercent}%`,
                          backgroundColor: primaryAccent
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {completedQuests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Completed</h3>
          <div className="space-y-3">
            {completedQuests.map(quest => (
              <div 
                key={quest.id} 
                className="p-4 rounded-xl"
                style={{ backgroundColor: quest.claimed ? '#1a1a1a' : `${primaryAccent}20` }}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 
                    className="size-6 mt-1"
                    style={{ color: quest.claimed ? '#666' : primaryAccent }}
                  />
                  <div className="flex-1">
                    <div className="font-bold text-white mb-1">{quest.title}</div>
                    <div className="text-sm text-gray-400 mb-2">{quest.description}</div>
                    <div className="flex items-center gap-2">
                      <Gift className="size-4" style={{ color: quest.claimed ? '#666' : primaryAccent }} />
                      <span className="text-sm font-semibold" style={{ color: quest.claimed ? '#666' : primaryAccent }}>
                        Récompense: {quest.reward}
                      </span>
                    </div>
                  </div>
                  {!quest.claimed && (
                    <button
                      onClick={() => handleClaim(quest.id)}
                      className="px-4 py-2 rounded-lg font-bold text-black transition-all active:scale-95"
                      style={{ backgroundColor: primaryAccent }}
                    >
                      Claim
                    </button>
                  )}
                  {quest.claimed && (
                    <div className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 bg-gray-800">
                      Claimed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeQuests.length === 0 && completedQuests.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No quests available at the moment
        </div>
      )}
    </div>
  );
}