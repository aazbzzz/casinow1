import { useState, useEffect } from 'react';
import { X, Users, Settings, ChevronRight, Copy, Check, Plus, Zap, Ticket, Trash2, Globe, Lock, Ban, ShieldCheck, Shield, Crown, Award, Eye, EyeOff, AlertTriangle, ChevronDown, FileCode, DollarSign } from 'lucide-react';
import { saveUser, resetAllData, type PromoCode, syncPromoCodeToCloud, isSupabaseConfigured, getAllUsers } from '@/lib/storage';
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
  onRefreshUser?: () => void;
  cheatOnlyMode?: boolean;
}

export function AdminPanel({ onClose, onUpdateBalance, promoCodes, onUpdatePromoCodes, user, onRefreshUser, cheatOnlyMode = false }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'cheats' | 'promo' | 'roles'>(cheatOnlyMode ? 'cheats' : 'users');
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editBalances, setEditBalances] = useState({ balance: 0, bankBalance: 0, vipLevel: 1 });
  const [addMoneyAmount, setAddMoneyAmount] = useState(1000);
  const [cheats, setCheats] = useState<CheatSettings>(getCheats(null));
  const [cheatTargetUserId, setCheatTargetUserId] = useState<string | null>(null);
  const [cheatCategory, setCheatCategory] = useState<'global' | 'roulette' | 'slots' | 'coinflip' | 'dice' | 'mines' | 'crash' | 'plinko'>('global');
  
  const [newPromo, setNewPromo] = useState({
    code: '',
    type: 'currency' as 'currency' | 'multiplier' | 'crypto' | 'cheat_access',
    value: 100,
    maxUses: 10,
    cryptoSymbol: 'BTC',
    isUnlimited: false,
    duration: 3600
  });

  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  const isAdmin = user.role === 'admin';
  const isMod = user.role === 'admin' || user.role === 'moderator';

  const fetchUsers = async () => {
    const users = await getAllUsers();
    setDbUsers(users);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (userId: string, newRole: 'admin' | 'moderator' | 'player' | 'cheat') => {
    const targetUser = dbUsers.find(u => u.id === userId);
    if (targetUser) {
      const updatedUser = { ...targetUser, role: newRole };
      if (newRole === 'cheat') updatedUser.hasCheatAccess = true;
      await saveUser(updatedUser);
      await fetchUsers();
      if (userId === user.id) onRefreshUser?.();
      if (enableHaptics) vibrate(100);
    }
  };

  const handleToggleAdminSetting = async (userId: string, setting: 'showBadge' | 'showModBadge' | 'hideFromLeaderboard') => {
    const targetUser = dbUsers.find(u => u.id === userId);
    if (targetUser) {
      const updatedUser = { ...targetUser, [setting]: !targetUser[setting] };
      await saveUser(updatedUser);
      await fetchUsers();
      if (userId === user.id) onRefreshUser?.();
      if (enableHaptics) vibrate(50);
    }
  };

  const handleCheatToggle = async (key: keyof CheatSettings, value: boolean | number | null | string) => {
    const newCheats = { ...cheats, [key]: value };
    setCheats(newCheats);
    
    if (cheatTargetUserId && isMod) {
      const targetUser = dbUsers.find(u => u.id === cheatTargetUserId);
      if (targetUser) {
        try {
          const updatedUser = { ...targetUser, cheats: newCheats };
          await saveUser(updatedUser);
        } catch (err) {
          console.error("[AdminPanel] Error saving targeted cheats:", err);
        }
      }
    } else {
      saveCheats(newCheats);
      if (user && user.id !== 'guest') {
        try {
          const updatedUser = { ...user, cheats: newCheats };
          await saveUser(updatedUser);
        } catch (err) {
          console.error("[AdminPanel] Error saving self cheats:", err);
        }
      }
    }
    if (enableHaptics) vibrate(50);
  };

  useEffect(() => {
    if (cheatTargetUserId) {
      const targetUser = dbUsers.find(u => u.id === cheatTargetUserId);
      if (targetUser) {
        setCheats(targetUser.cheats || getCheats(null));
      }
    } else {
      setCheats(getCheats(null));
    }
  }, [cheatTargetUserId, dbUsers]);

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md overflow-hidden">
      <div className="w-full max-w-6xl h-[90vh] bg-[#050505] rounded-[2.5rem] border-2 flex flex-col relative shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden" style={{ borderColor: `${primaryAccent}20` }}>
        <div className="p-8 border-b-2 flex items-center justify-between shrink-0" style={{ borderColor: `${primaryAccent}10` }}>
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl flex items-center justify-center border-2" style={{ borderColor: primaryAccent, backgroundColor: `${primaryAccent}10` }}>
              <Settings className="size-6" style={{ color: primaryAccent }} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Admin Control</h2>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full animate-pulse bg-green-500" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">System Online</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="size-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90">
            <X className="size-6 text-white" />
          </button>
        </div>

        <div className="flex gap-2 px-6 py-4 border-b-2 shrink-0 overflow-x-auto" style={{ borderColor: `${primaryAccent}20` }}>
          {[
            { key: 'users', label: 'User Database', icon: Users, show: !cheatOnlyMode },
            { key: 'cheats', label: 'Cheats', icon: Zap, show: true },
            { key: 'roles', label: 'User Role Management', icon: Shield, show: !cheatOnlyMode },
            { key: 'promo', label: 'Promo Code Creation', icon: Ticket, show: isAdmin },
          ].filter(tab => tab.show).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key as any);
                if (enableHaptics) vibrate(30);
              }}
              className="px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3 shrink-0"
              style={{
                backgroundColor: activeTab === key ? primaryAccent : 'transparent',
                color: activeTab === key ? '#000' : '#888',
                boxShadow: activeTab === key ? `0 0 30px ${primaryAccent}40` : 'none'
              }}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dbUsers.map((u) => (
                  <div key={u.id} className="p-6 rounded-[2rem] bg-black/40 border-2 transition-all hover:border-white/20" style={{ borderColor: `${primaryAccent}10` }}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center font-black text-xl text-white">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-white truncate flex items-center gap-2">
                          {u.username}
                          {u.role === 'admin' && <Crown className="size-3 text-yellow-500" />}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{u.id.slice(0, 8)}...</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Balance</div>
                        <div className="text-white font-black">${u.balance.toLocaleString()}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">VIP</div>
                        <div className="text-white font-black">Lvl {u.vipLevel}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCheatTargetUserId(u.id);
                          setActiveTab('cheats');
                          if (enableHaptics) vibrate(50);
                        }}
                        className="flex-1 py-3 rounded-xl bg-white/5 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 border border-white/10"
                      >
                        Control
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Ban user ${u.username}?`)) {
                            const updatedUser = { ...u, isBanned: !u.isBanned };
                            await saveUser(updatedUser);
                            await fetchUsers();
                          }
                        }}
                        className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${u.isBanned ? 'bg-red-500 text-white border-red-500' : 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20'}`}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Promo Code</label>
                    <input
                      type="text"
                      value={newPromo.code}
                      onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
                      style={{ borderColor: `${primaryAccent}40` }}
                      placeholder="WELCOME2024"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Reward Type</label>
                    <select
                      value={newPromo.type}
                      onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold appearance-none"
                      style={{ borderColor: `${primaryAccent}40` }}
                    >
                      <option value="currency">Credits (Money)</option>
                      <option value="multiplier">Win Multiplier (2x, 3x)</option>
                      <option value="crypto">Crypto Reward</option>
                      <option value="cheat_access">Cheat Menu Access</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Value</label>
                    <input
                      type="number"
                      value={newPromo.value}
                      onChange={(e) => setNewPromo({ ...newPromo, value: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
                      style={{ borderColor: `${primaryAccent}40` }}
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Usage Limit</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newPromo.maxUses}
                        onChange={(e) => setNewPromo({ ...newPromo, maxUses: Number(e.target.value) })}
                        className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold disabled:opacity-50"
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
                  {newPromo.type === 'crypto' && (
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Crypto Symbol</label>
                      <input
                        type="text"
                        value={newPromo.cryptoSymbol}
                        onChange={(e) => setNewPromo({ ...newPromo, cryptoSymbol: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
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
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
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
                      rewardText = `Cheat Menu Access (${newPromo.value} days)`;
                    }
                    
                    const codeObj: PromoCode = {
                      ...newPromo,
                      rewardText,
                      usedCount: 0,
                      isActive: true
                    } as PromoCode;
                    const updated = [...promoCodes, codeObj];
                    onUpdatePromoCodes(updated);
                    await syncPromoCodeToCloud(codeObj);
                    setNewPromo({ code: '', type: 'currency', value: 100, maxUses: 10, cryptoSymbol: 'BTC', isUnlimited: false, duration: 3600 });
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
                <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
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
                      className="px-4 py-2 rounded-xl font-bold transition-all active:scale-95 border-2 whitespace-nowrap"
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
                {cheatTargetUserId && (
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
                      <CheatToggle label="Instant Win" description="Win immediately on bet" value={cheats.instantWin} onChange={(v) => handleCheatToggle('instantWin', v)} />
                      <CheatToggle label="Instant Loss" description="Lose immediately on bet" value={cheats.instantLoss} onChange={(v) => handleCheatToggle('instantLoss', v)} />
                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Custom Multiplier</div>
                          <div className="text-sm text-gray-400">Set a fixed multiplier for all wins</div>
                        </div>
                        <input
                          type="number"
                          value={cheats.customMultiplier}
                          onChange={(e) => handleCheatToggle('customMultiplier', Math.max(1, Number(e.target.value)))}
                          className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
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
                    </>
                  )}

                  {cheatCategory === 'slots' && (
                    <>
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
                      <CheatToggle label="Auto Pick" description="Automatically pick safe tiles" value={cheats.minesAutoPick} onChange={(v) => handleCheatToggle('minesAutoPick', v)} />
                      <CheatToggle label="Predictive Path" description="Highlight a winning path" value={cheats.minesPredictivePath} onChange={(v) => handleCheatToggle('minesPredictivePath', v)} />
                    </>
                  )}

                  {cheatCategory === 'crash' && (
                    <>
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
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl border-2 bg-black/40" style={{ borderColor: `${primaryAccent}20` }}>
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                  <Shield className="size-6 text-yellow-500" />
                  User Roles & System Management
                </h3>
                
                {isAdmin && (
                  <div className="grid grid-cols-1 gap-4">
                    {dbUsers.map(u => (
                      <div key={u.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-xl bg-black flex items-center justify-center font-black text-lg" style={{ color: primaryAccent }}>
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-white flex items-center gap-2">
                              {u.username}
                              {u.role === 'admin' && <Crown className="size-3 text-yellow-500" />}
                            </div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">Role: {u.role}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {['player', 'moderator', 'admin', 'cheat'].map((r) => (
                            <button
                              key={r}
                              onClick={() => handleToggleRole(u.id, r as any)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${u.role === r ? 'bg-white/10 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                              style={u.role === r ? { color: r === 'admin' ? '#fbbf24' : r === 'moderator' ? '#60a5fa' : r === 'cheat' ? '#a78bfa' : '#fff' } : {}}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 rounded-3xl border-2 bg-black/40" style={{ borderColor: `${primaryAccent}20` }}>
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                  <Award className="size-6 text-yellow-500" />
                  My Personal Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleToggleAdminSetting(user.id, user.role === 'admin' ? 'showBadge' : 'showModBadge')}
                    className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${((user.role === 'admin' && user.showBadge) || (user.role === 'moderator' && user.showModBadge)) ? 'bg-yellow-500/20 border-yellow-500' : 'bg-white/5 border-white/10'}`}
                  >
                    <ShieldCheck className={`size-8 ${((user.role === 'admin' && user.showBadge) || (user.role === 'moderator' && user.showModBadge)) ? 'text-yellow-500' : 'text-gray-500'}`} />
                    <div className="text-center">
                      <div className="font-black text-white text-xs uppercase tracking-widest mb-1">Display {user.role === 'admin' ? 'Admin' : 'Modo'} Badge</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase">{((user.role === 'admin' && user.showBadge) || (user.role === 'moderator' && user.showModBadge)) ? 'VISIBLE' : 'HIDDEN'}</div>
                    </div>
                  </button>
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
