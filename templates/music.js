let currentGuildId = null;
let pollingInterval = null;
let globalDuration = 0;
let currentPlaybackTime = 0;
let syncTimer = null;
let isDraggingVolume = false;
let volumeDebounceTimer = null;
let currentVolume = 100;
let previousVolume = 100;
let isDraggingQueue = false;
let queueSortable = null;

function shuffleQueue() {
    sendAction('shuffle');
}

function isRunningInDiscord() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateProgressBarUI() {
    if (globalDuration > 0) {
        const percent = (currentPlaybackTime / globalDuration) * 100;
        document.getElementById('progress-bar-fill').style.width = `${Math.min(percent, 100)}%`;
        document.getElementById('time-current').innerText = formatTime(currentPlaybackTime);
    }
}

function seekMusic(event) {
    if (!currentGuildId || globalDuration === 0) return;
    const container = document.getElementById('progress-bar-container');
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * globalDuration;
    currentPlaybackTime = targetTime;
    updateProgressBarUI();
    sendAction('seek', { position: targetTime });
}

async function init() {
    try {
        document.cookie = "sameSite=None; secure";
        const res = await fetch('/api/user');
        const authData = await res.json();
        if(authData.authenticated) {
            document.getElementById('auth-overlay').classList.add('opacity-0', 'pointer-events-none');
            document.getElementById('app-container').classList.remove('opacity-0', 'pointer-events-none');
            document.getElementById('player-bar').classList.remove('opacity-0', 'pointer-events-none');
            document.getElementById('user-username').innerText = authData.user.username;
            if(authData.user.avatar) {
                document.getElementById('user-avatar').src = authData.user.avatar;
            }
            await loadServers();
            startPolling();
        } else {
            document.getElementById('auth-overlay').style.display = 'flex';
            document.getElementById('auth-overlay').classList.remove('opacity-0');
        }
    } catch (e) {
        console.error("Lỗi khởi tạo", e);
    }
}

async function handleLogin() {
    if (!isRunningInDiscord()) {
        showToast('Đang chuyển hướng đến trang đăng nhập...', 'info');
        window.location.href = '/login';
        return;
    }
    try {
        if (!window.discordSdk || !window.sdkReadyPromise) {
            throw new Error('Discord SDK chưa được tải. Hãy tải lại trang.');
        }
        if (!window.sdkReady) {
            showToast('Đang khởi tạo Discord SDK...', 'info');
            await window.sdkReadyPromise;
        }
        if (!window.sdkReady) {
            throw window.sdkError || new Error('Discord SDK không sẵn sàng.');
        }
        showToast('Đang kết nối Discord SDK...', 'info');
        const { code } = await window.discordSdk.commands.authorize({
            client_id: '1541005812951162920',
            response_type: 'code',
            state: '',
            prompt: 'none',
            scope: ['identify', 'guilds']
        });
        const response = await fetch('/api/discord-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Lỗi lấy token từ backend');
        }
        await window.discordSdk.commands.authenticate({
            access_token: data.access_token
        });
        document.getElementById('auth-overlay').classList.add('opacity-0', 'pointer-events-none');
        document.getElementById('app-container').classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('player-bar').classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('user-username').innerText = data.user.username;
        if (data.user.avatar) {
            document.getElementById('user-avatar').src = data.user.avatar;
        }
        await loadServers();
        startPolling();
        showToast('Xác thực SDK thành công!', 'success');
    } catch (error) {
        console.error("Login failed:", error);
        showToast("Đăng nhập thất bại: " + error.message, "error");
    }
}

async function loadServers() {
    try {
        const res = await fetch('/api/servers');
        const servers = await res.json();
        const serverSelect = document.getElementById('server-select');
        serverSelect.innerHTML = servers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        if(servers.length > 0) {
            currentGuildId = servers[0].id;
            await loadVoiceChannels(currentGuildId);
            serverSelect.addEventListener('change', async (e) => {
                currentGuildId = e.target.value;
                await loadVoiceChannels(currentGuildId);
                fetchMusicState();
            });
        }
    } catch(e) { console.error("Lỗi load server", e); }
}

