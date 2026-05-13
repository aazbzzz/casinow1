import { useState } from 'react';
import { X, Users, DollarSign, Settings, Code, ChevronRight, ChevronDown, Copy, Check, FileCode, Plus, Zap, Coins, FileText, AlertTriangle, Ticket, Trash2, Globe } from 'lucide-react';
import { fetchUser, saveUser, getTransactions, getGameHistory, resetAllData, getPromoCodes, savePromoCodes, getAllUsers, type PromoCode } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { vibrate } from '@aippy/runtime/device';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';
import { getCheats, saveCheats, type CheatSettings } from '@/lib/cheats';

// Import all files as strings to display them in the admin panel
// Components
import AppContent from '@/App.tsx?raw';
import MainContent from '@/main.tsx?raw';
import AdminPanelContent from '@/components/AdminPanel.tsx?raw';
import TopBarContent from '@/components/TopBar.tsx?raw';
import CasinoSectionContent from '@/components/casino/CasinoSection.tsx?raw';
import GameCardContent from '@/components/casino/GameCard.tsx?raw';
import CoinflipGameContent from '@/components/casino/games/CoinflipGame.tsx?raw';
import CrashGameContent from '@/components/casino/games/CrashGame.tsx?raw';
import DiceGameContent from '@/components/casino/games/DiceGame.tsx?raw';
import MinesGameContent from '@/components/casino/games/MinesGame.tsx?raw';
import PlinkoGameContent from '@/components/casino/games/PlinkoGame.tsx?raw';
import RouletteGameContent from '@/components/casino/games/RouletteGame.tsx?raw';
import SlotsGameContent from '@/components/casino/games/SlotsGame.tsx?raw';
import VIPSectionContent from '@/components/vip/VIPSection.tsx?raw';
import QuestsSectionContent from '@/components/quests/QuestsSection.tsx?raw';
import WalletSectionContent from '@/components/wallet/WalletSection.tsx?raw';
import SettingsSectionContent from '@/components/settings/SettingsSection.tsx?raw';

// Lib
import StorageContent from '@/lib/storage.ts?raw';
import VIPContent from '@/lib/vip.ts?raw';
import QuestsContent from '@/lib/quests.ts?raw';
import CheatsContent from '@/lib/cheats.ts?raw';
import UtilsContent from '@/lib/utils.ts?raw';

// Hooks
import UseGameStateContent from '@/hooks/useGameState.ts?raw';
import UseGameSoundsContent from '@/hooks/useGameSounds.ts?raw';
import UseDingSoundContent from '@/hooks/useDingSound.ts?raw';
import UseMobileContent from '@/hooks/use-mobile.ts?raw';

// Other
import TypesContent from '@/types/index.ts?raw';
import IndexCSSContent from '@/index.css?raw';
import ViteEnvContent from '@/vite-env.d.ts?raw';

const tweaks = aippyTweaks(tweaksConfig as any);

