import { User } from '@/types';
import { Coins, Crown, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig as any);

interface TopBarProps {
  user: User;
  onAdminClick?: () => void;
  onDirectAdmin?: () => void;
  onCheatClick?: () => void;
}

export function TopBar({ user, onAdminClick, onDirectAdmin, onCheatClick }: TopBarProps) {
  const primaryAccent = tweaks.primaryAccent.useState();
  
  return (
    <div className="h-20 flex items-center justify-between px-6 z-50 relative">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={onAdminClick}>
            {/* Outer Ring Glow */}
            <div 
              className="absolute -inset-1 rounded-full blur-sm opacity-50 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: primaryAccent }}
            />
            {/* Avatar Container */}
            <div className="size-12 rounded-full bg-black border-2 border-white/20 relative z-10 overflow-hidden flex items-center justify-center">
              <div 
                className="absolute inset-0 opacity-40"
                style={{ backgroundColor: primaryAccent }}
              />
              <span className="text-xl font-black text-white relative z-20 italic">
                {user.username[0].toUpperCase()}
              </span>
            </div>
            {/* Role Badge Mini */}
            {((user.role === 'admin' && user.showBadge) || 
               (user.role === 'moderator' && user.showModBadge) || 
               user.role === 'cheat') && (
              <div 
                className="absolute -bottom-1 -right-1 size-5 rounded-full border border-black flex items-center justify-center z-20 shadow-lg"
                style={{ 
                  backgroundColor: user.role === 'admin' ? primaryAccent : 
                                   user.role === 'moderator' ? '#3b82f6' : '#a855f7' 
                }}
              >
                {user.role === 'admin' && <Crown className="size-3 text-black" fill="currentColor" />}
                {user.role === 'moderator' && <ShieldCheck className="size-3 text-white" />}
                {user.role === 'cheat' && <Zap className="size-3 text-white" fill="currentColor" />}
              </div>
            )}
          </div>

          {(user.role === 'admin' || user.role === 'moderator') && onDirectAdmin && (
            <button
              onClick={onDirectAdmin}
              className="size-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center transition-all active:scale-90 animate-in fade-in slide-in-from-left-2"
              title={user.role === 'admin' ? 'Admin Panel' : 'Moderator Panel'}
            >
              <ShieldAlert className="size-5 text-yellow-500" />
            </button>
          )}

          {user.hasCheatAccess && onCheatClick && (
            <button
              onClick={onCheatClick}
              className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center transition-all active:scale-90 animate-in fade-in slide-in-from-left-2"
              title="Cheat Menu"
            >
              <Zap className="size-5 text-purple-500" />
            </button>
          )}
        </div>
        
        <div className="flex flex-col -gap-1">
          <div className="text-base font-black text-white italic tracking-tighter uppercase leading-tight">
            {user.username}
          </div>
          <div 
            className="text-[10px] font-black uppercase tracking-[0.2em] italic"
            style={{ color: primaryAccent }}
          >
            Elite VIP {user.vipLevel}
          </div>
        </div>
      </div>
      
      <div 
        className="flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 relative group overflow-hidden"
        style={{ 
          backgroundColor: '#000',
          borderColor: `${primaryAccent}40`,
          boxShadow: `0 5px 15px rgba(0,0,0,0.5)`
        }}
      >
        <div 
          className="absolute inset-0 opacity-0 group-active:opacity-10 transition-opacity"
          style={{ backgroundColor: primaryAccent }}
        />
        <div 
          className="size-7 rounded-lg flex items-center justify-center shadow-lg"
          style={{ backgroundColor: primaryAccent }}
        >
          <Coins className="size-4 text-black" />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-black text-white/40 uppercase tracking-widest leading-none mb-0.5">Credits</span>
          <span className="text-xl font-black text-white italic tracking-tighter leading-none">
            {user.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}