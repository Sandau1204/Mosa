'use client';

import React from 'react';
import ChessPiece from './ChessPiece';

const ChessRoom = ({ board, isFlipped = false, isPlaying = false, activeSide, playerSide, selectedPiece, legalMoves, onSelectPiece, onMove }) => {
  const findPiece = (x, y) => board.find(piece => piece.x === x && piece.y === y);
  const canMove = isPlaying && (!playerSide || playerSide === activeSide);
  const isLegalDestination = (x, y) => legalMoves.some(move => move.x === x && move.y === y);

  return (
    <div className={`@container relative w-full max-w-[600px] aspect-square bg-[#F3D7B6] border-[8px] sm:border-[12px] md:border-[16px] border-[#C36F5A] rounded-sm shadow-2xl p-0 flex flex-col justify-center items-center ${isFlipped ? 'rotate-180' : ''}`}>
      <div className="relative w-full h-full border-2 border-[#8A3A2B] shrink-0 grid grid-cols-8 grid-rows-8 shadow-[inset_0_0_15px_rgba(0,0,0,0.3)]">
        {Array.from({ length: 64 }).map((_, i) => {
          const x = i % 8;
          const y = Math.floor(i / 8);
          const isDark = (x + y) % 2 === 1;
          const piece = findPiece(x, y);
          const isDestination = isLegalDestination(x, y);
          const isSelectable = canMove && (!playerSide || piece?.side === playerSide) && piece?.side === activeSide;
          const isSelected = selectedPiece?.x === x && selectedPiece?.y === y;

          return (
             <div
               key={`cell-${x}-${y}`}
               onClick={() => { if (isDestination) onMove(selectedPiece.x, selectedPiece.y, x, y); else if (isSelectable && piece) onSelectPiece(x, y); }}
               className={`relative flex items-center justify-center ${isDark ? 'bg-[#C36F5A]' : 'bg-[#F3D7B6]'} ${isSelectable ? 'cursor-pointer' : ''}`}
             >
               {isSelected && <div className="absolute inset-0 bg-yellow-400/50 z-10" />}
               {isDestination && ( <div className={`absolute z-20 rounded-full ${piece ? 'w-[80%] h-[80%] border-[6px] border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'w-[30%] h-[30%] bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.8)]'}`} /> )}
               {piece && (
                 <div className={`absolute inset-0 flex items-center justify-center filter drop-shadow-[0_5px_4px_rgba(0,0,0,0.6)] select-none transition-transform ${isSelectable ? 'hover:scale-110 z-40' : 'z-30'} ${isFlipped ? 'rotate-180' : ''}`}>
                   <ChessPiece type={piece.type} side={piece.side} />
                 </div>
               )}
             </div>
          )
        })}
      </div>
    </div>
  );
};


export default ChessRoom;
