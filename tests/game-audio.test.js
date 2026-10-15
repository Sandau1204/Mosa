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
    assert.ok(notes > mutedNotes);
  } finally { audio.dispose(); }
  assert.equal(closed, true);
  await audio.unlock();
  assert.equal(created, 1);
});

test('unsupported audio APIs do not break games', async () => {
  const audio = createGameAudio(undefined);
  await audio.unlock();
  audio.play('move');
  audio.setMuted(true);
  audio.dispose();
});
