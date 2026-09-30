'use client';

import { DiscordSDK } from '@discord/embedded-app-sdk';
import React, { useState, useEffect, useRef } from 'react';

const DISCORD_CLIENT_ID = typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_DISCORD_CLIENT_ID : undefined;
let discordActivityConnection;
const discordAuthProgressListeners = new Set();
const DISCORD_AUTH_STEPS = [
  'Khởi tạo Discord SDK',
  'Ủy quyền tài khoản',
  'Xác thực hồ sơ với máy chủ',
  'Hoàn tất phiên Discord SDK'
];

function notifyDiscordAuthProgress(step, status) {
  discordAuthProgressListeners.forEach((listener) => listener(step, status));
}

function withTimeout(promise, step, timeoutMs = 15000) {
  let timeoutId;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`Discord ${step} quá thời gian chờ.`)),
        timeoutMs
      );
    })
  ]).finally(() => clearTimeout(timeoutId));
}

function connectDiscordActivity(onProgress) {
  if (onProgress) discordAuthProgressListeners.add(onProgress);
  if (!discordActivityConnection) {
    discordActivityConnection = (async () => {
      let activeStep = 0;
      const updateStep = (step, status) => {
        activeStep = step;
        notifyDiscordAuthProgress(step, status);
      };

      try {
        if (!DISCORD_CLIENT_ID) {
          throw new Error('Thiếu cấu hình Discord Client ID.');
        }

        updateStep(0, 'active');
        const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
        await withTimeout(discordSdk.ready(), 'khởi tạo Activity');
        updateStep(0, 'complete');

        updateStep(1, 'active');
        const { code } = await withTimeout(discordSdk.commands.authorize({
          client_id: DISCORD_CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify']
        }), 'ủy quyền Discord');
        if (!code) throw new Error('Discord không trả về mã ủy quyền.');
        updateStep(1, 'complete');

        updateStep(2, 'active');
        const response = await withTimeout(fetch('/api/discord-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        }), 'xác thực hồ sơ');
        const result = await response.json();
        if (!response.ok || !result.user || !result.access_token) {
          throw new Error(result.error || 'Máy chủ không trả về hồ sơ Discord hợp lệ.');
        }
        if (!result.user.id || !result.user.username) {
          throw new Error('Discord không trả về hồ sơ người dùng hợp lệ.');
        }
        updateStep(2, 'complete');

        updateStep(3, 'active');
        await withTimeout(
          discordSdk.commands.authenticate({ access_token: result.access_token }),
          'hoàn tất phiên Discord SDK'
        );
        updateStep(3, 'complete');

        return {
          id: result.user.id,
          name: result.user.username,
          handle: `@${result.user.username}`,
          avatarUrl: result.user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'
        };
      } catch (error) {
        notifyDiscordAuthProgress(activeStep, 'error');
        throw error;
      }
    })().catch((error) => {
      discordActivityConnection = undefined;
      throw error;
    });
  }
  return discordActivityConnection.finally(() => {
    if (onProgress) discordAuthProgressListeners.delete(onProgress);
  });
}

const createAudioEngine = () => {
  let ctx = null;
  let isMuted = false;
  let bgmInterval = null;
  const init = () => {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
    }
  };
  const playHover = () => {
    if (isMuted || !ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };
  const playClick = () => {
    if (isMuted || !ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };
  const playMove = (pieceType, isCapture) => {
    if (isMuted || !ctx) return;

    const time = ctx.currentTime;
    const duration = isCapture ? 0.085 : 0.055;
    const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index++) {
      noiseData[index] = (Math.random() * 2 - 1) * (1 - index / noiseData.length);
    }

    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noise.buffer = noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isCapture ? 1800 : 1250, time);
    noiseGain.gain.setValueAtTime(isCapture ? 0.22 : 0.15, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(time);
    noise.stop(time + duration);

    const capturePitches = { K: 125, A: 185, E: 220, H: 285, R: 105, C: 350, P: 420 };
    const impact = ctx.createOscillator();
    const impactGain = ctx.createGain();
    impact.type = isCapture ? 'triangle' : 'sine';
    impact.frequency.setValueAtTime(
      isCapture ? (capturePitches[pieceType] || 200) : 190,
      time
    );
    impact.frequency.exponentialRampToValueAtTime(
      isCapture ? Math.max(55, (capturePitches[pieceType] || 200) * 0.55) : 95,
      time + (isCapture ? 0.12 : 0.08)
    );
    impactGain.gain.setValueAtTime(isCapture ? 0.12 : 0.08, time);
    impactGain.gain.exponentialRampToValueAtTime(0.001, time + (isCapture ? 0.12 : 0.08));
    impact.connect(impactGain);
    impactGain.connect(ctx.destination);
    impact.start(time);
    impact.stop(time + (isCapture ? 0.13 : 0.09));
  };
  const playCheck = () => {
    if (isMuted || !ctx) return;
    const time = ctx.currentTime;
    [880, 660, 880].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = time + index * 0.13;
      osc.type = 'square';
      osc.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.07, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.12);
    });
  };
  const startBGM = () => {
    if (bgmInterval) return;
    let step = 0;
    const melody = [
      587.33, 739.99, 880.00, 739.99, 659.25, 739.99, 587.33, 493.88,
      523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 493.88, 523.25
    ];
    const bass = [146.83, 196.00, 164.81, 220.00];
    const playNote = () => {
      if (ctx && !isMuted) {
        const time = ctx.currentTime;
        const melodyOsc = ctx.createOscillator();
        const melodyGain = ctx.createGain();
        melodyOsc.type = 'triangle';
        melodyOsc.frequency.setValueAtTime(melody[step % melody.length], time);
        melodyGain.gain.setValueAtTime(0.0001, time);
        melodyGain.gain.linearRampToValueAtTime(0.018, time + 0.02);
        melodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);
        melodyOsc.connect(melodyGain);
        melodyGain.connect(ctx.destination);
        melodyOsc.start(time);
        melodyOsc.stop(time + 0.2);

        if (step % 4 === 0) {
          const bassOsc = ctx.createOscillator();
          const bassGain = ctx.createGain();
          bassOsc.type = 'sine';
          bassOsc.frequency.setValueAtTime(bass[Math.floor(step / 4) % bass.length], time);
          bassGain.gain.setValueAtTime(0.035, time);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
          bassOsc.connect(bassGain);
          bassGain.connect(ctx.destination);
          bassOsc.start(time);
          bassOsc.stop(time + 0.43);
        }
      }
      step++;
      bgmInterval = setTimeout(playNote, 180);
    };
    playNote();
  };
  const setMuted = (mutedStatus) => {
    isMuted = mutedStatus;
    if (!mutedStatus && ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    if (mutedStatus) {
      clearTimeout(bgmInterval);
      bgmInterval = null;
    } else {
      startBGM();
    }
  };
  return { init, playHover, playClick, playMove, playCheck, startBGM, setMuted };
};

const audio = createAudioEngine();

const BOT_ELO_PRESETS = [
  {
    elo: 800,
    title: 'Tập Sự',
    desc: 'Chọn ngẫu nhiên trong các nước đi hợp lệ, phù hợp cho người mới học cờ.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    icon: '🌱',
  },
  {
    elo: 1200,
    title: 'Thành Thạo',
    desc: 'Đánh giá nước đi tiếp theo và ưu tiên lợi thế quân.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    icon: '⚡',
  },
  {
    elo: 1600,
    title: 'Kiện Tướng',
    desc: 'Minimax alpha-beta, tính trước 2 nửa-nước để cân nhắc phản đòn.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
    icon: '👑',
  },
  {
    elo: 2000,
    title: 'Đại Kiện Tướng',
    desc: 'Minimax alpha-beta, tính trước 3 nửa-nước với sắp xếp nước ăn quân.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    icon: '🔥',
  },
];

