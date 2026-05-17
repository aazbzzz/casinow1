import { useState, useEffect } from 'react';
import { Settings, Volume2, Vibrate, Trash2, Globe, AlertTriangle, Ticket, CheckCircle2, XCircle, Gift, X, Zap, ChevronRight, Crown, Shield, ShieldCheck } from 'lucide-react';
import { resetAllData, getPromoCodes, savePromoCodes, getUser, saveUser, addTransaction, syncPromoCodeToCloud, fetchUser } from '@/lib/storage';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import { supabase } from '@/lib/supabase';
import { vibrate } from '@aippy/runtime/device';
import { sendEvent } from '@aippy/runtime/leaderboard';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig as any);

const translations = {
  fr: {
    title: '⚙️ Réglages',
    sounds: 'Sons',
    soundsDesc: 'Effets sonores du jeu',
    vibrations: 'Vibrations',
    vibrationsDesc: 'Retours haptiques',
    language: 'Langue',
    languageDesc: 'Sélectionner la langue',
    promo: 'Code Promo',
    promoDesc: 'Utiliser un code promo',
    promoPlaceholder: 'ENTRER CODE',
    promoApply: 'Appliquer',
    promoSuccess: 'Code appliqué avec succès !',
    promoError: 'Code invalide.',
    promoErrorUsed: 'Code déjà utilisé.',
    promoErrorInactive: 'Code inactif.',
    promoErrorLimit: 'Limite d\'utilisation atteinte.',
    version: 'Version',
    versionText: 'Casino v1.0.0',
    logout: 'Déconnexion',
  },
  de: {
    title: '⚙️ Einstellungen',
    sounds: 'Töne',
    soundsDesc: 'Spielsoundeffekte',
    vibrations: 'Vibrationen',
    vibrationsDesc: 'Haptisches Feedback',
    language: 'Sprache',
    languageDesc: 'Sprache auswählen',
    promo: 'Aktionscode',
    promoDesc: 'Einen Code einlösen',
    promoPlaceholder: 'CODE EINGEBEN',
    promoApply: 'Einlösen',
    promoSuccess: 'Code erfolgreich eingelöst!',
    promoError: 'Ungültiger Code.',
    promoErrorUsed: 'Code bereits verwendet.',
    promoErrorInactive: 'Code inaktiv.',
    promoErrorLimit: 'Nutzungslimit erreicht.',
    version: 'Version',
    versionText: 'Casino v1.0.0',
    logout: 'Abmelden',
  },
  en: {
    title: '⚙️ Settings',
    sounds: 'Sounds',
    soundsDesc: 'Game sound effects',
    vibrations: 'Vibrations',
    vibrationsDesc: 'Haptic feedback',
    language: 'Language',
    languageDesc: 'Select language',
    promo: 'Promo Code',
    promoDesc: 'Redeem a promo code',
    promoPlaceholder: 'ENTER CODE',
    promoApply: 'Redeem',
    promoSuccess: 'Code applied successfully!',
    promoError: 'Invalid code.',
    promoErrorUsed: 'Code already used.',
    promoErrorInactive: 'Code inactive.',
    promoErrorLimit: 'Usage limit reached.',
    version: 'Version',
    versionText: 'Casino v1.0.0',
    logout: 'Log Out',
  },
};

