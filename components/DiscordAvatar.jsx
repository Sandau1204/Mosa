'use client';

import React, { useState } from 'react';

export default function DiscordAvatar({ src, alt = '', ...props }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) {
    return (
      <svg {...props} viewBox="0 0 64 64" role="img" aria-label={alt || 'Avatar'}>
        <rect width="64" height="64" rx="32" fill="#5865f2" />
        <circle cx="32" cy="24" r="11" fill="#fff" />
        <path d="M12 58a20 20 0 0 1 40 0" fill="#fff" />
      </svg>
    );
  }
  return <img {...props} src={src} alt={alt} referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} />;
}