async function loadVoiceChannels(guildId) {
    try {
        const res = await fetch(`/api/servers/${guildId}/voice_channels`);
        const channels = await res.json();
        const channelSelect = document.getElementById('channel-select');
        channelSelect.innerHTML = channels.length === 0 ? '<option value="">Không có kênh thoại</option>' :
            channels.map(c => `<option value="${c.id}">🔊 ${c.name}</option>`).join('');
    } catch (e) { console.error("Lỗi load kênh thoại", e); }
}

function startPolling() {
    if(pollingInterval) clearInterval(pollingInterval);
    fetchMusicState();
    pollingInterval = setInterval(fetchMusicState, 2000);
}

async function fetchMusicState() {
    if(!currentGuildId) return;
    try {
        const res = await fetch(`/api/music/state?guild_id=${currentGuildId}`);
        if(!res.ok) return;
        const data = await res.json();
        updateUI(data);
    } catch (e) { console.error("Lỗi đồng bộ trạng thái", e); }
}

async function sendAction(action, payload = {}) {
    if(!currentGuildId) return showToast('Chưa chọn server', 'error');
    try {
        const res = await fetch('/api/music/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guild_id: currentGuildId, action, ...payload })
        });
        const data = await res.json();
        if(data.success) fetchMusicState();
        else showToast(data.error || 'Lỗi thao tác', 'error');
    } catch (e) { showToast('Mất kết nối server', 'error'); }
}

