'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
    easy: "Tập Sự (500)",
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
    easy: "Novice (500)",
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

const MOCK_ROOMS = {
  xiangqi: [
    { id: 'r1', name: '🔥 Cao Thủ Cờ Tướng #1', host: 'Grandmaster_Nam', players: 1, maxPlayers: 2, isLocked: false, status: 'waiting' },
    { id: 'r2', name: '🔒 Đấu Kèo 10.000 Vàng', host: 'DragonSlayer99', players: 1, maxPlayers: 2, isLocked: true, pass: '1234', status: 'waiting' },
    { id: 'r3', name: 'Giao Lưu Vui Vẻ Kênh Voice', host: 'CuteCat_Vn', players: 2, maxPlayers: 2, isLocked: false, status: 'in-game' }
  ],
  chess: [
    { id: 'r4', name: '👑 Blitz 3+0 Match', host: 'Queen_Alice', players: 1, maxPlayers: 2, isLocked: false, status: 'waiting' },
    { id: 'r5', name: '🔒 Phòng Đấu Giải Nội Bộ', host: 'MechMaster', players: 1, maxPlayers: 2, isLocked: true, pass: '8888', status: 'waiting' }
  ],
  monopoly: [
    { id: 'r6', name: '🎩 Bàn Tỷ Phú 4 Người Sài Gòn', host: 'RichKid_Pro', players: 3, maxPlayers: 4, isLocked: false, status: 'waiting' },
    { id: 'r7', name: '🔒 Phòng Riêng Bang Hội', host: 'Sakura_VN', players: 2, maxPlayers: 4, isLocked: true, pass: '6666', status: 'waiting' }
  ],
  uno: [
    { id: 'r8', name: '🎴 UNO Tốc Độ 8 Slot Ultra', host: 'LuckyUno_King', players: 5, maxPlayers: 8, isLocked: false, status: 'waiting' },
    { id: 'r9', name: 'Phòng Vui Vẻ Khô Máu +4', host: 'CuteCat_Vn', players: 2, maxPlayers: 4, isLocked: false, status: 'waiting' }
  ],
  ludo: [
    { id: 'r10', name: '🐴 Đua Ngựa 4 Người Vui Vẻ', host: 'MechMaster', players: 2, maxPlayers: 4, isLocked: false, status: 'waiting' }
  ],
  caro: [
    { id: 'r11', name: '❌ Caro Nhanh 15s Mới Vô', host: 'DragonSlayer99', players: 1, maxPlayers: 2, isLocked: false, status: 'waiting' }
  ],
  werewolf: [
    { id: 'r12', name: '🐺 Ma Sói Voice Lounge Night', host: 'Grandmaster_Nam', players: 8, maxPlayers: 12, isLocked: false, status: 'waiting' }
  ]
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

const MOCK_VOICE_MEMBERS = [
  { id: 'u1', name: 'You (Me)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', status: 'ready', level: 42, role: 'Host' },
  { id: 'u2', name: 'DragonSlayer99', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', status: 'in-game', level: 38, role: 'Member' },
  { id: 'u3', name: 'CuteCat_Vn', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', status: 'lobby', level: 25, role: 'Member' },
  { id: 'u4', name: 'MechMaster', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', status: 'ready', level: 50, role: 'VIP' },
  { id: 'u5', name: 'Sakura_VN', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80', status: 'lobby', level: 19, role: 'Member' }
];

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Grandmaster_Nam', elo: 2850, game: 'Cờ Tướng', badge: '👑' },
  { rank: 2, name: 'Queen_Alice', elo: 2720, game: 'Cờ Vua', badge: '🥈' },
  { rank: 3, name: 'RichKid_Pro', elo: 2410, game: 'Cờ Tỷ Phú', badge: '🥉' },
  { rank: 4, name: 'LuckyUno_King', elo: 2190, game: 'Bài UNO', badge: '⭐' }
];

const INITIAL_XIANGQI_BOARD = [
  { x: 0, y: 0, type: 'R', side: 'black' }, { x: 1, y: 0, type: 'H', side: 'black' }, { x: 2, y: 0, type: 'E', side: 'black' }, { x: 3, y: 0, type: 'A', side: 'black' }, { x: 4, y: 0, type: 'K', side: 'black' }, { x: 5, y: 0, type: 'A', side: 'black' }, { x: 6, y: 0, type: 'E', side: 'black' }, { x: 7, y: 0, type: 'H', side: 'black' }, { x: 8, y: 0, type: 'R', side: 'black' },
  { x: 1, y: 2, type: 'C', side: 'black' }, { x: 7, y: 2, type: 'C', side: 'black' },
  { x: 0, y: 3, type: 'P', side: 'black' }, { x: 2, y: 3, type: 'P', side: 'black' }, { x: 4, y: 3, type: 'P', side: 'black' }, { x: 6, y: 3, type: 'P', side: 'black' }, { x: 8, y: 3, type: 'P', side: 'black' },

  { x: 0, y: 9, type: 'R', side: 'red' }, { x: 1, y: 9, type: 'H', side: 'red' }, { x: 2, y: 9, type: 'E', side: 'red' }, { x: 3, y: 9, type: 'A', side: 'red' }, { x: 4, y: 9, type: 'K', side: 'red' }, { x: 5, y: 9, type: 'A', side: 'red' }, { x: 6, y: 9, type: 'E', side: 'red' }, { x: 7, y: 9, type: 'H', side: 'red' }, { x: 8, y: 9, type: 'R', side: 'red' },
  { x: 1, y: 7, type: 'C', side: 'red' }, { x: 7, y: 7, type: 'C', side: 'red' },
  { x: 0, y: 6, type: 'P', side: 'red' }, { x: 2, y: 6, type: 'P', side: 'red' }, { x: 4, y: 6, type: 'P', side: 'red' }, { x: 6, y: 6, type: 'P', side: 'red' }, { x: 8, y: 6, type: 'P', side: 'red' }
];

const PIECE_LABELS = {
  K: { red: '帥', black: '將' },
  A: { red: '仕', black: '士' },
  E: { red: '相', black: '象' },
  H: { red: '傌', black: '馬' },
  R: { red: '俥', black: '車' },
  C: { red: '炮', black: '砲' },
  P: { red: '兵', black: '卒' }
};

const INITIAL_CHESS_BOARD = [
  { x: 0, y: 0, type: 'r', side: 'black' }, { x: 1, y: 0, type: 'n', side: 'black' }, { x: 2, y: 0, type: 'b', side: 'black' }, { x: 3, y: 0, type: 'q', side: 'black' }, { x: 4, y: 0, type: 'k', side: 'black' }, { x: 5, y: 0, type: 'b', side: 'black' }, { x: 6, y: 0, type: 'n', side: 'black' }, { x: 7, y: 0, type: 'r', side: 'black' },
  { x: 0, y: 1, type: 'p', side: 'black' }, { x: 1, y: 1, type: 'p', side: 'black' }, { x: 2, y: 1, type: 'p', side: 'black' }, { x: 3, y: 1, type: 'p', side: 'black' }, { x: 4, y: 1, type: 'p', side: 'black' }, { x: 5, y: 1, type: 'p', side: 'black' }, { x: 6, y: 1, type: 'p', side: 'black' }, { x: 7, y: 1, type: 'p', side: 'black' },

  { x: 0, y: 6, type: 'p', side: 'white' }, { x: 1, y: 6, type: 'p', side: 'white' }, { x: 2, y: 6, type: 'p', side: 'white' }, { x: 3, y: 6, type: 'p', side: 'white' }, { x: 4, y: 6, type: 'p', side: 'white' }, { x: 5, y: 6, type: 'p', side: 'white' }, { x: 6, y: 6, type: 'p', side: 'white' }, { x: 7, y: 6, type: 'p', side: 'white' },
  { x: 0, y: 7, type: 'r', side: 'white' }, { x: 1, y: 7, type: 'n', side: 'white' }, { x: 2, y: 7, type: 'b', side: 'white' }, { x: 3, y: 7, type: 'q', side: 'white' }, { x: 4, y: 7, type: 'k', side: 'white' }, { x: 5, y: 7, type: 'b', side: 'white' }, { x: 6, y: 7, type: 'n', side: 'white' }, { x: 7, y: 7, type: 'r', side: 'white' }
];

const CHESS_PIECES = { k: { white: '♔', black: '♚' }, q: { white: '♕', black: '♛' }, r: { white: '♖', black: '♜' }, b: { white: '♗', black: '♝' }, n: { white: '♘', black: '♞' }, p: { white: '♙', black: '♟' } };
const CHESS_ASSETS = {
  p: { white: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg', black: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg' },
  n: { white: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg', black: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg' },
  b: { white: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg', black: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg' },
  r: { white: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg', black: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg' },
  q: { white: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg', black: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg' },
  k: { white: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg', black: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg' },
};

function getPieceAt(board, x, y) { return board.find(p => p.x === x && p.y === y) || null; }
function isInPalace(x, y, side) {
  if (x < 3 || x > 5) return false;
  return side === 'red' ? (y >= 7 && y <= 9) : (y >= 0 && y <= 2);
}

function getPseudoLegalMoves(board, piece) {
  const moves = [];
  const { x, y, side, type } = piece;

  const addIfValid = (tx, ty) => {
    if (tx < 0 || tx > 8 || ty < 0 || ty > 9) return false;
    const dest = getPieceAt(board, tx, ty);
    if (!dest) { moves.push({ x: tx, y: ty }); return true; }
    if (dest.side !== side) { moves.push({ x: tx, y: ty }); }
    return false;
  };

  if (type === 'K') {
    const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    for (const [dx, dy] of dirs) {
      const tx = x + dx, ty = y + dy;
      if (isInPalace(tx, ty, side)) addIfValid(tx, ty);
    }
  } else if (type === 'A') {
    const dirs = [[1,1], [1,-1], [-1,1], [-1,-1]];
    for (const [dx, dy] of dirs) {
      const tx = x + dx, ty = y + dy;
      if (isInPalace(tx, ty, side)) addIfValid(tx, ty);
    }
  } else if (type === 'E') {
    const dirs = [[2,2], [2,-2], [-2,2], [-2,-2]];
    for (const [dx, dy] of dirs) {
      const tx = x + dx, ty = y + dy;
      const eyeX = x + dx / 2, eyeY = y + dy / 2;
      const inSide = side === 'red' ? (ty >= 5 && ty <= 9) : (ty >= 0 && ty <= 4);
      if (inSide && !getPieceAt(board, eyeX, eyeY)) {
        addIfValid(tx, ty);
      }
    }
  } else if (type === 'H') {
    const horseMoves = [ { step: [0, 1], dests: [[1, 2], [-1, 2]] }, { step: [0, -1], dests: [[1, -2], [-1, -2]] }, { step: [1, 0], dests: [[2, 1], [2, -1]] }, { step: [-1, 0], dests: [[-2, 1], [-2, -1]] } ];
    for (const group of horseMoves) {
      const legX = x + group.step[0], legY = y + group.step[1];
      if (!getPieceAt(board, legX, legY)) {
        for (const [dx, dy] of group.dests) { addIfValid(x + dx, y + dy); }
      }
    }
  } else if (type === 'R') {
    const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    for (const [dx, dy] of dirs) {
      let tx = x + dx, ty = y + dy;
      while (tx >= 0 && tx <= 8 && ty >= 0 && ty <= 9) {
        const dest = getPieceAt(board, tx, ty);
        if (!dest) { moves.push({ x: tx, y: ty }); } else { if (dest.side !== side) moves.push({ x: tx, y: ty }); break; }
        tx += dx; ty += dy;
      }
    }
  } else if (type === 'C') {
    const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    for (const [dx, dy] of dirs) {
      let tx = x + dx, ty = y + dy;
      let screenFound = false;
      while (tx >= 0 && tx <= 8 && ty >= 0 && ty <= 9) {
        const dest = getPieceAt(board, tx, ty);
        if (!screenFound) {
          if (!dest) { moves.push({ x: tx, y: ty }); } else { screenFound = true; }
        } else {
          if (dest) { if (dest.side !== side) moves.push({ x: tx, y: ty }); break; }
        }
        tx += dx; ty += dy;
      }
    }
  } else if (type === 'P') {
    const forward = side === 'red' ? -1 : 1;
    addIfValid(x, y + forward);
    const crossedRiver = side === 'red' ? y <= 4 : y >= 5;
    if (crossedRiver) { addIfValid(x - 1, y); addIfValid(x + 1, y); }
  }
  return moves;
}

function isKingInCheck(board, side) {
  const king = board.find(p => p.type === 'K' && p.side === side);
  if (!king) return false;
  const enemySide = side === 'red' ? 'black' : 'red';
  const enemyKing = board.find(p => p.type === 'K' && p.side === enemySide);
  if (enemyKing && king.x === enemyKing.x) {
    const minY = Math.min(king.y, enemyKing.y);
    const maxY = Math.max(king.y, enemyKing.y);
    let countBetween = 0;
    for (let y = minY + 1; y < maxY; y++) {
      if (getPieceAt(board, king.x, y)) countBetween++;
    }
    if (countBetween === 0) return true;
  }
  for (const p of board) {
    if (p.side === enemySide) {
      const pMoves = getPseudoLegalMoves(board, p);
      if (pMoves.some(m => m.x === king.x && m.y === king.y)) { return true; }
    }
  }
  return false;
}

function getLegalMovesLocal(board, x, y, activeSide) {
  const piece = getPieceAt(board, x, y);
  if (!piece || piece.side !== activeSide) return [];
  const pseudoMoves = getPseudoLegalMoves(board, piece);
  const legalMoves = [];
  for (const m of pseudoMoves) {
    const nextBoard = board.filter(p => !(p.x === m.x && p.y === m.y)).map(p => (p.x === x && p.y === y ? { ...p, x: m.x, y: m.y } : p));
    if (!isKingInCheck(nextBoard, activeSide)) { legalMoves.push(m); }
  }
  return legalMoves;
}

function getPseudoLegalChessMoves(board, piece) {
  const moves = [];
  const { x, y, side, type } = piece;
  const addIfValid = (tx, ty) => {
    if (tx < 0 || tx > 7 || ty < 0 || ty > 7) return false;
    const dest = getPieceAt(board, tx, ty);
    if (!dest) { moves.push({ x: tx, y: ty }); return true; }
    if (dest.side !== side) { moves.push({ x: tx, y: ty }); }
    return false;
  };
  const addLine = (dx, dy) => {
    let tx = x + dx, ty = y + dy;
    while (tx >= 0 && tx <= 7 && ty >= 0 && ty <= 7) {
      const dest = getPieceAt(board, tx, ty);
      if (!dest) { moves.push({ x: tx, y: ty }); } else { if (dest.side !== side) moves.push({ x: tx, y: ty }); break; }
      tx += dx; ty += dy;
    }
  };
  if (type === 'k') {
    const dirs = [[1,1],[1,0],[1,-1],[0,1],[0,-1],[-1,1],[-1,0],[-1,-1]];
    dirs.forEach(([dx, dy]) => addIfValid(x + dx, y + dy));
  } else if (type === 'q') {
    const dirs = [[1,1],[1,0],[1,-1],[0,1],[0,-1],[-1,1],[-1,0],[-1,-1]];
    dirs.forEach(([dx, dy]) => addLine(dx, dy));
  } else if (type === 'r') {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    dirs.forEach(([dx, dy]) => addLine(dx, dy));
  } else if (type === 'b') {
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    dirs.forEach(([dx, dy]) => addLine(dx, dy));
  } else if (type === 'n') {
    const dirs = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    dirs.forEach(([dx, dy]) => addIfValid(x + dx, y + dy));
  } else if (type === 'p') {
    const dir = side === 'white' ? -1 : 1;
    const startRow = side === 'white' ? 6 : 1;
    if (y + dir >= 0 && y + dir <= 7 && !getPieceAt(board, x, y + dir)) {
      moves.push({ x, y: y + dir });
      if (y === startRow && !getPieceAt(board, x, y + dir * 2) && !getPieceAt(board, x, y + dir)) { moves.push({ x, y: y + dir * 2 }); }
    }
    [-1, 1].forEach(dx => {
      if (x + dx >= 0 && x + dx <= 7 && y + dir >= 0 && y + dir <= 7) {
        const dest = getPieceAt(board, x + dx, y + dir);
        if (dest && dest.side !== side) { moves.push({ x: x + dx, y: y + dir }); }
      }
    });
  }
  return moves;
}

function getLegalChessMovesLocal(board, x, y, activeSide) {
  const piece = getPieceAt(board, x, y);
  if (!piece || piece.side !== activeSide) return [];
  return getPseudoLegalChessMoves(board, piece);
}

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

const XiangqiBoard = ({ board, isFlipped = false, isPlaying = false, activeSide, playerSide, selectablePieces, selectedPiece, legalMoves, checkSide, onSelectPiece, onMove }) => {
  const findPiece = (x, y) => board.find(piece => piece.x === x && piece.y === y);
  const canMove = isPlaying && (!playerSide || playerSide === activeSide);
  const isLegalDestination = (x, y) => legalMoves.some(move => move.x === x && move.y === y);

  return (
    <div className={`@container relative w-full max-w-[600px] aspect-[8/9] bg-amber-100/95 border-2 sm:border-4 border-amber-900 rounded-xl sm:rounded-2xl p-2 sm:p-3 md:p-4 lg:p-5 shadow-[inset_0_0_20px_rgba(120,53,15,0.4),0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-500 flex flex-col justify-center items-center ${isFlipped ? 'rotate-180' : ''}`}>
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
                <span className={isFlipped ? 'rotate-180' : ''}>{PIECE_LABELS[piece.type][piece.side]}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

const ChessBoard = ({ board, isFlipped = false, isPlaying = false, activeSide, playerSide, selectedPiece, legalMoves, onSelectPiece, onMove }) => {
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
                   <img
                     src={CHESS_ASSETS[piece.type][piece.side]}
                     alt={`${piece.side} ${piece.type}`}
                     className="w-[90%] h-[90%] object-contain pointer-events-none"
                   />
                 </div>
               )}
             </div>
          )
        })}
      </div>
    </div>
  );
};

