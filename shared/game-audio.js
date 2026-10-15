// Small, self-contained score: no downloads or third-party audio assets.
export function createGameAudio(AudioContextClass) {
  let context;
  let output;
  let timer;
  let beat = 0;
  let muted = false;
  let hidden = false;
  let disposed = false;
  const voices = new Set();
  const melody = [72, 76, 79, 76, 74, 77, 81, 77, 71, 74, 79, 74, 69, 72, 76, 72];
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
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
    for (const voice of voices) { try { voice.stop(); } catch {} }
    voices.clear();
  };
  const sync = () => {
    if (!context) return;
    output.gain.value = muted || hidden ? 0 : 0.5;
    if (muted || hidden || context.state !== 'running') { stop(); return; }
    if (timer) return;
    const tick = () => {
      tone(melody[beat % melody.length], 0, 0.7, 0.07);
      if (beat % 4 === 0) tone([48, 53, 43, 45][Math.floor(beat / 4) % 4], 0, 1.8, 0.09);
      beat++;
    };
    tick();
    timer = setInterval(tick, 420);
  };
  return {
    async unlock() {
      if (disposed || !AudioContextClass || muted || hidden) return;
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
    setMuted(value) { muted = value; sync(); },
    setHidden(value) { hidden = value; sync(); },
    play(name) {
      if (!context || context.state !== 'running' || muted || hidden || disposed) return;
      const notes = { click: [76], select: [81], move: [60, 67], capture: [55, 67, 72], check: [78, 74, 78], start: [60, 64, 67], finish: [72, 67, 76, 79], roll: [48, 55, 50, 60], buy: [72, 76, 84], error: [48, 46] }[name] || [64, 67];
      notes.forEach((note, index) => tone(note, index * 0.075, 0.18, 0.16, 'triangle'));
    },
    dispose() { disposed = true; stop(); if (context) context.close().catch(() => {}); },
  };
}
