'use client';

import Script from 'next/script';

const botInviteUrl = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
    ? `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`
    : null;

export default function PanelDashboard() {
  return (
    <>
      <div className='overscroll-y-none bg-gray-900 text-gray-200 font-sans h-[100dvh] overflow-hidden flex flex-col md:flex-row selection:bg-discord selection:text-white'>
        {/* Màn hình đăng nhập */}
            <div id="login-screen" className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center transition-opacity duration-300 p-6">
                <div className="bg-gray-800 p-8 md:p-10 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full text-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <i className="ph-fill ph-robot text-3xl md:text-4xl text-discord"></i>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-white mb-2">Quản Trị Bot</h1>
                    <p className="text-gray-400 mb-8 text-xs md:text-sm">Vui lòng xác thực tài khoản Discord của bạn để vào Panel.</p>
                    <button onClick={() => {window.app.login()}} className="w-full bg-discord hover:bg-discordHover text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm md:text-base">
                        <i className="ph-fill ph-discord-logo text-xl"></i> Đăng nhập với Discord
                    </button>
                </div>
            </div>
        
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-gray-950 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col z-10 shrink-0">
                {/* Logo */}
                <div className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-800 shrink-0">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-discord rounded-lg flex items-center justify-center">
                            <i className="ph-fill ph-robot text-white text-base md:text-lg"></i>
                        </div>
                        <span className="font-bold text-white tracking-wide text-sm md:text-base">Mosa Panel</span>
                    </div>
                    {/* Mobile User Profile & Logout */}
                    <div className="flex md:hidden items-center gap-3">
                        <img id="user-avatar-mobile" src="..." alt="Ảnh đại diện người dùng" onError={(event) => { event.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png' }} className="w-7 h-7 rounded-full object-cover border border-gray-700" />
                        <button onClick={() => {window.app.logout()}} className="text-gray-400 hover:text-red-400 transition-colors" title="Đăng xuất">
                            <i className="ph ph-sign-out text-lg"></i>
                        </button>
                    </div>
                </div>
                {/* Navigation */}
                <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto py-2 md:py-4 px-2 md:px-3 gap-1 md:gap-0 md:space-y-1 hide-scrollbar shrink-0">
                    <button onClick={() => {window.app.switchTab('overview')}} className="nav-btn whitespace-nowrap shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all active-nav" data-target="overview">
                        <i className="ph ph-squares-four text-lg"></i> <span className="font-medium text-xs md:text-sm">Tổng quan</span>
                    </button>
                    <button onClick={() => {window.app.switchTab('servers')}} className="nav-btn whitespace-nowrap shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all" data-target="servers">
                        <i className="ph ph-hard-drives text-lg"></i> <span className="font-medium text-xs md:text-sm">Máy chủ</span>
                    </button>
                    <button onClick={() => {window.app.switchTab('chat')}} className="nav-btn whitespace-nowrap shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all" data-target="chat">
                        <i className="ph ph-chat-teardrop-text text-lg"></i> <span className="font-medium text-xs md:text-sm">Bảng tin nhắn</span>
                    </button>
                    <button onClick={() => {window.app.switchTab('welcome')}} className="nav-btn whitespace-nowrap shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all" data-target="welcome">
                        <i className="ph ph-hand-waving text-lg"></i> <span className="font-medium text-xs md:text-sm">Tin nhắn chào mừng</span>
                    </button>
                    <button onClick={() => {window.app.switchTab('settings')}} className="nav-btn whitespace-nowrap shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all" data-target="settings">
                        <i className="ph ph-sliders-horizontal text-lg"></i> <span className="font-medium text-xs md:text-sm">Trạng thái Bot</span>
                    </button>
                    <button onClick={() => {window.app.switchTab('logs')}} className="nav-btn whitespace-nowrap shrink-0 w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all" data-target="logs">
                        <i className="ph ph-terminal-window text-lg"></i> <span className="font-medium text-xs md:text-sm">Nhật ký</span>
                    </button>
                </nav>
                {/* User Profile (Desktop) */}
                <div className="hidden md:block p-4 border-t border-gray-800 mt-auto shrink-0">
                    <div className="flex items-center gap-3 bg-gray-900 p-3 rounded-xl border border-gray-800">
                        <img id="user-avatar" src="..." alt="Ảnh đại diện người dùng" onError={(event) => { event.currentTarget.src = 'https://cdn.discordapp.com/embed/avatars/0.png' }} className="w-8 h-8 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                            <p id="user-username" className="text-sm font-semibold text-white truncate">Đang tải...</p>
                            <p id="user-discriminator" className="text-xs text-gray-500 truncate"></p>
                        </div>
                        <button onClick={() => {window.app.logout()}} className="text-gray-400 hover:text-red-400 transition-colors" title="Đăng xuất">
                            <i className="ph ph-sign-out text-lg"></i>
                        </button>
                    </div>
                </div>
            </aside>
            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 bg-gray-900 relative">
                {/* Header */}
                <header className="h-14 md:h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 bg-gray-900/80 backdrop-blur-md z-10 shrink-0">
                    <h2 id="page-title" className="text-base md:text-lg font-semibold text-white">Tổng quan</h2>
                    <button onClick={() => {window.app.openModal('inviteBotModal')}} className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 text-xs md:text-sm font-medium py-1.5 md:py-2 px-3 md:px-4 rounded-lg flex items-center gap-2 transition-colors">
                        <i className="ph ph-user-plus text-sm md:text-base"></i> Mời Bot
                    </button>
                </header>
                {/* Container for all tabs */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 relative">
                    {/* TỔNG QUAN */}
                    <div id="tab-overview" className="tab-content block space-y-4 md:space-y-6 max-w-5xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Cards Thống kê (Giữ nguyên cấu trúc div bên trong như cũ) */}
                            {/* Card 1 */}
                            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 md:p-5 flex flex-col">
                                <div className="flex justify-between items-start mb-3 md:mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                        <i className="ph ph-hard-drives text-xl"></i>
                                    </div>
                                </div>
                                <h3 className="text-gray-400 text-xs md:text-sm font-medium">Tổng Máy Chủ</h3>
                                <p id="stat-guilds" className="text-2xl md:text-3xl font-bold text-white mt-1">...</p>
                            </div>
                            {/* Card 2 */}
                            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 md:p-5 flex flex-col">
                                <div className="flex justify-between items-start mb-3 md:mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                                        <i className="ph ph-users text-xl"></i>
                                    </div>
                                </div>
                                <h3 className="text-gray-400 text-xs md:text-sm font-medium">Tổng Người Dùng</h3>
                                <p id="stat-members" className="text-2xl md:text-3xl font-bold text-white mt-1">...</p>
                            </div>
                            {/* Card 3 */}
                            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 md:p-5 flex flex-col">
                                <div className="flex justify-between items-start mb-3 md:mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                                        <i className="ph ph-activity text-xl"></i>
                                    </div>
                                </div>
                                <h3 className="text-gray-400 text-xs md:text-sm font-medium">Độ Trễ (Ping)</h3>
                                <p id="stat-ping" className="text-2xl md:text-3xl font-bold text-white mt-1">...<span className="text-xs md:text-sm font-normal text-gray-500 ml-1">ms</span></p>
                            </div>
                            {/* Card 4 */}
                            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 md:p-5 flex flex-col">
                                <div className="flex justify-between items-start mb-3 md:mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                        <i className="ph ph-cpu text-xl"></i>
                                    </div>
                                </div>
                                <h3 className="text-gray-400 text-xs md:text-sm font-medium">Sử Dụng RAM</h3>
                                <p id="stat-ram" className="text-2xl md:text-3xl font-bold text-white mt-1">...<span className="text-xs md:text-sm font-normal text-gray-500 ml-1">MB</span></p>
                            </div>
                        </div>
                    </div>
                    {/* QUẢN LÝ MÁY CHỦ */}
                    <div id="tab-servers" className="tab-content hidden-tab space-y-6 max-w-5xl mx-auto h-full flex flex-col">
                        <div id="server-list-view" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Render by JS */}
                        </div>
                        {/* Server Detail View */}
                        <div id="server-detail-view" className="hidden-tab bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden flex-1 flex flex-col">
                            <div className="p-3 md:p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800/80">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <button aria-label="Quay lại danh sách server" onClick={() => {window.app.showServerList()}} className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors text-sm">
                                        <i className="ph ph-arrow-left"></i>
                                    </button>
                                    <h3 id="detail-server-name" className="font-semibold text-white text-sm md:text-base">Tên Server</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => {window.app.openServerInviteModal()}} className="bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] md:text-xs font-medium py-1.5 px-2 md:px-3 rounded-lg flex items-center gap-1.5 transition-colors">
                                        <i className="ph ph-link"></i> <span className="hidden md:inline">Tạo Link Mời</span>
                                    </button>
                                    <button onClick={() => {window.app.leaveServer()}} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] md:text-xs font-medium py-1.5 px-2 md:px-3 rounded-lg border border-red-500/20 flex items-center gap-1.5 transition-colors">
                                        <i className="ph ph-sign-out"></i> <span className="hidden md:inline">Rời Server</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-x-auto p-2 md:p-4">
                                <table className="w-full text-left border-collapse min-w-[400px]">
                                    <thead>
                                        <tr className="text-gray-400 text-[10px] md:text-xs uppercase border-b border-gray-800">
                                            <th className="pb-2 pl-2 font-medium">Thành viên</th>
                                            <th className="pb-2 font-medium">Vai trò Top</th>
                                            <th className="pb-2 pr-2 font-medium text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody id="member-list-tbody" className="text-sm divide-y divide-gray-800/50">
                                        {/* Render by JS */}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    {/* BẢNG NHẮN TIN */}
                    <div id="tab-chat" className="tab-content hidden-tab h-full flex flex-col max-w-6xl mx-auto">
                        {/* Khu vực Chọn Máy Chủ & Kênh (Dùng chung cho PC & Mobile) */}
                        <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-full shrink-0 mb-3 md:mb-4">
                            {/* Dropdown Máy Chủ */}
                            <div className="flex-1 relative">
                                <select id="chat-server-select" onChange={(event) => {window.app.selectChatServer(event.currentTarget.value)}} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-white appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                                    <option>Đang tải...</option>
                                </select>
                                <i className="ph ph-caret-down absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                            </div>
                            {/* Dropdown Kênh */}
                            <div className="flex-1 relative">
                                <select id="chat-channel-select" onChange={(event) => {window.app.selectChannel(event.currentTarget.value, event.currentTarget.options[event.currentTarget.selectedIndex].text)}} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-sm md:text-base text-white appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
                                    <option>Đang tải...</option>
                                </select>
                                <i className="ph ph-caret-down absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                            </div>
                        </div>
                        {/* Khu vực Bảng Tin Nhắn (Mở rộng 100% chiều ngang) */}
                        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl flex flex-col relative overflow-hidden min-h-0 shadow-sm">
                            <div className="h-10 md:h-14 border-b border-gray-700 flex items-center px-3 md:px-4 gap-2 bg-gray-800/80 shrink-0">
                                <i className="ph ph-hash text-gray-400"></i>
                                <span className="font-medium text-sm md:text-base text-white truncate" id="current-chat-channel">Chưa chọn kênh</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4" id="chat-messages">
                                {/* Render via JS */}
                            </div>
                            {/* Replying Indicator */}
                            <div id="reply-indicator" className="hidden-tab bg-gray-700/50 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-[10px] md:text-xs text-gray-300">
                                <div className="flex items-center gap-2">
                                    <i className="ph ph-arrow-u-up-left"></i> Đang trả lời <span id="reply-target-name" className="font-semibold text-white">...</span>
                                </div>
                                <button onClick={() => {window.app.cancelReply()}} aria-label="Hủy trả lời" className="text-gray-400 hover:text-white"><i className="ph ph-x"></i></button>
                            </div>
                            {/* Input */}
                            <div className="p-2 md:p-4 bg-gray-900/50 border-t border-gray-700 shrink-0">
                                <form onSubmit={(event) => { window.app.sendMessage(event) }} className="relative flex items-center">
                                    <input type="text" id="chat-input" placeholder="Nhập tin nhắn..." className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-3 md:pl-4 pr-10 md:pr-12 py-2.5 md:py-3 text-xs md:text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                                    <button type="submit" aria-label="Gửi tin nhắn" className="absolute right-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-indigo-400 transition-colors">
                                        <i className="ph-fill ph-paper-plane-right text-lg"></i>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
        
                    {/* TIN NHẮN CHÀO MỪNG */}
                    <div id="tab-welcome" className="tab-content hidden-tab max-w-5xl mx-auto h-full flex flex-col md:flex-row gap-4 md:gap-6">
                        {/* Settings Form */}
                        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl p-4 md:p-6 overflow-y-auto">
                            <h3 className="text-base md:text-lg font-semibold text-white mb-4 md:mb-6">Cài Đặt Embed Chào Mừng</h3>
                            <div className="space-y-4 md:space-y-5">
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-400 mb-1.5">Máy chủ</label>
                                    <select id="welcome-server-select" onChange={(event) => {window.app.selectWelcomeServer(event.currentTarget.value)}} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm text-white">
                                        <option value="">Đang tải...</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-400 mb-1.5">Kênh gửi lời chào</label>
                                    <select id="welcome-channel-select" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm text-white">
                                        <option value="">Chọn server trước...</option>
                                    </select>
                                </div>
                                {/* Các field input cấu hình giữ nguyên form cũ */}
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-400 mb-1.5">Tiêu đề (Title)</label>
                                    <input type="text" id="em-title" defaultValue="Chào mừng đến với Server!" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm text-white focus:border-indigo-500 outline-none" onInput={(event) => {window.app.updateEmbedPreview()}} />
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-400 mb-1.5">Mô tả (Description)</label>
                                    <textarea id="em-desc" rows="3" defaultValue="Rất vui khi bạn tham gia server. 🌟 Vui lòng đọc luật và chọn role để nhận thông báo." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm text-white focus:border-indigo-500 outline-none resize-none" onInput={(event) => {window.app.updateEmbedPreview()}} />
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-400 mb-1.5">Màu sắc (Color Hex)</label>
                                    <div className="flex gap-2">
                                        <input type="color" id="em-color-picker" defaultValue="#5865F2" className="h-9 md:h-10 w-9 md:w-10 rounded cursor-pointer border-0 p-0" onInput={(event) => {document.getElementById('em-color').value = event.currentTarget.value; window.app.updateEmbedPreview()}} />
                                        <input type="text" id="em-color" defaultValue="#5865F2" className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm text-white focus:border-indigo-500 outline-none uppercase" onInput={(event) => {document.getElementById('em-color-picker').value = event.currentTarget.value; window.app.updateEmbedPreview()}} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="em-image-upload" className="block text-xs md:text-sm font-medium text-gray-400 mb-1.5">Ảnh Banner</label>
                                    <input type="hidden" id="em-image" defaultValue="https://placehold.co/600x200/2d3748/ffffff?text=Welcome+Banner" />
                                    <input type="file" id="em-image-upload" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(event) => {window.app.uploadWelcomeBanner(event.currentTarget.files?.[0], event.currentTarget)}} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-white" />
                                    <p id="em-image-name" className="mt-1.5 text-xs text-gray-500">Chưa chọn ảnh mới</p>
                                </div>
                                <button onClick={() => {window.app.saveWelcomeSettings()}} className="w-full mt-2 md:mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm md:text-base py-2 md:py-2.5 rounded-lg transition-colors">
                                    Lưu Cấu Hình
                                </button>
                            </div>
                        </div>
                        {/* Embed Preview */}
                        <div className="w-full md:w-96 flex flex-col shrink-0">
                            <h3 className="text-[10px] md:text-sm font-medium text-gray-400 mb-2 md:mb-3 uppercase tracking-wider">Xem Trước</h3>
                            <div className="bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-700 flex-1">
                                {/* Nội dung Preview HTML như cũ */}
                                <div className="flex gap-2 md:gap-3 mb-1">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-discord flex items-center justify-center shrink-0">
                                        <i className="ph-fill ph-robot text-white text-sm md:text-base"></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-white text-sm md:text-base hover:underline cursor-pointer">Bot</span>
                                            <span className="bg-indigo-500 text-[9px] md:text-[10px] font-bold px-1 rounded text-white flex items-center gap-0.5"><i className="ph-fill ph-check-circle"></i> BOT</span>
                                        </div>
                                        <div id="preview-embed" className="mt-1 flex max-w-full">
                                            <div id="pv-color" className="w-1 rounded-l shrink-0" style={{ backgroundColor: '#5865F2' }}></div>
                                            <div className="bg-[#2B2D31] rounded-r p-2 md:p-3 w-full border border-gray-700/50">
                                                <div id="pv-title" className="font-bold text-white mb-1.5 text-xs md:text-sm cursor-pointer hover:underline truncate">Chào mừng đến với Server!</div>
                                                <div id="pv-desc" className="text-[11px] md:text-sm text-gray-300 whitespace-pre-wrap leading-relaxed mb-2 md:mb-3">Rất vui khi bạn tham gia server. 🌟 Vui lòng đọc luật và chọn role để nhận thông báo.</div>
                                                <img id="pv-img" src="https://placehold.co/600x200/2d3748/ffffff?text=Welcome+Banner" className="rounded-lg max-w-full w-full object-cover max-h-32 md:max-h-48" alt="Banner" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
        
                    {/* CÀI ĐẶT TRẠNG THÁI */}
                    <div id="tab-settings" className="tab-content hidden-tab max-w-2xl mx-auto">
                        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 md:p-6">
                            <h3 className="text-base md:text-lg font-semibold text-white mb-4 md:mb-6">Trạng Thái & Hoạt Động</h3>
                            <div className="space-y-4 md:space-y-5">
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-400 mb-1.5">Trạng thái (Status)</label>
                                    {/* Custom Status Dropdown */}
                                    <div className="relative" id="status-dropdown-container">
                                        <input type="hidden" id="bot-status-select" value="online" />
                                        <button type="button" onClick={() => {window.app.toggleStatusDropdown()}} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-white flex items-center justify-between focus:outline-none focus:border-indigo-500 transition-colors">
                                            <div className="flex items-center gap-2" id="selected-status-display">
                                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#23a559"/></svg>
                                                <span>Trực tuyến (Online)</span>
                                            </div>
                                            <i className="ph ph-caret-down text-gray-400"></i>
                                        </button>
                                        {/* Dropdown menu items giữ nguyên... */}
                                        <div id="status-dropdown-menu" className="hidden absolute top-full left-0 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                                            <button type="button" onClick={() => {window.app.selectStatus('online', 'Trực tuyến (Online)')}} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700">Trực tuyến (Online)</button>
                                            <button type="button" onClick={() => {window.app.selectStatus('idle', 'Vắng mặt (Idle)')}} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700">Vắng mặt (Idle)</button>
                                            <button type="button" onClick={() => {window.app.selectStatus('dnd', 'Không làm phiền (DND)')}} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700">Không làm phiền (DND)</button>
                                            <button type="button" onClick={() => {window.app.selectStatus('invisible', 'Ẩn (Invisible)')}} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700">Ẩn (Invisible)</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-xs md:text-sm font-medium text-gray-400 mb-1.5">Loại hoạt động</label>
                                        <div className="relative">
                                            <select id="bot-act-type" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-white appearance-none focus:outline-none focus:border-indigo-500">
                                                <option value="playing">Chơi</option>
                                                <option value="watching">Xem</option>
                                                <option value="listening">Nghe</option>
                                                <option value="competing">Thi đấu</option>
                                            </select>
                                            <i className="ph ph-caret-down absolute right-3 top-3 text-gray-400 pointer-events-none"></i>
                                        </div>
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs md:text-sm font-medium text-gray-400 mb-1.5">Tên hoạt động</label>
                                        <input type="text" id="bot-act-name" placeholder="VD: Minecraft, Spotify..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-white focus:outline-none focus:border-indigo-500" />
                                    </div>
                                </div>
                                <div className="pt-3 md:pt-4 border-t border-gray-700">
                                    <button onClick={() => {window.app.updateBotStatus()}} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-6 rounded-lg transition-colors text-sm">
                                        Cập nhật trạng thái
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
        
                    {/* NHẬT KÝ LOGS */}
                    <div id="tab-logs" className="tab-content hidden-tab max-w-5xl mx-auto h-full flex flex-col">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 md:mb-4 shrink-0 gap-2 md:gap-0">
                            <h3 className="text-base md:text-lg font-semibold text-white">Nhật Ký Trực Tuyến</h3>
                            <div className="flex gap-2">
                                <button onClick={() => {window.app.clearLogs()}} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs md:text-sm py-1.5 px-3 rounded-lg border border-gray-700 transition-colors">
                                    Xóa Console
                                </button>
                                <div className="bg-green-500/10 text-green-400 text-xs md:text-sm py-1.5 px-3 rounded-lg border border-green-500/20 flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span> Đang kết nối
                                </div>
                            </div>
                        </div>
                        <div id="log-container" className="flex-1 bg-[#0d1117] border border-gray-800 rounded-xl p-3 md:p-4 font-mono text-[10px] md:text-xs overflow-y-auto shadow-inner space-y-1 md:space-y-1.5">
                            {/* Logs injected via JS */}
                        </div>
                    </div>
                </div>
            </main>
            {/* MODALS */}
            <div id="modal-backdrop" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 hidden-tab transition-opacity" onClick={() => {window.app.closeAllModals()}}></div>
            {/* Mời Bot Modal */}
            <div id="inviteBotModal" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-[90%] md:w-full max-w-md hidden-tab flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/80">
                    <h3 className="font-semibold text-white">Mời Bot Vào Server</h3>
                    <button onClick={() => {window.app.closeAllModals()}} className="text-gray-400 hover:text-white" aria-label="Đóng modal"><i className="ph ph-x"></i></button>
                </div>
                <div className="p-6 flex flex-col items-center">
                    <div className="w-16 h-16 bg-discord rounded-xl flex items-center justify-center mb-4">
                        <i className="ph-fill ph-robot text-3xl text-white"></i>
                    </div>
                    <p className="text-gray-300 text-sm text-center mb-6">Bạn có thể mời bot vào server bất kỳ bằng link dưới đây (Cần quyền quản trị bot).</p>
                    <div className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-center justify-between gap-2 mb-4">
                        <span className="text-xs text-gray-400 truncate flex-1 font-mono">{botInviteUrl || 'Thiếu DISCORD_CLIENT_ID'}</span>
                    </div>
                    <button onClick={() => {if (botInviteUrl) window.open(botInviteUrl, '_blank', 'noopener,noreferrer'); else window.alert('Chưa cấu hình Discord Client ID.')}} className="w-full bg-discord hover:bg-discordHover text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2">
                        <i className="ph ph-arrow-square-out"></i> Lấy Link Thực Tế
                    </button>
                </div>
            </div>
            {/* Invite Server Modal */}
            <div id="serverInviteModal" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md hidden-tab flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/80">
                    <h3 className="font-semibold text-white">Link tham gia server</h3>
                    <button onClick={() => {window.app.closeAllModals()}} className="text-gray-400 hover:text-white" aria-label="Đóng modal"><i className="ph ph-x"></i></button>
                </div>
                <div className="p-6">
                    <p className="text-gray-300 text-sm mb-4">Gửi link này cho bạn bè để mời vào server.</p>
                    <div className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-center justify-between gap-2 mb-4">
                        <span id="server-invite-link" className="text-xs text-gray-400 truncate flex-1 font-mono">Đang tạo link...</span>
                        <button onClick={() => {window.app.copyText(document.getElementById('server-invite-link').innerText)}} className="text-gray-400 hover:text-white" title="Copy"><i className="ph ph-copy"></i></button>
                    </div>
                </div>
            </div>
            {/* Member Action Modal (Ban/Kick/Mute) */}
            <div id="memberActionModal" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md hidden-tab flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/80">
                    <h3 className="font-semibold text-white" id="action-title">Thao tác thành viên</h3>
                    <button onClick={() => {window.app.closeAllModals()}} className="text-gray-400 hover:text-white" aria-label="Đóng modal"><i className="ph ph-x"></i></button>
                </div>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6 bg-gray-900 p-3 rounded-xl border border-gray-700">
                        <img src="https://placehold.co/100/333/fff" id="action-avatar" className="w-10 h-10 rounded-full" alt="Ảnh đại diện thành viên" />
                        <div>
                            <div className="text-white font-medium" id="action-username">User</div>
                            <div className="text-xs text-gray-400" id="action-id">ID: ...</div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div id="timeout-duration-wrap" className="hidden-tab">
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Thời hạn (Timeout)</label>
                            <select id="action-duration" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                                <option value="60">60 Giây</option>
                                <option value="300">5 Phút</option>
                                <option value="600">10 Phút</option>
                                <option value="3600">1 Giờ</option>
                                <option value="86400">1 Ngày</option>
                                <option value="604800">1 Tuần</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Lý do</label>
                            <input type="text" id="action-reason" placeholder="Nhập lý do..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                        </div>
                        <button onClick={() => {window.app.submitMemberAction()}} className="w-full mt-2 font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center text-white" id="action-submit-btn">
                            Xác nhận
                        </button>
                    </div>
                </div>
            </div>
            {/* File JavaScript tùy chỉnh */}
            
      </div>
      <Script src="/panel.js" type="module" strategy="afterInteractive" />
    </>
  );
}
