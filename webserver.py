from flask import Flask, render_template, request, jsonify
import threading
import asyncio
import discord
import logging
import os
import json
import time 


app = Flask(__name__, static_url_path='/mosa/static')
bot_instance = None 

# Tắt log gây nhiễu
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Cấu hình đường dẫn
PREFIX = "/mosa" 
DATA_FOLDER = "data"
SETTINGS_FILE = os.path.join(DATA_FOLDER, "server_settings.json")

def run_web(bot):
    global bot_instance
    bot_instance = bot
    app.run(host='0.0.0.0', port=5000)

def get_music_channel_id(guild_id):
    if not os.path.exists(SETTINGS_FILE): return None
    try:
        data = json.load(open(SETTINGS_FILE, "r", encoding="utf-8"))
        return data.get(str(guild_id), {}).get("music_channel_id")
    except: return None

class FakeInteraction:
    def __init__(self, guild, channel, user):
        self.guild = guild; self.guild_id = guild.id; self.channel = channel; self.user = user
        self.response = self.Response(); self.followup = self.Followup(channel)
    class Response:
        def is_done(self): return True
        async def defer(self, ephemeral=False): pass
    class Followup:
        def __init__(self, c): self.c = c
        async def send(self, content=None, view=None, ephemeral=False):
            if not ephemeral and self.c: 
                try: await self.c.send(content, view=view)
                except: pass

@app.route(f'{PREFIX}/')
def index(): return render_template('index.html')

@app.route(f'{PREFIX}/api/guilds')
def get_guilds():
    if not bot_instance: return jsonify([])
    return jsonify([{"id": str(g.id), "name": g.name} for g in bot_instance.guilds])

@app.route(f'{PREFIX}/api/channels')
def get_channels():
    gid = request.args.get('guild_id')
    if not bot_instance or not gid: return jsonify([])
    try:
        g = bot_instance.get_guild(int(gid))
        return jsonify([{"id": str(c.id), "name": c.name} for c in g.voice_channels]) if g else jsonify([])
    except: return jsonify([])

@app.route(f'{PREFIX}/api/join', methods=['POST'])
def join_channel():
    gid = request.args.get('guild_id'); cid = request.args.get('channel_id')
    if not bot_instance or not gid or not cid: return jsonify({"status": "error"})
    try:
        g = bot_instance.get_guild(int(gid)); c = g.get_channel(int(cid))
        async def conn():
            if g.voice_client: 
                if g.voice_client.channel.id != c.id: await g.voice_client.move_to(c)
            else: await c.connect()
        asyncio.run_coroutine_threadsafe(conn(), bot_instance.loop)
        return jsonify({"status": "ok"})
    except: return jsonify({"status": "error"})

@app.route(f'{PREFIX}/api/status')
def get_status():
    gid = request.args.get('guild_id')
    if not bot_instance or not gid: return jsonify({})
    mc = bot_instance.get_cog('Music')
    if not mc: return jsonify({})
    try:
        gid_int = int(gid)
        cur = mc.current_songs.get(gid_int, {})
        q = mc.queues.get(gid_int, [])
        g = bot_instance.get_guild(gid_int)
        
        playing = False; c_name = ""; c_id = ""
        current_pos = 0
        if g and g.voice_client:
            playing = g.voice_client.is_playing()
            c_name = g.voice_client.channel.name
            c_id = str(g.voice_client.channel.id)
            if playing and gid_int in mc.start_times:
                current_pos = (time.time() - mc.start_times[gid_int]) + mc.current_offsets.get(gid_int, 0)

        return jsonify({
            "title": cur.get('title', ''), 
            "thumbnail": cur.get('thumbnail', None),
            "channel": cur.get('channel', ''), 
            "is_playing": playing,
            "loop": mc.loops.get(gid_int, False), 
            "queue": [{"title": s['title']} for s in q],
            "connected_channel": c_name, 
            "connected_channel_id": c_id,
            "duration": cur.get('duration', 0), 
            "position": current_pos 
        })
    except: return jsonify({})

