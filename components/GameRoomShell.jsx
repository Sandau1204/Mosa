'use client';

import React from 'react';
import { Clock, Eye, Flag, Handshake, LogOut, Sliders, Swords } from 'lucide-react';

export default function GameRoomShell({
  room,
  t,
  matchStarted,
  movesLog,
  spectatorsList,
  renderPlayerProfile,
  onExit,
  onSettings,
  onOfferDraw,
  onResign,
  noSpectatorsLabel,
  children
}) {
  return (
    <main className="flex-1 overflow-y-auto lg:overflow-hidden p-2 sm:p-4 flex flex-col gap-3 bg-slate-950 relative custom-scrollbar">
      <div className="bg-slate-900 border-4 border-slate-950 rounded-2xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onExit} className="px-3 py-1.5 sm:py-2 bg-rose-500 hover:bg-rose-400 text-white font-black text-[10px] sm:text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center gap-1.5 uppercase">
            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t.exitRoom}</span>
          </button>
          <button onClick={onSettings} className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all" title={t.settingsTitle}><Sliders className="w-4 h-4" /></button>
          <div className="text-slate-300">
            <h2 className="font-black text-[11px] sm:text-sm text-yellow-400 flex items-center gap-1.5 sm:gap-2"><span className="truncate max-w-[120px] sm:max-w-[200px]">{room.name}</span><span className="text-[9px] sm:text-[10px] bg-slate-950 text-cyan-400 border border-slate-800 px-1.5 sm:px-2 py-0.5 rounded-md shrink-0">PvP 1v1</span></h2>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_1fr_auto] gap-3 lg:gap-4 min-h-0 relative z-10 pb-6 lg:pb-0">
        <div className="order-1 lg:order-none lg:col-start-4 lg:col-span-6 lg:row-start-1 lg:row-span-3 flex flex-col items-center justify-center bg-slate-900 border-4 border-slate-950 rounded-2xl p-2 sm:p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative w-full lg:min-h-0">
          <div className="w-full h-full max-h-[75vh] flex items-center justify-center">{children}</div>
        </div>

        <div className="lg:hidden order-2 grid grid-cols-2 gap-2 shrink-0">
          {renderPlayerProfile(true)}
          {renderPlayerProfile(false)}
        </div>

        <div className="order-3 lg:order-none lg:col-start-1 lg:col-span-3 lg:row-start-1 lg:row-span-1 bg-slate-900 border-4 border-slate-950 rounded-2xl p-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2.5 shrink-0">
          <div className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" /> Thao Tác Trận Đấu</div>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!matchStarted} onClick={onOfferDraw} className={`py-2 px-1.5 sm:px-3 font-black text-[10px] sm:text-xs rounded-xl border-2 transition-all flex items-center justify-center gap-1 sm:gap-2 uppercase ${matchStarted ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5' : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'}`}>
              <Handshake className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">{t.offerDraw}</span>
            </button>
            <button disabled={!matchStarted} onClick={onResign} className={`py-2 px-1.5 sm:px-3 font-black text-[10px] sm:text-xs rounded-xl border-2 transition-all flex items-center justify-center gap-1 sm:gap-2 uppercase ${matchStarted ? 'bg-rose-600 hover:bg-rose-500 text-white border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5' : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'}`}>
              <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">{t.resign}</span>
            </button>
          </div>
        </div>

        <div className="order-4 lg:order-none lg:col-start-10 lg:col-span-3 lg:row-start-2 lg:row-span-1 bg-slate-900 border-4 border-slate-950 rounded-2xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-[200px] lg:min-h-0 lg:overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b-2 border-slate-950 mb-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" /> {t.movesHistory}</span>
            <span className="text-[9px] sm:text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">{movesLog.length} Nước</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar text-[10px] sm:text-xs pr-1">
            {movesLog.map((move) => (
              <div key={move.id} className="grid grid-cols-12 gap-1 p-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[10px] sm:text-[11px]">
                <span className="col-span-2 text-slate-500 font-bold">#{move.id}</span>
                <span className="col-span-5 text-red-400 font-bold truncate">{move.red}</span>
                <span className="col-span-5 text-yellow-300 font-bold truncate">{move.black}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="order-5 lg:order-none lg:col-start-1 lg:col-span-3 lg:row-start-2 lg:row-span-2 bg-slate-900 border-4 border-slate-950 rounded-2xl p-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-[200px] lg:min-h-0 lg:overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b-2 border-slate-950 mb-2 shrink-0">
            <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" /> {t.spectatorsList}</span>
            <span className="bg-slate-950 text-cyan-400 text-[9px] sm:text-[10px] font-mono font-black px-2 py-0.5 rounded-full border border-slate-800">{spectatorsList.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {spectatorsList.map((spectator) => (
              <div key={spectator.id} className="p-2 bg-slate-950 border-2 border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <img src={spectator.avatar} alt={spectator.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-950 object-cover shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0" />
                  <div className="min-w-0"><div className="text-[10px] sm:text-xs font-extrabold text-slate-200 leading-tight truncate">{spectator.name}</div>{spectator.elo != null && <div className="text-[8px] sm:text-[9px] font-mono text-slate-400">{spectator.elo} ELO</div>}</div>
                </div>
                <span className="text-[8px] sm:text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 font-bold shrink-0">Khán Giả</span>
              </div>
            ))}
            {spectatorsList.length === 0 && <p className="py-2 text-xs font-semibold text-slate-500">{noSpectatorsLabel}</p>}
          </div>
        </div>

        <div className="hidden lg:flex lg:col-start-10 lg:col-span-3 lg:row-start-1 lg:row-span-1 shrink-0">
          {renderPlayerProfile(true)}
        </div>

        <div className="hidden lg:flex lg:col-start-10 lg:col-span-3 lg:row-start-3 lg:row-span-1 shrink-0">
          {renderPlayerProfile(false)}
        </div>
      </div>
    </main>
  );
}
