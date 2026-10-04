'use client';

import React from 'react';
import ChessPiece from './ChessPiece';

const ChessRoom = ({ board, isFlipped = false, isPlaying = false, activeSide, playerSide, selectedPiece, legalMoves, allLegalMoves = [], checkSide, pendingPromotion, lang = 'VI', onPromote, onCancelPromotion, onSelectPiece, onMove }) => {
  const findPiece = (x, y) => board.find(piece => piece.x === x && piece.y === y);
  const canMove = isPlaying && playerSide === activeSide && !pendingPromotion;
  const isLegalDestination = (x, y) => legalMoves.some(move => move.x === x && move.y === y);

  return (
    <>
    <div className={`relative w-[min(100%,600px,75vh)] lg:w-[min(100%,600px,100cqh)] aspect-square shrink-0 bg-[#F3D7B6] border-[8px] sm:border-[12px] md:border-[16px] border-[#C36F5A] rounded-sm shadow-2xl ${isFlipped ? 'rotate-180' : ''}`}>
      <div className="absolute inset-0 border-2 border-[#8A3A2B] grid grid-cols-8 grid-rows-8 shadow-[inset_0_0_15px_rgba(0,0,0,0.3)]">
        {Array.from({ length: 64 }).map((_, i) => {
          const x = i % 8;
          const y = Math.floor(i / 8);
          const isDark = (x + y) % 2 === 1;
          const piece = findPiece(x, y);
          const isDestination = isLegalDestination(x, y);
          const isSelectable = canMove && piece?.side === playerSide && allLegalMoves.some(move => move.fromX === x && move.fromY === y);
          const isSelected = selectedPiece?.x === x && selectedPiece?.y === y;

          return (
            <div
              key={`cell-${x}-${y}`}
              onClick={() => { if (canMove && isDestination && selectedPiece) onMove(selectedPiece.x, selectedPiece.y, x, y); else if (isSelectable && piece) onSelectPiece(x, y); }}
              className={`relative flex items-center justify-center ${isDark ? 'bg-[#C36F5A]' : 'bg-[#F3D7B6]'} ${isSelectable ? 'cursor-pointer' : ''}`}
            >
              {piece?.type === 'k' && piece.side === checkSide && <div className="absolute inset-0 bg-red-600/60 ring-2 ring-inset ring-red-500 z-10" />}
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
    {pendingPromotion && (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 rounded-xl">
        <section role="dialog" aria-modal="true" aria-labelledby="chess-promotion-title" className="bg-slate-900 border-2 border-slate-700 rounded-xl p-4 text-center shadow-xl">
          <h3 id="chess-promotion-title" className="font-bold text-white mb-3">{lang === 'VI' ? 'Chọn quân phong cấp' : 'Choose promotion'}</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {pendingPromotion.options.map(type => (
              <button key={type} autoFocus={type === 'q'} onClick={() => onPromote(type)} disabled={!isPlaying} className="w-14 rounded-lg bg-slate-700 hover:bg-slate-600 p-1 disabled:opacity-50">
                <span className="flex w-12 h-12 items-center justify-center"><ChessPiece type={type} side={playerSide} /></span>
                <span className="text-xs text-white">{(lang === 'VI' ? { q: 'Hậu', r: 'Xe', b: 'Tượng', n: 'Mã' } : { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' })[type]}</span>
              </button>
            ))}
          </div>
          <button onClick={onCancelPromotion} className="mt-3 text-sm text-slate-300 hover:text-white">{lang === 'VI' ? 'Hủy' : 'Cancel'}</button>
        </section>
      </div>
    )}
    </>
  );
};


export default ChessRoom;
