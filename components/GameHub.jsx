'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Gamepad2, Trophy, Users, Bot, Sparkles, Volume2, VolumeX, Globe, HelpCircle,
  Search, Swords, Play, PlusCircle, X, Check, ChevronRight, Crown, MessageSquare,
  ShieldAlert, Flame, Zap, Radio, Signal, UserCheck, Clock, Eye, RotateCcw,
  Sliders, Share2, Menu, ChevronDown, Lock, Unlock, KeyRound, DoorOpen, LogOut,
  Flag, Handshake, ArrowLeftRight, UserMinus, UserPlus, Send, Settings
} from 'lucide-react';

const TRANSLATIONS = {
  VI: {
    hubTitle: "DISCORD GAME HUB",
    serverName: "VN Boardgame Guild",
    voiceChannel: "🔊 Phòng Game #1",
    onlinePlayers: "5 Đang Online",
    ping: "Ping",
    featuredTitle: "GIẢI ĐẤU CỜ TƯỚNG TẾT 2026",
    featuredDesc: "Tham gia thi đấu 1v1 Server - Thưởng 10.000 Vàng & Danh hiệu Kiện Tướng!",
    searchPlaceholder: "Tìm kiếm game (Cờ Tướng, UNO, Cờ Vua...)...",
    filterAll: "Tất Cả",
    filter1v1: "Đối Kháng 1v1",
    filterParty: "Party / Nhóm",
    filterStrategy: "Chiến Thuật",
    filterBot: "Chơi Với AI Bot",
    quickPlay: "Chơi Ngay",
    createRoom: "Tạo Phòng",
    lobbyTitle: "CẤU HÌNH PHÒNG CHƠI",
    gameMode: "Chế Độ Chơi",
    pvpMode: "Đấu Người (PvP)",
    pveMode: "Chơi Với Bot AI (PvE)",
    botElo: "Độ Khó Bot (ELO)",
    easy: "Tập Sự (800)",
    medium: "Thách Thức (1200)",
    hard: "Kiện Tướng (2000)",
    matchRules: "Cài Đặt Luật Đấu",
    timePerTurn: "Thời Gian Nước Đi",
    allowSpectator: "Cho Phép Khán Giả Xem",
    enableReplay: "Lưu Replay Xem Lại",
    chooseSide: "Chọn Phe / Quân Cờ",
    redSide: "Phe Đỏ / Trắng (Đi Trước)",
    blackSide: "Phe Đen / Đen (Đi Sau)",
    randomSide: "Ngẫu Nhiên",
    readyBtn: "SẴN SÀNG CHƠI",
    startBtn: "BẮT ĐẦU TRẬN",
    voiceMembers: "Thành Viên Kênh Thoại",
    leaderboard: "Bảng Xếp Hạng Server",
    inviteDiscord: "Gửi Lời Mời Chat Discord",
    statusInLobby: "Đang chọn game",
    statusReady: "Đã sẵn sàng",
    statusInGame: "Đang trong trận",
    rulesTitle: "CẨM NANG GAME HUB",
    rulesContent: "Chào mừng bạn đến với Discord Boardgame Hub! Chọn trò chơi yêu thích, rủ bạn bè trong Voice Channel cùng tham gia hoặc luyện tập với Bot AI để tích lũy ELO.",
    close: "Đóng",
    createTournamentBtn: "Tạo Giải Đấu",
    deleteTournamentBtn: "Hủy Giải Đấu",
    ownerLabel: "Server Owner",
    memberLabel: "Thành Viên",
    createTournamentTitle: "TẠO GIẢI ĐẤU MỚI (DÀNH CHO OWNER)",
    tournamentNameInput: "Tên giải đấu",
    selectGameInput: "Trò chơi tổ chức",
    prizeInput: "Phần thưởng giải đấu",
    descInput: "Mô tả / Thể lệ giải đấu",
    confirmCreateTournament: "XÁC NHẬN TẠO GIẢI ĐẤU",
    roomListTitle: "DANH SÁCH PHÒNG CHƠI",
    roomListDesc: "Chọn phòng sẵn có để tham gia hoặc tự tạo phòng riêng",
    createRoomBtn: "Tạo Phòng Mới",
    joinRoomBtn: "Tham Gia",
    isRoomLocked: "Khóa Mật Khẩu Phòng",
    roomPasswordLabel: "Mật Khẩu Phòng",
    roomPasswordPlaceholder: "Nhập mật khẩu (VD: 1234)",
    roomNameLabel: "Tên Phòng",
    roomNamePlaceholder: "Nhập tên phòng chơi...",
    lockedBadge: "Có Mật Khẩu",
    openBadge: "Công Khai",
    noRoomsFound: "Chưa có phòng nào cho game này. Hãy là người đầu tiên tạo phòng!",
    enterPasswordTitle: "NHẬP MẬT KHẨU PHÒNG",
    submitPasswordBtn: "Xác Nhận Vào Phòng",
    invalidPasswordMsg: "Mật khẩu không chính xác, vui lòng thử lại!",
    settingsTitle: "CÀI ĐẶT",
    soundSetting: "Âm Thanh",
    languageSetting: "Ngôn Ngữ",

    // In-game Room Translations
    exitRoom: "Thoát",
    offerDraw: "Xin Hòa",
    resign: "Xin Thua",
    spectatorsList: "Khán Giả / Người Xem",
    leaveSeat: "Rời Ghế",
    swapSide: "Đổi Phe",
    movesHistory: "Các Nước Cờ Đã Đi",
    turnRed: "Lượt Đỏ Đi",
    turnBlack: "Lượt Đen Đi",
    sitDown: "Ngồi Vào Ghế",
    swapRequestMsg: "Đã gửi yêu cầu đổi phe cờ tới đối thủ!",
    drawOfferMsg: "Bạn đã gửi yêu cầu Xin Hòa!",
    resignMsg: "Bạn đã nhận thua trận đấu này!",
    leftSeatMsg: "Bạn đã rời ghế và chuyển sang vị trí Khán Giả xem trận đấu."
  },
  EN: {
    hubTitle: "DISCORD GAME HUB",
    serverName: "VN Boardgame Guild",
    voiceChannel: "🔊 Game Lounge #1",
    onlinePlayers: "5 Online",
    ping: "Ping",
    featuredTitle: "XIANGQI CHAMPIONSHIP 2026",
    featuredDesc: "Join 1v1 Server Tournament - Win 10,000 Coins & Grandmaster Badge!",
    searchPlaceholder: "Search boardgames (Xiangqi, Chess, UNO...)...",
    filterAll: "All Games",
    filter1v1: "1v1 Battle",
    filterParty: "Party Games",
    filterStrategy: "Strategy",
    filterBot: "Play vs AI",
    quickPlay: "Quick Play",
    createRoom: "Create Room",
    lobbyTitle: "MATCH & LOBBY SETUP",
    gameMode: "Game Mode",
    pvpMode: "Player vs Player (PvP)",
    pveMode: "Player vs Bot AI (PvE)",
    botElo: "Bot Difficulty (ELO)",
    easy: "Novice (800)",
    medium: "Challenger (1200)",
    hard: "Grandmaster (2000)",
    matchRules: "Match Rules",
    timePerTurn: "Time per Turn",
    allowSpectator: "Allow Spectators",
    enableReplay: "Enable Replays",
    chooseSide: "Choose Side / Color",
    redSide: "Red / White (First Move)",
    blackSide: "Black / Dark (Second Move)",
    randomSide: "Random",
    readyBtn: "I'M READY",
    startBtn: "START MATCH",
    voiceMembers: "Voice Channel Players",
    leaderboard: "Server Leaderboard",
    inviteDiscord: "Invite to Discord Chat",
    statusInLobby: "Selecting game",
    statusReady: "Ready to play",
    statusInGame: "In a match",
    rulesTitle: "GAME HUB GUIDE",
    rulesContent: "Welcome to Discord Boardgame Hub! Pick your favorite game, invite friends in your voice channel, or practice against AI bots to rank up on the server leaderboard.",
    close: "Close",
    createTournamentBtn: "Create Tournament",
    deleteTournamentBtn: "Delete Tournament",
    ownerLabel: "Server Owner",
    memberLabel: "Member",
    createTournamentTitle: "CREATE TOURNAMENT (OWNER ONLY)",
    tournamentNameInput: "Tournament Title",
    selectGameInput: "Selected Game",
    prizeInput: "Tournament Prize",
    descInput: "Description / Rules",
    confirmCreateTournament: "CONFIRM CREATE TOURNAMENT",
    roomListTitle: "ROOM LIST",
    roomListDesc: "Choose an active room to join or create your own",
    createRoomBtn: "Create New Room",
    joinRoomBtn: "Join Room",
    isRoomLocked: "Lock Room with Password",
    roomPasswordLabel: "Room Password",
    roomPasswordPlaceholder: "Enter password (e.g. 1234)",
    roomNameLabel: "Room Name",
    roomNamePlaceholder: "Enter room name...",
    lockedBadge: "Password",
    openBadge: "Public",
    noRoomsFound: "No active rooms for this game yet. Create one now!",
    enterPasswordTitle: "ENTER ROOM PASSWORD",
    submitPasswordBtn: "Confirm & Join",
    invalidPasswordMsg: "Incorrect password, please try again!",
    settingsTitle: "SETTINGS",
    soundSetting: "Sound",
    languageSetting: "Language",

    // In-game Room Translations
    exitRoom: "Leave",
    offerDraw: "Offer Draw",
    resign: "Resign",
    spectatorsList: "Spectators List",
    leaveSeat: "Leave Seat",
    swapSide: "Swap",
    movesHistory: "Move History",
    turnRed: "Red's Turn",
    turnBlack: "Black's Turn",
    sitDown: "Take Seat",
    swapRequestMsg: "Sent swap side request to opponent!",
    drawOfferMsg: "Sent draw request to opponent!",
    resignMsg: "You resigned from this match!",
    leftSeatMsg: "You left your seat and became a Spectator."
  }
};

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