function updateUI(state) {
    const dot = document.getElementById('bot-status-dot');
    const txt = document.getElementById('bot-status-text');
    const btnInvite = document.getElementById('btn-invite');
    if(state.connected) {
        dot.className = "w-2 h-2 rounded-full bg-[#23A559]";
        txt.innerText = state.channel_name;
        btnInvite.innerHTML = `<i class="ph ph-power"></i> Ngắt kết nối`;
        btnInvite.className = "w-full bg-discord-danger hover:bg-red-500 text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 text-sm";
        btnInvite.onclick = function() { sendAction('leave'); };
    } else {
        dot.className = "w-2 h-2 rounded-full bg-discord-danger";
        txt.innerText = "Ngắt kết nối";
        btnInvite.innerHTML = `<i class="ph ph-plugs"></i> Kết nối Bot`;
        btnInvite.className = "w-full bg-[#23A559] hover:bg-[#1A7C43] text-white font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 text-sm";
        btnInvite.onclick = inviteBot;
    }
    const playIcon = document.getElementById('play-pause-icon');
    const isPlayingState = state.is_playing && !state.is_paused;
    playIcon.className = isPlayingState ? 'ph-fill ph-pause text-xl' : 'ph-fill ph-play text-xl';
    const npThumb = document.getElementById('np-thumbnail');
    const npFallback = document.getElementById('np-icon-fallback');
    if(state.now_playing && state.now_playing.thumb) {
        npThumb.src = state.now_playing.thumb;
        npThumb.classList.remove('hidden');
        npFallback.classList.add('hidden');
        document.getElementById('np-title').innerText = state.now_playing.title;
        document.getElementById('np-author').innerText = state.now_playing.author;
        document.getElementById('time-total').innerText = state.now_playing.duration;
        globalDuration = state.now_playing.duration_seconds || 0;
        currentPlaybackTime = state.now_playing.current_time || 0;
        updateProgressBarUI();
        if (syncTimer) clearInterval(syncTimer);
        if (isPlayingState) {
            syncTimer = setInterval(() => {
                currentPlaybackTime += 1;
                if (currentPlaybackTime > globalDuration) currentPlaybackTime = globalDuration;
                updateProgressBarUI();
            }, 1000);
        }
    } else {
        npThumb.classList.add('hidden');
        npFallback.classList.remove('hidden');
        document.getElementById('np-title').innerText = "Chưa có bài hát";
        document.getElementById('np-author').innerText = "...";
        document.getElementById('time-current').innerText = "0:00";
        document.getElementById('time-total').innerText = "0:00";
        document.getElementById('progress-bar-fill').style.width = "0%";
        globalDuration = 0;
        currentPlaybackTime = 0;
        if (syncTimer) clearInterval(syncTimer);
    }
    if(state.playlists) {
        document.getElementById('playlist-container').innerHTML = state.playlists.map(pl => `
            <li>
                <a href="#" onclick="sendAction('play', {query: '${pl.name}'})" class="flex items-center py-2 px-2 rounded hover:bg-discord-hover text-discord-muted hover:text-discord-text transition-colors group">
                    <i class="ph ${pl.icon} text-lg mr-3 group-hover:text-white transition-colors"></i>
                    <span class="flex-1 truncate">${pl.name}</span>
                </a>
            </li>
        `).join('');
    }
    const qList = document.getElementById('queue-list');
    document.getElementById('queue-count').innerText = `${state.queue.length} bài`;
    if (!isDraggingQueue) {
        if(state.queue.length === 0) {
            qList.innerHTML = `<div class="flex flex-col items-center justify-center py-10 text-discord-muted"><i class="ph ph-ghost text-4xl mb-2"></i><p>Hàng chờ rỗng</p></div>`;
        } else {
            // Thêm icon "drag-handle" (6 dấu chấm) để kéo thả
            qList.innerHTML = state.queue.map((song, i) => `
                <li class="group flex items-center p-2 rounded-md hover:bg-discord-hover transition-colors" data-index="${i}">
                    <i class="ph ph-dots-six-vertical text-discord-muted hover:text-white cursor-grab drag-handle mr-2 text-xl" title="Kéo để di chuyển"></i>
                    <span class="w-6 text-center text-xs text-discord-muted">${i + 1}</span>
                    <div class="flex-1 min-w-0 flex flex-col pl-2">
                        <div class="text-sm font-medium text-discord-text truncate">${song.title}</div>
                        <div class="text-xs text-discord-muted truncate">${song.author}</div>
                    </div>
                    <span class="text-xs text-discord-muted mx-4 font-mono">${song.duration}</span>
                    <button onclick="sendAction('remove', {song_id: '${song.id}'})" class="opacity-0 group-hover:opacity-100 text-discord-muted hover:text-discord-danger p-1">
                        <i class="ph ph-trash"></i>
                    </button>
                </li>
            `).join('');
        }
        // Khởi tạo tính năng kéo thả
        initSortable();
    }
    if(state.queue.length === 0) {
        qList.innerHTML = `<div class="flex flex-col items-center justify-center py-10 text-discord-muted"><i class="ph ph-ghost text-4xl mb-2"></i><p>Hàng chờ trống</p></div>`;
    } else {
        qList.innerHTML = state.queue.map((song, i) => `
            <li class="group flex items-center p-2 rounded-md hover:bg-discord-hover transition-colors">
                <span class="w-8 text-center text-xs text-discord-muted">${i + 1}</span>
                <div class="flex-1 min-w-0 flex flex-col pl-2">
                    <div class="text-sm font-medium text-discord-text truncate">${song.title}</div>
                    <div class="text-xs text-discord-muted truncate">${song.author}</div>
                </div>
                <span class="text-xs text-discord-muted mx-4 font-mono">${song.duration}</span>
                <button onclick="sendAction('remove', {song_id: '${song.id}'})" class="opacity-0 group-hover:opacity-100 text-discord-muted hover:text-discord-danger p-1"><i class="ph ph-trash"></i></button>
            </li>
        `).join('');
    }
    const loopBtn = document.getElementById('loop-btn');
    const loopIcon = loopBtn.querySelector('i');
    loopBtn.className = state.loop_mode > 0 ? "text-discord-blurple transition-colors" : "text-discord-muted hover:text-white transition-colors";
    loopIcon.className = state.loop_mode === 2 ? "ph ph-repeat-once text-lg" : "ph ph-repeat text-lg";
    if (state.volume !== undefined) {
        currentVolume = state.volume;
        if (currentVolume > 0) previousVolume = currentVolume;
        document.getElementById('volume-text').innerText = `${currentVolume}%`;
        const volIcon = document.getElementById('volume-icon');
        if (currentVolume === 0) volIcon.className = "ph ph-speaker-x text-discord-muted text-lg";
        else if (currentVolume < 50) volIcon.className = "ph ph-speaker-low text-discord-muted text-lg";
        else volIcon.className = "ph ph-speaker-high text-discord-muted text-lg";
    }
}

