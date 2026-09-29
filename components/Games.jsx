'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
let discordActivityConnection;

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

function connectDiscordActivity() {
  if (!discordActivityConnection) {
    discordActivityConnection = (async () => {
      if (!DISCORD_CLIENT_ID) {
        throw new Error('Thiếu NEXT_PUBLIC_DISCORD_CLIENT_ID trong cấu hình.');
      }

      const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
      await withTimeout(discordSdk.ready(), 'khởi tạo Activity');
      const { code } = await withTimeout(discordSdk.commands.authorize({
        client_id: DISCORD_CLIENT_ID,
        response_type: 'code',
        state: '',
        prompt: 'none',
        scope: ['identify']
      }), 'ủy quyền Discord');

      const response = await withTimeout(fetch('/api/discord-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      }), 'xác thực hồ sơ');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Không thể xác thực tài khoản Discord.');
      }

      await withTimeout(discordSdk.commands.authenticate({ access_token: result.access_token }), 'xác thực Activity');
      const user = result.user;
      if (!user?.id || !user?.username) {
        throw new Error('Discord không trả về hồ sơ người dùng hợp lệ.');
      }

      return {
        id: user.id,
        name: user.username,
        handle: `@${user.username}`,
        avatarUrl: user.avatar
      };
    })().catch((error) => {
      discordActivityConnection = undefined;
      throw error;
    });
  }
  return discordActivityConnection;
}

// Hệ thống giả lập âm thanh (Synthesizer) không cần file ngoài, dùng Web Audio API
const createAudioEngine = () => {
  let ctx = null;
  let isMuted = true;
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
  const startBGM = () => {
    if (bgmInterval) return;
    let step = 0;
    const notes = [329.63, 392.00, 440.00, 523.25, 659.25, 523.25, 440.00, 392.00]; 
    const playNote = () => {
      if (ctx && !isMuted) {
        const time = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = notes[step % notes.length];
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.02, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.3);
      }
      step++;
      bgmInterval = setTimeout(playNote, 250);
    };
    playNote();
  };
  const setMuted = (mutedStatus) => {
    isMuted = mutedStatus;
    if (!mutedStatus && ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  };
  return { init, playHover, playClick, startBGM, setMuted };
};

const audio = createAudioEngine();

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

