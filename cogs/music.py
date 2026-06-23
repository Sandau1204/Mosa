import discord
import yt_dlp
import asyncio
import json
import os
import re
import time 
import random  
from discord import app_commands
from discord.ext import commands
from discord.ui import Button, View, Select

# ====================================================
# CẤU HÌNH & HẰNG SỐ
# ====================================================
DATA_FOLDER = "data"
QUEUE_FILE = os.path.join(DATA_FOLDER, "saved_queues.json")
PLAYLIST_FILE = os.path.join(DATA_FOLDER, "playlists.json")
SETTINGS_FILE = os.path.join(DATA_FOLDER, "server_settings.json")
SEARCH_LIMIT = 5


# --- BỘ LỌC ÂM THANH (FFMPEG AUDIO FILTERS) ---
FFMPEG_FILTERS = {
    "Off": None,
    "Bassboost": "bass=g=20,dynaudnorm:f=200",
    "Nightcore": "asetrate=48000*1.25,aresample=48000,bass=g=5",
    "Vaporwave": "aresample=48000,asetrate=48000*0.8",
    "8D": "apulsator=hz=0.125",
    "Pop": "equalizer=f=1000:t=q:w=1:g=2,equalizer=f=100:t=q:w=2:g=-5",
    "Soft": "lowpass=f=500",
    "Treble": "treble=g=5"
}

YDL_OPTIONS = {
    'format': 'ba/b',
    #'extractor_args': {'youtube': ['player_client=android,web']},
    'noplaylist': False,
    'extract_flat': 'in_playlist',
    'quiet': True,
    'no_warnings': True,
    'default_search': 'auto',
    'source_address': '0.0.0.0',
    'nocheckcertificate': True,
    #'cookiefile': 'cookies.txt',
    'cachedir': False,
}

FFMPEG_OPTIONS = {
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
    'options': '-vn'
}



def is_url(string):
    regex = r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+"
    return re.match(regex, string) is not None

# ====================================================
# UI COMPONENTS
# ====================================================
class SongSelect(discord.ui.Select):
    def __init__(self, cog, interaction, songs_list):
        self.cog = cog; self.origin_interaction = interaction; self.songs_list = songs_list
        options = []
        for index, song in enumerate(songs_list):
            label = f"{index + 1}. {song['title'][:90]}"
            options.append(discord.SelectOption(label=label, value=str(index)))
        super().__init__(placeholder=f"🔻 Tìm thấy {len(songs_list)} bài...", min_values=1, max_values=1, options=options)
    async def callback(self, interaction: discord.Interaction):
        await interaction.response.edit_message(content=f"✅ Đã chọn: **{self.songs_list[int(self.values[0])]['title']}**", view=None)
        await self.cog.process_song_request(self.origin_interaction, self.songs_list[int(self.values[0])], from_selection=True)

class SongSelectionView(discord.ui.View):
    def __init__(self, cog, interaction, songs_list):
        super().__init__(timeout=180); self.add_item(SongSelect(cog, interaction, songs_list))