function addFromInput() {
    const inp = document.getElementById('youtube-input');
    if(!inp.value.trim()) return;
    sendAction('play', { query: inp.value.trim() });
    inp.value = '';
    showToast('Đang thêm bài hát/playlist...', 'success');
}

function togglePlay() { sendAction('toggle_play'); }
function skipSong() { sendAction('skip'); }
function clearQueue() { sendAction('clear'); }
function inviteBot() {
    const cid = document.getElementById('channel-select').value;
    if(!cid) return showToast('Chọn kênh thoại trước', 'error');
    sendAction('join', { channel_id: cid });
}
function toggleLoop() { sendAction('loop'); }

function changeVolume(amount) {
    let newVol = currentVolume + amount;
    if (newVol > 100) newVol = 100;
    if (newVol < 0) newVol = 0;
    if (newVol !== currentVolume) {
        currentVolume = newVol;
        document.getElementById('volume-text').innerText = `${currentVolume}%`;
        sendAction('volume', { level: currentVolume });
    }
}

function toggleMute() {
    if (currentVolume > 0) {
        previousVolume = currentVolume;
        currentVolume = 0;
    } else {
        currentVolume = previousVolume > 0 ? previousVolume : 50;
    }
    document.getElementById('volume-text').innerText = `${currentVolume}%`;
    sendAction('volume', { level: currentVolume });
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `bg-discord-panel border border-discord-bg text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 transform transition-all duration-300 translate-x-full opacity-0`;
    t.innerHTML = `<i class="ph-fill ph-info text-xl text-discord-blurple"></i><span class="text-sm font-medium">${msg}</span>`;
    container.appendChild(t);
    requestAnimationFrame(() => t.classList.remove('translate-x-full', 'opacity-0'));
    setTimeout(() => { t.classList.add('translate-x-full', 'opacity-0'); setTimeout(() => t.remove(), 300); }, 3000);
}

