import discord
import yt_dlp # Thư viện cốt lõi để lấy thông tin/link stream từ YouTube
import asyncio # Xử lý các tác vụ bất đồng bộ (chạy ngầm, hẹn giờ)
import json # Đọc/Ghi file cấu hình, playlist, hàng đợi
import os
import re # Biểu thức chính quy (dùng để kiểm tra xem chuỗi có phải là URL không)
import time # Xử lý thời gian thực (dùng cho tính năng tua nhạc - seek)
import random # Dùng cho tính năng trộn bài (Shuffle)
from typing import Any, cast
from discord import app_commands # Xây dựng Slash Commands (/play, /stop...)
from discord.ext import commands, tasks # 'tasks' dùng để tạo vòng lặp chạy ngầm đồng bộ với Web
from discord.ui import Button, View, Select # Xây dựng giao diện nút bấm, menu dropdown
from dotenv import load_dotenv

# ====================================================
# 1. CẤU HÌNH & HẰNG SỐ CƠ BẢN
# ====================================================
load_dotenv()

# Lấy các biến môi trường từ file .env
PROXY_URL = os.getenv("PROXY_URL")
DATA_FOLDER = os.getenv("DATA_FOLDER", "data")

# Đường dẫn đến các file lưu trữ dữ liệu của bot
QUEUE_FILE = os.path.join(DATA_FOLDER, "saved_queues.json") # Lưu hàng chờ khi bot tắt
PLAYLIST_FILE = os.path.join(DATA_FOLDER, "playlists.json") # Lưu playlist cá nhân
SETTINGS_FILE = os.path.join(DATA_FOLDER, "server_settings.json") # Lưu cài đặt (âm lượng, kênh nhạc...)
SEARCH_LIMIT = 5 # Số lượng kết quả hiển thị khi tìm kiếm nhạc

# --- BỘ LỌC ÂM THANH (FFMPEG AUDIO FILTERS) ---
# Đây là các tham số truyền vào FFmpeg để biến đổi âm thanh
FFMPEG_FILTERS = {
    "Off": None,
    "Bassboost": "bass=g=20,dynaudnorm:f=200", # Tăng âm trầm
    "Nightcore": "asetrate=48000*1.25,aresample=48000,bass=g=5", # Tăng tốc độ và cao độ
    "Vaporwave": "aresample=48000,asetrate=48000*0.8", # Làm chậm âm thanh
    "8D": "apulsator=hz=0.125", # Đảo âm thanh từ trái sang phải
    "Pop": "equalizer=f=1000:t=q:w=1:g=2,equalizer=f=100:t=q:w=2:g=-5",
    "Soft": "lowpass=f=500",
    "Treble": "treble=g=5" # Tăng âm cao
}

# --- CẤU HÌNH YT-DLP ---
YDL_OPTIONS = {
    'format': 'bestaudio/best', # Lấy chất lượng âm thanh tốt nhất
    'noplaylist': False, # Cho phép tải playlist
    'extract_flat': 'in_playlist', # Lấy nhanh danh sách playlist mà không tải toàn bộ thông tin
    'quiet': True, # Tắt log rác trên console
    'no_warnings': True,
    'default_search': 'auto',
    'source_address': '0.0.0.0',
    'nocheckcertificate': True,
    'cachedir': False,
}

# Nếu có dùng Proxy để tránh YouTube chặn IP
if PROXY_URL:
    YDL_OPTIONS['proxy'] = PROXY_URL
    print(f"🌐 Đã kích hoạt proxy cho trình phát nhạc")

# --- CẤU HÌNH FFMPEG ---
FFMPEG_OPTIONS = {
    # reconnect: Tự động kết nối lại nếu rớt mạng giữa chừng khi stream từ Youtube
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
    'options': '-vn' # -vn = Không xử lý Video (Video No), chỉ lấy Audio để giảm giật lag
}

# Hàm kiểm tra xem chuỗi nhập vào có phải là link hay không
def is_url(string):
    regex = r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+"
    return re.match(regex, string) is not None

# ====================================================
# 2. UI COMPONENTS (GIAO DIỆN TIN NHẮN DISCORD)
# ====================================================

# Menu Dropdown để chọn bài hát từ kết quả tìm kiếm
class SongSelect(discord.ui.Select):
    def __init__(self, cog, interaction, songs_list):
        self.cog = cog; self.origin_interaction = interaction; self.songs_list = songs_list
        options = []
        for index, song in enumerate(songs_list):
            label = f"{index + 1}. {song['title'][:90]}" # Tạo danh sách lựa chọn 1, 2, 3...
            options.append(discord.SelectOption(label=label, value=str(index)))
        super().__init__(placeholder=f"🔻 Tìm thấy {len(songs_list)} bài...", min_values=1, max_values=1, options=options)
    
    async def callback(self, interaction: discord.Interaction):
        # Khi user chọn bài, ẩn menu đi và bắt đầu thêm nhạc vào hàng chờ
        await interaction.response.edit_message(content=f"✅ Đã chọn: **{self.songs_list[int(self.values[0])]['title']}**", view=None)
        await self.cog.process_song_request(self.origin_interaction, self.songs_list[int(self.values[0])], from_selection=True)

class SongSelectionView(discord.ui.View):
    def __init__(self, cog, interaction, songs_list):
        super().__init__(timeout=180); self.add_item(SongSelect(cog, interaction, songs_list))