export function SettingsSection({ user, onRewardClaimed, promoCodes, onUpdatePromoCodes, onLogout, onUpdateBalance, onShowCheatMenu }: { 
  user: any,
  onRewardClaimed?: (updatedUser?: any) => void,
  promoCodes: any[],
  onUpdatePromoCodes: (codes: any[]) => void,
  onLogout: () => void,
  onUpdateBalance?: (amount: number | string, type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss', game?: string) => Promise<void>,
  onShowCheatMenu?: () => void
}) {
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'en');
  const [t, setT] = useState(translations[language as keyof typeof translations]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [promoErrorMessage, setPromoErrorMessage] = useState('');
  const [rewardMsg, setRewardMsg] = useState('');
  const [now, setNow] = useState(Date.now());

  // Timer update for the cheat button
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = user.role === 'admin';
  const isMod = user.role === 'moderator';
  const isCheatRole = user.role === 'cheat';
  const hasCheatAccess = isCheatRole || (user.hasCheatAccess && user.cheatExpiresAt && user.cheatExpiresAt > now);
  
  // Roles detection logic (strict)
  const isPlayerOnly = !isAdmin && !isMod && !isCheatRole && !hasCheatAccess;

  useEffect(() => {
    setT(translations[language as keyof typeof translations]);
  }, [language]);
  
  const cardBg = tweaks.cardBackground.useState();
  const primaryAccent = tweaks.primaryAccent.useState();
  const enableSounds = tweaks.enableSounds.useState();
  const enableHaptics = tweaks.enableHaptics.useState();
  
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
  };
  
  const toggleSounds = () => {
    if (enableHaptics) vibrate(50);
  };

  const toggleHaptics = () => {
    if (enableHaptics) vibrate(50);
  };

  const handleRedeemPromo = async () => {
    const code = promoInput.toUpperCase().trim();
    if (!code) return;
    setPromoStatus('loading');

    // Check for admin/mod code
    if (code === '190608' || code === 'MOD_SECRET_KEY') {
      const newRole = (code === '190608' ? 'admin' : 'moderator') as 'admin' | 'moderator';
      const freshUser = await fetchUser(user.id);
      const updatedUser = { 
        ...freshUser, 
        role: newRole, 
        hasCheatAccess: false, // Strict: Admin/Mod don't get cheat menu in settings automatically
        showBadge: true,
        hideFromLeaderboard: false,
        showModBadge: newRole === 'moderator'
      };
      const finalUser = await saveUser(updatedUser);
      if (onRewardClaimed) onRewardClaimed(finalUser);
      window.dispatchEvent(new CustomEvent('casino_balance_update'));
      window.dispatchEvent(new CustomEvent('leaderboard_update'));

      setPromoStatus('success');
      setRewardMsg(`Accès ${newRole.toUpperCase()} activé !`);
      setPromoInput('');
      if (enableHaptics) vibrate(100);
      return;
    }

    const promo = promoCodes.find(c => c.code === code && c.isActive);
    if (!promo) {
      setPromoStatus('error');
      setPromoErrorMessage('Invalid or expired code');
      if (enableHaptics) vibrate([50, 50]);
      return;
    }

    if (!promo.isUnlimited && promo.usedCount >= promo.maxUses) {
      setPromoStatus('error');
      setPromoErrorMessage('Usage limit reached');
      if (enableHaptics) vibrate([50, 50]);
      return;
    }

    try {
      console.log(`[PROMO] Attempting to claim code: "${code}" for user: ${user.username} (${user.id})`);
      const freshUser = await fetchUser(user.id);
      const updatedUser = { ...freshUser };
      let msg = '';

      if (promo.type === 'currency') {
        updatedUser.balance = (Number(updatedUser.balance) || 0) + promo.value;
        msg = `+${promo.value.toLocaleString()} Credits`;
      } else if (promo.type === 'multiplier') {
        updatedUser.activeMultiplier = {
          value: promo.value,
          expiresAt: Date.now() + (promo.duration || 3600) * 1000
        };
        msg = `${promo.value}x Multiplier Active`;
      } else if (promo.type === 'cheat_access') {
        updatedUser.hasCheatAccess = true;
        updatedUser.cheatExpiresAt = Date.now() + (promo.value || 1) * 24 * 60 * 60 * 1000;
        updatedUser.role = 'cheat'; // Forcer le rôle cheat pour assurer la visibilité du bouton
        
        // Débloquer un titre spécial si c'est un code de triche
        const specialTitle = `Cheater ${promo.value}d`;
        const currentTitles = updatedUser.unlockedTitles || [];
        if (!currentTitles.includes(specialTitle)) {
          updatedUser.unlockedTitles = [...currentTitles, specialTitle];
        }
        
        msg = `Cheat Menu unlocked for ${promo.value} days!`;
        console.log(`[PROMO] Cheat access granted. New expiry: ${new Date(updatedUser.cheatExpiresAt).toLocaleString()}`);
      }

      console.log(`[PROMO] User state before save:`, { 
        id: updatedUser.id, 
        role: updatedUser.role, 
        hasCheatAccess: updatedUser.hasCheatAccess,
        version: updatedUser.version
      });

      const finalUser = await saveUser(updatedUser);
      console.log(`[PROMO] User state after save (Success):`, { 
        id: finalUser.id, 
        role: finalUser.role, 
        hasCheatAccess: finalUser.hasCheatAccess,
        version: finalUser.version
      });

      const updatedPromo = { ...promo, usedCount: promo.usedCount + 1 };
      const newCodes = promoCodes.map(c => c.code === promo.code ? updatedPromo : c);
      onUpdatePromoCodes(newCodes);
      await syncPromoCodeToCloud(updatedPromo);

      if (onRewardClaimed) onRewardClaimed(finalUser);
      window.dispatchEvent(new CustomEvent('casino_balance_update'));

      setPromoStatus('success');
      setRewardMsg(msg);
      setPromoInput('');
      if (enableHaptics) vibrate(200);
    } catch (err) {
      console.error(`[PROMO] Error claiming reward:`, err);
      setPromoStatus('error');
      setPromoErrorMessage('Failed to claim reward');
    }
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">{t.title}</h2>
      
      <div className="space-y-4">
        {/* GLOBAL SETTINGS - ALWAYS VISIBLE FOR ALL ROLES */}
        <div className="space-y-4">
          <button 
            onClick={toggleSounds}
            className="w-full text-left p-4 rounded-xl transition-all active:scale-[0.98]" 
            style={{ backgroundColor: cardBg }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="size-6" style={{ color: primaryAccent }} />
                <div>
                  <div className="font-semibold text-white">{t.sounds}</div>
                  <div className="text-sm text-gray-400">{t.soundsDesc}</div>
                </div>
              </div>
              <div className={`size-12 rounded-full flex items-center justify-center transition-all ${enableSounds ? 'bg-green-500' : 'bg-gray-700'}`}>
                {enableSounds ? '✓' : '✗'}
              </div>
            </div>
          </button>

          <button 
            onClick={toggleHaptics}
            className="w-full text-left p-4 rounded-xl transition-all active:scale-[0.98]" 
            style={{ backgroundColor: cardBg }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Vibrate className="size-6" style={{ color: primaryAccent }} />
                <div>
                  <div className="font-semibold text-white">{t.vibrations}</div>
                  <div className="text-sm text-gray-400">{t.vibrationsDesc}</div>
                </div>
              </div>
              <div className={`size-12 rounded-full flex items-center justify-center transition-all ${enableHaptics ? 'bg-green-500' : 'bg-gray-700'}`}>
                {enableHaptics ? '✓' : '✗'}
              </div>
            </div>
          </button>

          <div className="p-4 rounded-xl" style={{ backgroundColor: cardBg }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="size-6" style={{ color: primaryAccent }} />
                <div>
                  <div className="font-semibold text-white">{t.language}</div>
                  <div className="text-sm text-gray-400">{t.languageDesc}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {['fr', 'de', 'en'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className="px-3 py-1 rounded-lg font-bold text-xs transition-all active:scale-95"
                    style={{
                      backgroundColor: language === lang ? primaryAccent : '#333',
                      color: language === lang ? '#000' : '#fff',
                    }}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Promo Code Button - Always available for all roles (opens popup) */}
          <button
            onClick={() => {
              setShowPromoModal(true);
              if (enableHaptics) vibrate(50);
            }}
            className="w-full text-left p-4 rounded-xl transition-all active:scale-[0.98] border-2" 
            style={{ backgroundColor: `${primaryAccent}10`, borderColor: `${primaryAccent}40` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="size-6" style={{ color: primaryAccent }} />
                <div>
                  <div className="font-black text-white uppercase italic tracking-wider">{t.promo}</div>
                  <div className="text-sm text-gray-400">{t.promoDesc}</div>
                </div>
              </div>
              <div className="size-8 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryAccent }}>
                <span className="text-xl text-black">→</span>
              </div>
            </div>
          </button>
        </div>

        {/* ROLE-SPECIFIC SECTIONS */}
        {(isAdmin || isMod || (hasCheatAccess && !isAdmin && !isMod)) && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-white/10"></div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Special Access</span>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>

            <div className="flex flex-col gap-2">
              {isAdmin && (
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open_admin_panel', { detail: { mode: 'admin' } }));
                    if (enableHaptics) vibrate(50);
                  }}
                  className="w-full p-4 rounded-xl transition-all active:scale-[0.98] border-2 bg-yellow-500/10 border-yellow-500/30 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Crown className="size-6 text-yellow-500" />
                    <span className="font-black text-white uppercase tracking-tighter">Admin Panel</span>
                  </div>
                  <ChevronRight className="size-5 text-yellow-500" />
                </button>
              )}

              {isMod && !isAdmin && (
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open_admin_panel', { detail: { mode: 'mod' } }));
                    if (enableHaptics) vibrate(50);
                  }}
                  className="w-full p-4 rounded-xl transition-all active:scale-[0.98] border-2 bg-blue-500/10 border-blue-500/30 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="size-6 text-blue-500" />
                    <span className="font-black text-white uppercase tracking-tighter">Mod Control</span>
                  </div>
                  <ChevronRight className="size-5 text-blue-500" />
                </button>
              )}
              
              {hasCheatAccess && !isAdmin && !isMod && (
                <button
                  onClick={() => {
                    onShowCheatMenu?.();
                    if (enableHaptics) vibrate(50);
                  }}
                  className="w-full text-left p-4 rounded-xl transition-all active:scale-[0.98] border-2 border-purple-500/30 bg-purple-500/10 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="size-6 text-purple-500" />
                      <div>
                        <div className="font-semibold text-white">Cheat Menu</div>
                        <div className="text-sm text-gray-400">Exclusive Cheat Tools</div>
                      </div>
                    </div>
                    {user.cheatExpiresAt && user.cheatExpiresAt > now && user.role !== 'cheat' && (
                      <div className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black tracking-widest uppercase animate-pulse">
                        {Math.max(0, Math.floor((user.cheatExpiresAt - now) / 1000))}s left
                      </div>
                    )}
                    {user.role === 'cheat' && (
                      <div className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black tracking-widest uppercase">
                        PERMANENT
                      </div>
                    )}
                    <ChevronRight className="size-5 text-purple-500" />
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl" style={{ backgroundColor: cardBg }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="size-6" style={{ color: primaryAccent }} />
              <div>
                <div className="font-semibold text-white">{t.version}</div>
                <div className="text-sm text-gray-400">{t.versionText}</div>
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            onLogout();
            if (enableHaptics) vibrate(50);
          }}
          className="w-full p-4 rounded-xl flex items-center justify-center gap-3 bg-white/5 text-white font-semibold border border-white/10 transition-all active:scale-95"
        >
          <XCircle className="size-6" />
          {t.logout}
        </button>
      </div>

      {showPromoModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0a0a0a] border-2 rounded-3xl p-8 animate-in zoom-in-95 duration-200" style={{ borderColor: `${primaryAccent}40`, boxShadow: `0 0 60px ${primaryAccent}20` }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl flex items-center justify-center border-2" style={{ borderColor: primaryAccent, backgroundColor: `${primaryAccent}10` }}>
                  <Gift className="size-6" style={{ color: primaryAccent }} />
                </div>
                <h3 className="text-2xl font-black text-white">{t.promo}</h3>
              </div>
              <button
                onClick={() => {
                  setShowPromoModal(false);
                  setPromoStatus('idle');
                  setPromoInput('');
                }}
                className="size-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border-2"
                style={{ borderColor: `${primaryAccent}40`, backgroundColor: '#111' }}
              >
                <X className="size-5 text-white" />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-6">{t.promoDesc}</p>

            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder={t.promoPlaceholder}
                  className="w-full bg-black/40 border-2 rounded-xl px-4 py-3 text-white font-black tracking-widest outline-none focus:border-white/30 transition-all text-center"
                  style={{ borderColor: `${primaryAccent}40` }}
                />
                <button
                  onClick={handleRedeemPromo}
                  className="w-full py-4 rounded-xl font-black transition-all active:scale-95 whitespace-nowrap"
                  style={{ backgroundColor: primaryAccent, color: '#000' }}
                >
                  {t.promoApply}
                </button>
              </div>

              {promoStatus === 'success' && (
                <div className="p-4 rounded-xl flex items-center gap-3 bg-green-500/10 border-2 border-green-500/30 animate-in slide-in-from-top-2">
                  <CheckCircle2 className="size-5 text-green-400 shrink-0" />
                  <div>
                    <div className="text-green-400 font-bold text-sm">{t.promoSuccess}</div>
                    <div className="text-green-300/70 text-xs mt-1">{rewardMsg}</div>
                  </div>
                </div>
              )}
              {promoStatus === 'error' && (
                <div className="p-4 rounded-xl flex items-center gap-3 bg-red-500/10 border-2 border-red-500/30 animate-in slide-in-from-top-2">
                  <XCircle className="size-5 text-red-400 shrink-0" />
                  <div className="text-red-400 font-bold text-sm">{promoErrorMessage}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}