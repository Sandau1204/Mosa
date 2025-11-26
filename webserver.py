from flask import Flask, render_template, request, jsonify
import threading
import asyncio
import discord
import logging
import os
import json

app = Flask(__name__)
bot_instance = None 

# Tắt log gây nhiễu của Flask
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# --- CẤU HÌNH ĐƯỜNG DẪN ---
# Nếu bạn muốn truy cập qua localhost:5000 (không có /mosa), hãy đổi thành PREFIX = ""
PREFIX = "/mosa" 

DATA_FOLDER = "data"
SETTINGS_FILE = os.path.join(DATA_FOLDER, "server_settings.json")

def run_web(bot):
    global bot_instance
    bot_instance = bot
    app.run(host='0.0.0.0', port=5000)

# --- HELPER: ĐỌC CẤU HÌNH KÊNH ---
def get_music_channel_id(guild_id):
    if not os.path.exists(SETTINGS_FILE): return None
    try:
        data = json.load(open(SETTINGS_FILE, "r", encoding="utf-8"))
        return data.get(str(guild_id), {}).get("music_channel_id")
    except: return None

# --- CLASS GIẢ LẬP TƯƠNG TÁC (ĐỂ BOT HIỂU LỆNH TỪ WEB) ---
class FakeInteraction:
    def __init__(self, guild, channel, user):
        self.guild = guild
        self.guild_id = guild.id
        self.channel = channel
        self.user = user
        
        # Giả lập các thuộc tính cần thiết
        self.response = self.Response()
        self.followup = self.Followup(channel)

    class Response:
        def is_done(self): return True
        async def defer(self, ephemeral=False): pass

    class Followup:
        def __init__(self, channel):
            self.channel = channel
        
        async def send(self, content=None, view=None, ephemeral=False):
            # Chỉ gửi tin nhắn nếu không phải là tin ephemeral (tin ẩn)
            if not ephemeral and self.channel:
                try:
                    await self.channel.send(content, view=view)
                except: pass

# ====================================================
# ROUTES API
# ====================================================

@app.route(f'{PREFIX}/')
def index():
    return render_template('index.html')

@app.route(f'{PREFIX}/api/guilds')
def get_guilds():
    if not bot_instance: return jsonify([])
    # Trả về danh sách server bot đang tham gia
    return jsonify([{"id": str(g.id), "name": g.name} for g in bot_instance.guilds])

@app.route(f'{PREFIX}/api/channels')
def get_channels():
    guild_id = request.args.get('guild_id')
    if not bot_instance or not guild_id: return jsonify([])
    try:
        guild = bot_instance.get_guild(int(guild_id))
        if not guild: return jsonify([])
        # Trả về danh sách kênh Voice
        voice_channels = [{"id": str(c.id), "name": c.name} for c in guild.voice_channels]
        return jsonify(voice_channels)
    except: return jsonify([])

@app.route(f'{PREFIX}/api/join', methods=['POST'])
def join_channel():
    guild_id = request.args.get('guild_id')
    channel_id = request.args.get('channel_id')
    if not bot_instance or not guild_id or not channel_id: return jsonify({"status": "error"})
    
    try:
        guild = bot_instance.get_guild(int(guild_id))
        channel = guild.get_channel(int(channel_id))
        
        async def connect_task():
            if guild.voice_client:
                if guild.voice_client.channel.id != channel.id: 
                    await guild.voice_client.move_to(channel)
            else: 
                await channel.connect()
        
        asyncio.run_coroutine_threadsafe(connect_task(), bot_instance.loop)
        return jsonify({"status": "ok"})
    except: return jsonify({"status": "error"})

@app.route(f'{PREFIX}/api/status')
def get_status():
    guild_id = request.args.get('guild_id')
    if not bot_instance or not guild_id: return jsonify({})
    
    music_cog = bot_instance.get_cog('Music')
    if not music_cog: return jsonify({})
    
    try:
        guild_id_int = int(guild_id)
        current = music_cog.current_songs.get(guild_id_int, {})
        queue = music_cog.queues.get(guild_id_int, [])
        loop = music_cog.loops.get(guild_id_int, False)
        guild = bot_instance.get_guild(guild_id_int)
        
        is_playing = False
        channel_name = ""
        if guild and guild.voice_client:
            is_playing = guild.voice_client.is_playing()
            channel_name = guild.voice_client.channel.name

        return jsonify({
            "title": current.get('title', ''),
            "thumbnail": current.get('thumbnail', None),
            "channel": current.get('channel', ''),
            "is_playing": is_playing,
            "loop": loop,
            "queue": [{"title": s['title']} for s in queue],
            "connected_channel": channel_name
        })
    except: return jsonify({})

