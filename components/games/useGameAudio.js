'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createGameAudio } from '../../shared/game-audio';

const DEFAULT_MUSIC_URL = '/audio/zephiramusic-lofi-gaming-606302.mp3';
const PREFERENCE_KEYS = {
  effects: 'mosa-games-effects-muted',
  music: 'mosa-games-music-muted',
};

export default function useGameAudio(activeMusic) {
  const audio = useRef(null);
  const previousMusicScene = useRef(activeMusic);
  const [effectsMuted, setEffectsMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);

  const sharedMusicUrl = process.env.NEXT_PUBLIC_GAMES_BGM_URL || DEFAULT_MUSIC_URL;
  const menuMusicUrl = process.env.NEXT_PUBLIC_GAMES_MENU_BGM_URL || sharedMusicUrl;
  const gameMusicUrl = process.env.NEXT_PUBLIC_GAMES_PLAY_BGM_URL || sharedMusicUrl;
  const activeMusicUrl = activeMusic === 'menu' ? menuMusicUrl : activeMusic === 'game' ? gameMusicUrl : '';

  useEffect(() => {
    const engine = createGameAudio(
      window.AudioContext || window.webkitAudioContext,
      window.Audio,
      activeMusicUrl,
    );
    audio.current = engine;
    const readMuted = key => {
      try {
        const value = localStorage.getItem(key);
        return value == null ? null : value === 'true';
      } catch { return false; }
    };
    const legacyMuted = readMuted('mosa-games-muted') ?? false;
    const savedEffectsMuted = readMuted(PREFERENCE_KEYS.effects) ?? legacyMuted;
    const savedMusicMuted = readMuted(PREFERENCE_KEYS.music)
      ?? readMuted('mosa-games-menu-music-muted')
      ?? readMuted('mosa-games-game-music-muted')
      ?? legacyMuted;
    setEffectsMuted(savedEffectsMuted);
    setMusicMuted(savedMusicMuted);
    engine.setEffectsMuted(savedEffectsMuted);
    engine.setMusicEnabled(Boolean(activeMusicUrl) && !savedMusicMuted);
    const visibility = () => {
      engine.setHidden(document.hidden);
      if (!document.hidden) engine.unlock();
    };
    const unlock = () => { engine.unlock(); };
    engine.setHidden(document.hidden);
    engine.unlock();
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', visibility);
      engine.dispose();
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = audio.current;
    if (!engine) return;
    const sceneChanged = previousMusicScene.current !== activeMusic;
    previousMusicScene.current = activeMusic;
    engine.setMusicSource(activeMusicUrl, sceneChanged);
    engine.setMusicEnabled(Boolean(activeMusicUrl) && !musicMuted);
  }, [activeMusic, activeMusicUrl, musicMuted]);

  useEffect(() => { audio.current?.setEffectsMuted(effectsMuted); }, [effectsMuted]);

  const updatePreference = useCallback((key, setter, value) => {
    setter(value);
    try { localStorage.setItem(key, String(value)); } catch {}
  }, []);
  const toggleEffects = useCallback(() => {
    const next = !effectsMuted;
    audio.current?.setEffectsMuted(next);
    if (!next) audio.current?.unlock();
    updatePreference(PREFERENCE_KEYS.effects, setEffectsMuted, next);
  }, [effectsMuted, updatePreference]);
  const toggleMusic = useCallback(() => {
    const next = !musicMuted;
    if (activeMusic && !next) audio.current?.unlock();
    updatePreference(PREFERENCE_KEYS.music, setMusicMuted, next);
  }, [activeMusic, musicMuted, updatePreference]);
  const toggleActiveAudio = useCallback(() => {
    if (activeMusic) toggleMusic();
    else toggleEffects();
  }, [activeMusic, toggleEffects, toggleMusic]);
  const play = useCallback(name => audio.current?.play(name), []);

  return {
    effectsMuted,
    musicMuted,
    play,
    toggleEffects,
    toggleMusic,
    toggleActiveAudio,
  };
}
