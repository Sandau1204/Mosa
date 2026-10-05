'use client';

import React, { useState } from 'react';
import { avatarImageUrl } from '../shared/discord-avatar';
import { isDiscordActivity } from '../shared/games-auth';

export default function DiscordAvatar({ src, alt = '', ...props }) {
  const activity = typeof window !== 'undefined' && isDiscordActivity({
    search: window.location.search,
    hostname: window.location.hostname,
    embedded: window.self !== window.top,
    hasOpener: Boolean(window.opener)
  });
  const imageUrl = avatarImageUrl(src, activity);
  const [failures, setFailures] = useState({ source: null, urls: [] });
  const failedUrls = failures.source === imageUrl ? failures.urls : [];
  // On the web, a CDN request can still succeed if the backend proxy is down.
  // Activity must keep using its mapped same-origin URL.
  const candidates = [...new Set([imageUrl, ...(!activity && src !== imageUrl ? [src] : [])])].filter(Boolean);
  const currentUrl = candidates.find(url => !failedUrls.includes(url));
  if (!currentUrl) {
    return (
      <svg {...props} viewBox="0 0 64 64" role="img" aria-label={alt || 'Avatar'}>
        <rect width="64" height="64" rx="32" fill="#5865f2" />
        <circle cx="32" cy="24" r="11" fill="#fff" />
        <path d="M12 58a20 20 0 0 1 40 0" fill="#fff" />
      </svg>
    );
  }
  return <img {...props} src={currentUrl} alt={alt} referrerPolicy="no-referrer"
    onError={() => setFailures(previous => ({ source: imageUrl,
      urls: [...(previous.source === imageUrl ? previous.urls : []), currentUrl] }))} />;
}
