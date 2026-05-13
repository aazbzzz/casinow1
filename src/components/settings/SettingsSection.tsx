import { useState, useEffect } from 'react';
import { Settings, Volume2, Vibrate, Trash2, Globe, AlertTriangle, Ticket, CheckCircle2, XCircle, Gift, X } from 'lucide-react';
import { resetAllData, getPromoCodes, savePromoCodes, getUsedPromoCodes, saveUsedPromoCodes, getUser, saveUser, addTransaction } from '@/lib/storage';
import { aippyTweaks } from '@aippy/runtime/tweaks';
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
    reset: 'Réinitialiser toutes les données',
    confirmTitle: 'Êtes-vous sûr ?',
    confirmDesc: 'Toutes vos données (solde, historique, progression) seront définitivement supprimées.',
    yes: 'Oui, réinitialiser',
    no: 'Annuler',
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
    reset: 'Alle Daten zurücksetzen',
    confirmTitle: 'Sind Sie sicher?',
    confirmDesc: 'Alle Ihre Daten (Guthaben, Verlauf, Fortschritt) werden dauerhaft gelöscht.',
    yes: 'Ja, zurücksetzen',
    no: 'Abbrechen',
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
    reset: 'Reset all data',
    confirmTitle: 'Are you sure?',
    confirmDesc: 'All your data (balance, history, progress) will be permanently deleted.',
    yes: 'Yes, reset',
    no: 'No, cancel',
  },
};

export function SettingsSection({ onRewardClaimed }: { onRewardClaimed?: () => void }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'en');
  const [t, setT] = useState(translations[language as keyof typeof translations]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [promoErrorMessage, setPromoErrorMessage] = useState('');
  const [rewardMsg, setRewardMsg] = useState('');
  
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
  
  const handleReset = () => {
    resetAllData();
    if (enableHaptics) vibrate([100, 50, 100]);
    window.location.reload();
  };

  const toggleSounds = () => {
    // Les tweaks sont gérés par la plateforme
    if (enableHaptics) vibrate(50);
  };

  const toggleHaptics = () => {
    // Les tweaks sont gérés par la plateforme
    if (enableHaptics) vibrate(50);
  };

  const handleRedeemPromo = () => {
    const code = promoInput.toUpperCase().trim();
    if (!code) return;

    const promoCodes = getPromoCodes();
    const usedCodes = getUsedPromoCodes();

    // Check if user already used it
    if (usedCodes.includes(code)) {
      setPromoStatus('error');
      setPromoErrorMessage(t.promoErrorUsed as string);
      if (enableHaptics) vibrate([50, 50, 50]);
      return;
    }

    const promo = promoCodes.find(p => p.code === code);
    
    // Check if code exists
    if (!promo) {
      setPromoStatus('error');
      setPromoErrorMessage(t.promoError as string);
      if (enableHaptics) vibrate([50, 50, 50]);
      return;
    }

    // Check if active
    if (!promo.isActive) {
      setPromoStatus('error');
      setPromoErrorMessage(t.promoErrorInactive as string);
      if (enableHaptics) vibrate([50, 50, 50]);
      return;
    }

    // Check global limit
    if (!promo.isUnlimited && promo.usedCount >= promo.maxUses) {
      setPromoStatus('error');
      setPromoErrorMessage(t.promoErrorLimit as string);
      if (enableHaptics) vibrate([50, 50, 50]);
      return;
    }

    // Apply reward
    const user = getUser();
    if (promo.type === 'currency') {
      user.balance += promo.value;
      addTransaction({
        userId: user.id,
        type: 'win',
        amount: promo.value,
        game: 'Promo Code',
        balanceAfter: user.balance
      });
    } else if (promo.type === 'crypto') {
      const portfolio = JSON.parse(localStorage.getItem('crypto_portfolio') || '[]');
      const assetIndex = portfolio.findIndex((a: any) => a.symbol === promo.cryptoSymbol);
      if (assetIndex >= 0) {
        portfolio[assetIndex].amount += promo.value;
      } else {
        portfolio.push({
          id: crypto.randomUUID(),
          symbol: promo.cryptoSymbol,
          name: promo.cryptoSymbol,
          amount: promo.value,
          avgBuyPrice: 0
        });
      }
      localStorage.setItem('crypto_portfolio', JSON.stringify(portfolio));
    } else if (promo.type === 'multiplier') {
      user.activeMultiplier = {
        value: promo.value,
        expiresAt: Date.now() + (promo.duration || 3600) * 1000
      };
    }

    saveUser(user);
    if (onRewardClaimed) onRewardClaimed();

    // Update code usage globally
    const updatedPromoCodes = promoCodes.map(p => {
      if (p.code === code) {
        return { ...p, usedCount: p.usedCount + 1 };
      }
      return p;
    });
    savePromoCodes(updatedPromoCodes);
    
    // Mark as used by this user locally
    usedCodes.push(code);
    saveUsedPromoCodes(usedCodes);

    // Synchroniser avec le système global @aippy
    sendEvent('promo_code_used', { 
      code, 
      userId: user.id, 
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
        
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full p-4 rounded-xl flex items-center justify-center gap-3 bg-red-500/20 text-red-500 font-semibold transition-all active:scale-95"
        >
          <Trash2 className="size-6" />
          {t.reset}
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

      {showConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#111] border-2 border-red-500/50 rounded-3xl p-8 text-center animate-in zoom-in-95 duration-200 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="size-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">{t.confirmTitle}</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              {t.confirmDesc}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleReset}
                className="w-full py-4 rounded-xl bg-red-500 text-white font-black uppercase tracking-wider transition-all active:scale-95"
              >
                {t.yes}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-4 rounded-xl bg-white/5 text-gray-400 font-bold uppercase tracking-wider transition-all active:scale-95 border border-white/10"
              >
                {t.no}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}