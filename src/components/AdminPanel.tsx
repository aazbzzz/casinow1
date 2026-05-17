import { useState, useEffect, useRef } from 'react';
import { X, Users, Settings, ChevronRight, Copy, Check, Plus, Zap, Ticket, Trash2, Globe, Lock, Ban, ShieldCheck, Shield, Crown, Award, Eye, EyeOff, AlertTriangle, ChevronDown, FileCode, DollarSign, Timer } from 'lucide-react';
import { saveUser, resetAllData, type PromoCode, syncPromoCodeToCloud, isSupabaseConfigured, getAllUsers, fetchUser } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { vibrate } from '@aippy/runtime/device';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { getCheats, saveCheats, type CheatSettings } from '@/lib/cheats';
import { type User } from '@/types';

const tweaks = aippyTweaks(tweaksConfig as any);

interface CheatToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function CheatToggle({ label, description, value, onChange }: CheatToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-black/30">
      <div>
        <div className="font-bold text-white">{label}</div>
        <div className="text-sm text-gray-400">{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`size-12 rounded-full flex items-center justify-center transition-all ${value ? 'bg-green-500' : 'bg-gray-700'}`}
      >
        {value ? '✓' : '✗'}
      </button>
    </div>
  );
}

interface AdminPanelProps {
  onClose: () => void;
  onUpdateBalance?: (amount: number, type: 'deposit' | 'withdraw', reason?: string) => void;
  promoCodes: PromoCode[];
  onUpdatePromoCodes: (codes: PromoCode[]) => void;
  user: User;
  onRefreshUser?: (updatedUser?: User) => void;
  cheatOnlyMode?: boolean;
  staffMode?: 'admin' | 'mod';
}

  export function AdminPanel({ onClose, onUpdateBalance, promoCodes, onUpdatePromoCodes, user, onRefreshUser, cheatOnlyMode = false, staffMode: staffModeProp }: AdminPanelProps) {
    const isAdmin = user.role === 'admin';
    const isModOnly = user.role === 'moderator';
    const isMod = isAdmin || isModOnly;
    
    // Si on est en cheatOnlyMode, on force l'onglet cheats
    // Sinon, si on est admin, on montre tout. Si on est mod, on montre uniquement users (en mode mod).
    const staffMode = staffModeProp || (isAdmin ? 'admin' : 'mod');

    const [activeTab, setActiveTab] = useState<'users' | 'cheats' | 'promo' | 'roles'>(() => {
      if (cheatOnlyMode) return 'cheats';
      if (staffMode === 'mod') return 'users';
      return 'users';
    });
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editBalances, setEditBalances] = useState({ balance: 0, bankBalance: 0, vipLevel: 1, username: '' });
  const [addMoneyAmount, setAddMoneyAmount] = useState(1000);
  const [cheats, setCheats] = useState<CheatSettings>(() => getCheats(user));
  const [cheatTargetUserId, setCheatTargetUserId] = useState<string | null>(null);
  const isInternalUpdate = useRef(false);
  const [cheatCategory, setCheatCategory] = useState<'global' | 'roulette' | 'slots' | 'coinflip' | 'dice' | 'mines' | 'crash' | 'plinko'>('global');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [newPromo, setNewPromo] = useState({
    code: '',
    type: 'currency' as 'currency' | 'multiplier' | 'crypto' | 'cheat_access',
    value: 100,
    maxUses: 10,
    cryptoSymbol: 'BTC',
    isUnlimited: false,
    duration: 3600,
    timeDays: 1,
    timeHours: 0,
    timeMinutes: 0,
    timeSeconds: 0
  });

  const formatTimeDetailed = (seconds: number) => {
    if (seconds <= 0) return '0s';
    const d = Math.floor(seconds / (24 * 3600));
    const h = Math.floor((seconds % (24 * 3600)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    if (d > 0) return `${d}j : ${pad(h)}h : ${pad(m)}m : ${pad(s)}s`;
    if (h > 0) return `${h}h : ${pad(m)}m : ${pad(s)}s`;
    if (m > 0) return `${m}m : ${pad(s)}s`;
    return `${s}s`;
  };

  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();

  const fetchUsers = async () => {
    const users = await getAllUsers();
    setDbUsers(users);
  };

  useEffect(() => {
    fetchUsers();

    // Listener pour la synchronisation globale
    const handleGlobalUpdate = (e: any) => {
      const updatedUser = e.detail;
      if (updatedUser) {
        setDbUsers(prev => {
          const exists = prev.find(u => u.id === updatedUser.id);
          if (exists) {
            // Si l'utilisateur existe, on le met à jour s'il est plus récent
            if ((updatedUser.version || 0) >= (exists.version || 0)) {
              return prev.map(u => u.id === updatedUser.id ? updatedUser : u);
            }
            return prev;
          } else {
            // Si c'est un nouvel utilisateur, on l'ajoute et on retrie (optionnel)
            return [...prev, updatedUser];
          }
        });
      }
    };

    window.addEventListener('user_updated_global', handleGlobalUpdate);
    return () => window.removeEventListener('user_updated_global', handleGlobalUpdate);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render every second to update all timers in the list
      setDbUsers(prev => [...prev]);
      
      if (user.cheatExpiresAt && cheatOnlyMode) {
        const remaining = Math.max(0, Math.floor((user.cheatExpiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          onClose();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [user.cheatExpiresAt, cheatOnlyMode, onClose]);

  useEffect(() => {
    if (editingUser && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingUser]);

  const handleToggleRole = async (userId: string, newRole: 'admin' | 'moderator' | 'player' | 'cheat') => {
    try {
      const freshUser = await fetchUser(userId);
      const updatedUser = { 
        ...freshUser, 
        role: newRole,
        version: (freshUser.version || 0) + 1
      };
      
      if (newRole === 'cheat') {
        // Cheat role: permanent access (999 days)
        updatedUser.hasCheatAccess = true;
        updatedUser.cheatExpiresAt = Date.now() + (999 * 24 * 60 * 60 * 1000);
        // Initialize cheats if null
        if (!updatedUser.cheats) {
          updatedUser.cheats = getCheats(null);
        }
      } else if (newRole === 'player') {
        // Player role: remove special access
        updatedUser.hasCheatAccess = false;
        updatedUser.cheatExpiresAt = null;
        updatedUser.cheats = undefined;
      } else {
        // Admin & Moderator: roles provide access via getCheats()
        // We preserve existing hasCheatAccess if they have it from a promo code
      }
      
      const finalUser = await saveUser(updatedUser);
      
      // Update local list
      setDbUsers(prev => prev.map(u => u.id === userId ? finalUser : u));
      
      if (userId === user.id) onRefreshUser?.(finalUser);
      if (enableHaptics) vibrate(100);
    } catch (err) {
      console.error("[AdminPanel] Error toggling role:", err);
      alert("Erreur lors de la modification du rôle.");
    }
  };

  const handleUpdateUserData = async () => {
    if (!editingUser) return;
    try {
      // IMPORTANT: On récupère la version la plus fraîche du serveur avant de modifier
      const freshUser = await fetchUser(editingUser);
      
      const updatedUser = { 
        ...freshUser, 
        username: editBalances.username || freshUser.username,
        balance: Number(editBalances.balance) || 0, 
        bankBalance: Number(editBalances.bankBalance) || 0,
        vipLevel: Math.max(1, Number(editBalances.vipLevel) || 1)
      };
      
      console.log("[AdminPanel] Saving user data:", updatedUser);
      const finalUser = await saveUser(updatedUser);
      
      // Update local list immediately
      setDbUsers(prev => prev.map(u => u.id === editingUser ? finalUser : u));
      
      // Immediate global synchronization
      window.dispatchEvent(new CustomEvent('casino_balance_update'));
      window.dispatchEvent(new CustomEvent('leaderboard_update'));
      
      if (editingUser === user.id) onRefreshUser?.(finalUser);
      
      setEditingUser(null);
      if (enableHaptics) vibrate(200);
      alert("Modifications enregistrées avec succès !");
    } catch (err) {
      console.error("[AdminPanel] Error updating user data:", err);
      alert("Erreur lors de la mise à jour des données.");
    }
  };

  const handleToggleAdminSetting = async (userId: string, setting: 'showBadge' | 'showModBadge' | 'hideFromLeaderboard') => {
    try {
      const freshUser = await fetchUser(userId);
      const updatedUser = { ...freshUser, [setting]: !freshUser[setting] };
      const finalUser = await saveUser(updatedUser);
      
      setDbUsers(prev => prev.map(u => u.id === userId ? finalUser : u));
      if (userId === user.id) onRefreshUser?.(finalUser);
      if (enableHaptics) vibrate(50);
    } catch (err) {
      console.error("[AdminPanel] Error toggling setting:", err);
    }
  };

  const handleCheatToggle = async (key: keyof CheatSettings, value: boolean | number | null | string) => {
    const newCheats = { ...cheats, [key]: value };
    isInternalUpdate.current = true;
    setCheats(newCheats);
    
    if (cheatTargetUserId && isMod) {
      try {
        const freshUser = await fetchUser(cheatTargetUserId);
        const updatedUser = { ...freshUser, cheats: newCheats, version: (freshUser.version || 0) + 1 };
        const finalUser = await saveUser(updatedUser);
        // We don't call onRefreshUser here because we are targeting someone else
      } catch (err) {
        console.error("[AdminPanel] Error saving targeted cheats:", err);
      }
    } else {
      saveCheats(newCheats);
      if (user && user.id !== 'guest') {
        try {
          const freshUser = await fetchUser(user.id);
          const updatedUser = { ...freshUser, cheats: newCheats, version: (freshUser.version || 0) + 1 };
          const finalUser = await saveUser(updatedUser);
          onRefreshUser?.(finalUser);
        } catch (err) {
          console.error("[AdminPanel] Error saving self cheats:", err);
        }
      }
    }
    if (enableHaptics) vibrate(50);
  };

  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    if (cheatTargetUserId) {
      const targetUser = dbUsers.find(u => u.id === cheatTargetUserId);
      if (targetUser) {
        setCheats(targetUser.cheats || getCheats(targetUser));
      }
    } else {
      setCheats(getCheats(user));
    }
  }, [cheatTargetUserId, dbUsers, user]);

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-start sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md overflow-hidden">
      <div className="w-full max-w-6xl h-full sm:h-[90vh] bg-[#050505] rounded-none sm:rounded-[2.5rem] border-0 sm:border-2 flex flex-col relative shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden" style={{ borderColor: `${primaryAccent}20` }}>
        <div className="p-4 sm:p-8 border-b-2 flex items-center justify-between shrink-0" style={{ borderColor: `${primaryAccent}10` }}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl flex items-center justify-center border-2" style={{ borderColor: primaryAccent, backgroundColor: `${primaryAccent}10` }}>
              {cheatOnlyMode ? <Zap className="size-5 sm:size-6" style={{ color: primaryAccent }} /> : <Settings className="size-5 sm:size-6" style={{ color: primaryAccent }} />}
            </div>
            <div>
              <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter italic leading-none">{cheatOnlyMode ? 'Cheat Menu' : 'Admin Control'}</h2>
              <div className="flex items-center gap-2 mt-1">
                {timeLeft !== null && cheatOnlyMode ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                    <Timer className="size-3 text-purple-400" />
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">{formatTimeDetailed(timeLeft)}</span>
                  </div>
                ) : (
                  <>
                    <div className="size-1.5 sm:size-2 rounded-full animate-pulse bg-green-500" />
                    <span className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">System Online</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 border border-white/10">
            <X className="size-5 sm:size-6 text-white" />
          </button>
        </div>

        <div className="flex gap-1 px-4 py-2 sm:px-6 sm:py-4 border-b-2 shrink-0 overflow-x-auto no-scrollbar" style={{ borderColor: `${primaryAccent}20` }}>
          {[
            { key: 'users', label: isModOnly ? 'Mod Control' : 'Users', icon: Users, show: !cheatOnlyMode },
            { key: 'promo', label: 'Promo', icon: Ticket, show: !cheatOnlyMode && staffMode === 'admin' },
            { key: 'cheats', label: 'Cheats', icon: Zap, show: !cheatOnlyMode && staffMode === 'admin' },
            { key: 'roles', label: 'Roles', icon: Shield, show: !cheatOnlyMode && staffMode === 'admin' },
          ].filter(tab => tab.show).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key as any);
                if (enableHaptics) vibrate(30);
              }}
              className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-sm uppercase tracking-widest transition-all flex items-center gap-2 sm:gap-3 shrink-0 border border-transparent"
              style={{
                backgroundColor: activeTab === key ? primaryAccent : 'transparent',
                color: activeTab === key ? '#000' : '#888',
                borderColor: activeTab === key ? primaryAccent : 'transparent',
                boxShadow: activeTab === key ? `0 0 20px ${primaryAccent}30` : 'none'
              }}
            >
              <Icon className="size-3.5 sm:size-4" />
              {label}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar pb-32">
          {activeTab === 'users' && (
            <div className="space-y-4 sm:space-y-6 relative min-h-full">
              {editingUser && (
                <div className="absolute inset-0 z-50 bg-[#050505] rounded-none sm:rounded-[2rem] p-4 sm:p-8 flex flex-col items-center justify-start sm:justify-center border-0 sm:border-2 overflow-y-auto" style={{ borderColor: primaryAccent }}>
                  <div className="w-full max-w-md space-y-4 sm:space-y-6 mt-4 sm:mt-0">
                    <div className="flex items-center justify-between mb-2 sm:mb-8">
                      <h3 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tighter">Edit User Data</h3>
                      <button onClick={() => setEditingUser(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10"><X size={20}/></button>
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Edit Username</label>
                      <input
                        type="text"
                        value={editBalances.username}
                        onChange={(e) => setEditBalances({ ...editBalances, username: e.target.value })}
                        className="w-full bg-black/40 border-2 rounded-xl px-4 py-3 text-white font-black outline-none transition-all"
                        style={{ borderColor: `${primaryAccent}40` }}
                        placeholder="New username"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Balance ($)</label>
                        <input
                          type="number"
                          value={editBalances.balance}
                          onChange={(e) => setEditBalances({ ...editBalances, balance: Number(e.target.value) })}
                          className="w-full bg-black/40 border-2 rounded-xl px-4 py-3 text-white font-black outline-none transition-all"
                          style={{ borderColor: `${primaryAccent}40` }}
                        />
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Bank ($)</label>
                        <input
                          type="number"
                          value={editBalances.bankBalance}
                          onChange={(e) => setEditBalances({ ...editBalances, bankBalance: Number(e.target.value) })}
                          className="w-full bg-black/40 border-2 rounded-xl px-4 py-3 text-white font-black outline-none transition-all"
                          style={{ borderColor: `${primaryAccent}40` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">VIP Level (1-10)</label>
                      <div className="flex gap-3">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={editBalances.vipLevel}
                          onChange={(e) => setEditBalances({ ...editBalances, vipLevel: Number(e.target.value) })}
                          className="flex-1 accent-white"
                        />
                        <span className="size-12 rounded-xl bg-white/10 flex items-center justify-center font-black text-white border border-white/20">{editBalances.vipLevel}</span>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleUpdateUserData}
                        className="flex-1 py-4 rounded-xl font-black text-black transition-all active:scale-95 shadow-lg"
                        style={{ backgroundColor: primaryAccent }}
                      >
                        SAVE CHANGES
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(null);
                          if (enableHaptics) vibrate(30);
                        }}
                        className="py-4 px-8 rounded-xl font-black text-white bg-white/5 border border-white/10 transition-all active:scale-95"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {dbUsers.map((u) => (
                  <div key={u.id} className="p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-black/40 border-2 transition-all hover:border-white/20" style={{ borderColor: `${primaryAccent}10` }}>
                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                      <div className="size-10 sm:size-12 rounded-xl bg-white/5 flex items-center justify-center font-black text-lg sm:text-xl text-white border border-white/10">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-white truncate flex items-center gap-2 text-sm sm:text-base">
                          {u.username}
                          {u.role === 'admin' && <Crown className="size-3 text-yellow-500" />}
                        </div>
                        <div className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest">{u.id.slice(0, 12)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-2 sm:p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase mb-1">Balance</div>
                        <div className="text-white font-black text-xs sm:text-sm">${Math.ceil(u.balance)}</div>
                      </div>
                      <div className="p-2 sm:p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase mb-1">Cheat Status</div>
                        <div className={`font-black text-[9px] sm:text-[10px] uppercase flex flex-col ${u.hasCheatAccess ? 'text-purple-400' : 'text-gray-600'}`}>
                          <span>{u.hasCheatAccess ? 'Access' : 'No Access'}</span>
                          {u.hasCheatAccess && (
                            <span className="text-[8px] opacity-70">
                              {u.cheatExpiresAt ? formatTimeDetailed(Math.max(0, Math.floor((u.cheatExpiresAt - Date.now()) / 1000))) : 'Permanent'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(u.id);
                              setEditBalances({ 
                                balance: u.balance, 
                                bankBalance: u.bankBalance || 0, 
                                vipLevel: u.vipLevel,
                                username: u.username
                              });
                              if (enableHaptics) vibrate(50);
                            }}
                            className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-400 font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-blue-500/20 border border-blue-500/30 transition-all active:scale-95"
                          >
                            Edit Data
                          </button>
                          {u.hasCheatAccess && (
                            <button
                              onClick={async () => {
                                if (confirm(`Retirer l'accès cheat pour ${u.username}?`)) {
                                  const updatedUser = { 
                                    ...u, 
                                    hasCheatAccess: false, 
                                    cheatExpiresAt: null,
                                    version: (u.version || 0) + 1,
                                    cheats: getCheats(null) // Désactive tous les cheats actifs
                                  };
                                  await saveUser(updatedUser);
                                  if (u.id === user.id) onRefreshUser?.(updatedUser);
                                  await fetchUsers();
                                  if (enableHaptics) vibrate(100);
                                }
                              }}
                              className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest border transition-all active:scale-95 bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20"
                            >
                              Remove Cheat
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!cheatOnlyMode && staffMode === 'admin' && (
                            <button
                              onClick={() => {
                                setCheatTargetUserId(u.id);
                                setActiveTab('cheats');
                                if (enableHaptics) vibrate(50);
                              }}
                              className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 text-white font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-white/10 border border-white/10 transition-all active:scale-95"
                            >
                              Control Cheats
                            </button>
                          )}
                          {!cheatOnlyMode && staffMode === 'admin' && (
                            <button
                              onClick={async () => {
                                if (confirm(`${u.isBanned ? 'Unban' : 'Ban'} user ${u.username}?`)) {
                                  try {
                                    const freshUser = await fetchUser(u.id);
                                    const updatedUser = { 
                                      ...freshUser, 
                                      isBanned: !freshUser.isBanned,
                                      version: (freshUser.version || 0) + 1 
                                    };
                                    await saveUser(updatedUser);
                                    setDbUsers(prev => prev.map(usr => usr.id === u.id ? updatedUser : usr));
                                    if (u.id === user.id) onRefreshUser?.(updatedUser);
                                    if (enableHaptics) vibrate(100);
                                  } catch (err) {
                                    console.error("[AdminPanel] Error banning user:", err);
                                  }
                                }
                              }}
                              className={`flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest border transition-all active:scale-95 ${u.isBanned ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20'}`}
                            >
                              {u.isBanned ? 'Unban' : 'Ban'}
                            </button>
                          )}
                        </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'promo' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border-2" style={{ backgroundColor: '#0a0a0a', borderColor: `${primaryAccent}20` }}>
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                  <Plus className="size-6" style={{ color: primaryAccent }} />
                  Create Promo Code
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Promo Code</label>
                    <input
                      type="text"
                      value={newPromo.code}
                      onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-black outline-none"
                      style={{ borderColor: `${primaryAccent}40` }}
                      placeholder="WELCOME2024"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Reward Type</label>
                    <select
                      value={newPromo.type}
                      onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-black appearance-none outline-none"
                      style={{ borderColor: `${primaryAccent}40` }}
                    >
                      <option value="currency">Credits (Money)</option>
                      <option value="multiplier">Win Multiplier</option>
                      <option value="crypto">Crypto Reward</option>
                      <option value="cheat_access">Cheat Menu Access</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Reward Value</label>
                    <input
                      type="number"
                      value={newPromo.value}
                      onChange={(e) => setNewPromo({ ...newPromo, value: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-black outline-none disabled:opacity-30"
                      style={{ borderColor: `${primaryAccent}40` }}
                      min="1"
                      disabled={newPromo.type === 'cheat_access'}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Usage Limit</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newPromo.maxUses}
                        onChange={(e) => setNewPromo({ ...newPromo, maxUses: Number(e.target.value) })}
                        className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-black disabled:opacity-50 outline-none"
                        style={{ borderColor: `${primaryAccent}40` }}
                        min="1"
                        disabled={newPromo.isUnlimited}
                      />
                      <button
                        onClick={() => setNewPromo({ ...newPromo, isUnlimited: !newPromo.isUnlimited })}
                        className="px-4 py-3 rounded-xl font-black border-2 transition-all"
                        style={{
                          backgroundColor: newPromo.isUnlimited ? primaryAccent : 'transparent',
                          color: newPromo.isUnlimited ? '#000' : '#fff',
                          borderColor: newPromo.isUnlimited ? primaryAccent : `${primaryAccent}40`,
                        }}
                      >
                        ∞
                      </button>
                    </div>
                  </div>
                </div>

                {newPromo.type === 'cheat_access' && (
                  <div className="mb-6 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                    <label className="text-xs font-black text-purple-400 uppercase mb-4 block tracking-widest">Precise Duration (Days : Hours : Mins : Secs)</label>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <input type="number" value={newPromo.timeDays} onChange={(e) => setNewPromo({...newPromo, timeDays: Number(e.target.value)})} className="w-full bg-black/50 border border-purple-500/30 rounded-lg p-2 text-center text-white font-black" placeholder="Days"/>
                        <span className="text-[8px] text-gray-600 uppercase block text-center mt-1">Days</span>
                      </div>
                      <div>
                        <input type="number" value={newPromo.timeHours} onChange={(e) => setNewPromo({...newPromo, timeHours: Number(e.target.value)})} className="w-full bg-black/50 border border-purple-500/30 rounded-lg p-2 text-center text-white font-black" placeholder="Hours"/>
                        <span className="text-[8px] text-gray-600 uppercase block text-center mt-1">Hours</span>
                      </div>
                      <div>
                        <input type="number" value={newPromo.timeMinutes} onChange={(e) => setNewPromo({...newPromo, timeMinutes: Number(e.target.value)})} className="w-full bg-black/50 border border-purple-500/30 rounded-lg p-2 text-center text-white font-black" placeholder="Mins"/>
                        <span className="text-[8px] text-gray-600 uppercase block text-center mt-1">Mins</span>
                      </div>
                      <div>
                        <input type="number" value={newPromo.timeSeconds} onChange={(e) => setNewPromo({...newPromo, timeSeconds: Number(e.target.value)})} className="w-full bg-black/50 border border-purple-500/30 rounded-lg p-2 text-center text-white font-black" placeholder="Secs"/>
                        <span className="text-[8px] text-gray-600 uppercase block text-center mt-1">Secs</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {newPromo.type === 'crypto' && (
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Crypto Symbol</label>
                      <input
                        type="text"
                        value={newPromo.cryptoSymbol}
                        onChange={(e) => setNewPromo({ ...newPromo, cryptoSymbol: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-black outline-none"
                        style={{ borderColor: `${primaryAccent}40` }}
                        placeholder="BTC"
                      />
                    </div>
                  )}
                  {newPromo.type === 'multiplier' && (
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Duration (Seconds)</label>
                      <input
                        type="number"
                        value={newPromo.duration}
                        onChange={(e) => setNewPromo({ ...newPromo, duration: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-black outline-none"
                        style={{ borderColor: `${primaryAccent}40` }}
                        min="1"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (!newPromo.code) return;
                    let rewardText = '';
                    let finalValue = newPromo.value;
                    
                    if (newPromo.type === 'currency') {
                      rewardText = `${newPromo.value} Credits`;
                    } else if (newPromo.type === 'multiplier') {
                      const h = Math.floor((newPromo.duration || 3600) / 3600);
                      const m = Math.floor(((newPromo.duration || 3600) % 3600) / 60);
                      const s = (newPromo.duration || 3600) % 60;
                      const timeStr = h > 0 ? `${h}h ` : m > 0 ? `${m}m ` : `${s}s`;
                      rewardText = `${newPromo.value}x Multiplier (${timeStr})`;
                    } else if (newPromo.type === 'crypto') {
                      rewardText = `${newPromo.value} ${newPromo.cryptoSymbol}`;
                    } else if (newPromo.type === 'cheat_access') {
                      const totalSeconds = (newPromo.timeDays * 86400) + (newPromo.timeHours * 3600) + (newPromo.timeMinutes * 60) + newPromo.timeSeconds;
                      finalValue = totalSeconds / 86400; // Store as fractional days for backward compatibility or use totalSeconds
                      rewardText = `Cheat Menu (${formatTimeDetailed(totalSeconds)})`;
                    }
                    
                    const codeObj: PromoCode = {
                      ...newPromo,
                      value: finalValue,
                      rewardText,
                      usedCount: 0,
                      isActive: true
                    } as PromoCode;
                    const updated = [...promoCodes, codeObj];
                    onUpdatePromoCodes(updated);
                    await syncPromoCodeToCloud(codeObj);
                    setNewPromo({ code: '', type: 'currency', value: 100, maxUses: 10, cryptoSymbol: 'BTC', isUnlimited: false, duration: 3600, timeDays: 1, timeHours: 0, timeMinutes: 0, timeSeconds: 0 });
                    if (enableHaptics) vibrate(100);
                  }}
                  className="w-full py-4 rounded-xl font-black text-black transition-all active:scale-95"
                  style={{ backgroundColor: primaryAccent }}
                >
                  Generate Code
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-black text-white">Promo Database ({promoCodes.length})</h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                    <Globe className="size-3" /> Global Sync Active
                  </div>
                </div>
                {promoCodes.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 bg-black/30 rounded-2xl border-2 border-dashed border-gray-800">
                    No promo codes in global database.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {promoCodes.map((code) => (
                      <div 
                        key={code.code} 
                        className={`p-4 rounded-xl border-2 flex items-center justify-between gap-3 transition-all ${code.isActive ? 'bg-[#0a0a0a]' : 'bg-[#1a0a0a] opacity-60 grayscale'}`} 
                        style={{ borderColor: code.isActive ? `${primaryAccent}20` : '#333' }}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                            <Ticket className="size-5" style={{ color: code.isActive ? primaryAccent : '#666' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-white flex items-center gap-2">
                              {code.code}
                              {!code.isActive && <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">DISABLED</span>}
                            </div>
                            <div className="text-xs text-gray-400">Reward: <span style={{ color: primaryAccent }} className="font-bold">{code.rewardText}</span></div>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0 px-4">
                          <div className="text-[10px] font-black uppercase text-gray-500 mb-1">Uses</div>
                          <div className="text-white font-black">{code.usedCount} <span className="text-gray-600 font-normal">/</span> {code.isUnlimited ? '∞' : code.maxUses}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={async () => {
                              const updatedCode = { ...code, isActive: !code.isActive };
                              const updated = promoCodes.map(c => c.code === code.code ? updatedCode : c);
                              onUpdatePromoCodes(updated);
                              if (isSupabaseConfigured()) await syncPromoCodeToCloud(updatedCode);
                              if (enableHaptics) vibrate(50);
                            }}
                            className={`size-10 rounded-lg flex items-center justify-center transition-all active:scale-95 border-2 ${code.isActive ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-gray-500/20 border-gray-500 text-gray-500'}`}
                          >
                            {code.isActive ? '✓' : '✗'}
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm(`Delete code ${code.code}?`)) {
                                const updated = promoCodes.filter(c => c.code !== code.code);
                                onUpdatePromoCodes(updated);
                                if (isSupabaseConfigured()) await supabase.from('promo_codes').delete().eq('code', code.code);
                                if (enableHaptics) vibrate(100);
                              }
                            }}
                            className="size-10 rounded-lg flex items-center justify-center transition-all active:scale-95 border-2 border-red-500/30 text-red-500/70 hover:text-red-500 hover:border-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'cheats' && ( 
            <div className="space-y-4"> 
              <div className="flex items-center justify-between mb-4"> 
                <div className="flex gap-2 overflow-x-auto pb-2 flex-1 no-scrollbar"> 
                  {[ 
                    { key: 'global', label: '🌐 Global' }, 
                    { key: 'roulette', label: '🎡 Roulette' }, 
                    { key: 'slots', label: '🎰 Slots' }, 
                    { key: 'coinflip', label: '🪙 Coinflip' }, 
                    { key: 'dice', label: '🎲 Dice' }, 
                    { key: 'mines', label: '💣 Mines' }, 
                    { key: 'crash', label: '🚀 Crash' }, 
                    { key: 'plinko', label: '🎯 Plinko' }, 
                  ].map(({ key, label }) => ( 
                    <button 
                      key={key} 
                      onClick={() => { 
                        setCheatCategory(key as any); 
                        if (enableHaptics) vibrate(30); 
                      }} 
                      className="px-4 py-2 rounded-xl font-bold transition-all active:scale-95 border-2 whitespace-nowrap text-xs" 
                      style={{ 
                        backgroundColor: cheatCategory === key ? primaryAccent : 'transparent', 
                        color: cheatCategory === key ? '#000' : '#fff', 
                        borderColor: cheatCategory === key ? primaryAccent : `${primaryAccent}20`, 
                      }} 
                    > 
                      {label} 
                    </button> 
                  ))} 
                </div> 
                {cheatTargetUserId && !cheatOnlyMode && ( 
                  <button 
                    onClick={() => setCheatTargetUserId(null)} 
                    className="ml-4 px-4 py-2 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-500 font-black text-[10px] uppercase tracking-widest whitespace-nowrap" 
                  > 
                    Target: {dbUsers.find(u => u.id === cheatTargetUserId)?.username} (X) 
                  </button> 
                )} 
              </div> 

              <div className="p-6 rounded-2xl border-2" style={{ backgroundColor: '#0a0a0a', borderColor: `${primaryAccent}20` }}> 
                <div className="space-y-4"> 
                  {cheatCategory === 'global' && ( 
                    <> 
                      <CheatToggle label="Always Win" description="Force all games to win" value={cheats.alwaysWin} onChange={(v) => handleCheatToggle('alwaysWin', v)} /> 
                      <CheatToggle label="Infinite Balance" description="Balance never decreases" value={cheats.infiniteBalance} onChange={(v) => handleCheatToggle('infiniteBalance', v)} /> 
                      <CheatToggle label="Freeze Balance" description="Balance stays constant" value={cheats.freezeBalance} onChange={(v) => handleCheatToggle('freezeBalance', v)} /> 
                      <CheatToggle label="Double Winnings" description="All wins are doubled" value={cheats.doubleWinnings} onChange={(v) => handleCheatToggle('doubleWinnings', v)} /> 
                      <CheatToggle label="Triple Winnings" description="All wins are tripled" value={cheats.tripleWinnings} onChange={(v) => handleCheatToggle('tripleWinnings', v)} /> 
                      <div className="opacity-50 pointer-events-none relative">
                        <CheatToggle label="Instant Win" description="Win immediately on bet" value={cheats.instantWin} onChange={(v) => handleCheatToggle('instantWin', v)} /> 
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                          <span className="text-yellow-500 font-black text-xs uppercase tracking-widest">En cours de développement</span>
                        </div>
                      </div>
                      <div className="opacity-50 pointer-events-none relative">
                        <CheatToggle label="Instant Loss" description="Lose immediately on bet" value={cheats.instantLoss} onChange={(v) => handleCheatToggle('instantLoss', v)} /> 
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl">
                          <span className="text-yellow-500 font-black text-xs uppercase tracking-widest">En cours de développement</span>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-black/30"> 
                        <div className="mb-3"> 
                          <div className="font-bold text-white">Custom Multiplier</div> 
                          <div className="text-sm text-gray-400">Set a fixed multiplier for all wins</div> 
                        </div> 
                        <input 
                          type="number" 
                          value={cheats.customMultiplier} 
                          onChange={(e) => handleCheatToggle('customMultiplier', Math.max(1, Number(e.target.value)))} 
                          className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-black outline-none transition-all" 
                          style={{ borderColor: `${primaryAccent}60` }} 
                          min="1" 
                          step="0.1" 
                        /> 
                      </div> 
                    </> 
                  )} 

                  {cheatCategory === 'roulette' && ( 
                    <> 
                      <div className="p-4 rounded-xl bg-black/30"> 
                        <div className="mb-3"> 
                          <div className="font-bold text-white">Force Number</div> 
                          <div className="text-sm text-gray-400">Choose winning number (0-36)</div> 
                        </div> 
                        <div className="flex gap-2"> 
                          <input 
                            type="number" 
                            value={cheats.forceRouletteNumber ?? ''} 
                            onChange={(e) => { 
                              const val = e.target.value === '' ? null : Math.max(0, Math.min(36, Number(e.target.value))); 
                              handleCheatToggle('forceRouletteNumber', val); 
                            }} 
                            placeholder="0-36" 
                            className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold" 
                            style={{ borderColor: `${primaryAccent}60` }} 
                          /> 
                          <button onClick={() => handleCheatToggle('forceRouletteNumber', null)} className="px-4 py-3 rounded-xl font-bold bg-red-500/20 border-2 border-red-500 text-white">OFF</button> 
                        </div> 
                      </div> 
                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Force Color</div>
                          <div className="text-sm text-gray-400">Choose winning color</div>
                        </div>
                        <div className="flex gap-2">
                          {['red', 'black', 'green'].map(color => (
                            <button
                              key={color}
                              onClick={() => handleCheatToggle('forceRouletteColor', cheats.forceRouletteColor === color ? null : color)}
                              className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all active:scale-95 uppercase text-[10px] tracking-widest ${cheats.forceRouletteColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                              style={{
                                backgroundColor: color === 'red' ? '#ff1a1a' : color === 'black' ? '#111' : '#10b981',
                                borderColor: cheats.forceRouletteColor === color ? '#fff' : 'transparent',
                                color: '#fff'
                              }}
                            >
                              {color}
                            </button>
                          ))}
                          <button onClick={() => handleCheatToggle('forceRouletteColor', null)} className="px-4 py-3 rounded-xl font-bold bg-red-500/20 border-2 border-red-500 text-white text-[10px]">OFF</button>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Force Parity</div>
                          <div className="text-sm text-gray-400">Choose ODD or EVEN</div>
                        </div>
                        <div className="flex gap-2">
                          {['even', 'odd'].map(parity => (
                            <button
                              key={parity}
                              onClick={() => handleCheatToggle('forceRouletteParity', cheats.forceRouletteParity === parity ? null : parity)}
                              className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all active:scale-95 uppercase text-[10px] tracking-widest ${cheats.forceRouletteParity === parity ? 'bg-blue-500 border-white text-white' : 'bg-black/50 border-white/10 text-gray-400'}`}
                            >
                              {parity}
                            </button>
                          ))}
                          <button onClick={() => handleCheatToggle('forceRouletteParity', null)} className="px-4 py-3 rounded-xl font-bold bg-red-500/20 border-2 border-red-500 text-white text-[10px]">OFF</button>
                        </div>
                      </div>
                    </> 
                  )} 

                  {cheatCategory === 'slots' && ( 
                    <> 
                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Force Symbol</div>
                          <div className="text-sm text-gray-400">Choose which symbol will land</div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐'].map(symbol => (
                            <button
                              key={symbol}
                              onClick={() => handleCheatToggle('forceSlotsSymbol', cheats.forceSlotsSymbol === symbol ? null : symbol)}
                              className={`py-3 rounded-xl text-2xl transition-all active:scale-95 border-2 ${cheats.forceSlotsSymbol === symbol ? 'bg-green-500/20 border-green-500' : 'bg-black/50 border-white/10'}`}
                            >
                              {symbol}
                            </button>
                          ))}
                          <button
                            onClick={() => handleCheatToggle('forceSlotsSymbol', null)}
                            className="py-3 rounded-xl text-xs font-bold transition-all active:scale-95 border-2 bg-red-500/20 border-red-500 text-white"
                          >
                            OFF
                          </button>
                        </div>
                      </div>
                      <CheatToggle label="Always Jackpot" description="Force triple 7s" value={cheats.slotsAlwaysJackpot} onChange={(v) => handleCheatToggle('slotsAlwaysJackpot', v)} /> 
                      <CheatToggle label="High Win Rate" description="Increase win frequency" value={cheats.slotsHighWinRate} onChange={(v) => handleCheatToggle('slotsHighWinRate', v)} /> 
                    </> 
                  )} 

                  {cheatCategory === 'coinflip' && ( 
                    <> 
                      <CheatToggle label="Force Heads" description="Always land on heads" value={cheats.coinflipForceHeads} onChange={(v) => handleCheatToggle('coinflipForceHeads', v)} /> 
                      <CheatToggle label="Force Tails" description="Always land on tails" value={cheats.coinflipForceTails} onChange={(v) => handleCheatToggle('coinflipForceTails', v)} /> 
                    </> 
                  )} 

                  {cheatCategory === 'dice' && ( 
                    <> 
                      <CheatToggle label="Always Win" description="Always roll in winning range" value={cheats.diceAlwaysWin} onChange={(v) => handleCheatToggle('diceAlwaysWin', v)} /> 
                      <div className="p-4 rounded-xl bg-black/30"> 
                        <div className="mb-3"> 
                          <div className="font-bold text-white">Force Roll</div> 
                          <div className="text-sm text-gray-400">Force a specific number (0.00-99.99)</div> 
                        </div> 
                        <div className="flex gap-2"> 
                          <input 
                            type="number" 
                            value={cheats.diceForceRoll ?? ''} 
                            onChange={(e) => { 
                              const val = e.target.value === '' ? null : Math.max(0, Math.min(99.99, Number(e.target.value))); 
                              handleCheatToggle('diceForceRoll', val); 
                            }} 
                            placeholder="0.00-99.99" 
                            className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold" 
                            style={{ borderColor: `${primaryAccent}60` }} 
                          /> 
                          <button onClick={() => handleCheatToggle('diceForceRoll', null)} className="px-4 py-3 rounded-xl font-bold bg-red-500/20 border-2 border-red-500 text-white">OFF</button> 
                        </div> 
                      </div> 
                    </> 
                  )} 

                  {cheatCategory === 'mines' && ( 
                    <> 
                      <CheatToggle label="Show Mines" description="Mines are visible through cards" value={cheats.minesShowMines} onChange={(v) => handleCheatToggle('minesShowMines', v)} /> 
                      <CheatToggle label="Force Safe" description="First 10 picks are always safe" value={cheats.minesForceSafe} onChange={(v) => handleCheatToggle('minesForceSafe', v)} /> 
                      <CheatToggle label="No Explosion" description="Mines never end the game" value={cheats.minesNoExplosion} onChange={(v) => handleCheatToggle('minesNoExplosion', v)} />
                      <CheatToggle label="Auto Pick" description="Automatically pick safe tiles" value={cheats.minesAutoPick} onChange={(v) => handleCheatToggle('minesAutoPick', v)} /> 
                      <CheatToggle label="Predictive Path" description="Highlight the winning path" value={cheats.minesPredictivePath} onChange={(v) => handleCheatToggle('minesPredictivePath', v)} /> 
                    </> 
                  )} 

                  {cheatCategory === 'crash' && ( 
                    <> 
                      <div className="p-4 rounded-xl bg-black/30"> 
                        <div className="mb-3"> 
                          <div className="font-bold text-white">Force Crash Multiplier</div> 
                          <div className="text-sm text-gray-400">Choose when the game crashes</div> 
                        </div> 
                        <div className="flex gap-2"> 
                          <input 
                            type="number" 
                            value={cheats.forceCrashMultiplier ?? ''} 
                            onChange={(e) => { 
                              const val = e.target.value === '' ? null : Math.max(1.01, Number(e.target.value)); 
                              handleCheatToggle('forceCrashMultiplier', val); 
                            }} 
                            placeholder="e.g. 2.50" 
                            className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold" 
                            style={{ borderColor: `${primaryAccent}60` }} 
                            step="0.01"
                          /> 
                          <button onClick={() => handleCheatToggle('forceCrashMultiplier', null)} className="px-4 py-3 rounded-xl font-bold bg-red-500/20 border-2 border-red-500 text-white">OFF</button> 
                        </div> 
                      </div> 
                      <div className="p-4 rounded-xl bg-black/30"> 
                        <div className="mb-3"> 
                          <div className="font-bold text-white">Force Start Multiplier</div> 
                          <div className="text-sm text-gray-400">Game starts at this value</div> 
                        </div> 
                        <div className="flex gap-2"> 
                          <input 
                            type="number" 
                            value={cheats.crashStartMultiplier ?? ''} 
                            onChange={(e) => { 
                              const val = e.target.value === '' ? null : Math.max(1, Number(e.target.value)); 
                              handleCheatToggle('crashStartMultiplier', val); 
                            }} 
                            placeholder="1+" 
                            className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold" 
                            style={{ borderColor: `${primaryAccent}60` }} 
                          /> 
                          <button onClick={() => handleCheatToggle('crashStartMultiplier', null)} className="px-4 py-3 rounded-xl font-bold bg-red-500/20 border-2 border-red-500 text-white">OFF</button> 
                        </div> 
                      </div> 
                      <CheatToggle label="Never Crash" description="Multiplier never crashes" value={cheats.crashNeverCrash} onChange={(v) => handleCheatToggle('crashNeverCrash', v)} /> 
                      <CheatToggle label="Max Multiplier" description="Always crash at 100x" value={cheats.crashMaxMultiplier} onChange={(v) => handleCheatToggle('crashMaxMultiplier', v)} /> 
                    </> 
                  )} 

                  {cheatCategory === 'plinko' && ( 
                    <> 
                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Force Multiplier</div>
                          <div className="text-sm text-gray-400">Choose landing slot</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[16, 9, 4.2, 2, 1.2, 0.6, 0.4].map(mult => (
                            <button
                              key={mult}
                              onClick={() => handleCheatToggle('forcePlinkoMultiplier', cheats.forcePlinkoMultiplier === mult ? null : mult)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${cheats.forcePlinkoMultiplier === mult ? 'bg-green-500/20 border-green-500' : 'bg-black/50 border-white/10'}`}
                            >
                              x{mult}
                            </button>
                          ))}
                          <button
                            onClick={() => handleCheatToggle('forcePlinkoMultiplier', null)}
                            className="px-3 py-2 rounded-lg text-xs font-bold bg-red-500/20 border-2 border-red-500 text-white"
                          >
                            OFF
                          </button>
                        </div>
                      </div>
                      <CheatToggle label="Force Big Win" description="Always lands in x4+ slot" value={cheats.forcePlinkoWin} onChange={(v) => handleCheatToggle('forcePlinkoWin', v)} /> 
                      <CheatToggle label="Max Multiplier" description="Always land in 16x slot" value={cheats.plinkoMaxMultiplier} onChange={(v) => handleCheatToggle('plinkoMaxMultiplier', v)} /> 
                    </> 
                  )} 

                  <div className="p-4 rounded-xl border-2 border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3"> 
                    <AlertTriangle className="size-5 text-yellow-500 shrink-0 mt-0.5" /> 
                    <div> 
                      <div className="text-sm text-yellow-500 font-bold mb-1">⚠️ Warning</div> 
                      <div className="text-xs text-gray-400"> 
                        {cheatTargetUserId ? 'Cheats for this user are stored in the cloud and sync in real-time.' : 'Local cheats are stored in your browser. Target a user to apply cheats remotely.'} 
                      </div> 
                    </div> 
                  </div> 

                  {cheatOnlyMode && timeLeft !== null && ( 
                    <div className="mt-8 p-6 rounded-2xl bg-purple-500/10 border-2 border-purple-500/30 flex flex-col items-center gap-2"> 
                      <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Access Expires In</div> 
                      <div className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tighter italic"> 
                        {formatTimeDetailed(timeLeft)} 
                      </div> 
                    </div> 
                  )} 
                </div> 
              </div> 
            </div> 
          )} 
          
              {activeTab === 'roles' && isAdmin && (
                <div className="space-y-6">
              <div className="p-6 rounded-3xl border-2 bg-black/40" style={{ borderColor: `${primaryAccent}20` }}>
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                  <Shield className="size-6 text-yellow-500" />
                  User Roles & System Management
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {dbUsers.map(u => (
                    <div key={u.id} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between transition-all hover:bg-white/10 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-black flex items-center justify-center font-black text-lg border border-white/10" style={{ color: primaryAccent }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-white flex items-center gap-2 text-sm">
                            {u.username}
                            {u.role === 'admin' && <Crown className="size-3 text-yellow-500" />}
                            {u.role === 'moderator' && <Shield className="size-3 text-blue-500" />}
                          </div>
                          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">Current Role: <span style={{ color: u.role === 'admin' ? '#fbbf24' : u.role === 'moderator' ? '#60a5fa' : '#fff' }}>{u.role}</span></div>
                        </div>
                      </div>
                      <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/10 w-full sm:w-auto overflow-x-auto no-scrollbar">
                        {['player', 'moderator', 'admin', 'cheat'].map((r) => (
                          <button
                            key={r}
                            onClick={() => handleToggleRole(u.id, r as any)}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all active:scale-95 whitespace-nowrap ${u.role === r ? 'bg-white/20 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            style={u.role === r ? { 
                              color: r === 'admin' ? '#fbbf24' : r === 'moderator' ? '#60a5fa' : r === 'cheat' ? '#a78bfa' : '#fff',
                              backgroundColor: r === 'admin' ? 'rgba(251, 191, 36, 0.15)' : r === 'moderator' ? 'rgba(96, 165, 250, 0.15)' : r === 'cheat' ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255, 255, 255, 0.15)'
                            } : {}}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-3xl border-2 bg-black/40" style={{ borderColor: `${primaryAccent}20` }}>
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                  <Award className="size-6 text-yellow-500" />
                  My Personal Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isAdmin && (
                    <button
                      onClick={() => handleToggleAdminSetting(user.id, 'showBadge')}
                      className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${user.showBadge ? 'bg-yellow-500/20 border-yellow-500' : 'bg-white/5 border-white/10'}`}
                    >
                      <ShieldCheck className={`size-8 ${user.showBadge ? 'text-yellow-500' : 'text-gray-500'}`} />
                      <div className="text-center">
                        <div className="font-black text-white text-xs uppercase tracking-widest mb-1">Display Admin Badge</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase">{user.showBadge ? 'VISIBLE' : 'HIDDEN'}</div>
                      </div>
                    </button>
                  )}
                  {isModOnly && (
                    <div className="p-6 rounded-2xl border-2 bg-blue-500/10 border-blue-500/30 flex flex-col items-center gap-3 opacity-80 cursor-not-allowed">
                      <Shield className="size-8 text-blue-500" />
                      <div className="text-center">
                        <div className="font-black text-white text-xs uppercase tracking-widest mb-1">Mod Badge Always Visible</div>
                        <div className="text-[10px] text-blue-500 font-bold uppercase">FORCE VISIBLE</div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleToggleAdminSetting(user.id, 'hideFromLeaderboard')}
                    className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${user.hideFromLeaderboard ? 'bg-red-500/20 border-red-500' : 'bg-white/5 border-white/10'}`}
                  >
                    {user.hideFromLeaderboard ? <EyeOff className="size-8 text-red-500" /> : <Eye className="size-8 text-green-500" />}
                    <div className="text-center">
                      <div className="font-black text-white text-xs uppercase tracking-widest mb-1">Leaderboard Presence</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase">{user.hideFromLeaderboard ? 'HIDDEN' : 'VISIBLE'}</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
