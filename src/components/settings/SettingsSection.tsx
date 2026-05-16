import { useState, useEffect } from 'react';
import { Settings, Volume2, Vibrate, Trash2, Globe, AlertTriangle, Ticket, CheckCircle2, XCircle, Gift, X, Zap, ChevronRight } from 'lucide-react';
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

export function SettingsSection({ onRewardClaimed, promoCodes, onUpdatePromoCodes, onLogout, onUpdateBalance, onShowCheatMenu }: { 
  onRewardClaimed?: () => void,
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
  const [promoStatus, setPromoStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [promoErrorMessage, setPromoErrorMessage] = useState('');
  const [rewardMsg, setRewardMsg] = useState('');
  
  const user = getUser();
  
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
    // Les tweaks sont gérés par la plateforme
    if (enableHaptics) vibrate(50);
  };

  const toggleHaptics = () => {
    // Les tweaks sont gérés par la plateforme
    if (enableHaptics) vibrate(50);
  };

  const handleRedeemPromo = async () => {
    const code = promoInput.toUpperCase().trim();
    if (!code) return;

    const user = getUser();
    const userUsedCodes = user.usedPromoCodes || [];

    console.log(`[SettingsSection] handleRedeemPromo start:`, { code, userId: user.id });

    // Check if user already used it
    if (userUsedCodes.includes(code)) {
      setPromoStatus('error');
      setPromoErrorMessage(t.promoErrorUsed as string);
      if (enableHaptics) vibrate([50, 50, 50]);
      return;
    }

    const promo = promoCodes.find(p => p.code === code);
    
    // Check if code exists
    if (!promo) {
      console.warn(`[SettingsSection] Code not found in syncedPromoCodes`, { code, syncedCodesCount: promoCodes.length });
      setPromoStatus('error');
      setPromoErrorMessage(t.promoError as string);
      if (enableHaptics) vibrate([50, 50, 50]);
      return;
    }

    console.log(`[SettingsSection] Found promo:`, promo);

    // Check if active
    if (!promo.isActive) {
      setPromoStatus('error');
      setPromoErrorMessage(t.promoErrorInactive as string);
      if (enableHaptics) vibrate([50, 50, 50]);
      return;
    }

    // Check global limit
    if (!promo.isUnlimited && Number(promo.usedCount) >= Number(promo.maxUses)) {
      setPromoStatus('error');
      setPromoErrorMessage(t.promoErrorLimit as string);
      if (enableHaptics) vibrate([50, 50, 50]);
      return;
    }

    // Apply reward
    const cleanNum = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (typeof val === 'string') {
        // Remove spaces and handle both dot and comma
        let cleaned = val.replace(/\s/g, '');
        if (cleaned.includes(',') && cleaned.includes('.')) {
          if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
            cleaned = cleaned.replace(/,/g, '');
          } else {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          }
        } else {
          cleaned = cleaned.replace(',', '.');
        }
        const parsed = parseFloat(cleaned.replace(/[^0-9.-]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const promoValue = cleanNum(promo.value);
    console.log(`[SettingsSection] Redeeming promo code:`, {
      code,
      type: promo.type,
      value: promoValue
    });
    
    // On récupère la version la plus fraîche de l'utilisateur
    const currentUser = await fetchUser();
    const updatedUser = { ...currentUser };

    // 1. Appliquer la récompense
    if (promo.type === 'currency') {
      const currentBalance = cleanNum(updatedUser.balance);
      const newBalance = currentBalance + promoValue;
      console.log(`[SettingsSection] Updating balance: ${currentBalance} -> ${newBalance}`);
      updatedUser.balance = newBalance;
      
      // Enregistrer la transaction
      await addTransaction({
        userId: updatedUser.id,
        type: 'win',
        amount: promoValue,
        game: 'Promo Code',
        balanceAfter: updatedUser.balance
      });
    } else if (promo.type === 'crypto') {
      const portfolio = JSON.parse(localStorage.getItem('crypto_portfolio') || '[]');
      const assetIndex = portfolio.findIndex((a: any) => a.symbol === promo.cryptoSymbol);
      const amountToAdd = promoValue;
      if (assetIndex >= 0) {
        portfolio[assetIndex].amount = cleanNum(portfolio[assetIndex].amount) + amountToAdd;
      } else {
        portfolio.push({
          id: crypto.randomUUID(),
          symbol: promo.cryptoSymbol,
          name: promo.cryptoSymbol,
          amount: amountToAdd,
          avgBuyPrice: 0
        });
      }
      localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
    } else if (promo.type === 'multiplier') {
      updatedUser.activeMultiplier = {
        value: promoValue,
        expiresAt: Date.now() + (cleanNum(promo.duration) || 3600) * 1000
      };
    } else if (promo.type === 'cheat_access') {
      updatedUser.hasCheatAccess = true;
      if (onShowCheatMenu) onShowCheatMenu();
    }

    // 2. Marquer comme utilisé par cet utilisateur
    updatedUser.usedPromoCodes = [...(updatedUser.usedPromoCodes || []), code];
    
    // 3. Sauvegarder l'utilisateur mis à jour (Une seule fois, Cloud + Local)
    console.log(`[SettingsSection] Saving updated user with reward and used code:`, { balance: updatedUser.balance });
    await saveUser(updatedUser);
    
    // 4. Forcer le rafraîchissement global pour que useGameState se mette à jour
    window.dispatchEvent(new CustomEvent('casino_balance_update'));
    
    if (onRewardClaimed) onRewardClaimed();

    // 5. Mettre à jour le compteur d'utilisation global du code promo
    const targetCode = { ...promo, usedCount: (Number(promo.usedCount) || 0) + 1 };
    const updatedCodes = promoCodes.map(p => p.code === code ? targetCode : p);
    onUpdatePromoCodes(updatedCodes);

    // 6. Cloud Sync usage count (Upsert)
    await syncPromoCodeToCloud(targetCode);
    
    // 7. Synchroniser avec le système global @aippy
    sendEvent('promo_code_used', {
      code,
      userId: updatedUser.id,
      reward: promo.rewardText
    });

    setPromoStatus('success');
    setRewardMsg(promo.rewardText);
    setPromoInput('');
    if (enableHaptics) vibrate(200);

    setTimeout(() => {
      setPromoStatus('idle');
      setRewardMsg('');
    }, 5000);
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">{t.title}</h2>
      
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

        {user.hasCheatAccess && (
          <button 
            onClick={onShowCheatMenu}
            className="w-full text-left p-4 rounded-xl transition-all active:scale-[0.98] border-2 border-purple-500/30 bg-purple-500/10" 
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="size-6 text-purple-500" />
                <div>
                  <div className="font-semibold text-white">Cheat Menu</div>
                  <div className="text-sm text-gray-400">Accéder aux options de triche</div>
                </div>
              </div>
              <ChevronRight className="size-5 text-purple-500" />
            </div>
          </button>
        )}
        
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
        
        {/* Promo Code Button - Placed below vibrations */}
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
        
        {user.hasCheatAccess && onShowCheatMenu && (
          <button
            onClick={() => {
              onShowCheatMenu();
              if (enableHaptics) vibrate(50);
            }}
            className="w-full p-4 rounded-xl flex items-center justify-center gap-3 bg-yellow-500/20 text-yellow-500 font-black uppercase tracking-widest transition-all active:scale-95 border-2 border-yellow-500/30"
          >
            <Zap className="size-6" />
            Cheat Menu
          </button>
        )}

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

              {/* Admin Management Section */}
              {(user.role === 'admin' || user.role === 'moderator') && promoCodes.length > 0 && (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-white/10"></div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Codes</span>
                    <div className="h-px flex-1 bg-white/10"></div>
                  </div>
                  
                  {promoCodes.map((code) => {
                    const isCheatAccess = code.type === 'cheat_access';
                    return (
                      <div 
                        key={code.code} 
                        className={`p-4 rounded-xl border-2 flex items-center justify-between gap-3 transition-all ${code.isActive ? 'bg-[#0a0a0a]' : 'bg-[#1a0a0a] opacity-60 grayscale'}`} 
                        style={{ borderColor: code.isActive ? `${primaryAccent}20` : '#333' }}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                            {isCheatAccess ? <Zap className="size-5 text-purple-500" /> : <Ticket className="size-5" style={{ color: code.isActive ? primaryAccent : '#666' }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-white flex items-center gap-2">
                              {code.code}
                              {!code.isActive && <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">DISABLED</span>}
                              {isCheatAccess && <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-black uppercase tracking-tighter">CHEAT UNLOCK</span>}
                            </div>
                            <div className="text-xs text-gray-400">Reward: <span style={{ color: isCheatAccess ? '#a855f7' : primaryAccent }} className="font-bold">{code.rewardText}</span></div>
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
                              await syncPromoCodeToCloud(updatedCode);
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
                                if (supabase) {
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}