interface AdminPanelProps {
  onClose: () => void;
  onUpdateBalance?: (amount: number, type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss', game?: string) => void;
  promoCodes: PromoCode[];
  onUpdatePromoCodes: (codes: PromoCode[]) => void;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

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

const projectFiles: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      {
        name: 'components',
        type: 'folder',
        children: [
          { name: 'AdminPanel.tsx', type: 'file', content: AdminPanelContent },
          { name: 'TopBar.tsx', type: 'file', content: TopBarContent },
          {
            name: 'casino',
            type: 'folder',
            children: [
              { name: 'CasinoSection.tsx', type: 'file', content: CasinoSectionContent },
              { name: 'GameCard.tsx', type: 'file', content: GameCardContent },
              {
                name: 'games',
                type: 'folder',
                children: [
                  { name: 'CoinflipGame.tsx', type: 'file', content: CoinflipGameContent },
                  { name: 'CrashGame.tsx', type: 'file', content: CrashGameContent },
                  { name: 'DiceGame.tsx', type: 'file', content: DiceGameContent },
                  { name: 'MinesGame.tsx', type: 'file', content: MinesGameContent },
                  { name: 'PlinkoGame.tsx', type: 'file', content: PlinkoGameContent },
                  { name: 'RouletteGame.tsx', type: 'file', content: RouletteGameContent },
                  { name: 'SlotsGame.tsx', type: 'file', content: SlotsGameContent },
                ]
              }
            ]
          },
          {
            name: 'vip',
            type: 'folder',
            children: [
              { name: 'VIPSection.tsx', type: 'file', content: VIPSectionContent }
            ]
          },
          {
            name: 'quests',
            type: 'folder',
            children: [
              { name: 'QuestsSection.tsx', type: 'file', content: QuestsSectionContent }
            ]
          },
          {
            name: 'wallet',
            type: 'folder',
            children: [
              { name: 'WalletSection.tsx', type: 'file', content: WalletSectionContent }
            ]
          },
          {
            name: 'settings',
            type: 'folder',
            children: [
              { name: 'SettingsSection.tsx', type: 'file', content: SettingsSectionContent }
            ]
          }
        ]
      },
      {
        name: 'lib',
        type: 'folder',
        children: [
          { name: 'storage.ts', type: 'file', content: StorageContent },
          { name: 'vip.ts', type: 'file', content: VIPContent },
          { name: 'quests.ts', type: 'file', content: QuestsContent },
          { name: 'cheats.ts', type: 'file', content: CheatsContent },
          { name: 'utils.ts', type: 'file', content: UtilsContent },
        ]
      },
      {
        name: 'hooks',
        type: 'folder',
        children: [
          { name: 'useGameState.ts', type: 'file', content: UseGameStateContent },
          { name: 'useGameSounds.ts', type: 'file', content: UseGameSoundsContent },
          { name: 'useDingSound.ts', type: 'file', content: UseDingSoundContent },
          { name: 'use-mobile.ts', type: 'file', content: UseMobileContent },
        ]
      },
      {
        name: 'types',
        type: 'folder',
        children: [
          { name: 'index.ts', type: 'file', content: TypesContent }
        ]
      },
      {
        name: 'config',
        type: 'folder',
        children: [
          { name: 'tweaksConfig.json', type: 'file', content: JSON.stringify(tweaksConfig, null, 2) },
          { name: 'assets.json', type: 'file', content: '// Auto-generated asset URLs' },
          { name: 'assets.ts', type: 'file', content: '// Auto-generated asset exports' },
        ]
      },
      { name: 'App.tsx', type: 'file', content: AppContent },
      { name: 'main.tsx', type: 'file', content: MainContent },
      { name: 'index.css', type: 'file', content: IndexCSSContent },
      { name: 'vite-env.d.ts', type: 'file', content: ViteEnvContent },
    ]
  },
  { name: 'package.json', type: 'file', content: '// package.json - Project dependencies and scripts' },
  { name: 'tsconfig.json', type: 'file', content: '// tsconfig.json - TypeScript configuration' },
  { name: 'tsconfig.app.json', type: 'file', content: '// tsconfig.app.json - App-specific TS config' },
  { name: 'tailwind.config.ts', type: 'file', content: '// tailwind.config.ts - Tailwind CSS configuration' },
  { name: 'components.json', type: 'file', content: '// components.json - shadcn/ui configuration' },
  { name: 'index.html', type: 'file', content: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>VIP Casino</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>' },
  { name: 'spec.md', type: 'file', content: '// spec.md - Project specification' },
  { name: '.env', type: 'file', content: '// .env - Environment variables' },
];

