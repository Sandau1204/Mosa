export function avatarImageUrl(src, activity = false) {
  if (!src) return '';
  try {
    const url = new URL(src);
    if (url.protocol === 'https:' && ['cdn.discordapp.com', 'media.discordapp.net'].includes(url.hostname)) {
      return `${activity ? '/.proxy' : ''}/api/games/avatars${url.pathname}`;
    }
  } catch {
    // Relative local images can still be used directly.
  }
  return src;
}
