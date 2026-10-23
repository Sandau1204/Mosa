// MP3 background music and independent, synthesized interaction effects.
export function createGameAudio(AudioContextClass, AudioClass, musicSrc = '/audio/zephiramusic-lofi-gaming-606302.mp3') {
  let context;
  let output;
  let music;
  let currentMusicSrc = musicSrc;
  let unlocked = false;
  let effectsMuted = false;
  let musicEnabled = true;
  let hidden = false;
  let disposed = false;
  const voices = new Set();
  const ensureMusic = () => {
    if (music || !AudioClass || !currentMusicSrc) return;
    try {
      music = new AudioClass(currentMusicSrc);
      music.loop = true;
      music.volume = 0.2;
      music.preload = 'none';
    } catch { /* Missing music must not disable interaction effects. */ }
  };
  const tone = (note, delay, duration, volume, type = 'sine') => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain).connect(output);
    voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };
  const woodTap = (isCapture = false) => {
    const start = context.currentTime;
    const body = context.createOscillator();
    const bodyGain = context.createGain();
    const bodyFrequency = isCapture ? 155 : 190;
    body.type = 'triangle';
    body.frequency.setValueAtTime(bodyFrequency, start);
    body.frequency.exponentialRampToValueAtTime(bodyFrequency * 0.55, start + 0.12);
    bodyGain.gain.setValueAtTime(0, start);
    bodyGain.gain.linearRampToValueAtTime(isCapture ? 0.24 : 0.19, start + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
    body.connect(bodyGain).connect(output);
    voices.add(body);
    body.onended = () => { voices.delete(body); body.disconnect(); bodyGain.disconnect(); };
    body.start(start);
    body.stop(start + 0.16);

    const sampleRate = context.sampleRate || 44100;
    const length = Math.floor(sampleRate * 0.04);
    const buffer = context.createBuffer(1, length, sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index++) {
      const decay = 1 - index / length;
      samples[index] = (Math.random() * 2 - 1) * decay * decay;
    }
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = isCapture ? 1100 : 1500;
    noiseGain.gain.setValueAtTime(isCapture ? 0.22 : 0.17, start);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.04);
    noise.connect(filter).connect(noiseGain).connect(output);
    voices.add(noise);
    noise.onended = () => { voices.delete(noise); noise.disconnect(); filter.disconnect(); noiseGain.disconnect(); };
    noise.start(start);
    noise.stop(start + 0.045);
  };
  const stop = () => {
    for (const voice of voices) { try { voice.stop(); } catch {} }
    voices.clear();
  };
  const sync = () => {
    if (disposed) return;
    if (music) {
      if (!musicEnabled || hidden || !unlocked) music.pause();
      else if (music.paused) {
        try { music.play()?.catch(() => {}); } catch { /* Playback is optional. */ }
      }
    }
    if (!context) return;
    output.gain.value = effectsMuted || hidden ? 0 : 0.5;
    if (effectsMuted || hidden || context.state !== 'running') { stop(); return; }
  };
  return {
    async unlock() {
      if (disposed || hidden) return;
      unlocked = true;
      ensureMusic();
      sync();
      if (!AudioContextClass || effectsMuted) return;
      try {
        if (!context) {
          context = new AudioContextClass();
          output = context.createGain();
          output.connect(context.destination);
        }
        await context.resume();
        if (!disposed) sync();
      } catch { /* Audio is optional when a browser blocks playback. */ }
    },
    setMuted(value) {
      effectsMuted = value;
      musicEnabled = !value;
      sync();
    },
    setEffectsMuted(value) { effectsMuted = value; sync(); },
    setMusicEnabled(value) { musicEnabled = value; sync(); },
    setMusicSource(source, restart = false) {
      if (currentMusicSrc === source && !restart) return;
      currentMusicSrc = source;
      if (music) {
        music.pause();
        music.removeAttribute('src');
        music.load();
        music = undefined;
      }
      ensureMusic();
      sync();
    },
    setHidden(value) { hidden = value; sync(); },
    play(name) {
      if (!context || context.state !== 'running' || effectsMuted || hidden || disposed) return;
      if (name === 'boardSelect' || name === 'boardMove' || name === 'boardCapture') {
        woodTap(name === 'boardCapture');
        return;
      }
      const notes = { click: [76], select: [81], move: [60, 67], capture: [55, 67, 72], check: [78, 74, 78], start: [60, 64, 67], finish: [72, 67, 76, 79], roll: [48, 55, 50, 60], buy: [72, 76, 84], error: [48, 46] }[name] || [64, 67];
      notes.forEach((note, index) => tone(note, index * 0.075, 0.18, 0.16, 'triangle'));
    },
    dispose() {
      disposed = true;
      stop();
      if (music) {
        music.pause();
        music.removeAttribute('src');
        music.load();
        music = undefined;
      }
      if (context) context.close().catch(() => {});
    },
  };
}
