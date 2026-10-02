'use client';

import { useRef, useState } from 'react';
import { GAMES_DATA, GameThumbnailContent } from './GameCatalog';

const buttonStyle = 'rounded-xl border-2 border-slate-950 px-4 py-2 text-sm font-black shadow-[3px_3px_0_#020617] transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export default function GameHub({ rooms, error, user, onCreate, onJoin }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const games = GAMES_DATA.filter(game =>
    `${game.title} ${game.desc}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')) &&
    (filter === 'all' || (filter === 'strategy' ? game.isStrategy : game.category === filter))
  );

  async function act(callback) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try { await callback(); }
    finally { busy.current = false; setPending(false); }
  }

  return (
    <section className="min-h-0 w-full overflow-y-auto overscroll-contain p-2 sm:p-4">
      <div className="mb-5 rounded-2xl border-4 border-slate-950 bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-slate-950 shadow-[5px_5px_0_#020617]">
        <p className="text-xs font-black uppercase tracking-widest">Mosa • Discord Game Hub</p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">ĐẤU TRÍ CÙNG BẠN BÈ</h2>
        <p className="mt-2 text-sm font-semibold">Cờ Tướng 1v1 hoặc luyện tập với AI. Tạo phòng, chọn đối thủ và sẵn sàng!</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-500 bg-rose-950 p-3 text-sm text-rose-200">{error}</p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <input aria-label="Tìm kiếm game" placeholder="Tìm kiếm game (Cờ Tướng, UNO, Cờ Vua...)" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border-2 border-slate-700 bg-slate-900 p-3 text-sm outline-none focus:border-yellow-400" />
          <div className="my-4 flex flex-wrap gap-2" aria-label="Lọc trò chơi">
            {[['all', 'Tất cả'], ['1v1', 'Đối kháng 1v1'], ['Party', 'Party / Nhóm'], ['strategy', 'Chiến thuật']].map(([value, label]) => (
              <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`${buttonStyle} ${filter === value ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{label}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {games.map(game => {
              const available = game.id === 'xiangqi';
              return (
                <article key={game.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border-4 border-slate-950 bg-slate-900 shadow-[4px_4px_0_#020617]">
                  <div className={`relative h-36 bg-gradient-to-br ${game.bgGradient}`}>
                    <GameThumbnailContent gameId={game.id} defaultIcon={game.icon} />
                    <span className="absolute left-2 top-2 rounded-lg border-2 border-slate-950 bg-slate-950 px-2 py-1 text-[10px] font-black text-yellow-400">{available ? 'ĐANG MỞ • PvP / AI' : 'SẮP RA MẮT'}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <h3 className="font-black text-white">{game.title}</h3>
                    <p className="text-xs leading-relaxed text-slate-400">{available ? 'Đấu trực tuyến với bạn bè hoặc AI 800–2000 ELO. Đồng hồ 20 phút + 5 giây mỗi nước.' : game.desc}</p>
                    <button disabled={!available || pending} onClick={() => { setName(`Phòng của ${user.name}`.slice(0, 60)); setCreating(true); }} className={`${buttonStyle} mt-auto bg-yellow-400 text-slate-950 hover:bg-yellow-300`}>{available ? 'Tạo phòng' : 'Sắp ra mắt'}</button>
                  </div>
                </article>
              );
            })}
          </div>
          {!games.length && <p className="py-8 text-center text-slate-400">Không tìm thấy trò chơi phù hợp.</p>}
        </div>
        <aside className="self-start rounded-2xl border-4 border-slate-950 bg-slate-900 p-4 shadow-[4px_4px_0_#020617]">
          <h2 className="mb-3 font-black text-yellow-400">DANH SÁCH PHÒNG ({rooms.length})</h2>
          <p className="mb-4 text-xs text-slate-400">Tham gia phòng trống hoặc xem trận đang diễn ra.</p>
          <div className="space-y-3">
            {rooms.map(room => <button key={room.id} disabled={pending} onClick={() => act(() => onJoin(room.id))} className="w-full rounded-xl border-2 border-slate-700 bg-slate-800 p-3 text-left hover:border-yellow-400 disabled:opacity-50">
              <span className="block break-words text-sm font-bold">{room.name}</span>
              <span className="mt-2 block text-xs text-cyan-300">{room.slots} • {room.status === 'playing' ? 'Đang thi đấu · Xem trận' : 'Tham gia'}</span>
            </button>)}
            {!rooms.length && <p className="py-5 text-center text-sm text-slate-400">Chưa có phòng nào. Hãy tạo phòng đầu tiên!</p>}
          </div>
        </aside>
      </div>
      {creating && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3" onKeyDown={event => { if (event.key === 'Escape' && !pending) setCreating(false); }}>
        <form role="dialog" aria-modal="true" aria-labelledby="create-room-title" onSubmit={event => { event.preventDefault(); act(async () => { if (await onCreate({ name: name.trim() })) setCreating(false); }); }} className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border-4 border-slate-950 bg-slate-900 p-5 shadow-[6px_6px_0_#020617]">
          <h2 id="create-room-title" className="mb-4 text-lg font-black text-yellow-400">TẠO PHÒNG CỜ TƯỚNG</h2>
          <label className="block text-sm font-bold">Tên phòng<input autoFocus required maxLength={60} value={name} onChange={event => setName(event.target.value)} className="mt-2 w-full rounded-xl border-2 border-slate-700 bg-slate-950 p-3" /></label>
          <p className="my-4 text-sm text-slate-400">Sau khi vào phòng, mời người chơi hoặc thêm bot AI. Cả hai cần sẵn sàng để bắt đầu trận.</p>
          {error && <p role="alert" className="mb-3 text-sm text-rose-300">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={pending} onClick={() => setCreating(false)} className={`${buttonStyle} bg-slate-700`}>Hủy</button><button disabled={pending || !name.trim()} className={`${buttonStyle} bg-yellow-400 text-slate-950`}>{pending ? 'Đang tạo...' : 'Tạo phòng'}</button></div>
        </form>
      </div>}
    </section>
  );
}
