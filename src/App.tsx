import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameState } from '@/hooks/useGameState';
import { TopBar } from '@/components/TopBar';
import { CasinoSection } from '@/components/casino/CasinoSection';
import { SportsSection } from '@/components/sports/SportsSection';
import { WalletSection } from '@/components/wallet/WalletSection';
import { VIPSection } from '@/components/vip/VIPSection';
import { QuestsSection } from '@/components/quests/QuestsSection';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { AdminPanel } from '@/components/AdminPanel';
import { AuthModal } from '@/components/AuthModal';
import { LayoutGrid, Trophy, Wallet, Settings as SettingsIcon, Crown, ShieldAlert, Zap, Coins, Globe, Shield, Target } from 'lucide-react';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import { vibrate } from '@aippy/runtime/device';
import { sendEvent, reportScore } from '@aippy/runtime/leaderboard';
import { savePromoCodes, getPromoCodes, saveUser, getUser, logout, getAllUsers } from '@/lib/storage';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig as any);

function App() {
  const { user, quests, updateBalance, placeBet, recordWin, recordLoss, claimQuest, depositToBank, withdrawFromBank, refreshUser } = useGameState();
  const [activeSection, setActiveSection] = useState<'casino' | 'sports' | 'wallet' | 'vip' | 'quests' | 'settings' | 'leaderboard'>('casino');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showAuth, setShowAuth] = useState(() => !localStorage.getItem('casino_current_user_id'));

  useEffect(() => {
    if (user && user.id) {
      reportScore(user.balance);
      fetchLeaderboard();
    }
  }, [user?.balance, user?.id, user?.username]);

  const fetchLeaderboard = () => {
    const users = getAllUsers();
    const sortedUsers = [...users]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10)
      .map(u => ({
        userId: u.id,
        score: u.balance,
        metadata: { username: u.username }
      }));
    setLeaderboard(sortedUsers);
  };

  const handleAuthComplete = (newUser: any) => {
    saveUser(newUser);
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
          // Multiplier expired, refresh user to update state
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

  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  const globalPromoCodesStr = tweaks.globalPromoCodes.useState();

  // "Base de données" synchronisée des codes promo
  const [syncedPromoCodes, setSyncedPromoCodes] = useState<any[]>(() => {
    const local = getPromoCodes();
    return local.length > 0 ? local : [];
  });

  // Synchronisation entre le tweak global et l'état local
  useEffect(() => {
    if (globalPromoCodesStr) {
      try {
        const remoteCodes = JSON.parse(globalPromoCodesStr);
        if (Array.isArray(remoteCodes)) {
          setSyncedPromoCodes(remoteCodes);
          savePromoCodes(remoteCodes);
        }
      } catch (e) {
        console.error("Failed to parse global promo codes", e);
      }
    }
  }, [globalPromoCodesStr]);

  const handleUpdatePromoCodes = (newCodes: any[]) => {
    setSyncedPromoCodes(newCodes);
    savePromoCodes(newCodes);
    // On notifie la plateforme du changement
    sendEvent('global_promo_codes_update', { 
      codes: JSON.stringify(newCodes),
      timestamp: Date.now()
    });
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
    { id: 'sports', icon: Trophy, label: 'Sports' },
    { id: 'wallet', icon: Wallet, label: 'Wallet' },
    { id: 'leaderboard', icon: Globe, label: 'Ranking' },
    { id: 'vip', icon: Shield, label: 'VIP' },
    { id: 'quests', icon: Target, label: 'Quests' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ];

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminInput === '190608') {
      setShowAdminPanel(true);
      setShowAdminCode(false);
      setAdminInput('');
      if (enableHaptics) vibrate([50, 30, 50]);
    } else {
      if (enableHaptics) vibrate(200);
      setAdminInput('');
    }
  };

  const handleAdminTrigger = () => {
    // If we are in a game, this button acts as a "back" button
    if (isInGame) {
      if (enableHaptics) vibrate(10);
      gameCloseCallbackRef.current?.();
      return;
    }

    // Otherwise, handle admin trigger (triple click)
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (enableHaptics) vibrate(10);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    if (newCount === 3) {
      setShowAdminCode(true);
      setClickCount(0);
      if (enableHaptics) vibrate([20, 20, 50]);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        setClickCount(0);
      }, 500);
    }
  };

  const handleGameStatusChange = useCallback((status: boolean) => {
    setIsInGame(status);
  }, []);

  const setGameCloseCallback = useCallback((callback: () => void) => {
    gameCloseCallbackRef.current = callback;
  }, []);

  return (
    <div 
      className="fixed inset-0 flex flex-col overflow-hidden font-sans selection:bg-cyan-500/30 bg-[#0a0a0c]"
      style={{ 
        backgroundImage: 'url(https://cdn.aippy.ai/asset/d55bbb5a4b5f44f09a6f5a64f5045de5.jpg?x-oss-process=image/format,webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px]" />
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-full max-w-md mx-auto w-full border-x border-white/5 bg-black/20 shadow-2xl">
        <TopBar user={user} onAdminClick={() => setShowAdminPanel(true)} />
        
        <main 
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-32 px-4"
        >
          <div className="py-4">
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
            {activeSection === 'sports' && (
              <SportsSection />
            )}
            {activeSection === 'wallet' && (
              <WalletSection user={user} onDeposit={depositToBank} onWithdraw={withdrawFromBank} />
            )}
            {activeSection === 'vip' && <VIPSection user={user} />}
            {activeSection === 'quests' && <QuestsSection quests={quests} onClaimQuest={claimQuest} />}
            
            {activeSection === 'leaderboard' && (
              <div className="p-4 space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Leaderboard</h2>
                    <div className="h-1 w-12 mt-1 rounded-full" style={{ backgroundColor: primaryAccent }} />
                  </div>
                  <Globe className="size-6 text-white/20" />
                </div>
                
                <div className="space-y-3">
                  {leaderboard.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 italic">No rankings available. Be the first!</div>
                  ) : (
                    leaderboard.map((entry, idx) => (
                      <div 
                        key={entry.userId} 
                        className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${entry.userId === user.id ? 'border-white/20 bg-white/5 scale-105' : 'border-white/5 bg-black/40'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`size-10 rounded-xl flex items-center justify-center font-black ${idx === 0 ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-600 text-black' : 'bg-white/5 text-white/40'}`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-black text-white uppercase tracking-tight">{entry.metadata?.username || 'Anonyme'}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Rank {idx + 1}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-lg italic" style={{ color: idx < 3 ? primaryAccent : '#fff' }}>{entry.score.toLocaleString()}</div>
                          <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Credits</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeSection === 'settings' && (
              <SettingsSection 
                onRewardClaimed={refreshUser} 
                promoCodes={syncedPromoCodes}
                onUpdatePromoCodes={handleUpdatePromoCodes}
                onLogout={handleLogout}
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

        {/* Auth Modal */}
        {showAuth && (
          <AuthModal onAuthComplete={handleAuthComplete} />
        )}

        {/* Triple Click Hidden Trigger (Top-Left Corner) */}
        <div className="absolute top-0 left-0 w-20 h-20 z-[200]">
          <button
            onClick={handleAdminTrigger}
            className="w-full h-full opacity-0 cursor-default"
            aria-hidden="true"
          />
        </div>

        {/* Admin Code Modal */}
        {showAdminCode && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <div 
              className="w-full max-w-xs bg-[#0a0a0c] border-2 rounded-[2rem] p-8 shadow-2xl"
              style={{ borderColor: primaryAccent }}
            >
              <div className="flex justify-center mb-6">
                <div 
                  className="size-16 rounded-2xl flex items-center justify-center border-2"
                  style={{ borderColor: primaryAccent, backgroundColor: `${primaryAccent}10` }}
                >
                  <ShieldAlert className="size-8" style={{ color: primaryAccent }} />
                </div>
              </div>
              <h3 className="text-xl font-black text-white text-center mb-2 uppercase tracking-tight">Accès Restreint</h3>
              <p className="text-xs text-gray-500 text-center mb-6 uppercase tracking-widest font-bold">Code d'administration requis</p>
              
              <form onSubmit={handleAdminAuth} className="space-y-4">
                <input
                  autoFocus
                  type="password"
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-center text-white font-black tracking-[0.5em] focus:outline-none focus:border-white/30 transition-all"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="submit"
                    className="py-3 rounded-xl font-black text-black transition-all active:scale-95"
                    style={{ backgroundColor: primaryAccent }}
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminCode(false);
                      setAdminInput('');
                    }}
                    className="py-3 rounded-xl font-black text-white bg-white/5 border border-white/10 transition-all active:scale-95"
                  >
                    FERMER
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAdminPanel && (
          <AdminPanel 
            onClose={() => setShowAdminPanel(false)} 
            onUpdateBalance={updateBalance}
            promoCodes={syncedPromoCodes}
            onUpdatePromoCodes={handleUpdatePromoCodes}
          />
        )}
      </div>
    </div>
  );
}

export default App;