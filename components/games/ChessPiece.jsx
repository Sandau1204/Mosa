import React from 'react';

const PIECE_NAMES = { p: 'Tốt', n: 'Mã', b: 'Tượng', r: 'Xe', q: 'Hậu', k: 'Vua' };

// Inline vectors keep pieces available even when external images are blocked.
export default function ChessPiece({ type, side }) {
  const isWhite = side === 'white';
  const detail = isWhite ? '#292524' : '#faf5e9';

  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={`${PIECE_NAMES[type]} ${isWhite ? 'trắng' : 'đen'}`}
      className="w-[90%] h-[90%] pointer-events-none"
    >
      <g fill={isWhite ? '#faf5e9' : '#292524'} stroke={detail} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {type === 'p' && <>
          <path d="M18 22h12l-2 7 5 8H15l5-8z" />
          <circle cx="24" cy="15" r="7" />
        </>}
        {type === 'n' && <>
          <path d="M13 37c0-8 7-11 10-16l-9 5-5-5 8-10 1-6 6 5c12 1 15 12 12 27z" />
          <path d="M27 16c5 6 4 12 1 16" fill="none" />
          <circle cx="20" cy="15" r="1.5" fill={detail} stroke="none" />
        </>}
        {type === 'b' && <>
          <path d="M19 25h10l-2 5 7 7H14l7-7z" />
          <path d="M24 6c-3 4-10 9-10 14a10 7 0 0 0 20 0c0-5-7-10-10-14z" />
          <path d="m26 12-5 9" fill="none" />
          <circle cx="24" cy="5" r="2" />
        </>}
        {type === 'r' && <>
          <path d="M17 20h14v11l4 6H13l4-6z" />
          <path d="M12 9h6v6h4V9h4v6h4V9h6v13H12z" />
          <path d="M17 29h14" fill="none" />
        </>}
        {type === 'q' && <>
          <path d="m11 13 7 7 6-10 6 10 7-7-6 17H17z" />
          <path d="M17 30h14l3 7H14z" />
          <circle cx="10" cy="11" r="2.5" />
          <circle cx="24" cy="7" r="2.5" />
          <circle cx="38" cy="11" r="2.5" />
        </>}
        {type === 'k' && <>
          <path d="M24 3v10m-4-6h8" fill="none" />
          <path d="M17 29c-2-6-7-8-5-13 2-5 8-4 12 0 4-4 10-5 12 0 2 5-3 7-5 13z" />
          <path d="M17 29h14l3 8H14z" />
          <path d="M24 16v10" fill="none" />
        </>}
        <path d="M14 37h20l3 5H11z" />
      </g>
    </svg>
  );
}
