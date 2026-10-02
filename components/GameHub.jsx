'use client';

import React, { useState } from 'react';
import { Gamepad2, Search, X, Users, Bot, Play, PlusCircle, ShieldAlert, Radio, Volume2, VolumeX, HelpCircle, Swords, Trophy } from 'lucide-react';
const GAMES_DATA = [
  { id: 'xiangqi', title: 'Cờ Tướng (Xiangqi)', desc: 'Cờ Tướng truyền thống đỉnh cao, đấu 1v1 hoặc tập luyện với AI Kiện Tướng.', category: '1v1', isStrategy: true, players: '1v1', aiElo: '300 - 2400 ELO', badge: 'HOT 🔥', badgeColor: 'bg-rose-500 text-white', bgGradient: 'from-amber-500 to-red-600', icon: '♟️', minPlayers: 1, maxPlayers: 2 },
  { id: 'chess', title: 'Cờ Vua (Chess)', desc: 'Thách đấu Cờ Vua chuẩn quốc tế với bảng phân tích nước đi và Replay.', category: '1v1', isStrategy: true, players: '1v1', aiElo: '400 - 2800 ELO', badge: 'POPULAR 🏆', badgeColor: 'bg-indigo-600 text-white', bgGradient: 'from-blue-600 to-indigo-800', icon: '👑', minPlayers: 1, maxPlayers: 2 },
  { id: 'monopoly', title: 'Cờ Tỷ Phú (Business Land)', desc: 'Đổ xí ngầu, mua đất, xây khách sạn và đẩy bạn bè vào cảnh phá sản!', category: 'Party', isStrategy: false, players: '2 - 6 Người', aiElo: 'Smart Bot', badge: 'PARTY 🎉', badgeColor: 'bg-emerald-500 text-slate-900', bgGradient: 'from-emerald-400 to-teal-700', icon: '🎩', minPlayers: 2, maxPlayers: 6 },
  { id: 'uno', title: 'Bài UNO Crazy', desc: 'Trận chiến bài UNO siêu tốc với các lá +4, Đổi Hướng vô cùng cay đắng!', category: 'Party', isStrategy: false, players: '2 - 8 Người', aiElo: 'Fast Bot', badge: 'NEW ⚡', badgeColor: 'bg-yellow-400 text-slate-900', bgGradient: 'from-yellow-400 to-orange-600', icon: '🎴', minPlayers: 2, maxPlayers: 8 },
  { id: 'ludo', title: 'Cờ Cá Ngựa (Ludo Pop)', desc: 'Đua ngựa về chuồng cực hài hước, đá ngựa đối thủ về vạch xuất phát.', category: 'Party', isStrategy: false, players: '2 - 4 Người', aiElo: 'Easy / Hard', badge: 'FUN 🎲', badgeColor: 'bg-cyan-400 text-slate-900', bgGradient: 'from-cyan-400 to-blue-600', icon: '🐴', minPlayers: 2, maxPlayers: 4 },
  { id: 'caro', title: 'Cờ Caro (Gomoku 5-in-a-row)', desc: 'Nối 5 nước cờ Caro cổ điển, nhịp độ nhanh giải trí cực tốt.', category: '1v1', isStrategy: true, players: '1v1', aiElo: '3 Chế độ AI', badge: 'QUICK ⏱️', badgeColor: 'bg-purple-500 text-white', bgGradient: 'from-purple-500 to-pink-600', icon: '❌', minPlayers: 1, maxPlayers: 2 },
  { id: 'werewolf', title: 'Ma Sói Mini (Werewolf)', desc: 'Trò chơi tranh luận bằng Voice Discord! Tìm ra Ma Sói đang ẩn nấp.', category: 'Party', isStrategy: true, players: '6 - 16 Người', aiElo: 'Chỉ đấu người', badge: 'VOICE 🎙️', badgeColor: 'bg-slate-700 text-yellow-300', bgGradient: 'from-slate-800 to-purple-900', icon: '🐺', minPlayers: 6, maxPlayers: 16 }
];

