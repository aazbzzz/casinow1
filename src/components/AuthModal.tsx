import { useState } from 'react';
import { User, Shield, UserPlus, LogIn, UserCircle, AlertCircle, Sparkles } from 'lucide-react';
import { getAllUsers, saveUser, type User as UserType } from '@/lib/storage';
import { vibrate } from '@aippy/runtime/device';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig as any);

interface AuthModalProps {
  onAuthComplete: (user: UserType) => void;
}

export function AuthModal({ onAuthComplete }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'guest'>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const primaryAccent = tweaks.primaryAccent.useState();
  const enableHaptics = tweaks.enableHaptics.useState();

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const users = getAllUsers();

    if (mode === 'signup') {
      if (!username || !password) {
        setError('Veuillez remplir tous les champs');
        return;
      }
      if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        setError('Ce pseudo est déjà utilisé');
        return;
      }

      const newUser: UserType = {
        id: crypto.randomUUID(),
        username,
        password, // In a real app, this would be hashed
        isGuest: false,
        balance: 1000,
        bankBalance: 0,
        vipLevel: 1,
        totalWagered: 0,
        createdAt: new Date().toISOString(),
        hasDeposited: false,
      };

      saveUser(newUser);
      if (enableHaptics) vibrate(100);
      onAuthComplete(newUser);
    } else if (mode === 'login') {
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
      if (!user) {
        setError('Pseudo ou mot de passe incorrect');
        if (enableHaptics) vibrate([50, 50]);
        return;
      }
      if (enableHaptics) vibrate(50);
      onAuthComplete(user);
    }
  };

  const handleGuest = () => {
    const randomId = Math.floor(Math.random() * 900000) + 100000;
    const guestUser: UserType = {
      id: crypto.randomUUID(),
      username: `player-${randomId}`,
      isGuest: true,
      balance: 1000,
      bankBalance: 0,
      vipLevel: 1,
      totalWagered: 0,
      createdAt: new Date().toISOString(),
      hasDeposited: false,
    };
    saveUser(guestUser);
    if (enableHaptics) vibrate(100);
    onAuthComplete(guestUser);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <div 
        className="w-full max-w-md bg-[#0a0a0c] border-2 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
        style={{ borderColor: primaryAccent, boxShadow: `0 0 80px ${primaryAccent}20` }}
      >
        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -right-24 size-48 rounded-full blur-[100px] opacity-20" style={{ backgroundColor: primaryAccent }} />
        <div className="absolute -bottom-24 -left-24 size-48 rounded-full blur-[100px] opacity-10" style={{ backgroundColor: primaryAccent }} />

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div 
              className="size-20 rounded-3xl flex items-center justify-center border-2 rotate-3 hover:rotate-0 transition-transform duration-500"
              style={{ borderColor: primaryAccent, backgroundColor: `${primaryAccent}10` }}
            >
              <Sparkles className="size-10" style={{ color: primaryAccent }} />
            </div>
          </div>

          <h2 className="text-3xl font-black text-white text-center mb-2 uppercase tracking-tighter italic">
            {mode === 'signup' ? 'Créer un compte' : mode === 'login' ? 'Connexion' : 'Jouer en Invité'}
          </h2>
          <p className="text-xs text-gray-500 text-center mb-8 uppercase tracking-[0.2em] font-bold">
            {mode === 'signup' ? 'Rejoignez l\'élite du casino' : mode === 'login' ? 'Bon retour parmi nous' : 'Accès rapide sans inscription'}
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="size-5 text-red-500 shrink-0" />
              <p className="text-red-500 text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-2xl border border-white/5">
            {[
              { id: 'signup', label: 'Inscription', icon: UserPlus },
              { id: 'login', label: 'Login', icon: LogIn },
              { id: 'guest', label: 'Invité', icon: UserCircle },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id as any);
                  setError('');
                  if (enableHaptics) vibrate(30);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                  mode === m.id ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                }`}
                style={{ color: mode === m.id ? primaryAccent : undefined }}
              >
                <m.icon className="size-4" />
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'guest' ? (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-center">
                <p className="text-gray-400 text-sm mb-4">
                  En mode invité, votre progression est sauvegardée sur cet appareil uniquement. Créez un compte pour synchroniser vos données.
                </p>
                <div className="text-2xl font-black text-white italic opacity-50 tracking-widest">
                  player-XXXXXX
                </div>
              </div>
              <button
                onClick={handleGuest}
                className="w-full py-4 rounded-2xl font-black text-black transition-all active:scale-95 shadow-xl hover:brightness-110"
                style={{ backgroundColor: primaryAccent }}
              >
                COMMENCER À JOUER
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-white/20 transition-all placeholder:text-white/10"
                  placeholder="EX: HIGHROLLER777"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-white/20 transition-all placeholder:text-white/10"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 mt-4 rounded-2xl font-black text-black transition-all active:scale-95 shadow-xl hover:brightness-110"
                style={{ backgroundColor: primaryAccent }}
              >
                {mode === 'signup' ? 'CRÉER MON COMPTE' : 'SE CONNECTER'}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2">
            <Shield className="size-4 text-gray-600" />
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Système de progression sécurisé</span>
          </div>
        </div>
      </div>
    </div>
  );
}
