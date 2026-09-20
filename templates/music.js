let currentGuildId = null;
let pollingInterval = null;
let globalDuration = 0;
let currentPlaybackTime = 0;
let syncTimer = null;
let isDraggingVolume = false;
let volumeDebounceTimer = null;
let currentVolume = 100;
let previousVolume = 100;

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
    if (!window.sdkReady) {
        showToast('Discord SDK đang khởi tạo, vui lòng thử lại sau giây lát...', 'error');
        return;
    }
    try {
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

    document.getElementById('youtube-input').addEventListener('keypress', e => {
         if(e.key === 'Enter') addFromInput(); 
     });
    init();
});