import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avatarImageUrl } from '../shared/discord-avatar.js';

test('Discord avatar uses same-origin API on web and Activity', () => {
  const src = 'https://cdn.discordapp.com/avatars/123/a_abcdef.gif?size=1024';
  assert.equal(avatarImageUrl(src), '/api/games/avatars/avatars/123/a_abcdef.gif');
  assert.equal(avatarImageUrl(src, true), '/.proxy/api/games/avatars/avatars/123/a_abcdef.gif');
  assert.equal(avatarImageUrl('https://cdn.discordapp.com/embed/avatars/0.png'), '/api/games/avatars/embed/avatars/0.png');
  assert.equal(avatarImageUrl('https://media.discordapp.net/avatars/123/abcdef.webp'), '/api/games/avatars/avatars/123/abcdef.webp');
  assert.equal(avatarImageUrl('/local-avatar.png'), '/local-avatar.png');
  assert.equal(avatarImageUrl(null), '');
});
