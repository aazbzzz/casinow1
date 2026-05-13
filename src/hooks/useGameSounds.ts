import assetsData from "@/config/assets";
import { useRef, useEffect } from 'react';
import { useAudioContext } from '@aippy/runtime/audio';
import { aippyTweaks } from '@aippy/runtime/tweaks';
import tweaksConfig from '@/config/tweaksConfig.json';

const tweaks = aippyTweaks(tweaksConfig);

export function useGameSounds() {
  const {
    audioContext,
    isUnlocked,
    unlock
  } = useAudioContext();
  
  const enableSounds = tweaks.enableSounds.useState();

  const confirmSound = useRef<HTMLAudioElement | null>(null);
  const errorSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const bgMusic = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    confirmSound.current = new Audio(assetsData.AUDIO_TAOO);
    errorSound.current = new Audio(assetsData.AUDIO_KJDZ);
    winSound.current = new Audio(assetsData.AUDIO_HNHR);
    bgMusic.current = new Audio(assetsData.AUDIO_IFXU);
    if (bgMusic.current) {
      bgMusic.current.loop = true;
      bgMusic.current.volume = 0.3;
    }
    return () => {
      confirmSound.current = null;
      errorSound.current = null;
      winSound.current = null;
      if (bgMusic.current) {
        bgMusic.current.pause();
        bgMusic.current = null;
      }
    };
  }, []);
  const playConfirm = async () => {
    if (!enableSounds) return;
    if (!isUnlocked) await unlock();
    confirmSound.current?.play().catch(() => {});
  };
  const playError = async () => {
    if (!enableSounds) return;
    if (!isUnlocked) await unlock();
    errorSound.current?.play().catch(() => {});
  };
  const playWin = async () => {
    if (!enableSounds) return;
    if (!isUnlocked) await unlock();
    winSound.current?.play().catch(() => {});
  };
  const startMusic = async () => {
    if (!enableSounds) return;
    if (!isUnlocked) await unlock();
    bgMusic.current?.play().catch(() => {});
  };
  const stopMusic = () => {
    bgMusic.current?.pause();
  };
  return {
    playConfirm,
    playError,
    playWin,
    startMusic,
    stopMusic
  };
}