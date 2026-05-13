import { useCallback, useRef, useEffect } from 'react';
import { useAudioContext } from '@aippy/runtime/audio';

/**
 * Custom hook for playing a simple "ding" sound effect
 * Works on iOS even in silent mode
 * 
 * @returns playDingSound function with stable reference
 */
export function useDingSound() {
  // Use SDK's useAudioContext hook for initialization and lifecycle management
  const { audioContext, isUnlocked, unlock } = useAudioContext();

  const audioContextRef = useRef(audioContext);
  const isUnlockedRef = useRef(isUnlocked);
  const unlockRef = useRef(unlock);

  useEffect(() => {
    audioContextRef.current = audioContext;
    isUnlockedRef.current = isUnlocked;
    unlockRef.current = unlock;
  }, [audioContext, isUnlocked, unlock]);

  const playDingSound = useCallback(async () => {
    if (!audioContextRef.current) return;

    try {
      // Unlock audio on first interaction (required for iOS)
      if (!isUnlockedRef.current) {
        await unlockRef.current();
      }

      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();

      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);

      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);

      osc.start();
      osc.stop(audioContextRef.current.currentTime + 0.3);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }, []);

  return { playDingSound };
}
