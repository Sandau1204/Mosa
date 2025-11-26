import discord
import yt_dlp
import asyncio
import json
import os
import re
from discord import app_commands
from discord.ext import commands
from discord.ui import Button, View, Select

# ====================================================
# CẤU HÌNH & HẰNG SỐ
# ====================================================
DATA_FOLDER = "data"
PLAYLIST_FILE = os.path.join(DATA_FOLDER, "playlists.json")
SETTINGS_FILE = os.path.join(DATA_FOLDER, "server_settings.json")
SEARCH_LIMIT = 10 

# Cấu hình yt-dlp
YDL_OPTIONS = {
    'format': 'bestaudio/best',
    'noplaylist': True,
    'quiet': True,
    'no_warnings': True,
    'default_search': 'auto',
    'source_address': '0.0.0.0',
    'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
}

FFMPEG_OPTIONS = {
    'before_options': '-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
    'options': '-vn',
}

def is_url(string):
    regex = r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+"
    return re.match(regex, string) is not None

# ====================================================
# 1. UI COMPONENTS
# ====================================================
class SongSelect(discord.ui.Select):
    def __init__(self, cog, interaction, songs_list):
        self.cog = cog
        self.origin_interaction = interaction
        self.songs_list = songs_list
        options = []
        for index, song in enumerate(songs_list):
            label = f"{index + 1}. {song['title'][:90]}"
            options.append(discord.SelectOption(label=label, value=str(index), description=song['channel'][:100]))
        super().__init__(placeholder=f"🔻 Tìm thấy {len(songs_list)} bài...", min_values=1, max_values=1, options=options)

    async def callback(self, interaction: discord.Interaction):
        selected_index = int(self.values[0])
        selected_song = self.songs_list[selected_index]
        await interaction.response.edit_message(content=f"✅ Đã chọn: **{selected_song['title']}**", view=None)
        await self.cog.process_song_request(self.origin_interaction, selected_song, from_selection=True)

class SongSelectionView(discord.ui.View):
    def __init__(self, cog, interaction, songs_list):
        super().__init__(timeout=180)
        self.add_item(SongSelect(cog, interaction, songs_list))

