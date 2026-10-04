import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDiscordActivity, waitForDiscordReady } from '../shared/games-auth.js';

const launch = '?frame_id=frame&instance_id=instance&platform=desktop';
test('regular web pages and preview iframes use web OAuth', () => {
  assert.equal(isDiscordActivity({ search: '', hostname: 'mosa.test', embedded: false }), false);
  assert.equal(isDiscordActivity({ search: '', hostname: 'mosa.test', embedded: true }), false);
  assert.equal(isDiscordActivity({ search: launch, hostname: 'mosa.test', embedded: false }), false);
});
test('server, DM, mobile, and popout Activities use the SDK', () => {
  for (const search of [launch, `${launch}&guild_id=123`, launch.replace('desktop', 'mobile')]) {
    assert.equal(isDiscordActivity({ search, hostname: '123.discordsays.com', embedded: true }), true);
  }
  assert.equal(isDiscordActivity({ search: launch, hostname: 'localhost', hasOpener: true }), true);
  assert.equal(isDiscordActivity({ search: launch, hostname: '123.discordsays.com', embedded: false }), true);
});
test('SDK readiness succeeds or times out instead of hanging', async () => {
  await waitForDiscordReady({ ready: () => Promise.resolve() }, 10);
  await assert.rejects(waitForDiscordReady({ ready: () => new Promise(() => {}) }, 10), /timed out/);
});