const GameThumbnailContent = ({ gameId, defaultIcon }) => {
  switch (gameId) {
    case 'xiangqi':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 bg-[#FFE4B5] rounded-full border-[3px] border-slate-950 shadow-[4px_4px_0_#000] flex items-center justify-center text-red-600 font-bold text-3xl sm:text-4xl font-serif group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">帥</div>
        </div>
      );
    case 'chess':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 filter drop-shadow-[4px_4px_0_#000] group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-300">
            <path d="M 32 14 C 27 14 27 22 32 22 C 37 22 37 14 32 14 Z M 27 24 L 37 24 C 33 37 39 45 41 50 L 23 50 C 25 45 31 37 27 24 Z M 21 50 L 43 50 L 43 56 L 21 56 Z" fill="#F8FAFC" stroke="#020617" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>
      );
    case 'monopoly':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative z-10 flex gap-1.5 sm:gap-2 items-end group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-300">
            <div className="w-3.5 sm:w-4 h-8 sm:h-10 bg-red-500 rounded-t-full border-2 border-slate-950 shadow-[3px_3px_0_#000]"></div>
            <div className="w-3.5 sm:w-4 h-12 sm:h-16 bg-blue-500 rounded-t-full border-2 border-slate-950 shadow-[3px_3px_0_#000]"></div>
            <div className="w-3.5 sm:w-4 h-7 sm:h-9 bg-green-500 rounded-t-full border-2 border-slate-950 shadow-[3px_3px_0_#000]"></div>
            <div className="w-3.5 sm:w-4 h-10 sm:h-12 bg-yellow-400 rounded-t-full border-2 border-slate-950 shadow-[3px_3px_0_#000]"></div>
          </div>
        </div>
      );
    case 'uno':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative z-10 flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute -rotate-12 -translate-x-4 sm:-translate-x-5 w-10 h-14 sm:w-12 sm:h-16 bg-red-500 rounded-lg border-2 border-slate-950 shadow-[3px_3px_0_#000] flex items-center justify-center">
              <div className="w-7 h-10 sm:w-8 sm:h-12 bg-white rounded-[50%] flex items-center justify-center text-red-500 font-black italic text-sm sm:text-base -rotate-6">+2</div>
            </div>
            <div className="absolute rotate-12 translate-x-4 sm:translate-x-5 w-10 h-14 sm:w-12 sm:h-16 bg-blue-500 rounded-lg border-2 border-slate-950 shadow-[3px_3px_0_#000] flex items-center justify-center">
              <div className="w-7 h-10 sm:w-8 sm:h-12 bg-white rounded-[50%] flex items-center justify-center text-blue-500 font-black italic text-sm sm:text-base rotate-6">8</div>
            </div>
            <div className="absolute z-10 w-10 h-14 sm:w-12 sm:h-16 bg-green-500 rounded-lg border-2 border-slate-950 shadow-[3px_3px_0_#000] flex items-center justify-center">
              <div className="w-7 h-10 sm:w-8 sm:h-12 bg-white rounded-[50%] flex items-center justify-center text-green-500 font-black italic text-xl sm:text-2xl leading-none -mt-0.5">⟲</div>
            </div>
          </div>
        </div>
      );
    case 'ludo':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative z-10 flex items-end gap-2 sm:gap-3 group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-300">
            <svg viewBox="0 0 64 64" className="w-12 h-12 sm:w-16 sm:h-16 filter drop-shadow-[3px_3px_0_#000]">
              <path d="M 22 50 C 22 35 15 25 22 15 C 28 5 42 10 35 25 C 32 30 36 40 40 50 Z" fill="#06b6d4" stroke="#020617" strokeWidth="3" strokeLinejoin="round" />
              <path d="M 18 50 L 44 50 L 44 56 L 18 56 Z" fill="#06b6d4" stroke="#020617" strokeWidth="3" strokeLinejoin="round" />
              <circle cx="28" cy="22" r="3" fill="#020617" />
            </svg>
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-md sm:rounded-lg border-2 border-slate-950 shadow-[3px_3px_0_#000] flex flex-col justify-between p-1 sm:p-1.5">
              <div className="flex justify-between w-full"><div className="w-1.5 h-1.5 bg-slate-950 rounded-full"/><div className="w-1.5 h-1.5 bg-slate-950 rounded-full"/></div>
              <div className="flex justify-between w-full"><div className="w-1.5 h-1.5 bg-slate-950 rounded-full"/><div className="w-1.5 h-1.5 bg-slate-950 rounded-full"/></div>
            </div>
          </div>
        </div>
      );
    case 'caro':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-3 rotate-12 group-hover:scale-110 transition-transform duration-300">
            <div className="text-3xl sm:text-4xl leading-none font-black text-rose-500 filter drop-shadow-[2px_2px_0_#000]">X</div>
            <div className="text-3xl sm:text-4xl leading-none font-black text-blue-500 filter drop-shadow-[2px_2px_0_#000]">O</div>
            <div className="text-3xl sm:text-4xl leading-none font-black text-blue-500 filter drop-shadow-[2px_2px_0_#000] justify-self-end">O</div>
            <div className="text-3xl sm:text-4xl leading-none font-black text-rose-500 filter drop-shadow-[2px_2px_0_#000]">X</div>
          </div>
        </div>
      );
    default:
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative z-10 text-5xl sm:text-6xl filter drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-200">{defaultIcon}</div>
        </div>
      );
  }
};

