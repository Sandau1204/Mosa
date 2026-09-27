'use client';

import Script from 'next/script';

export default function MusicDashboard() {
  return (
    <>
      <div className='overscroll-y-none h-[100dvh] w-screen flex flex-col text-sm antialiased selection:bg-discord-blurple selection:text-white'>
        <div id="auth-overlay" className="fixed inset-0 z-50 bg-discord-bg flex items-center justify-center transition-opacity duration-300 p-4">
                <div className="bg-discord-panel p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-discord-blurple rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <i className="ph-fill ph-robot text-3xl md:text-4xl text-white"></i>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-white mb-2">Chào mừng trở lại!</h1>
                    <p className="text-discord-muted mb-8 text-sm">Vui lòng đăng nhập để điều khiển bot phát nhạc.</p>
                    <button onClick={() => {window.handleLogin()}} className="w-full bg-discord-blurple hover:bg-discord-blurple_hover text-white font-semibold py-3 px-4 rounded transition-colors flex items-center justify-center gap-2">
                        <i className="ph ph-discord-logo text-xl"></i>
                        Đăng nhập bằng Discord
                    </button>
                </div>
            </div>
            <div id="app-container" className="flex-1 flex flex-col md:flex-row overflow-hidden opacity-0 pointer-events-none transition-opacity duration-300">
                {/* Sidebar: Servers & Playlists */}
                <aside className="w-full md:w-72 bg-discord-panel flex flex-col flex-shrink-0 border-b md:border-b-0 md:border-r border-discord-bg h-[45%] md:h-auto">
                    {/* User Profile & Logout */}
                    <div className="h-12 md:h-14 border-b border-discord-bg flex items-center px-4 transition-colors shadow-sm shrink-0">
                        <img id="user-avatar" src="..." onError={(event) => { event.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png' }} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover" />
                        <div id="user-username" className="ml-3 font-semibold text-white truncate flex-1 text-xs">Đang tải...</div>
                        <a href="/logout" className="text-discord-muted hover:text-discord-danger transition-colors p-1" title="Đăng xuất">
                            <i className="ph ph-sign-out text-lg"></i>
                        </a>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        {/* Cấu hình Bot & Kênh thoại */}
                        <div className="mb-4 md:mb-6 bg-discord-bg p-3 rounded-lg border border-[#1E1F22]">
                            <div className="mb-3">
                                <label className="block text-[10px] md:text-xs font-bold text-discord-muted uppercase tracking-wider mb-1.5">Chọn Server</label>
                                <div className="relative">
                                    <select id="server-select" className="w-full bg-discord-panel border-none text-discord-text rounded p-2 appearance-none focus:ring-2 focus:ring-discord-blurple outline-none cursor-pointer text-xs md:text-sm">
                                    </select>
                                    <i className="ph ph-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted pointer-events-none"></i>
                                </div>
                            </div>
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[10px] md:text-xs font-bold text-discord-muted uppercase tracking-wider">Kênh Thoại</label>
                                    <div id="bot-status" className="flex items-center gap-1 text-[9px] md:text-[10px] uppercase font-bold text-discord-danger">
                                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-discord-danger" id="bot-status-dot"></div>
                                        <span id="bot-status-text">Ngắt kết nối</span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <select id="channel-select" className="w-full bg-discord-panel border-none text-discord-text rounded p-2 appearance-none focus:ring-2 focus:ring-discord-blurple outline-none cursor-pointer text-xs md:text-sm">
                                    </select>
                                    <i className="ph ph-caret-down absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted pointer-events-none"></i>
                                </div>
                            </div>
                            <button id="btn-invite" onClick={() => {window.inviteBot()}} className="w-full bg-[#23A559] hover:bg-[#1A7C43] text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 text-xs md:text-sm">
                                <i className="ph ph-plugs"></i>
                                Mời Bot
                            </button>
                        </div>
                        {/* Section: Saved Playlists */}
                        <div className="mb-4 md:mb-6">
                            <h2 className="text-[10px] md:text-xs font-bold text-discord-muted uppercase tracking-wider mb-2 px-1">Playlist Đã Lưu</h2>
                            <ul className="space-y-[2px]" id="playlist-container">
                            </ul>
                        </div>
                    </div>
                </aside>
                {/* Main Content Area */}
                <main className="flex-1 flex flex-col min-w-0 bg-discord-bg relative md:h-auto">
                    <header className="p-4 md:p-6 pb-2 md:pb-4 shadow-sm z-10 flex flex-col gap-4 shrink-0">
                        <div className="relative flex items-center">
                            <div className="absolute left-3 md:left-4 flex items-center justify-center">
                                <i className="ph ph-youtube-logo text-xl md:text-2xl text-red-500"></i>
                            </div>
                            <input type="text" id="youtube-input" placeholder="Nhập link YouTube hoặc Playlist..." className="w-full bg-discord-panel border-none text-discord-text rounded-lg py-2.5 md:py-3 pl-10 md:pl-12 pr-20 md:pr-24 focus:ring-2 focus:ring-discord-blurple outline-none transition-all placeholder:text-discord-muted text-sm" />
                            <button onClick={() => {window.addFromInput()}} className="absolute right-1.5 md:right-2 bg-discord-blurple hover:bg-discord-blurple_hover text-white px-3 md:px-4 py-1.5 rounded transition-colors text-xs md:text-sm font-medium">
                                Thêm
                            </button>
                        </div>
                    </header>
                    <div className="flex-1 flex flex-col overflow-hidden px-4 md:px-6 pb-4 md:pb-6">
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base md:text-lg font-bold text-white">Hàng Chờ</h2>
                                <span id="queue-count" className="bg-discord-panel text-discord-muted text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">0 bài</span>
                            </div>
                            <div className="flex gap-1.5 md:gap-2">
                                <button onClick={() => {window.shuffleQueue()}} className="bg-discord-panel hover:bg-discord-hover text-discord-text px-2 md:px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm">
                                    <i className="ph ph-shuffle text-sm md:text-base"></i>
                                    <span className="hidden md:inline">Trộn bài</span>
                                </button>
                                <button onClick={() => {window.clearQueue()}} className="bg-discord-panel hover:bg-discord-hover text-discord-danger hover:text-red-400 px-2 md:px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm">
                                    <i className="ph ph-trash text-sm md:text-base"></i>
                                    <span className="hidden md:inline">Xóa hết</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 rounded-lg bg-discord-bg" id="queue-scroll-area">
                            <ul id="queue-list" className="space-y-1 pb-4">
                            </ul>
                        </div>
                    </div>
                </main>
            </div>
            <div id="player-bar" className="relative h-auto md:h-24 bg-discord-panel border-t border-[#1E1F22] flex flex-col md:flex-row items-center py-3 md:py-0 px-4 justify-between z-20 flex-shrink-0 opacity-0 pointer-events-none transition-opacity duration-300 gap-2 md:gap-0">
                {/* Now Playing Info */}
                <div className="flex items-center w-full md:w-1/3 min-w-0 md:min-w-[250px] pr-20 md:pr-0">
                    <div className="relative group cursor-pointer rounded-md overflow-hidden mr-3 bg-[#1E1F22] w-12 h-10 md:w-16 md:h-12 flex items-center justify-center flex-shrink-0">
                        <img id="np-thumbnail" src="" alt="Thumbnail" className="w-full h-full object-cover hidden" />
                        <i id="np-icon-fallback" className="ph-fill ph-music-notes text-xl md:text-2xl text-discord-muted"></i>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <div id="np-title" className="text-white font-medium text-sm md:text-base truncate cursor-pointer">Chưa có bài hát nào</div>
                        <div id="np-author" className="text-discord-muted text-[10px] md:text-xs truncate">...</div>
                    </div>
                </div>
                {/* Controls & Progress */}
                <div className="flex flex-col items-center w-full md:flex-1 max-w-2xl px-0 md:px-4 mt-2 md:mt-0">
                    <div className="flex items-center gap-4 md:gap-5 mb-1.5 md:mb-2">
                        <button onClick={() => {window.changeVolume(-10)}} className="text-discord-muted hover:text-white transition-colors" title="Giảm âm lượng">
                            <i className="ph-fill ph-speaker-low text-xl"></i>
                        </button>
                        <button className="text-discord-muted hover:text-white transition-colors" title="Lặp lại" id="loop-btn" onClick={() => {window.toggleLoop()}}>
                            <i className="ph ph-repeat text-base md:text-lg"></i>
                        </button>
                        <button onClick={() => {window.togglePlay()}} className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center text-discord-bg hover:scale-105 transition-transform" title="Phát/Dừng">
                            <i id="play-pause-icon" className="ph-fill ph-play text-lg md:text-xl"></i>
                        </button>
                        <button className="text-discord-muted hover:text-white transition-colors" title="Bỏ qua" onClick={() => {window.skipSong()}}>
                            <i className="ph-fill ph-skip-forward text-xl md:text-2xl"></i>
                        </button>
                        <button onClick={() => {window.changeVolume(10)}} className="text-discord-muted hover:text-white transition-colors" title="Tăng âm lượng">
                            <i className="ph-fill ph-speaker-high text-xl"></i>
                        </button>
                    </div>
                    <div className="flex items-center w-full gap-2 md:gap-3 text-[10px] md:text-xs text-discord-muted font-medium">
                        <span id="time-current">0:00</span>
                        <div className="flex-1 flex items-center cursor-pointer py-3 -my-3 group" onClick={() => {window.seekMusic(event)}}>
                            <div id="progress-bar-container" className="relative w-full h-1.5 md:h-1 bg-[#4E5058] rounded-full">
                                <div id="progress-bar-fill" className="h-full bg-discord-blurple rounded-full w-0 relative group-hover:bg-[#5865F2] transition-all duration-300 ease-linear">
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            </div>
                        </div>
                        <span id="time-total">0:00</span>
                    </div>
                </div>
                {/* Extra Controls (Volume) */}
                <div className="absolute top-4 right-4 md:static flex items-center justify-end md:w-1/3 gap-2 md:pr-4">
                    <div className="flex items-center justify-center gap-1.5 min-w-[65px] px-2 py-1 bg-[#1E1F22] rounded cursor-pointer select-none border border-discord-bg hover:border-discord-hover transition-colors" onClick={() => {window.toggleMute()}} title="Click để Mute/Unmute">
                        <i className="ph ph-speaker-high text-discord-muted text-lg" id="volume-icon"></i>
                        <span id="volume-text" className="text-[11px] md:text-xs font-bold text-discord-text">100%</span>
                    </div>
                </div>
            </div>
            <div id="toast-container" className="fixed top-5 right-5 z-50 flex flex-col gap-2"></div>
            {/* Discord SDK Loader */}
            
            {/* JS File */}
            
      </div>
      <Script src="/music-sdk.js" type="module" strategy="afterInteractive" />
      <Script src="/music.js" type="module" strategy="afterInteractive" />
    </>
  );
}