@app.route(f'{PREFIX}/api/control/<action>', methods=['POST'])
def control(action):
    guild_id = request.args.get('guild_id')
    if not bot_instance or not guild_id: return jsonify({"status": "error"})
    
    guild_id_int = int(guild_id)
    music_cog = bot_instance.get_cog('Music')
    guild = bot_instance.get_guild(guild_id_int)
    vc = guild.voice_client if guild else None
    
    def run_async(coro): asyncio.run_coroutine_threadsafe(coro, bot_instance.loop)
    
    # Nút Leave không cần check VC (để thoát khi bị kẹt)
    if not vc and action != "leave": return jsonify({"status": "no_voice"})

    if action == "pause_resume":
        if vc.is_playing(): vc.pause()
        elif vc.is_paused(): vc.resume()
        run_async(music_cog.update_ui(guild_id_int))
    
    elif action == "skip": 
        run_async(music_cog.skip_song(guild_id_int))
    
    elif action == "stop": 
        run_async(music_cog.stop_player(guild_id_int))
        
    elif action == "leave":
        run_async(music_cog.stop_player(guild_id_int))
        async def do_leave(): 
            await asyncio.sleep(0.1) 
            if guild.voice_client: await guild.voice_client.disconnect()
        run_async(do_leave())
    
    elif action == "loop": 
        music_cog.loops[guild_id_int] = not music_cog.loops.get(guild_id_int, False)
        run_async(music_cog.update_ui(guild_id_int))

    elif action == "vol_up":
        vol = music_cog.volumes.get(guild_id_int, 0.5) + 0.1
        music_cog.volumes[guild_id_int] = min(1.0, vol)
        if vc.source: vc.source.volume = music_cog.volumes[guild_id_int]
        run_async(music_cog.update_ui(guild_id_int))

    elif action == "vol_down":
        vol = music_cog.volumes.get(guild_id_int, 0.5) - 0.1
        music_cog.volumes[guild_id_int] = max(0.0, vol)
        if vc.source: vc.source.volume = music_cog.volumes[guild_id_int]
        run_async(music_cog.update_ui(guild_id_int))

    return jsonify({"status": "ok"})

@app.route(f'{PREFIX}/api/search', methods=['GET'])
def search_api():
    query = request.args.get('query')
    if not bot_instance or not query: return jsonify([])
    music_cog = bot_instance.get_cog('Music')
    
    async def do_search():
        return await music_cog.search_youtube(query)
    
    future = asyncio.run_coroutine_threadsafe(do_search(), bot_instance.loop)
    try:
        results = future.result(timeout=15) 
        clean_results = []
        for r in results:
            url = r.get('webpage_url') or r.get('url')
            if not url and r.get('id'): url = f"https://www.youtube.com/watch?v={r['id']}"
            
            if url:
                clean_results.append({
                    'title': r.get('title', 'Unknown'),
                    'url': url,
                    'thumbnail': r.get('thumbnail', ''),
                    'uploader': r.get('uploader', ''),
                    'duration': r.get('duration_string', '')
                })
        return jsonify(clean_results)
    except: return jsonify([])

@app.route(f'{PREFIX}/api/play', methods=['POST'])
def play_api():
    guild_id = request.args.get('guild_id')
    query = request.args.get('query')
    if not bot_instance or not guild_id or not query: return jsonify({"status": "error"})
    
    try:
        guild_id_int = int(guild_id)
        music_cog = bot_instance.get_cog('Music')
        guild = bot_instance.get_guild(guild_id_int)
        
        # --- LOGIC CHỌN KÊNH CHAT ---
        text_channel = None

        # 1. Ưu tiên kênh đã Setup bằng /set_music
        setup_id = get_music_channel_id(guild_id_int)
        if setup_id:
            text_channel = guild.get_channel(setup_id)
        
        # 2. Nếu không, dùng kênh có UI cũ
        if not text_channel and guild_id_int in music_cog.ui_messages:
            try: text_channel = music_cog.ui_messages[guild_id_int].channel
            except: pass
        
        # 3. Nếu không, dùng kênh chat trong Voice
        if not text_channel and guild.voice_client and hasattr(guild.voice_client.channel, 'send'):
             text_channel = guild.voice_client.channel

        # 4. Fallback
        if not text_channel and guild.text_channels: 
            text_channel = guild.text_channels[0]

        if text_channel:
            async def do_play():
                if not guild.voice_client: return 
                
                # Nếu là link -> Get Info
                if "http" in query: 
                    info = await music_cog.get_song_info(query)
                # Nếu là tên (do người dùng chọn từ search) -> Search lại để lấy info chuẩn
                else:
                    res = await music_cog.search_youtube(query)
                    info = res[0] if res else None
                
                if info:
                    fake_user = guild.me 
                    fake_inter = FakeInteraction(guild, text_channel, fake_user)
                    await music_cog.process_song_request(fake_inter, info)
            
            asyncio.run_coroutine_threadsafe(do_play(), bot_instance.loop)
        return jsonify({"status": "ok"})
    except Exception as e:
        print(e)
        return jsonify({"status": "error"})