export default function GameHub({ rooms, user, error, onCreate, onJoin, onResume, activeRoom, isMuted, onToggleMute }) {
  const [lang, setLang] = useState('VI');
  const t = TRANSLATIONS[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedGame, setSelectedGame] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [mode, setMode] = useState('pvp');
  const [elo, setElo] = useState(1200);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [actionError, setActionError] = useState('');
  const handleOpenRoomList = game => { setSelectedGame(game); setActiveModal('rooms'); setActionError(''); };
  const handleOpenCreateRoom = game => { setSelectedGame(game); setRoomName('Phòng của ' + user.name); setActiveModal('create'); setActionError(''); };
  const run = async action => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setActionError('');
    try { await action(); } catch (e) { setActionError(e.message || 'Không thể kết nối bot.'); }
    finally { pending.current = false; setBusy(false); }
  };
  const gameRooms = rooms.filter(room => room.type === (selectedGame?.id || 'xiangqi'));
    const filteredGames = useMemo(() => {
    return GAMES_DATA.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) || game.desc.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (selectedFilter === 'ALL') return true;
      if (selectedFilter === '1v1') return game.category === '1v1';
      if (selectedFilter === 'PARTY') return game.category === 'Party';
      if (selectedFilter === 'STRATEGY') return game.isStrategy;
      if (selectedFilter === 'BOT') return game.aiElo !== 'Chỉ đấu người';
      return true;
    });
  }, [searchQuery, selectedFilter]);
  return (
    <div className="h-dvh flex flex-col bg-slate-950 text-white font-sans [&_button:disabled]:opacity-40 [&_button:disabled]:cursor-not-allowed">
      <header className="flex flex-wrap items-center justify-between gap-3 p-4 border-b-4 border-slate-950 bg-slate-900">
        <h1 className="font-black text-lg text-yellow-400 flex items-center gap-2"><Gamepad2 />{t.hubTitle}</h1>
        <div className="flex items-center gap-3">
          <img src={user.avatarUrl} alt={user.name} className="w-9 h-9 rounded-full border-2 border-yellow-400" />
          <span className="text-sm font-bold">{user.name}</span>
          <button aria-label="Đổi ngôn ngữ" onClick={() => setLang(lang === 'VI' ? 'EN' : 'VI')} className="rounded-xl bg-slate-800 p-2">{lang}</button>
          <button aria-label="Bật/tắt âm thanh" onClick={onToggleMute} className="rounded-xl bg-slate-800 p-2">{isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        </div>
      </header>
      {(error || actionError) && <p role="alert" className="p-3 bg-rose-950 text-rose-200">{actionError || error}</p>}
      <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
        <main className="flex-1 p-3 sm:p-5 flex flex-col gap-4 min-w-0">
          <div className="rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 border-4 border-slate-950 p-5 shadow-[6px_6px_0px_0px_#000]">
            <h2 className="font-black text-xl">CỜ TƯỚNG CÙNG MOSA</h2>
            <p className="mt-2 text-sm">Tạo phòng, đấu với bạn bè hoặc AI. Nước đi và đồng hồ được đồng bộ với bot Discord.</p>
            <p className="mt-2 text-xs">20 phút mỗi bên + 5 giây mỗi nước. Giải đấu và bảng xếp hạng chưa được hỗ trợ.</p>
            {activeRoom && <button className="mt-3 rounded-xl bg-yellow-400 text-slate-950 p-2 font-bold" onClick={onResume}>Quay lại {activeRoom.name}</button>}
          </div>
                      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-slate-900 border-3 border-slate-950 text-slate-100 placeholder-slate-500 pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-yellow-400 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>)}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                {[ { id: 'ALL', label: t.filterAll, icon: Gamepad2 }, { id: '1v1', label: t.filter1v1, icon: Swords }, { id: 'PARTY', label: t.filterParty, icon: Users }, { id: 'STRATEGY', label: t.filterStrategy, icon: Trophy }, { id: 'BOT', label: t.filterBot, icon: Bot } ].map((btn) => {
                  const IconComponent = btn.icon; const isActive = selectedFilter === btn.id;
                  return (
                    <button key={btn.id} onClick={() => setSelectedFilter(btn.id)} className={`px-3 py-1.5 rounded-xl border-2 border-slate-950 text-xs font-black flex items-center gap-1.5 shrink-0 transition-all ${isActive ? 'bg-cyan-400 text-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                      <IconComponent className="w-3.5 h-3.5" /> {btn.label}
                    </button>
                  );
                })}
              </div>
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
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 ${game.badgeColor}`}>{game.id === 'xiangqi' ? 'LIVE' : 'Sắp ra mắt'}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed mb-2">{game.desc}</p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-3">
                        <span className="bg-slate-950/80 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 shrink-0"><Users className="w-3 h-3 text-cyan-400" /> {game.players}</span>
                        <span className="bg-slate-950/80 text-yellow-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 shrink-0"><Bot className="w-3 h-3 text-yellow-400" /> {game.id === 'xiangqi' ? 'AI Bot' : 'Chưa hỗ trợ'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button disabled={busy || game.id !== "xiangqi"} onClick={() => handleOpenRoomList(game)} className="py-1.5 sm:py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-[10px] sm:text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1"><Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-slate-950" /> {t.quickPlay}</button>
                        <button disabled={busy || game.id !== "xiangqi"} onClick={() => handleOpenCreateRoom(game)} className="py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] sm:text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1"><PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" /> {t.createRoom}</button>
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
        <aside className="lg:w-80 shrink-0 p-4 bg-slate-900 border-l-4 border-slate-950">
          <h2 className="text-yellow-400 font-black mb-3">{t.roomListTitle} · {rooms.length}</h2>
          {!rooms.length && <p className="text-sm text-slate-400">{t.noRoomsFound}</p>}
          <div className="space-y-3">{rooms.map(room => <button key={room.id} disabled={busy || room.type !== 'xiangqi'} onClick={() => run(() => onJoin(room.id))} className="w-full text-left p-3 rounded-xl border-2 border-slate-800 bg-slate-950 hover:border-yellow-400">
            <div className="font-bold truncate">{room.name}</div>
            <div className="text-xs text-slate-400 mt-1">{room.slots} · {room.status === 'playing' ? t.statusInGame : t.statusReady}</div>
          </button>)}</div>
        </aside>
      </div>
      {activeModal && selectedGame && <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <section role="dialog" aria-modal="true" aria-label={activeModal === 'create' ? t.createRoom : t.roomListTitle} className="bg-slate-900 border-4 border-slate-950 rounded-3xl w-full max-w-xl max-h-[90dvh] overflow-y-auto p-5 shadow-[8px_8px_0_#000]">
          <div className="flex items-center justify-between mb-4"><h2 className="font-black text-yellow-400">{selectedGame.title}</h2><button disabled={busy} aria-label={t.close} onClick={() => setActiveModal(null)}><X /></button></div>
          {(actionError || error) && <p role="alert" className="text-rose-300 mb-3">{actionError || error}</p>}
          {activeModal === 'rooms' ? <div className="space-y-3">
            <button disabled={busy} onClick={() => handleOpenCreateRoom(selectedGame)} className="p-3 rounded-xl bg-cyan-400 text-slate-950 font-black">{t.createRoomBtn}</button>
            {!gameRooms.length && <p>{t.noRoomsFound}</p>}
            {gameRooms.map(room => <button key={room.id} disabled={busy} onClick={() => run(() => onJoin(room.id))} className="block w-full p-3 text-left rounded-xl bg-slate-950 border-2 border-slate-800 hover:border-yellow-400">
              <strong>{room.name}</strong><span className="block text-sm text-slate-400">{room.slots} · {room.status === 'playing' ? t.statusInGame : t.statusReady} · {t.joinRoomBtn}</span>
            </button>)}
          </div> : <form className="space-y-4" onSubmit={event => { event.preventDefault(); run(() => onCreate({ type: selectedGame.id, title: selectedGame.title, name: roomName.trim(), botElo: mode === 'pve' ? elo : null })); }}>
            <label className="block text-sm font-bold">{t.roomNameLabel}<input required maxLength={60} value={roomName} onChange={event => setRoomName(event.target.value)} className="block w-full mt-2 p-3 bg-slate-950 border-2 border-slate-800 rounded-xl" /></label>
            <label className="block text-sm font-bold">{t.gameMode}<select value={mode} onChange={event => setMode(event.target.value)} className="block w-full mt-2 p-3 bg-slate-950 rounded-xl"><option value="pvp">{t.pvpMode}</option><option value="pve">{t.pveMode}</option></select></label>
            {mode === 'pve' && <label className="block text-sm font-bold">{t.botElo}<select value={elo} onChange={event => setElo(Number(event.target.value))} className="block w-full mt-2 p-3 bg-slate-950 rounded-xl"><option value={800}>{t.easy}</option><option value={1200}>{t.medium}</option><option value={2000}>{t.hard}</option></select></label>}
            <p className="text-xs text-slate-400">Phòng công khai, cho phép khán giả. Hai người sẵn sàng để bắt đầu trận.</p>
            <button disabled={busy || !roomName.trim()} className="w-full p-3 rounded-xl bg-yellow-400 text-slate-950 font-black">{busy ? 'Đang kết nối…' : t.createRoom}</button>
          </form>}
        </section>
      </div>}
    </div>
  );
}