class MusicController(discord.ui.View):
    def __init__(self, cog, guild_id, song_info):
        super().__init__(timeout=None)
        self.cog = cog
        self.guild_id = guild_id
        self.song_info = song_info

    async def interaction_check(self, interaction: discord.Interaction):
        if interaction.user.voice and interaction.user.voice.channel == interaction.guild.voice_client.channel:
            return True
        await interaction.response.send_message("❌ Hãy vào cùng phòng Voice với Bot!", ephemeral=True)
        return False

    def create_embed(self):
        loop_status = self.cog.loops.get(self.guild_id, False)
        volume = self.cog.volumes.get(self.guild_id, 0.5)
        loop_text = "🔂 Bật (1 bài)" if loop_status else "➡️ Tắt"
        
        embed = discord.Embed(title="🎶 Đang phát nhạc", description=f"**{self.song_info['title']}**", color=discord.Color.purple())
        if 'thumbnail' in self.song_info and self.song_info['thumbnail']:
            embed.set_thumbnail(url=self.song_info['thumbnail'])
        embed.set_footer(text=f"Vol: {int(volume*100)}% | Loop: {loop_text}")
        return embed

    # --- QUAN TRỌNG: Đã thêm custom_id="btn_pause" để định danh ---
    @discord.ui.button(emoji="⏸️", style=discord.ButtonStyle.secondary, row=0, custom_id="btn_pause")
    async def pause_resume(self, interaction: discord.Interaction, button: discord.ui.Button):
        vc = interaction.guild.voice_client
        if not vc: return
        
        if vc.is_playing():
            vc.pause()
            button.emoji = "▶️" 
        elif vc.is_paused():
            vc.resume()
            button.emoji = "⏸️" 
            
        await self.cog.update_ui(self.guild_id)
        await interaction.response.defer()

    @discord.ui.button(emoji="⏭️", style=discord.ButtonStyle.secondary, row=0)
    async def skip(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.cog.skip_song(interaction.guild_id)
        await interaction.response.send_message("⏭️ Đang chuyển bài...", ephemeral=True)

    @discord.ui.button(emoji="🔂", style=discord.ButtonStyle.secondary, row=0) 
    async def loop(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.cog.loops[self.guild_id] = not self.cog.loops.get(self.guild_id, False)
        await self.cog.update_ui(self.guild_id)
        await interaction.response.defer()

    @discord.ui.button(emoji="📜", style=discord.ButtonStyle.secondary, row=0)
    async def queue_list(self, interaction: discord.Interaction, button: discord.ui.Button):
        msg = ""
        if self.guild_id in self.cog.queues and self.cog.queues[self.guild_id]:
            list_str = "\n".join([f"{i+1}. {s['title']}" for i, s in enumerate(self.cog.queues[self.guild_id][:10])])
            msg += f"**Danh sách chờ:**\n{list_str}"
        else: msg += "Hàng đợi trống."
        await interaction.response.send_message(msg, ephemeral=True)

    @discord.ui.button(emoji="🔉", style=discord.ButtonStyle.gray, row=1)
    async def vol_down(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.update_volume(interaction, -0.1)

    @discord.ui.button(emoji="🔊", style=discord.ButtonStyle.gray, row=1)
    async def vol_up(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.update_volume(interaction, 0.1)

    @discord.ui.button(emoji="🛑", style=discord.ButtonStyle.danger, row=1)
    async def stop_music(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self.cog.stop_player(interaction.guild_id)
        await interaction.response.send_message("🛑 Đã dừng nhạc.", ephemeral=False)

    async def update_volume(self, interaction, change):
        vc = interaction.guild.voice_client
        if vc and vc.source:
            current_vol = self.cog.volumes.get(self.guild_id, 0.5)
            new_vol = round(max(0.0, min(1.0, current_vol + change)), 2)
            self.cog.volumes[self.guild_id] = new_vol
            vc.source.volume = new_vol
            await self.cog.update_ui(self.guild_id)
            await interaction.response.defer()
        else: await interaction.response.send_message("❌ Lỗi volume.", ephemeral=True)

class PlaylistSongSelect(discord.ui.Select):
    def __init__(self, cog, interaction, songs_list, playlist_name):
        self.cog = cog
        self.origin_interaction = interaction
        self.songs_list = songs_list
        options = []
        limit_songs = songs_list[:25] 
        for index, song in enumerate(limit_songs):
            label = f"{index + 1}. {song['title']}"
            if len(label) > 100: label = label[:97] + "..."
            options.append(discord.SelectOption(label=label, value=str(index)))
        super().__init__(placeholder=f"📂 Chọn bài trong '{playlist_name}'...", min_values=1, max_values=1, options=options)

    async def callback(self, interaction: discord.Interaction):
        selected_index = int(self.values[0])
        selected_song = self.songs_list[selected_index]
        await interaction.response.edit_message(content=f"✅ Đã lấy từ Playlist: **{selected_song['title']}**", view=None)
        await self.cog.process_song_request(self.origin_interaction, selected_song, from_selection=True)

class PlaylistSelectionView(discord.ui.View):
    def __init__(self, cog, interaction, songs_list, playlist_name):
        super().__init__(timeout=180)
        self.add_item(PlaylistSongSelect(cog, interaction, songs_list, playlist_name))

# ====================================================
# 3. CORE LOGIC (COG)
# ====================================================
class Music(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.queues = {}        
        self.loops = {}         
        self.volumes = {}       
        self.current_songs = {} 
        self.ui_messages = {}   
        self.active_tasks = {}  
        self.manual_stops = {}
        self.force_skips = {}
        
        if not os.path.exists(DATA_FOLDER):
            os.makedirs(DATA_FOLDER)

        self.playlists = self.load_json(PLAYLIST_FILE)
        self.settings = self.load_json(SETTINGS_FILE)

    def load_json(self, filename):
        if not os.path.exists(filename): return {}
        try:
            with open(filename, "r", encoding="utf-8") as f: return json.load(f)
        except: return {}

    def save_json(self, filename, data):
        if not os.path.exists(DATA_FOLDER): os.makedirs(DATA_FOLDER)
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

    def get_default_volume(self, guild_id):
        str_id = str(guild_id)
        if str_id in self.settings and "default_volume" in self.settings[str_id]:
            return self.settings[str_id]["default_volume"]
        return 0.5

    async def search_youtube(self, query):
        loop = asyncio.get_event_loop()
        with yt_dlp.YoutubeDL(YDL_OPTIONS) as ydl:
            try:
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(f"ytsearch{SEARCH_LIMIT}:{query}", download=False))
                if 'entries' in info: return info['entries']
                return []
            except: return []

    async def get_song_info(self, query):
        loop = asyncio.get_event_loop()
        with yt_dlp.YoutubeDL(YDL_OPTIONS) as ydl:
            try:
                info = await loop.run_in_executor(None, lambda: ydl.extract_info(query, download=False))
                if 'entries' in info: info = info['entries'][0]
                return {
                    'stream_url': info['url'], 
                    'webpage_url': info.get('webpage_url', info.get('url')), 
                    'title': info['title'],
                    'thumbnail': info.get('thumbnail', None),
                    'channel': info.get('uploader', 'Unknown')
                }
            except: return None

    def refresh_url(self, webpage_url):
        try:
            with yt_dlp.YoutubeDL(YDL_OPTIONS) as ydl:
                info = ydl.extract_info(webpage_url, download=False)
                return info['url']
        except: return None

    async def update_ui(self, guild_id):
        if guild_id not in self.ui_messages or guild_id not in self.current_songs: return
        
        message = self.ui_messages[guild_id]
        song_info = self.current_songs[guild_id]
        guild = self.bot.get_guild(guild_id)
        vc = guild.voice_client if guild else None
        
        if not vc: return

        view = MusicController(self, guild_id, song_info)
        # --- SỬA LỖI Ở ĐÂY: Dùng custom_id thay vì __name__ ---
        for child in view.children:
            if hasattr(child, "custom_id") and child.custom_id == "btn_pause":
                if vc.is_paused(): child.emoji = "▶️" 
                else: child.emoji = "⏸️"
                break

        embed = view.create_embed()
        try: await message.edit(embed=embed, view=view)
        except: pass

    # --- BACKGROUND PLAYER LOOP ---
    async def player_loop(self, guild_id, channel):
        while True:
            self.force_skips[guild_id] = False

            if guild_id not in self.queues or not self.queues[guild_id]:
                if guild_id in self.current_songs: del self.current_songs[guild_id]
                if guild_id in self.ui_messages:
                    try: await self.ui_messages[guild_id].delete()
                    except: pass
                    del self.ui_messages[guild_id]
                if guild_id in self.active_tasks: del self.active_tasks[guild_id]
                
                if not self.manual_stops.get(guild_id, False):
                    await channel.send("✅ **Đã phát hết nhạc trong hàng đợi.**")
                
                if guild_id in self.manual_stops: del self.manual_stops[guild_id]
                break 

            song_data = self.queues[guild_id].pop(0)
            self.current_songs[guild_id] = song_data

            voice_cog = self.bot.get_cog("Voice")
            if voice_cog and guild_id in voice_cog.welcome_channels:
                del voice_cog.welcome_channels[guild_id]
                await channel.send("🔕 **Auto-Welcome:** Tắt để phát nhạc.")

            guild = self.bot.get_guild(guild_id)
            if not guild or not guild.voice_client: break 

            try:
                loop = asyncio.get_event_loop()
                play_url = await loop.run_in_executor(None, lambda: self.refresh_url(song_data['webpage_url']))
                if not play_url: play_url = song_data['stream_url']

                # --- DÙNG ĐƯỜNG DẪN TUYỆT ĐỐI FFMPEG (Nếu cần) ---
                ffmpeg_path = os.path.abspath("ffmpeg.exe")
                if not os.path.exists(ffmpeg_path):
                    await channel.send("❌ Lỗi: Không tìm thấy ffmpeg.exe")
                    break

                source = discord.FFmpegPCMAudio(
                    play_url,
                    executable=ffmpeg_path, 
                    **FFMPEG_OPTIONS
                )

                final_volume = self.volumes.get(guild_id, self.get_default_volume(guild_id))
                self.volumes[guild_id] = final_volume
                transformer = discord.PCMVolumeTransformer(source, volume=final_volume)

                if guild_id in self.ui_messages:
                    try: await self.ui_messages[guild_id].delete()
                    except: pass
                
                view = MusicController(self, guild_id, song_data)
                # --- SỬA LỖI Ở ĐÂY: Dùng custom_id thay vì __name__ ---
                for child in view.children:
                    if hasattr(child, "custom_id") and child.custom_id == "btn_pause":
                        child.emoji = "⏸️"
                        break

                embed = view.create_embed()
                msg = await channel.send(embed=embed, view=view)
                self.ui_messages[guild_id] = msg

                next_song_event = asyncio.Event()
                def after_callback(error):
                    if error: print(f"Player Error: {error}")
                    self.bot.loop.call_soon_threadsafe(next_song_event.set)

                if guild.voice_client.is_playing(): guild.voice_client.stop()
                guild.voice_client.play(transformer, after=after_callback)
                await next_song_event.wait()

                if self.loops.get(guild_id, False) and not self.force_skips.get(guild_id, False):
                    self.queues[guild_id].insert(0, song_data)

            except Exception as e:
                print(f"Loop Error: {e}")
                await channel.send(f"⚠️ Lỗi bài **{song_data['title']}**. Đang chuyển...", delete_after=5)
                await asyncio.sleep(1) 

    async def start_playing(self, channel, guild_id):
        self.manual_stops[guild_id] = False
        if guild_id not in self.active_tasks or self.active_tasks[guild_id].done():
            self.active_tasks[guild_id] = asyncio.create_task(self.player_loop(guild_id, channel))

    async def stop_player(self, guild_id):
        self.queues[guild_id] = []
        self.manual_stops[guild_id] = True
        self.force_skips[guild_id] = True
        if guild_id in self.current_songs: del self.current_songs[guild_id]
        guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client: guild.voice_client.stop()

    async def skip_song(self, guild_id):
        self.force_skips[guild_id] = True 
        guild = self.bot.get_guild(guild_id)
        if guild and guild.voice_client and (guild.voice_client.is_playing() or guild.voice_client.is_paused()):
            guild.voice_client.stop()

    async def process_song_request(self, interaction, song_data, from_selection=False):
        final_song_data = {}
        if 'stream_url' in song_data:
            final_song_data = song_data
        else:
            final_song_data = {
                'stream_url': None,
                'webpage_url': song_data.get('webpage_url') or song_data.get('url'),
                'title': song_data['title'],
                'thumbnail': song_data.get('thumbnail', None),
                'channel': song_data.get('channel', 'Unknown')
            }

        guild_id = interaction.guild_id
        if guild_id not in self.queues: self.queues[guild_id] = []
        
        vc = interaction.guild.voice_client
        if not vc:
            if interaction.user.voice:
                await interaction.user.voice.channel.connect()
                vc = interaction.guild.voice_client
            else:
                await interaction.followup.send("❌ Vào Voice đi bạn ơi.")
                return

        self.queues[guild_id].append(final_song_data)
        
        if guild_id not in self.active_tasks or self.active_tasks[guild_id].done():
            await self.start_playing(interaction.channel, guild_id)
            await interaction.followup.send(f"▶️ Bắt đầu phát: **{final_song_data['title']}**")
        else:
            await interaction.followup.send(f"✅ Đã thêm vào hàng đợi: **{final_song_data['title']}**")

    # --- COMMANDS ---
    @app_commands.command(name="play", description="Phát nhạc (Link hoặc Tên)")
    async def play(self, interaction: discord.Interaction, query: str):
        await interaction.response.defer()
        if not interaction.user.voice: return await interaction.followup.send("❌ Chưa vào Voice.")
        if not interaction.guild.voice_client: await interaction.user.voice.channel.connect()

        if is_url(query):
            song_info = await self.get_song_info(query)
            if not song_info: return await interaction.followup.send("❌ Lỗi link.")
            await self.process_song_request(interaction, song_info)
        else:
            results = await self.search_youtube(query)
            if not results: return await interaction.followup.send("❌ Không tìm thấy.")
            view = SongSelectionView(self, interaction, results)
            await interaction.followup.send(f"🔎 **Tìm thấy {len(results)} kết quả:**", view=view)

    @app_commands.command(name="stop", description="Dừng nhạc")
    async def stop(self, interaction: discord.Interaction):
        await interaction.response.defer()
        await self.stop_player(interaction.guild_id)
        await interaction.followup.send("🛑 Đã dừng nhạc.")

    @app_commands.command(name="skip", description="Bỏ qua bài")
    async def skip(self, interaction: discord.Interaction):
        await interaction.response.defer()
        await self.skip_song(interaction.guild_id)
        await interaction.followup.send("⏭️ Skip.")

    @app_commands.command(name="volume", description="Chỉnh âm lượng")
    async def volume(self, interaction: discord.Interaction, level: int):
        await interaction.response.defer()
        self.volumes[interaction.guild_id] = level / 100
        if interaction.guild.voice_client and interaction.guild.voice_client.source:
            interaction.guild.voice_client.source.volume = level / 100
        await self.update_ui(interaction.guild_id) # Sync UI
        await interaction.followup.send(f"🔊 Vol: {level}%")

    @app_commands.command(name="loop", description="Bật/Tắt lặp lại bài hiện tại")
    async def loop(self, interaction: discord.Interaction):
        await interaction.response.defer()
        current = self.loops.get(interaction.guild_id, False)
        self.loops[interaction.guild_id] = not current
        await self.update_ui(interaction.guild_id) # Sync UI
        status = "🔂 BẬT Loop 1 bài" if self.loops[interaction.guild_id] else "➡️ TẮT Loop"
        await interaction.followup.send(status)

    @app_commands.command(name="default_volume", description="Cài đặt âm lượng mặc định")
    @app_commands.checks.has_permissions(administrator=True)
    async def default_volume(self, interaction: discord.Interaction, level: int):
        await interaction.response.defer()
        guild_id = str(interaction.guild_id)
        if guild_id not in self.settings: self.settings[guild_id] = {}
        self.settings[guild_id]["default_volume"] = level / 100
        self.save_json(SETTINGS_FILE, self.settings)
        await interaction.followup.send(f"💾 Default Vol: {level}%")

    @app_commands.command(name="pl_save", description="Lưu Playlist")
    async def pl_save(self, interaction: discord.Interaction, name: str):
        await interaction.response.defer()
        guild_id = interaction.guild_id
        data_to_save = []
        if guild_id in self.current_songs: 
             data_to_save.append({'title': self.current_songs[guild_id]['title'], 'webpage_url': self.current_songs[guild_id]['webpage_url']})
        if guild_id in self.queues: 
            for s in self.queues[guild_id]:
                data_to_save.append({'title': s['title'], 'webpage_url': s['webpage_url']})
        
        if not data_to_save: return await interaction.followup.send("❌ Trống.")
        user_id = str(interaction.user.id)
        if user_id not in self.playlists: self.playlists[user_id] = {}
        self.playlists[user_id][name] = data_to_save
        self.save_json(PLAYLIST_FILE, self.playlists)
        await interaction.followup.send(f"💾 Đã lưu **{name}**.")

    @app_commands.command(name="pl_load", description="Nạp Playlist")
    async def pl_load(self, interaction: discord.Interaction, name: str):
        await interaction.response.defer()
        user_id = str(interaction.user.id)
        if user_id not in self.playlists or name not in self.playlists[user_id]:
            return await interaction.followup.send("❌ Không thấy playlist.")
        if not interaction.guild.voice_client: await interaction.user.voice.channel.connect()
        
        guild_id = interaction.guild_id
        if guild_id not in self.queues: self.queues[guild_id] = []
        for song in self.playlists[user_id][name]:
            info = {
                'stream_url': None,
                'webpage_url': song['webpage_url'],
                'title': song['title'],
                'thumbnail': song.get('thumbnail', None),
                'channel': song.get('channel', 'Unknown')
            }
            self.queues[guild_id].append(info)
        
        if guild_id not in self.active_tasks or self.active_tasks[guild_id].done():
            await self.start_playing(interaction.channel, guild_id)
        await interaction.followup.send(f"✅ Đã nạp playlist **{name}**.")

    @app_commands.command(name="pl_pick", description="Chọn 1 bài trong Playlist")
    async def pl_pick(self, interaction: discord.Interaction, name: str):
        await interaction.response.defer()
        user_id = str(interaction.user.id)
        guild_id = interaction.guild_id

        if user_id not in self.playlists or name not in self.playlists[user_id]:
            return await interaction.followup.send("❌ Không tìm thấy Playlist.")
        
        all_songs = self.playlists[user_id][name]
        if not all_songs: return await interaction.followup.send("❌ Playlist trống.")

        busy_urls = set()
        if guild_id in self.current_songs: busy_urls.add(self.current_songs[guild_id].get('webpage_url'))
        if guild_id in self.queues:
            for s in self.queues[guild_id]: busy_urls.add(s.get('webpage_url'))

        avail = [s for s in all_songs if s.get('webpage_url') not in busy_urls]
        if not avail: return await interaction.followup.send("⚠️ Tất cả bài đều đang bận!")

        view = PlaylistSelectionView(self, interaction, avail, name)
        msg = f"📂 **Chọn bài trong '{name}':**" + (f"\n*(Ẩn {len(all_songs)-len(avail)} bài trùng)*" if len(all_songs)>len(avail) else "")
        await interaction.followup.send(msg, view=view)

    @app_commands.command(name="pl_list", description="Xem Playlist")
    async def pl_list(self, interaction: discord.Interaction):
        await interaction.response.defer()
        user_id = str(interaction.user.id)
        if user_id in self.playlists:
            msg = "\n".join([f"{k}: {len(v)} bài" for k, v in self.playlists[user_id].items()])
            await interaction.followup.send(f"📂 **Playlist:**\n{msg}")
        else: await interaction.followup.send("📭 Trống.")

    @app_commands.command(name="pl_delete", description="Xóa Playlist")
    async def pl_delete(self, interaction: discord.Interaction, name: str):
        await interaction.response.defer()
        user_id = str(interaction.user.id)
        if user_id in self.playlists and name in self.playlists[user_id]:
            del self.playlists[user_id][name]
            self.save_json(PLAYLIST_FILE, self.playlists)
            await interaction.followup.send(f"🗑️ Đã xóa **{name}**.")
        else: await interaction.followup.send("❌ Không tìm thấy.")

async def setup(bot):
    await bot.add_cog(Music(bot))