# Giao diện Bảng Điều Khiển (Play, Pause, Skip, Loop, Volume) gắn dưới mỗi bài hát
class MusicController(discord.ui.View):
    def __init__(self, cog, guild_id, song_info):
        super().__init__(timeout=None); self.cog = cog; self.guild_id = guild_id; self.song_info = song_info

    # Hàm này chặn không cho người ngoài kênh Voice bấm nút
    async def interaction_check(self, interaction: discord.Interaction):
        guild = interaction.guild
        member = interaction.user if isinstance(interaction.user, discord.Member) else (guild.get_member(interaction.user.id) if guild else None)
        # Kiểm tra: Server tồn tại, User ở trong voice, Bot ở trong voice, và User & Bot ở CÙNG MỘT KÊNH
        if guild and member and member.voice and guild.voice_client and member.voice.channel == guild.voice_client.channel:
            return True
        await interaction.response.send_message("❌ Vào Voice trước!", ephemeral=True)
        return False

    # Hàm tiện ích để phản hồi tin nhắn mà không gây lỗi "Interaction Failed"
    async def _safe_reply(self, interaction: discord.Interaction, message=None, ephemeral=False, defer=False):
        if defer or message is None:
            if not interaction.response.is_done(): await interaction.response.defer()
            return
        if interaction.response.is_done(): await interaction.followup.send(message, ephemeral=ephemeral)
        else: await interaction.response.send_message(message, ephemeral=ephemeral)

    # Khởi tạo Embed hiển thị thông tin bài hát
    def create_embed(self):
        loop_status = self.cog.loops.get(self.guild_id, False)
        volume = self.cog.volumes.get(self.guild_id, 0.5)
        current_filter_name = "Off"
        current_filter_val = self.cog.current_filters.get(self.guild_id)
        
        # Tìm tên của bộ lọc hiện tại để hiển thị
        for name, val in FFMPEG_FILTERS.items():
            if val == current_filter_val:
                current_filter_name = name; break

        embed = discord.Embed(title="🎶 Đang phát nhạc", description=f"**{self.song_info['title']}**", color=discord.Color.purple())
        if self.song_info.get('thumbnail'): embed.set_thumbnail(url=self.song_info['thumbnail'])
        embed.set_footer(text=f"Vol: {int(volume*100)}% | Loop: {'Bật' if loop_status else 'Tắt'} | Tune: {current_filter_name}")
        return embed

    # --- ĐỊNH NGHĨA CÁC NÚT BẤM ---
    @discord.ui.button(emoji="⏸️", style=discord.ButtonStyle.secondary, row=0, custom_id="btn_pause")
    async def pause_resume(self, interaction: discord.Interaction, button: discord.ui.Button):
        guild = interaction.guild
        vc = guild.voice_client if guild else None
        if vc and isinstance(vc, discord.VoiceClient):
            if vc.is_playing():
                self.cog.pause_music(self.guild_id)
                button.emoji = "▶️" # Đổi icon sang Play
                await self.cog.update_channel_status(self.guild_id, None)
            elif vc.is_paused():
                self.cog.resume_music(self.guild_id)
                button.emoji = "⏸️" # Đổi icon sang Pause
                song_title = self.song_info.get('title', 'Unknown')
                await self.cog.update_channel_status(self.guild_id, f"🎶 {song_title}"[:500])
            await self.cog.update_ui(self.guild_id) # Cập nhật lại giao diện
        await self._safe_reply(interaction, defer=True)

    @discord.ui.button(emoji="⏭️", style=discord.ButtonStyle.secondary, row=0)
    async def skip(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.cog.skip_song(interaction.guild_id)
        await self._safe_reply(interaction, "⏭️ Skip", ephemeral=True)

    @discord.ui.button(emoji="🔀", style=discord.ButtonStyle.secondary, row=0)
    async def shuffle(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.cog.shuffle_queue(self.guild_id)
        await self._safe_reply(interaction, "🔀 Đã trộn hàng đợi.", ephemeral=True)
        await self.cog.update_ui(self.guild_id)

    @discord.ui.button(emoji="🔂", style=discord.ButtonStyle.secondary, row=0)
    async def loop(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.cog.loops[self.guild_id] = not self.cog.loops.get(self.guild_id, False)
        await self.cog.update_ui(self.guild_id)
        await self._safe_reply(interaction, defer=True)

    @discord.ui.button(emoji="📜", style=discord.ButtonStyle.secondary, row=0)
    async def queue_list(self, interaction: discord.Interaction, button: discord.ui.Button):
        msg = "\n".join([f"{i+1}. {s['title']}" for i, s in enumerate(self.cog.queues.get(self.guild_id, [])[:10])]) or "Trống"
        await self._safe_reply(interaction, f"**Queue:**\n{msg}", ephemeral=True)

    @discord.ui.button(emoji="🔉", style=discord.ButtonStyle.gray, row=1)
    async def vol_down(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.change_vol(interaction, -0.1) # Giảm 10% âm lượng

    @discord.ui.button(emoji="🔊", style=discord.ButtonStyle.gray, row=1)
    async def vol_up(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.change_vol(interaction, 0.1) # Tăng 10% âm lượng

    @discord.ui.button(emoji="🛑", style=discord.ButtonStyle.danger, row=1)
    async def stop(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.cog.stop_player(interaction.guild_id)
        await self._safe_reply(interaction, "🛑 Stopped", ephemeral=True)

    async def change_vol(self, interaction, change):
        guild = interaction.guild
        vc = guild.voice_client if guild else None
        if vc and vc.source:
            # Tính toán volume mới, chặn ở mức 0.0 (0%) và 1.0 (100%)
            self.cog.volumes[self.guild_id] = round(max(0.0, min(1.0, self.cog.volumes.get(self.guild_id, 0.5) + change)), 2)
            vc.source.volume = self.cog.volumes[self.guild_id] # Cập nhật volume trực tiếp vào FFmpeg
            await self.cog.update_ui(self.guild_id)
            await self._safe_reply(interaction, defer=True)
            return
        await self._safe_reply(interaction, "❌ Không có âm thanh để chỉnh.", ephemeral=True)

# Các class hỗ trợ hiển thị Playlist cá nhân
class PlaylistSongSelect(discord.ui.Select):
    def __init__(self, cog, interaction, songs_list, playlist_name):
        self.cog = cog; self.origin_interaction = interaction; self.songs_list = songs_list
        options = [discord.SelectOption(label=f"{i+1}. {s['title'][:90]}", value=str(i)) for i, s in enumerate(songs_list[:25])]
        super().__init__(placeholder=f"📂 Chọn bài trong '{playlist_name}'...", min_values=1, max_values=1, options=options)
    async def callback(self, interaction: discord.Interaction):
        await interaction.response.edit_message(content=f"✅ Chọn: **{self.songs_list[int(self.values[0])]['title']}**", view=None)
        await self.cog.process_song_request(self.origin_interaction, self.songs_list[int(self.values[0])], from_selection=True)

class PlaylistSelectionView(discord.ui.View):
    def __init__(self, cog, interaction, songs_list, playlist_name):
        super().__init__(timeout=180); self.add_item(PlaylistSongSelect(cog, interaction, songs_list, playlist_name))

class PrioritizeSelect(discord.ui.Select):
    def __init__(self, cog, interaction, queue_list):
        self.cog = cog; self.guild_id = interaction.guild_id
        options = [discord.SelectOption(label=f"{i+1}. {s['title'][:90]}", value=str(i)) for i, s in enumerate(queue_list[:25])]
        super().__init__(placeholder="🔻 Chọn bài ưu tiên...", min_values=1, max_values=1, options=options)
    async def callback(self, interaction: discord.Interaction):
        await interaction.response.defer()
        if self.cog.move_song(self.guild_id, int(self.values[0]), 0): await interaction.followup.send("✅ Đã đưa lên đầu!", ephemeral=True)
        else: await interaction.followup.send("❌ Lỗi", ephemeral=True)

class PrioritizeView(discord.ui.View):
    def __init__(self, cog, interaction, queue_list):
        super().__init__(timeout=60); self.add_item(PrioritizeSelect(cog, interaction, queue_list))

# ====================================================
# 3. LÕI HỆ THỐNG ÂM NHẠC (CORE LOGIC)
# ====================================================

# Class MusicPlayer này dường như là bản nháp cũ của bạn, không được gọi trong logic chính. Giữ nguyên theo code gốc.
class MusicPlayer:
    def __init__(self):
        self.current_song = None
        self.start_time = 0
        self.eleapsed_time = 0
    def play_song(self, song_url, seek_time=0):
        self.current_song = song_url
        self.start_time = time.time() -seek_time
        options = FFMPEG_OPTIONS.copy()

class Music(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        
        # --- CÁC BIẾN QUẢN LÝ TRẠNG THÁI SERVER ---
        self.channel_status_enabled = {}
        self.queues = {} # Hàng chờ nhạc {guild_id: [bai1, bai2...]}
        self.loops = {} # Trạng thái lặp {guild_id: True/False}
        self.volumes = {} # Âm lượng {guild_id: 0.5}
        self.current_songs = {} # Bài đang hát {guild_id: info}
        self.ui_messages = {} # Lưu ID tin nhắn Bảng điều khiển để tự động Edit thay vì gửi rác
        self.active_tasks = {} # Tác vụ phát nhạc (Player Loop)
        self.manual_stops = {} # Cờ đánh dấu người dùng bấm Stop
        self.force_skips = {} # Cờ đánh dấu người dùng bấm Skip
        
        # --- CÁC BIẾN QUẢN LÝ TUA NHẠC (SEEK) ---
        self.start_times = {} # Thời điểm bắt đầu phát bài hát
        self.current_offsets = {} # Thời gian đã tua
        self.seek_flags = {} # Đánh dấu đang thực hiện lệnh tua
        self.seek_pos = {} # Giây muốn tua tới
        self.pause_times = {} # Lưu thời gian bắt đầu Pause để bù trừ thanh thời gian
        
        self.current_filters = {} # Bộ lọc âm thanh hiện tại
        self.idle_timers = {} # Bộ đếm ngược 15 phút (AFK Timer)
        self.players = {}

        # Khởi tạo thư mục và đọc cấu hình
        if not os.path.exists(DATA_FOLDER): os.makedirs(DATA_FOLDER)
        self.playlists = self.load_json(PLAYLIST_FILE)
        self.settings = self.load_json(SETTINGS_FILE)
        
        # Bắt đầu vòng lặp đồng bộ dữ liệu ngầm cho Web Panel
        self.web_state_sync_task.start()

    def cog_unload(self):
        """Hàm này chạy khi reload file music.py hoặc tắt bot"""
        self.save_queues_to_file() # Tự động sao lưu hàng chờ
        self.web_state_sync_task.cancel() # Hủy vòng lặp web sync
        # Đuổi bot ra khỏi tất cả các kênh thoại để tránh kẹt process FFmpeg
        for gid in self.bot.voice_clients:
            try: gid.disconnect(force=True)
            except: pass

    # ====================================================
    # 4. TÍCH HỢP WEB PANEL (ĐỒNG BỘ & LẮNG NGHE LỆNH WEB)
    # ====================================================
    
    @tasks.loop(seconds=1.5)
    async def web_state_sync_task(self):
        """
        [CHẠY NGẦM MỖI 1.5 GIÂY] 
        Dịch dữ liệu từ các biến nội bộ (self.queues, self.volumes...) 
        sang một biến chung (bot.music_state) để Flask (Web) có thể đọc được.
        """
        if not hasattr(self.bot, 'music_state'):
            self.bot.music_state = {}
            
        for guild in self.bot.guilds:
            gid = guild.id
            queue = self.queues.get(gid, [])
            now_playing = self.current_songs.get(gid, None)
            
            # Đóng gói thông tin bài đang phát
            web_np = None
            if now_playing:
                dur = now_playing.get('duration', 0)
                dur_str = f"{dur // 60}:{dur % 60:02d}" if isinstance(dur, int) else str(dur)
                web_np = {
                    'id': now_playing.get('webpage_url', ''),
                    'title': now_playing.get('title', 'Unknown'),
                    'author': now_playing.get('channel', 'Unknown'),
                    'duration': dur_str,
                    'thumb': now_playing.get('thumbnail', ''),
                    'url': now_playing.get('webpage_url', '')
                }
                
            # Đóng gói thông tin hàng chờ
            web_queue = []
            for s in queue:
                dur = s.get('duration', 0)
                dur_str = f"{dur // 60}:{dur % 60:02d}" if isinstance(dur, int) else str(dur)
                web_queue.append({
                    'id': s.get('webpage_url', ''),
                    'title': s.get('title', 'Unknown'),
                    'author': s.get('channel', 'Unknown'),
                    'duration': dur_str,
                    'thumb': s.get('thumbnail', ''),
                    'url': s.get('webpage_url', '')
                })
                
            # Đóng gói danh sách playlists
            playlists_web = []
            pl_id = 1
            for uid, pldata in self.playlists.items():
                for pl_name, songs in pldata.items():
                    playlists_web.append({'id': pl_id, 'name': pl_name, 'count': len(songs), 'icon': 'ph-playlist'})
                    pl_id += 1
                    
            # Gán vào biến chung
            self.bot.music_state[gid] = {
                'queue': web_queue,
                'now_playing': web_np,
                'volume': int(self.volumes.get(gid, self.get_default_volume(gid)) * 100),
                'is_loop': 1 if self.loops.get(gid, False) else 0,
                'playlists': playlists_web
            }

    @commands.Cog.listener()
    async def on_web_music_action(self, guild_id: int, user_id: str, action: str, data: dict):
        """
        [LẮNG NGHE LỆNH TỪ WEB]
        Bắt sự kiện 'web_music_action' được kích hoạt từ webserver.py 
        thông qua hàm `bot.loop.call_soon_threadsafe(bot.dispatch...)`
        """
        guild = self.bot.get_guild(guild_id)
        if not guild: return
        vc = guild.voice_client

        try:
            if action == 'join':
                # Web ra lệnh bot tham gia kênh thoại
                channel_id = data.get('channel_id')
                if channel_id:
                    voice_channel = guild.get_channel(int(channel_id))
                    if voice_channel:
                        if vc and vc.is_connected(): await vc.move_to(voice_channel)
                        else: await voice_channel.connect()

            elif action == 'play':
                query = data.get('query')
                if not query: return
                
                # Tự động join nếu user đang ở trong voice channel
                member = guild.get_member(int(user_id))
                if member and member.voice and member.voice.channel:
                    if not vc or not vc.is_connected(): await member.voice.channel.connect()
                    elif vc.channel != member.voice.channel: await vc.move_to(member.voice.channel)
                        
                setup_id = self.settings.get(str(guild_id), {}).get("music_channel_id")
                target_channel = self.bot.get_channel(int(setup_id)) if setup_id else None
                
                # Xử lý lấy link hoặc tìm kiếm và đẩy vào hàng chờ gốc
                if is_url(query):
                    info = await self.get_song_info(query)
                    if info: await self._web_process_song(guild_id, info, target_channel)
                else:
                    res = await self.search_youtube(query)
                    if res: await self._web_process_song(guild_id, res[0], target_channel)

            elif action == 'toggle_play':
                # Nút Play/Pause trên Web
                if vc:
                    if vc.is_playing(): self.pause_music(guild_id)
                    elif vc.is_paused(): self.resume_music(guild_id)
                    await self.update_ui(guild_id)

            elif action == 'skip':
                # Nút Skip trên web
                await self.skip_song(guild_id)

            elif action == 'clear':
                # Nút xóa hàng chờ trên web
                if guild_id in self.queues: self.queues[guild_id].clear()
                await self.update_ui(guild_id)

            elif action == 'remove':
                # Xóa 1 bài cụ thể trong hàng chờ trên Web
                song_id = data.get('song_id')
                if guild_id in self.queues:
                    self.queues[guild_id] = [s for s in self.queues[guild_id] if s.get('webpage_url') != song_id]
                await self.update_ui(guild_id)

            elif action == 'volume':
                # Kéo thanh âm lượng trên Web
                vol = int(data.get('level', 100)) / 100
                self.volumes[guild_id] = vol
                if vc and vc.source: vc.source.volume = vol
                await self.update_ui(guild_id)

            elif action == 'loop':
                # Nút lặp bài trên web
                self.loops[guild_id] = not self.loops.get(guild_id, False)
                await self.update_ui(guild_id)
                
        except Exception as e:
            print(f"Lỗi khi xử lý Web Music Action: {e}")

    async def _web_process_song(self, guild_id, song_data, channel):
        """Hàm nội bộ giúp chuẩn hóa format nhạc từ web trước khi ném vào Queue"""
        if guild_id not in self.queues: self.queues[guild_id] = []
        
        # Xử lý nếu là Playlist
        if isinstance(song_data, list):
            for item in song_data:
                web_url = item.get('webpage_url') or item.get('url')
                if web_url and "http" not in web_url: web_url = f"https://www.youtube.com/watch?v={web_url}"
                final_data = {'stream_url': None, 'webpage_url': web_url, 'title': item.get('title', 'Unknown'), 'thumbnail': item.get('thumbnail'), 'channel': item.get('uploader', 'Unknown'), 'duration': item.get('duration', 0)}
                self.queues[guild_id].append(final_data)
        # Xử lý nếu là bài lẻ
        else:
            final_data = song_data if 'stream_url' in song_data else {
                'stream_url': None, 'webpage_url': song_data.get('webpage_url') or song_data.get('url'),
                'title': song_data['title'], 'thumbnail': song_data.get('thumbnail'), 'channel': song_data.get('channel', 'Unknown'),
                'duration': song_data.get('duration', 0)
            }
            self.queues[guild_id].append(final_data)

        # Đánh thức player_loop nếu nó đang ngủ hoặc chưa chạy
        if guild_id not in self.active_tasks or self.active_tasks[guild_id].done(): 
            if channel: await self.start_playing(channel, guild_id)

    # ====================================================
    # 5. XỬ LÝ KHÔI PHỤC, ĐỌC GHI DỮ LIỆU
    # ====================================================

    def save_queues_to_file(self):
        """Lưu toàn bộ hàng chờ hiện tại của mọi server ra file JSON"""
        data = {}
        for gid, queue in self.queues.items():
            if queue or (gid in self.current_songs):
                guild = self.bot.get_guild(gid)
                if not guild or not guild.voice_client or not guild.voice_client.channel: continue
                
                data[str(gid)] = {
                    "queue": queue,
                    "current_song": self.current_songs.get(gid),
                    "voice_channel_id": guild.voice_client.channel.id,
                    "loop": self.loops.get(gid, False),
                    "volume": self.volumes.get(gid, 0.5)
                }
        self.save_json(QUEUE_FILE, data)
        print("💾 Mosa Music: Đã lưu hàng đợi.")

    @commands.Cog.listener()
    async def on_ready(self):
        """Chạy khi bot khởi động xong -> kích hoạt việc khôi phục hàng đợi"""
        await self.restore_queues()

    async def restore_queues(self):
        """Khôi phục hàng đợi từ file JSON khi bot bị sập/khởi động lại"""
        if not os.path.exists(QUEUE_FILE): return
        print("♻️ Đang khôi phục hàng đợi nhạc...")
        try:
            data = self.load_json(QUEUE_FILE)
            for gid_str, info in data.items():
                try:
                    gid = int(gid_str)
                    guild = self.bot.get_guild(gid)
                    if not guild: continue

                    self.queues[gid] = info.get("queue", [])
                    self.loops[gid] = info.get("loop", False)
                    self.volumes[gid] = info.get("volume", 0.5)
                    
                    # Cắm bài đang hát dở lên đầu hàng đợi để hát tiếp
                    current_song = info.get("current_song")
                    if current_song: self.queues[gid].insert(0, current_song)

                    vc_id = info.get("voice_channel_id")
                    voice_channel = guild.get_channel(vc_id)
                    
                    # Tự động chui lại vào phòng Voice
                    if voice_channel:
                        try:
                            if not guild.voice_client: await voice_channel.connect()
                        except: pass
                        if guild.voice_client and guild.voice_client.source:
                             guild.voice_client.source.volume = self.volumes[gid]

                        # Tìm kênh Text để gửi lại Bảng điều khiển
                        setup_id = self.settings.get(str(gid), {}).get("music_channel_id")
                        text_channel = guild.get_channel(int(setup_id)) if setup_id else None
                        if not text_channel and hasattr(voice_channel, 'send'):
                            text_channel = voice_channel

                        if text_channel and self.queues[gid]:
                             await self.start_playing(text_channel, gid)
                             print(f"✅ Đã khôi phục nhạc cho server: {guild.name}")
                except Exception as e:
                    print(f"❌ Lỗi khôi phục server {gid_str}: {e}")
            
            # Xóa file backup để tránh bị lặp lại data cũ ở lần sau
            os.remove(QUEUE_FILE)
        except Exception as e:
            print(f"⚠️ Lỗi đọc file queue: {e}")
        
    # Các hàm tiện ích để Pause, Resume, Load/Save JSON
    def pause_music(self, guild_id):
        guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client and guild.voice_client.is_playing():
            guild.voice_client.pause()
            self.pause_times[guild_id] = time.time()

    def resume_music(self, guild_id):
        guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client and guild.voice_client.is_paused():
            guild.voice_client.resume()
            if guild_id in self.pause_times:
                # Bù trừ thời gian đã dừng để thanh seek vẫn chính xác
                self.start_times[guild_id] += time.time() - self.pause_times[guild_id]
                del self.pause_times[guild_id]

    def load_json(self, f): return json.load(open(f, "r", encoding="utf-8")) if os.path.exists(f) else {}
    def save_json(self, f, d): 
        if not os.path.exists(DATA_FOLDER): os.makedirs(DATA_FOLDER)
        json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=4)
    def get_default_volume(self, gid): return self.settings.get(str(gid), {}).get("default_volume", 0.5)
    
    # Kiểm tra xem User có chat đúng Kênh Nhạc quy định không
    async def check_music_channel(self, interaction: discord.Interaction):
        if interaction.__class__.__name__ == 'FakeInteraction': return True
        setup_id = self.settings.get(str(interaction.guild_id), {}).get("music_channel_id")
        if setup_id and interaction.channel_id != setup_id:
            msg = f"🚫 Bạn hãy vào kênh <#{setup_id}> để yêu cầu nhạc."
            if interaction.response.is_done(): await interaction.followup.send(msg, ephemeral=True)
            else: await interaction.response.send_message(msg, ephemeral=True)
            return False
        return True
    
    def shuffle_queue(self, guild_id):
        if guild_id in self.queues and self.queues[guild_id]:
            random.shuffle(self.queues[guild_id])
            return True
        return False

    # Lấy thông tin từ YT-DLP bất đồng bộ (tránh làm đứng bot)
    async def search_youtube(self, q) -> list:
        loop = asyncio.get_event_loop()
        with yt_dlp.YoutubeDL(cast(Any, YDL_OPTIONS)) as ydl:
            try: 
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(f"ytsearch{SEARCH_LIMIT}:{q}", download=False))
                entries = info.get('entries', [])
                # Dùng cast(Any, ...) để tắt cảnh báo type check sai của Pylance
                return list(cast(Any, entries)) 
            except: 
                return []

    async def get_song_info(self, q):
        loop = asyncio.get_event_loop()
        with yt_dlp.YoutubeDL(cast(Any, YDL_OPTIONS)) as ydl:
            try:
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(q, download=False))
                if 'entries' in info: return info['entries']
                return {'stream_url': info.get('url'), 'webpage_url': info.get('webpage_url', info.get('url')), 'title': info.get('title', 'Unknown'), 'thumbnail': info.get('thumbnail'), 'channel': info.get('uploader', 'Unknown'), 'duration': info.get('duration', 0)}
            except: return None

    # Hàm chuyên dụng để trích xuất URL Stream thật (m3u8/mp4)
    def get_stream_info(self, url):
        try:
            opts = cast(Any, YDL_OPTIONS.copy())
            opts['extract_flat'] = False 
            return yt_dlp.YoutubeDL(opts).extract_info(url, download=False)
        except: return None

    async def update_ui(self, guild_id):
        """Cập nhật lại giao diện Bảng điều khiển (Edit lại Embed)"""
        if guild_id not in self.ui_messages or guild_id not in self.current_songs: return
        msg = self.ui_messages[guild_id]; info = self.current_songs[guild_id]
        guild = self.bot.get_guild(guild_id); vc = guild.voice_client if guild else None
        if not vc: return
        view = MusicController(self, guild_id, info)
        for child in view.children:
            if getattr(child, "custom_id", None) == "btn_pause":
                setattr(child, "emoji", "▶️" if vc.is_paused() else "⏸️")
                break
        try: await msg.edit(embed=view.create_embed(), view=view)
        except: pass
        
    async def update_channel_status(self, guild_id, text=None):
        """Cập nhật Trạng thái Voice Channel (hiển thị bài hát ngay dưới tên phòng Voice)"""
        guild = self.bot.get_guild(guild_id)
        if not guild or not guild.voice_client or not guild.voice_client.channel: return
            
        is_status_enabled = self.settings.get(str(guild_id), {}).get("status_enabled", False)
        if not is_status_enabled: return

        voice_channel = guild.voice_client.channel
        if isinstance(voice_channel, discord.VoiceChannel):
            try: await voice_channel.edit(status=text)
            except discord.Forbidden: print(f"⚠️ CẢNH BÁO: Bot thiếu quyền 'Set Voice Channel Status' ở kênh {voice_channel.name}")
            except Exception as e: print(f"⚠️ Lỗi cập nhật trạng thái kênh: {e}")

    # ====================================================
    # 6. HỆ THỐNG AFK & BẮT SỰ KIỆN VOICE
    # ====================================================
    async def idle_disconnect(self, guild_id, channel):
        """Tác vụ chờ 15 phút (900s), nếu vẫn không có ai thì tự rời kênh"""
        try:
            print(f"⏳ Bắt đầu đếm 15 phút rời kênh {guild_id}")
            await asyncio.sleep(900) 
            
            guild = self.bot.get_guild(guild_id)
            if guild and guild.voice_client:
                await self.stop_player(guild_id) # Dọn dẹp nhạc
                await guild.voice_client.disconnect(force=True) # Thoát kênh
                await channel.send("💤 **Phòng trống quá lâu (15p), mình đi ngủ đây!**")
                
                # Xóa bảng điều khiển dư thừa
                if guild_id in self.ui_messages:
                    try: await self.ui_messages[guild_id].delete()
                    except: pass
                await self.cleanup_on_disconnect(guild_id)
                    
        except asyncio.CancelledError:
            print(f"❌ Hủy đếm giờ kênh {guild_id} (Có người vào hoặc phát nhạc mới)")
        except Exception as e:
            print(f"⚠️ Lỗi khi tự động rời kênh: {e}")
        finally:
            if guild_id in self.idle_timers: del self.idle_timers[guild_id]

    async def cleanup_on_disconnect(self, guild_id):
        """Dọn dẹp rác bộ nhớ sau khi bot dời đi"""
        if guild_id in self.idle_timers:
            try: self.idle_timers[guild_id].cancel()
            except: pass
            del self.idle_timers[guild_id]

        self.manual_stops[guild_id] = True
        self.force_skips[guild_id] = True

        if guild_id in self.current_songs: del self.current_songs[guild_id]

        guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client:
            try: guild.voice_client.stop()
            except: pass

        if guild_id in self.ui_messages:
            try: await self.ui_messages[guild_id].delete()
            except: pass
            del self.ui_messages[guild_id]

        if guild_id in self.active_tasks:
            task = self.active_tasks[guild_id]
            if task and not task.done():
                try: task.cancel()
                except: pass
            del self.active_tasks[guild_id]
            
    @commands.Cog.listener()
    async def on_voice_state_update(self, member, before, after):
        """Bắt sự kiện có người vào/ra Voice Channel"""
        if member.bot:
            if member.id != self.bot.user.id: return
            
            # --- TÍNH NĂNG TỰ ĐỘNG RECONNECT KHI BỊ DISCONNECT ---
            if before.channel is not None and after.channel is None:
                guild_id = before.channel.guild.id
                player = self.players.get(guild_id)
                # Nếu đang hát mà bị văng
                if player and player.get('is_playing') and player.get('current_song'):
                    print(f"[Proxy Reconnect] Đang phục hồi kết nối cho kênh {before.channel.name}...")
                    elapsed_time = time.time() - player['start_time']
                    await asyncio.sleep(2) # Chờ proxy Discord nhả kết nối TCP cũ
                    try:
                        vc = await before.channel.connect()
                        player['vc'] = vc 
                        
                        # Tua lại đúng giây bị rớt mạng (-ss elapsed_time)
                        ffmpeg_options = {
                            'before_options': f'-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 -ss {elapsed_time}',
                            'options': '-vn'
                        }
                        audio_source = discord.FFmpegPCMAudio(
                            player['current_song_url'],
                            before_options=ffmpeg_options['before_options'],
                            options=ffmpeg_options['options'],
                        )
                        vc.play(
                            audio_source,
                            after=lambda e: self.bot.loop.call_soon_threadsafe(
                                asyncio.create_task,
                                self.start_playing(before.channel, guild_id),
                            ),
                        )
                        player['start_time'] = time.time() - elapsed_time
                    except Exception as e:
                        print(f"Không thể kết nối lại: {e}")
                         
        vc = member.guild.voice_client
        if not vc or not vc.channel: return
        if (before.channel != vc.channel) and (after.channel != vc.channel): return

        guild_id = member.guild.id
        
        # Nếu có người vào phòng -> Hủy đếm ngược đi ngủ
        if len(vc.channel.members) > 1:
            if guild_id in self.idle_timers:
                try:
                    self.idle_timers[guild_id].cancel()
                    del self.idle_timers[guild_id]
                except: pass
        # Nếu tất cả đi ra, chỉ còn mỗi con Bot -> Bắt đầu đếm ngược
        elif len(vc.channel.members) == 1:
            is_auto_leave = self.settings.get(str(guild_id), {}).get("auto_leave", True)
            if is_auto_leave:
                if guild_id not in self.idle_timers:
                    setup_id = self.settings.get(str(guild_id), {}).get("music_channel_id")
                    target_channel = self.bot.get_channel(int(setup_id)) if setup_id else vc.channel
                    if target_channel:
                        self.idle_timers[guild_id] = asyncio.create_task(self.idle_disconnect(guild_id, target_channel))
                        
    # ====================================================
    # 7. VÒNG LẶP PHÁT NHẠC (THE HEART OF MUSIC BOT)
    # ====================================================
    async def player_loop(self, guild_id, channel):
        """Vòng lặp vô hạn, xử lý lấy bài, phát, lọc âm thanh, và chuyển bài"""
        while True:
            is_seeking = self.seek_flags.get(guild_id, False)
            
            # --- NẾU ĐANG TUA NHẠC ---
            if is_seeking:
                song_data = self.current_songs[guild_id]
                start_offset = self.seek_pos.get(guild_id, 0)
                self.seek_flags[guild_id] = False 
                
            # --- NẾU CHUYỂN BÀI BÌNH THƯỜNG ---
            else:
                self.force_skips[guild_id] = False
                
                # Xử lý Hết Nhạc trong Queue
                if guild_id not in self.queues or not self.queues[guild_id]:
                    await self.update_channel_status(guild_id, None) # Xóa status voice channel
                    if guild_id in self.current_songs: del self.current_songs[guild_id]
                    if guild_id in self.ui_messages: 
                        try: await self.ui_messages[guild_id].delete() # Xóa UI cũ
                        except: pass
                    if guild_id in self.active_tasks: del self.active_tasks[guild_id]
                    
                    if not self.manual_stops.get(guild_id, False): 
                        target_channel = channel
                        setup_id = self.settings.get(str(guild_id), {}).get("music_channel_id")
                        if setup_id:
                            try:
                                found = self.bot.get_channel(int(setup_id))
                                if found: target_channel = found
                            except: pass
                        
                        await target_channel.send("✅ **Hết nhạc.**")
                        
                        # Kích hoạt AFK đếm ngược nếu phòng trống
                        guild = self.bot.get_guild(guild_id)
                        is_auto_leave = self.settings.get(str(guild_id), {}).get("auto_leave", True)

                        if is_auto_leave and guild and guild.voice_client and guild.voice_client.channel:
                            if len(guild.voice_client.channel.members) == 1:
                                if guild_id not in self.idle_timers:
                                    self.idle_timers[guild_id] = asyncio.create_task(self.idle_disconnect(guild_id, target_channel))

                    if guild_id in self.manual_stops: del self.manual_stops[guild_id]
                    break # Thoát khỏi vòng lặp vô hạn vì đã hết nhạc

                # Lấy bài đầu tiên ra khỏi hàng đợi
                song_data = self.queues[guild_id].pop(0)
                self.current_songs[guild_id] = song_data
                start_offset = 0 # Không tua
            
            # --- CHUẨN BỊ PHÁT NHẠC ---
            # (Phần này fix lỗi bot welcome đè lên bot nhạc nếu bạn có dùng welcome voice)
            voice_cog = self.bot.get_cog("Voice")
            if voice_cog and guild_id in voice_cog.welcome_channels: del voice_cog.welcome_channels[guild_id]
            guild = self.bot.get_guild(guild_id)
            if not guild or not guild.voice_client or not guild.voice_client.is_connected() or not guild.voice_client.channel: break

            try:
                # 1. Giải mã URL stream cuối cùng
                loop = asyncio.get_event_loop()
                full_info = await loop.run_in_executor(None, lambda: self.get_stream_info(song_data['webpage_url']))
                
                if full_info:
                    play_url = full_info.get('url')
                    song_data['title'] = full_info.get('title', song_data['title'])
                    song_data['thumbnail'] = full_info.get('thumbnail', song_data['thumbnail'])
                    song_data['duration'] = full_info.get('duration', song_data['duration'])
                    self.current_songs[guild_id] = song_data 
                else:
                    play_url = song_data.get('stream_url')
                    
                if not play_url:
                    await channel.send(f"⚠️ Không thể trích xuất âm thanh cho bài: **{song_data['title']}** (Có thể do YouTube chặn). Đang bỏ qua...")
                    continue

                # 2. Xây dựng tham số FFmpeg
                ffmpeg_local = os.path.abspath("ffmpeg.exe")
                exe = ffmpeg_local if os.path.exists(ffmpeg_local) else "ffmpeg"
                
                current_opts = FFMPEG_OPTIONS.copy()
                
                # Ghép bộ lọc âm thanh (Bassboost, Nightcore...)
                active_filter = self.current_filters.get(guild_id)
                if active_filter:
                    current_opts['options'] = f'-af "{active_filter}" ' + current_opts.get('options', '')

                # Ghép tham số tua nhạc
                if start_offset > 0:
                    current_opts['before_options'] = f"-ss {start_offset} " + current_opts.get('before_options', '')
                
                # Khởi tạo nguồn phát
                source = discord.FFmpegPCMAudio(
                    play_url,
                    executable=exe,
                    before_options=current_opts.get('before_options'),
                    options=current_opts.get('options')
                )
                
                vol = self.volumes.get(guild_id, self.get_default_volume(guild_id))
                self.volumes[guild_id] = vol
                
                # 3. Quản lý UI hiển thị (Bảng điều khiển)
                if guild_id in self.ui_messages: 
                    try: await self.ui_messages[guild_id].delete()
                    except: pass
                
                view = MusicController(self, guild_id, song_data)
                await self.update_channel_status(guild_id, f"🎶 {song_data['title']}"[:500])
                        
                target_channel = channel 
                saved_settings = self.settings.get(str(guild_id), {})
                music_channel_id = saved_settings.get("music_channel_id")
                
                if music_channel_id:
                    try:
                        found_channel = self.bot.get_channel(int(music_channel_id))
                        if found_channel: target_channel = found_channel
                    except: pass
                
                # Cập nhật UI nhanh nếu đang Tua, Xóa/Gửi lại nếu là bài mới
                if start_offset > 0 and guild_id in self.ui_messages:
                    try: await self.ui_messages[guild_id].edit(embed=view.create_embed(), view=view)
                    except Exception as e:
                        if guild_id in self.ui_messages: 
                            try: await self.ui_messages[guild_id].delete()
                            except: pass
                        self.ui_messages[guild_id] = await target_channel.send(embed=view.create_embed(), view=view)
                else:
                    if guild_id in self.ui_messages: 
                        try: await self.ui_messages[guild_id].delete()
                        except: pass
                    self.ui_messages[guild_id] = await target_channel.send(embed=view.create_embed(), view=view)

                # 4. CHƠI NHẠC VÀ ĐỢI
                next_song = asyncio.Event()
                # Callback này được gọi tự động khi FFmpeg phát xong (hoặc bị ép stop)
                def after(e): self.bot.loop.call_soon_threadsafe(next_song.set)
                
                if guild.voice_client.is_playing(): guild.voice_client.stop()
                
                self.start_times[guild_id] = time.time()
                self.current_offsets[guild_id] = start_offset
                if guild_id in self.pause_times: del self.pause_times[guild_id] 
                
                # Bắt đầu truyền dữ liệu vào Voice Client
                guild.voice_client.play(discord.PCMVolumeTransformer(source, volume=vol), after=after)
                
                # Code sẽ bị "khóa" (dừng chờ) tại dòng này cho đến khi hàm after được gọi
                await next_song.wait()

                # --- NHẠC VỪA KẾT THÚC ---
                # Nếu bị ép ngưng vì lệnh TUA thì bỏ qua logic Queue
                if self.seek_flags.get(guild_id, False): continue
                
                # Nếu bật Loop và không bị ép Skip -> Nhét bài vừa hát xong xuống cuối hàng đợi
                if self.loops.get(guild_id, False) and not self.force_skips.get(guild_id, False):
                    self.queues[guild_id].insert(0, song_data)

            except Exception as e:
                print(f"Err: {e}") 
                await asyncio.sleep(1) 

    async def start_playing(self, channel, guild_id):
        """Khởi động Vòng lặp phát nhạc (Tạo Task ngầm)"""
        if guild_id in self.idle_timers:
            self.idle_timers[guild_id].cancel()
            del self.idle_timers[guild_id]

        guild = self.bot.get_guild(guild_id)
        if not guild or not guild.voice_client or not guild.voice_client.is_connected() or not guild.voice_client.channel: return

        self.manual_stops[guild_id] = False
        
        # Nếu task chưa tồn tại hoặc đã chết -> Tạo task mới chạy player_loop
        if guild_id not in self.active_tasks or self.active_tasks[guild_id].done():
            self.active_tasks[guild_id] = asyncio.create_task(self.player_loop(guild_id, channel))

    async def stop_player(self, guild_id):
        self.queues[guild_id] = []; self.manual_stops[guild_id] = True; self.force_skips[guild_id] = True
        if guild_id in self.current_songs: del self.current_songs[guild_id]
        
        await self.update_channel_status(guild_id, None)
        
        guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client: guild.voice_client.stop() # stop() sẽ kích hoạt Callback 'after' trong loop
    
    async def skip_song(self, guild_id):
        self.force_skips[guild_id] = True; guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client and (guild.voice_client.is_playing() or guild.voice_client.is_paused()): guild.voice_client.stop()

    def seek_song(self, guild_id, seconds):
        guild = self.bot.get_guild(guild_id)
        if not guild or not guild.voice_client or not guild.voice_client.is_connected(): return False
        
        # Bật cờ Seek lên để Vòng Lặp biết là cần tua chứ không phải chuyển bài mới
        self.seek_flags[guild_id] = True
        self.seek_pos[guild_id] = seconds
        
        # Stop bài hiện tại để vòng lặp bắt đầu lại với start_offset mới
        if guild.voice_client.is_playing() or guild.voice_client.is_paused(): guild.voice_client.stop()
        return True

    def move_song(self, guild_id, from_idx, to_idx):
        if guild_id not in self.queues: return False
        try: s = self.queues[guild_id].pop(from_idx); self.queues[guild_id].insert(to_idx, s); return True
        except: return False

    async def process_song_request(self, interaction, song_data, from_selection=False):
        """Xử lý đẩy bài hát hoặc cả Playlist từ input vào Hàng đợi (Queue)"""
        if not await self.check_music_channel(interaction): return
        gid = interaction.guild_id
        if gid not in self.queues: self.queues[gid] = []
        vc = interaction.guild.voice_client
        
        if not vc:
            if interaction.user.voice: await interaction.user.voice.channel.connect(); vc = interaction.guild.voice_client
            else: return await interaction.followup.send("❌ Vào Voice đi!")

        # Xử lý list (Nhiều bài)
        if isinstance(song_data, list):
            count = 0
            for item in song_data:
                web_url = item.get('webpage_url') or item.get('url')
                if web_url and "http" not in web_url: web_url = f"https://www.youtube.com/watch?v={web_url}"
                final_data = {'stream_url': None, 'webpage_url': web_url, 'title': item.get('title', 'Unknown'), 'thumbnail': item.get('thumbnail'), 'channel': item.get('uploader', 'Unknown'), 'duration': item.get('duration', 0)}
                self.queues[gid].append(final_data); count += 1
            await interaction.followup.send(f"✅ Đã thêm Playlist: **{count} bài**!")
        
        # Xử lý dict (1 bài lẻ)
        else:
            final_data = song_data if 'stream_url' in song_data else {
                'stream_url': None, 'webpage_url': song_data.get('webpage_url') or song_data.get('url'),
                'title': song_data['title'], 'thumbnail': song_data.get('thumbnail'), 'channel': song_data.get('channel', 'Unknown'),
                'duration': song_data.get('duration', 0)
            }
            self.queues[gid].append(final_data)
            
            # Gửi thông báo tuỳ thuộc vào việc Bot có đang rảnh hay không
            if gid not in self.active_tasks or self.active_tasks[gid].done(): await interaction.followup.send(f"▶️ Playing: **{final_data['title']}**")
            else: await interaction.followup.send(f"✅ Added: **{final_data['title']}**")

        # Sau khi bỏ vào queue, gọi hàm bắt đầu chạy loop (Nếu loop đang ngủ)
        if gid not in self.active_tasks or self.active_tasks[gid].done(): await self.start_playing(interaction.channel, gid)

    # ====================================================
    # 8. SLASH COMMANDS (/play, /stop, /tune,...)
    # ====================================================
    
    @app_commands.command(name="set_music", description="[Admin] Thiết lập kênh dành riêng cho yêu cầu nhạc")
    @app_commands.checks.has_permissions(manage_channels=True)
    async def set_music(self, interaction: discord.Interaction):
        await interaction.response.defer() # Dùng defer để báo Discord "Cho tôi nghĩ chút", tránh lỗi quá hạn 3 giây
        if not interaction.channel: return await interaction.followup.send("❌ Command must be used in a channel")
        gid = str(interaction.guild_id)
        if gid not in self.settings: self.settings[gid] = {}
        self.settings[gid]["music_channel_id"] = interaction.channel.id
        self.save_json(SETTINGS_FILE, self.settings)
        chan_mention = getattr(interaction.channel, "mention", str(interaction.channel))
        await interaction.followup.send(f"✅ Đã cài đặt kênh nhạc: {chan_mention}")

    @app_commands.command(name="tune", description="Chỉnh hiệu ứng âm thanh (Bassboost, Nightcore...)")
    @app_commands.choices(effect=[
        app_commands.Choice(name="Off (Tắt)", value="Off"),
        app_commands.Choice(name="Bassboost", value="Bassboost"),
        app_commands.Choice(name="Nightcore", value="Nightcore"),
        app_commands.Choice(name="Vaporwave", value="Vaporwave"),
        app_commands.Choice(name="8D Audio", value="8D"),
        app_commands.Choice(name="Pop", value="Pop"),
        app_commands.Choice(name="Soft", value="Soft"),
        app_commands.Choice(name="Treble", value="Treble"),
    ])
    async def tune(self, interaction: discord.Interaction, effect: app_commands.Choice[str]):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer()
        
        gid = interaction.guild_id
        filter_str = FFMPEG_FILTERS.get(effect.value)
        self.current_filters[gid] = filter_str
        
        # Nếu đang phát nhạc, ép bot tua (seek) lại chính vị trí hiện tại để kích hoạt Filter ngay lập tức
        vc = interaction.guild.voice_client if interaction.guild else None
        source = getattr(vc, "source", None)
        if vc is not None and source is not None and not getattr(source, "is_stream", lambda: False)() and gid in self.start_times:
            current_pos = (time.time() - self.start_times[gid]) + self.current_offsets.get(gid, 0)
            self.seek_song(gid, current_pos)
            
        await interaction.followup.send(f"🎛️ Đã chỉnh hiệu ứng: **{effect.name}**")

    @app_commands.command(name="prioritize", description="Đưa một bài hát trong hàng chờ lên ưu tiên phát tiếp theo")
    async def prioritize(self, interaction: discord.Interaction):
        if not await self.check_music_channel(interaction): return
        gid = interaction.guild_id
        if gid not in self.queues or not self.queues[gid]: return await interaction.response.send_message("📭 Hàng chờ trống.", ephemeral=True)
        
        # Mở View Dropdown chọn bài
        view = PrioritizeView(self, interaction, self.queues[gid])
        await interaction.response.send_message("📂 Chọn bài ưu tiên:", view=view, ephemeral=True)

    @app_commands.command(name="play", description="Phát nhạc từ YouTube hoặc Link")
    async def play(self, interaction: discord.Interaction, query: str):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer()

        if not isinstance(interaction.user, discord.Member): return await interaction.followup.send("❌ Lỗi Voice")
        member = interaction.user
        if not member.voice: return await interaction.followup.send("❌ Vào Voice đi bạn ơi!")

        channel = getattr(member.voice, "channel", None)
        if not interaction.guild or not getattr(interaction.guild, "voice_client", None):
            if not channel: return await interaction.followup.send("❌ Vào Voice đi bạn ơi!")
            await channel.connect()
        
        # Xử lý Logic URL vs Text Search
        if is_url(query):
            info = await self.get_song_info(query)
            if not info: return await interaction.followup.send("❌ Không thể lấy dữ liệu từ link.")
            await self.process_song_request(interaction, info)
        else:
            res = await self.search_youtube(query)
            if not res: return await interaction.followup.send("❌ Không tìm thấy kết quả nào.")
            # Gửi View chứa danh sách Dropdown 5 bài hát để user tự chọn
            await interaction.followup.send(f"🔎 Kết quả tìm kiếm:", view=SongSelectionView(self, interaction, res))

    @app_commands.command(name="stop", description="Dừng phát nhạc, dọn dẹp hàng chờ")
    async def stop(self, interaction: discord.Interaction):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); await self.stop_player(interaction.guild_id); await interaction.followup.send("🛑 Stopped.")
    
    @app_commands.command(name="skip", description="Bỏ qua bài hiện tại")
    async def skip(self, interaction: discord.Interaction):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); await self.skip_song(interaction.guild_id); await interaction.followup.send("⏭️ Skip.")
        
    @app_commands.command(name="volume", description="Điều chỉnh âm lượng (0 đến 100)")
    async def volume(self, interaction: discord.Interaction, level: int):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); self.volumes[interaction.guild_id] = level/100
        vc = interaction.guild.voice_client if interaction.guild else None
        source = getattr(vc, "source", None) if vc is not None else None
        if source is not None: source.volume = level/100 # Chỉnh trực tiếp vào dòng âm thanh đang phát
        await self.update_ui(interaction.guild_id); await interaction.followup.send(f"🔊 Vol: {level}%")

    @app_commands.command(name="loop", description="Bật/Tắt chế độ lặp lại")
    async def loop(self, interaction: discord.Interaction):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); self.loops[interaction.guild_id] = not self.loops.get(interaction.guild_id, False)
        await self.update_ui(interaction.guild_id); await interaction.followup.send("🔂 Loop: " + str(self.loops[interaction.guild_id]))

    @app_commands.command(name="default_volume", description="[Admin] Chỉnh âm lượng mặc định khi Bot vào kênh")
    @app_commands.checks.has_permissions(administrator=True)
    async def default_volume(self, interaction: discord.Interaction, level: int):
        await interaction.response.defer(); gid = str(interaction.guild_id)
        if gid not in self.settings: self.settings[gid] = {}
        self.settings[gid]["default_volume"] = level/100; self.save_json(SETTINGS_FILE, self.settings)
        await interaction.followup.send(f"💾 Đã lưu cấu hình.")

    @app_commands.command(name="pl_save", description="Lưu hàng chờ hiện tại thành Playlist cá nhân")
    async def pl_save(self, interaction: discord.Interaction, name: str):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); gid = interaction.guild_id; data = []
        
        if gid in self.current_songs: data.append({'title': self.current_songs[gid]['title'], 'webpage_url': self.current_songs[gid]['webpage_url'], 'duration': self.current_songs[gid].get('duration', 0)})
        if gid in self.queues: 
            for s in self.queues[gid]: data.append({'title': s['title'], 'webpage_url': s['webpage_url'], 'duration': s.get('duration', 0)})
        
        if not data: return await interaction.followup.send("❌ Hàng chờ trống.")
        
        uid = str(interaction.user.id)
        if uid not in self.playlists: self.playlists[uid] = {}
        self.playlists[uid][name] = data; self.save_json(PLAYLIST_FILE, self.playlists)
        await interaction.followup.send(f"💾 Đã lưu **{name}**.")

    @app_commands.command(name="pl_load", description="Nạp toàn bộ bài hát từ Playlist cá nhân vào Hàng chờ")
    async def pl_load(self, interaction: discord.Interaction, name: str):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); uid = str(interaction.user.id)
        if uid not in self.playlists or name not in self.playlists[uid]: return await interaction.followup.send("❌ Không thấy Playlist này.")
        
        vc = getattr(interaction.guild, 'voice_client', None) if interaction.guild is not None else None
        if not vc:
            if not isinstance(interaction.user, discord.Member): return await interaction.followup.send("❌ Bạn phải ở trong voice channel.")
            voice_state = getattr(interaction.user, 'voice', None)
            channel = getattr(voice_state, 'channel', None) if voice_state is not None else None
            if channel is None: return await interaction.followup.send("❌ Bạn phải ở trong voice channel.")
            await channel.connect()
            
        gid = interaction.guild_id; 
        if gid not in self.queues: self.queues[gid] = []
        for s in self.playlists[uid][name]: 
            self.queues[gid].append({'stream_url': None, 'webpage_url': s['webpage_url'], 'title': s['title'], 'channel': 'Playlist', 'duration': s.get('duration', 0)})
        
        if gid not in self.active_tasks or self.active_tasks[gid].done(): await self.start_playing(interaction.channel, gid)
        await interaction.followup.send(f"✅ Đã nạp playlist **{name}**.")

    @app_commands.command(name="pl_pick", description="Chọn phát MỘT bài cụ thể từ Playlist cá nhân")
    async def pl_pick(self, interaction: discord.Interaction, name: str):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); uid = str(interaction.user.id); gid = interaction.guild_id
        if uid not in self.playlists or name not in self.playlists[uid]: return await interaction.followup.send("❌ Không thấy Playlist này.")
        
        all_s = self.playlists[uid][name]; busy = set()
        
        # Loại bỏ những bài đã có trong hàng chờ để tránh bị trùng lặp
        if gid in self.current_songs: busy.add(self.current_songs[gid].get('webpage_url'))
        if gid in self.queues:
            for s in self.queues[gid]: busy.add(s.get('webpage_url'))
        avail = [s for s in all_s if s.get('webpage_url') not in busy]
        
        if not avail: return await interaction.followup.send("⚠️ Tất cả các bài trong Playlist đều đã nằm trong hàng chờ!")
        
        # Gửi Menu Dropdown các bài rảnh
        view = PlaylistSelectionView(self, interaction, avail, name)
        await interaction.followup.send(f"📂 Chọn bài trong '{name}':", view=view)

    @app_commands.command(name="pl_list", description="Xem danh sách các Playlist đã lưu")
    async def pl_list(self, interaction: discord.Interaction):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); uid = str(interaction.user.id)
        if uid in self.playlists: await interaction.followup.send(f"📂 Các Playlist của bạn:\n" + "\n".join([f"- **{k}**: {len(v)} bài" for k, v in self.playlists[uid].items()]))
        else: await interaction.followup.send("📭 Bạn chưa có Playlist nào.")

    @app_commands.command(name="pl_delete", description="Xóa một Playlist cá nhân")
    async def pl_delete(self, interaction: discord.Interaction, name: str):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); uid = str(interaction.user.id)
        if uid in self.playlists and name in self.playlists[uid]: 
            del self.playlists[uid][name]
            self.save_json(PLAYLIST_FILE, self.playlists)
            await interaction.followup.send(f"🗑️ Đã xóa Playlist **{name}**.")
        else: await interaction.followup.send("❌ Không tìm thấy Playlist.")
        
    def web_add_to_playlist(self, user_id, playlist_name, song_data):
        """Hàm hỗ trợ Web Panel lưu nhạc vào file JSON"""
        user_id = str(user_id)
        if user_id not in self.playlists: self.playlists[user_id] = {}
        if playlist_name not in self.playlists[user_id]: self.playlists[user_id][playlist_name] = []
        for s in self.playlists[user_id][playlist_name]:
            if s['webpage_url'] == song_data['webpage_url']: return False # Tránh lưu trùng 1 bài 2 lần
        self.playlists[user_id][playlist_name].append({'title': song_data['title'], 'webpage_url': song_data['webpage_url'], 'duration': song_data.get('duration', 0)})
        self.save_json(PLAYLIST_FILE, self.playlists); return True
    
    @app_commands.command(name="afk", description="[Admin] Bật/Tắt chế độ tự động rời kênh Voice khi không có người (24/7 Mode)")
    @app_commands.checks.has_permissions(administrator=True)
    async def afk(self, interaction: discord.Interaction):
        await interaction.response.defer()
        gid = str(interaction.guild_id)
        if gid not in self.settings: self.settings[gid] = {}
        
        current_status = self.settings[gid].get("auto_leave", True)
        new_status = not current_status
        self.settings[gid]["auto_leave"] = new_status
        self.save_json(SETTINGS_FILE, self.settings)
        
        status_text = "BẬT (Có tự rời)" if new_status else "TẮT (Ở lại 24/7)"
        msg = f"✅ Chế độ tự động rời kênh: **{status_text}**"

        if not new_status:
            # Nếu tắt AFK -> Hủy tiến trình đếm giờ rảnh rỗi (nếu có)
            if interaction.guild_id in self.idle_timers:
                self.idle_timers[interaction.guild_id].cancel()
                del self.idle_timers[interaction.guild_id]
        else:
            # Nếu bật lại AFK -> Kiểm tra xem phòng có đang trống để đếm ngược lại hay không
            guild = interaction.guild
            vc = guild.voice_client if guild is not None else None
            if vc and vc.channel and isinstance(vc.channel, discord.VoiceChannel) and len(vc.channel.members) == 1:
                if interaction.guild_id not in self.idle_timers:
                    self.idle_timers[interaction.guild_id] = asyncio.create_task(self.idle_disconnect(interaction.guild_id, interaction.channel))

        await interaction.followup.send(msg)
    
    @app_commands.command(name="channel_status", description="[Admin] Bật/Tắt hiển thị tên bài hát dưới tên kênh Voice")
    @app_commands.checks.has_permissions(administrator=True)
    async def channel_status(self, interaction: discord.Interaction):
        await interaction.response.defer()
        guild_id = str(interaction.guild_id)
        if guild_id not in self.settings: self.settings[guild_id] = {}
        
        current_status = self.settings[guild_id].get("status_enabled", False)
        new_status = not current_status
        self.settings[guild_id]["status_enabled"] = new_status
        self.save_json(SETTINGS_FILE, self.settings)
        
        status_text = "✅ Bật" if new_status else "❌ Tắt"
        msg = f"**Trạng thái kênh** đã được {status_text}."
        
        guild = interaction.guild
        if guild and guild.voice_client and guild.voice_client.channel:
            try:
                voice_channel = guild.voice_client.channel
                if isinstance(voice_channel, discord.VoiceChannel):
                    # Cập nhật ngay lập tức nếu tính năng bị Tắt hoặc Bật lên
                    if not new_status: await voice_channel.edit(status=None)
                    elif interaction.guild_id in self.current_songs:
                        song_title = self.current_songs[interaction.guild_id].get('title', 'Unknown')
                        await voice_channel.edit(status=f"🎶 {song_title}"[:500])
            except discord.Forbidden: msg += "\n⚠️ Bot không có quyền `Set Voice Channel Status`."
            except Exception: pass
        await interaction.followup.send(msg)

# ====================================================
# ĐĂNG KÝ COG VÀO BOT (BẮT BUỘC ĐỂ MODULE HOẠT ĐỘNG)
# ====================================================
async def setup(bot):
    await bot.add_cog(Music(bot))