@app.route(f'{PREFIX}/api/control/<action>', methods=['POST'])
def control(action):
    gid = request.args.get('guild_id')
    if not bot_instance or not gid: return jsonify({"status": "error"})
    gid_int = int(gid); mc = bot_instance.get_cog('Music'); g = bot_instance.get_guild(gid_int)
    vc = g.voice_client if g else None
    def run(coro): asyncio.run_coroutine_threadsafe(coro, bot_instance.loop)
    
    if not vc and action != "leave": return jsonify({"status": "no_voice"})

    if action == "pause_resume":
        if vc.is_playing(): vc.pause()
        elif vc.is_paused(): vc.resume()
        run(mc.update_ui(gid_int))
    elif action == "skip": run(mc.skip_song(gid_int))
    elif action == "stop": run(mc.stop_player(gid_int))
    elif action == "leave":
        run(mc.stop_player(gid_int))
        async def lv(): 
            await asyncio.sleep(0.1) 
            if g.voice_client: await g.voice_client.disconnect()
        run(lv())
    elif action == "loop": 
        mc.loops[gid_int] = not mc.loops.get(gid_int, False); run(mc.update_ui(gid_int))
    elif action == "vol_up":
        v = min(1.0, mc.volumes.get(gid_int, 0.5) + 0.1); mc.volumes[gid_int] = v; vc.source.volume = v; run(mc.update_ui(gid_int))
    elif action == "vol_down":
        v = max(0.0, mc.volumes.get(gid_int, 0.5) - 0.1); mc.volumes[gid_int] = v; vc.source.volume = v; run(mc.update_ui(gid_int))
    elif action == "seek":
        seconds = request.args.get('seconds')
        if seconds:
            try:
                sec = float(seconds)
                success = mc.seek_song(gid_int, sec)
                if success: return jsonify({"status": "ok"})
            except: pass
        return jsonify({"status": "error"})
        
    return jsonify({"status": "ok"})

@app.route(f'{PREFIX}/api/queue/move', methods=['POST'])
def move_queue_item():
    gid = request.args.get('guild_id'); from_idx = request.args.get('from'); to_idx = request.args.get('to')
    if not bot_instance or not gid or from_idx is None or to_idx is None: return jsonify({"status": "error"})
    try:
        mc = bot_instance.get_cog('Music')
        if mc: 
            if mc.move_song(int(gid), int(from_idx), int(to_idx)): return jsonify({"status": "ok"})
    except: pass
    return jsonify({"status": "error"})

@app.route(f'{PREFIX}/api/search', methods=['GET'])
def search_api():
    query = request.args.get('query')
    if not bot_instance or not query: return jsonify([])
    mc = bot_instance.get_cog('Music')
    async def do_search(): return await mc.search_youtube(query)
    future = asyncio.run_coroutine_threadsafe(do_search(), bot_instance.loop)
    try:
        results = future.result(timeout=15); clean_results = []
        for r in results:
            url = r.get('webpage_url') or r.get('url')
            if not url and r.get('id'): url = f"https://www.youtube.com/watch?v={r['id']}"
            if url: clean_results.append({'title': r.get('title', 'Unknown'), 'url': url, 'thumbnail': r.get('thumbnail', ''), 'uploader': r.get('uploader', ''), 'duration': r.get('duration_string', '')})
        return jsonify(clean_results)
    except: return jsonify([])

@app.route(f'{PREFIX}/api/play', methods=['POST'])
def play_api():
    gid = request.args.get('guild_id'); query = request.args.get('query')
    if not bot_instance or not gid or not query: return jsonify({"status": "error"})
    try:
        gid_int = int(gid); mc = bot_instance.get_cog('Music'); g = bot_instance.get_guild(gid_int)
        text_channel = _get_text_channel(g, mc)
        if text_channel:
            async def do_play():
                if not g.voice_client: return 
                if "http" in query: info = await mc.get_song_info(query)
                else:
                    res = await mc.search_youtube(query)
                    info = res[0] if res else None
                if info:
                    fake = FakeInteraction(g, text_channel, g.me)
                    await mc.process_song_request(fake, info)
            asyncio.run_coroutine_threadsafe(do_play(), bot_instance.loop)
        return jsonify({"status": "ok"})
    except Exception as e: return jsonify({"status": "error"})

@app.route(f'{PREFIX}/api/playlists')
def get_playlists_api():
    if not bot_instance: return jsonify([])
    mc = bot_instance.get_cog('Music')
    if not mc: return jsonify([])
    res = []
    for uid, playlists in mc.playlists.items():
        try: user = bot_instance.get_user(int(uid)); user_name = user.name if user else f"User {uid}"
        except: user_name = f"User {uid}"
        for pl_name, tracks in playlists.items():
            res.append({"owner": user_name, "owner_id": uid, "name": pl_name, "count": len(tracks), "tracks": tracks})
    return jsonify(res)

