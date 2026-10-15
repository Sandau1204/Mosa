'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createGameAudio } from '../../shared/game-audio';

export default function useGameAudio(muted, setMuted) {
  const audio = useRef(null);
  useEffect(() => {
    const engine = createGameAudio(window.AudioContext || window.webkitAudioContext);
    audio.current = engine;
    let saved = false;
    try { saved = localStorage.getItem('mosa-games-muted') === 'true'; } catch {}
    engine.setMuted(saved);
    setMuted(saved);
    let interacted = false;
    const visibility = () => {
      engine.setHidden(document.hidden);
      if (!document.hidden && interacted) engine.unlock();
    };
    const unlock = () => { interacted = true; engine.unlock(); };
    engine.setHidden(document.hidden);
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
  }, [setMuted]);
  useEffect(() => { audio.current?.setMuted(muted); }, [muted]);
  const toggle = useCallback(() => {
    const next = !muted;
    audio.current?.setMuted(next);
    if (!next) audio.current?.unlock();
    setMuted(next);
    try { localStorage.setItem('mosa-games-muted', String(next)); } catch {}
  }, [muted, setMuted]);
  const play = useCallback(name => audio.current?.play(name), []);
  return { play, toggle };
}
