'use client';

import React, { useState, useEffect, useRef } from 'react';

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
      if (window.self === window.top) {
        throw new Error('Hãy mở Game Hub từ Discord Activities.');
      }
      if (!DISCORD_CLIENT_ID) {
        throw new Error('Thiếu cấu hình NEXT_PUBLIC_DISCORD_CLIENT_ID.');
      }
      const { DiscordSDK } = await withTimeout(
        import('@discord/embedded-app-sdk'),
        'tải SDK'
      );
      const discordSdk = new DiscordSDK(DISCORD_CLIENT_ID);
      await withTimeout(discordSdk.ready(), 'khởi tạo SDK');
      const { code } = await withTimeout(
        discordSdk.commands.authorize({
          client_id: DISCORD_CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify']
        }),
        'ủy quyền'
      );
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 15000);
      let response;
      try {
        response = await fetch('/api/discord-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          signal: controller.signal
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Máy chủ xác thực Discord không phản hồi.');
        }
        throw error;
      } finally {
        clearTimeout(fetchTimeout);
      }
      const authData = await withTimeout(response.json(), 'đọc phản hồi xác thực');
      if (!response.ok) {
        throw new Error(authData.error || 'Không thể xác thực với Discord.');
      }
      const { user } = await withTimeout(
        discordSdk.commands.authenticate({
          access_token: authData.access_token
        }),
        'xác thực người dùng'
      );
      const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
        : 'https://cdn.discordapp.com/embed/avatars/0.png';
      return {
        name: user.global_name || user.username,
        handle: `@${user.username}`,
        avatarUrl,
        coins: 0,
        level: 1,
        stats: { wins: 0, winRate: 0 }
      };
    })().catch((error) => {
      discordActivityConnection = null;
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
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let lastTime = 0;
    let particles = [];
    const initParticles = () => {
      particles = Array.from({ length: 40 }).map(() => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 20 + 10,
        speedY: Math.random() * 60 + 20,
        speedX: (Math.random() - 0.5) * 30,
        type: Math.random() > 0.5 ? 'circle' : 'rect',
        color: `hsla(${Math.random() * 60 + 15}, 90%, 65%, 0.4)`,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 3
      }));
    };
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    const render = (time) => {
      if (!lastTime) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y -= p.speedY * dt;
        p.x += p.speedX * dt;
        p.rotation += p.rotSpeed * dt;
        if (p.y < -50) {
          p.y = canvas.height + 50;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -50) p.x = canvas.width + 50;
        if (p.x > canvas.width + 50) p.x = -50;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(-p.size / 2, -p.size / 2, p.size, p.size, 4);
          ctx.fill();
        }
        ctx.restore();
      });
      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-[#1e1b4b] via-[#311b92] to-[#4a148c]"
    />
  );
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

