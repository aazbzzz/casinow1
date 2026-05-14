import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { TopBar } from '@/components/TopBar';
import { CasinoSection } from '@/components/casino/CasinoSection';
import { WalletSection } from '@/components/wallet/WalletSection';
import { VIPSection } from '@/components/vip/VIPSection';
import { QuestsSection } from '@/components/quests/QuestsSection';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { AdminPanel } from '@/components/AdminPanel';
import { AuthModal } from '@/components/AuthModal';
import { LayoutGrid, Trophy, Wallet, Settings as SettingsIcon, Crown, ShieldAlert, Zap, Coins, Globe, Shield, Target, TrendingUp } from 'lucide-react';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import { vibrate } from '@aippy/runtime/device';
import { sendEvent, reportScore } from '@aippy/runtime/leaderboard';
import { 
  savePromoCodes, 
  getPromoCodes, 
  saveUser, 
  logout, 
  getAllUsers, 
  getCurrentUID, 
  getGlobalPromoCodes, 
  fetchUser, 
  isSupabaseConfigured, 
  getLeaderboard 
} from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig as any);

function App() {
  const { user, quests, updateBalance, placeBet, recordWin, recordLoss, claimQuest, depositToBank, withdrawFromBank, refreshUser } = useGameState();
  const [activeSection, setActiveSection] = useState<'casino' | 'wallet' | 'vip' | 'quests' | 'settings' | 'leaderboard'>('casino');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showAuth, setShowAuth] = useState(() => !getCurrentUID());

  // Sync Score to Global Leaderboard
  useEffect(() => {
    if (user && user.id && user.id !== 'guest') {
      reportScore(user.balance);
    }
  }, [user?.balance, user?.id, user?.username]);

  // Sync Leaderboard from Supabase with Debounce
  const leaderboardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshLeaderboard = useCallback(async () => {
    // Éviter trop d'appels simultanés
    if (leaderboardTimerRef.current) return;
    
    leaderboardTimerRef.current = setTimeout(async () => {
      const data = await getLeaderboard(10);
      setLeaderboard(data);
      leaderboardTimerRef.current = null;
    }, 2000); // Mise à jour max toutes les 2 secondes
  }, []);

  useEffect(() => {
    refreshLeaderboard();
    const interval = setInterval(refreshLeaderboard, 30000); // Backup toutes les 30s
    
    // REALTIME SUPABASE: Écouter les changements des utilisateurs pour le leaderboard
    if (isSupabaseConfigured()) {
      console.log('[Realtime] Subscribing to users table for leaderboard...');
      const userChannel = supabase
        .channel('leaderboard-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload: any) => {
          console.log('[Realtime] User update detected for leaderboard:', payload);
          refreshLeaderboard();
        })
        .subscribe((status) => {
          console.log(`[Realtime] Leaderboard subscription status: ${status}`);
        });
      
      return () => {
        console.log('[Realtime] Unsubscribing from leaderboard updates');
        supabase.removeChannel(userChannel);
        clearInterval(interval);
        if (leaderboardTimerRef.current) clearTimeout(leaderboardTimerRef.current);
      };
    }

    return () => clearInterval(interval);
  }, [refreshLeaderboard]);

  const handleAuthComplete = (newUser: any) => {
    const cleanUser = {
      ...newUser,
      balance: Number(newUser.balance) || 0,
      bankBalance: Number(newUser.bankBalance) || 0,
      totalWagered: Number(newUser.totalWagered) || 0,
      vipLevel: Number(newUser.vipLevel) || 1,
    };
    saveUser(cleanUser);
    refreshUser();
    setShowAuth(false);
  };

  const handleLogout = () => {
    logout();
    setShowAuth(true);
    refreshUser();
  };

  const [showAdminCode, setShowAdminCode] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [multiplierTimeLeft, setMultiplierTimeLeft] = useState<number | null>(null);
  const [isInGame, setIsInGame] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameCloseCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (user.activeMultiplier) {
        const remaining = Math.max(0, Math.floor((user.activeMultiplier.expiresAt - Date.now()) / 1000));
        if (remaining > 0) {
          setMultiplierTimeLeft(remaining);
        } else {
          setMultiplierTimeLeft(null);
          refreshUser();
        }
      } else {
        setMultiplierTimeLeft(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [user.activeMultiplier, refreshUser]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatWager = (amount: number) => {
    if (amount >= 1000000000) return (amount / 1000000000).toFixed(1) + 'B';
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
    return amount.toLocaleString();
  };

  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();

  // "Base de données" synchronisée des codes promo
  const [syncedPromoCodes, setSyncedPromoCodes] = useState<any[]>([]);

  // Sync Promo Codes from Global Storage & Real-time
  useEffect(() => {
    const loadInitialPromo = async () => {
      const codes = await getGlobalPromoCodes();
      setSyncedPromoCodes(codes);
    };
    loadInitialPromo();

    // REALTIME SUPABASE: Écouter les changements des codes promo
    if (isSupabaseConfigured()) {
      console.log('[Realtime] Subscribing to promo_codes table...');
      const promoChannel = supabase
        .channel('promo-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_codes' }, (payload: any) => {
          console.log('[Realtime] Promo Code Update detected:', payload);
          // On recharge tout pour avoir la liste à jour (insert/update/delete)
          loadInitialPromo();
        })
        .subscribe((status) => {
          console.log(`[Realtime] Promo subscription status: ${status}`);
        });
      
      return () => {
        console.log('[Realtime] Unsubscribing from promo updates');
        supabase.removeChannel(promoChannel);
      };
    }
  }, []);

  const handleUpdatePromoCodes = (newCodes: any[]) => {
    setSyncedPromoCodes(newCodes);
    savePromoCodes(newCodes);
  };

  const handleSectionChange = (section: typeof activeSection) => {
    setActiveSection(section);
    if (enableHaptics) vibrate(10);
    requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const navItems = [
    { id: 'casino', icon: Coins, label: 'Casino' },
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    { id: 'leaderboard', icon: Globe, label: 'Ranking' },
    { id: 'vip', icon: Crown, label: 'VIP' },
    { id: 'quests', icon: Target, label: 'Quests' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ];

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminInput === '190608') {
      setShowAdminPanel(true);
      setShowAdminCode(false);
      setAdminInput('');
      if (enableHaptics) vibrate(100);
    } else {
      setAdminInput('');
      if (enableHaptics) vibrate([50, 50]);
    }
  };

  const handleSecretClick = () => {
    setClickCount(prev => prev + 1);
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    
    clickTimeoutRef.current = setTimeout(() => {
      if (clickCount >= 2) {
        setShowAdminCode(true);
        if (enableHaptics) vibrate(50);
      }
      setClickCount(0);
    }, 500);
  };

  const handleGameStatusChange = (inGame: boolean) => {
    setIsInGame(inGame);
  };

  const setGameCloseCallback = (callback: () => void) => {
    gameCloseCallbackRef.current = callback;
  };

  return (
    <div className="h-screen w-screen bg-[#050505] text-white overflow-hidden font-sans select-none flex flex-col relative">
      <TopBar user={user} onAdminClick={handleSecretClick} />
      
      {/* Active Multiplier Global Popup */}
      {multiplierTimeLeft !== null && user.activeMultiplier && (
        <div className="fixed top-20 right-4 z-[100] animate-in slide-in-from-right duration-500">
          <div className="p-4 rounded-2xl border-2 bg-black/80 backdrop-blur-xl shadow-2xl flex items-center gap-4" style={{ borderColor: primaryAccent }}>
            <div className="size-12 rounded-xl bg-white/10 flex items-center justify-center">
              <TrendingUp className="size-7" style={{ color: primaryAccent }} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active Multiplier</div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black italic" style={{ color: primaryAccent }}>x{user.activeMultiplier.value}</span>
                <span className="text-sm font-bold text-white tabular-nums bg-white/10 px-2 py-0.5 rounded-lg">{formatTime(multiplierTimeLeft)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <main ref={containerRef} className="flex-1 overflow-y-auto pb-32 px-4 pt-4 scroll-smooth">
        <div className="max-w-2xl mx-auto space-y-6">
          {activeSection === 'casino' && (
            <CasinoSection 
              balance={user.balance} 
              onBet={placeBet} 
              onWin={recordWin} 
              onLoss={recordLoss} 
              onGameStatusChange={handleGameStatusChange}
              onSetCloseCallback={setGameCloseCallback}
            />
          )}
          {activeSection === 'wallet' && (
            <WalletSection user={user} onDeposit={depositToBank} onWithdraw={withdrawFromBank} onRefreshUser={refreshUser} />
          )}
          {activeSection === 'vip' && (
            <VIPSection user={user} />
          )}
          {activeSection === 'quests' && (
            <QuestsSection quests={quests} onClaimQuest={claimQuest} />
          )}
          {activeSection === 'leaderboard' && (
            <div className="p-6 rounded-3xl bg-[#0a0a0a] border-2 border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter">Ranking</h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Top players worldwide</p>
                </div>
                <div className="size-14 rounded-2xl bg-white/5 flex items-center justify-center border-2 border-white/5">
                  <Globe className="size-8" style={{ color: primaryAccent }} />
                </div>
              </div>

              <div className="space-y-3">
                {leaderboard.map((entry, idx) => (
                  <div 
                    key={entry.id} 
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${
                      entry.id === user.id ? 'bg-white/10 scale-102 shadow-xl' : 'bg-white/5'
                    }`}
                    style={{ 
                      borderColor: entry.id === user.id ? primaryAccent : 'rgba(255,255,255,0.05)',
                      backgroundColor: entry.id === user.id ? `${primaryAccent}15` : undefined
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-xl flex items-center justify-center font-black text-lg ${
                        idx === 0 ? 'bg-yellow-500 text-black' : 
                        idx === 1 ? 'bg-gray-300 text-black' : 
                        idx === 2 ? 'bg-amber-600 text-black' : 'bg-white/5 text-white'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-black text-white uppercase tracking-tight">{entry.username || 'Anonyme'}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase">Rank {idx + 1}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-lg italic" style={{ color: idx < 3 ? primaryAccent : '#fff' }}>{entry.balance.toLocaleString()}</div>
                      <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Credits</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeSection === 'settings' && (
            <SettingsSection 
              onRewardClaimed={refreshUser} 
              promoCodes={syncedPromoCodes}
              onUpdatePromoCodes={handleUpdatePromoCodes}
              onLogout={handleLogout}
              onUpdateBalance={updateBalance}
            />
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-3xl border-t border-white/10 px-2 pt-3 pb-safe flex items-center justify-around z-50">
        {/* Multiplier Boost Indicator */}
        {multiplierTimeLeft !== null && (
          <div className="absolute -top-16 right-4 z-[60] animate-in slide-in-from-bottom-4 duration-300">
            <div 
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shadow-2xl transition-all duration-300 ${
                multiplierTimeLeft < 10 ? 'animate-pulse scale-105' : ''
              }`}
              style={{ 
                backgroundColor: `${primaryAccent}15`, 
                borderColor: multiplierTimeLeft < 10 ? '#ef4444' : primaryAccent,
                boxShadow: `0 0 20px ${multiplierTimeLeft < 10 ? '#ef444430' : `${primaryAccent}30`}`
              }}
            >
              <Zap className="size-4" style={{ color: multiplierTimeLeft < 10 ? '#ef4444' : primaryAccent }} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-tighter text-white leading-none">Boost {user.activeMultiplier?.value}x</span>
                <span className="text-xs font-mono font-black text-white leading-none mt-0.5">{formatTime(multiplierTimeLeft)}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-around w-full mb-6">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleSectionChange(id as any)}
              className="flex flex-col items-center gap-1 min-w-[56px] relative group py-1"
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${
                activeSection === id 
                  ? 'bg-white/10 scale-110 shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                  : 'text-gray-500'
              }`}>
                <Icon 
                  className="size-6 transition-all duration-300"
                  style={{ color: activeSection === id ? primaryAccent : undefined }}
                />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-tight transition-all duration-300 ${
                activeSection === id ? 'text-white scale-100 opacity-100' : 'text-gray-600 scale-90 opacity-0'
              }`}>
                {label}
              </span>
              {activeSection === id && (
                <div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full"
                  style={{ backgroundColor: primaryAccent, boxShadow: `0 0 10px ${primaryAccent}` }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Admin Code Modal */}
      {showAdminCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-xs bg-[#0a0a0a] border-2 border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-4 text-center">Admin Access</h3>
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <input
                type="password"
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                autoFocus
                className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-center text-xl font-black tracking-[0.5em] focus:outline-none focus:border-white/20"
                placeholder="••••••"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminCode(false)}
                  className="flex-1 py-3 rounded-xl font-black text-xs uppercase bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-black text-xs uppercase text-black"
                  style={{ backgroundColor: primaryAccent }}
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {showAdminPanel && (
        <AdminPanel 
          onClose={() => setShowAdminPanel(false)} 
          onUpdatePromoCodes={handleUpdatePromoCodes}
          promoCodes={syncedPromoCodes}
        />
      )}

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal onAuthComplete={handleAuthComplete} />
      )}
    </div>
  );
}

export default App;
