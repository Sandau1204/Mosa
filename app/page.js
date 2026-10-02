'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isActivity = params.has('frame_id') && params.has('instance_id');
    const target = (isActivity ? '/games' : '/panel') + window.location.search + window.location.hash;
    setDestination(target);
    window.location.replace(target);
  }, []);

  return (
    <main>
      <p>Đang chuyển hướng...</p>
      {destination && <a href={destination}>Tiếp tục vào Mosa</a>}
      <noscript><a href="/games">Mosa Games</a></noscript>
    </main>
  );
}
