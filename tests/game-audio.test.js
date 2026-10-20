import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameAudio } from '../shared/game-audio.js';

test('audio waits for interaction, respects mute/visibility and releases resources', async () => {
  let created = 0;
  let notes = 0;
  let closed = false;
  class Context {
    constructor() { created++; this.currentTime = 0; this.state = 'suspended'; }
    createGain() {
      return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
    }
    createOscillator() {
      return { frequency: {}, connect: gain => gain, disconnect() {}, start() { notes++; }, stop() {} };
    }
    async resume() { this.state = 'running'; }
    async close() { closed = true; }
  }
  const audio = createGameAudio(Context);
  try {
    audio.play('move');
    assert.equal(created, 0);
    await audio.unlock();
    assert.equal(created, 1);
    const before = notes;
    audio.play('capture');
    assert.equal(notes, before + 3);
    audio.setMuted(true);
    const mutedNotes = notes;
    audio.play('move');
    await audio.unlock();
    assert.equal(notes, mutedNotes);
    audio.setHidden(true);
    audio.setMuted(false);
    audio.play('finish');
    assert.equal(notes, mutedNotes);
    audio.setHidden(false);
    assert.equal(notes, mutedNotes);
    audio.play('move');
    assert.equal(notes, mutedNotes + 2);
  } finally { audio.dispose(); }
  assert.equal(closed, true);
  await audio.unlock();
  assert.equal(created, 1);
});

test('MP3 loops after interaction, pauses on mute/hidden and is released', async () => {
  let music;
  class Music {
    constructor(src) { this.src = src; this.paused = true; music = this; }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute(name) { delete this[name]; }
    load() { this.released = true; }
  }
  const audio = createGameAudio(undefined, Music, '/audio/test.mp3');
  assert.equal(music, undefined);
  await audio.unlock();
  assert.equal(music.src, '/audio/test.mp3');
  assert.equal(music.loop, true);
  assert.equal(music.volume, 0.2);
  assert.equal(music.paused, false);
  audio.setMuted(true);
  assert.equal(music.paused, true);
  audio.setHidden(true);
  audio.setMuted(false);
  assert.equal(music.paused, true);
  audio.setHidden(false);
  assert.equal(music.paused, false);
  audio.dispose();
  assert.equal(music.paused, true);
  assert.equal(music.src, undefined);
  assert.equal(music.released, true);
  await audio.unlock();
  assert.equal(music.paused, true);
});

test('unsupported audio APIs do not break games', async () => {
  const audio = createGameAudio(undefined);
  await audio.unlock();
  audio.play('move');
  audio.setMuted(true);
  audio.dispose();
});