const UnoCardIcon = () => (
  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-red-500 to-yellow-500 border-4 border-yellow-200 shadow-[inset_0_3px_6px_rgba(255,255,255,0.4),inset_0_-5px_10px_rgba(0,0,0,0.6),0_8px_16px_rgba(0,0,0,0.3)] flex items-center justify-center relative my-1 overflow-hidden">
    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none"></div>
    <svg viewBox="0 0 100 100" className="w-16 h-16 filter drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)] z-10">
      <defs>
        <linearGradient id="unoRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <linearGradient id="unoBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="unoGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#14532D" />
        </linearGradient>
        <linearGradient id="unoYellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#854D0E" />
        </linearGradient>
        <linearGradient id="unoBlack" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
        <linearGradient id="unoHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform="translate(24, 52) rotate(-22) translate(-24, -52)">
        <rect x="8" y="24" width="32" height="52" rx="4" fill="url(#unoBlue)" stroke="#FFFFFF" strokeWidth="1.5" />
        <ellipse cx="24" cy="50" rx="10" ry="16" fill="#FFFFFF" transform="rotate(-25 24 50)" />
        <text x="24" y="55" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="900" fontFamily="sans-serif">+2</text>
      </g>
      <g transform="translate(76, 52) rotate(22) translate(-76, -52)">
        <rect x="60" y="24" width="32" height="52" rx="4" fill="url(#unoGreen)" stroke="#FFFFFF" strokeWidth="1.5" />
        <ellipse cx="76" cy="50" rx="10" ry="16" fill="#FFFFFF" transform="rotate(25 76 50)" />
        <text x="76" y="55" textAnchor="middle" fill="#22C55E" fontSize="14" fontWeight="900" fontFamily="sans-serif">7</text>
      </g>
      <g transform="translate(50, 48)">
        <rect x="-18" y="-30" width="36" height="58" rx="5" fill="url(#unoBlack)" stroke="#FFFFFF" strokeWidth="2" />
        <g transform="rotate(-28)">
          <ellipse cx="0" cy="0" rx="12" ry="19" fill="#FFFFFF" />
          <path d="M 0 0 L -10 -14 A 12 19 0 0 1 0 -19 Z" fill="url(#unoRed)" />
          <path d="M 0 0 L 0 -19 A 12 19 0 0 1 10 -14 Z" fill="url(#unoBlue)" />
          <path d="M 0 0 L 10 14 A 12 19 0 0 1 0 19 Z" fill="url(#unoYellow)" />
          <path d="M 0 0 L 0 19 A 12 19 0 0 1 -10 14 Z" fill="url(#unoGreen)" />
        </g>
        <text x="0" y="5" textAnchor="middle" fill="#FFFFFF" fontSize="15" fontWeight="900" fontFamily="sans-serif" stroke="#000000" strokeWidth="0.8">
          +4
        </text>
        <text x="-13" y="-19" fill="#FACC15" fontSize="8" fontWeight="bold">+4</text>
        <text x="13" y="23" fill="#FACC15" fontSize="8" fontWeight="bold" transform="rotate(180 13 23)">+4</text>
        <path d="M -16 -28 L 16 -28 L 16 -10 Z" fill="url(#unoHighlight)" opacity="0.4" />
      </g>
    </svg>
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
      className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border-2 border-indigo-500/50 hover:border-indigo-400 p-2 pr-4 rounded-full cursor-pointer shadow-[0_4px_15px_rgba(88,101,242,0.3)] hover:shadow-[0_6px_20px_rgba(88,101,242,0.5)] transition-all duration-200 group"
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-inner overflow-hidden group-hover:scale-105 transition-transform">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => { e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
          />
        </div>
        <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${isConnected ? 'bg-emerald-500' : 'bg-slate-500'} border-2 border-slate-900 rounded-full shadow-sm`}></span>
      </div>
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-white text-sm tracking-wide group-hover:text-indigo-300 transition-colors">
            {user.name}
          </span>
          <span className="bg-indigo-600/80 text-indigo-100 text-[10px] font-bold px-1.5 py-0.2 rounded-md border border-indigo-400/40">PLAYER</span>
        </div>
        <span className="text-xs text-gray-400">Discord</span>
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
        
        {/* Avatar Section */}
        <div className="relative z-10 mb-2">
          <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-indigo-500 to-purple-500 shadow-xl overflow-hidden">
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full bg-slate-800" />
          </div>
          <span className="absolute bottom-1 right-1 bg-emerald-500 border-2 border-slate-900 w-4 h-4 rounded-full"></span>
        </div>

        {/* User Info */}
        <h3 className="text-xl font-black text-white text-center">{user.name}</h3>
        <p className="text-xs text-indigo-300 font-medium mb-4">{user.handle || '@player'}</p>

        <div className="w-full mb-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 p-3 text-center">
          <span className="text-xs text-gray-400 block font-bold mb-1">Discord ID</span>
          <span className="text-sm font-mono text-indigo-200 break-all">{user.id}</span>
        </div>

        {/* Close Button */}
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

const XiangqiBoard = ({ isFlipped = false, isPlaying = false, isUserRed = false, isUserBlack = false }) => {
  // Initial Xiangqi pieces configuration
  const initialPieces = [
    { x: 0, y: 0, type: 'R', isRed: false },
    { x: 1, y: 0, type: 'H', isRed: false },
    { x: 2, y: 0, type: 'E', isRed: false },
    { x: 3, y: 0, type: 'A', isRed: false },
    { x: 4, y: 0, type: 'K', isRed: false },
    { x: 5, y: 0, type: 'A', isRed: false },
    { x: 6, y: 0, type: 'E', isRed: false },
    { x: 7, y: 0, type: 'H', isRed: false },
    { x: 8, y: 0, type: 'R', isRed: false },
    { x: 1, y: 2, type: 'C', isRed: false },
    { x: 7, y: 2, type: 'C', isRed: false },
    { x: 0, y: 3, type: 'P', isRed: false },
    { x: 2, y: 3, type: 'P', isRed: false },
    { x: 4, y: 3, type: 'P', isRed: false },
    { x: 6, y: 3, type: 'P', isRed: false },
    { x: 8, y: 3, type: 'P', isRed: false },

    { x: 0, y: 6, type: 'P', isRed: true },
    { x: 2, y: 6, type: 'P', isRed: true },
    { x: 4, y: 6, type: 'P', isRed: true },
    { x: 6, y: 6, type: 'P', isRed: true },
    { x: 8, y: 6, type: 'P', isRed: true },
    { x: 1, y: 7, type: 'C', isRed: true },
    { x: 7, y: 7, type: 'C', isRed: true },
    { x: 0, y: 9, type: 'R', isRed: true },
    { x: 1, y: 9, type: 'H', isRed: true },
    { x: 2, y: 9, type: 'E', isRed: true },
    { x: 3, y: 9, type: 'A', isRed: true },
    { x: 4, y: 9, type: 'K', isRed: true },
    { x: 5, y: 9, type: 'A', isRed: true },
    { x: 6, y: 9, type: 'E', isRed: true },
    { x: 7, y: 9, type: 'H', isRed: true },
    { x: 8, y: 9, type: 'R', isRed: true },
  ];

  const renderPiece = (x, y, type, isRed) => {
    const labels = {
      'K': isRed ? '帥' : '將', 'A': isRed ? '仕' : '士', 'E': isRed ? '相' : '象',
      'H': isRed ? '傌' : '馬', 'R': isRed ? '俥' : '車', 'C': isRed ? '炮' : '砲', 'P': isRed ? '兵' : '卒'
    };
    
    // Kiểm tra quyền tương tác: Chỉ khi đang thi đấu VÀ quân cờ thuộc phe của người chơi hiện tại
    const canInteract = isPlaying && ((isUserRed && isRed) || (isUserBlack && !isRed));

    return (
      <div 
        key={`${x}-${y}`} 
        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 transition-all duration-300"
        style={{ left: `${(x / 8) * 100}%`, top: `${(y / 9) * 100}%` }}
      >
        <div className={`w-[clamp(22px,3.5vw,42px)] h-[clamp(22px,3.5vw,42px)] rounded-full border-2 
                        flex items-center justify-center font-serif font-black text-[clamp(12px,2vw,20px)] shadow-lg
                        select-none transition-transform duration-200 ${isFlipped ? 'rotate-180' : ''}
                        ${canInteract 
                          ? 'cursor-pointer hover:scale-110 hover:shadow-xl' 
                          : 'cursor-default pointer-events-none'}
                        ${isRed 
                          ? 'bg-amber-50 border-red-700 text-red-600 shadow-[0_4px_8px_rgba(220,38,38,0.3)]' 
                          : 'bg-slate-900 border-slate-300 text-slate-100 shadow-[0_4px_8px_rgba(0,0,0,0.5)]'}`}
        >
          {labels[type]}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative w-[clamp(280px,85vw,440px)] aspect-[8/9] bg-amber-100/90 border-4 border-amber-900 rounded-xl p-4 md:p-6 shadow-[inset_0_0_20px_rgba(120,53,15,0.4),0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`}>
      {/* Board Grid Lines */}
      <div className="relative w-full h-full border-2 border-amber-950">
        {/* Horizontal Lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={`h-${i}`} className="absolute w-full h-[1px] bg-amber-950/80" style={{ top: `${(i / 9) * 100}%` }} />
        ))}
        {/* Vertical Lines */}
        {Array.from({ length: 9 }).map((_, i) => (
          <React.Fragment key={`v-${i}`}>
            <div className="absolute w-[1px] bg-amber-950/80" style={{ left: `${(i / 8) * 100}%`, top: '0%', height: `${(4 / 9) * 100}%` }} />
            <div className="absolute w-[1px] bg-amber-950/80" style={{ left: `${(i / 8) * 100}%`, top: `${(5 / 9) * 100}%`, height: `${(4 / 9) * 100}%` }} />
            {(i === 0 || i === 8) && (
              <div className="absolute w-[1px] bg-amber-950/80" style={{ left: `${(i / 8) * 100}%`, top: `${(4 / 9) * 100}%`, height: `${(1 / 9) * 100}%` }} />
            )}
          </React.Fragment>
        ))}

        {/* Palace Diagonal Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="37.5" y1="0" x2="62.5" y2="22.22" stroke="#451a03" strokeWidth="0.5" />
          <line x1="62.5" y1="0" x2="37.5" y2="22.22" stroke="#451a03" strokeWidth="0.5" />
          <line x1="37.5" y1="77.78" x2="62.5" y2="100" stroke="#451a03" strokeWidth="0.5" />
          <line x1="62.5" y1="77.78" x2="37.5" y2="100" stroke="#451a03" strokeWidth="0.5" />
        </svg>

        {/* River Label */}
        <div className="absolute top-[44.44%] left-0 right-0 h-[11.11%] flex justify-around items-center px-6 pointer-events-none text-amber-950/70 font-serif font-black text-sm md:text-base tracking-widest">
          <span className={isFlipped ? 'rotate-180' : ''}>楚 河</span>
          <span className={isFlipped ? 'rotate-180' : ''}>漢 界</span>
        </div>

        {/* Render Pieces */}
        {initialPieces.map((p) => renderPiece(p.x, p.y, p.type, p.isRed))}
      </div>
    </div>
  );
};