export default function GameHub({ user, rooms, error, isMuted, onToggleMute, onProfile, onAuth, onCreateRoom, onJoinRoom, children, inRoom }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [roomListOpen, setRoomListOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = { quickPlay: 'Chơi Ngay', createRoom: 'Tạo Phòng' };
  const filteredGames = GAMES_DATA.filter(game =>
    game.title.toLocaleLowerCase('vi').includes(searchQuery.toLocaleLowerCase('vi')) &&
    (selectedFilter === 'ALL' || (selectedFilter === 'BOT' && game.id === 'xiangqi') || (selectedFilter === 'STRATEGY' && game.isStrategy) || (selectedFilter === 'PARTY' && game.category === 'Party') || game.category === selectedFilter)
  );
  const createRoom = async game => {
    setBusy(true);
    try { await onCreateRoom({ ...game, type: game.id }); } finally { setBusy(false); }
  };
  const joinRoom = async id => {
    setBusy(true);
    try { await onJoinRoom(id); } finally { setBusy(false); }
  };
  const roomList = (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {!rooms.length && <p className="py-8 text-center text-sm text-slate-400">Chưa có phòng nào. Tạo phòng để bắt đầu chơi!</p>}
      {rooms.map(room => (
        <div key={room.id} className="rounded-xl border-2 border-slate-800 bg-slate-950 p-3">
          <h3 className="font-black text-sm break-words">{room.name}</h3>
          <p className="my-2 text-xs text-slate-400">{room.slots} người chơi · {room.status === 'playing' ? 'Đang trong trận' : 'Đang chờ'} · {room.observers?.length || 0} người xem</p>
          <button disabled={busy} onClick={() => joinRoom(room.id)} className="w-full rounded-lg border-2 border-slate-950 bg-yellow-400 px-3 py-2 text-xs font-black text-slate-950 shadow-[2px_2px_0_#000] hover:bg-yellow-300 disabled:opacity-50">Tham gia / Xem trận</button>
        </div>
      ))}
    </div>
  );
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-800 text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-4 border-slate-950 bg-slate-900 p-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border-2 border-slate-950 bg-yellow-400 p-2 text-slate-950 shadow-[3px_3px_0_#000]"><Gamepad2 /></div>
          <div><h1 className="text-sm sm:text-lg font-black tracking-wide">DISCORD GAME HUB</h1><button onClick={onAuth} className="flex items-center gap-1 text-xs font-bold text-emerald-400"><Radio size={12} /> Mosa · Discord Activity</button></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onProfile} className="flex items-center gap-2 rounded-xl border-2 border-slate-950 bg-slate-800 px-2 py-1 shadow-[2px_2px_0_#000]"><img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full border-2 border-yellow-400" /><span className="hidden sm:block max-w-32 truncate text-xs font-black">{user.name}</span></button>
          <button onClick={onToggleMute} aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'} className="rounded-xl border-2 border-slate-950 bg-slate-700 p-2">{isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <button onClick={() => setHelpOpen(true)} aria-label="Hướng dẫn" className="rounded-xl border-2 border-slate-950 bg-yellow-400 p-2 text-slate-950"><HelpCircle size={18} /></button>
        </div>
      </header>
      {inRoom ? <main className="flex flex-1 min-h-0 flex-col p-2 sm:p-4">{children}</main> : (
        <div className="flex flex-1 min-h-0">
          <main className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-5 space-y-5">
            <section className="relative overflow-hidden rounded-2xl border-4 border-slate-950 bg-gradient-to-r from-indigo-600 to-purple-700 p-5 shadow-[6px_6px_0_#000]">
              <p className="text-xs font-black text-cyan-300 uppercase tracking-widest">Cùng bạn bè trong Discord</p>
              <h2 className="mt-2 text-xl sm:text-2xl font-black">CHỌN GAME. VÀO PHÒNG. ĐẤU TRÍ!</h2>
              <p className="mt-2 text-sm text-indigo-100">Thách đấu Cờ Tướng 1v1 hoặc luyện tập cùng AI Bot.</p>
              <button onClick={() => setRoomListOpen(true)} className="mt-4 rounded-xl border-2 border-slate-950 bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950 shadow-[3px_3px_0_#000]">Phòng đang mở · {rooms.length}</button>
            </section>
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            <div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input aria-label="Tìm kiếm game" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm kiếm game (Cờ Tướng, UNO, Cờ Vua...)..." className="w-full rounded-xl border-2 border-slate-950 bg-slate-900 py-2 pl-10 pr-3 text-sm focus:outline-none focus:border-yellow-400" /></div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[['ALL','Tất Cả',Gamepad2],['1v1','Đối Kháng 1v1',Swords],['PARTY','Party / Nhóm',Users],['STRATEGY','Chiến Thuật',Trophy],['BOT','Chơi Với AI Bot',Bot]].map(([id,label,Icon]) => <button key={id} onClick={() => setSelectedFilter(id)} aria-pressed={selectedFilter === id} className={`flex shrink-0 items-center gap-1 rounded-xl border-2 border-slate-950 px-3 py-2 text-xs font-black ${selectedFilter === id ? 'bg-cyan-400 text-slate-950 shadow-[3px_3px_0_#000]' : 'bg-slate-900 text-slate-300'}`}><Icon size={14} />{label}</button>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 pb-6">
              {filteredGames.length > 0 ? (
                filteredGames.map((game) => (
                  <div
                    key={game.id}
                    className="group relative bg-slate-900 border-4 border-slate-950 rounded-2xl overflow-hidden flex flex-row items-stretch shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1.5 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 p-2.5 sm:p-3 gap-3 sm:gap-4"
                  >
                    <div className="w-20 sm:w-24 shrink-0 relative flex items-center justify-center ml-1 sm:ml-2">
                       <GameThumbnailContent gameId={game.id} defaultIcon={game.icon} />
                    </div>
                    <div className="flex-1 flex flex-col min-w-0 justify-between py-1">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm sm:text-base font-black text-white group-hover:text-yellow-400 transition-colors truncate">{game.title}</h3>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 ${game.badgeColor}`}>{game.id === "xiangqi" ? game.badge : "Sắp ra mắt"}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed mb-2">{game.desc}</p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-3">
                        <span className="bg-slate-950/80 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 shrink-0"><Users className="w-3 h-3 text-cyan-400" /> {game.players}</span>
                        <span className="bg-slate-950/80 text-yellow-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 shrink-0"><Bot className="w-3 h-3 text-yellow-400" /> {game.id === "xiangqi" ? "AI Bot" : "Sắp ra mắt"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button disabled={game.id !== "xiangqi" || busy} onClick={() => setRoomListOpen(true)} className="disabled:opacity-40 disabled:cursor-not-allowed py-1.5 sm:py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-[10px] sm:text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1"><Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-slate-950" /> {t.quickPlay}</button>
                        <button disabled={game.id !== "xiangqi" || busy} onClick={() => createRoom(game)} className="disabled:opacity-40 disabled:cursor-not-allowed py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] sm:text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1"><PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" /> {t.createRoom}</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                  <ShieldAlert className="w-12 h-12 text-slate-600 mb-2" />
                  <p className="text-slate-400 font-bold text-sm">Không tìm thấy trò chơi phù hợp!</p>
                  <button onClick={() => { setSearchQuery(''); setSelectedFilter('ALL'); }} className="mt-3 px-4 py-1.5 bg-cyan-400 text-slate-950 text-xs font-black rounded-lg border-2 border-slate-950">Xóa bộ lọc</button>
                </div>
              )}
            </div>
          </main>
          <aside className="hidden lg:flex w-80 shrink-0 flex-col border-l-4 border-slate-950 bg-slate-900">
            <h2 className="flex items-center gap-2 border-b-4 border-slate-950 p-4 text-xs font-black uppercase tracking-wider"><Radio size={16} className="text-emerald-400" /> Phòng chơi · {rooms.length}</h2>
            <div className="flex-1 overflow-y-auto p-3">{roomList}</div>
            <p className="border-t-4 border-slate-950 p-4 text-xs text-slate-400">Tạo phòng, chọn phe và sẵn sàng. Thêm AI Bot ngay trong phòng chơi.</p>
          </aside>
        </div>
      )}
      {((roomListOpen && !inRoom) || helpOpen) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
        <section role="dialog" aria-modal="true" aria-label={helpOpen ? 'Hướng dẫn' : 'Danh sách phòng chơi'} className="flex max-h-[85dvh] w-full max-w-xl flex-col rounded-2xl border-4 border-slate-950 bg-slate-900 p-5 shadow-[8px_8px_0_#000]">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-black text-yellow-400">{helpOpen ? 'CẨM NANG GAME HUB' : 'DANH SÁCH PHÒNG CHƠI'}</h2><button autoFocus aria-label="Đóng" onClick={() => { setHelpOpen(false); setRoomListOpen(false); }} className="rounded-lg bg-slate-800 p-2"><X size={18} /></button></div>
          <div className="overflow-y-auto">{helpOpen ? <p className="text-sm leading-7 text-slate-300">Chọn Cờ Tướng và tạo phòng mới hoặc tham gia phòng đang mở. Ngồi vào ghế đỏ hoặc đen, thêm bot nếu muốn luyện tập, rồi bấm sẵn sàng. Bạn cũng có thể xem trận và trò chuyện trong phòng. Các game có nhãn “Sắp ra mắt” chưa hỗ trợ chơi.</p> : roomList}</div>
        </section>
      </div>}
    </div>
  );
}