export default function Games() {
  const [lang, setLang] = useState('VI');
  const t = TRANSLATIONS[lang];

  const [bgmMuted, setBgmMuted] = useState(false);
  const [ping, setPing] = useState(18);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [joiningRoom, setJoiningRoom] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [roomName, setRoomName] = useState('');
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [isServerOwner, setIsServerOwner] = useState(true);
  const [activeTournament, setActiveTournament] = useState(null);
  const [isCreateTournamentModalOpen, setIsCreateTournamentModalOpen] = useState(false);

  // Lobby Config State
  const [lobbyMode, setLobbyMode] = useState('pvp');
  const [botEloLevel, setBotEloLevel] = useState(1200);
  const [isTimerEnabled, setIsTimerEnabled] = useState(true);
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // In-Game Room View State
  const [inGameRoom, setInGameRoom] = useState(null);
  const [redPlayer, setRedPlayer] = useState(null);
  const [blackPlayer, setBlackPlayer] = useState(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);
  const [redTurnTime, setRedTurnTime] = useState(900); // 15 mins
  const [blackTurnTime, setBlackTurnTime] = useState(900); // 15 mins
  const [currentTurn, setCurrentTurn] = useState('r');
  const [boardState, setBoardState] = useState(INITIAL_XIANGQI_BOARD);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [checkSide, setCheckSide] = useState(null);
  const [movesLog, setMovesLog] = useState([]);
  const [spectatorsList, setSpectatorsList] = useState(MOCK_VOICE_MEMBERS.slice(2, 4));

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [userCoins, setUserCoins] = useState(2450);

  useEffect(() => {
    const interval = setInterval(() => setPing(Math.floor(15 + Math.random() * 8)), 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!inGameRoom || !inGameRoom.isTimerEnabled || !matchStarted) return;
    const timer = setInterval(() => {
      if (currentTurn === 'r') {
        setRedTurnTime(prev => { if (prev <= 1) { triggerToast("Phe Trắng/Đỏ hết giờ! Đen thắng!"); setMatchStarted(false); return 0; } return prev - 1; });
      } else {
        setBlackTurnTime(prev => { if (prev <= 1) { triggerToast("Phe Đen hết giờ! Trắng/Đỏ thắng!"); setMatchStarted(false); return 0; } return prev - 1; });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [inGameRoom, currentTurn, matchStarted]);

  useEffect(() => {
    if (inGameRoom && blackPlayer && blackPlayer.id !== 'u1' && !blackPlayer.isReady) {
      const timer = setTimeout(() => setBlackPlayer(prev => prev ? {...prev, isReady: true} : prev), 3500);
      return () => clearTimeout(timer);
    }
  }, [inGameRoom, blackPlayer]);

  useEffect(() => {
    if (inGameRoom && !matchStarted) {
      if (redPlayer?.isReady && blackPlayer?.isReady) {
        setMatchStarted(true);
        triggerToast("Cả hai đã sẵn sàng, trận đấu bắt đầu!");
      }
    }
  }, [redPlayer?.isReady, blackPlayer?.isReady, inGameRoom, matchStarted]);

  const triggerToast = (msg) => { setToastMessage(msg); setShowInviteToast(true); setTimeout(() => setShowInviteToast(false), 3500); };
  const handleOpenRoomList = (game) => { setSelectedGame(game); setActiveModal('roomList'); setJoiningRoom(null); setPasswordError(''); setPasswordInput(''); };
  const handleOpenCreateRoom = (game) => { setSelectedGame(game); setRoomName(`Phòng của You (${game.title})`); setIsRoomLocked(false); setRoomPassword(''); setActiveModal('createRoom'); };

  const handleEnterGameRoom = (roomObj, gameType) => {
    setActiveModal(null);
    setInGameRoom({ id: roomObj?.id || 'r1', name: roomObj?.name || '🔥 Trận Đấu Mới', host: roomObj?.host || 'You', isTimerEnabled: roomObj?.isTimerEnabled ?? true, gameType: gameType });
    setRedPlayer(null); setBlackPlayer(null); setMatchStarted(false); setIsBoardFlipped(false);
    setRedTurnTime(900); setBlackTurnTime(900); setCurrentTurn('r');
    setBoardState(gameType === 'chess' ? INITIAL_CHESS_BOARD : INITIAL_XIANGQI_BOARD);
    setMovesLog([]);
  };

  const handleJoinRoom = (room) => {
    if (room.isLocked) { setJoiningRoom(room); setPasswordInput(''); setPasswordError(''); }
    else {
      if (selectedGame?.id === 'xiangqi' || room.name.includes('Cờ Tướng')) { handleEnterGameRoom(room, 'xiangqi'); }
      else if (selectedGame?.id === 'chess' || room.name.includes('Cờ Vua')) { handleEnterGameRoom(room, 'chess'); }
      else { alert(`Đã tham gia phòng "${room.name}"!`); setActiveModal(null); }
    }
  };

  const handleConfirmPassword = () => {
    if (joiningRoom && joiningRoom.pass === passwordInput) {
      if (selectedGame?.id === 'xiangqi' || joiningRoom.name.includes('Cờ Tướng')) { handleEnterGameRoom(joiningRoom, 'xiangqi'); }
      else if (selectedGame?.id === 'chess' || joiningRoom.name.includes('Cờ Vua')) { handleEnterGameRoom(joiningRoom, 'chess'); }
      else { alert(`Mật khẩu chính xác! Đã vào "${joiningRoom.name}".`); setActiveModal(null); }
      setJoiningRoom(null);
    } else { setPasswordError(t.invalidPasswordMsg); }
  };

  const handleLeaveSeat = (side) => {
    if (side === 'red') setRedPlayer(null); else setBlackPlayer(null);
    triggerToast(t.leftSeatMsg);
  };

  const handleSit = (side) => {
    const user = { id: 'u1', name: 'You (Me)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', isReady: false };
    if (side === 'red') {
      if (blackPlayer?.id === 'u1') setBlackPlayer(null);
      setRedPlayer(user);
    } else {
      if (redPlayer?.id === 'u1') setRedPlayer(null);
      setBlackPlayer(user);
    }
    setIsBoardFlipped(side === 'black');
    triggerToast("Bạn đã ngồi vào bàn đấu!");
  };

  const toggleReady = (side) => {
    if (side === 'red') setRedPlayer(prev => prev ? {...prev, isReady: !prev.isReady} : prev);
    else setBlackPlayer(prev => prev ? {...prev, isReady: !prev.isReady} : prev);
  };

  const handleSelectPiece = (x, y) => {
    if (!matchStarted) { triggerToast("Vui lòng đợi cả hai Sẵn Sàng!"); return; }
    const activeSide = currentTurn === 'r' ? (inGameRoom.gameType === 'chess' ? 'white' : 'red') : 'black';
    const piece = getPieceAt(boardState, x, y);
    if (piece && piece.side === activeSide) {
      setSelectedPiece({ x, y });
      if (inGameRoom.gameType === 'chess') setLegalMoves(getLegalChessMovesLocal(boardState, x, y, activeSide));
      else setLegalMoves(getLegalMovesLocal(boardState, x, y, activeSide));
    }
  };

  const handleMove = (fromX, fromY, toX, toY) => {
    if (!matchStarted) return;
    const activeSide = currentTurn === 'r' ? (inGameRoom.gameType === 'chess' ? 'white' : 'red') : 'black';
    if (!legalMoves.some(m => m.x === toX && m.y === toY)) return;

    const piece = getPieceAt(boardState, fromX, fromY);
    const targetPiece = getPieceAt(boardState, toX, toY);
    let newBoard = boardState.filter(p => !(p.x === toX && p.y === toY));
    newBoard = newBoard.map(p => (p.x === fromX && p.y === fromY) ? { ...p, x: toX, y: toY } : p);

    setBoardState(newBoard); setSelectedPiece(null); setLegalMoves([]);
    if (inGameRoom?.isTimerEnabled) {
      if (currentTurn === 'r') setRedTurnTime(prev => prev + 5);
      else setBlackTurnTime(prev => prev + 5);
    }

    let notation = '';
    if (inGameRoom.gameType === 'chess') notation = `${CHESS_PIECES[piece.type][piece.side]} (${String.fromCharCode(97+fromX)}${8-fromY}) -> (${String.fromCharCode(97+toX)}${8-toY})`;
    else notation = `${PIECE_LABELS[piece.type][piece.side]} (${fromX+1},${fromY+1}) -> (${toX+1},${toY+1})`;

    if (currentTurn === 'r') {
      setMovesLog(prev => [...prev, { id: prev.length + 1, red: notation, black: '...' }]);
      setCurrentTurn('b');
    } else {
      setMovesLog(prev => {
        const updated = [...prev];
        if (updated.length > 0) updated[updated.length - 1].black = notation;
        return updated;
      });
      setCurrentTurn('r');
    }

    if (targetPiece?.type === 'K' || targetPiece?.type === 'k') {
      triggerToast(`Phe ${activeSide === 'red' || activeSide === 'white' ? 'Trắng/Đỏ' : 'Đen'} đã chiến thắng!`);
      setMatchStarted(false);
    }
  };

  const handleRequestSwap = () => {
    if (matchStarted) { triggerToast("Không thể đổi phe khi trận đấu đã bắt đầu!"); return; }
    triggerToast(t.swapRequestMsg);
    const currentRed = redPlayer; const currentBlack = blackPlayer;
    setTimeout(() => {
      triggerToast("Đối thủ đã chấp nhận đổi phe!");
      setRedPlayer(currentBlack); setBlackPlayer(currentRed);
      if (currentBlack?.id === 'u1') setIsBoardFlipped(false);
      else if (currentRed?.id === 'u1') setIsBoardFlipped(true);
    }, 2000);
  };

  const renderPlayerProfile = (isTopSeat) => {
    const side = isTopSeat ? (isBoardFlipped ? 'red' : 'black') : (isBoardFlipped ? 'black' : 'red');
    const player = side === 'red' ? redPlayer : blackPlayer;
    const time = side === 'red' ? redTurnTime : blackTurnTime;
    const isMyTurn = currentTurn === (side === 'red' ? 'r' : 'b');
    const isChess = inGameRoom?.gameType === 'chess';
    const sideName = side === 'red' ? (isChess ? 'Phe Trắng (♙)' : 'Phe Đỏ (♙)') : 'Phe Đen (♟)';
    const sideColor = side === 'red' ? 'text-red-400' : 'text-slate-400';
    const ringColor = side === 'red' ? 'ring-red-500/80' : 'ring-slate-500/80';
    const timeBg = side === 'red' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-slate-950';
    const emptySeatLabel = isChess ? (side === 'red' ? 'Trắng' : 'Đen') : (side === 'red' ? 'Đỏ' : 'Đen');

    const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60); const s = seconds % 60;
      return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
      <div className="group relative bg-slate-900 border-4 border-slate-950 rounded-2xl p-2 sm:p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col xl:flex-row items-center justify-center xl:justify-between shrink-0 overflow-hidden min-h-[85px] gap-2 w-full h-full">
        {player ? (
          <>
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 w-full text-center sm:text-left">
              <div className="relative group/avatar shrink-0">
                <img src={player.avatar} alt={player.name} className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-3 border-slate-950 object-cover shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ring-2 ${ringColor}`} />
                {player.id === 'u1' && !matchStarted && (
                  <button onClick={() => handleLeaveSeat(side)} className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-400 text-white rounded-full p-0.5 border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-110 z-30" title="Rời ghế"><X className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></button>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start w-full">
                <div className="text-[10px] sm:text-xs font-black text-white flex items-center justify-center sm:justify-start gap-1 w-full"><span className="truncate max-w-[70px] sm:max-w-[90px]">{player.name}</span>{player.id !== 'u1' && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}</div>
                <div className={`text-[9px] sm:text-[10px] font-mono font-extrabold ${sideColor}`}>{sideName}</div>
              </div>
            </div>
            {!matchStarted ? (
              <button onClick={() => player.id === 'u1' ? toggleReady(side) : null} className={`w-full xl:w-auto px-2 py-1.5 rounded-xl font-black text-[10px] sm:text-xs border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0 ${player.isReady ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {player.isReady ? 'SẴN SÀNG' : (player.id === 'u1' ? 'SẴN SÀNG?' : 'ĐANG CHỜ')}
              </button>
            ) : (
              inGameRoom?.isTimerEnabled && (
                <div className={`w-full xl:w-auto px-2 py-1 text-center rounded-xl font-mono font-black text-xs border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 ${isMyTurn ? `${timeBg} animate-pulse` : 'bg-slate-950 text-slate-400'}`}>{formatTime(time)}</div>
              )
            )}
            {player.id !== 'u1' && !matchStarted && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-2 z-20">
                <button onClick={() => handleRequestSwap()} className="w-full py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 uppercase">
                  <ArrowLeftRight className="w-4 h-4" /> Đổi Phe
                </button>
              </div>
            )}
          </>
        ) : (
          <button onClick={() => handleSit(side)} className="w-full h-full py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 hover:border-slate-400 text-slate-400 hover:text-white font-black text-[10px] sm:text-xs transition-colors uppercase flex items-center justify-center gap-1 sm:gap-2">
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">Ngồi {emptySeatLabel}</span>
          </button>
        )}
      </div>
    );
  };

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
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden antialiased bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]">

      {!inGameRoom && (
        <header className="h-16 bg-slate-900 border-b-4 border-slate-950 px-4 flex items-center justify-between z-30 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div onClick={() => setInGameRoom(null)} className="flex items-center gap-2 bg-yellow-400 text-slate-900 px-3 py-1.5 rounded-xl border-3 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-extrabold text-sm md:text-base -rotate-1 cursor-pointer hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5 animate-bounce" />
              <span className="tracking-wide uppercase font-black">{t.hubTitle}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border-2 border-slate-700 px-3 py-1 rounded-lg text-xs">
              <span className="text-slate-400 font-semibold">{t.serverName}</span><span className="text-slate-600">•</span>
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> {t.voiceChannel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-950 border-2 border-slate-800 px-2.5 py-1 rounded-lg text-xs">
              <Signal className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 font-mono font-bold">{ping} ms</span><span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 border-2 border-slate-950 px-2.5 py-1 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="relative group cursor-pointer">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="Avatar" className="w-9 h-9 rounded-full border-2 border-yellow-400 object-cover shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:scale-105 transition-transform" />
                <span className="absolute -bottom-1 -right-1 bg-purple-600 text-[8px] font-black px-1 rounded-full text-white border-2 border-slate-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">Lv42</span>
              </div>
              <div className="hidden lg:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white leading-none">{isServerOwner ? t.ownerLabel : t.memberLabel}</span>
                  <button onClick={() => setIsServerOwner(!isServerOwner)} className={`text-[9px] font-black px-1.5 py-0.5 rounded border transition-all ${isServerOwner ? 'bg-amber-400 text-slate-950 border-slate-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-700 text-slate-300 border-slate-600 hover:text-white'}`}>
                    {isServerOwner ? '👑 Owner' : '👤 User'}
                  </button>
                </div>
                <div className="text-[11px] font-bold text-yellow-400 flex items-center gap-1 mt-0.5"><Trophy className="w-3 h-3" /> {userCoins.toLocaleString()} Coins</div>
              </div>
            </div>
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5" title={t.settingsTitle}><Sliders className="w-4 h-4" /></button>
            <button onClick={() => setIsRulesModalOpen(true)} className="p-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"><HelpCircle className="w-4 h-4" /></button>
            <button onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)} className="lg:hidden p-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><Menu className="w-4 h-4" /></button>
          </div>
        </header>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {inGameRoom ? (
          <main className="flex-1 overflow-y-auto lg:overflow-hidden p-2 sm:p-4 flex flex-col gap-3 bg-slate-950 relative custom-scrollbar">
            <div className="bg-slate-900 border-4 border-slate-950 rounded-2xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={() => setInGameRoom(null)} className="px-3 py-1.5 sm:py-2 bg-rose-500 hover:bg-rose-400 text-white font-black text-[10px] sm:text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center gap-1.5 uppercase">
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="hidden sm:inline">{t.exitRoom}</span>
                </button>
                <button onClick={() => setIsSettingsModalOpen(true)} className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all" title={t.settingsTitle}><Sliders className="w-4 h-4" /></button>
                <div className="text-slate-300">
                  <h2 className="font-black text-[11px] sm:text-sm text-yellow-400 flex items-center gap-1.5 sm:gap-2"><span className="truncate max-w-[120px] sm:max-w-[200px]">{inGameRoom.name}</span><span className="text-[9px] sm:text-[10px] bg-slate-950 text-cyan-400 border border-slate-800 px-1.5 sm:px-2 py-0.5 rounded-md shrink-0">PvP 1v1</span></h2>
                </div>
              </div>
            </div>

            {/* Grid Layout inside Room */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_1fr_auto] gap-3 lg:gap-4 min-h-0 relative z-10 pb-6 lg:pb-0">

              <div className="order-1 lg:order-none lg:col-start-4 lg:col-span-6 lg:row-start-1 lg:row-span-3 flex flex-col items-center justify-center bg-slate-900 border-4 border-slate-950 rounded-2xl p-2 sm:p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative w-full lg:min-h-0">
                <div className="w-full h-full max-h-[75vh] flex items-center justify-center">
                  {inGameRoom.gameType === 'chess' ? (
                    <ChessBoard board={boardState} isFlipped={isBoardFlipped} isPlaying={true} activeSide={currentTurn === 'r' ? 'white' : 'black'} playerSide={redPlayer?.id === 'u1' ? 'white' : blackPlayer?.id === 'u1' ? 'black' : null} selectedPiece={selectedPiece} legalMoves={legalMoves} onSelectPiece={handleSelectPiece} onMove={handleMove} />
                  ) : (
                    <XiangqiBoard board={boardState} isFlipped={isBoardFlipped} isPlaying={true} activeSide={currentTurn === 'r' ? 'red' : 'black'} playerSide={redPlayer?.id === 'u1' ? 'red' : blackPlayer?.id === 'u1' ? 'black' : null} selectedPiece={selectedPiece} legalMoves={legalMoves} checkSide={checkSide} onSelectPiece={handleSelectPiece} onMove={handleMove} />
                  )}
                </div>
              </div>

              <div className="lg:hidden order-2 grid grid-cols-2 gap-2 shrink-0">
                {renderPlayerProfile(true)}
                {renderPlayerProfile(false)}
              </div>

              <div className="order-3 lg:order-none lg:col-start-1 lg:col-span-3 lg:row-start-1 lg:row-span-1 bg-slate-900 border-4 border-slate-950 rounded-2xl p-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2.5 shrink-0">
                <div className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" /> Thao Tác Trận Đấu</div>
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={!matchStarted} onClick={() => triggerToast(t.drawOfferMsg)} className={`py-2 px-1.5 sm:px-3 font-black text-[10px] sm:text-xs rounded-xl border-2 transition-all flex items-center justify-center gap-1 sm:gap-2 uppercase ${matchStarted ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5' : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'}`}>
                    <Handshake className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">{t.offerDraw}</span>
                  </button>
                  <button disabled={!matchStarted} onClick={() => triggerToast(t.resignMsg)} className={`py-2 px-1.5 sm:px-3 font-black text-[10px] sm:text-xs rounded-xl border-2 transition-all flex items-center justify-center gap-1 sm:gap-2 uppercase ${matchStarted ? 'bg-rose-600 hover:bg-rose-500 text-white border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5' : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'}`}>
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
                  {movesLog.map((m) => (
                    <div key={m.id} className="grid grid-cols-12 gap-1 p-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[10px] sm:text-[11px]">
                      <span className="col-span-2 text-slate-500 font-bold">#{m.id}</span>
                      <span className="col-span-5 text-red-400 font-bold truncate">{m.red}</span>
                      <span className="col-span-5 text-yellow-300 font-bold truncate">{m.black}</span>
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
                  {spectatorsList.map((spec) => (
                    <div key={spec.id} className="p-2 bg-slate-950 border-2 border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <img src={spec.avatar} alt={spec.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-950 object-cover shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0" />
                        <div className="min-w-0"><div className="text-[10px] sm:text-xs font-extrabold text-slate-200 leading-tight truncate">{spec.name}</div><div className="text-[8px] sm:text-[9px] font-mono text-slate-400">{spec.elo} ELO</div></div>
                      </div>
                      <span className="text-[8px] sm:text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 font-bold shrink-0">Khán Giả</span>
                    </div>
                  ))}
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
        ) : (

          <main className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-4 custom-scrollbar">
            {activeTournament ? (
              <div className="relative rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-500 border-4 border-slate-950 p-4 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden shrink-0">
                <div className="absolute -right-6 -bottom-6 opacity-20 text-slate-950 text-9xl font-black italic pointer-events-none">VS</div>
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 bg-yellow-300 text-slate-950 px-3 py-1 rounded-full text-xs font-black border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><Flame className="w-4 h-4 fill-orange-500 text-orange-500" /> GIẢI ĐẤU ĐANG DIỄN RA</div>
                      {activeTournament.prize && (<div className="bg-slate-950/80 text-yellow-300 px-2.5 py-0.5 rounded-full text-xs font-extrabold border border-yellow-400/40">🎁 {activeTournament.prize}</div>)}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wide">{activeTournament.title}</h2>
                    <p className="text-xs sm:text-sm text-red-100 font-bold mt-1 max-w-lg">{activeTournament.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button onClick={() => { const game = GAMES_DATA.find(g => g.id === activeTournament.gameId) || GAMES_DATA[0]; handleOpenRoomList(game); }} className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm rounded-xl border-3 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all flex items-center gap-2 shrink-0"><Zap className="w-5 h-5 fill-slate-950" /> THAM GIA NGAY</button>
                    {isServerOwner && (<button onClick={() => setActiveTournament(null)} className="px-3 py-3 bg-slate-950 hover:bg-rose-950 text-rose-400 hover:text-rose-300 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1 shrink-0"><X className="w-4 h-4" /> {t.deleteTournamentBtn}</button>)}
                  </div>
                </div>
              </div>
            ) : isServerOwner ? (
              <div className="rounded-2xl border-4 border-dashed border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/10 border-2 border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0"><Crown className="w-5 h-5" /></div>
                  <div><div className="text-xs font-black text-amber-400 uppercase tracking-wider">Quyền Server Owner</div><div className="text-sm font-bold text-slate-300">Chưa có giải đấu nào. Tạo giải đấu để thu hút thành viên Server tham gia!</div></div>
                </div>
                <button onClick={() => setIsCreateTournamentModalOpen(true)} className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl border-3 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all flex items-center gap-2 uppercase tracking-wide shrink-0"><PlusCircle className="w-4 h-4" /> {t.createTournamentBtn}</button>
              </div>
            ) : null}

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
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 ${game.badgeColor}`}>{game.badge}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed mb-2">{game.desc}</p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-3">
                        <span className="bg-slate-950/80 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 shrink-0"><Users className="w-3 h-3 text-cyan-400" /> {game.players}</span>
                        <span className="bg-slate-950/80 text-yellow-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 shrink-0"><Bot className="w-3 h-3 text-yellow-400" /> {game.aiElo}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button onClick={() => handleOpenRoomList(game)} className="py-1.5 sm:py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-[10px] sm:text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1"><Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-slate-950" /> {t.quickPlay}</button>
                        <button onClick={() => handleOpenCreateRoom(game)} className="py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] sm:text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1"><PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" /> {t.createRoom}</button>
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
        )}

        {!inGameRoom && (
          <aside className={`w-80 bg-slate-900 border-l-4 border-slate-950 flex flex-col shrink-0 z-20 transition-all duration-300 ${isSidebarOpenMobile ? 'fixed inset-y-0 right-0 shadow-2xl flex' : 'hidden lg:flex'}`}>
            <div className="p-4 border-b-4 border-slate-950 bg-slate-950/50 flex items-center justify-between">
              <div className="flex items-center gap-2"><Radio className="w-4 h-4 text-emerald-400 animate-pulse" /><span className="font-black text-xs uppercase tracking-wider text-white">{t.voiceMembers}</span></div>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">{MOCK_VOICE_MEMBERS.length} Online</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {MOCK_VOICE_MEMBERS.map((member) => (
                <div key={member.id} className="p-2.5 bg-slate-950 border-2 border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="relative"><img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" /><span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950"></span></div>
                    <div>
                      <div className="flex items-center gap-1.5"><span className="font-extrabold text-xs text-white leading-tight">{member.name}</span>{member.role === 'Host' && (<Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}</div>
                      <span className="text-[10px] font-bold text-slate-400">Lv.{member.level} • {member.role}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${member.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : member.status === 'in-game' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{member.status === 'ready' ? t.statusReady : member.status === 'in-game' ? t.statusInGame : t.statusInLobby}</span>
                </div>
              ))}
              <button onClick={() => triggerToast("Đã gửi lời mời Activity tới Discord Chat!")} className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2"><Share2 className="w-3.5 h-3.5" />{t.inviteDiscord}</button>
            </div>
            <div className="p-3 border-t-4 border-slate-950 bg-slate-950/80 space-y-2">
              <div className="flex items-center justify-between mb-1"><span className="font-black text-xs uppercase tracking-wider text-yellow-400 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-yellow-400" />{t.leaderboard}</span></div>
              <div className="space-y-1.5">
                {MOCK_LEADERBOARD.map((item) => (
                  <div key={item.rank} className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><span className="font-black w-5 text-center text-slate-400">{item.badge}</span><div><div className="font-bold text-white text-[11px]">{item.name}</div><div className="text-[9px] text-slate-400 font-semibold">{item.game}</div></div></div>
                    <span className="font-mono font-black text-yellow-400 text-xs">{item.elo} ELO</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {!inGameRoom && isSidebarOpenMobile && (<div onClick={() => setIsSidebarOpenMobile(false)} className="lg:hidden fixed inset-0 bg-slate-950/70 z-10 backdrop-blur-sm" />)}
      </div>

      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-4 border-slate-950 rounded-3xl w-full max-w-sm p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3"><h3 className="font-black text-sm text-yellow-400 flex items-center gap-2"><Sliders className="w-4 h-4 text-yellow-400" /> {t.settingsTitle}</h3><button onClick={() => setIsSettingsModalOpen(false)} className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"><X className="w-4 h-4" /></button></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border-2 border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-2">{bgmMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />} {t.soundSetting}</span>
                <button onClick={() => setBgmMuted(!bgmMuted)} aria-label={t.soundSetting} aria-pressed={!bgmMuted} className={`w-10 h-6 rounded-full p-1 border-2 border-slate-950 transition-colors ${!bgmMuted ? 'bg-emerald-500' : 'bg-slate-800'}`}><div className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform ${!bgmMuted ? 'translate-x-4' : 'translate-x-0'}`}></div></button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border-2 border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /> {t.languageSetting}</span>
                <button onClick={() => setLang(lang === 'VI' ? 'EN' : 'VI')} className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-lg border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5">{lang}</button>
              </div>
            </div>
            <div className="pt-2"><button onClick={() => setIsSettingsModalOpen(false)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border-2 border-slate-950 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5">{t.close}</button></div>
          </div>
        </div>
      )}

      {activeModal === 'roomList' && selectedGame && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-4 border-slate-950 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
            <div className={`p-4 bg-slate-800 border-b-4 border-slate-950 flex items-center justify-between text-white relative`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-950/40 border-2 border-slate-950 relative overflow-hidden shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                  <div className="absolute inset-0 scale-[0.65]">
                    <GameThumbnailContent gameId={selectedGame.id} defaultIcon={selectedGame.icon} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                    {t.roomListTitle} - {selectedGame.title}
                  </h3>
                  <p className="text-xs font-bold text-slate-300 opacity-90">{t.roomListDesc}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 bg-slate-950/60 hover:bg-slate-950 text-white rounded-xl border-2 border-slate-950 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-3 flex-1">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border-2 border-slate-800 mb-2">
                <div className="text-xs font-bold text-slate-300">Đang tìm kiếm phòng chơi phù hợp?</div>
                <button onClick={() => handleOpenCreateRoom(selectedGame)} className="px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center gap-1.5"><PlusCircle className="w-4 h-4" /> {t.createRoomBtn}</button>
              </div>
              {(MOCK_ROOMS[selectedGame.id] || []).length > 0 ? (
                (MOCK_ROOMS[selectedGame.id] || []).map((room) => (
                  <div key={room.id} className="p-3.5 bg-slate-950 border-2 border-slate-800 hover:border-yellow-400/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{room.name}</span>
                        {room.isLocked ? (<span className="bg-rose-500/20 text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-500/40 flex items-center gap-1"><Lock className="w-3 h-3" /> {t.lockedBadge}</span>) : (<span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1"><Unlock className="w-3 h-3" /> {t.openBadge}</span>)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold"><span>Chủ phòng: <strong className="text-slate-200">{room.host}</strong></span><span>•</span><span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-cyan-400" /> {room.players}/{room.maxPlayers}</span><span>•</span><span className={room.status === 'in-game' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>{room.status === 'in-game' ? t.statusInGame : t.statusReady}</span></div>
                    </div>
                    <button disabled={room.players >= room.maxPlayers || room.status === 'in-game'} onClick={() => handleJoinRoom(room)} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border-2 border-slate-950 font-black text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 ${room.players >= room.maxPlayers || room.status === 'in-game' ? 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed shadow-none' : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950'}`}>
                      <DoorOpen className="w-4 h-4" /> {t.joinRoomBtn}
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center space-y-2"><ShieldAlert className="w-10 h-10 text-slate-600 mx-auto" /><p className="text-xs text-slate-400 font-bold">{t.noRoomsFound}</p></div>
              )}
            </div>
            <div className="p-3 bg-slate-950 border-t-4 border-slate-950 flex justify-end"><button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border-2 border-slate-950">{t.close}</button></div>
          </div>
        </div>
      )}

      {joiningRoom && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-4 border-slate-950 rounded-3xl w-full max-w-sm p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3"><h3 className="font-black text-sm text-yellow-400 flex items-center gap-2"><KeyRound className="w-4 h-4 text-yellow-400" /> {t.enterPasswordTitle}</h3><button onClick={() => setJoiningRoom(null)} className="p-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"><X className="w-4 h-4" /></button></div>
            <div className="space-y-2">
              <p className="text-xs text-slate-300 font-medium">Phòng <strong className="text-white">"{joiningRoom.name}"</strong> yêu cầu mật khẩu để truy cập.</p>
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder={t.roomPasswordPlaceholder} className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-400" />
              {passwordError && (<p className="text-[11px] font-bold text-rose-400">{passwordError}</p>)}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={() => setJoiningRoom(null)} className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border-2 border-slate-950">{t.close}</button>
              <button onClick={handleConfirmPassword} className="flex-1 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{t.submitPasswordBtn}</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'createRoom' && selectedGame && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }} className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-4 border-slate-950 rounded-3xl w-full max-w-lg overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]">
            <div className={`p-4 bg-slate-800 border-b-4 border-slate-950 flex items-center justify-between text-white relative`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-950/40 border-2 border-slate-950 relative overflow-hidden shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                  <div className="absolute inset-0 scale-[0.65]">
                    <GameThumbnailContent gameId={selectedGame.id} defaultIcon={selectedGame.icon} />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                    {t.createRoomBtn} - {selectedGame.title}
                  </h3>
                  <p className="text-xs font-bold text-slate-300 opacity-90">{t.lobbyTitle}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 bg-slate-950/60 hover:bg-slate-950 text-white rounded-xl border-2 border-slate-950 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
              <div className="bg-slate-950 p-3.5 rounded-2xl border-2 border-slate-800 space-y-3">
                <label className="text-xs font-black text-yellow-400 uppercase tracking-wider block">1. Thông Tin Phòng Chơi</label>
                <div>
                  <span className="text-xs font-bold text-slate-300 block mb-1">{t.roomNameLabel}</span>
                  <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder={t.roomNamePlaceholder} className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-yellow-400" />
                </div>
                <div className="pt-2 border-t border-slate-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-rose-400" /> {t.isRoomLocked}</span>
                    <button aria-label={t.isRoomLocked} aria-pressed={isRoomLocked} onClick={() => setIsRoomLocked(!isRoomLocked)} className={`w-10 h-6 rounded-full p-1 border-2 border-slate-950 transition-colors ${isRoomLocked ? 'bg-rose-500' : 'bg-slate-800'}`}><div className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform ${isRoomLocked ? 'translate-x-4' : 'translate-x-0'}`}></div></button>
                  </div>
                  {isRoomLocked && (
                    <div className="pt-1 animate-in fade-in duration-150">
                      <span className="text-[11px] font-extrabold text-rose-300 block mb-1">{t.roomPasswordLabel}</span>
                      <input type="password" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder={t.roomPasswordPlaceholder} className="w-full bg-slate-900 border-2 border-rose-500/50 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-rose-400" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">2. {t.gameMode}</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border-2 border-slate-800">
                  <button onClick={() => setLobbyMode('pvp')} className={`py-2 px-3 rounded-xl border-2 font-black text-xs transition-all flex flex-col items-center gap-1 ${lobbyMode === 'pvp' ? 'bg-cyan-400 border-slate-950 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent border-transparent text-slate-400 hover:text-white'}`}><Users className="w-4 h-4" /> {t.pvpMode}</button>
                  <button onClick={() => setLobbyMode('pve')} className={`py-2 px-3 rounded-xl border-2 font-black text-xs transition-all flex flex-col items-center gap-1 ${lobbyMode === 'pve' ? 'bg-yellow-400 border-slate-950 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent border-transparent text-slate-400 hover:text-white'}`}><Bot className="w-4 h-4" /> {t.pveMode}</button>
                </div>
              </div>

              {lobbyMode === 'pve' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">{t.botElo}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[ { level: 500, label: t.easy, color: 'text-emerald-400' }, { level: 1200, label: t.medium, color: 'text-yellow-400' }, { level: 2000, label: t.hard, color: 'text-rose-400' } ].map((bot) => (
                      <button key={bot.level} onClick={() => setBotEloLevel(bot.level)} className={`py-2 px-1 rounded-xl border-2 font-black text-[10px] transition-all flex flex-col items-center gap-1 text-center ${botEloLevel === bot.level ? 'bg-slate-800 border-slate-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                        <span className={botEloLevel === bot.level ? bot.color : 'text-inherit'}>{bot.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">3. {t.matchRules}</label>
                <div className="space-y-2 bg-slate-950 p-3 rounded-2xl border-2 border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Tính Giờ Đấu (15p + 5s)</span>
                    <button aria-label="Bật/tắt giờ đấu" onClick={() => setIsTimerEnabled(!isTimerEnabled)} className={`w-10 h-6 rounded-full p-1 border-2 border-slate-950 transition-colors ${isTimerEnabled ? 'bg-cyan-400' : 'bg-slate-800'}`}><div className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform ${isTimerEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div></button>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                    <span className="text-xs font-bold text-slate-300">{t.allowSpectator}</span>
                    <button aria-label="Bật/tắt quyền khán giả" aria-pressed={allowSpectators} onClick={() => setAllowSpectators(!allowSpectators)} className={`w-10 h-6 rounded-full p-1 border-2 border-slate-950 transition-colors ${allowSpectators ? 'bg-cyan-400' : 'bg-slate-800'}`}><div className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform ${allowSpectators ? 'translate-x-4' : 'translate-x-0'}`}></div></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t-4 border-slate-950 flex gap-3">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl border-2 border-slate-950 transition-all">HỦY</button>
              <button onClick={() => { if (selectedGame?.id === 'xiangqi' || selectedGame?.id === 'chess') { handleEnterGameRoom({ id: 'r_new', name: roomName, host: 'You', isLocked: isRoomLocked, isTimerEnabled: isTimerEnabled }, selectedGame.id); } else { alert(`Đã tạo phòng ${roomName}! Chuyển bạn vào Kênh Thoại...`); setActiveModal(null); } }} className="flex-[2] py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2"><Check className="w-4 h-4" /> {t.startBtn}</button>
            </div>
          </div>
        </div>
      )}

      {showInviteToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-full border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-xs flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300"><Check className="w-4 h-4" /> {toastMessage}</div>
      )}

      {isCreateTournamentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-4 border-slate-950 rounded-3xl w-full max-w-md overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <div className="p-4 bg-amber-500 border-b-4 border-slate-950 flex items-center justify-between text-slate-950"><h3 className="text-sm font-black flex items-center gap-2"><Trophy className="w-5 h-5" /> {t.createTournamentTitle}</h3><button onClick={() => setIsCreateTournamentModalOpen(false)} className="p-1 bg-slate-950 text-white rounded-lg border-2 border-slate-950"><X className="w-4 h-4" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="text-xs font-bold text-slate-300 mb-1 block">{t.tournamentNameInput}</label><input type="text" placeholder="VD: Giải Đấu Mùa Xuân 2026" className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-400 outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-300 mb-1 block">{t.selectGameInput}</label><select className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-400 outline-none">{GAMES_DATA.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
              <div><label className="text-xs font-bold text-slate-300 mb-1 block">{t.prizeInput}</label><input type="text" placeholder="VD: 10.000 Vàng + Role VIP" className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-400 outline-none" /></div>
            </div>
            <div className="p-4 bg-slate-950 border-t-4 border-slate-950 flex justify-end gap-3">
              <button onClick={() => setIsCreateTournamentModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl border-2 border-slate-950">{t.close}</button>
              <button onClick={() => { setActiveTournament({ title: 'GIẢI ĐẤU MÙA XUÂN 2026', desc: 'Giải đấu giao hữu Server do Owner tổ chức.', prize: '10.000 Vàng + Role VIP', gameId: 'xiangqi' }); setIsCreateTournamentModalOpen(false); triggerToast("Tạo giải đấu thành công!"); }} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all">{t.confirmCreateTournament}</button>
            </div>
          </div>
        </div>
      )}

      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-4 border-slate-950 rounded-3xl w-full max-w-md p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3"><h3 className="font-black text-sm text-yellow-400 flex items-center gap-2"><HelpCircle className="w-5 h-5" /> {t.rulesTitle}</h3></div>
            <p className="text-sm text-slate-300 font-medium leading-relaxed">{t.rulesContent}</p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><span className="w-4 h-4 bg-emerald-500/20 text-emerald-400 flex items-center justify-center rounded border border-emerald-500/50">1</span> Tạo hoặc Tham gia phòng chơi.</div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><span className="w-4 h-4 bg-cyan-500/20 text-cyan-400 flex items-center justify-center rounded border border-cyan-500/50">2</span> Mời bạn bè trong Voice Channel.</div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><span className="w-4 h-4 bg-amber-500/20 text-amber-400 flex items-center justify-center rounded border border-amber-500/50">3</span> Chiến thắng để nhận ELO và Vàng!</div>
            </div>
            <button onClick={() => setIsRulesModalOpen(false)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all">{t.close}</button>
          </div>
        </div>
      )}

    </div>
  );
}
