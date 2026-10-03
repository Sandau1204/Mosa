'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Gamepad2, Trophy, Users, Bot, Sparkles, Volume2, VolumeX, Globe, HelpCircle,
  Search, Swords, Play, PlusCircle, X, Check, ChevronRight, Crown, MessageSquare,
  ShieldAlert, Flame, Zap, Radio, Signal, UserCheck, RotateCcw,
  Sliders, Share2, Menu, ChevronDown, Lock, Unlock, KeyRound, DoorOpen, LogOut,
  ArrowLeftRight, UserMinus, UserPlus, Send, Settings
} from 'lucide-react';
import GameRoomShell from './GameRoomShell';
import ChessRoom from './games/ChessRoom';
import MonopolyRoom from './games/MonopolyRoom';
import XiangqiRoom from './games/XiangqiRoom';

const TRANSLATIONS = {
  VI: {
    hubTitle: "MOSA GAMES",
    noGuilds: "Bot chưa tham gia server Discord nào mà bạn đang ở trong đó.",
    loadingLobby: "Đang tải dữ liệu Game Hub...",
    lobbyLoadError: "Không thể tải dữ liệu Game Hub.",
    noVoiceMembers: "Hiện không có thành viên nào trong kênh thoại.",
    noSpectators: "Chưa có khán giả trong phòng.",
    noLeaderboard: "Chưa có kết quả trận đấu được ghi nhận.",
    inviteError: "Không thể tạo lời mời Discord.",
    unsupportedGameRoom: "Đã tham gia phòng. Giao diện chơi trò này chưa được hỗ trợ.",
    unsupportedGameCreated: "Đã tạo phòng. Trò chơi này chưa có giao diện chơi.",
    tournamentCreated: "Đã tạo giải đấu.",
    leaveRoom: "Rời phòng",
    serverLabel: "Server",
    serverName: "Server",
    voiceChannel: "Kênh thoại",
    onlinePlayers: "Đang online",
    ping: "Ping",
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
    discordConnecting: "Đang kết nối tài khoản Discord...",
    discordLoginTitle: "Đăng nhập để chơi",
    discordLoginDescription: "Kết nối tài khoản Discord để tiếp tục vào Game Hub.",
    discordLoginBtn: "Đăng nhập Discord",
    discordOpenInDiscord: "Hãy mở Game Hub trong ứng dụng Discord để xác thực bằng Embedded App SDK.",
    discordAuthError: "Không thể xác thực Discord. Vui lòng thử lại.",
    discordRetryBtn: "Thử lại",
    discordConfigError: "Game Hub chưa được cấu hình Discord Client ID.",
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
    hubTitle: "MOSA GAMES",
    noGuilds: "The bot is not in any Discord server that you belong to.",
    loadingLobby: "Loading Game Hub data...",
    lobbyLoadError: "Could not load Game Hub data.",
    noVoiceMembers: "There are no members in voice channels right now.",
    noSpectators: "There are no spectators in this room.",
    noLeaderboard: "No completed game results have been recorded.",
    inviteError: "Could not create a Discord invite.",
    unsupportedGameRoom: "Joined the room. Gameplay for this game is not available yet.",
    unsupportedGameCreated: "Room created. Gameplay for this game is not available yet.",
    tournamentCreated: "Tournament created.",
    leaveRoom: "Leave room",
    serverLabel: "Server",
    serverName: "Server",
    voiceChannel: "Voice channel",
    onlinePlayers: "Online",
    ping: "Ping",
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
    discordConnecting: "Connecting your Discord account...",
    discordLoginTitle: "Sign in to play",
    discordLoginDescription: "Connect your Discord account to continue to the Game Hub.",
    discordLoginBtn: "Sign in with Discord",
    discordOpenInDiscord: "Open the Game Hub in the Discord app to authenticate with the Embedded App SDK.",
    discordAuthError: "Discord authentication failed. Please try again.",
    discordRetryBtn: "Try again",
    discordConfigError: "The Game Hub is missing its Discord Client ID configuration.",
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
  { id: 'xiangqi', isAvailable: true, title: 'Cờ Tướng (Xiangqi)', desc: 'Cờ Tướng truyền thống đỉnh cao, đấu 1v1 hoặc tập luyện với AI Kiện Tướng.', category: '1v1', isStrategy: true, players: '1v1', aiElo: '300 - 2400 ELO', badge: 'HOT 🔥', badgeColor: 'bg-rose-500 text-white', bgGradient: 'from-amber-500 to-red-600', icon: '♟️' },
  { id: 'chess', isAvailable: true, title: 'Cờ Vua (Chess)', desc: 'Thách đấu Cờ Vua chuẩn quốc tế với bảng phân tích nước đi và Replay.', category: '1v1', isStrategy: true, players: '1v1', aiElo: '400 - 2800 ELO', badge: 'POPULAR 🏆', badgeColor: 'bg-indigo-600 text-white', bgGradient: 'from-blue-600 to-indigo-800', icon: '♚' },
  { id: 'monopoly', isAvailable: true, title: 'Cờ Tỷ Phú Sài Gòn', desc: 'Khám phá Sài Gòn, đổ xúc xắc, mua đất và thu tiền thuê cùng bạn bè!', category: 'Party', isStrategy: false, players: '2 - 6 Người', aiElo: 'Chỉ đấu người', badge: 'PARTY 🎉', badgeColor: 'bg-emerald-500 text-slate-900', bgGradient: 'from-emerald-400 to-teal-700', icon: '🪙' },
  { id: 'uno', title: 'Bài UNO Crazy', desc: 'Trận chiến bài UNO siêu tốc với các lá +4, Đổi Hướng vô cùng cay đắng!', category: 'Party', isStrategy: false, players: '2 - 8 Người', aiElo: 'Fast Bot', badge: 'NEW ⚡', badgeColor: 'bg-yellow-400 text-slate-900', bgGradient: 'from-yellow-400 to-orange-600', icon: '🎴' },
  { id: 'ludo', title: 'Cờ Cá Ngựa (Ludo Pop)', desc: 'Đua ngựa về chuồng cực hài hước, đá ngựa đối thủ về vạch xuất phát.', category: 'Party', isStrategy: false, players: '2 - 4 Người', aiElo: 'Easy / Hard', badge: 'FUN 🎲', badgeColor: 'bg-cyan-400 text-slate-900', bgGradient: 'from-cyan-400 to-blue-600', icon: '🎲' },
  { id: 'caro', title: 'Cờ Caro (Gomoku 5-in-a-row)', desc: 'Nối 5 nước cờ Caro cổ điển, nhịp độ nhanh giải trí cực tốt.', category: '1v1', isStrategy: true, players: '1v1', aiElo: '3 Chế độ AI', badge: 'QUICK ⏱️', badgeColor: 'bg-purple-500 text-white', bgGradient: 'from-purple-500 to-pink-600', icon: '❌' },
  { id: 'werewolf', title: 'Ma Sói Mini (Werewolf)', desc: 'Trò chơi tranh luận bằng Voice Discord! Tìm ra Ma Sói đang ẩn nấp.', category: 'Party', isStrategy: true, players: '6 - 16 Người', aiElo: 'Chỉ đấu người', badge: 'VOICE 🎙️', badgeColor: 'bg-slate-700 text-yellow-300', bgGradient: 'from-slate-800 to-purple-900', icon: '🐺' }
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
          <svg aria-hidden="true" viewBox="0 0 80 80" className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 filter drop-shadow-[4px_4px_0_#000] group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-300">
            <path d="M 36 23 V 16 H 29 V 9 H 36 V 3 H 44 V 9 H 51 V 16 H 44 V 23" fill="#fbbf24" stroke="#020617" strokeWidth="3" strokeLinejoin="round" />
            <path d="M 28 39 L 22 23 Q 31 19 40 26 Q 49 19 58 23 L 52 39 Z" fill="#fffbeb" stroke="#020617" strokeWidth="3.5" strokeLinejoin="round" />
            <rect x="27" y="36" width="26" height="8" rx="3" fill="#fbbf24" stroke="#020617" strokeWidth="3" />
            <path d="M 31 44 H 49 Q 46 54 57 61 H 23 Q 34 54 31 44 Z" fill="#fffbeb" stroke="#020617" strokeWidth="3.5" strokeLinejoin="round" />
            <rect x="20" y="59" width="40" height="8" rx="3" fill="#fbbf24" stroke="#020617" strokeWidth="3" />
            <path d="M 21 67 H 59 L 63 75 H 17 Z" fill="#fffbeb" stroke="#020617" strokeWidth="3.5" strokeLinejoin="round" />
          </svg>
        </div>
      );
    case 'monopoly':
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative z-10 flex items-center group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-300">
            <div className="relative w-16 h-11 sm:w-20 sm:h-14 -rotate-6 bg-emerald-400 rounded-lg border-[3px] border-slate-950 shadow-[4px_4px_0_#000] flex items-center justify-center">
              <div className="absolute inset-1.5 rounded-md border-2 border-emerald-800/70"></div>
              <span className="relative text-2xl sm:text-3xl font-black text-emerald-950">$</span>
            </div>
            <div className="absolute -right-4 -bottom-3 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-300 border-[3px] border-slate-950 shadow-[3px_3px_0_#000] flex items-center justify-center text-lg sm:text-xl font-black text-yellow-800">¢</div>
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
          <svg aria-hidden="true" viewBox="0 0 80 80" className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 filter drop-shadow-[4px_4px_0_#000] group-hover:scale-110 group-hover:-translate-y-2 transition-transform duration-300">
            <path d="M 16 64 C 16 50 31 45 30 34 L 23 39 L 10 32 L 22 17 L 29 15 L 29 5 L 39 13 C 57 18 57 40 48 51 L 54 64 Z" fill="#fb7185" stroke="#020617" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M 39 19 Q 50 32 40 47" fill="none" stroke="#be123c" strokeWidth="5" strokeLinecap="round" />
            <circle cx="28" cy="24" r="2.5" fill="#020617" />
            <rect x="12" y="62" width="46" height="11" rx="4" fill="#f43f5e" stroke="#020617" strokeWidth="3.5" />
            <g transform="rotate(12 62 56)">
              <rect x="48" y="42" width="28" height="28" rx="6" fill="#fffbeb" stroke="#020617" strokeWidth="3" />
              <circle cx="55" cy="49" r="2.5" fill="#020617" />
              <circle cx="69" cy="49" r="2.5" fill="#020617" />
              <circle cx="62" cy="56" r="2.5" fill="#020617" />
              <circle cx="55" cy="63" r="2.5" fill="#020617" />
              <circle cx="69" cy="63" r="2.5" fill="#020617" />
            </g>
          </svg>
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

async function gamesApiRequest(path, options = {}) {
  const authTicket = typeof window !== 'undefined'
    ? window.sessionStorage.getItem('gamesAuthTicket')
    : null;
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      ...(authTicket ? { Authorization: `Bearer ${authTicket}` } : {})
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Game Hub API request failed (${response.status}).`);
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Game Hub API returned an invalid response.');
  }
  return data;
}

export default function Games() {
  const [lang, setLang] = useState('VI');
  const t = TRANSLATIONS[lang];
  const [discordUser, setDiscordUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');
  const [authError, setAuthError] = useState('');
  const [isDiscordEmbedded, setIsDiscordEmbedded] = useState(false);
  const [activityContext, setActivityContext] = useState(null);
  const [authAttempt, setAuthAttempt] = useState(0);
  const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

  const [bgmMuted, setBgmMuted] = useState(false);
  const [ping, setPing] = useState(null);
  const [lobbyData, setLobbyData] = useState({
    guilds: [],
    guild: null,
    voiceMembers: [],
    voiceChannels: [],
    rooms: [],
    tournament: null,
    leaderboard: [],
    ping: null
  });
  const [selectedGuildId, setSelectedGuildId] = useState('');
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [lobbyError, setLobbyError] = useState('');
  const [roomActionLoading, setRoomActionLoading] = useState(false);
  const [tournamentActionLoading, setTournamentActionLoading] = useState(false);
  const [tournamentTitle, setTournamentTitle] = useState('');
  const [tournamentGameId, setTournamentGameId] = useState('xiangqi');
  const [tournamentPrize, setTournamentPrize] = useState('');
  const [tournamentDescription, setTournamentDescription] = useState('');
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
  const isServerOwner = lobbyData.guild?.isOwner === true;
  const activeTournament = lobbyData.tournament;
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
  const [spectatorsList, setSpectatorsList] = useState([]);
  const [seatBusy, setSeatBusy] = useState(false);
  const [seatsLoaded, setSeatsLoaded] = useState(false);
  const seatSequence = useRef(0);
  const seatPending = useRef(false);
  const seatRevision = useRef(null);
  const serverMatchStarted = useRef(false);
  const myPlayerId = String(discordUser?.id);

  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const apiBase = isDiscordEmbedded ? '/.proxy/api/games' : '/api/games';

  const applySeats = useCallback(snapshot => {
    setRedPlayer(snapshot.players.find(p => p.side === 'red') || null);
    setBlackPlayer(snapshot.players.find(p => p.side === 'black') || null);
    setSpectatorsList(snapshot.spectators);
    setSeatsLoaded(true);
    setIsBoardFlipped(snapshot.players.some(p => p.id === myPlayerId && p.side === 'black'));
    if (seatRevision.current !== snapshot.revision) {
      seatRevision.current = snapshot.revision;
      setMatchStarted(false);
      setSelectedPiece(null);
      setLegalMoves([]);
      setCheckSide(null);
      setBoardState(inGameRoom?.gameType === 'chess' ? INITIAL_CHESS_BOARD : INITIAL_XIANGQI_BOARD);
      setMovesLog([]);
      setCurrentTurn('r');
      setRedTurnTime(900);
      setBlackTurnTime(900);
      serverMatchStarted.current = false;
    }
    if (serverMatchStarted.current !== snapshot.matchStarted) {
      serverMatchStarted.current = snapshot.matchStarted;
      setMatchStarted(snapshot.matchStarted);
    }
  }, [inGameRoom?.gameType, myPlayerId]);

  useEffect(() => {
    if (!inGameRoom || !['chess', 'xiangqi'].includes(inGameRoom.gameType)) return;
    let cancelled = false;
    const refresh = async () => {
      if (seatPending.current) return;
      const sequence = ++seatSequence.current;
      try {
        const snapshot = await gamesApiRequest(`${apiBase}/rooms/${encodeURIComponent(inGameRoom.id)}/seats?guild_id=${encodeURIComponent(inGameRoom.guildId)}`);
        if (!cancelled && sequence === seatSequence.current) applySeats(snapshot);
      } catch (error) {
        if (!cancelled && sequence === seatSequence.current) {
          setSeatsLoaded(false);
          setToastMessage(error.message); setShowInviteToast(true);
        }
      }
    };
    refresh();
    const timer = setInterval(refresh, 2000);
    return () => { cancelled = true; clearInterval(timer); seatSequence.current++; };
  }, [apiBase, inGameRoom?.id, inGameRoom?.guildId, inGameRoom?.gameType, applySeats]);

  const changeSeat = async (action, side) => {
    if (seatPending.current || !seatsLoaded) return;
    seatPending.current = true;
    const sequence = ++seatSequence.current;
    setSeatBusy(true);
    try {
      const snapshot = await gamesApiRequest(`${apiBase}/rooms/${encodeURIComponent(inGameRoom.id)}/seats`, {
        method: 'POST', body: JSON.stringify({ guild_id: inGameRoom.guildId, action, side })
      });
      if (sequence === seatSequence.current) {
        applySeats(snapshot);
        if (action === 'leave_seat') triggerToast(t.leftSeatMsg);
      }
    } catch (error) {
      if (sequence === seatSequence.current) triggerToast(error.message);
    } finally { seatPending.current = false; setSeatBusy(false); }
  };

  useEffect(() => {
    let cancelled = false;

    const authenticate = async () => {
      const isEmbedded = window.self !== window.top;
      setIsDiscordEmbedded(isEmbedded);

      try {
        if (!isEmbedded) {
          const sessionResponse = await fetch('/api/games/auth/session', {
            credentials: 'same-origin'
          });
          const sessionData = await sessionResponse.json().catch(() => ({}));
          if (cancelled) return;

          if (sessionResponse.ok && sessionData.authenticated && sessionData.user) {
            window.sessionStorage.removeItem('gamesAuthTicket');
            setDiscordUser(sessionData.user);
            setAuthStatus('authenticated');
            return;
          }
          if (!sessionResponse.ok && sessionResponse.status !== 401) {
            throw new Error(sessionData.error || 'Could not load the Discord session.');
          }
          setAuthStatus('unauthenticated');
          return;
        }

        if (!discordClientId) {
          setAuthStatus('unconfigured');
          return;
        }

        const { DiscordSDK } = await import('@discord/embedded-app-sdk');
        const discordSdk = new DiscordSDK(discordClientId);
        await discordSdk.ready();
        if (cancelled) return;
        setActivityContext({ guildId: discordSdk.guildId, channelId: discordSdk.channelId });

        const { code } = await discordSdk.commands.authorize({
          client_id: discordClientId,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds']
        });
        if (cancelled) return;

        const tokenResponse = await fetch('/.proxy/api/games/auth/token', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const tokenData = await tokenResponse.json().catch(() => ({}));
        if (!tokenResponse.ok || !tokenData.access_token || !tokenData.auth_ticket || !tokenData.user) {
          throw new Error(tokenData.error || 'Could not exchange the Discord authorization code.');
        }

        const auth = await discordSdk.commands.authenticate({
          access_token: tokenData.access_token
        });
        if (cancelled) return;
        if (auth.user.id !== tokenData.user.id) {
          throw new Error('Discord returned a different user during authentication.');
        }

        window.sessionStorage.setItem('gamesAuthTicket', tokenData.auth_ticket);
        setDiscordUser(tokenData.user);
        setAuthStatus('authenticated');
      } catch (error) {
        if (cancelled) return;
        setAuthError(error instanceof Error ? error.message : 'Discord authentication failed.');
        setAuthStatus('error');
      }
    };

    authenticate();
    return () => {
      cancelled = true;
    };
  }, [authAttempt, discordClientId]);

  const refreshLobby = useCallback(async () => {
    const guildId = activityContext?.guildId;
    const query = guildId ? `?guild_id=${encodeURIComponent(guildId)}` : '';
    const data = await gamesApiRequest(`${apiBase}/lobby${query}`);
    setLobbyData(data);
    setPing(data.ping);
    setLobbyError('');
    setSelectedGuildId(data.guild?.id || '');
    return data;
  }, [apiBase, activityContext]);

  const refreshLobbyAfterAction = async () => {
    try {
      await refreshLobby();
    } catch (error) {
      const message = error instanceof Error ? error.message : t.lobbyLoadError;
      setLobbyError(message);
      triggerToast(message);
    }
  };

  useEffect(() => {
    if (!discordUser) return undefined;
    let cancelled = false;
    const loadLobby = async () => {
      try {
        await refreshLobby();
      } catch (error) {
        if (!cancelled) setLobbyError(error instanceof Error ? error.message : t.lobbyLoadError);
      } finally {
        if (!cancelled) setLobbyLoading(false);
      }
    };
    setLobbyLoading(true);
    loadLobby();
    const interval = setInterval(loadLobby, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [discordUser, refreshLobby, t.lobbyLoadError]);

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

  const triggerToast = (msg) => { setToastMessage(msg); setShowInviteToast(true); setTimeout(() => setShowInviteToast(false), 3500); };
  const handleOpenRoomList = (game) => {
    if (!game.isAvailable) return;
    setSelectedGame(game);
    setActiveModal('roomList');
    setJoiningRoom(null);
    setPasswordError('');
    setPasswordInput('');
    setLobbyLoading(true);
    refreshLobby()
      .catch(error => setLobbyError(error instanceof Error ? error.message : t.lobbyLoadError))
      .finally(() => setLobbyLoading(false));
  };
  const handleOpenCreateRoom = (game) => {
    if (!game.isAvailable) return;
    setSelectedGame(game);
    if (game.id === 'monopoly') setLobbyMode('pvp');
    setRoomName(lang === 'VI' ? `Phòng của ${discordUser.username}` : `${discordUser.username}'s room`);
    setIsRoomLocked(false);
    setRoomPassword('');
    setActiveModal('createRoom');
  };

  const handleEnterGameRoom = (roomObj, gameType) => {
    setActiveModal(null);
    setInGameRoom({ ...roomObj, gameType, guildId: selectedGuildId });
    setSpectatorsList([]); setSeatsLoaded(false); seatRevision.current = null;
    setSelectedPiece(null); setLegalMoves([]);
    setRedPlayer(null); setBlackPlayer(null); setMatchStarted(false); setIsBoardFlipped(false);
    setRedTurnTime(900); setBlackTurnTime(900); setCurrentTurn('r');
    setBoardState(gameType === 'chess' ? INITIAL_CHESS_BOARD : INITIAL_XIANGQI_BOARD);
    setMovesLog([]);
  };

  const handleJoinRoom = async (room, password = '') => {
    setRoomActionLoading(true);
    try {
      const result = await gamesApiRequest(`${apiBase}/rooms/${encodeURIComponent(room.id)}/join`, {
        method: 'POST',
        body: JSON.stringify({ guild_id: selectedGuildId, password })
      });
      await refreshLobbyAfterAction();
      setJoiningRoom(null);
      if (['xiangqi', 'chess', 'monopoly'].includes(room.gameId)) {
        handleEnterGameRoom(result.room, room.gameId);
      } else {
        setActiveModal(null);
        triggerToast(t.unsupportedGameRoom);
      }
    } catch (error) {
      if (room.isLocked) setPasswordError(error instanceof Error ? error.message : t.invalidPasswordMsg);
      else triggerToast(error instanceof Error ? error.message : t.lobbyLoadError);
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleConfirmPassword = () => {
    if (joiningRoom) handleJoinRoom(joiningRoom, passwordInput);
  };

  const handleCreateRoom = async () => {
    if (!selectedGame || !selectedGuildId) {
      triggerToast(lobbyError || t.noGuilds);
      return;
    }
    setRoomActionLoading(true);
    try {
      const result = await gamesApiRequest(`${apiBase}/rooms`, {
        method: 'POST',
        body: JSON.stringify({
          guild_id: selectedGuildId,
          game_id: selectedGame.id,
          name: roomName,
          password: roomPassword,
          is_locked: isRoomLocked,
          is_timer_enabled: selectedGame.id === 'monopoly' ? false : isTimerEnabled,
          allow_spectators: selectedGame.id === 'monopoly' ? true : allowSpectators,
          mode: selectedGame.id === 'monopoly' ? 'pvp' : lobbyMode,
          bot_elo: botEloLevel
        })
      });
      await refreshLobbyAfterAction();
      setActiveModal(null);
      if (['xiangqi', 'chess', 'monopoly'].includes(selectedGame.id)) {
        handleEnterGameRoom(result.room, selectedGame.id);
      } else {
        triggerToast(t.unsupportedGameCreated);
      }
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : t.lobbyLoadError);
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleExitGameRoom = async () => {
    const room = inGameRoom;
    if (!room) return;
    try {
      await gamesApiRequest(`${apiBase}/rooms/${encodeURIComponent(room.id)}/leave`, {
        method: 'POST',
        body: JSON.stringify({ guild_id: room.guildId })
      });
      await refreshLobbyAfterAction();
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : t.lobbyLoadError);
    } finally {
      setInGameRoom(null);
    }
  };

  const handleCreateTournament = async () => {
    setTournamentActionLoading(true);
    try {
      const result = await gamesApiRequest(`${apiBase}/tournaments`, {
        method: 'POST',
        body: JSON.stringify({
          guild_id: selectedGuildId,
          title: tournamentTitle,
          game_id: tournamentGameId,
          prize: tournamentPrize,
          description: tournamentDescription
        })
      });
      setLobbyData(previous => ({ ...previous, tournament: result.tournament }));
      setIsCreateTournamentModalOpen(false);
      setTournamentTitle('');
      setTournamentPrize('');
      setTournamentDescription('');
      triggerToast(t.tournamentCreated);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : t.lobbyLoadError);
    } finally {
      setTournamentActionLoading(false);
    }
  };

  const handleDeleteTournament = async () => {
    setTournamentActionLoading(true);
    try {
      await gamesApiRequest(`${apiBase}/tournaments/${encodeURIComponent(selectedGuildId)}`, {
        method: 'DELETE'
      });
      setLobbyData(previous => ({ ...previous, tournament: null }));
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : t.lobbyLoadError);
    } finally {
      setTournamentActionLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const result = await gamesApiRequest(`${apiBase}/invite`, {
        method: 'POST',
        body: JSON.stringify({ guild_id: selectedGuildId })
      });
      try {
        await navigator.clipboard.writeText(result.url);
        triggerToast(result.url);
      } catch {
        triggerToast(`${t.inviteError}: ${result.url}`);
      }
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : t.inviteError);
    }
  };

  const handleLeaveLobbyRoom = async (room) => {
    setRoomActionLoading(true);
    try {
      await gamesApiRequest(`${apiBase}/rooms/${encodeURIComponent(room.id)}/leave`, {
        method: 'POST',
        body: JSON.stringify({ guild_id: selectedGuildId })
      });
      await refreshLobbyAfterAction();
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : t.lobbyLoadError);
    } finally {
      setRoomActionLoading(false);
    }
  };

  const handleLeaveSeat = () => changeSeat('leave_seat');
  const handleSit = side => changeSeat('sit', side);
  const toggleReady = () => changeSeat('ready');

  const handleSelectPiece = (x, y) => {
    if (!matchStarted) { triggerToast("Vui lòng đợi cả hai Sẵn Sàng!"); return; }
    const activeSide = currentTurn === 'r' ? (inGameRoom.gameType === 'chess' ? 'white' : 'red') : 'black';
    if ((currentTurn === 'r' ? redPlayer : blackPlayer)?.id !== myPlayerId) return;
    const piece = getPieceAt(boardState, x, y);
    if (piece && piece.side === activeSide) {
      setSelectedPiece({ x, y });
      if (inGameRoom.gameType === 'chess') setLegalMoves(getLegalChessMovesLocal(boardState, x, y, activeSide));
      else setLegalMoves(getLegalMovesLocal(boardState, x, y, activeSide));
    }
  };

  const handleMove = (fromX, fromY, toX, toY) => {
    if (!matchStarted || (currentTurn === 'r' ? redPlayer : blackPlayer)?.id !== myPlayerId) return;
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
                {player.id === myPlayerId && (
                  <button disabled={seatBusy || !seatsLoaded} aria-label={t.leaveSeat} onClick={() => handleLeaveSeat(side)} className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-400 text-white rounded-full p-0.5 border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-110 z-30" title="Rời ghế"><X className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></button>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start w-full">
                <div className="text-[10px] sm:text-xs font-black text-white flex items-center justify-center sm:justify-start gap-1 w-full"><span className="truncate max-w-[70px] sm:max-w-[90px]">{player.name}</span>{player.id !== myPlayerId && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}</div>
                <div className={`text-[9px] sm:text-[10px] font-mono font-extrabold ${sideColor}`}>{sideName}</div>
              </div>
            </div>
            {!matchStarted ? (
              <button disabled={seatBusy || !seatsLoaded || player.id !== myPlayerId} onClick={() => toggleReady(side)} className={`w-full xl:w-auto px-2 py-1.5 rounded-xl font-black text-[10px] sm:text-xs border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0 ${player.isReady ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {player.isReady ? 'SẴN SÀNG' : (player.id === myPlayerId ? 'SẴN SÀNG?' : 'ĐANG CHỜ')}
              </button>
            ) : (
              inGameRoom?.isTimerEnabled && (
                <div className={`w-full xl:w-auto px-2 py-1 text-center rounded-xl font-mono font-black text-xs border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 ${isMyTurn ? `${timeBg} animate-pulse` : 'bg-slate-950 text-slate-400'}`}>{formatTime(time)}</div>
              )
            )}

          </>
        ) : (
          <button disabled={seatBusy || !seatsLoaded || matchStarted} onClick={() => handleSit(side)} className="w-full h-full py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 hover:border-slate-400 text-slate-400 hover:text-white font-black text-[10px] sm:text-xs transition-colors uppercase flex items-center justify-center gap-1 sm:gap-2">
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
  const selectedGameRooms = lobbyData.rooms.filter(room => room.gameId === selectedGame?.id);
  const currentVoiceChannel = lobbyData.currentVoiceChannel;
  const voiceChannelLabel = currentVoiceChannel
    ? `🔊 ${currentVoiceChannel.name} (${currentVoiceChannel.memberCount})`
    : (lang === 'VI' ? 'Chưa kết nối kênh thoại' : 'Not connected to a voice channel');

  if (!discordUser) {
    const isLoading = authStatus === 'loading';
    const message = authStatus === 'unconfigured'
      ? t.discordConfigError
      : authStatus === 'error'
        ? authError || t.discordAuthError
        : t.discordLoginDescription;

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]">
        <section className="w-full max-w-md rounded-3xl border-4 border-slate-950 bg-slate-900 p-6 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-950 bg-indigo-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-black text-white">{t.discordLoginTitle}</h1>
          <p className="mt-2 text-sm font-medium text-slate-300">{message}</p>
          {isDiscordEmbedded && authStatus !== 'unconfigured' && authStatus !== 'loading' && (
            <p className="mt-3 text-xs font-semibold text-slate-400">{t.discordOpenInDiscord}</p>
          )}
          {isLoading ? (
            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-cyan-300">
              <Radio className="h-4 w-4 animate-pulse" /> {t.discordConnecting}
            </div>
          ) : authStatus === 'unconfigured' ? null : isDiscordEmbedded ? (
            <button
              onClick={() => {
                setAuthError('');
                setAuthStatus('loading');
                setAuthAttempt(attempt => attempt + 1);
              }}
              className="mt-5 rounded-xl border-2 border-slate-950 bg-indigo-500 px-5 py-3 text-sm font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:bg-indigo-400"
            >
              {t.discordRetryBtn}
            </button>
          ) : (
            <a
              href="/login?next=%2Fgames"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-950 bg-indigo-500 px-5 py-3 text-sm font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition hover:bg-indigo-400"
            >
              <MessageSquare className="h-4 w-4" /> {t.discordLoginBtn}
            </a>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="w-full h-dvh bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden antialiased bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]">

      {!inGameRoom && (
        <header className="h-16 bg-slate-900 border-b-4 border-slate-950 px-4 flex items-center justify-between z-30 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div onClick={() => setInGameRoom(null)} className="flex items-center gap-2 bg-yellow-400 text-slate-900 px-3 py-1.5 rounded-xl border-3 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-extrabold text-sm md:text-base -rotate-1 cursor-pointer hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5 animate-bounce" />
              <span className="tracking-wide uppercase font-black">{t.hubTitle}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border-2 border-slate-700 px-3 py-1 rounded-lg text-xs min-w-0">
              <span className="text-slate-400 font-semibold shrink-0">{t.serverLabel}</span>
              <span className="max-w-40 truncate text-white font-bold">{lobbyData.guild?.name || '—'}</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-bold truncate max-w-64" title={voiceChannelLabel}>
                {voiceChannelLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-950 border-2 border-slate-800 px-2.5 py-1 rounded-lg text-xs">
              <Signal className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 font-mono font-bold">{Number.isFinite(ping) ? `${ping} ms` : '—'}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800 border-2 border-slate-950 px-2.5 py-1 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="relative group cursor-pointer">
                <img src={discordUser.avatar} alt={discordUser.username} className="w-9 h-9 rounded-full border-2 border-yellow-400 object-cover shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:scale-105 transition-transform" />
              </div>
              <div className="hidden lg:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white leading-none">{discordUser.username}</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded border bg-slate-700 text-slate-300 border-slate-600">
                    {isServerOwner ? t.ownerLabel : t.memberLabel}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5" title={t.settingsTitle}><Sliders className="w-4 h-4" /></button>
            <button onClick={() => setIsRulesModalOpen(true)} className="p-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"><HelpCircle className="w-4 h-4" /></button>
            <button onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)} className="lg:hidden p-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><Menu className="w-4 h-4" /></button>
          </div>
        </header>
      )}

      <div className="flex-1 min-w-0 min-h-0 flex overflow-hidden relative">
        {inGameRoom?.gameType === 'monopoly' ? (
          <MonopolyRoom key={inGameRoom.id} room={inGameRoom} userId={discordUser.id} apiBase={apiBase} request={gamesApiRequest} onExit={handleExitGameRoom} />
        ) : inGameRoom ? (
          <GameRoomShell
            room={inGameRoom}
            t={t}
            matchStarted={matchStarted}
            movesLog={movesLog}
            spectatorsList={spectatorsList}
            renderPlayerProfile={renderPlayerProfile}
            onExit={handleExitGameRoom}
            onSettings={() => setIsSettingsModalOpen(true)}
            onOfferDraw={() => triggerToast(t.drawOfferMsg)}
            onResign={() => triggerToast(t.resignMsg)}
            noSpectatorsLabel={t.noSpectators}
          >
            {inGameRoom.gameType === 'chess' ? (
              <ChessRoom
                board={boardState}
                isFlipped={isBoardFlipped}
                isPlaying={true}
                activeSide={currentTurn === 'r' ? 'white' : 'black'}
                playerSide={redPlayer?.id === myPlayerId ? 'white' : blackPlayer?.id === myPlayerId ? 'black' : null}
                selectedPiece={selectedPiece}
                legalMoves={legalMoves}
                onSelectPiece={handleSelectPiece}
                onMove={handleMove}
              />
            ) : (
              <XiangqiRoom
                pieceLabels={PIECE_LABELS}
                board={boardState}
                isFlipped={isBoardFlipped}
                isPlaying={true}
                activeSide={currentTurn === 'r' ? 'red' : 'black'}
                playerSide={redPlayer?.id === myPlayerId ? 'red' : blackPlayer?.id === myPlayerId ? 'black' : null}
                selectedPiece={selectedPiece}
                legalMoves={legalMoves}
                checkSide={checkSide}
                onSelectPiece={handleSelectPiece}
                onMove={handleMove}
              />
            )}
          </GameRoomShell>
        ) : (

          <main className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-4 custom-scrollbar">
              <div className="sm:hidden flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
                <span>{t.serverLabel}: {lobbyData.guild?.name || '—'}</span>
                <span className="text-emerald-400">{voiceChannelLabel}</span>
              </div>
            {lobbyError && (
              <div role="alert" className="shrink-0 rounded-xl border-2 border-rose-500/50 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
                {lobbyError}
              </div>
            )}
            {!lobbyLoading && lobbyData.guilds.length === 0 && (
              <div className="shrink-0 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-3 text-xs font-bold text-amber-200">
                {t.noGuilds}
              </div>
            )}
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
                    {isServerOwner && (<button disabled={tournamentActionLoading} onClick={handleDeleteTournament} className="px-3 py-3 bg-slate-950 hover:bg-rose-950 text-rose-400 hover:text-rose-300 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1 shrink-0 disabled:opacity-50"><X className="w-4 h-4" /> {t.deleteTournamentBtn}</button>)}
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
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 ${game.isAvailable ? game.badgeColor : 'bg-slate-700 text-slate-200'}`}>{game.isAvailable ? game.badge : 'Coming soon'}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed mb-2">{game.desc}</p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-3">
                        <span className="bg-slate-950/80 text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 shrink-0"><Users className="w-3 h-3 text-cyan-400" /> {game.players}</span>
                        <span className="bg-slate-950/80 text-yellow-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 shrink-0"><Bot className="w-3 h-3 text-yellow-400" /> {game.aiElo}</span>
                      </div>
                      {game.isAvailable && (<div className="grid grid-cols-2 gap-2 mt-auto">
                        <button onClick={() => handleOpenRoomList(game)} className="py-1.5 sm:py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-[10px] sm:text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1"><Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-slate-950" /> {t.quickPlay}</button>
                        <button onClick={() => handleOpenCreateRoom(game)} className="py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] sm:text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1"><PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" /> {t.createRoom}</button>
                      </div>)}
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
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">{lobbyData.voiceMembers.length} {t.onlinePlayers}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {lobbyData.voiceMembers.map((member) => (
                <div key={member.id} className="p-2.5 bg-slate-950 border-2 border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="relative"><img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" /><span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950"></span></div>
                    <div>
                      <div className="flex items-center gap-1.5"><span className="font-extrabold text-xs text-white leading-tight">{member.name}</span>{member.isOwner && (<Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}</div>
                      <span className="text-[10px] font-bold text-slate-400">{member.channel} • {member.role}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${member.status === 'in-game' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{member.status === 'in-game' ? t.statusInGame : t.statusInLobby}</span>
                </div>
              ))}
              {lobbyData.voiceMembers.length === 0 && <p className="px-2 py-3 text-center text-xs font-semibold text-slate-500">{t.noVoiceMembers}</p>}
              <button disabled={!lobbyData.guild || lobbyData.voiceChannels.length === 0} onClick={handleCreateInvite} className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"><Share2 className="w-3.5 h-3.5" />{t.inviteDiscord}</button>
            </div>
            <div className="p-3 border-t-4 border-slate-950 bg-slate-950/80 space-y-2">
              <div className="flex items-center justify-between mb-1"><span className="font-black text-xs uppercase tracking-wider text-yellow-400 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-yellow-400" />{t.leaderboard}</span></div>
              <div className="space-y-1.5">
                {lobbyData.leaderboard.map((item, index) => (
                  <div key={item.rank} className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><span className="font-black w-5 text-center text-slate-400">{index + 1}</span><div><div className="font-bold text-white text-[11px]">{item.name}</div><div className="text-[9px] text-slate-400 font-semibold">{item.game}</div></div></div>
                    <span className="font-mono font-black text-yellow-400 text-xs">{item.elo} ELO</span>
                  </div>
                ))}
                {lobbyData.leaderboard.length === 0 && <p className="text-xs text-slate-500">{t.noLeaderboard}</p>}
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
              {lobbyError && <p role="alert" className="rounded-lg bg-rose-500/10 p-2 text-xs font-bold text-rose-300">{lobbyError}</p>}
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border-2 border-slate-800 mb-2">
                <div className="text-xs font-bold text-slate-300">Đang tìm kiếm phòng chơi phù hợp?</div>
                <button onClick={() => handleOpenCreateRoom(selectedGame)} className="px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center gap-1.5"><PlusCircle className="w-4 h-4" /> {t.createRoomBtn}</button>
              </div>
              {lobbyLoading ? (
                <div className="py-10 text-center text-xs font-bold text-slate-400">{t.loadingLobby}</div>
              ) : selectedGameRooms.length > 0 ? (
                selectedGameRooms.map((room) => (
                  <div key={room.id} className="p-3.5 bg-slate-950 border-2 border-slate-800 hover:border-yellow-400/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{room.name}</span>
                        {room.isLocked ? (<span className="bg-rose-500/20 text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-500/40 flex items-center gap-1"><Lock className="w-3 h-3" /> {t.lockedBadge}</span>) : (<span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1"><Unlock className="w-3 h-3" /> {t.openBadge}</span>)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold"><span>Chủ phòng: <strong className="text-slate-200">{room.host}</strong></span><span>•</span><span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-cyan-400" /> {room.players}/{room.maxPlayers}</span><span>•</span><span className={room.status === 'in-game' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>{room.status === 'in-game' ? t.statusInGame : t.statusReady}</span></div>
                    </div>
                    {room.isJoined && ['monopoly', 'chess', 'xiangqi'].includes(room.gameId) && <button onClick={() => handleEnterGameRoom(room, room.gameId)} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black">Vào lại phòng</button>}
                    <button disabled={roomActionLoading || (!room.isJoined && !['monopoly', 'chess', 'xiangqi'].includes(room.gameId) && (room.players >= room.maxPlayers || room.status === 'in-game'))} onClick={() => room.isJoined ? handleLeaveLobbyRoom(room) : room.isLocked ? (setJoiningRoom(room), setPasswordInput(''), setPasswordError('')) : handleJoinRoom(room)} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border-2 border-slate-950 font-black text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 ${roomActionLoading || (!room.isJoined && room.gameId !== 'monopoly' && (room.players >= room.maxPlayers || room.status === 'in-game')) ? 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed shadow-none' : room.isJoined ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950'}`}>
                      {room.isJoined ? <LogOut className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />} {room.isJoined ? t.leaveRoom : t.joinRoomBtn}
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
              <button disabled={roomActionLoading} onClick={handleConfirmPassword} className="flex-1 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50">{t.submitPasswordBtn}</button>
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
                  <button disabled={selectedGame.id === 'monopoly'} onClick={() => setLobbyMode('pve')} className={`py-2 px-3 rounded-xl border-2 font-black text-xs transition-all flex flex-col items-center gap-1 ${lobbyMode === 'pve' ? 'bg-yellow-400 border-slate-950 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent border-transparent text-slate-400 hover:text-white'}`}><Bot className="w-4 h-4" /> {t.pveMode}</button>
                </div>
              </div>

              {lobbyMode === 'pve' && selectedGame.id !== 'monopoly' && (
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
                  <div className={selectedGame.id === 'monopoly' ? 'hidden' : 'flex items-center justify-between'}>
                    <span className="text-xs font-bold text-slate-300">Tính Giờ Đấu (15p + 5s)</span>
                    <button aria-label="Bật/tắt giờ đấu" onClick={() => setIsTimerEnabled(!isTimerEnabled)} className={`w-10 h-6 rounded-full p-1 border-2 border-slate-950 transition-colors ${isTimerEnabled ? 'bg-cyan-400' : 'bg-slate-800'}`}><div className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform ${isTimerEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div></button>
                  </div>
                  {selectedGame.id === 'monopoly' && <p className="text-xs text-slate-300">2–6 người · Chủ phòng bắt đầu trận · Không giới hạn giờ · Luật rút gọn có trong phòng.</p>}
                  <div className={selectedGame.id === 'monopoly' ? 'hidden' : 'flex items-center justify-between pt-2 border-t border-slate-900'}>
                    <span className="text-xs font-bold text-slate-300">{t.allowSpectator}</span>
                    <button aria-label="Bật/tắt quyền khán giả" aria-pressed={allowSpectators} onClick={() => setAllowSpectators(!allowSpectators)} className={`w-10 h-6 rounded-full p-1 border-2 border-slate-950 transition-colors ${allowSpectators ? 'bg-cyan-400' : 'bg-slate-800'}`}><div className={`w-3.5 h-3.5 rounded-full bg-slate-950 transition-transform ${allowSpectators ? 'translate-x-4' : 'translate-x-0'}`}></div></button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t-4 border-slate-950 flex gap-3">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded-xl border-2 border-slate-950 transition-all">HỦY</button>
              <button disabled={roomActionLoading || lobbyData.guilds.length === 0} onClick={handleCreateRoom} className="flex-[2] py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"><Check className="w-4 h-4" /> {t.startBtn}</button>
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
              <div><label className="text-xs font-bold text-slate-300 mb-1 block">{t.tournamentNameInput}</label><input type="text" value={tournamentTitle} onChange={event => setTournamentTitle(event.target.value)} maxLength={100} className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-400 outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-300 mb-1 block">{t.selectGameInput}</label><select value={tournamentGameId} onChange={event => setTournamentGameId(event.target.value)} className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-400 outline-none">{GAMES_DATA.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
              <div><label className="text-xs font-bold text-slate-300 mb-1 block">{t.prizeInput}</label><input type="text" value={tournamentPrize} onChange={event => setTournamentPrize(event.target.value)} maxLength={120} className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-400 outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-300 mb-1 block">{t.descInput}</label><textarea value={tournamentDescription} onChange={event => setTournamentDescription(event.target.value)} maxLength={500} rows={3} className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-400 outline-none resize-y" /></div>
            </div>
            <div className="p-4 bg-slate-950 border-t-4 border-slate-950 flex justify-end gap-3">
              <button onClick={() => setIsCreateTournamentModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl border-2 border-slate-950">{t.close}</button>
              <button disabled={tournamentActionLoading} onClick={handleCreateTournament} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all disabled:opacity-50">{t.confirmCreateTournament}</button>
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
