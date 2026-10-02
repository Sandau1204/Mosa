// Artwork and catalog adapted from the supplied games.tsx design.
export const GAMES_DATA = [
  { id: 'xiangqi', title: 'Cờ Tướng (Xiangqi)', desc: 'Cờ Tướng truyền thống đỉnh cao, đấu 1v1 hoặc tập luyện với AI Kiện Tướng.', category: '1v1', isStrategy: true, players: '1v1', aiElo: '300 - 2400 ELO', badge: 'HOT 🔥', badgeColor: 'bg-rose-500 text-white', bgGradient: 'from-amber-500 to-red-600', icon: '♟️', minPlayers: 1, maxPlayers: 2 },
  { id: 'chess', title: 'Cờ Vua (Chess)', desc: 'Thách đấu Cờ Vua chuẩn quốc tế với bảng phân tích nước đi và Replay.', category: '1v1', isStrategy: true, players: '1v1', aiElo: '400 - 2800 ELO', badge: 'POPULAR 🏆', badgeColor: 'bg-indigo-600 text-white', bgGradient: 'from-blue-600 to-indigo-800', icon: '👑', minPlayers: 1, maxPlayers: 2 },
  { id: 'monopoly', title: 'Cờ Tỷ Phú (Business Land)', desc: 'Đổ xí ngầu, mua đất, xây khách sạn và đẩy bạn bè vào cảnh phá sản!', category: 'Party', isStrategy: false, players: '2 - 6 Người', aiElo: 'Smart Bot', badge: 'PARTY 🎉', badgeColor: 'bg-emerald-500 text-slate-900', bgGradient: 'from-emerald-400 to-teal-700', icon: '🎩', minPlayers: 2, maxPlayers: 6 },
  { id: 'uno', title: 'Bài UNO Crazy', desc: 'Trận chiến bài UNO siêu tốc với các lá +4, Đổi Hướng vô cùng cay đắng!', category: 'Party', isStrategy: false, players: '2 - 8 Người', aiElo: 'Fast Bot', badge: 'NEW ⚡', badgeColor: 'bg-yellow-400 text-slate-900', bgGradient: 'from-yellow-400 to-orange-600', icon: '🎴', minPlayers: 2, maxPlayers: 8 },
  { id: 'ludo', title: 'Cờ Cá Ngựa (Ludo Pop)', desc: 'Đua ngựa về chuồng cực hài hước, đá ngựa đối thủ về vạch xuất phát.', category: 'Party', isStrategy: false, players: '2 - 4 Người', aiElo: 'Easy / Hard', badge: 'FUN 🎲', badgeColor: 'bg-cyan-400 text-slate-900', bgGradient: 'from-cyan-400 to-blue-600', icon: '🐴', minPlayers: 2, maxPlayers: 4 },
  { id: 'caro', title: 'Cờ Caro (Gomoku 5-in-a-row)', desc: 'Nối 5 nước cờ Caro cổ điển, nhịp độ nhanh giải trí cực tốt.', category: '1v1', isStrategy: true, players: '1v1', aiElo: '3 Chế độ AI', badge: 'QUICK ⏱️', badgeColor: 'bg-purple-500 text-white', bgGradient: 'from-purple-500 to-pink-600', icon: '❌', minPlayers: 1, maxPlayers: 2 },
  { id: 'werewolf', title: 'Ma Sói Mini (Werewolf)', desc: 'Trò chơi tranh luận bằng Voice Discord! Tìm ra Ma Sói đang ẩn nấp.', category: 'Party', isStrategy: true, players: '6 - 16 Người', aiElo: 'Chỉ đấu người', badge: 'VOICE 🎙️', badgeColor: 'bg-slate-700 text-yellow-300', bgGradient: 'from-slate-800 to-purple-900', icon: '🐺', minPlayers: 6, maxPlayers: 16 }
];

export const GameThumbnailContent = ({ gameId, defaultIcon }) => {
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