const XiangqiRoom = ({ room, currentUser, onLeave, onJoinSide, onStartGame, onRequestSwap, onAcceptSwap, onRejectSwap, onCancelSwap }) => {
  const isPlaying = room.status === 'playing';
  // Nếu người dùng đang đóng vai Phe Đen -> Đảo ngược góc nhìn bàn cờ để Đen ở dưới
  const isUserBlack = room.blackPlayer?.id === currentUser.id;
  const isUserRed = room.redPlayer?.id === currentUser.id;
  const isFlipped = isUserBlack;

  // Xác định vị trí hiển thị ô người chơi (Phía trên vs Phía dưới)
  const topSide = isFlipped ? 'red' : 'black';
  const topPlayer = isFlipped ? room.redPlayer : room.blackPlayer;
  const bottomSide = isFlipped ? 'black' : 'red';
  const bottomPlayer = isFlipped ? room.blackPlayer : room.redPlayer;
  
  const swapRequest = room.swapRequest;
  const isTargetOfSwap = swapRequest && swapRequest.targetId === currentUser.id;
  const isRequesterOfSwap = swapRequest && swapRequest.requesterId === currentUser.id;

  const renderPlayerSlot = (side, player) => {
    const isRed = side === 'red';
    const isCurrentUser = player?.id === currentUser.id;
    const isOpponent = player && !isCurrentUser && (isUserRed || isUserBlack);

    if (player) {
      return (
        <div 
          onClick={() => {
            if (isOpponent) {
              audio.playClick();
              onRequestSwap(player);
            }
          }}
          className={`flex items-center gap-3 bg-slate-950/70 border px-4 py-2 rounded-2xl animate-fade-in group relative min-w-[200px] transition-all
            ${isOpponent 
              ? 'border-amber-500/50 hover:border-amber-400 hover:bg-slate-900/90 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
              : 'border-slate-700/60'}`}
          title={isOpponent ? "Nhấn để gửi yêu cầu Đổi Phe" : ""}
        >
          <div className={`w-12 h-12 rounded-full p-0.5 shadow-lg shrink-0 relative ${isRed ? 'bg-gradient-to-tr from-red-600 to-orange-400' : 'bg-gradient-to-tr from-slate-700 to-slate-400'}`}>
            <img src={player.avatarUrl} alt={player.name} className="w-full h-full rounded-full object-cover border border-slate-900" />
            {isOpponent && (
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border border-slate-900 shadow">
                🔄
              </span>
            )}
          </div>
          <div className="flex flex-col text-left overflow-hidden">
            <span className={`font-bold text-xs md:text-sm truncate ${isRed ? 'text-red-300' : 'text-slate-200'}`}>
              {player.name} {isCurrentUser && "(Bạn)"}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isRed ? 'text-red-400/80' : 'text-slate-400'}`}>
              {isRed ? 'Phe Đỏ' : 'Phe Đen'}
            </span>
          </div>
          
          {/* Nút rời ghế nếu chưa bắt đầu */}
          {isCurrentUser && !isPlaying && (
            <button 
              onClick={(e) => { e.stopPropagation(); audio.playClick(); onJoinSide(null); }}
              className="ml-auto bg-red-600 hover:bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all shrink-0"
              title="Rời vị trí"
            >✕</button>
          )}

          {/* Hover hint khi nhấn vào đối thủ */}
          {isOpponent && (
            <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-end pr-3 pointer-events-none">
              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-md">
                🔄 Đổi Phe
              </span>
            </div>
          )}
        </div>
      );
    }
    
    // Slot trống
    return (
      <button 
        onClick={() => { audio.playClick(); onJoinSide(side); }}
        disabled={isPlaying}
        className={`flex items-center gap-2 px-5 py-2 rounded-2xl border-2 border-dashed transition-all min-w-[180px] justify-center
          ${isPlaying ? 'opacity-40 cursor-not-allowed border-gray-600 text-gray-600 bg-slate-800/30' : 
          isRed ? 'border-red-500/50 text-red-400 hover:bg-red-950/40 hover:border-red-400 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.15)]' : 
                  'border-slate-400/50 text-slate-300 hover:bg-slate-800/40 hover:border-slate-300 cursor-pointer shadow-[0_0_12px_rgba(148,163,184,0.15)]'}`}
      >
        <span className="text-xl font-bold">+</span>
        <span className={`text-xs font-bold ${isRed ? 'text-red-400' : 'text-slate-300'}`}>
          Ngồi Phe {isRed ? 'Đỏ' : 'Đen'}
        </span>
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] border-2 border-rose-500/30 overflow-hidden shadow-2xl relative animate-fade-in h-full">
      {/* Thông báo / Hộp thoại Yêu Cầu Đổi Phe */}
      {isTargetOfSwap && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-amber-400 p-4 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.5)] flex flex-col items-center gap-2.5 animate-fade-in backdrop-blur-md max-w-xs w-full">
          <p className="text-xs font-bold text-amber-200 text-center">
            🔄 <span className="text-white font-black">{swapRequest.requesterName}</span> muốn yêu cầu <span className="text-amber-400 uppercase font-black">Đổi Phe</span> với bạn!
          </p>
          <div className="flex gap-3 w-full justify-center">
            <button 
              onClick={() => { audio.playClick(); onAcceptSwap(); }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              ✓ Đồng Ý
            </button>
            <button 
              onClick={() => { audio.playClick(); onRejectSwap(); }}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              ✕ Từ Chối
            </button>
          </div>
        </div>
      )}

      {isRequesterOfSwap && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border border-amber-400/80 p-3 px-5 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <span className="animate-spin text-amber-400 text-sm">⏳</span>
          <span className="text-xs font-bold text-amber-200">
            Đã gửi yêu cầu đổi phe... Đang chờ đối phương
          </span>
          <button 
            onClick={() => { audio.playClick(); onCancelSwap(); }}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-gray-300 px-2 py-0.5 rounded-lg border border-slate-600 font-bold"
          >
            Hủy
          </button>
        </div>
      )}

      {/* Header Phòng */}
      <div className="bg-slate-950/60 p-4 px-6 border-b border-slate-700/50 flex justify-between items-center z-10 shrink-0">
        <div>
          <h2 className="text-xl font-black text-rose-300 flex items-center gap-2">
            <span className="text-2xl">♟️</span> {room.name}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-gray-400">
              Trạng thái: {isPlaying ? <span className="text-emerald-400 animate-pulse font-bold">Đang thi đấu</span> : <span className="text-amber-400 font-bold">Đang chờ...</span>}
            </p>
            <span className="text-slate-600">•</span>
            <p className="text-xs text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 px-2.5 py-0.5 rounded-full font-semibold">
              Góc nhìn: {isUserBlack ? 'Phe Đen (Cờ bạn ở dưới)' : isUserRed ? 'Phe Đỏ (Cờ bạn ở dưới)' : 'Người xem (Mặc định Đỏ ở dưới)'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => { audio.playClick(); onLeave(); }}
          className="bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-gray-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-slate-700"
        >
          {isPlaying && (isUserRed || isUserBlack) ? 'Đầu Hàng & Rời' : 'Rời Phòng'}
        </button>
      </div>

      {/* Main Content (Vertical Board & Top/Bottom Player Slots) */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-4 gap-3 z-10 overflow-y-auto w-full max-w-4xl mx-auto">
        {/* Top Player Slot (Đối thủ / Phe phía trên) */}
        <div className="shrink-0 flex items-center justify-center">
          {renderPlayerSlot(topSide, topPlayer)}
        </div>
        
        {/* Board Container */}
        <div className="relative my-1 flex items-center justify-center shrink-0 w-full">
          <XiangqiBoard 
            isFlipped={isFlipped} 
            isPlaying={isPlaying}
            isUserRed={isUserRed}
            isUserBlack={isUserBlack}
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none rounded-2xl backdrop-blur-[1px]">
              <div className="bg-rose-900/90 text-white px-5 py-2.5 rounded-xl font-black text-lg md:text-xl border-2 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.5)] transform -rotate-6 backdrop-blur-sm">
                TRẬN ĐẤU ĐANG DIỄN RA
              </div>
            </div>
          )}
        </div>

        {/* Bottom Player Slot (Bạn / Phe phía dưới) */}
        <div className="shrink-0 flex items-center justify-center">
          {renderPlayerSlot(bottomSide, bottomPlayer)}
        </div>
      </div>

      {/* Bottom Controls & Observers */}
      <div className="bg-slate-950/80 p-4 border-t border-slate-700/50 z-10 shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            👁️ Đang xem ({room.observers.length})
          </h3>
          
          {!isPlaying && (
            <button 
              onClick={() => { audio.playClick(); onStartGame(); }}
              disabled={!room.redPlayer || !room.blackPlayer}
              className={`px-6 py-2 rounded-xl font-bold transition-all shadow-[0_3px_0_rgba(0,0,0,0.3)] 
                ${(!room.redPlayer || !room.blackPlayer) 
                  ? 'bg-slate-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white active:translate-y-1 active:shadow-none'}`}
            >
              Bắt Đầu Trận Đấu
            </button>
          )}
        </div>
        
        {/* Observers List */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 min-h-[48px]">
          {room.observers.length === 0 ? (
            <span className="text-xs text-gray-500 italic">Chưa có người xem nào...</span>
          ) : (
            room.observers.map((obs, idx) => (
              <div key={idx} className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 shrink-0 cursor-default" title={obs.name}>
                <img src={obs.avatarUrl} alt={obs.name} className="w-5 h-5 rounded-full" />
                <span className="text-xs font-semibold text-gray-300 max-w-[100px] truncate">{obs.name}</span>
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
      className={`group relative shrink-0 w-64 h-80 rounded-[2.5rem] border-[6px] border-white/90 cursor-pointer snap-center
                  flex flex-col items-center justify-center p-6 text-white text-center
                  transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  hover:-translate-y-2 hover:scale-[1.03] hover:shadow-[0_20px_40px_rgba(0,0,0,0.5),0_0_25px_rgba(255,255,255,0.6)]
                  shadow-[0_10px_20px_rgba(0,0,0,0.3)] overflow-hidden ${game.colorBg}`}
    >
      <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-white/20 skew-x-[-30deg] transition-all duration-500 group-hover:left-[200%]"></div>
      <div className="h-24 flex items-center justify-center text-[5rem] drop-shadow-xl mb-4 transform transition-transform group-hover:scale-110 group-hover:rotate-6">
        {game.icon}
      </div>
      <h3 className="text-3xl font-black tracking-wide drop-shadow-md mb-2">{game.title}</h3>
      <p className="font-medium text-white/90 drop-shadow-sm">{game.desc}</p>
      <div className="mt-auto bg-white/30 px-6 py-2 rounded-full font-bold uppercase tracking-widest text-sm shadow-inner backdrop-blur-sm">
        Tạo Phòng
      </div>
    </div>
  );
};

const gamesData = [
  { id: 1, title: 'Cờ Tướng', desc: 'Đấu trí đỉnh cao', colorBg: 'bg-gradient-to-b from-red-500 to-red-800', icon: <XiangqiPieceIcon />, type: 'xiangqi' },
];

export default function Games() {
  const [isMuted, setIsMuted] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');
  const [connectionError, setConnectionError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  
  // Navigation State
  const [currentView, setCurrentView] = useState('games'); // 'games' | 'room'
  const [activeRoomId, setActiveRoomId] = useState(null);
  
  // Dynamic Rooms State
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
          throw new Error(result.error || 'Không thể tải danh sách phòng.');
        }
        if (!Array.isArray(result)) {
          throw new Error('Dữ liệu danh sách phòng không hợp lệ.');
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
    const intervalId = window.setInterval(refreshRooms, 2000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    connectDiscordActivity()
      .then((profile) => {
        if (isActive) {
          setUserProfile(profile);
          setConnectionState('connected');
          setConnectionError('');
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

  const toggleMute = () => {
    audio.playClick();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audio.setMuted(newMuted);
    if (!newMuted && !hasStarted) {
      audio.init();
      audio.startBGM();
      setHasStarted(true);
    }
  };

  const handleGlobalInteraction = () => {
    if (!hasStarted) {
      audio.init();
      setHasStarted(true);
    }
  };

  const updateRoom = (roomId, update) => {
    const currentRoom = roomsRef.current.find(room => room.id === roomId);
    if (!currentRoom) {
      setRoomError('Không tìm thấy phòng cần cập nhật.');
      return;
    }

    const updatedRoom = update(currentRoom);
    const updatedRooms = roomsRef.current.map(room => room.id === roomId ? updatedRoom : room);
    roomsRef.current = updatedRooms;
    setRooms(updatedRooms);

    fetch(`/api/games/rooms/${roomId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRoom)
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Không thể cập nhật phòng.');
        }
        setRoomError('');
      })
      .catch(error => {
        setRoomError(error instanceof Error ? error.message : 'Không thể cập nhật phòng.');
      });
  };

  const handleCreateRoom = async (gameData) => {
    if (gameData.type === 'xiangqi') {
      const newRoom = {
        id: Date.now(),
        name: `Phòng Cờ Tướng của ${userProfile.name}`,
        game: gameData.title,
        slots: "0/2",
        color: "bg-rose-950 text-rose-300 border-rose-700/50",
        type: 'xiangqi',
        status: 'waiting',
        redPlayer: null,
        blackPlayer: null,
        observers: [userProfile] // Creator joins as observer initially
      };
      try {
        const response = await fetch('/api/games/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRoom)
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Không thể tạo phòng.');
        }
        const updatedRooms = [result, ...roomsRef.current.filter(room => room.id !== result.id)];
        roomsRef.current = updatedRooms;
        setRooms(updatedRooms);
        setRoomError('');
        setActiveRoomId(result.id);
        setCurrentView('room');
      } catch (error) {
        setRoomError(error instanceof Error ? error.message : 'Không thể tạo phòng.');
      }
    }
  };

  const handleJoinRoom = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    
    if (room.type === 'xiangqi') {
      // Logic add user to observers if not already anywhere in room
      updateRoom(roomId, currentRoom => {
        const isRed = currentRoom.redPlayer?.id === userProfile.id;
        const isBlack = currentRoom.blackPlayer?.id === userProfile.id;
        const isObs = currentRoom.observers.some(observer => observer.id === userProfile.id);

        if (!isRed && !isBlack && !isObs) {
          return { ...currentRoom, observers: [...currentRoom.observers, userProfile] };
        }
        return currentRoom;
      });
      setActiveRoomId(roomId);
      setCurrentView('room');
    }
  };

  const handleLeaveRoom = () => {
    // Remove user from current room
    updateRoom(activeRoomId, room => ({
      ...room,
      redPlayer: room.redPlayer?.id === userProfile.id ? null : room.redPlayer,
      blackPlayer: room.blackPlayer?.id === userProfile.id ? null : room.blackPlayer,
      observers: room.observers.filter(observer => observer.id !== userProfile.id),
      swapRequest: null,
      slots: `${(room.redPlayer && room.redPlayer.id !== userProfile.id ? 1 : 0) + (room.blackPlayer && room.blackPlayer.id !== userProfile.id ? 1 : 0)}/2`
    }));
    setActiveRoomId(null);
    setCurrentView('games');
  };

  const handleJoinSide = (side) => {
    updateRoom(activeRoomId, room => {
      let newRed = room.redPlayer;
      let newBlack = room.blackPlayer;
      let newObservers = room.observers.filter(observer => observer.id !== userProfile.id);

      if (newRed?.id === userProfile.id) newRed = null;
      if (newBlack?.id === userProfile.id) newBlack = null;

      if (side === 'red') newRed = userProfile;
      else if (side === 'black') newBlack = userProfile;
      else newObservers = [...newObservers, userProfile];

      return {
        ...room,
        redPlayer: newRed,
        blackPlayer: newBlack,
        observers: newObservers,
        swapRequest: null,
        slots: `${(newRed ? 1 : 0) + (newBlack ? 1 : 0)}/2`
      };
    });
  };

  const handleRequestSwap = (targetUser) => {
    updateRoom(activeRoomId, room => {
      if (room.swapRequest) return room;
      return {
        ...room,
        swapRequest: {
          requesterId: userProfile.id,
          requesterName: userProfile.name,
          targetId: targetUser.id
        }
      };
    });
  };

  const handleAcceptSwap = () => {
    updateRoom(activeRoomId, room => room.swapRequest ? ({
      ...room,
      redPlayer: room.blackPlayer,
      blackPlayer: room.redPlayer,
      swapRequest: null
    }) : room);
  };

  const handleRejectSwap = () => {
    updateRoom(activeRoomId, room => ({ ...room, swapRequest: null }));
  };

  const handleCancelSwap = () => {
    updateRoom(activeRoomId, room => ({ ...room, swapRequest: null }));
  };

  const handleStartGame = () => {
    updateRoom(activeRoomId, room => ({ ...room, status: 'playing', swapRequest: null }));
  };

  const activeRoomData = rooms.find(r => r.id === activeRoomId);

  if (connectionState !== 'connected') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
        <h1 className="text-2xl font-black">{connectionState === 'connecting' ? 'Đang kết nối Discord...' : 'Không thể kết nối Discord'}</h1>
        {connectionError && <p className="max-w-lg text-sm text-rose-300">{connectionError}</p>}
        {connectionState === 'error' && (
          <button onClick={() => setRetryCount(count => count + 1)} className="rounded-lg bg-indigo-600 px-4 py-2 font-bold hover:bg-indigo-500">
            Thử kết nối lại
          </button>
        )}
      </main>
    );
  }

  return (
    <div className="isolate min-h-screen font-sans text-gray-100 overflow-hidden flex flex-col justify-between selection:bg-indigo-500 selection:text-white" onClick={handleGlobalInteraction}>
      <CanvasBackground />
      
      {/* Header */}
      <header className="flex justify-between items-center p-4 md:p-6 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 
              className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight cursor-pointer hover:text-yellow-200 transition-colors"
              onClick={() => { if(currentView !== 'games') setCurrentView('games'); }}
            >
              GAMES <span className="text-yellow-300">MOSA</span>
            </h1>
            <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              {connectionState === 'connected' ? 'Discord Activity Live' : connectionState === 'connecting' ? 'Đang kết nối...' : 'Chưa kết nối'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DiscordUserWidget user={userProfile} isConnected={connectionState === 'connected'} onClickProfile={() => setShowProfile(true)} />
          <button
            onClick={toggleMute}
            onMouseEnter={() => audio.playHover()}
            className="relative w-12 h-12 rounded-full bg-slate-800 text-yellow-400 flex items-center justify-center border-2 border-indigo-500/50 hover:border-yellow-400 shadow-[0_4px_0_#1e1b4b,0_6px_15px_rgba(0,0,0,0.4)] transition-all duration-100 ease-in-out active:translate-y-[2px] active:shadow-[0_1px_0_#1e1b4b] hover:bg-slate-700"
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col xl:flex-row w-full max-w-[1500px] mx-auto px-4 md:px-8 py-2 gap-6 overflow-hidden min-h-0">
        
        {/* Dynamic View Switcher */}
        {currentView === 'games' ? (
          <section className="flex-1 flex flex-col justify-center min-w-0 animate-fade-in">
            <h2 className="text-lg font-extrabold text-indigo-100 mb-4 bg-slate-900/60 border border-indigo-500/30 py-1.5 px-5 rounded-full shadow-md backdrop-blur-md self-start flex items-center gap-2">
              <span>🔥</span> Chọn Game Để Tạo Phòng
            </h2>
            <div
              className="flex gap-6 overflow-x-auto overscroll-x-contain px-2 py-8 snap-x snap-proximity hide-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x' }}
            >
              {gamesData.map((game) => (
                <GameCard key={game.id} game={game} onClick={handleCreateRoom} />
              ))}
            </div>
          </section>
        ) : (
          <section className="flex-1 flex flex-col min-w-0 pb-4 h-full">
            {activeRoomData && (
              <XiangqiRoom 
                room={activeRoomData} 
                currentUser={userProfile}
                onLeave={handleLeaveRoom}
                onJoinSide={handleJoinSide}
                onStartGame={handleStartGame}
                onRequestSwap={handleRequestSwap}
                onAcceptSwap={handleAcceptSwap}
                onRejectSwap={handleRejectSwap}
                onCancelSwap={handleCancelSwap}
              />
            )}
          </section>
        )}

        {/* Sidebar: Danh Sách Phòng (Luôn Hiển Thị) */}
        <aside className={`xl:w-[400px] w-full flex flex-col mb-4 xl:mb-0 transition-all ${currentView === 'room' ? 'hidden xl:flex' : 'flex'}`}>
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-2xl p-5 border-2 border-indigo-500/40 flex-1 flex flex-col h-full xl:max-h-[70vh]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-xl font-black text-amber-400 flex items-center gap-2">
                <span>💬</span> Sảnh Chờ
              </h3>
            </div>
            <div className="overflow-y-auto pr-1 flex flex-col gap-3 flex-1 custom-scrollbar">
              {(roomLoadError || roomError) && (
                <>
                  {roomLoadError && <p role="alert" className="text-center text-rose-300 text-sm">{roomLoadError}</p>}
                  {roomError && <p role="alert" className="text-center text-rose-300 text-sm">{roomError}</p>}
                </>
              )}
              {rooms.length === 0 ? (
                <p className="text-center text-slate-500 mt-10 text-sm italic">Chưa có phòng nào được tạo.</p>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    onMouseEnter={() => audio.playHover()}
                    onClick={() => { audio.playClick(); handleJoinRoom(room.id); }}
                    className={`group flex justify-between items-center p-3.5 rounded-2xl cursor-pointer transition-all border 
                      ${activeRoomId === room.id ? 'bg-indigo-900/90 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-slate-800/80 hover:bg-indigo-950/80 border-slate-700 hover:border-indigo-500'}`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <h4 className={`font-bold text-sm whitespace-nowrap overflow-hidden text-ellipsis transition-colors ${activeRoomId === room.id ? 'text-white' : 'text-gray-100 group-hover:text-amber-300'}`}>
                        {room.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-indigo-300/70 whitespace-nowrap overflow-hidden text-ellipsis">
                          {room.game}
                        </span>
                        {room.status === 'playing' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                      </div>
                    </div>
                    <div className="w-14 shrink-0 text-right flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${room.color}`}>
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
      
      {/* Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #4f46e5; border-radius: 20px; }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}