@app.route(f'{PREFIX}/api/playlist/play_all', methods=['POST'])
def play_playlist_all_api():
    gid = request.args.get('guild_id'); uid = request.args.get('user_id'); name = request.args.get('name')
    if not bot_instance or not gid or not uid or not name: return jsonify({"status": "error"})
    try:
        gid_int = int(gid); mc = bot_instance.get_cog('Music'); g = bot_instance.get_guild(gid_int)
        songs = mc.playlists.get(str(uid), {}).get(name)
        if not songs: return jsonify({"status": "error"})
        text_channel = _get_text_channel(g, mc)
        if text_channel:
             async def do():
                 fake = FakeInteraction(g, text_channel, g.me)
                 await mc.process_song_request(fake, songs) 
             asyncio.run_coroutine_threadsafe(do(), bot_instance.loop)
             return jsonify({"status": "ok"})
        return jsonify({"status": "error"})
    except: return jsonify({"status": "error"})
# sử hàm random
@app.route(f'{PREFIX}/api/control/<action>', methods=['POST'])
def control(action):
    gid = request.args.get('guild_id')
    if not bot_instance or not gid: return jsonify({"status": "error"})
    gid_int = int(gid); mc = bot_instance.get_cog('Music'); g = bot_instance.get_guild(gid_int)
    vc = g.voice_client if g else None
    def run(coro): asyncio.run_coroutine_threadsafe(coro, bot_instance.loop)
    
    if not vc and action != "leave": return jsonify({"status": "no_voice"})

    if action == "pause_resume":
        if vc.is_playing(): vc.pause()
        elif vc.is_paused(): vc.resume()
        run(mc.update_ui(gid_int))
    elif action == "skip": run(mc.skip_song(gid_int))
    elif action == "stop": run(mc.stop_player(gid_int))
    
    # [MỚI] Thêm xử lý shuffle
    elif action == "shuffle":
        if mc.shuffle_queue(gid_int):
            run(mc.update_ui(gid_int))
        else:
            return jsonify({"status": "empty_queue"})

    elif action == "leave":
        run(mc.stop_player(gid_int))
        async def lv(): 
            await asyncio.sleep(0.1) 
            if g.voice_client: await g.voice_client.disconnect()
        run(lv())
    
    elif action == "loop": 
        mc.loops[gid_int] = not mc.loops.get(gid_int, False); run(mc.update_ui(gid_int))
    elif action == "vol_up":
        v = min(1.0, mc.volumes.get(gid_int, 0.5) + 0.1); mc.volumes[gid_int] = v; vc.source.volume = v; run(mc.update_ui(gid_int))
    elif action == "vol_down":
        v = max(0.0, mc.volumes.get(gid_int, 0.5) - 0.1); mc.volumes[gid_int] = v; vc.source.volume = v; run(mc.update_ui(gid_int))
    # ... (Giữ nguyên phần seek) ...
        
    return jsonify({"status": "ok"})

def _get_text_channel(g, mc):
    # 1. Ưu tiên kênh đã set trong cấu hình (Lấy từ Memory của Music Cog cho chuẩn)
    setup_id = None
    if mc and hasattr(mc, 'settings'):
        setup_id = mc.settings.get(str(g.id), {}).get("music_channel_id")
    
    # Fallback đọc file nếu memory chưa có (hiếm khi xảy ra)
    if not setup_id:
        setup_id = get_music_channel_id(g.id)

    if setup_id: 
        c = g.get_channel(setup_id)
        if c: return c
        # Nếu setup_id có nhưng kênh không tìm thấy (đã xóa) -> Fallback xuống dưới
    
    # 2. Nếu không set (hoặc kênh set bị xóa), ưu tiên kênh đang có bảng điều khiển
    if g.id in mc.ui_messages:
        try: return mc.ui_messages[g.id].channel
        except: pass
    
    # 3. Fallback vào kênh Voice (Tính năng mới của Discord: Text in Voice)
    if g.voice_client and hasattr(g.voice_client.channel, 'send'): 
        return g.voice_client.channel
    
    # 4. Cuối cùng lấy kênh text đầu tiên tìm thấy
    if g.text_channels: return g.text_channels[0]
    
    return None