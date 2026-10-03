'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, LogOut, Zap } from 'lucide-react';
import board from './monopoly-board.json';

const colors = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
const money = value => `${(value / 10).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} TR`;

export default function MonopolyRoom({ room, userId, apiBase, request, onExit }) {
  const [snapshot, setSnapshot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const sequence = useRef(0);
  const endpoint = `${apiBase}/rooms/${encodeURIComponent(room.id)}/monopoly`;
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const result = await request(`${endpoint}?guild_id=${encodeURIComponent(room.guildId)}`);
      if (current === sequence.current) { setSnapshot(result); setError(''); }
    } catch (err) {
      if (current === sequence.current) setError(err.message);
    }
  }, [endpoint, request, room.guildId]);
  useEffect(() => {
    refresh();
    const timer = setInterval(() => { if (!pending.current) refresh(); }, 2000);
    return () => { clearInterval(timer); sequence.current++; };
  }, [refresh]);
  const action = async name => {
    if (pending.current) return;
    pending.current = true;
    sequence.current++;
    setBusy(true);
    setError('');
    try {
      const result = await request(endpoint, { method: 'POST', body: JSON.stringify({ guild_id: room.guildId, action: name, revision: snapshot?.state?.revision }) });
      setSnapshot(result);
    } catch (err) { setError(err.message); }
    finally { pending.current = false; setBusy(false); }
  };
  const state = snapshot?.state;
  const players = state?.players || (snapshot?.players || []).map(p => ({ ...p, position: 13, money: 200 }));
  const active = players.find(p => p.id === state?.turn);
  const myTurn = state?.turn === String(userId) && state?.phase !== 'finished';
  const winner = players.find(p => p.id === state?.winner);
  const currentCell = Object.values(board).flat().find(cell => cell.id === active?.position);
  const canBuy = currentCell?.price && active?.money >= Number(currentCell.price.split(' ')[0].replace(',', '.')) * 10;

  const renderCell = (cell, column, row) => {
    const owner = players.findIndex(p => p.id === state?.owners[String(cell.id)]);
    return <div key={cell.id} style={{ gridColumn: column, gridRow: row }} title={`${cell.name}${owner >= 0 ? ` · Chủ: ${players[owner].name}` : ''}`} className={`relative min-w-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm flex flex-col ${cell.bg || 'bg-white'}`}>
      {cell.color ? <div className={`${cell.color} text-white text-[7px] sm:text-[8px] font-black text-center py-0.5 truncate px-1`}>{cell.district}</div> : cell.topBar ? <div className={`${cell.topBar} h-1.5 shrink-0`} /> : null}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-1 py-0.5 gap-0.5">
        <span className="text-xl sm:text-2xl" aria-hidden="true">{cell.icon}</span>
        <span className="text-[8px] sm:text-[10px] font-bold text-slate-800 leading-tight">{cell.name}</span>
        {cell.price && <span className={`text-[8px] sm:text-[10px] font-black rounded-full px-1.5 border ${cell.isPremium ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{cell.price}</span>}
        {cell.desc && <span className="text-[7px] text-slate-500 font-bold">{cell.desc}</span>}
      </div>
      <div className="absolute bottom-0.5 left-0.5 right-0.5 flex justify-center gap-0.5 flex-wrap">
        {players.map((p, index) => !p.bankrupt && p.position === cell.id && <span key={p.id} title={p.name} aria-label={`${p.name} ở ${cell.name}`} className={`${colors[index]} w-4 h-4 rounded-full border-2 border-white shadow text-[8px] text-white text-center font-bold`}>{index + 1}</span>)}
      </div>
      {owner >= 0 && <span className={`${colors[owner]} absolute top-0 right-0 w-2 h-2 rounded-bl`} aria-label={`Đất của ${players[owner].name}`} />}
    </div>;
  };

  return <main className="flex-1 min-w-0 overflow-y-auto bg-slate-950 p-3 sm:p-5 space-y-4">
    <header className="flex items-center justify-between gap-3 text-white">
      <div><h1 className="text-lg font-black text-amber-300">🛵 CỜ TỶ PHÚ SÀI GÒN</h1><p className="text-sm text-slate-400">{room.name} · {players.length}/6 người · PvP</p></div>
      <button disabled={busy} onClick={async () => { setBusy(true); await onExit(); }} className="flex items-center gap-2 rounded-xl bg-rose-500 px-3 py-2 font-bold text-sm"><LogOut size={16} /> Rời phòng</button>
    </header>
    {error && <p role="alert" className="bg-rose-950 text-rose-200 p-3 rounded-xl">{error}</p>}
    <div className="grid xl:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start max-w-[1250px] mx-auto">
      <div className="overflow-x-auto pb-2">
        <div style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }} className="grid grid-cols-7 gap-1 p-2 rounded-3xl bg-slate-50 shadow-2xl min-w-[560px] w-full aspect-[1.15]">
          {board.top.map((cell, i) => renderCell(cell, i + 1, 1))}
          {board.right.map((cell, i) => renderCell(cell, 7, i + 2))}
          {board.bottom.map((cell, i) => renderCell(cell, i + 1, 7))}
          {board.left.map((cell, i) => renderCell(cell, 1, i + 2))}
          <section className="col-start-2 col-span-5 row-start-2 row-span-5 m-1 p-3 sm:p-5 rounded-2xl border-2 border-dashed border-amber-200 bg-gradient-to-br from-white to-slate-100 flex flex-col items-center justify-between gap-3 text-slate-800">
            <div className="text-center"><span className="inline-block rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 text-xs font-black">🛵 CỜ TỶ PHÚ SÀI GÒN</span><p className="font-bold text-sm mt-3" aria-live="polite">{state?.phase === 'finished' ? `🏆 ${winner?.name || 'Không có người chơi'} chiến thắng!` : state ? `Lượt của ${active?.name}` : 'Chờ chủ phòng bắt đầu'}</p></div>
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-3" aria-label={`Xúc xắc: ${state?.dice.join(', ') || '1, 1'}`}>{(state?.dice || [1, 1]).map((value, i) => <span key={i} className={`w-14 h-14 rounded-2xl border-4 border-amber-400 bg-white text-3xl font-black text-amber-500 flex items-center justify-center shadow-[0_4px_0_#fbbf24] ${busy ? 'animate-pulse' : ''}`}>{value}</span>)}</div>
              {!state ? <button disabled={busy || !snapshot || snapshot.hostId !== String(userId) || players.length < 2} onClick={() => action('start')} className="rounded-full bg-rose-500 px-5 py-3 text-white font-black text-sm disabled:opacity-40">BẮT ĐẦU TRẬN</button> : state.phase === 'buy' ? <div className="text-center space-y-2"><p className="text-xs font-bold">{currentCell?.name} · {currentCell?.price}</p><div className="flex gap-2"><button disabled={busy || !myTurn || !canBuy} onClick={() => action('buy')} className="rounded-full bg-emerald-600 px-4 py-2 text-white text-sm font-bold disabled:opacity-40">Mua đất</button><button disabled={busy || !myTurn} onClick={() => action('skip')} className="rounded-full bg-slate-600 px-4 py-2 text-white text-sm font-bold disabled:opacity-40">Bỏ qua</button></div></div> : <button disabled={busy || !myTurn} onClick={() => action('roll')} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-3 text-white font-black text-sm shadow-[0_4px_0_#e11d48] disabled:opacity-40"><Zap size={16} /> ĐỔ XÚC XẮC 🎲</button>}
              {!state && <p className="text-xs text-slate-500">Cần 2–6 người chơi để bắt đầu.</p>}
            </div>
            <div className="w-full rounded-xl border border-slate-200 bg-white p-2 text-[10px] text-slate-500"><p className="font-bold flex gap-1 items-center mb-1"><Clock size={12} /> NHẬT KÝ TRÒ CHƠI</p><p className="truncate" aria-live="polite">{state?.log.at(-1) || 'Mời bạn bè tham gia phòng để cùng chơi!'}</p></div>
          </section>
        </div>
        <p className="sm:hidden text-xs text-slate-400 mt-2">Vuốt ngang để xem toàn bộ bàn cờ.</p>
      </div>
      <aside className="space-y-4">
        <section className="bg-slate-900 rounded-2xl p-4 space-y-3"><h2 className="font-black text-white text-sm">NGƯỜI CHƠI</h2>{!snapshot && <p className="text-slate-400 text-sm">Đang tải phòng…</p>}{players.map((p, index) => <div key={p.id} className={`rounded-xl p-3 border ${state?.turn === p.id && state?.phase !== 'finished' ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700'} ${p.bankrupt ? 'opacity-50' : ''}`}><div className="flex items-center gap-2"><span className={`${colors[index]} rounded-full w-5 h-5 text-center text-xs text-white font-bold`}>{index + 1}</span><span className="text-white font-bold text-sm truncate">{p.name}{p.id === String(userId) ? ' (Bạn)' : ''}</span></div><p className="text-emerald-400 text-sm mt-2 font-bold">{p.bankrupt ? 'Đã phá sản' : money(p.money)} <span className="text-slate-400 font-normal">· {Object.values(state?.owners || {}).filter(id => id === p.id).length} tài sản</span></p></div>)}</section>
        <details className="rounded-2xl p-4 bg-slate-900 text-xs text-slate-300"><summary className="cursor-pointer font-bold text-amber-300">Luật chơi rút gọn</summary><p className="mt-3 leading-relaxed">Mỗi người có 20 TR. Đi theo chiều kim đồng hồ; qua PHÁT nhận 2 TR. Mua đất khi đến ô chưa có chủ, tiền thuê bằng 20% giá đất. Thuế 1,5 TR; vượt đèn đỏ phạt 1 TR và chuyển đến bót cảnh sát. Thẻ ngẫu nhiên cộng hoặc trừ tiền. Không đủ tiền trả thì phá sản; người cuối cùng còn lại thắng. Chưa áp dụng xây nhà, thế chấp, trao đổi đất hoặc lượt thêm khi đổ đôi. Rời trận tính là phá sản; chủ phòng rời sẽ đóng phòng.</p></details>
        <section className="rounded-2xl p-4 bg-slate-900"><h2 className="text-sm text-white font-bold mb-3">Nhật ký</h2><ol className="max-h-52 overflow-y-auto space-y-2 text-xs text-slate-400">{state?.log.map((entry, index) => <li key={index}>{entry}</li>)}</ol></section>
      </aside>
    </div>
  </main>;
}
