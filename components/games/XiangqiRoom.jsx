'use client';

import React from 'react';

const XiangqiRoom = ({ pieceLabels, board, isFlipped = false, isPlaying = false, activeSide, playerSide, selectablePieces = [], selectedPiece, legalMoves, checkSide, lang = 'VI', onSelectPiece, onMove }) => {
  const findPiece = (x, y) => board.find(piece => piece.x === x && piece.y === y);
  const canMove = isPlaying && playerSide === activeSide;
  const isLegalDestination = (x, y) => canMove && selectedPiece && legalMoves.some(move => move.x === x && move.y === y);

  return (
    <>
    {isPlaying && checkSide && <div role="alert" aria-live="assertive" className="rounded-xl bg-rose-950 px-4 py-2 text-center font-bold text-rose-100">
      {lang === 'VI' ? `${checkSide === playerSide ? 'Bạn' : checkSide === 'red' ? 'Bên đỏ' : 'Bên đen'} đang bị chiếu tướng! Chỉ được đi nước cứu tướng.` : `${checkSide === playerSide ? 'You are' : checkSide === 'red' ? 'Red is' : 'Black is'} in check! Only moves that save the general are allowed.`}
    </div>}
    <div className={`@container relative w-[min(100%,66.6667vh)] max-w-[600px] aspect-[8/9] bg-amber-100/95 border-2 sm:border-4 border-amber-900 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 lg:p-5 shadow-[inset_0_0_20px_rgba(120,53,15,0.4),0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-500 flex flex-col justify-center items-center ${isFlipped ? 'rotate-180' : ''}`}>
      <div className="relative w-full h-full border-2 border-amber-950 shrink-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={`h-${i}`} className="absolute w-full h-[1px] bg-amber-950/80" style={{ top: `${(i / 9) * 100}%` }} />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <React.Fragment key={`v-${i}`}>
            <div className="absolute w-[1px] bg-amber-950/80" style={{ left: `${(i / 8) * 100}%`, top: '0%', height: `${(4 / 9) * 100}%` }} />
            <div className="absolute w-[1px] bg-amber-950/80" style={{ left: `${(i / 8) * 100}%`, top: `${(5 / 9) * 100}%`, height: `${(4 / 9) * 100}%` }} />
            {(i === 0 || i === 8) && (
              <div className="absolute w-[1px] bg-amber-950/80" style={{ left: `${(i / 8) * 100}%`, top: `${(4 / 9) * 100}%`, height: `${(1 / 9) * 100}%` }} />
            )}
          </React.Fragment>
        ))}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="37.5" y1="0" x2="62.5" y2="22.22" stroke="#451a03" strokeWidth="0.6" />
          <line x1="62.5" y1="0" x2="37.5" y2="22.22" stroke="#451a03" strokeWidth="0.6" />
          <line x1="37.5" y1="77.78" x2="62.5" y2="100" stroke="#451a03" strokeWidth="0.6" />
          <line x1="62.5" y1="77.78" x2="37.5" y2="100" stroke="#451a03" strokeWidth="0.6" />
        </svg>
        <div className="absolute top-[44.44%] left-0 right-0 h-[11.11%] flex justify-around items-center px-4 pointer-events-none text-amber-950/70 font-serif font-black text-xs sm:text-sm md:text-base tracking-widest">
          <span className={isFlipped ? 'rotate-180' : ''}>楚 河</span>
          <span className={isFlipped ? 'rotate-180' : ''}>漢 界</span>
        </div>
        {Array.from({ length: 10 }, (_, y) =>
          Array.from({ length: 9 }, (_, x) => {
            const piece = findPiece(x, y);
            const isDestination = isLegalDestination(x, y);
            if (!isDestination && !piece) return null;
            if (isDestination && !piece) {
              return (
                <button
                  key={`move-${x}-${y}`}
                  aria-label={`Move to ${x}, ${y}`}
                  onClick={() => onMove(selectedPiece.x, selectedPiece.y, x, y)}
                  className={`absolute z-20 h-[clamp(8px,3.8cqw,16px)] w-[clamp(8px,3.8cqw,16px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-800/80 bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.8)] hover:scale-125 transition-transform`}
                  style={{ left: `${(x / 8) * 100}%`, top: `${(y / 9) * 100}%` }}
                />
              );
            }
            const isCurrentSide = !playerSide || piece.side === playerSide;
            const isSelectable = canMove && isCurrentSide && piece.side === activeSide && (selectablePieces?.some(position => position.x === x && position.y === y) ?? true);
            const isSelected = selectedPiece?.x === x && selectedPiece?.y === y;
            const isCheckedKing = piece.type === 'K' && piece.side === checkSide;
            return (
              <button
                key={`piece-${x}-${y}`}
                onClick={() => { if (isDestination) onMove(selectedPiece.x, selectedPiece.y, x, y); else if (isSelectable) onSelectPiece(x, y); }}
                disabled={!isSelectable && !isDestination}
                className={`absolute z-20 flex aspect-square w-[clamp(24px,8cqw,48px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-serif text-[clamp(14px,4cqw,24px)] font-black shadow-[3px_3px_0px_rgba(0,0,0,0.6)] transition-all
                  ${piece.side === 'red' ? 'border-red-700 bg-amber-50 text-red-600' : 'border-slate-300 bg-slate-900 text-amber-200'}
                  ${isSelectable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                  ${isSelected ? 'ring-2 sm:ring-4 ring-emerald-400 scale-105' : ''}
                  ${isDestination ? 'ring-2 sm:ring-4 ring-emerald-500' : ''}
                  ${isCheckedKing ? 'animate-check-pulse ring-2 sm:ring-4 ring-rose-500' : ''}`}
                style={{ left: `${(x / 8) * 100}%`, top: `${(y / 9) * 100}%` }}
              >
                <span className={isFlipped ? 'rotate-180' : ''}>{pieceLabels[piece.type][piece.side]}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
    </>
  );
};

export default XiangqiRoom;