class MusicController(discord.ui.View):
    def __init__(self, cog, guild_id, song_info):
        super().__init__(timeout=None); self.cog = cog; self.guild_id = guild_id; self.song_info = song_info
    async def interaction_check(self, interaction: discord.Interaction):
        if interaction.user.voice and interaction.user.voice.channel == interaction.guild.voice_client.channel: return True
        await interaction.response.send_message("❌ Vào Voice trước!", ephemeral=True); return False
    def create_embed(self):
        loop_status = self.cog.loops.get(self.guild_id, False)
        volume = self.cog.volumes.get(self.guild_id, 0.5)
        current_filter_name = "Off"
        current_filter_val = self.cog.current_filters.get(self.guild_id)
        for name, val in FFMPEG_FILTERS.items():
            if val == current_filter_val: current_filter_name = name; break
            
        embed = discord.Embed(title="🎶 Đang phát nhạc", description=f"**{self.song_info['title']}**", color=discord.Color.purple())
        if self.song_info.get('thumbnail'): embed.set_thumbnail(url=self.song_info['thumbnail'])
        embed.set_footer(text=f"Vol: {int(volume*100)}% | Loop: {'Bật' if loop_status else 'Tắt'} | Tune: {current_filter_name}")
        return embed
    
    @discord.ui.button(emoji="⏸️", style=discord.ButtonStyle.secondary, row=0, custom_id="btn_pause")
    async def pause_resume(self, interaction: discord.Interaction, button: discord.ui.Button):
        vc = interaction.guild.voice_client; 
        if vc: 
            if vc.is_playing(): 
                self.cog.pause_music(self.guild_id) # Sửa dòng này
                button.emoji = "▶️"
            elif vc.is_paused(): 
                self.cog.resume_music(self.guild_id) # Sửa dòng này
                button.emoji = "⏸️"
            await self.cog.update_ui(self.guild_id); await interaction.response.defer()
            
    @discord.ui.button(emoji="⏭️", style=discord.ButtonStyle.secondary, row=0)
    async def skip(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.cog.skip_song(interaction.guild_id); await interaction.response.send_message("⏭️ Skip", ephemeral=True)
        
    @discord.ui.button(emoji="🔀", style=discord.ButtonStyle.secondary, row=0)
    async def shuffle(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.cog.shuffle_queue(self.guild_id)
        await interaction.response.send_message("🔀 Đã trộn hàng đợi.", ephemeral=True)
        await self.cog.update_ui(self.guild_id)
        
    @discord.ui.button(emoji="🔂", style=discord.ButtonStyle.secondary, row=0) 
    async def loop(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.cog.loops[self.guild_id] = not self.cog.loops.get(self.guild_id, False)
        await self.cog.update_ui(self.guild_id); await interaction.response.defer()
        
    @discord.ui.button(emoji="📜", style=discord.ButtonStyle.secondary, row=0)
    async def queue_list(self, interaction: discord.Interaction, button: discord.ui.Button):
        msg = "\n".join([f"{i+1}. {s['title']}" for i, s in enumerate(self.cog.queues.get(self.guild_id, [])[:10])]) or "Trống"
        await interaction.response.send_message(f"**Queue:**\n{msg}", ephemeral=True)
        
    @discord.ui.button(emoji="🔉", style=discord.ButtonStyle.gray, row=1)
    async def vol_down(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.change_vol(interaction, -0.1)
        
    @discord.ui.button(emoji="🔊", style=discord.ButtonStyle.gray, row=1)
    async def vol_up(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.change_vol(interaction, 0.1)
        
    @discord.ui.button(emoji="🛑", style=discord.ButtonStyle.danger, row=1)
    async def stop(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.cog.stop_player(interaction.guild_id); await interaction.response.send_message("🛑 Stopped", ephemeral=True)
    async def change_vol(self, interaction, change):
        vc = interaction.guild.voice_client
        if vc and vc.source:
            self.cog.volumes[self.guild_id] = round(max(0.0, min(1.0, self.cog.volumes.get(self.guild_id, 0.5) + change)), 2)
            vc.source.volume = self.cog.volumes[self.guild_id]; await self.cog.update_ui(self.guild_id); await interaction.response.defer()

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
# CORE LOGIC
# ====================================================
class Music(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.queues = {}; self.loops = {}; self.volumes = {}; self.current_songs = {}
        self.ui_messages = {}; self.active_tasks = {}; self.manual_stops = {}; self.force_skips = {}
        
        self.start_times = {}      
        self.current_offsets = {}  
        self.seek_flags = {}       
        self.seek_pos = {}
        self.pause_times = {}
        
        self.current_filters = {}
        
        # Biến lưu các bộ đếm giờ thoát kênh
        self.idle_timers = {} 
        
        

        if not os.path.exists(DATA_FOLDER): os.makedirs(DATA_FOLDER)
        self.playlists = self.load_json(PLAYLIST_FILE)
        self.settings = self.load_json(SETTINGS_FILE)
    
    def save_queues_to_file(self):
        """Lưu trạng thái hiện tại (Queue, Loop, Volume, Voice Channel) vào file."""
        data = {}
        for gid, queue in self.queues.items():
            # Chỉ lưu nếu có hàng đợi hoặc đang có bài hát
            if queue or (gid in self.current_songs):
                guild = self.bot.get_guild(gid)
                # Chỉ lưu nếu bot thực sự đang ở trong kênh voice
                if not guild or not guild.voice_client or not guild.voice_client.channel: continue
                
                data[str(gid)] = {
                    "queue": queue,
                    "current_song": self.current_songs.get(gid), # Lưu bài đang hát dở
                    "voice_channel_id": guild.voice_client.channel.id, # Lưu ID phòng voice để chui vào lại
                    "loop": self.loops.get(gid, False),
                    "volume": self.volumes.get(gid, 0.5)
                }
        self.save_json(QUEUE_FILE, data)
        print("💾 Mosa Music: Đã lưu hàng đợi.")

    def cog_unload(self):
        """Hàm này tự động chạy khi Bot tắt hoặc Cog bị reload."""
        self.save_queues_to_file()
        # Dừng nhạc thủ công để tránh lỗi kẹt process ffmpeg
        for gid in self.bot.voice_clients:
            try: gid.disconnect(force=True)
            except: pass

    @commands.Cog.listener()
    async def on_ready(self):
        """Hàm này chạy khi Bot khởi động xong -> Tiến hành khôi phục."""
        await self.restore_queues()

    async def restore_queues(self):
        """Đọc file json và khôi phục lại hiện trường."""
        if not os.path.exists(QUEUE_FILE): return
        
        print("♻️ Đang khôi phục hàng đợi nhạc...")
        try:
            data = self.load_json(QUEUE_FILE)
            for gid_str, info in data.items():
                try:
                    gid = int(gid_str)
                    guild = self.bot.get_guild(gid)
                    if not guild: continue

                    # 1. Khôi phục dữ liệu biến
                    self.queues[gid] = info.get("queue", [])
                    self.loops[gid] = info.get("loop", False)
                    self.volumes[gid] = info.get("volume", 0.5)
                    
                    # Nếu lúc tắt đang có bài hát dở, nhét nó lên đầu hàng đợi để phát lại
                    current_song = info.get("current_song")
                    if current_song:
                        self.queues[gid].insert(0, current_song)

                    # 2. Kết nối lại Voice Channel
                    vc_id = info.get("voice_channel_id")
                    voice_channel = guild.get_channel(vc_id)
                    
                    if voice_channel:
                        # Kết nối voice
                        try:
                            if not guild.voice_client:
                                await voice_channel.connect()
                        except: pass # Nếu đã kết nối rồi thì bỏ qua
                        
                        # Set lại âm lượng cũ
                        if guild.voice_client and guild.voice_client.source:
                             guild.voice_client.source.volume = self.volumes[gid]

                        # 3. Kích hoạt lại Player Loop
                        # Cần tìm kênh text để gửi lại cái bảng điều khiển (UI)
                        setup_id = self.settings.get(str(gid), {}).get("music_channel_id")
                        text_channel = guild.get_channel(int(setup_id)) if setup_id else None
                        
                        # Nếu không tìm thấy kênh cài đặt, thử dùng kênh voice làm kênh chat (nếu cho phép) hoặc bỏ qua UI
                        if not text_channel and hasattr(voice_channel, 'send'):
                            text_channel = voice_channel

                        if text_channel and self.queues[gid]:
                             # Gọi hàm start_playing để bắt đầu vòng lặp nhạc
                             await self.start_playing(text_channel, gid)
                             print(f"✅ Đã khôi phục nhạc cho server: {guild.name}")
                except Exception as e:
                    print(f"❌ Lỗi khôi phục server {gid_str}: {e}")
            
            # Xóa file sau khi khôi phục để tránh lặp lại nếu lần sau tắt bot không đúng cách
            os.remove(QUEUE_FILE)
            
        except Exception as e:
            print(f"⚠️ Lỗi đọc file queue: {e}")
        
    def pause_music(self, guild_id):
        guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client and guild.voice_client.is_playing():
            guild.voice_client.pause()
            self.pause_times[guild_id] = time.time() # Lưu thời điểm bấm pause

    def resume_music(self, guild_id):
        guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client and guild.voice_client.is_paused():
            guild.voice_client.resume()
            if guild_id in self.pause_times:
                # Dời thời gian bắt đầu lên một đoạn bằng khoảng thời gian đã pause
                # Để thanh seek tiếp tục chạy đúng vị trí
                self.start_times[guild_id] += time.time() - self.pause_times[guild_id]
                del self.pause_times[guild_id]

    def load_json(self, f): return json.load(open(f, "r", encoding="utf-8")) if os.path.exists(f) else {}
    def save_json(self, f, d): 
        if not os.path.exists(DATA_FOLDER): os.makedirs(DATA_FOLDER)
        json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=4)
    def get_default_volume(self, gid): return self.settings.get(str(gid), {}).get("default_volume", 0.5)
    
    async def check_music_channel(self, interaction: discord.Interaction):
        # Bỏ qua kiểm tra nếu là lệnh giả lập từ Web
        if interaction.__class__.__name__ == 'FakeInteraction': return True
        
        # Lấy ID kênh nhạc từ cài đặt
        setup_id = self.settings.get(str(interaction.guild_id), {}).get("music_channel_id")
        
        # Nếu đã set kênh nhạc VÀ người dùng đang chat sai kênh
        if setup_id and interaction.channel_id != setup_id:
            msg = f"🚫 Bạn hãy vào kênh <#{setup_id}> để yêu cầu nhạc."
            
            # KIỂM TRA THÔNG MINH:
            # Nếu lệnh đã lỡ 'defer' (đang suy nghĩ) thì dùng followup để gửi tin nhắn tiếp theo
            if interaction.response.is_done():
                await interaction.followup.send(msg, ephemeral=True)
            # Nếu chưa 'defer' thì trả lời trực tiếp (sẽ ẩn hoàn toàn với người khác)
            else:
                await interaction.response.send_message(msg, ephemeral=True)
            
            return False
        return True
    
    def shuffle_queue(self, guild_id):
        if guild_id in self.queues and self.queues[guild_id]:
            random.shuffle(self.queues[guild_id])
            return True
        return False

    async def search_youtube(self, q):
        loop = asyncio.get_event_loop()
        with yt_dlp.YoutubeDL(YDL_OPTIONS) as ydl:
            try: return (await loop.run_in_executor(None, lambda: ydl.extract_info(f"ytsearch{SEARCH_LIMIT}:{q}", download=False))).get('entries', [])
            except: return []

    async def get_song_info(self, q):
        loop = asyncio.get_event_loop()
        with yt_dlp.YoutubeDL(YDL_OPTIONS) as ydl:
            try:
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(q, download=False))
                if 'entries' in info: return info['entries']
                return {'stream_url': info['url'], 'webpage_url': info.get('webpage_url', info.get('url')), 'title': info['title'], 'thumbnail': info.get('thumbnail'), 'channel': info.get('uploader', 'Unknown'), 'duration': info.get('duration', 0)}
            except: return None

    def get_stream_info(self, url):
        try:
            opts = YDL_OPTIONS.copy()
            opts['extract_flat'] = False 
            return yt_dlp.YoutubeDL(opts).extract_info(url, download=False)
        except: return None

    async def update_ui(self, guild_id):
        if guild_id not in self.ui_messages or guild_id not in self.current_songs: return
        msg = self.ui_messages[guild_id]; info = self.current_songs[guild_id]
        guild = self.bot.get_guild(guild_id); vc = guild.voice_client if guild else None
        if not vc: return
        view = MusicController(self, guild_id, info)
        for child in view.children:
            if hasattr(child, "custom_id") and child.custom_id == "btn_pause": child.emoji = "▶️" if vc.is_paused() else "⏸️"; break
        try: await msg.edit(embed=view.create_embed(), view=view)
        except: pass

    # Hàm đếm ngược 15 phút rồi thoát
    async def idle_disconnect(self, guild_id, channel):
        try:
            print(f"⏳ Bắt đầu đếm 15 phút rời kênh {guild_id}")
            await asyncio.sleep(900) # 900 giây = 15 phút
            
            guild = self.bot.get_guild(guild_id)
            if guild and guild.voice_client:
                # 1. Gọi hàm stop_player để dọn dẹp hàng chờ và vòng lặp phát nhạc
                await self.stop_player(guild_id)
                
                # 2. Sử dụng force=True để buộc ngắt kết nối ngay lập tức
                await guild.voice_client.disconnect(force=True)
                
                await channel.send("💤 **Phòng trống quá lâu (15p), mình đi ngủ đây!**")
                
                # 3. Dọn dẹp tin nhắn giao diện nếu còn sót lại
                if guild_id in self.ui_messages:
                    try: await self.ui_messages[guild_id].delete()
                    except: pass
                    
        except asyncio.CancelledError:
            print(f"❌ Hủy đếm giờ kênh {guild_id} (Có hoạt động mới)")
        except Exception as e:
            print(f"⚠️ Lỗi khi tự động rời kênh: {e}")
        finally:
            if guild_id in self.idle_timers:
                del self.idle_timers[guild_id]

    # Tự động xử lý khi người dùng ra/vào kênh
    @commands.Cog.listener()
    async def on_voice_state_update(self, member, before, after):
        if member.bot: return # Bỏ qua bot khác
        
        # Lấy voice client của bot trong server này
        vc = member.guild.voice_client
        if not vc or not vc.channel: return

        # Chỉ xử lý nếu sự kiện xảy ra trong kênh bot đang ngồi
        if (before.channel != vc.channel) and (after.channel != vc.channel): return

        guild_id = member.guild.id
        
        # 1. Nếu có người vào phòng (Số người > 1) -> Hủy đếm giờ
        if len(vc.channel.members) > 1:
            if guild_id in self.idle_timers:
                try:
                    self.idle_timers[guild_id].cancel()
                    del self.idle_timers[guild_id]
                except: pass

        # 2. Nếu phòng trống (Chỉ còn 1 mình bot)
        elif len(vc.channel.members) == 1:
            # --- LOGIC MỚI: GIỮ NGUYÊN HÀNG ĐỢI & ĐẾM NGƯỢC NGAY ---
            
            # Kiểm tra xem server có bật chế độ auto_leave không (Mặc định là True)
            is_auto_leave = self.settings.get(str(guild_id), {}).get("auto_leave", True)
            
            if is_auto_leave:
                # Nếu chưa có hẹn giờ thì bắt đầu đếm ngay lập tức
                if guild_id not in self.idle_timers:
                    # Xác định kênh text để gửi thông báo khi hết giờ
                    setup_id = self.settings.get(str(guild_id), {}).get("music_channel_id")
                    target_channel = self.bot.get_channel(int(setup_id)) if setup_id else vc.channel
                    
                    if target_channel:
                        # Bắt đầu đếm 15 phút (bất kể đang phát nhạc hay không)
                        self.idle_timers[guild_id] = asyncio.create_task(self.idle_disconnect(guild_id, target_channel))
                        
    async def player_loop(self, guild_id, channel):
        while True:
            is_seeking = self.seek_flags.get(guild_id, False)
            
            if is_seeking:
                song_data = self.current_songs[guild_id]
                start_offset = self.seek_pos.get(guild_id, 0)
                self.seek_flags[guild_id] = False 
            else:
                self.force_skips[guild_id] = False
                
                # --- LOGIC MỚI: Xử lý khi hết nhạc (Queue empty) ---
                if guild_id not in self.queues or not self.queues[guild_id]:
                    if guild_id in self.current_songs: del self.current_songs[guild_id]
                    if guild_id in self.ui_messages: 
                        try: await self.ui_messages[guild_id].delete()
                        except: pass
                    if guild_id in self.active_tasks: del self.active_tasks[guild_id]
                    
                    if not self.manual_stops.get(guild_id, False): 
                        # Xác định kênh gửi thông báo Hết Nhạc (ưu tiên Music Channel)
                        target_channel = channel
                        setup_id = self.settings.get(str(guild_id), {}).get("music_channel_id")
                        if setup_id:
                            try:
                                found = self.bot.get_channel(int(setup_id))
                                if found: target_channel = found
                            except: pass
                        
                        await target_channel.send("✅ **Hết nhạc.**")
                        
                        # Chỉ đếm giờ nếu auto_leave=True VÀ phòng trống
                        guild = self.bot.get_guild(guild_id)
                        is_auto_leave = self.settings.get(str(guild_id), {}).get("auto_leave", True)

                        if is_auto_leave and guild and guild.voice_client and guild.voice_client.channel:
                            if len(guild.voice_client.channel.members) == 1:
                                if guild_id not in self.idle_timers:
                                    self.idle_timers[guild_id] = asyncio.create_task(self.idle_disconnect(guild_id, target_channel))
                            else:
                                # Nếu vẫn còn người -> Không làm gì cả (Bot ở lại, không đếm giờ)
                                pass

                    if guild_id in self.manual_stops: del self.manual_stops[guild_id]
                    break 
                # -----------------------------------------------------

                song_data = self.queues[guild_id].pop(0)
                self.current_songs[guild_id] = song_data
                start_offset = 0
            
            voice_cog = self.bot.get_cog("Voice")
            if voice_cog and guild_id in voice_cog.welcome_channels: del voice_cog.welcome_channels[guild_id]
            guild = self.bot.get_guild(guild_id)
            if not guild or not guild.voice_client: break 

            try:
                loop = asyncio.get_event_loop()
                full_info = await loop.run_in_executor(None, lambda: self.get_stream_info(song_data['webpage_url']))
                
                if full_info:
                    play_url = full_info['url']
                    song_data['title'] = full_info.get('title', song_data['title'])
                    song_data['thumbnail'] = full_info.get('thumbnail', song_data['thumbnail'])
                    song_data['duration'] = full_info.get('duration', song_data['duration'])
                    self.current_songs[guild_id] = song_data 
                else:
                    play_url = song_data.get('stream_url')
                    
                if not play_url:
                    await channel.send(f"⚠️ Không thể trích xuất âm thanh cho bài: **{song_data['title']}** (Có thể do YouTube chặn). Đang bỏ qua...")
                    continue

                ffmpeg_local = os.path.abspath("ffmpeg.exe")
                exe = ffmpeg_local if os.path.exists(ffmpeg_local) else "ffmpeg"
                
                current_opts = FFMPEG_OPTIONS.copy()
                
                active_filter = self.current_filters.get(guild_id)
                if active_filter:
                    current_opts['options'] = f'-af "{active_filter}" ' + current_opts.get('options', '')

                if start_offset > 0:
                    current_opts['before_options'] = f"-ss {start_offset} " + current_opts.get('before_options', '')

                source = discord.FFmpegPCMAudio(play_url, executable=exe, **current_opts)
                vol = self.volumes.get(guild_id, self.get_default_volume(guild_id))
                self.volumes[guild_id] = vol
                
                if guild_id in self.ui_messages: 
                    try: await self.ui_messages[guild_id].delete()
                    except: pass
                
                # --- TẠO VIEW ---
                view = MusicController(self, guild_id, song_data)
                
                # --- TÌM KÊNH ĐỂ GỬI ---
                target_channel = channel 
                saved_settings = self.settings.get(str(guild_id), {})
                music_channel_id = saved_settings.get("music_channel_id")
                
                if music_channel_id:
                    try:
                        found_channel = self.bot.get_channel(int(music_channel_id))
                        if found_channel: target_channel = found_channel
                    except: pass
                
                # --- XỬ LÝ GIAO DIỆN (LOGIC MỚI) ---
                # Nếu đang tua (start_offset > 0) và đã có tin nhắn cũ -> Chỉ Edit
                if start_offset > 0 and guild_id in self.ui_messages:
                    try:
                        await self.ui_messages[guild_id].edit(embed=view.create_embed(), view=view)
                    except Exception as e:
                        # Nếu lỗi (tin nhắn bị xóa mất) thì gửi mới
                        if guild_id in self.ui_messages: 
                            try: await self.ui_messages[guild_id].delete()
                            except: pass
                        self.ui_messages[guild_id] = await target_channel.send(embed=view.create_embed(), view=view)
                
                # Nếu là bài hát mới (start_offset == 0) -> Xóa cũ gửi mới
                else:
                    if guild_id in self.ui_messages: 
                        try: await self.ui_messages[guild_id].delete()
                        except: pass
                    self.ui_messages[guild_id] = await target_channel.send(embed=view.create_embed(), view=view)
                # ----------------------------------------------------------------

                next_song = asyncio.Event()
                def after(e): self.bot.loop.call_soon_threadsafe(next_song.set)
                
                if guild.voice_client.is_playing(): guild.voice_client.stop()
                
                self.start_times[guild_id] = time.time()
                self.current_offsets[guild_id] = start_offset
                if guild_id in self.pause_times: del self.pause_times[guild_id] 
                guild.voice_client.play(discord.PCMVolumeTransformer(source, volume=vol), after=after)
                await next_song.wait()

                if self.seek_flags.get(guild_id, False): continue
                if self.loops.get(guild_id, False) and not self.force_skips.get(guild_id, False):
                    self.queues[guild_id].insert(0, song_data)

            except Exception as e:
                print(f"Err: {e}"); 
                # await channel.send(f"⚠️ Lỗi bài **{song_data['title']}**.", delete_after=5); 
                await asyncio.sleep(1) 

    async def start_playing(self, channel, guild_id):
        # Hủy hẹn giờ thoát nếu có lệnh phát nhạc mới
        if guild_id in self.idle_timers:
            self.idle_timers[guild_id].cancel()
            del self.idle_timers[guild_id]

        self.manual_stops[guild_id] = False
        if guild_id not in self.active_tasks or self.active_tasks[guild_id].done():
            self.active_tasks[guild_id] = asyncio.create_task(self.player_loop(guild_id, channel))

    async def stop_player(self, guild_id):
        self.queues[guild_id] = []; self.manual_stops[guild_id] = True; self.force_skips[guild_id] = True
        if guild_id in self.current_songs: del self.current_songs[guild_id]
        guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client: guild.voice_client.stop()
    
    async def skip_song(self, guild_id):
        self.force_skips[guild_id] = True; guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client and (guild.voice_client.is_playing() or guild.voice_client.is_paused()): guild.voice_client.stop()

    def seek_song(self, guild_id, seconds):
        guild = self.bot.get_guild(guild_id)
    # Chỉ cần có voice_client và đang kết nối là cho phép tua
        if not guild or not guild.voice_client or not guild.voice_client.is_connected(): return False

        self.seek_flags[guild_id] = True
        self.seek_pos[guild_id] = seconds

    # Nếu đang hát hoặc đang pause thì đều stop để tua
        if guild.voice_client.is_playing() or guild.voice_client.is_paused():
            guild.voice_client.stop()

        return True

    def move_song(self, guild_id, from_idx, to_idx):
        if guild_id not in self.queues: return False
        try: s = self.queues[guild_id].pop(from_idx); self.queues[guild_id].insert(to_idx, s); return True
        except: return False

    async def process_song_request(self, interaction, song_data, from_selection=False):
        if not await self.check_music_channel(interaction): return
        gid = interaction.guild_id
        if gid not in self.queues: self.queues[gid] = []
        vc = interaction.guild.voice_client
        if not vc:
            if interaction.user.voice: await interaction.user.voice.channel.connect(); vc = interaction.guild.voice_client
            else: return await interaction.followup.send("❌ Vào Voice đi!")

        if isinstance(song_data, list):
            count = 0
            for item in song_data:
                web_url = item.get('webpage_url') or item.get('url')
                if web_url and "http" not in web_url: web_url = f"https://www.youtube.com/watch?v={web_url}"
                final_data = {'stream_url': None, 'webpage_url': web_url, 'title': item.get('title', 'Unknown'), 'thumbnail': item.get('thumbnail'), 'channel': item.get('uploader', 'Unknown'), 'duration': item.get('duration', 0)}
                self.queues[gid].append(final_data); count += 1
            await interaction.followup.send(f"✅ Đã thêm Playlist: **{count} bài**!")
        else:
            final_data = song_data if 'stream_url' in song_data else {
                'stream_url': None, 'webpage_url': song_data.get('webpage_url') or song_data.get('url'),
                'title': song_data['title'], 'thumbnail': song_data.get('thumbnail'), 'channel': song_data.get('channel', 'Unknown'),
                'duration': song_data.get('duration', 0)
            }
            self.queues[gid].append(final_data)
            if gid not in self.active_tasks or self.active_tasks[gid].done(): await interaction.followup.send(f"▶️ Playing: **{final_data['title']}**")
            else: await interaction.followup.send(f"✅ Added: **{final_data['title']}**")

        if gid not in self.active_tasks or self.active_tasks[gid].done(): await self.start_playing(interaction.channel, gid)

    # --- COMMANDS ---
    @app_commands.command(name="set_music", description="[Admin] Set music channel")
    @app_commands.checks.has_permissions(manage_channels=True)
    async def set_music(self, interaction: discord.Interaction):
        await interaction.response.defer()
        gid = str(interaction.guild_id)
        if gid not in self.settings: self.settings[gid] = {}
        self.settings[gid]["music_channel_id"] = interaction.channel.id
        self.save_json(SETTINGS_FILE, self.settings)
        await interaction.followup.send(f"✅ Channel: {interaction.channel.mention}")

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
        
        vc = interaction.guild.voice_client
        if vc and vc.is_playing() and gid in self.start_times:
            current_pos = (time.time() - self.start_times[gid]) + self.current_offsets.get(gid, 0)
            self.seek_song(gid, current_pos)
            
        await interaction.followup.send(f"🎛️ Đã chỉnh hiệu ứng: **{effect.name}**")

    @app_commands.command(name="prioritize", description="Ưu tiên bài hát")
    async def prioritize(self, interaction: discord.Interaction):
        if not await self.check_music_channel(interaction): return
        gid = interaction.guild_id
        if gid not in self.queues or not self.queues[gid]: return await interaction.response.send_message("📭 Trống.", ephemeral=True)
        view = PrioritizeView(self, interaction, self.queues[gid])
        await interaction.response.send_message("📂 Chọn bài ưu tiên:", view=view, ephemeral=True)

    @app_commands.command(name="play", description="Phát nhạc")
    async def play(self, interaction: discord.Interaction, query: str):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer()
        if not interaction.user.voice: return await interaction.followup.send("❌ Voice?")
        if not interaction.guild.voice_client: await interaction.user.voice.channel.connect()
        
        if is_url(query):
            info = await self.get_song_info(query)
            if not info: return await interaction.followup.send("❌ Lỗi link.")
            await self.process_song_request(interaction, info)
        else:
            res = await self.search_youtube(query)
            if not res: return await interaction.followup.send("❌ Không tìm thấy.")
            await interaction.followup.send(f"🔎 Kết quả:", view=SongSelectionView(self, interaction, res))

    @app_commands.command(name="stop", description="Dừng")
    async def stop(self, interaction: discord.Interaction):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); await self.stop_player(interaction.guild_id); await interaction.followup.send("🛑 Stopped.")
    
    @app_commands.command(name="skip", description="Bỏ qua")
    async def skip(self, interaction: discord.Interaction):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); await self.skip_song(interaction.guild_id); await interaction.followup.send("⏭️ Skip.")
        
    @app_commands.command(name="volume", description="Volume")
    async def volume(self, interaction: discord.Interaction, level: int):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); self.volumes[interaction.guild_id] = level/100
        if interaction.guild.voice_client and interaction.guild.voice_client.source: interaction.guild.voice_client.source.volume = level/100
        await self.update_ui(interaction.guild_id); await interaction.followup.send(f"🔊 Vol: {level}%")

    @app_commands.command(name="loop", description="Loop")
    async def loop(self, interaction: discord.Interaction):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); self.loops[interaction.guild_id] = not self.loops.get(interaction.guild_id, False)
        await self.update_ui(interaction.guild_id); await interaction.followup.send("🔂 Loop: " + str(self.loops[interaction.guild_id]))

    @app_commands.command(name="default_volume", description="Default Volume")
    @app_commands.checks.has_permissions(administrator=True)
    async def default_volume(self, interaction: discord.Interaction, level: int):
        await interaction.response.defer(); gid = str(interaction.guild_id)
        if gid not in self.settings: self.settings[gid] = {}
        self.settings[gid]["default_volume"] = level/100; self.save_json(SETTINGS_FILE, self.settings)
        await interaction.followup.send(f"💾 Saved.")

    @app_commands.command(name="pl_save", description="Lưu Playlist")
    async def pl_save(self, interaction: discord.Interaction, name: str):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); gid = interaction.guild_id; data = []
        if gid in self.current_songs: data.append({'title': self.current_songs[gid]['title'], 'webpage_url': self.current_songs[gid]['webpage_url'], 'duration': self.current_songs[gid].get('duration', 0)})
        if gid in self.queues: 
            for s in self.queues[gid]: data.append({'title': s['title'], 'webpage_url': s['webpage_url'], 'duration': s.get('duration', 0)})
        if not data: return await interaction.followup.send("❌ Trống.")
        uid = str(interaction.user.id)
        if uid not in self.playlists: self.playlists[uid] = {}
        self.playlists[uid][name] = data; self.save_json(PLAYLIST_FILE, self.playlists)
        await interaction.followup.send(f"💾 Đã lưu **{name}**.")

    @app_commands.command(name="pl_load", description="Nạp Playlist")
    async def pl_load(self, interaction: discord.Interaction, name: str):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); uid = str(interaction.user.id)
        if uid not in self.playlists or name not in self.playlists[uid]: return await interaction.followup.send("❌ Không thấy.")
        if not interaction.guild.voice_client: await interaction.user.voice.channel.connect()
        gid = interaction.guild_id; 
        if gid not in self.queues: self.queues[gid] = []
        for s in self.playlists[uid][name]: 
            self.queues[gid].append({'stream_url': None, 'webpage_url': s['webpage_url'], 'title': s['title'], 'channel': 'Playlist', 'duration': s.get('duration', 0)})
        if gid not in self.active_tasks or self.active_tasks[gid].done(): await self.start_playing(interaction.channel, gid)
        await interaction.followup.send(f"✅ Nạp playlist **{name}**.")

    @app_commands.command(name="pl_pick", description="Chọn bài Playlist")
    async def pl_pick(self, interaction: discord.Interaction, name: str):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); uid = str(interaction.user.id); gid = interaction.guild_id
        if uid not in self.playlists or name not in self.playlists[uid]: return await interaction.followup.send("❌ Không thấy.")
        all_s = self.playlists[uid][name]; busy = set()
        if gid in self.current_songs: busy.add(self.current_songs[gid].get('webpage_url'))
        if gid in self.queues:
            for s in self.queues[gid]: busy.add(s.get('webpage_url'))
        avail = [s for s in all_s if s.get('webpage_url') not in busy]
        if not avail: return await interaction.followup.send("⚠️ Tất cả bài đều đang bận!")
        view = PlaylistSelectionView(self, interaction, avail, name)
        await interaction.followup.send(f"📂 Chọn bài '{name}':", view=view)

    @app_commands.command(name="pl_list", description="Xem Playlist")
    async def pl_list(self, interaction: discord.Interaction):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); uid = str(interaction.user.id)
        if uid in self.playlists: await interaction.followup.send(f"📂 Playlist:\n" + "\n".join([f"{k}: {len(v)} bài" for k, v in self.playlists[uid].items()]))
        else: await interaction.followup.send("📭 Trống.")

    @app_commands.command(name="pl_delete", description="Xóa Playlist")
    async def pl_delete(self, interaction: discord.Interaction, name: str):
        if not await self.check_music_channel(interaction): return
        await interaction.response.defer(); uid = str(interaction.user.id)
        if uid in self.playlists and name in self.playlists[uid]: del self.playlists[uid][name]; self.save_json(PLAYLIST_FILE, self.playlists); await interaction.followup.send(f"🗑️ Đã xóa **{name}**.")
        else: await interaction.followup.send("❌ Không tìm thấy.")
    def web_add_to_playlist(self, user_id, playlist_name, song_data):
        user_id = str(user_id)
        if user_id not in self.playlists: self.playlists[user_id] = {}
        if playlist_name not in self.playlists[user_id]: self.playlists[user_id][playlist_name] = []
        for s in self.playlists[user_id][playlist_name]:
            if s['webpage_url'] == song_data['webpage_url']: return False
        self.playlists[user_id][playlist_name].append({'title': song_data['title'], 'webpage_url': song_data['webpage_url'], 'duration': song_data.get('duration', 0)})
        self.save_json(PLAYLIST_FILE, self.playlists); return True
    
    @app_commands.command(name="afk", description="[Admin] Bật/Tắt chế độ tự động rời kênh khi rảnh (24/7)")
    @app_commands.checks.has_permissions(administrator=True) # chỉ admin dùng được
    async def afk(self, interaction: discord.Interaction):
        await interaction.response.defer()
        gid = str(interaction.guild_id)
        
        # 1. Khởi tạo settings nếu chưa có
        if gid not in self.settings: self.settings[gid] = {}
        
        # 2. Lấy trạng thái hiện tại (Mặc định là True - tức là CÓ tự động rời)
        current_status = self.settings[gid].get("auto_leave", True)
        
        # 3. Đảo ngược trạng thái
        new_status = not current_status
        self.settings[gid]["auto_leave"] = new_status
        self.save_json(SETTINGS_FILE, self.settings)
        
        status_text = "BẬT" if new_status else "TẮT"
        msg = f"✅ Chế độ tự động rời kênh: **{status_text}**"
        if not new_status:
            msg += "\n(Bot sẽ ở lại kênh Voice 24/7 kể cả khi không có ai)"

        # 4. Xử lý logic timer ngay lập tức
        if not new_status:
            # Nếu tắt AFK -> Hủy đếm giờ ngay lập tức nếu đang đếm
            if interaction.guild_id in self.idle_timers:
                self.idle_timers[interaction.guild_id].cancel()
                del self.idle_timers[interaction.guild_id]
        else:
            # Nếu bật AFK -> Kiểm tra xem phòng có đang trống không để đếm lại
            vc = interaction.guild.voice_client
            if vc and vc.channel and len(vc.channel.members) == 1:
                if interaction.guild_id not in self.idle_timers:
                    self.idle_timers[interaction.guild_id] = asyncio.create_task(
                        self.idle_disconnect(interaction.guild_id, interaction.channel)
                    )

        await interaction.followup.send(msg)

async def setup(bot):
    await bot.add_cog(Music(bot))