function getPieceAt(board, x, y) {
  return board.find(p => p.x === x && p.y === y) || null;
}

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
    if (!dest) {
      moves.push({ x: tx, y: ty });
      return true;
    }
    if (dest.side !== side) {
      moves.push({ x: tx, y: ty });
    }
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
    const horseMoves = [
      { step: [0, 1], dests: [[1, 2], [-1, 2]] },
      { step: [0, -1], dests: [[1, -2], [-1, -2]] },
      { step: [1, 0], dests: [[2, 1], [2, -1]] },
      { step: [-1, 0], dests: [[-2, 1], [-2, -1]] },
    ];
    for (const group of horseMoves) {
      const legX = x + group.step[0], legY = y + group.step[1];
      if (!getPieceAt(board, legX, legY)) {
        for (const [dx, dy] of group.dests) {
          addIfValid(x + dx, y + dy);
        }
      }
    }
  } else if (type === 'R') {
    const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
    for (const [dx, dy] of dirs) {
      let tx = x + dx, ty = y + dy;
      while (tx >= 0 && tx <= 8 && ty >= 0 && ty <= 9) {
        const dest = getPieceAt(board, tx, ty);
        if (!dest) {
          moves.push({ x: tx, y: ty });
        } else {
          if (dest.side !== side) moves.push({ x: tx, y: ty });
          break;
        }
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
          if (!dest) {
            moves.push({ x: tx, y: ty });
          } else {
            screenFound = true;
          }
        } else {
          if (dest) {
            if (dest.side !== side) moves.push({ x: tx, y: ty });
            break;
          }
        }
        tx += dx; ty += dy;
      }
    }
  } else if (type === 'P') {
    const forward = side === 'red' ? -1 : 1;
    addIfValid(x, y + forward);
    const crossedRiver = side === 'red' ? y <= 4 : y >= 5;
    if (crossedRiver) {
      addIfValid(x - 1, y);
      addIfValid(x + 1, y);
    }
  }

  return moves;
}

function isKingInCheck(board, side) {
  const king = board.find(p => p.type === 'K' && p.side === side);
  if (!king) return false;

  const enemySide = side === 'red' ? 'black' : 'red';
  const enemyKing = board.find(p => p.type === 'K' && p.side === enemySide);

  // Flying King Rule
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
      if (pMoves.some(m => m.x === king.x && m.y === king.y)) {
        return true;
      }
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
    const nextBoard = board
      .filter(p => !(p.x === m.x && p.y === m.y))
      .map(p => (p.x === x && p.y === y ? { ...p, x: m.x, y: m.y } : p));

    if (!isKingInCheck(nextBoard, activeSide)) {
      legalMoves.push(m);
    }
  }

  return legalMoves;
}

const CanvasBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let lastTime = performance.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const icons = ['🎲', '🃏', '♟️', '🌟', '🎯', '🎰'];
    const particles = Array.from({ length: 24 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      icon: icons[Math.floor(Math.random() * icons.length)],
      size: Math.random() * 18 + 14,
      speedY: (Math.random() * 20 + 10),
      speedX: (Math.random() * 10 - 5),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 1.5,
      opacity: Math.random() * 0.35 + 0.1,
    }));

    const render = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.y -= p.speedY * dt;
        p.x += p.speedX * dt;
        p.rotation += p.rotSpeed * dt;

        if (p.y < -30) {
          p.y = canvas.height + 30;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -30) p.x = canvas.width + 30;
        if (p.x > canvas.width + 30) p.x = -30;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.icon, 0, 0);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

const XiangqiPieceIcon = () => (
  <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-900 shadow-[inset_0_3px_6px_rgba(255,255,255,0.9),inset_0_-5px_10px_rgba(120,53,15,0.5),0_8px_16px_rgba(0,0,0,0.3)] flex items-center justify-center relative my-1">
    <div className="w-[82%] h-[82%] rounded-full border-2 border-red-600/70 flex items-center justify-center bg-amber-50/40">
      <span className="text-red-600 font-serif font-black text-4xl leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] select-none">
        帥
      </span>
    </div>
  </div>
);

const DiscordUserWidget = ({ user, onClickProfile, isConnected }) => {
  return (
    <div
      onMouseEnter={() => audio.playHover()}
      onClick={() => {
        audio.playClick();
        onClickProfile();
      }}
      className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-md border-2 border-indigo-500/50 hover:border-indigo-400 p-1.5 pr-3.5 rounded-full cursor-pointer shadow-[0_4px_15px_rgba(88,101,242,0.3)] hover:shadow-[0_6px_20px_rgba(88,101,242,0.5)] transition-all duration-200 group"
    >
      <div className="relative">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-inner overflow-hidden group-hover:scale-105 transition-transform">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => { e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
          />
        </div>
        <span className={`absolute bottom-0 right-0 w-3 h-3 ${isConnected ? 'bg-emerald-500' : 'bg-slate-500'} border-2 border-slate-900 rounded-full shadow-sm`}></span>
      </div>
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-white text-xs sm:text-sm tracking-wide group-hover:text-indigo-300 transition-colors">
            {user.name}
          </span>
          <span className="bg-indigo-600/80 text-indigo-100 text-[9px] font-bold px-1.5 py-0.2 rounded-md border border-indigo-400/40">PLAYER</span>
        </div>
        <span className="text-[10px] sm:text-xs text-gray-400">Discord</span>
      </div>
    </div>
  );
};