export function AdminPanel({ onClose, onUpdateBalance, promoCodes, onUpdatePromoCodes }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'manage' | 'cheats' | 'promo' | 'files' | 'master' | 'reset'>('promo');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/components', 'src/components/casino', 'src/components/casino/games']));
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState(1000);
  const [cheats, setCheats] = useState<CheatSettings>(getCheats);
  const [cheatCategory, setCheatCategory] = useState<'global' | 'roulette' | 'slots' | 'coinflip' | 'dice' | 'mines' | 'crash' | 'plinko'>('global');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const [newPromo, setNewPromo] = useState<{
    code: string;
    type: PromoCode['type'];
    value: number;
    maxUses: number;
    cryptoSymbol: string;
    isUnlimited: boolean;
    duration: number;
  }>({
    code: '',
    type: 'currency',
    value: 100,
    maxUses: 10,
    cryptoSymbol: 'BTC',
    isUnlimited: false,
    duration: 3600
  });
  
  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  
  const user = getUser();
  const transactions = getTransactions();
  
  const handleCopyFile = (fileName: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(fileName);
    if (enableHaptics) vibrate(50);
    setTimeout(() => setCopiedFile(null), 2000);
  };
  
  const getAllFilesContent = (nodes: FileNode[], prefix = ''): string => {
    let result = '';
    nodes.forEach(node => {
      if (node.type === 'file') {
        result += `\n// ========================================\n// ${prefix}${node.name}\n// ========================================\n\n${node.content || ''}\n\n`;
      } else if (node.children) {
        result += getAllFilesContent(node.children, `${prefix}${node.name}/`);
      }
    });
    return result;
  };
  
  const handleCopyAll = () => {
    const allContent = getAllFilesContent(projectFiles);
    navigator.clipboard.writeText(allContent);
    setCopiedFile('all');
    if (enableHaptics) vibrate(200);
    setTimeout(() => setCopiedFile(null), 2000);
  };
  
  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };
  
  const handleAddMoney = () => {
    if (onUpdateBalance) {
      onUpdateBalance(addMoneyAmount, 'deposit', 'Admin Manual Deposit');
    } else {
      const currentUser = getUser();
      currentUser.balance += addMoneyAmount;
      saveUser(currentUser);
      window.location.reload();
    }
    if (enableHaptics) vibrate(200);
  };
  
  const handleCheatToggle = (key: keyof CheatSettings, value: boolean | number | null | string) => {
    const newCheats = { ...cheats, [key]: value };
    setCheats(newCheats);
    saveCheats(newCheats);
    if (enableHaptics) vibrate(50);
  };
  
  const handleResetData = () => {
    resetAllData();
    if (enableHaptics) vibrate([100, 50, 100]);
    window.location.reload();
  };

  const renderFileTree = (nodes: FileNode[], path = '') => {
    return nodes.map((node) => {
      const currentPath = path ? `${path}/${node.name}` : node.name;
      const isExpanded = expandedFolders.has(currentPath);
      const isSelected = selectedFile?.name === node.name;
      
      if (node.type === 'folder') {
        return (
          <div key={currentPath} className="mb-1">
            <button
              onClick={() => toggleFolder(currentPath)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all active:scale-95 text-left"
              style={{ backgroundColor: isExpanded ? `${primaryAccent}10` : 'transparent' }}
            >
              {isExpanded ? <ChevronDown className="size-4" style={{ color: primaryAccent }} /> : <ChevronRight className="size-4 text-gray-400" />}
              <span className="font-bold text-white">{node.name}/</span>
            </button>
            {isExpanded && node.children && (
              <div className="ml-6 mt-1 border-l-2 pl-2" style={{ borderColor: `${primaryAccent}20` }}>
                {renderFileTree(node.children, currentPath)}
              </div>
            )}
          </div>
        );
      }
      
      return (
        <button
          key={currentPath}
          onClick={() => {
            setSelectedFile(node);
            if (enableHaptics) vibrate(30);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all active:scale-95 text-left mb-1"
          style={{ 
            backgroundColor: isSelected ? `${primaryAccent}20` : 'transparent',
            borderLeft: isSelected ? `3px solid ${primaryAccent}` : 'none'
          }}
        >
          <FileCode className="size-4" style={{ color: isSelected ? primaryAccent : '#888' }} />
          <span className="text-sm font-semibold" style={{ color: isSelected ? primaryAccent : '#ccc' }}>{node.name}</span>
        </button>
      );
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md overflow-hidden">
      <div 
        className="w-full max-w-6xl h-[90vh] rounded-[2rem] border-2 bg-[#050505] flex flex-col overflow-hidden relative"
        style={{ borderColor: primaryAccent, boxShadow: `0 0 60px ${primaryAccent}40` }}
      >
        <div className="p-6 border-b-2 flex items-center justify-between shrink-0" style={{ borderColor: `${primaryAccent}20` }}>
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl flex items-center justify-center border-2" style={{ borderColor: primaryAccent, backgroundColor: `${primaryAccent}10` }}>
              <Code className="size-6" style={{ color: primaryAccent }} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Admin Panel</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest">System Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border-2"
            style={{ borderColor: `${primaryAccent}40`, backgroundColor: '#111' }}
          >
            <X className="size-5 text-white" />
          </button>
        </div>
        
        <div className="flex gap-2 px-6 py-4 border-b-2 shrink-0 overflow-x-auto" style={{ borderColor: `${primaryAccent}20` }}>
          {[
            { key: 'overview', label: 'Overview', icon: Settings },
            { key: 'users', label: 'Users', icon: Users },
            { key: 'transactions', label: 'Transactions', icon: DollarSign },
            { key: 'manage', label: 'Manage', icon: Plus },
            { key: 'promo', label: 'Promo Codes', icon: Ticket },
            { key: 'cheats', label: 'Cheats', icon: Zap },
            { key: 'files', label: 'Files', icon: Code },
            { key: 'master', label: 'Master Script', icon: FileText },
            { key: 'reset', label: 'Reset System', icon: AlertTriangle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key as typeof activeTab);
                if (enableHaptics) vibrate(30);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all active:scale-95 border-2 whitespace-nowrap"
              style={{
                backgroundColor: activeTab === key ? primaryAccent : 'transparent',
                color: activeTab === key ? '#000' : '#fff',
                borderColor: activeTab === key ? primaryAccent : `${primaryAccent}20`,
              }}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 rounded-3xl border-2 shadow-2xl transition-all hover:scale-[1.02]" style={{ backgroundColor: '#0c0c0c', borderColor: `${primaryAccent}40`, boxShadow: `0 0 40px ${primaryAccent}15` }}>
                <div className="text-sm font-black text-gray-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="size-8 rounded-lg flex items-center justify-center border" style={{ borderColor: primaryAccent, backgroundColor: `${primaryAccent}10` }}>
                    <Coins className="size-5" style={{ color: primaryAccent }} />
                  </div>
                  Balance
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white tracking-tighter">{user.balance.toFixed(2)}</span>
                  <span className="text-xl font-bold opacity-50 uppercase" style={{ color: primaryAccent }}>Credits</span>
                </div>
              </div>

              <div className="p-8 rounded-3xl border-2 shadow-2xl transition-all hover:scale-[1.02]" style={{ backgroundColor: '#0c0c0c', borderColor: `${primaryAccent}40`, boxShadow: `0 0 40px ${primaryAccent}15` }}>
                <div className="text-sm font-black text-gray-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="size-8 rounded-lg flex items-center justify-center border" style={{ borderColor: primaryAccent, backgroundColor: `${primaryAccent}10` }}>
                    <Users className="size-5" style={{ color: primaryAccent }} />
                  </div>
                  VIP Level
                </div>
                <div className="text-5xl font-black tracking-tighter" style={{ color: primaryAccent }}>{user.vipLevel}</div>
              </div>

              <div className="p-8 rounded-3xl border-2 shadow-2xl transition-all hover:scale-[1.02]" style={{ backgroundColor: '#0c0c0c', borderColor: `${primaryAccent}40`, boxShadow: `0 0 40px ${primaryAccent}15` }}>
                <div className="text-sm font-black text-gray-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="size-8 rounded-lg flex items-center justify-center border" style={{ borderColor: primaryAccent, backgroundColor: `${primaryAccent}10` }}>
                    <Zap className="size-5" style={{ color: primaryAccent }} />
                  </div>
                  Total Wagered
                </div>
                <div className="text-5xl font-black text-white tracking-tighter">{user.totalWagered.toFixed(0)}</div>
              </div>
            </div>
          )}
          
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-white mb-4">Users Database ({getAllUsers().length})</h3>
              <div className="grid grid-cols-1 gap-3">
                {getAllUsers().map((u) => (
                  <div 
                    key={u.id} 
                    className={`p-6 rounded-2xl border-2 transition-all ${u.id === user.id ? 'border-white/30 bg-white/5' : 'border-white/5 bg-[#0a0a0a]'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-white/5 flex items-center justify-center font-black text-xl" style={{ color: primaryAccent }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-white text-lg">{u.username} {u.id === user.id && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded ml-2 uppercase tracking-widest text-gray-400">You</span>}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">ID: {u.id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-white italic">{u.balance.toLocaleString()}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: primaryAccent }}>Credits</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="text-center p-3 rounded-xl bg-black/30">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">VIP Level</div>
                        <div className="font-black text-white">{u.vipLevel}</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-black/30">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Created</div>
                        <div className="font-bold text-white text-xs">{new Date(u.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              {transactions.slice(0, 20).map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-xl border-2 flex items-center justify-between"
                  style={{ backgroundColor: '#0a0a0a', borderColor: `${primaryAccent}20` }}
                >
                  <div>
                    <div className="font-bold text-white">{tx.type}</div>
                    <div className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleString()}</div>
                  </div>
                  <div className={`font-black text-lg ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border-2" style={{ backgroundColor: '#0a0a0a', borderColor: `${primaryAccent}20` }}>
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                  <Plus className="size-6" style={{ color: primaryAccent }} />
                  Add Credits
                </h3>
                <div className="flex gap-4">
                  <input
                    type="number"
                    value={addMoneyAmount}
                    onChange={(e) => setAddMoneyAmount(Number(e.target.value))}
                    className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
                    style={{ borderColor: `${primaryAccent}40` }}
                    placeholder="1000"
                  />
                  <button
                    onClick={handleAddMoney}
                    className="px-8 py-3 rounded-xl font-black text-black transition-all active:scale-95"
                    style={{ backgroundColor: primaryAccent }}
                  >
                    ADD
                  </button>
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Code (unique)</label>
                    <input
                      type="text"
                      value={newPromo.code}
                      onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
                      style={{ borderColor: `${primaryAccent}40` }}
                      placeholder="WELCOME50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Reward Type</label>
                    <select
                      value={newPromo.type}
                      onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value as PromoCode['type'] })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
                      style={{ borderColor: `${primaryAccent}40` }}
                    >
                      <option value="currency">Credits (Money)</option>
                      <option value="multiplier">Win Multiplier (2x, 3x)</option>
                      <option value="crypto">Crypto Reward</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Value (Amount/Mult)</label>
                    <input
                      type="number"
                      value={newPromo.value}
                      onChange={(e) => setNewPromo({ ...newPromo, value: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
                      style={{ borderColor: `${primaryAccent}40` }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase mb-2 block">Max Global Uses</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newPromo.maxUses}
                        onChange={(e) => setNewPromo({ ...newPromo, maxUses: Number(e.target.value) })}
                        disabled={newPromo.isUnlimited}
                        className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold disabled:opacity-50"
                        style={{ borderColor: `${primaryAccent}40` }}
                      />
                      <button
                        onClick={() => setNewPromo({ ...newPromo, isUnlimited: !newPromo.isUnlimited })}
                        className="px-4 py-3 rounded-xl font-bold transition-all active:scale-95 border-2 whitespace-nowrap"
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
                  onClick={() => {
                    if (!newPromo.code) return;
                    let rewardText = '';
                    if (newPromo.type === 'currency') {
                      rewardText = `${newPromo.value} Credits`;
                    } else if (newPromo.type === 'multiplier') {
                      const h = Math.floor(newPromo.duration / 3600);
                      const m = Math.floor((newPromo.duration % 3600) / 60);
                      const s = newPromo.duration % 60;
                      const timeStr = h > 0 ? `${h}h ` : m > 0 ? `${m}m ` : `${s}s`;
                      rewardText = `${newPromo.value}x Multiplier (${timeStr})`;
                    } else if (newPromo.type === 'crypto') {
                      rewardText = `${newPromo.value} ${newPromo.cryptoSymbol}`;
                    }
                    
                    const codeObj: PromoCode = {
                      ...newPromo,
                      rewardText,
                      usedCount: 0,
                      isActive: true
                    };
                    const updated = [...promoCodes, codeObj];
                    onUpdatePromoCodes(updated);
                    
                    // Global Sync to Supabase
                    const isSupabaseConfigured = (supabase as any).supabaseUrl && !(supabase as any).supabaseUrl.includes('VOTRE_PROJET');
                    if (isSupabaseConfigured) {
                      await supabase.from('promo_codes').upsert({
                        code: codeObj.code,
                        type: codeObj.type,
                        value: codeObj.value,
                        duration: codeObj.duration,
                        reward_text: codeObj.rewardText,
                        max_uses: codeObj.maxUses,
                        used_count: codeObj.usedCount,
                        crypto_symbol: codeObj.cryptoSymbol,
                        is_active: codeObj.isActive,
                        is_unlimited: codeObj.isUnlimited,
                      });
                    }
                    
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
                              const updated = promoCodes.map(c => c.code === code.code ? { ...c, isActive: !c.isActive } : c);
                              onUpdatePromoCodes(updated);
                              
                              const isSupabaseConfigured = (supabase as any).supabaseUrl && !(supabase as any).supabaseUrl.includes('VOTRE_PROJET');
                              if (isSupabaseConfigured) {
                                await supabase.from('promo_codes').update({ is_active: !code.isActive }).eq('code', code.code);
                              }
                              
                              if (enableHaptics) vibrate(50);
                            }}
                            title={code.isActive ? "Deactivate" : "Activate"}
                            className={`size-10 rounded-lg flex items-center justify-center transition-all active:scale-95 border-2 ${code.isActive ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-gray-500/20 border-gray-500 text-gray-500'}`}
                          >
                            {code.isActive ? '✓' : '✗'}
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm(`Delete code ${code.code}?`)) {
                                const updated = promoCodes.filter(c => c.code !== code.code);
                                onUpdatePromoCodes(updated);
                                
                                const isSupabaseConfigured = (supabase as any).supabaseUrl && !(supabase as any).supabaseUrl.includes('VOTRE_PROJET');
                                if (isSupabaseConfigured) {
                                  await supabase.from('promo_codes').delete().eq('code', code.code);
                                }
                                
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
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {[
                  { key: 'global', label: '🌐 Global', count: 10 },
                  { key: 'roulette', label: '🎡 Roulette', count: 5 },
                  { key: 'slots', label: '🎰 Slots', count: 3 },
                  { key: 'coinflip', label: '🪙 Coinflip', count: 2 },
                  { key: 'dice', label: '🎲 Dice', count: 3 },
                  { key: 'mines', label: '💣 Mines', count: 4 },
                  { key: 'crash', label: '🚀 Crash', count: 4 },
                  { key: 'plinko', label: '🎯 Plinko', count: 3 },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setCheatCategory(key as typeof cheatCategory);
                      if (enableHaptics) vibrate(30);
                    }}
                    className="px-4 py-2 rounded-xl font-bold transition-all active:scale-95 border-2 whitespace-nowrap"
                    style={{
                      backgroundColor: cheatCategory === key ? primaryAccent : 'transparent',
                      color: cheatCategory === key ? '#000' : '#fff',
                      borderColor: cheatCategory === key ? primaryAccent : `${primaryAccent}20`,
                    }}
                  >
                    {label} ({count})
                  </button>
                ))}
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
                      <CheatToggle label="Auto Play" description="Automatically play games" value={cheats.autoPlay} onChange={(v) => handleCheatToggle('autoPlay', v)} />
                      <CheatToggle label="Max Bet Override" description="Remove bet limits" value={cheats.maxBetOverride} onChange={(v) => handleCheatToggle('maxBetOverride', v)} />
                      
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
                          max="1000"
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
                            min="0"
                            max="36"
                          />
                          <button
                            onClick={() => handleCheatToggle('forceRouletteNumber', null)}
                            className="px-4 py-3 rounded-xl font-bold transition-all active:scale-95 bg-red-500/20 border-2 border-red-500 text-white"
                          >
                            OFF
                          </button>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Force Color</div>
                          <div className="text-sm text-gray-400">Choose winning color</div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { key: 'red', label: 'Red', color: '#FF0000' },
                            { key: 'black', label: 'Black', color: '#000000' },
                            { key: 'green', label: 'Green', color: '#00FF00' },
                          ].map(({ key, label, color }) => (
                            <button
                              key={key}
                              onClick={() => handleCheatToggle('forceRouletteColor', cheats.forceRouletteColor === key ? null : key as 'red' | 'black' | 'green')}
                              className={`py-3 rounded-lg font-bold transition-all active:scale-95 border-2 ${cheats.forceRouletteColor === key ? 'border-white' : 'border-gray-700'}`}
                              style={{ backgroundColor: color, color: key === 'black' ? '#fff' : '#000' }}
                            >
                              {label}
                            </button>
                          ))}
                          <button
                            onClick={() => handleCheatToggle('forceRouletteColor', null)}
                            className="py-3 rounded-lg text-xs font-bold transition-all active:scale-95 border-2 bg-red-500/20 border-red-500 text-white"
                          >
                            OFF
                          </button>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Force Parity</div>
                          <div className="text-sm text-gray-400">Choose even or odd</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleCheatToggle('forceRouletteParity', cheats.forceRouletteParity === 'even' ? null : 'even')}
                            className={`py-3 rounded-lg font-bold transition-all active:scale-95 border-2 ${cheats.forceRouletteParity === 'even' ? 'bg-green-500/20 border-green-500' : 'bg-black/50 border-gray-700'} text-white`}
                          >
                            Even
                          </button>
                          <button
                            onClick={() => handleCheatToggle('forceRouletteParity', cheats.forceRouletteParity === 'odd' ? null : 'odd')}
                            className={`py-3 rounded-lg font-bold transition-all active:scale-95 border-2 ${cheats.forceRouletteParity === 'odd' ? 'bg-green-500/20 border-green-500' : 'bg-black/50 border-gray-700'} text-white`}
                          >
                            Odd
                          </button>
                          <button
                            onClick={() => handleCheatToggle('forceRouletteParity', null)}
                            className="py-3 rounded-lg text-xs font-bold transition-all active:scale-95 border-2 bg-red-500/20 border-red-500 text-white"
                          >
                            OFF
                          </button>
                        </div>
                      </div>

                      <CheatToggle label="Next Spin Prediction" description="Show next result before spin" value={cheats.rouletteNextPrediction} onChange={(v) => handleCheatToggle('rouletteNextPrediction', v)} />
                      <CheatToggle label="Instant Payout" description="Win without spinning" value={cheats.rouletteInstantPayout} onChange={(v) => handleCheatToggle('rouletteInstantPayout', v)} />
                    </>
                  )}

                  {cheatCategory === 'slots' && (
                    <>
                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Force Symbol</div>
                          <div className="text-sm text-gray-400">Choose winning symbol</div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '⭐'].map(symbol => (
                            <button
                              key={symbol}
                              onClick={() => handleCheatToggle('forceSlotsSymbol', cheats.forceSlotsSymbol === symbol ? null : symbol)}
                              className={`py-3 rounded-lg text-2xl transition-all active:scale-95 border-2 ${cheats.forceSlotsSymbol === symbol ? 'bg-green-500/20 border-green-500' : 'bg-black/50 border-gray-700'}`}
                            >
                              {symbol}
                            </button>
                          ))}
                          <button
                            onClick={() => handleCheatToggle('forceSlotsSymbol', null)}
                            className="py-3 rounded-lg text-xs font-bold transition-all active:scale-95 border-2 bg-red-500/20 border-red-500 text-white"
                          >
                            OFF
                          </button>
                        </div>
                      </div>
                      <CheatToggle label="Always Jackpot" description="Always get highest symbol" value={cheats.slotsAlwaysJackpot} onChange={(v) => handleCheatToggle('slotsAlwaysJackpot', v)} />
                      <CheatToggle label="No Loss" description="Never lose on slots" value={cheats.slotsNoLoss} onChange={(v) => handleCheatToggle('slotsNoLoss', v)} />
                    </>
                  )}

                  {cheatCategory === 'coinflip' && (
                    <>
                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Force Side</div>
                          <div className="text-sm text-gray-400">Choose winning side</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleCheatToggle('forceCoinflipSide', cheats.forceCoinflipSide === 'heads' ? null : 'heads')}
                            className={`py-3 rounded-lg font-bold transition-all active:scale-95 border-2 ${cheats.forceCoinflipSide === 'heads' ? 'bg-green-500/20 border-green-500' : 'bg-black/50 border-gray-700'} text-white`}
                          >
                            👑 Heads
                          </button>
                          <button
                            onClick={() => handleCheatToggle('forceCoinflipSide', cheats.forceCoinflipSide === 'tails' ? null : 'tails')}
                            className={`py-3 rounded-lg font-bold transition-all active:scale-95 border-2 ${cheats.forceCoinflipSide === 'tails' ? 'bg-green-500/20 border-green-500' : 'bg-black/50 border-gray-700'} text-white`}
                          >
                            ⚡ Tails
                          </button>
                          <button
                            onClick={() => handleCheatToggle('forceCoinflipSide', null)}
                            className="py-3 rounded-lg text-xs font-bold transition-all active:scale-95 border-2 bg-red-500/20 border-red-500 text-white"
                          >
                            OFF
                          </button>
                        </div>
                      </div>
                      <CheatToggle label="Always Double" description="Always win 2x" value={cheats.coinflipAlwaysDouble} onChange={(v) => handleCheatToggle('coinflipAlwaysDouble', v)} />
                    </>
                  )}

                  {cheatCategory === 'dice' && (
                    <>
                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Force Result</div>
                          <div className="text-sm text-gray-400">Choose dice result (1-100)</div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={cheats.forceDiceResult ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Math.max(1, Math.min(100, Number(e.target.value)));
                              handleCheatToggle('forceDiceResult', val);
                            }}
                            placeholder="1-100"
                            className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
                            style={{ borderColor: `${primaryAccent}60` }}
                            min="1"
                            max="100"
                          />
                          <button
                            onClick={() => handleCheatToggle('forceDiceResult', null)}
                            className="px-4 py-3 rounded-xl font-bold transition-all active:scale-95 bg-red-500/20 border-2 border-red-500 text-white"
                          >
                            OFF
                          </button>
                        </div>
                      </div>
                      <CheatToggle label="Always Win" description="Always win dice rolls" value={cheats.diceAlwaysWin} onChange={(v) => handleCheatToggle('diceAlwaysWin', v)} />
                      <CheatToggle label="Max Multiplier" description="Always get highest multiplier" value={cheats.diceMaxMultiplier} onChange={(v) => handleCheatToggle('diceMaxMultiplier', v)} />
                    </>
                  )}

                  {cheatCategory === 'mines' && (
                    <>
                      <CheatToggle label="Safe Tiles" description="No mines can explode" value={cheats.forceMinesSafe} onChange={(v) => handleCheatToggle('forceMinesSafe', v)} />
                      <CheatToggle label="Reveal All" description="Show all mine positions" value={cheats.minesRevealAll} onChange={(v) => handleCheatToggle('minesRevealAll', v)} />
                      <CheatToggle label="Instant Win" description="Win immediately" value={cheats.minesInstantWin} onChange={(v) => handleCheatToggle('minesInstantWin', v)} />
                      <CheatToggle label="Max Multiplier" description="Always get highest multiplier" value={cheats.minesMaxMultiplier} onChange={(v) => handleCheatToggle('minesMaxMultiplier', v)} />
                    </>
                  )}

                  {cheatCategory === 'crash' && (
                    <>
                      <div className="p-4 rounded-xl bg-black/30">
                        <div className="mb-3">
                          <div className="font-bold text-white">Force Multiplier</div>
                          <div className="text-sm text-gray-400">Set crash point (min 1.1)</div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={cheats.forceCrashMultiplier ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Math.max(1.1, Number(e.target.value));
                              handleCheatToggle('forceCrashMultiplier', val);
                            }}
                            placeholder="1.1+"
                            className="flex-1 px-4 py-3 rounded-xl bg-black/50 border-2 text-white font-bold"
                            style={{ borderColor: `${primaryAccent}60` }}
                            min="1.1"
                            step="0.1"
                          />
                          <button
                            onClick={() => handleCheatToggle('forceCrashMultiplier', null)}
                            className="px-4 py-3 rounded-xl font-bold transition-all active:scale-95 bg-red-500/20 border-2 border-red-500 text-white"
                          >
                            OFF
                          </button>
                        </div>
                      </div>
                      <CheatToggle label="Never Crash" description="Multiplier never crashes" value={cheats.crashNeverCrash} onChange={(v) => handleCheatToggle('crashNeverCrash', v)} />
                      <CheatToggle label="Instant Cashout" description="Cashout at any time" value={cheats.crashInstantCashout} onChange={(v) => handleCheatToggle('crashInstantCashout', v)} />
                      <CheatToggle label="Max Multiplier" description="Always crash at 100x" value={cheats.crashMaxMultiplier} onChange={(v) => handleCheatToggle('crashMaxMultiplier', v)} />
                    </>
                  )}

                  {cheatCategory === 'plinko' && (
                    <>
                      <CheatToggle label="Force Big Win" description="Always lands in x4+ slot" value={cheats.forcePlinkoWin} onChange={(v) => handleCheatToggle('forcePlinkoWin', v)} />
                      <CheatToggle label="Always Center" description="Ball always lands in center" value={cheats.plinkoAlwaysCenter} onChange={(v) => handleCheatToggle('plinkoAlwaysCenter', v)} />
                      <CheatToggle label="Max Multiplier" description="Always land in 16x slot" value={cheats.plinkoMaxMultiplier} onChange={(v) => handleCheatToggle('plinkoMaxMultiplier', v)} />
                    </>
                  )}

                  <div className="p-4 rounded-xl border-2 border-yellow-500/20 bg-yellow-500/5 flex items-start gap-3">
                    <AlertTriangle className="size-5 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-yellow-500 font-bold mb-1">⚠️ Warning</div>
                      <div className="text-xs text-gray-400">
                        Cheats are stored locally and persist between sessions. 
                        Disable them to return to normal gameplay. Total: 34 cheat options available.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'files' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              <div className="p-4 rounded-2xl border-2 overflow-y-auto" style={{ backgroundColor: '#0a0a0a', borderColor: `${primaryAccent}20` }}>
                <h3 className="text-lg font-black text-white mb-4 sticky top-0 bg-[#0a0a0f] pb-2 z-10">Project Structure</h3>
                {renderFileTree(projectFiles)}
              </div>
              
              <div className="p-4 rounded-2xl border-2 overflow-y-auto flex flex-col" style={{ backgroundColor: '#0a0a0a', borderColor: `${primaryAccent}20` }}>
                {selectedFile ? (
                  <>
                    <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#0a0a0f] pb-2 z-10">
                      <h3 className="text-lg font-black text-white">{selectedFile.name}</h3>
                      <button
                        onClick={() => handleCopyFile(selectedFile.name, selectedFile.content || '')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all active:scale-95 shrink-0"
                        style={{ backgroundColor: copiedFile === selectedFile.name ? '#22c55e' : primaryAccent, color: '#000' }}
                      >
                        {copiedFile === selectedFile.name ? <Check className="size-4" /> : <Copy className="size-4" />}
                        {copiedFile === selectedFile.name ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-xs text-gray-300 font-mono whitespace-pre overflow-x-auto bg-black/50 p-4 rounded-xl border border-gray-800 flex-1">
                      {selectedFile.content}
                    </pre>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <FileCode className="size-16 mx-auto mb-4 opacity-20" />
                      <p className="font-semibold">Select a file to view its content</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'master' && (
            <div className="p-6 rounded-2xl border-2" style={{ backgroundColor: '#0a0a0a', borderColor: `${primaryAccent}20` }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-white mb-2">Master Script</h3>
                  <p className="text-sm text-gray-400">All project files combined in one script</p>
                </div>
                <button
                  onClick={handleCopyAll}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all active:scale-95"
                  style={{ backgroundColor: copiedFile === 'all' ? '#22c55e' : primaryAccent, color: '#000' }}
                >
                  {copiedFile === 'all' ? <Check className="size-5" /> : <Copy className="size-5" />}
                  {copiedFile === 'all' ? 'Copied All!' : 'Copy All'}
                </button>
              </div>
              <pre className="text-xs text-gray-300 font-mono whitespace-pre overflow-x-auto bg-black/50 p-6 rounded-xl border border-gray-800 max-h-[60vh] overflow-y-auto">
                {getAllFilesContent(projectFiles)}
              </pre>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="p-12 rounded-[2.5rem] border-4 border-red-600/30 bg-red-600/5 flex flex-col items-center text-center">
              <div className="size-24 rounded-full bg-red-600 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(220,38,38,0.5)]">
                <AlertTriangle className="size-12 text-white" />
              </div>
              <h3 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter italic">Danger Zone</h3>
              <p className="text-gray-400 max-w-md mb-10 font-bold leading-relaxed">
                Executing a system reset will permanently delete all user balances, transaction history, crypto portfolios, and progress. This action is irreversible.
              </p>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-12 py-5 rounded-2xl bg-red-600 text-white font-black text-xl uppercase tracking-widest transition-all active:scale-95 shadow-[0_10px_40px_rgba(220,38,38,0.4)]"
              >
                Reset All Project Data
              </button>
            </div>
          )}
        </div>

        {showResetConfirm && (
          <div className="absolute inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#050505] border-2 border-red-600 rounded-[2.5rem] p-10 text-center shadow-[0_0_100px_rgba(220,38,38,0.3)]">
              <div className="size-20 rounded-full bg-red-600 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="size-10 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-4 uppercase italic">Are you sure?</h3>
              <p className="text-gray-400 mb-10 font-bold leading-relaxed">
                This will wipe EVERYTHING. You will lose your balance, history, and all progress. This cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleResetData}
                  className="py-5 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_5px_20px_rgba(220,38,38,0.4)]"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="py-5 rounded-2xl bg-white/5 text-gray-400 font-bold uppercase tracking-widest transition-all active:scale-95 border-2 border-white/10"
                >
                  No, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}