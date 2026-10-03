'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Clock, Crown, Dice5, Eye, LogOut, SlidersHorizontal, Swords, Users, Zap } from 'lucide-react';
import board from './monopoly-board.json';
import styles from './MonopolyRoom.module.css';

const colors = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
const money = value => `${(value / 10).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} TR`;

export default function MonopolyRoom({ room, userId, apiBase, request, onExit }) {
  const [snapshot, setSnapshot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const boardSlot = useRef(null);
  const [boardScale, setBoardScale] = useState(0);
  const pending = useRef(false);
  const sequence = useRef(0);
  const endpoint = `${apiBase}/rooms/${encodeURIComponent(room.id)}/monopoly`;
  useEffect(() => {
    const slot = boardSlot.current;
    if (!slot) return;
    const resize = () => {
      setBoardScale(Math.max(0, Math.min(slot.clientWidth / 700, slot.clientHeight / (700 / 1.15), 1)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);
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

  const spectators = snapshot?.spectators || [];
  const seatedPlayers = (snapshot?.players || []).map(p => {
    const current = players.find(player => player.id === p.id);
    return current ? { ...current, ...p } : { ...p, money: 200 };
  });
  const me = seatedPlayers.find(p => p.id === String(userId));
  const waiting = !state || state.phase === 'finished';
  const canStart = snapshot?.hostId === String(userId) && seatedPlayers.length >= 2;
  const renderPlayer = p => {
    const index = seatedPlayers.findIndex(player => player.id === p.id);
    return <div key={p.id} className={`${styles.player} ${p.bankrupt ? styles.bankrupt : ''}`}>
      {p.avatar ? <img className={styles.avatar} src={p.avatar} alt="" /> : <span className={`${styles.avatar} ${colors[index]}`}>{p.name?.slice(0, 1)}</span>}
      <div className={styles.playerInfo}><strong title={p.name}>{p.name}{p.id === String(userId) ? ' (Bạn)' : ''} {p.id === snapshot?.hostId && <Crown size={13} className={styles.crown} />}</strong>
        <small>Người chơi {index + 1}{state && !waiting && (!players.some(player => player.id === p.id) || p.bankrupt) ? ' · Chờ ván sau' : state?.turn === p.id && !waiting ? ' · Đang chơi' : ''}</small>
        <b>{p.bankrupt ? 'Đã phá sản' : money(p.money)}</b>
        <small>{Object.values(state?.owners || {}).filter(id => id === p.id).length} tài sản</small>
      </div>
    </div>;
  };

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
      {owner >= 0 && <span className={`${colors[owner]} absolute top-0 right-0 w-2 h-2 rounded-bl`} title={`Đất của ${players[owner].name}`} />}
    </div>;
  };

  return <main className={`${styles.room} bg-slate-950`}>
    <header className={styles.header}>
      <button disabled={busy} onClick={async () => { setBusy(true); try { await onExit(); } catch (err) { setError(err.message); } finally { setBusy(false); } }} className={styles.exit}><LogOut size={16} /> THOÁT</button>
      <details className={styles.rules}><summary aria-label="Luật chơi" title="Luật chơi"><SlidersHorizontal size={18} /></summary><div><strong>Luật chơi Cờ Tỷ Phú</strong><p>Mỗi người có 20 TR. Qua PHÁT nhận 2 TR. Mua đất khi đến ô chưa có chủ; tiền thuê bằng 20% giá đất. Thuế 1,5 TR; vượt đèn đỏ phạt 1 TR và đến bót cảnh sát. Thẻ ngẫu nhiên cộng hoặc trừ tiền. Không đủ tiền trả thì phá sản; người cuối cùng còn lại thắng. Chưa áp dụng xây nhà, thế chấp, trao đổi đất hoặc lượt thêm khi đổ đôi. Rời trận tính là phá sản; chủ phòng rời sẽ đóng phòng.</p></div></details>
      <h1 title={room.name}>{room.name || 'Phòng Cờ Tỷ Phú'}</h1><span className={styles.badge}>Party 2–6</span>
    </header>
    {error && <p role="alert" className="shrink-0 max-h-16 overflow-y-auto break-words bg-rose-950 text-rose-200 p-2 text-xs rounded-xl">{error}</p>}
    <div className={styles.content}>
      <aside className={styles.leftSidebar}>
        <section className={`${styles.panel} ${styles.actions}`}>
          <h2><Swords size={15} /> THAO TÁC TRẬN ĐẤU</h2>
          <button className={styles.roll} disabled={busy || (waiting ? !canStart : !myTurn || state.phase !== 'roll')} onClick={() => action(waiting ? 'start' : 'roll')}><Dice5 size={20} /> {waiting ? (state ? 'BẮT ĐẦU VÁN MỚI' : 'BẮT ĐẦU TRẬN') : 'ĐỔ XÚC XẮC'}</button>
          <div className={styles.secondaryActions}><button className={styles.buy} disabled={busy || !myTurn || state?.phase !== 'buy' || !canBuy} onClick={() => action('buy')}><Building2 size={16} /> MUA ĐẤT</button><button className={styles.skip} disabled={busy || !myTurn || state?.phase !== 'buy'} onClick={() => action('skip')}>QUA LƯỢT</button></div>
        </section>
        <section className={`${styles.panel} ${styles.spectators}`}><h2><Eye size={15} /> KHÁN GIẢ / NGƯỜI XEM <span className={styles.count}>{spectators.length}</span></h2>
          {spectators.length ? spectators.map(p => <div className={styles.spectator} key={p.id}><span>{p.name}</span><small>Khán giả</small></div>) : <p className={styles.empty}>Chưa có khán giả trong phòng.</p>}
        </section>
      </aside>
      <div ref={boardSlot} className={styles.boardSlot}>
        <div style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))', width: 700, height: 700 / 1.15, transform: `translate(-50%, -50%) scale(${boardScale})`, visibility: boardScale ? 'visible' : 'hidden' }} className={`${styles.board} grid grid-cols-7 gap-1 p-2 rounded-3xl bg-slate-50 shadow-2xl`}>
          {board.top.map((cell, i) => renderCell(cell, i + 1, 1))}
          {board.right.map((cell, i) => renderCell(cell, 7, i + 2))}
          {board.bottom.map((cell, i) => renderCell(cell, i + 1, 7))}
          {board.left.map((cell, i) => renderCell(cell, 1, i + 2))}
          <section className="col-start-2 col-span-5 row-start-2 row-span-5 m-1 p-3 sm:p-5 rounded-2xl border-2 border-dashed border-amber-200 bg-gradient-to-br from-white to-slate-100 flex flex-col items-center justify-between gap-3 text-slate-800">
            <div className="text-center"><span className="inline-block rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 text-xs font-black">🛵 CỜ TỶ PHÚ SÀI GÒN</span><p className="font-bold text-sm mt-3" aria-live="polite">{state?.phase === 'finished' ? `🏆 ${winner?.name || 'Không có người chơi'} chiến thắng!` : state ? `Lượt của ${active?.name}` : 'Chờ chủ phòng bắt đầu'}</p></div>
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-3" aria-label={`Xúc xắc: ${state?.dice.join(', ') || '1, 1'}`}>{(state?.dice || [1, 1]).map((value, i) => <span key={i} className={`w-14 h-14 rounded-2xl border-4 border-amber-400 bg-white text-3xl font-black text-amber-500 flex items-center justify-center shadow-[0_4px_0_#fbbf24] ${busy ? 'animate-pulse' : ''}`}>{value}</span>)}</div>
              {waiting ? <button disabled={busy || !canStart} onClick={() => action('start')} className="rounded-full bg-rose-500 px-5 py-3 text-white font-black text-sm disabled:opacity-40">BẮT ĐẦU TRẬN</button> : state.phase === 'buy' ? <div className="text-center space-y-2"><p className="text-xs font-bold">{currentCell?.name} · {currentCell?.price}</p><div className="flex gap-2"><button disabled={busy || !myTurn || !canBuy} onClick={() => action('buy')} className="rounded-full bg-emerald-600 px-4 py-2 text-white text-sm font-bold disabled:opacity-40">Mua đất</button><button disabled={busy || !myTurn} onClick={() => action('skip')} className="rounded-full bg-slate-600 px-4 py-2 text-white text-sm font-bold disabled:opacity-40">Bỏ qua</button></div></div> : <button disabled={busy || !myTurn} onClick={() => action('roll')} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-3 text-white font-black text-sm shadow-[0_4px_0_#e11d48] disabled:opacity-40"><Zap size={16} /> ĐỔ XÚC XẮC 🎲</button>}
              {waiting && <p className="text-xs text-slate-500">Cần 2–6 người chơi để bắt đầu.</p>}
            </div>
            <div className="w-full rounded-xl border border-slate-200 bg-white p-2 text-[10px] text-slate-500"><p className="font-bold flex gap-1 items-center mb-1"><Clock size={12} /> NHẬT KÝ TRÒ CHƠI</p><p className="truncate" aria-live="polite">{state?.log.at(-1) || 'Mời bạn bè tham gia phòng để cùng chơi!'}</p></div>
          </section>
        </div>
      </div>
      <aside className={styles.rightSidebar}>
        <section className={`${styles.panel} ${styles.players}`} aria-label="Danh sách người chơi">
          <h2><Users size={15} /> NGƯỜI CHƠI <span className={styles.count}>{seatedPlayers.length}/{snapshot?.maxPlayers || 6}</span></h2>
          <div className={styles.playerList}>{seatedPlayers.length ? seatedPlayers.map(renderPlayer) : <p className={styles.empty}>{snapshot ? 'Đang chờ người chơi tham gia…' : 'Đang tải phòng…'}</p>}</div>
          <button className={styles.seatAction} disabled={busy || !snapshot || (!me && seatedPlayers.length >= snapshot.maxPlayers)} onClick={() => action(me ? 'leave_seat' : 'join_seat')}>{me ? 'Rời bàn' : seatedPlayers.length >= snapshot?.maxPlayers ? 'Bàn đã đầy' : 'Tham gia'}</button>
          {state && !waiting && <p className={styles.seatHint}>Tham gia để giữ chỗ cho ván tiếp theo. Rời bàn trong ván hiện tại tính là bỏ cuộc.</p>}
        </section>
        <section className={`${styles.panel} ${styles.history}`}><h2><Clock size={15} /> LỊCH SỬ / HÀNH ĐỘNG <span className={styles.count}>{state?.log.length || 0}</span></h2><ol aria-live="polite">{state?.log.map((entry, index) => <li key={index}>{entry}</li>)}</ol>{!state?.log.length && <p className={styles.empty}>Các hành động sẽ xuất hiện khi trận đấu bắt đầu.</p>}</section>
      </aside>
    </div>
  </main>;
}
