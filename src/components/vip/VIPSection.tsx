import assetsData from "@/config/assets";
import { User } from '@/types';
import { Trophy, TrendingUp } from 'lucide-react';
import { VIP_LEVELS, getVIPLevel, getNextVIPLevel, getVIPProgress } from '@/lib/vip';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
const tweaks = aippyTweaks(tweaksConfig);
interface VIPSectionProps {
  user: User;
}
export function VIPSection({
  user
}: VIPSectionProps) {
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const secondaryAccent = tweaks.secondaryAccent.useState();
  const currentVIP = getVIPLevel(user.totalWagered);
  const nextVIP = getNextVIPLevel(user.vipLevel);
  const progress = getVIPProgress(user.totalWagered, user.vipLevel);
  return <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">🏆 VIP Program</h2>
      
      <div className="mb-6 p-6 rounded-xl" style={{
      backgroundColor: cardBg
    }}>
        <div className="flex items-center gap-4 mb-4">
          <img src={assetsData.IMAGE_DMNN} alt="VIP Badge" className="size-20 object-contain" />
          <div className="flex-1">
            <div className="text-sm text-gray-400">Current Level</div>
            <div className="text-3xl font-bold text-white">VIP {user.vipLevel}</div>
            <div className="text-lg font-semibold" style={{
            color: primaryAccent
          }}>
              Multiplier: {currentVIP.multiplier}x
            </div>
          </div>
        </div>
        
        {nextVIP && <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Progress to VIP {nextVIP.level}</span>
              <span className="font-semibold text-white">{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${primaryAccent}, ${secondaryAccent})`
          }} />
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Wager {(nextVIP.wagerRequired - user.totalWagered).toFixed(0)} more to unlock
            </div>
          </div>}
      </div>
      
      <div className="space-y-3">
        {VIP_LEVELS.map(level => {
        const isUnlocked = user.vipLevel >= level.level;
        const isCurrent = user.vipLevel === level.level;
        return <div key={level.level} className="p-4 rounded-xl transition-all" style={{
          backgroundColor: isCurrent ? `${primaryAccent}20` : cardBg,
          borderLeft: isCurrent ? `4px solid ${primaryAccent}` : 'none'
        }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Trophy className="size-6" style={{
                color: isUnlocked ? primaryAccent : '#666'
              }} />
                  <div>
                    <div className="font-bold text-white">VIP {level.level}</div>
                    <div className="text-sm text-gray-400">
                      Multiplier {level.multiplier}x
                    </div>
                  </div>
                </div>
                {isCurrent && <div className="px-3 py-1 rounded-full text-xs font-bold text-black" style={{
              backgroundColor: primaryAccent
            }}>
                    Current
                  </div>}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <TrendingUp className="size-4" />
                <span>Required Wager: {level.wagerRequired.toLocaleString()}</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {level.benefits.map((benefit, i) => <div key={i} className="px-2 py-1 rounded text-xs" style={{
              backgroundColor: isUnlocked ? `${primaryAccent}15` : '#333',
              color: isUnlocked ? primaryAccent : '#666'
            }}>
                    {benefit}
                  </div>)}
              </div>
            </div>;
      })}
      </div>
    </div>;
}