const ChessKingIcon = () => (
  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-900 via-slate-800 to-indigo-950 border-4 border-indigo-300 shadow-[inset_0_3px_6px_rgba(255,255,255,0.4),inset_0_-5px_10px_rgba(0,0,0,0.6),0_8px_16px_rgba(0,0,0,0.3)] flex items-center justify-center relative my-1 overflow-hidden">
    <div className="absolute inset-0 opacity-20 grid grid-cols-4 grid-rows-4 pointer-events-none">
      <div className="bg-white"></div><div className="bg-transparent"></div><div className="bg-white"></div><div className="bg-transparent"></div>
      <div className="bg-transparent"></div><div className="bg-white"></div><div className="bg-transparent"></div><div className="bg-white"></div>
      <div className="bg-white"></div><div className="bg-transparent"></div><div className="bg-white"></div><div className="bg-transparent"></div>
      <div className="bg-transparent"></div><div className="bg-white"></div><div className="bg-transparent"></div><div className="bg-white"></div>
    </div>
    <svg viewBox="0 0 100 100" className="w-14 h-14 filter drop-shadow-[0_6px_8px_rgba(0,0,0,0.6)] z-10">
      <defs>
        <linearGradient id="kingGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#FACC15" />
          <stop offset="70%" stopColor="#CA8A04" />
          <stop offset="100%" stopColor="#713F12" />
        </linearGradient>
        <linearGradient id="kingHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M20,86 L80,86 C80,86 76,77 74,75 L26,75 C24,77 20,86 20,86 Z" fill="url(#kingGold)" stroke="#542D0C" strokeWidth="1.5" />
      <path d="M26,75 L74,75 C74,75 70,68 68,67 L32,67 C30,68 26,75 26,75 Z" fill="url(#kingGold)" stroke="#542D0C" strokeWidth="1.5" />
      <path d="M32,67 C36,55 35,46 32,38 C30,35 28,34 26,34 L26,29 C32,29 36,31 40,31 C44,31 48,31 50,31 C52,31 56,31 60,31 C64,31 68,29 74,29 L74,34 C72,34 70,35 68,38 C65,46 64,55 68,67 Z" fill="url(#kingGold)" stroke="#542D0C" strokeWidth="1.5" />
      <path d="M24,29 C24,25 32,24 50,24 C68,24 76,25 76,29 C76,31 68,32 50,32 C32,32 24,31 24,29 Z" fill="url(#kingGold)" stroke="#542D0C" strokeWidth="1.5" />
      <path d="M28,24 C28,16 38,15 42,20 C46,14 54,14 58,20 C62,15 72,16 72,24 Z" fill="url(#kingGold)" stroke="#542D0C" strokeWidth="1.5" />
      <circle cx="50" cy="14" r="3.5" fill="url(#kingGold)" stroke="#542D0C" strokeWidth="1.5" />
      <path d="M48,5 L52,5 L52,8 L55,8 L55,10.5 L52,10.5 L52,13.5 L48,13.5 L48,10.5 L45,10.5 L45,8 L48,8 Z" fill="url(#kingGold)" stroke="#542D0C" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M35,65 C38,55 37,47 35,40" stroke="url(#kingHighlight)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M30,73 L70,73" stroke="url(#kingHighlight)" strokeWidth="1.5" fill="none" opacity="0.6" />
      <circle cx="50" cy="20" r="2" fill="#FEF08A" />
      <circle cx="38" cy="21" r="1.5" fill="#FEF08A" />
      <circle cx="62" cy="21" r="1.5" fill="#FEF08A" />
    </svg>
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
      {/* Container Avatar có viền 3D & Chấm trạng thái Online */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-inner overflow-hidden group-hover:scale-105 transition-transform">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              // Fallback avatar nếu ảnh lỗi
              e.target.src = "https://placehold.co/100x100/5865F2/ffffff?text=DC";
            }}
          />
        </div>
        {/* Chấm xanh trạng thái Online chuẩn Discord */}
        <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${isConnected ? 'bg-emerald-500' : 'bg-slate-500'} border-2 border-slate-900 rounded-full shadow-sm`}></span>
      </div>
      {/* Thông tin Tên & Điểm/Hạng */}
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-white text-sm tracking-wide group-hover:text-indigo-300 transition-colors">
            {user.name}
          </span>
          <span className="bg-indigo-600/80 text-indigo-100 text-[10px] font-bold px-1.5 py-0.2 rounded-md border border-indigo-400/40">
            PLAYER
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
          <span>🪙 {user.coins.toLocaleString()}</span>
          <span className="text-gray-400">•</span>
          <span className="text-purple-300">Lv.{user.level}</span>
        </div>
      </div>
    </div>
  );
};

const ProfileModal = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-slate-900 border-4 border-indigo-500/80 w-full max-w-sm rounded-3xl p-6 shadow-[0_0_50px_rgba(88,101,242,0.5)] text-white relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Discord phía sau */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"></div>
        {/* Nút đóng modal */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        >
          ✕
        </button>
        {/* Avatar chính giữa */}
        <div className="relative mt-10 mb-4 flex justify-center">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-pink-500 to-indigo-500 shadow-xl relative">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover rounded-full bg-slate-800"
            />
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
          </div>
        </div>
        {/* Thông tin chi tiết */}
        <div className="text-center">
          <h3 className="text-2xl font-black text-white">{user.name}</h3>
          <p className="text-indigo-300 text-xs font-semibold mb-4">{user.handle}</p>
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-gray-400 text-xs block">Thắng</span>
              <span className="text-lg font-black text-emerald-400">{user.stats.wins} trận</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
              <span className="text-gray-400 text-xs block">Tỷ lệ thắng</span>
              <span className="text-lg font-black text-amber-400">{user.stats.winRate}%</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50 col-span-2 flex justify-between items-center px-4">
              <span className="text-gray-400 text-xs">Danh hiệu Discord</span>
              <span className="text-xs font-bold text-indigo-300 bg-indigo-950 px-2 py-1 rounded-md border border-indigo-500/30">
                👑 Người chơi mới
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl font-bold shadow-[0_4px_0_#3730a3] active:translate-y-1 active:shadow-none transition-all"
          >
            Đóng Profile
          </button>
        </div>
      </div>
    </div>
  );
};

const GameCard = ({ game, onClick }) => {
  return (
    <div
      onMouseEnter={() => audio.playHover()}
      onClick={() => {
        audio.playClick();
        onClick(game);
      }}
      className={`relative shrink-0 w-64 h-80 rounded-[2.5rem] border-[6px] border-white/90 cursor-pointer snap-center
                  flex flex-col items-center justify-center p-6 text-white text-center
                  transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  hover:-translate-y-4 hover:scale-105 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5),0_0_25px_rgba(255,255,255,0.6)]
                  shadow-[0_10px_20px_rgba(0,0,0,0.3)] overflow-hidden ${game.colorBg}`}
    >
      <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-white/20 skew-x-[-30deg] transition-all duration-500 hover:left-[200%]"></div>
      <div className="h-24 flex items-center justify-center text-[5rem] drop-shadow-xl mb-4 transform transition-transform group-hover:scale-110 group-hover:rotate-6">
        {game.icon}
      </div>
      <h3 className="text-3xl font-black tracking-wide drop-shadow-md mb-2">{game.title}</h3>
      <p className="font-medium text-white/90 drop-shadow-sm">{game.desc}</p>
      <div className="mt-auto bg-white/30 px-6 py-2 rounded-full font-bold uppercase tracking-widest text-sm shadow-inner backdrop-blur-sm">
        Chơi ngay
      </div>
    </div>
  );
};

const gamesData = [
  { id: 1, title: 'Cờ Tướng', desc: 'Đấu trí đỉnh cao', colorBg: 'bg-gradient-to-b from-red-500 to-red-700', icon: <XiangqiPieceIcon /> },
  { id: 2, title: 'Cờ Vua', desc: 'Chiến thuật hoàng gia', colorBg: 'bg-gradient-to-b from-blue-500 to-indigo-700', icon: <ChessKingIcon /> },
  { id: 3, title: 'Cờ Tỷ Phú', desc: 'Làm giàu không khó', colorBg: 'bg-gradient-to-b from-emerald-400 to-green-600', icon: '💸' },
  { id: 4, title: 'Bài Uno', desc: 'Hủy diệt tình bạn', colorBg: 'bg-gradient-to-b from-amber-400 to-orange-600', icon: <UnoCardIcon /> },
];

export default function GameHub() {
  const [isMuted, setIsMuted] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');
  const [connectionError, setConnectionError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [userProfile, setUserProfile] = useState({
    name: 'Khách',
    handle: '',
    avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
    coins: 0,
    level: 1,
    stats: { wins: 0, winRate: 0 }
  });
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
          setConnectionError(
            error instanceof Error ? error.message : 'Không thể kết nối Discord Activity.'
          );
        }
      });
    return () => {
      isActive = false;
    };
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
  return (
    <div className="isolate min-h-screen font-sans text-gray-100 overflow-hidden flex flex-col justify-between selection:bg-indigo-500 selection:text-white" onClick={handleGlobalInteraction}>
      <CanvasBackground />
      {/* Header & Avatar Người Dùng Discord */}
      <header className="flex justify-between items-center p-4 md:p-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl shadow-lg border border-indigo-400/50">
            🎮
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight">
              GAME HUB <span className="text-yellow-300">MOSA</span>
            </h1>
            <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              {connectionState === 'connected'
                ? 'Discord Activity Live'
                : connectionState === 'connecting'
                  ? 'Đang kết nối Discord Activity...'
                  : 'Chưa kết nối Discord Activity'}
            </p>
          </div>
        </div>
        {/* Nút điều khiển âm thanh & Avatar */}
        <div className="flex items-center gap-3">
          {/* Avatar Widget */}
          <DiscordUserWidget
            user={userProfile}
            isConnected={connectionState === 'connected'}
            onClickProfile={() => setShowProfile(true)}
          />
          {/* Nút Bật/Tắt Âm Thanh */}
          <button
            onClick={toggleMute}
            onMouseEnter={() => audio.playHover()}
            className="relative w-12 h-12 rounded-full bg-slate-800 text-yellow-400 flex items-center justify-center
                      border-2 border-indigo-500/50 hover:border-yellow-400
                      shadow-[0_4px_0_#1e1b4b,0_6px_15px_rgba(0,0,0,0.4)]
                      transition-all duration-100 ease-in-out
                      active:translate-y-[2px] active:shadow-[0_1px_0_#1e1b4b]
                      hover:bg-slate-700"
            aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            )}
          </button>
        </div>
      </header>
      {connectionState === 'error' && (
        <div
          role="alert"
          className="z-20 mx-4 mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/40 bg-rose-950/90 px-4 py-3 text-sm text-rose-100 md:mx-6"
        >
          <span>{connectionError}</span>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded-lg bg-rose-700 px-3 py-1.5 font-bold text-white hover:bg-rose-600"
          >
            Thử kết nối lại
          </button>
        </div>
      )}
      {/* Main Content Layout - Tối ưu tỷ lệ vừa vặn trong Discord iFrame */}
      <main className="flex-1 flex flex-col xl:flex-row w-full max-w-[1500px] mx-auto px-4 md:px-8 py-2 gap-6 overflow-hidden">
        {/* Carousel Chọn Game */}
        <section className="flex-1 flex flex-col justify-center min-w-0">
          <h2 className="text-lg font-extrabold text-indigo-100 mb-4 bg-slate-900/60 border border-indigo-500/30 py-1.5 px-5 rounded-full shadow-md backdrop-blur-md self-start flex items-center gap-2">
            <span>🔥</span> Chọn Game
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory hide-scrollbar p-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {gamesData.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onClick={(g) => console.log('Chơi game:', g.title)}
              />
            ))}
          </div>
        </section>
        {/* Bảng Phòng Chơi Discord iFrame Panel */}
        <aside className="xl:w-[400px] w-full flex flex-col mb-4 xl:mb-0">
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-2xl p-5 border-2 border-indigo-500/40 flex-1 flex flex-col max-h-[500px] xl:max-h-[580px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-amber-400 flex items-center gap-2">
                <span>💬</span> Phòng Mẫu
              </h3>
              <button
                onMouseEnter={() => audio.playHover()}
                onClick={() => audio.playClick()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3.5 rounded-xl 
                          shadow-[0_3px_0_#3730a3] active:shadow-none active:translate-y-[2px] 
                          transition-all text-xs border border-indigo-400/30"
              >
                + Tạo Phòng
              </button>
            </div>
            <div className="overflow-y-auto pr-1 flex flex-col gap-3 flex-1 custom-scrollbar">
              {[
                { id: 1, name: "Phòng chơi siêu cấp vip pro của Thần Bài Macau - Cấm gà", game: "Cờ Tỷ Phú Bất Động Sản", slots: "4/4", color: "bg-emerald-950 text-emerald-300 border-emerald-700/50" },
                { id: 2, name: "Giao hữu cờ vua xóm Đình, không sử dụng mưu hèn kế bẩn", game: "Cờ Vua Hoàng Gia 2026", slots: "1/2", color: "bg-indigo-950 text-indigo-300 border-indigo-700/50" },
                { id: 3, name: "Hội những người bạn thích hủy diệt tình bạn bằng lá +4", game: "Bài Uno Đại Chiến", slots: "3/8", color: "bg-amber-950 text-amber-300 border-amber-700/50" },
                { id: 4, name: "Trận chiến sinh tử ngã tư đường phố - Bán hành ngập mồm", game: "Cờ Tướng Cổ Điển", slots: "2/2", color: "bg-rose-950 text-rose-300 border-rose-700/50" }
              ].map((room) => (
                <div
                  key={room.id}
                  onMouseEnter={() => audio.playHover()}
                  onClick={() => audio.playClick()}
                  className="group flex justify-between items-center bg-slate-800/80 hover:bg-indigo-950/80 p-3.5 rounded-2xl cursor-pointer 
                            transition-all border border-slate-700 hover:border-indigo-500 hover:shadow-lg"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <h4 className="font-bold text-gray-100 text-sm whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-amber-300 transition-colors">
                      {room.name}
                    </h4>
                    <p className="text-xs text-indigo-300/70 whitespace-nowrap overflow-hidden text-ellipsis mt-0.5">
                      {room.game}
                    </p>
                  </div>
                  <div className="w-14 shrink-0 text-right">
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${room.color}`}>
                      {room.slots}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
      {/* Pop-up Profile Modal */}
      {showProfile && (
        <ProfileModal
          user={userProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #4f46e5; border-radius: 20px; }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
      `}} />
    </div>
  );
}