// Khởi tạo SortableJS
function initSortable() {
    const qList = document.getElementById('queue-list');
    if (qList && typeof Sortable !== 'undefined' && !queueSortable) {
        queueSortable = new Sortable(qList, {
            handle: '.drag-handle', // Chỉ kéo thả khi chuột chỉ vào icon 6 dấu chấm
            animation: 150,
            ghostClass: 'sortable-ghost',
            onStart: function () {
                isDraggingQueue = true; // Chặn polling update lại UI khi đang kéo
            },
            onEnd: function (evt) {
                isDraggingQueue = false;
                if (evt.oldIndex !== evt.newIndex) {
                    // Gửi API về backend với vị trí cũ và vị trí mới
                    sendAction('reorder', { from: evt.oldIndex, to: evt.newIndex });
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.handleLogin = handleLogin;
    window.togglePlay = togglePlay;
    window.skipSong = skipSong;
    window.clearQueue = clearQueue;
    window.inviteBot = inviteBot;
    window.toggleLoop = toggleLoop;
    window.changeVolume = changeVolume;
    window.toggleMute = toggleMute;
    window.addFromInput = addFromInput;
    window.seekMusic = seekMusic;
    window.shuffleQueue = shuffleQueue;
    document.getElementById('youtube-input').addEventListener('keypress', e => {
        if(e.key === 'Enter') addFromInput();
    });
    init();
});
// ==========================================
// TÍNH NĂNG VUỐT XUỐNG ĐỂ LÀM MỚI (MOBILE)
// ==========================================
function setupPullToRefresh() {
    // Tránh chạy trên PC (chỉ kích hoạt khi thiết bị hỗ trợ cảm ứng)
    if (!('ontouchstart' in window)) return;
    // Tạo giao diện biểu tượng Load
    const ptrIndicator = document.createElement('div');
    ptrIndicator.id = 'ptr-indicator';
    // Giao diện vòng tròn nổi bật
    ptrIndicator.className = 'fixed top-0 left-1/2 -translate-x-1/2 -translate-y-[100px] w-10 h-10 bg-indigo-500 rounded-full shadow-lg flex items-center justify-center z-[150] transition-transform duration-300 pointer-events-none text-white';
    ptrIndicator.innerHTML = '<i class="ph-bold ph-arrow-down text-xl transition-transform duration-200" id="ptr-icon"></i>';
    document.body.appendChild(ptrIndicator);
    const icon = document.getElementById('ptr-icon');
    let startY = 0;
    let isPulling = false;
    let isRefreshing = false;
    // Lắng nghe khi ngón tay chạm vào màn hình
    document.addEventListener('touchstart', (e) => {
        if (isRefreshing) return;
        // Kiểm tra xem vị trí cuộn có đang ở trên cùng (Top = 0) hay không
        const scrollTarget = e.target.closest('.overflow-y-auto, .overflow-x-auto, main, aside') || document.documentElement;
        if (scrollTarget.scrollTop <= 1) {
            startY = e.touches[0].clientY;
            isPulling = true;
            ptrIndicator.style.transition = 'none'; // Tắt animation để vuốt mượt theo tay
        }
    }, { passive: true });
    // Lắng nghe khi ngón tay vuốt di chuyển
    document.addEventListener('touchmove', (e) => {
        if (!isPulling || isRefreshing) return;
        const currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        // Nếu vuốt xuống (pullDistance > 0)
        if (pullDistance > 0) {
            // Làm chậm tốc độ kéo (hiệu ứng ma sát)
            const translateY = Math.min(pullDistance * 0.4, 70);
            ptrIndicator.style.transform = `translate(-50%, ${translateY - 50}px)`;
            // Xoay mũi tên dựa trên khoảng cách kéo
            icon.style.transform = `rotate(${translateY * 2.5}deg)`;
            // Nếu kéo đủ sâu, đổi icon thành spinner
            if (translateY > 55) {
                icon.className = 'ph-bold ph-spinner-gap animate-spin text-xl';
                icon.style.transform = `rotate(0deg)`;
            } else {
                icon.className = 'ph-bold ph-arrow-down text-xl';
            }
        }
    }, { passive: true });
    // Lắng nghe khi nhấc ngón tay ra
    document.addEventListener('touchend', (e) => {
        if (!isPulling || isRefreshing) return;
        isPulling = false;
        ptrIndicator.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // Hiệu ứng nảy (bounce)
        const currentY = e.changedTouches[0].clientY;
        const pullDistance = currentY - startY;
        const translateY = Math.min(pullDistance * 0.4, 70);
        // Kích hoạt làm mới nếu kéo qua vạch đích
        if (translateY > 55) {
            isRefreshing = true;
            ptrIndicator.style.transform = `translate(-50%, 20px)`; // Treo vòng tròn lại trên màn hình
            icon.className = 'ph-bold ph-spinner-gap animate-spin text-xl'; // Chắc chắn quay icon
            // Thực hiện tải lại (Reload trang) sau 0.5s để người dùng nhìn thấy hiệu ứng
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            // Nếu kéo nhẹ chưa đủ, thu hồi vòng tròn lên trên
            ptrIndicator.style.transform = 'translate(-50%, -100px)';
            icon.className = 'ph-bold ph-arrow-down text-xl';
        }
    });
}

// Chạy hàm kích hoạt khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    setupPullToRefresh();
});