const BotEloModal = ({ onClose, onSelectElo, mode = 'single' }) => {
  const [selectedElo, setSelectedElo] = useState(1200);
  const [selectedElo2, setSelectedElo2] = useState(1600);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-slate-900 border-4 border-indigo-500/80 w-full max-w-md rounded-3xl p-5 shadow-[0_0_50px_rgba(99,102,241,0.5)] text-white relative overflow-hidden flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h3 className="text-xl font-black text-amber-300 flex items-center justify-center gap-2">
            🤖 {mode === 'single' ? 'Chọn Cấp Độ / Elo Cho Bot' : 'Cấu Hình Đấu 2 Bot AI'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'single' ? 'Hãy chọn cấp độ thông minh phù hợp để thi đấu' : 'Chọn cấp độ Elo cho từng Bot tham gia trận đấu'}
          </p>
        </div>

        {mode === 'single' ? (
          <div className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
            {BOT_ELO_PRESETS.map((preset) => {
              const isSelected = selectedElo === preset.elo;
              return (
                <div
                  key={preset.elo}
                  onClick={() => { audio.playClick(); setSelectedElo(preset.elo); }}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 relative ${
                    isSelected
                      ? 'bg-indigo-950/90 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  <span className="text-3xl shrink-0">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-sm text-white">{preset.title}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${preset.badgeColor}`}>
                        {preset.elo} ELO
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 mt-1 leading-snug">{preset.desc}</p>
                  </div>
                  {isSelected && (
                    <span className="absolute top-2 right-2 text-amber-400 text-xs font-bold">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-red-400 block mb-1">🔴 Bot Phe Đỏ (Bot Alpha):</label>
              <select
                value={selectedElo}
                onChange={(e) => setSelectedElo(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold rounded-xl p-2.5 outline-none focus:border-amber-400"
              >
                {BOT_ELO_PRESETS.map(p => (
                  <option key={p.elo} value={p.elo}>
                    {p.icon} {p.title} ({p.elo} ELO)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">⚫ Bot Phe Đen (Bot Beta):</label>
              <select
                value={selectedElo2}
                onChange={(e) => setSelectedElo2(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold rounded-xl p-2.5 outline-none focus:border-amber-400"
              >
                {BOT_ELO_PRESETS.map(p => (
                  <option key={p.elo} value={p.elo}>
                    {p.icon} {p.title} ({p.elo} ELO)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl font-bold text-xs transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              audio.playClick();
              if (mode === 'single') onSelectElo(selectedElo);
              else onSelectElo(selectedElo, selectedElo2);
            }}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all active:scale-95"
          >
            Xác Nhận Thêm Bot
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfileModal = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="bg-slate-900 border-4 border-indigo-500/80 w-full max-w-sm rounded-3xl p-6 shadow-[0_0_50px_rgba(88,101,242,0.5)] text-white relative overflow-hidden flex flex-col items-center pt-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
        <div className="relative z-10 mb-2">
          <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-indigo-500 to-purple-500 shadow-xl overflow-hidden">
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full bg-slate-800" />
          </div>
          <span className="absolute bottom-1 right-1 bg-emerald-500 border-2 border-slate-900 w-4 h-4 rounded-full"></span>
        </div>
        <h3 className="text-xl font-black text-white text-center">{user.name}</h3>
        <p className="text-xs text-indigo-300 font-medium mb-4">{user.handle}</p>

        <div className="w-full mb-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 p-3 text-center">
          <span className="text-xs text-gray-400 block font-bold mb-1">Discord ID</span>
          <span className="text-sm font-mono text-indigo-200 break-all">{user.id}</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl font-bold shadow-[0_4px_0_#3730a3] active:translate-y-1 active:shadow-none transition-all"
        >
          Đóng Profile
        </button>
      </div>
    </div>
  );
};

const DiscordAuthTimelineModal = ({ steps, connectionState, error, onClose, onRetry }) => {
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="discord-auth-title"
        className="w-full max-w-3xl rounded-3xl border border-indigo-400/40 bg-slate-950 p-5 text-white shadow-[0_0_50px_rgba(79,70,229,0.35)] sm:p-7"
      >
        <div className="mb-6 text-center">
          <span className="mb-2 inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">
            Discord Activity
          </span>
          <h2 id="discord-auth-title" className="text-xl font-black sm:text-2xl">
            {isConnected ? 'Đã xác thực tài khoản' : isConnecting ? 'Đang xác thực tài khoản' : 'Xác thực Discord thất bại'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Theo dõi tiến trình kết nối và xác thực hồ sơ Discord của bạn.
          </p>
        </div>

        <ol className="flex overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const isComplete = step.status === 'complete';
            const isActive = step.status === 'active';
            const isError = step.status === 'error';
            return (
              <li key={step.label} className="flex min-w-[160px] flex-1 items-start">
                <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-black ${
                    isComplete ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                      : isError ? 'border-rose-400 bg-rose-500/15 text-rose-300'
                        : isActive ? 'border-indigo-300 bg-indigo-500/20 text-indigo-200 animate-pulse'
                          : 'border-slate-700 bg-slate-900 text-slate-500'
                  }`}>
                    {isComplete ? '✓' : isError ? '!' : index + 1}
                  </span>
                  <span className={`mt-2 max-w-[130px] text-[11px] font-bold leading-snug ${
                    isComplete ? 'text-emerald-200' : isError ? 'text-rose-200' : isActive ? 'text-white' : 'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                    {isComplete ? 'Hoàn tất' : isError ? 'Lỗi' : isActive ? 'Đang xử lý' : 'Đang chờ'}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <span className={`mt-[17px] h-0.5 min-w-5 flex-1 ${isComplete ? 'bg-emerald-500/70' : 'bg-slate-800'}`} />
                )}
              </li>
            );
          })}
        </ol>

        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/50 p-3 text-center text-xs text-rose-200">{error}</p>}

        <div className="mt-6 flex justify-center gap-3">
          {isConnected ? (
            <button onClick={onClose} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold hover:bg-indigo-500">
              Đóng
            </button>
          ) : connectionState === 'error' ? (
            <button onClick={onRetry} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold hover:bg-indigo-500">
              Thử xác thực lại
            </button>
          ) : (
            <p className="text-xs font-semibold text-indigo-200">Vui lòng chờ trong khi Discord xác thực...</p>
          )}
        </div>
      </section>
    </div>
  );
};

const XiangqiBoard = ({ board, isFlipped = false, isPlaying = false, activeSide, playerSide, selectablePieces, selectedPiece, legalMoves, checkSide, onSelectPiece, onMove }) => {
  const labels = {
    K: { red: '帥', black: '將' },
    A: { red: '仕', black: '士' },
    E: { red: '相', black: '象' },
    H: { red: '傌', black: '馬' },
    R: { red: '俥', black: '車' },
    C: { red: '炮', black: '砲' },
    P: { red: '兵', black: '卒' }
  };
  const findPiece = (x, y) => board.find(piece => piece.x === x && piece.y === y);
  const canMove = isPlaying && (!playerSide || playerSide === activeSide);
  const isLegalDestination = (x, y) => legalMoves.some(move => move.x === x && move.y === y);

  return (
    <div className={`@container relative h-full w-auto aspect-[8/9] max-h-full max-w-full bg-amber-100/95 border-2 sm:border-4 border-amber-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-[inset_0_0_20px_rgba(120,53,15,0.4),0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-500 flex flex-col justify-center items-center ${isFlipped ? 'rotate-180' : ''}`}>
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
                  aria-label={`Di chuyển đến ${x + 1}, ${y + 1}`}
                  onClick={() => onMove(selectedPiece.x, selectedPiece.y, x, y)}
                  className={`absolute z-20 h-[clamp(8px,3.8cqw,16px)] w-[clamp(8px,3.8cqw,16px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-800/80 bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.8)] hover:scale-125 transition-transform`}
                  style={{ left: `${(x / 8) * 100}%`, top: `${(y / 9) * 100}%` }}
                />
              );
            }

            const isCurrentSide = !playerSide || piece.side === playerSide;
            const isSelectable = canMove
              && isCurrentSide
              && piece.side === activeSide
              && (selectablePieces?.some(position => position.x === x && position.y === y) ?? true);
            const isSelected = selectedPiece?.x === x && selectedPiece?.y === y;
            const isCheckedKing = piece.type === 'K' && piece.side === checkSide;
            return (
              <button
                key={`piece-${x}-${y}`}
                aria-label={`${piece.side === 'red' ? 'Đỏ' : 'Đen'} ${labels[piece.type][piece.side]} tại ${x + 1}, ${y + 1}`}
                onClick={() => {
                  if (isDestination) onMove(selectedPiece.x, selectedPiece.y, x, y);
                  else if (isSelectable) onSelectPiece(x, y);
                }}
                disabled={!isSelectable && !isDestination}
                className={`absolute z-20 flex h-[clamp(14px,8cqw,34px)] w-[clamp(14px,8cqw,34px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-serif text-[clamp(9px,4cqw,17px)] font-black shadow-lg transition-all
                  ${piece.side === 'red' ? 'border-red-700 bg-amber-50 text-red-600' : 'border-slate-300 bg-slate-900 text-slate-100'}
                  ${isSelectable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                  ${isSelected ? 'ring-2 sm:ring-4 ring-emerald-400 scale-105' : ''}
                  ${isDestination ? 'ring-2 sm:ring-4 ring-emerald-500' : ''}
                  ${isCheckedKing ? 'animate-check-pulse ring-2 sm:ring-4 ring-rose-500' : ''}`}
                style={{ left: `${(x / 8) * 100}%`, top: `${(y / 9) * 100}%` }}
              >
                <span className={isFlipped ? 'rotate-180' : ''}>{labels[piece.type][piece.side]}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

const XiangqiRoom = ({ room, currentUser, roomError, onLeave, onJoinSide, onReady, onAddBot, onAddTwoBots, onRemoveBot, onMove, onSurrender, onRequestDraw, onRespondDraw, onRenameRoom, onRequestSwap, onAcceptSwap, onRejectSwap, onCancelSwap }) => {
  const [clockNow, setClockNow] = useState(Date.now());
  const [isEditingName, setIsEditingName] = useState(false);
  const [roomNameDraft, setRoomNameDraft] = useState(room.name);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [moveError, setMoveError] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chatError, setChatError] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef(null);
  const chatListRef = useRef(null);
  const shouldAutoScrollChat = useRef(true);
  
  // Bot Elo selection state
  const [showBotEloModal, setShowBotEloModal] = useState(false);
  const [botModalMode, setBotModalMode] = useState('single');

  const previousCheckSide = useRef(room.checkSide);
  const previousBoard = useRef({ roomId: room.id, revision: room.revision, board: room.board || [] });
  const isPlaying = room.status === 'playing';
  
  const isUserBlack = room.blackPlayer?.id === currentUser.id;
  const isUserRed = room.redPlayer?.id === currentUser.id;
  const isFlipped = isUserBlack;
  const userSide = isUserRed ? 'red' : isUserBlack ? 'black' : 'red';
  const otherSide = userSide === 'red' ? 'black' : 'red';

  const swapRequest = room.swapRequest;
  const isTargetOfSwap = !isPlaying && swapRequest && swapRequest.targetId === currentUser.id;
  const isRequesterOfSwap = !isPlaying && swapRequest && swapRequest.requesterId === currentUser.id;
  const drawOffer = room.drawOffer;
  const isTargetOfDraw = isPlaying && drawOffer?.status === 'pending' && drawOffer.targetId === currentUser.id;
  const isRequesterOfDraw = isPlaying && drawOffer?.status === 'pending' && drawOffer.requesterId === currentUser.id;
  const isDrawDeclined = isPlaying && drawOffer?.status === 'declined' && drawOffer.requesterId === currentUser.id;

  useEffect(() => {
    setSelectedPiece(null);
    setLegalMoves([]);
    setMoveError('');
  }, [room.id, room.revision]);

  useEffect(() => {
    const previous = previousBoard.current;
    const board = room.board || [];
    if (previous.roomId === room.id && previous.revision !== room.revision) {
      const previousSquares = new Map(previous.board.map(piece => [`${piece.x},${piece.y}`, piece]));
      const currentSquares = new Map(board.map(piece => [`${piece.x},${piece.y}`, piece]));
      const from = [...previousSquares.entries()].find(([square]) => !currentSquares.has(square));
      const to = [...currentSquares.entries()].find(([square]) => !previousSquares.has(square));

      if (from && to && from[1].side === to[1].side && from[1].type === to[1].type) {
        const [toX, toY] = to[0].split(',').map(Number);
        audio.playMove(from[1].type, previousSquares.has(`${toX},${toY}`));
      }
    }
    previousBoard.current = { roomId: room.id, revision: room.revision, board };
  }, [room.id, room.revision, room.board]);

  useEffect(() => {
    if (room.checkSide && room.checkSide !== previousCheckSide.current) {
      audio.playCheck();
    }
    previousCheckSide.current = room.checkSide;
  }, [room.checkSide]);

  useEffect(() => {
    let isActive = true;
    let isLoading = false;
    setChatMessages([]);
    setChatDraft('');
    setChatError('');
    shouldAutoScrollChat.current = true;

    const refreshChat = async () => {
      if (isLoading) return;
      isLoading = true;
      try {
        const response = await fetch(
          `/api/games/rooms/${room.id}/chat?userId=${encodeURIComponent(currentUser.id)}`,
          { cache: 'no-store' }
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Không thể tải tin nhắn trong phòng.');
        }
        if (!Array.isArray(result)) {
          throw new Error('Dữ liệu tin nhắn từ máy chủ không hợp lệ.');
        }
        if (isActive) {
          setChatMessages((messages) => {
            const lastMessage = messages[messages.length - 1];
            const latestMessage = result[result.length - 1];
            return messages.length === result.length && lastMessage?.id === latestMessage?.id
              ? messages
              : result;
          });
          setChatError('');
        }
      } catch (error) {
        if (isActive) {
          setChatError(error instanceof Error ? error.message : 'Không thể tải tin nhắn trong phòng.');
        }
      } finally {
        isLoading = false;
      }
    };

    refreshChat();
    const intervalId = window.setInterval(refreshChat, 2000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [room.id, currentUser.id]);

  useEffect(() => {
    if (shouldAutoScrollChat.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSendChat = async (event) => {
    event.preventDefault();
    const content = chatDraft.trim();
    if (!content || isSendingChat) return;

    setIsSendingChat(true);
    setChatError('');
    try {
      const response = await fetch(`/api/games/rooms/${room.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, content })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Không thể gửi tin nhắn.');
      }
      setChatMessages((messages) => [...messages, result].slice(-100));
      setChatDraft('');
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Không thể gửi tin nhắn.');
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleSelectPiece = async (x, y) => {
    try {
      const response = await fetch(`/api/games/rooms/${room.id}/piece-moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, x, y })
      });
      if (response.ok) {
        const result = await response.json();
        setSelectedPiece({ x, y });
        setLegalMoves(result.moves);
        setMoveError('');
        return;
      }
      throw new Error('Fallback local moves calculation');
    } catch {
      const activeSide = room.clock?.activeSide || 'red';
      const moves = getLegalMovesLocal(room.board || [], x, y, activeSide);
      setSelectedPiece({ x, y });
      setLegalMoves(moves);
      setMoveError('');
    }
  };

  const handleMove = async (fromX, fromY, toX, toY) => {
    const succeeded = await onMove(fromX, fromY, toX, toY);
    if (succeeded) {
      setSelectedPiece(null);
      setLegalMoves([]);
      setMoveError('');
    }
  };

  const renderPlayerSlot = (side, player) => {
    const isRed = side === 'red';
    const isCurrentUser = player?.id === currentUser.id;
    const isOpponent = player && !player.isBot && !isCurrentUser && (isUserRed || isUserBlack) && !isPlaying;

    if (player) {
      const preset = player.isBot
        ? (BOT_ELO_PRESETS.find(p => p.elo === player.elo) || BOT_ELO_PRESETS[1])
        : null;

      return (
        <div 
          onClick={() => {
            if (isOpponent) {
              audio.playClick();
              onRequestSwap(player);
            }
          }}
          className={`flex w-full min-w-0 items-center gap-2 bg-slate-950/80 border px-2.5 py-1 rounded-xl animate-fade-in group relative transition-all
            ${isOpponent 
              ? 'border-amber-500/50 hover:border-amber-400 hover:bg-slate-900/90 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
              : 'border-slate-700/60'}`}
          title={isOpponent ? "Nhấn để gửi yêu cầu Đổi Phe" : ""}
        >
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full p-0.5 shadow-lg shrink-0 relative ${isRed ? 'bg-gradient-to-tr from-red-600 to-orange-400' : 'bg-gradient-to-tr from-slate-700 to-slate-400'}`}>
            <img src={player.avatarUrl} alt={player.name} className="w-full h-full rounded-full object-cover border border-slate-900" />
            {isOpponent && (
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-slate-900 shadow">
                🔄
              </span>
            )}
          </div>
          <div className="flex flex-col text-left overflow-hidden min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className={`font-bold text-xs truncate ${isRed ? 'text-red-300' : 'text-slate-200'}`}>
                {player.name} {isCurrentUser && "(Bạn)"}
              </span>
              {player.isBot && (
                <span className={`text-[8px] font-black px-1 rounded border shrink-0 ${preset?.badgeColor || 'bg-indigo-950 text-indigo-300 border-indigo-700'}`}>
                  {player.elo || 1200} ELO
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${isRed ? 'text-red-400/80' : 'text-slate-400'}`}>
                {isRed ? 'Phe Đỏ' : 'Phe Đen'}
              </span>
              <span className={`font-mono text-xs font-black ${isPlaying && room.clock?.activeSide === side ? 'text-amber-300' : 'text-white'}`}>
                {getClockLabel(side)}
              </span>
            </div>
          </div>
          
          {isCurrentUser && !isPlaying && (
            <button 
              onClick={(e) => { e.stopPropagation(); audio.playClick(); onJoinSide(null); }}
              className="ml-auto bg-red-600 hover:bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-all shrink-0"
              title="Rời vị trí"
            >✕</button>
          )}

          {player.isBot && !isPlaying && (
            <button 
              onClick={(e) => { e.stopPropagation(); audio.playClick(); onRemoveBot(side); }}
              className="ml-auto bg-rose-600/90 hover:bg-rose-500 text-white px-1.5 py-0.5 rounded-lg text-[10px] font-bold shadow-md transition-all shrink-0 flex items-center gap-0.5 border border-rose-400/50 hover:scale-105 active:scale-95"
              title="Đuổi Bot khỏi bàn cờ"
            >
              🚫 Đuổi
            </button>
          )}

          {isOpponent && (
            <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-end pr-2 pointer-events-none">
              <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-full shadow-md">
                🔄 Đổi Phe
              </span>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <button
        onClick={() => { audio.playClick(); onJoinSide(side); }}
        disabled={isPlaying || room.status === 'finished'}
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-2 py-2 text-xs font-bold transition-colors
          ${isPlaying || room.status === 'finished'
            ? 'cursor-not-allowed border-slate-700/70 bg-slate-900/50 text-slate-600'
            : isRed
              ? 'border-red-500/50 bg-red-950/30 text-red-300 hover:border-red-400 hover:bg-red-950/60'
              : 'border-slate-400/50 bg-slate-800/40 text-slate-200 hover:border-slate-300 hover:bg-slate-800'}`}
      >
        <span className="text-base">＋</span>
        Ngồi {isRed ? 'Đỏ' : 'Đen'}
      </button>
    );
  };

  useEffect(() => {
    setRoomNameDraft(room.name);
  }, [room.name]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const intervalId = window.setInterval(() => setClockNow(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, [isPlaying]);

  const getClockLabel = (side) => {
    const clock = room.clock;
    if (!clock) return '20:00';
    const elapsed = isPlaying && clock.activeSide === side
      ? Math.max(0, clockNow - clock.turnStartedAt)
      : 0;
    const seconds = Math.ceil(Math.max(0, clock[`${side}Ms`] - elapsed) / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/80 backdrop-blur-xl rounded-2xl sm:rounded-[2rem] border-2 border-rose-500/30 overflow-hidden shadow-2xl relative animate-fade-in h-full">
      {roomError && (
        <p role="alert" className="absolute left-1/2 top-2 z-[60] w-[min(92%,36rem)] -translate-x-1/2 rounded-lg border border-rose-500/50 bg-rose-950/95 px-3 py-2 text-center text-xs font-bold text-rose-200 shadow-lg">
          {roomError}
        </p>
      )}
      {showBotEloModal && (
        <BotEloModal
          mode={botModalMode}
          onClose={() => setShowBotEloModal(false)}
          onSelectElo={(elo1, elo2) => {
            setShowBotEloModal(false);
            if (botModalMode === 'single') {
              onAddBot(elo1);
            } else {
              onAddTwoBots(elo1, elo2);
            }
          }}
        />
      )}

      {isTargetOfSwap && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-amber-400 p-3 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.5)] flex flex-col items-center gap-2 animate-fade-in backdrop-blur-md max-w-xs w-[90%]">
          <p className="text-xs font-bold text-amber-200 text-center">
            🔄 <span className="text-white font-black">{swapRequest.requesterName}</span> muốn yêu cầu <span className="text-amber-400 uppercase font-black">Đổi Phe</span> với bạn!
          </p>
          <div className="flex gap-2 w-full justify-center">
            <button 
              onClick={() => { audio.playClick(); onAcceptSwap(); }}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg shadow-md transition-all active:scale-95"
            >
              ✓ Đồng Ý
            </button>
            <button 
              onClick={() => { audio.playClick(); onRejectSwap(); }}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-lg shadow-md transition-all active:scale-95"
            >
              ✕ Từ Chối
            </button>
          </div>
        </div>
      )}

      {isRequesterOfSwap && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border border-amber-400/80 p-2.5 px-4 rounded-xl shadow-xl flex items-center gap-2.5 animate-fade-in backdrop-blur-md">
          <span className="animate-spin text-amber-400 text-xs">⏳</span>
          <span className="text-[11px] font-bold text-amber-200">
            Đã gửi yêu cầu đổi phe...
          </span>
          <button 
            onClick={() => { audio.playClick(); onCancelSwap(); }}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-gray-300 px-2 py-0.5 rounded-md border border-slate-600 font-bold"
          >
            Hủy
          </button>
        </div>
      )}

      {isTargetOfDraw && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-amber-400 p-3 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.5)] flex flex-col items-center gap-2 animate-fade-in backdrop-blur-md max-w-xs w-[90%]">
          <p className="text-xs font-bold text-amber-200 text-center">
            🤝 <span className="text-white font-black">{drawOffer.requesterName}</span> muốn đề nghị hòa. Bạn đồng ý không?
          </p>
          <div className="flex gap-2 w-full justify-center">
            <button
              onClick={() => { audio.playClick(); onRespondDraw(true); }}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg shadow-md transition-all active:scale-95"
            >
              ✓ Đồng ý
            </button>
            <button
              onClick={() => { audio.playClick(); onRespondDraw(false); }}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-lg shadow-md transition-all active:scale-95"
            >
              ✕ Từ chối
            </button>
          </div>
        </div>
      )}

      {/* Header Phòng */}
      <div className="bg-slate-950/70 p-2 sm:px-3 sm:py-1.5 border-b border-slate-700/50 flex flex-wrap justify-between items-center gap-2 z-10 shrink-0">
        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                onRenameRoom(roomNameDraft).then(saved => {
                  if (saved) setIsEditingName(false);
                });
              }}
            >
              <input
                aria-label="Tên phòng"
                autoFocus
                maxLength={60}
                value={roomNameDraft}
                onChange={event => setRoomNameDraft(event.target.value)}
                className="min-w-0 rounded-lg border border-rose-400/50 bg-slate-900 px-2 py-0.5 text-xs text-white"
              />
              <button className="rounded-lg bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white" type="submit">Lưu</button>
              <button className="rounded-lg bg-slate-700 px-2 py-0.5 text-xs font-bold text-white" type="button" onClick={() => { setRoomNameDraft(room.name); setIsEditingName(false); }}>Hủy</button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 truncate text-sm sm:text-base font-black text-rose-300 flex items-center gap-1.5">
                <span className="shrink-0 text-lg">♟️</span> <span className="truncate">{room.name}</span>
              </h2>
              {room.ownerId === currentUser.id && (
                <button className="rounded-md border border-slate-600 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white" onClick={() => setIsEditingName(true)}>Đổi tên</button>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            <p className="text-[11px] text-gray-400">
              Trạng thái: {isPlaying ? <span className="text-emerald-400 font-bold">Đang thi đấu</span> : room.status === 'finished' ? <span className="text-rose-300 font-bold">Đã kết thúc</span> : <span className="text-amber-400 font-bold">Đang chờ...</span>}
            </p>
            <span className="text-slate-600 text-[10px]">•</span>
            <p className="text-[10px] text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.2 rounded-full font-semibold">
              Góc nhìn: {isUserBlack ? 'Phe Đen (Bạn ở dưới)' : isUserRed ? 'Phe Đỏ (Bạn ở dưới)' : 'Xem (Đỏ ở dưới)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isPlaying && (isUserRed || isUserBlack) && (
            <>
              {isRequesterOfDraw && (
                <span role="status" className="rounded-lg border border-amber-500/50 bg-amber-950/60 px-2 py-1 text-[11px] font-bold text-amber-200">
                  Đang chờ hòa...
                </span>
              )}
              {isDrawDeclined && (
                <span role="status" className="rounded-lg border border-rose-500/50 bg-rose-950/60 px-2 py-1 text-[11px] font-bold text-rose-200">
                  Từ chối hòa
                </span>
              )}
              {(!drawOffer || drawOffer.status === 'declined') && (
                <button
                  onClick={() => { audio.playClick(); onRequestDraw(); }}
                  className="bg-amber-700 hover:bg-amber-600 text-amber-50 px-2 py-1 rounded-lg text-xs font-bold transition-colors border border-amber-500/60"
                >
                  Xin hòa
                </button>
              )}
            </>
          )}
          <button
            onClick={() => {
              audio.playClick();
              if (isPlaying && (isUserRed || isUserBlack)) onSurrender();
              else onLeave();
            }}
            className="bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-gray-300 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border border-slate-700"
          >
            {isPlaying && (isUserRed || isUserBlack) ? 'Đầu Hàng' : 'Rời Phòng'}
          </button>
        </div>
      </div>

      {/* Main Arena Content */}
      <div className="flex flex-1 min-h-0 min-w-0 flex-col lg:flex-row">
      <div className="grid flex-1 min-h-0 min-w-0 grid-cols-1 grid-rows-[minmax(0,1fr)_auto_auto] gap-1.5 p-1.5 sm:gap-2 sm:p-2 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:grid-rows-1 xl:overflow-hidden z-10 w-full max-w-4xl mx-auto">
        <div className="order-2 flex min-w-0 flex-row justify-center gap-2 xl:order-1 xl:flex-col">
          {renderPlayerSlot(otherSide, room[`${otherSide}Player`])}
          {renderPlayerSlot(userSide, room[`${userSide}Player`])}
        </div>

        <div className="order-1 flex h-full min-h-0 min-w-0 items-center justify-center overflow-hidden py-1 xl:order-2">
          <div className="relative flex h-full min-h-0 min-w-0 items-center justify-center">
            <XiangqiBoard
              board={room.board || []}
              isFlipped={isFlipped}
              isPlaying={isPlaying}
              activeSide={room.clock?.activeSide}
              playerSide={isUserRed ? 'red' : isUserBlack ? 'black' : null}
              selectablePieces={room.selectablePieces || []}
              selectedPiece={selectedPiece}
              legalMoves={legalMoves}
              checkSide={room.checkSide}
              onSelectPiece={handleSelectPiece}
              onMove={handleMove}
            />
            {room.status === 'finished' && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-2xl border-4 border-amber-900 bg-slate-950/80 px-4 text-center shadow-inner backdrop-blur-[2px] animate-fade-in">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Ván đấu kết thúc</p>
                <p role="status" className={`max-w-[300px] text-sm font-black sm:text-lg ${room.winner === null || !(isUserRed || isUserBlack) ? 'text-amber-100' : room.winner === (isUserRed ? 'red' : 'black') ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {room.result || 'Ván đấu đã kết thúc.'}
                </p>
                {room.winner && (isUserRed || isUserBlack) && (
                  <p className={`text-xs font-bold ${room.winner === (isUserRed ? 'red' : 'black') ? 'text-emerald-200' : 'text-rose-200'}`}>
                    {room.winner === (isUserRed ? 'red' : 'black') ? 'Bạn thắng!' : 'Bạn thua!'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="order-3 flex min-w-0 flex-col items-center justify-center gap-2 text-center">
          {isPlaying && room.checkSide && (
            <p role="alert" className="animate-check-pulse rounded-lg border border-rose-500 bg-rose-950/90 px-2 py-1 text-[10px] font-black text-rose-200 sm:px-3 sm:text-xs">
              CHIẾU TƯỚNG — Phe {room.checkSide === 'red' ? 'Đỏ' : 'Đen'} phải cứu tướng!
            </p>
          )}
          {moveError && <p role="alert" className="text-xs font-bold text-rose-300">{moveError}</p>}
        </div>
      </div>

      <aside className="flex h-[32%] min-h-[150px] shrink-0 flex-col border-t border-slate-700/70 bg-slate-950/55 lg:h-auto lg:min-h-0 lg:w-72 lg:border-l lg:border-t-0 xl:w-80">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700/60 px-3 py-2">
          <h3 className="text-xs font-black text-indigo-100">💬 Chat phòng</h3>
          <span className="text-[10px] text-slate-400">Tối đa 500 ký tự</span>
        </div>
        <div
          aria-live="polite"
          aria-label="Tin nhắn trong phòng"
          ref={chatListRef}
          onScroll={() => {
            const list = chatListRef.current;
            if (list) {
              shouldAutoScrollChat.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
            }
          }}
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-2"
        >
          {chatMessages.length === 0 && !chatError && (
            <p className="m-auto text-center text-[11px] text-slate-500">Chưa có tin nhắn. Hãy bắt đầu trò chuyện!</p>
          )}
          {chatMessages.map((message) => (
            <div key={message.id} className={`flex items-start gap-2 ${message.userId === currentUser.id ? 'flex-row-reverse' : ''}`}>
              {message.avatarUrl ? (
                <img src={message.avatarUrl} alt="" className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-slate-800 object-cover" />
              ) : (
                <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px]">♟</span>
              )}
              <div className={`min-w-0 max-w-[85%] rounded-xl border px-2.5 py-1.5 ${message.userId === currentUser.id ? 'border-indigo-500/30 bg-indigo-950/70 text-right' : 'border-slate-700/70 bg-slate-900/80'}`}>
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[10px] font-bold text-indigo-200">{message.userId === currentUser.id ? 'Bạn' : message.name}</span>
                  <time className="shrink-0 text-[9px] text-slate-500">
                    {new Date(message.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                <p className="break-words text-xs text-slate-100">{message.content}</p>
              </div>
            </div>
          ))}
          {chatError && <p role="alert" className="rounded-lg bg-rose-950/70 px-2 py-1 text-[10px] text-rose-200">{chatError}</p>}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendChat} className="flex shrink-0 gap-1.5 border-t border-slate-700/60 p-2">
          <input
            aria-label="Tin nhắn"
            maxLength={500}
            value={chatDraft}
            onChange={(event) => setChatDraft(event.target.value)}
            placeholder="Nhập tin nhắn..."
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
          />
          <button
            type="submit"
            disabled={!chatDraft.trim() || isSendingChat}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Gửi
          </button>
        </form>
      </aside>
      </div>

      {/* Bottom Controls & Observers Bar */}
      <div className="bg-slate-950/80 p-2 sm:p-2.5 border-t border-slate-700/50 z-10 shrink-0">
        <div className="flex flex-wrap justify-between items-center gap-1.5 mb-1">
          <h3 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            👁️️ Đang xem ({room.observers.length})
          </h3>
          
          {!isPlaying && room.status !== 'finished' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-bold ${room.redReady ? 'text-emerald-300' : 'text-slate-400'}`}>Đỏ {room.redReady ? '✓ Sẵn sàng' : 'Chưa sẵn sàng'}</span>
              <span className={`text-[10px] font-bold ${room.blackReady ? 'text-emerald-300' : 'text-slate-400'}`}>Đen {room.blackReady ? '✓ Sẵn sàng' : 'Chưa sẵn sàng'}</span>
              {onAddTwoBots && (
                <button
                  onClick={() => { 
                    audio.playClick(); 
                    setBotModalMode('double');
                    setShowBotEloModal(true);
                  }}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-xs font-bold text-white shadow border border-indigo-400/50 transition-all flex items-center gap-1 hover:scale-105 active:scale-95"
                  title="Cho 2 Bot thi đấu với nhau"
                >
                  🤖 vs 🤖 2 Bot Tự Đấu
                </button>
              )}
              {(isUserRed || isUserBlack) && (
                <button
                  onClick={() => onReady(!(isUserRed ? room.redReady : room.blackReady))}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow transition-all ${((isUserRed && room.redReady) || (isUserBlack && room.blackReady)) ? 'bg-amber-700 hover:bg-amber-600' : 'bg-emerald-700 hover:bg-emerald-600'}`}
                >
                  {((isUserRed && room.redReady) || (isUserBlack && room.blackReady)) ? 'Bỏ sẵn sàng' : 'Sẵn sàng'}
                </button>
              )}
              {onAddBot && (!room.redPlayer || !room.blackPlayer) && (
                <button
                  onClick={() => {
                    audio.playClick();
                    setBotModalMode('single');
                    setShowBotEloModal(true);
                  }}
                  className="rounded-lg border border-indigo-400/50 bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow transition-colors hover:bg-indigo-500"
                  title="Chọn cấp độ và thêm bot"
                >
                  🤖 Thêm Bot
                </button>
              )}
            </div>
          )}
          {room.status === 'finished' && (isUserRed || isUserBlack) && (
            <button onClick={() => onReady(true)} className="rounded-xl bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 shadow-md">Sẵn sàng ván mới</button>
          )}
        </div>
        
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 min-h-[26px]">
          {room.observers.length === 0 ? (
            <span className="text-[11px] text-gray-500 italic">Chưa có người xem nào...</span>
          ) : (
            room.observers.map((obs, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700 shrink-0 cursor-default" title={obs.name}>
                <img src={obs.avatarUrl} alt={obs.name} className="w-4 h-4 rounded-full" />
                <span className="text-[10px] font-semibold text-gray-300 max-w-[90px] truncate">{obs.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const GameCard = ({ game, onClick }) => {
  return (
    <div
      onMouseEnter={() => audio.playHover()}
      onClick={() => { audio.playClick(); onClick(game); }}
      className={`group relative shrink-0 w-60 sm:w-64 h-72 sm:h-80 rounded-[2.5rem] border-[6px] border-white/90 cursor-pointer snap-center
                  flex flex-col items-center justify-center p-6 text-white text-center
                  transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(0,0,0,0.5),0_0_25px_rgba(255,255,255,0.6)]
                  shadow-[0_10px_20px_rgba(0,0,0,0.3)] overflow-hidden ${game.colorBg}`}
    >
      <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-white/20 skew-x-[-30deg] transition-all duration-500 group-hover:left-[200%]"></div>
      <div className="h-20 flex items-center justify-center text-[4.5rem] drop-shadow-xl mb-3 transform transition-transform group-hover:scale-110 group-hover:rotate-6">
        {game.icon}
      </div>
      <h3 className="text-2xl sm:text-3xl font-black tracking-wide drop-shadow-md mb-1">{game.title}</h3>
      <p className="font-medium text-xs sm:text-sm text-white/90 drop-shadow-sm">{game.desc}</p>
      <div className="mt-auto bg-white/30 px-5 py-1.5 rounded-full font-bold uppercase tracking-widest text-xs shadow-inner backdrop-blur-sm">
        Tạo Phòng
      </div>
    </div>
  );
};

const gamesData = [
  { id: 1, title: 'Cờ Tướng', desc: 'Đấu trí đỉnh cao & Elo AI', colorBg: 'bg-gradient-to-b from-red-500 to-red-800', icon: <XiangqiPieceIcon />, type: 'xiangqi' },
];

export default function Games() {
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAuthTimeline, setShowAuthTimeline] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting');
  const [connectionError, setConnectionError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [authSteps, setAuthSteps] = useState(() => DISCORD_AUTH_STEPS.map((label) => ({ label, status: 'pending' })));
  
  const [currentView, setCurrentView] = useState('games');
  const [activeRoomId, setActiveRoomId] = useState(null);
  
  const [rooms, setRooms] = useState([]);
  const roomsRef = useRef([]);
  const [roomError, setRoomError] = useState('');
  const [roomLoadError, setRoomLoadError] = useState('');

  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    let isActive = true;
    let isLoading = false;

    const refreshRooms = async () => {
      if (isLoading) return;
      isLoading = true;
      try {
        const response = await fetch('/api/games/rooms', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Không thể tải danh sách phòng từ máy chủ.');
        }
        if (!Array.isArray(result)) {
          throw new Error('Dữ liệu phòng từ máy chủ không hợp lệ.');
        }
        if (isActive) {
          roomsRef.current = result;
          setRooms(result);
          setRoomLoadError('');
        }
      } catch (error) {
        if (isActive) {
          setRoomLoadError(error instanceof Error ? error.message : 'Không thể tải danh sách phòng.');
        }
      } finally {
        isLoading = false;
      }
    };

    refreshRooms();
    const intervalId = window.setInterval(refreshRooms, 3000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!activeRoomId || !userProfile) return undefined;
    let isActive = true;

    const sendHeartbeat = async () => {
      try {
        const response = await fetch(`/api/games/rooms/${activeRoomId}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userProfile.id })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Không thể duy trì kết nối với phòng.');
        }
        if (isActive && !result.active) {
          setRoomError('Bạn không còn được ghi nhận trong phòng này. Hãy tham gia lại từ sảnh chờ.');
          setActiveRoomId(null);
          setCurrentView('games');
        }
      } catch (error) {
        if (isActive) {
          setRoomError(error instanceof Error ? error.message : 'Không thể duy trì kết nối với phòng.');
        }
      }
    };

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, 10000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [activeRoomId, userProfile]);

  useEffect(() => {
    if (activeRoomId && !rooms.some((room) => room.id === activeRoomId)) {
      setActiveRoomId(null);
      setCurrentView('games');
    }
  }, [rooms, activeRoomId]);

  useEffect(() => {
    if (!activeRoomId) return;
    const room = rooms.find(r => r.id === activeRoomId);
    if (!room || room.status !== 'playing') return;

    const activeSide = room.clock?.activeSide;
    const activePlayer = activeSide === 'red' ? room.redPlayer : room.blackPlayer;

    if (activePlayer && activePlayer.isBot) {
      const timer = setTimeout(() => performRoomAction(activeRoomId, 'bot-move'), 600);

      return () => clearTimeout(timer);
    }
  }, [rooms, activeRoomId]);

  useEffect(() => {
    let isActive = true;
    setConnectionState('connecting');
    setConnectionError('');
    connectDiscordActivity((step, status) => {
      if (!isActive) return;
      setAuthSteps((currentSteps) => currentSteps.map((currentStep, index) => ({
        ...currentStep,
        status: index < step ? 'complete' : index === step ? status : 'pending'
      })));
    })
      .then((profile) => {
        if (isActive) {
          setUserProfile(profile);
          setConnectionState('connected');
          setConnectionError('');
          setShowAuthTimeline(false);
        }
      })
      .catch((error) => {
        if (isActive) {
          setConnectionState('error');
          setConnectionError(error instanceof Error ? error.message : 'Không thể kết nối Discord Activity.');
        }
      });
    return () => { isActive = false; };
  }, [retryCount]);

  const retryDiscordAuth = () => {
    setAuthSteps(DISCORD_AUTH_STEPS.map((label) => ({ label, status: 'pending' })));
    setConnectionState('connecting');
    setConnectionError('');
    setShowAuthTimeline(true);
    setRetryCount((count) => count + 1);
  };

  const toggleMute = () => {
    audio.playClick();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (!newMuted && !hasStarted) {
      audio.init();
      setHasStarted(true);
    }
    audio.setMuted(newMuted);
  };

  const handleGlobalInteraction = () => {
    if (!hasStarted) {
      audio.init();
      if (!isMuted) audio.startBGM();
      setHasStarted(true);
    }
  };

  const handleCreateRoom = async (gameData) => {
    if (gameData.type === 'xiangqi') {
      const newRoom = {
        id: Date.now(),
        name: `Phòng Cờ Tướng của ${userProfile.name}`,
        ownerId: userProfile.id,
        game: gameData.title,
        slots: "1/2",
        color: "bg-rose-950 text-rose-300 border-rose-700/50",
        type: 'xiangqi',
        status: 'waiting',
        redReady: false,
        blackReady: false,
        clock: null,
        revision: 0,
        drawOffer: null,
        redPlayer: userProfile,
        blackPlayer: null,
        observers: []
      };

      try {
        const response = await fetch('/api/games/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRoom)
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Không thể tạo phòng trên máy chủ.');
        }
        const updated = [result, ...roomsRef.current.filter(r => r.id !== result.id)];
        roomsRef.current = updated;
        setRooms(updated);
        setRoomError('');
        setActiveRoomId(result.id);
        setCurrentView('room');
      } catch (error) {
        setRoomError(error instanceof Error ? error.message : 'Không thể tạo phòng.');
      }
    }
  };

  const syncRoomFromServer = (roomId, result) => {
    const updated = result.deleted
      ? roomsRef.current.filter((room) => room.id !== roomId)
      : [result, ...roomsRef.current.filter((room) => room.id !== roomId)];
    roomsRef.current = updated;
    setRooms(updated);
  };

  const handleJoinRoom = async (roomId) => {
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    try {
      const response = await fetch(`/api/games/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id, user: userProfile })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Không thể tham gia phòng.');
      }
      syncRoomFromServer(roomId, result);
      setRoomError('');
      setActiveRoomId(roomId);
      setCurrentView('room');
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Không thể tham gia phòng.');
    }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoomId) return;
    const roomId = activeRoomId;
    try {
      const response = await fetch(`/api/games/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Không thể rời phòng.');
      }
      syncRoomFromServer(roomId, result);
      setRoomError('');
      setActiveRoomId(null);
      setCurrentView('games');
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Không thể rời phòng.');
    }
  };

  const handleJoinSide = async (side) => {
    if (!activeRoomId) return;
    const roomId = activeRoomId;
    try {
      const response = await fetch(`/api/games/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          user: userProfile,
          side: side || 'observer'
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Không thể đổi vị trí trong phòng.');
      }
      syncRoomFromServer(roomId, result);
      setRoomError('');
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Không thể đổi vị trí trong phòng.');
    }
  };

  const performRoomAction = async (roomId, action, payload = {}) => {
    try {
      const response = await fetch(`/api/games/rooms/${roomId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userProfile.id, ...payload })
      });
      if (response.ok) {
        const result = await response.json();
        syncRoomFromServer(roomId, result);
        setRoomError('');
        return true;
      }
      const result = await response.json();
      throw new Error(result.error || 'Không thể đồng bộ thao tác với máy chủ.');
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Không thể đồng bộ thao tác với máy chủ.');
      return false;
    }
  };

  const handleReady = (ready) => performRoomAction(activeRoomId, 'ready', { ready });
  const handleAddBot = (elo) => performRoomAction(activeRoomId, 'add-bot', { elo });
  const handleAddTwoBots = (elo1, elo2) => performRoomAction(activeRoomId, 'add-two-bots', { elo1, elo2 });
  const handleRemoveBot = (side) => performRoomAction(activeRoomId, 'remove-bot', { side });
  const handleMove = (fromX, fromY, toX, toY) =>
    performRoomAction(activeRoomId, 'move', { fromX, fromY, toX, toY });
  const handleSurrender = () => performRoomAction(activeRoomId, 'surrender');
  const handleRequestDraw = () => performRoomAction(activeRoomId, 'draw-request');
  const handleRespondDraw = (accepted) => performRoomAction(activeRoomId, 'draw-response', { accepted });
  const handleRenameRoom = (name) => performRoomAction(activeRoomId, 'rename', { name });

  const handleRequestSwap = (targetUser) =>
    performRoomAction(activeRoomId, 'swap-request', { targetUserId: targetUser.id });
  const handleAcceptSwap = () =>
    performRoomAction(activeRoomId, 'swap-response', { accepted: true });
  const handleRejectSwap = () =>
    performRoomAction(activeRoomId, 'swap-response', { accepted: false });
  const handleCancelSwap = () =>
    performRoomAction(activeRoomId, 'swap-cancel');

  const activeRoomData = rooms.find(r => r.id === activeRoomId);

  if (connectionState !== 'connected') {
    return (
      <>
        <main className="h-dvh flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
          <h1 className="text-2xl font-black">{connectionState === 'connecting' ? 'Đang kết nối Discord...' : 'Không thể kết nối Discord'}</h1>
          {connectionError && <p className="max-w-lg text-sm text-rose-300">{connectionError}</p>}
        </main>
        {showAuthTimeline && (
          <DiscordAuthTimelineModal
            steps={authSteps}
            connectionState={connectionState}
            error={connectionError}
            onClose={() => setShowAuthTimeline(false)}
            onRetry={retryDiscordAuth}
          />
        )}
      </>
    );
  }

  return (
    <div className="isolate h-dvh min-h-0 w-full font-sans text-gray-100 overflow-hidden flex flex-col selection:bg-indigo-500 selection:text-white" onClick={handleGlobalInteraction}>
      <CanvasBackground />
      
      {/* Header */}
      <header className="flex justify-between items-center p-2 sm:p-3 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 
              className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight cursor-pointer hover:text-yellow-200 transition-colors"
              onClick={() => { if(currentView !== 'games') setCurrentView('games'); }}
            >
              GAMES <span className="text-yellow-300">MOSA</span>
            </h1>
            <button
              onClick={() => setShowAuthTimeline(true)}
              className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest flex items-center gap-1"
              title="Xem các bước xác thực Discord"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              {connectionState === 'connected' ? 'Discord Activity Live' : connectionState === 'connecting' ? 'Đang kết nối...' : 'Chưa kết nối'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <DiscordUserWidget user={userProfile} isConnected={connectionState === 'connected'} onClickProfile={() => setShowProfile(true)} />
          <button
            onClick={(event) => {
              event.stopPropagation();
              toggleMute();
            }}
            onMouseEnter={() => audio.playHover()}
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 text-yellow-400 flex items-center justify-center border-2 border-indigo-500/50 hover:border-yellow-400 shadow-[0_4px_0_#1e1b4b,0_6px_15px_rgba(0,0,0,0.4)] transition-all duration-100 ease-in-out active:translate-y-[2px] active:shadow-[0_1px_0_#1e1b4b] hover:bg-slate-700"
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col xl:flex-row w-full max-w-[1500px] mx-auto px-2 sm:px-4 py-1 gap-2 sm:gap-3 overflow-hidden min-h-0">
        
        {currentView === 'games' ? (
          <section className="flex-1 flex flex-col justify-center min-w-0 animate-fade-in">
            <h2 className="text-sm sm:text-lg font-extrabold text-indigo-100 mb-3 bg-slate-900/60 border border-indigo-500/30 py-1.5 px-4 rounded-full shadow-md backdrop-blur-md self-start flex items-center gap-2">
              <span>🔥</span> Chọn Game Để Tạo Phòng
            </h2>
            <div
              className="flex gap-5 overflow-x-auto overscroll-x-contain px-16 py-16 snap-x snap-proximity hide-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x' }}
            >
              {gamesData.map((game) => (
                <GameCard key={game.id} game={game} onClick={handleCreateRoom} />
              ))}
            </div>
          </section>
        ) : (
          <section className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
            {activeRoomData && (
              <XiangqiRoom 
                room={activeRoomData} 
                currentUser={userProfile}
                roomError={roomError}
                onLeave={handleLeaveRoom}
                onJoinSide={handleJoinSide}
                onReady={handleReady}
                onAddBot={handleAddBot}
                onAddTwoBots={handleAddTwoBots}
                onRemoveBot={handleRemoveBot}
                onMove={handleMove}
                onSurrender={handleSurrender}
                onRequestDraw={handleRequestDraw}
                onRespondDraw={handleRespondDraw}
                onRenameRoom={handleRenameRoom}
                onRequestSwap={handleRequestSwap}
                onAcceptSwap={handleAcceptSwap}
                onRejectSwap={handleRejectSwap}
                onCancelSwap={handleCancelSwap}
              />
            )}
          </section>
        )}

        {/* Sidebar: Danh Sách Phòng */}
        <aside className={`xl:w-[380px] w-full flex flex-col mb-2 xl:mb-0 transition-all ${currentView === 'room' ? 'hidden' : 'flex'}`}>
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-2xl p-4 sm:p-5 border-2 border-indigo-500/40 flex-1 flex flex-col h-full xl:max-h-[72vh]">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="text-lg font-black text-amber-400 flex items-center gap-2">
                <span>💬</span> Sảnh Chờ
              </h3>
            </div>
            <div className="overflow-y-auto pr-1 flex flex-col gap-2.5 flex-1 custom-scrollbar">
              {(roomLoadError || roomError) && (
                <>
                  {roomLoadError && <p role="alert" className="text-center text-rose-300 text-xs">{roomLoadError}</p>}
                  {roomError && <p role="alert" className="text-center text-rose-300 text-xs">{roomError}</p>}
                </>
              )}
              {rooms.length === 0 ? (
                <p className="text-center text-slate-500 mt-8 text-xs italic">Chưa có phòng nào được tạo.</p>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    onMouseEnter={() => audio.playHover()}
                    onClick={() => { audio.playClick(); handleJoinRoom(room.id); }}
                    className={`group flex justify-between items-center p-3 rounded-2xl cursor-pointer transition-all border 
                      ${activeRoomId === room.id ? 'bg-indigo-900/90 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-slate-800/80 hover:bg-indigo-950/80 border-slate-700 hover:border-indigo-500'}`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <h4 className={`font-bold text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis transition-colors ${activeRoomId === room.id ? 'text-white' : 'text-gray-100 group-hover:text-amber-300'}`}>
                        {room.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-indigo-300/70 whitespace-nowrap overflow-hidden text-ellipsis">
                          {room.game}
                        </span>
                        {room.status === 'playing' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                      </div>
                    </div>
                    <div className="w-14 shrink-0 text-right flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${room.color}`}>
                        {room.slots}
                      </span>
                      {room.type === 'xiangqi' && room.observers?.length > 0 && (
                        <span className="text-[10px] text-gray-500">👁️ {room.observers.length}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Modals */}
      {showProfile && <ProfileModal user={userProfile} onClose={() => setShowProfile(false)} />}
      {showAuthTimeline && (
        <DiscordAuthTimelineModal
          steps={authSteps}
          connectionState={connectionState}
          error={connectionError}
          onClose={() => setShowAuthTimeline(false)}
          onRetry={retryDiscordAuth}
        />
      )}
      
      {/* Dynamic Custom CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #4f46e5; border-radius: 20px; }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes checkPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(244, 63, 94, 0); }
          50% { box-shadow: 0 0 22px rgba(244, 63, 94, 0.9); }
        }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-check-pulse { animation: checkPulse 0.8s ease-in-out infinite; }
      `}} />
    </div>
  );
}