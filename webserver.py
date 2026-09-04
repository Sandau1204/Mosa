from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import threading
import asyncio
import discord
import logging
import os
import json
import time
import requests
from dotenv import load_dotenv
from werkzeug.middleware.proxy_fix import ProxyFix

# Load biến môi trường
load_dotenv()

app = Flask(__name__, static_url_path='/static')
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.urandom(24)) # Key bảo mật cho session
# cấu hình cookie
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True

# Khai báo ProxyFix để Flask nhận diện đúng giao thức HTTPS từ Ngrok/Cloudflare
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

bot_instance = None 

# Cấu hình Discord OAuth2
CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:5000/callback")
API_ENDPOINT = 'https://discord.com/api/v10'

# Tắt log gây nhiễu
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

PREFIX = "" 
DATA_FOLDER = os.getenv("DATA_FOLDER", "data")
SETTINGS_FILE = os.path.join(DATA_FOLDER, "server_settings.json")

def run_web(bot):
    global bot_instance
    bot_instance = bot
    # Tắt chế độ debug để tránh lỗi thread
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

def get_music_channel_id(guild_id):
    if not os.path.exists(SETTINGS_FILE): return None
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get(str(guild_id), {}).get("music_channel_id")
    except: return None

# Lớp giả lập interaction cho các lệnh
class FakeInteraction:
    def __init__(self, guild, channel, user):
        self.guild = guild
        self.guild_id = guild.id
        self.channel = channel
        self.channel_id = channel.id if channel else None
        self.user = user
        self.response = self.Response(channel)
        self.followup = self.Followup(channel)

    class Response:
        def __init__(self, channel):
            self._channel = channel
            self._sent = False

        def is_done(self):
            return self._sent

        async def defer(self, ephemeral=False):
            self._sent = True
            return None

        async def send(self, content=None, embed=None, view=None, ephemeral=False):
            self._sent = True
            if self._channel:
                kwargs = {}
                if content is not None: kwargs['content'] = content
                if embed is not None: kwargs['embed'] = embed
                try:
                    await self._channel.send(**kwargs)
                except Exception:
                    pass

    class Followup:
        def __init__(self, channel):
            self._channel = channel

        async def send(self, content=None, embed=None, view=None, ephemeral=False):
            if self._channel:
                kwargs = {}
                if content is not None: kwargs['content'] = content
                if embed is not None: kwargs['embed'] = embed
                try:
                    await self._channel.send(**kwargs)
                except Exception:
                    pass

# --- ROUTES XÁC THỰC (AUTH) ---

@app.route(f'{PREFIX}/login')
def login():
    # Tạo URL đăng nhập Discord
    oauth_url = f"{API_ENDPOINT}/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify%20guilds"
    return render_template('index.html', auth_url=oauth_url)

@app.route(f'{PREFIX}/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route(f'{PREFIX}/callback')
def callback():
    code = request.args.get('code')
    if not code:
        return "Lỗi: Không tìm thấy code xác thực", 400

    # 1. Đổi code lấy Access Token
    data = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    
    r = requests.post(f'{API_ENDPOINT}/oauth2/token', data=data, headers=headers)
    if r.status_code != 200:
        return f"Lỗi xác thực Discord: {r.text}", 400
    
    token_data = r.json()
    access_token = token_data['access_token']
    
    # 2. Lấy thông tin User
    headers = {'Authorization': f'Bearer {access_token}'}
    r_user = requests.get(f'{API_ENDPOINT}/users/@me', headers=headers)
    user_data = r_user.json()
    
    # 3. Lưu vào Session
    session['user'] = user_data
    session['token'] = access_token
    
    return redirect(url_for('index'))

# Cho phép Discord nhúng Dashboard vào iframe
@app.after_request
def add_security_headers(response):
    # Cho phép Discord client nhúng iframe
    response.headers['Content-Security-Policy'] = "frame-ancestors 'self' https://discord.com https://*.discord.com;"
    # Xóa X-Frame-Options nếu có để tránh xung đột với frame-ancestors
    response.headers.pop('X-Frame-Options', None)
    return response

def check_auth():
    return 'user' in session

# --- ROUTE XÁC THỰC DÀNH CHO DISCORD ACTIVITY SDK ---
@app.route(f'{PREFIX}/api/activity-token', methods=['POST'])
def activity_token():
    data = request.json or {}
    code = data.get('code')
    if not code:
        return jsonify({"error": "Missing authorization code"}), 400

    token_payload = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code
        # LƯU Ý: Với Embedded SDK, Discord yêu cầu KHÔNG gửi redirect_uri
    }
    
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    r = requests.post(f'{API_ENDPOINT}/oauth2/token', data=token_payload, headers=headers)
    
    if r.status_code != 200:
        print(f"[LỖI OAUTH2 SDK] {r.status_code} - {r.text}") # <--- Dòng này sẽ in lỗi ra Terminal
        return jsonify({"error": "Failed to exchange token", "details": r.text}), 400

    token_data = r.json()
    session['token'] = token_data.get('access_token')
    return jsonify(token_data)
# --- ROUTES CHÍNH ---

@app.route(f'{PREFIX}/')
def index():
    if not check_auth():
        return redirect(url_for('login'))
    
    user = session.get('user')
    return render_template('index.html', user=user, client_id=CLIENT_ID)


    

@app.route(f'{PREFIX}/api/guilds')
def get_guilds():
    if not bot_instance: return jsonify([])
    
    # Bỏ qua kiểm tra token
    # Lấy trực tiếp danh sách tất cả các server mà bot đang tham gia
    common_guilds = []
    for g in bot_instance.guilds:
        # Trả về ID, tên và mã băm (hash) của icon server
        icon_hash = g.icon.key if g.icon else None
        common_guilds.append({"id": str(g.id), "name": g.name, "icon": icon_hash})
        
    return jsonify(common_guilds)
check_auth()


# --- CÁC API KHÁC (Cần kiểm tra login) ---

@app.route(f'{PREFIX}/api/channels')
def get_channels():
    if not check_auth(): return jsonify([]), 401
    gid = request.args.get('guild_id')
    if not bot_instance or not gid: return jsonify([])
    try:
        # Kiểm tra xem user có trong guild này không (bảo mật thêm nếu cần)
        g = bot_instance.get_guild(int(gid))
        return jsonify([{"id": str(c.id), "name": c.name} for c in g.voice_channels]) if g else jsonify([])
    except: return jsonify([])

@app.route(f'{PREFIX}/api/join', methods=['POST'])
def join_channel():
    if not check_auth(): return jsonify({"status": "unauthorized"}), 401
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
    # API này có thể public hoặc private tùy bạn, để private cho an toàn
    if not check_auth(): return jsonify({}), 401
    
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
        loop_status = False
        
        if g:
            vc = g.voice_client
            if vc:
                playing = vc.is_playing()
                paused = vc.is_paused()
                c_name = vc.channel.name
                c_id = str(vc.channel.id)
                if gid_int in mc.start_times:
                    if playing:
                        current_pos = (time.time() - mc.start_times[gid_int]) + mc.current_offsets.get(gid_int, 0)
                    elif paused and gid_int in mc.pause_times:
                        current_pos = (mc.pause_times[gid_int] - mc.start_times[gid_int]) + mc.current_offsets.get(gid_int, 0)

        if gid_int in mc.loops:
            loop_status = mc.loops[gid_int]

        return jsonify({
            "title": cur.get('title', ''), 
            "thumbnail": cur.get('thumbnail', None),
            "channel": cur.get('channel', ''), 
            "is_playing": playing,
            "loop": loop_status, 
            "queue": [{"title": s.get('title', ''), "webpage_url": s.get('webpage_url'), "duration": s.get('duration', 0)} for s in q],
            "connected_channel": c_name, 
            "connected_channel_id": c_id,
            "duration": cur.get('duration', 0), 
            "position": current_pos 
        })
    except: return jsonify({})

@app.route(f'{PREFIX}/api/control/<action>', methods=['POST'])
def control(action):
    if not check_auth(): return jsonify({"status": "unauthorized"}), 401
    
    gid = request.args.get('guild_id')
    if not bot_instance or not gid: return jsonify({"status": "error"})
    gid_int = int(gid)
    mc = bot_instance.get_cog('Music')
    if not mc: return jsonify({"status": "error"})
    g = bot_instance.get_guild(gid_int)
    if not g: return jsonify({"status": "error"})
    vc = g.voice_client
    loop = bot_instance.loop
    if not loop: return jsonify({"status": "error"})
    def run(coro): return asyncio.run_coroutine_threadsafe(coro, loop)
    
    if not vc and action != "leave": return jsonify({"status": "no_voice"})

    if action == "pause_resume":
        if vc and vc.is_playing(): mc.pause_music(gid_int)
        elif vc and vc.is_paused(): mc.resume_music(gid_int)
        run(mc.update_ui(gid_int))
    elif action == "skip":
        run(mc.skip_song(gid_int))
    elif action == "stop":
        run(mc.stop_player(gid_int))
    elif action == "shuffle":
        if mc.shuffle_queue(gid_int): run(mc.update_ui(gid_int))
        else: return jsonify({"status": "empty_queue"})
    elif action == "leave":
        run(mc.stop_player(gid_int))
        async def lv():
            await asyncio.sleep(0.1)
            if g.voice_client: await g.voice_client.disconnect()
        run(lv())
    elif action == "loop":
        mc.loops[gid_int] = not mc.loops.get(gid_int, False)
        run(mc.update_ui(gid_int))
    elif action == "vol_up":
        if vc and getattr(vc, 'source', None):
            v = min(1.0, mc.volumes.get(gid_int, 0.5) + 0.1)
            mc.volumes[gid_int] = v
            vc.source.volume = v
            run(mc.update_ui(gid_int))
    elif action == "vol_down":
        if vc and getattr(vc, 'source', None):
            v = max(0.0, mc.volumes.get(gid_int, 0.5) - 0.1)
            mc.volumes[gid_int] = v
            vc.source.volume = v
            run(mc.update_ui(gid_int))
    elif action == "seek":
        seconds = request.args.get('seconds')
        if seconds:
            async def do_seek(): mc.seek_song(gid_int, int(float(seconds)))
            run(do_seek())
            
    return jsonify({"status": "ok"})

@app.route(f'{PREFIX}/api/queue/move', methods=['POST'])
def move_queue_item():
    if not check_auth(): return jsonify({"status": "unauthorized"}), 401
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
    if not check_auth(): return jsonify([]), 401
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
    if not check_auth(): return jsonify({"status": "unauthorized"}), 401
    gid = request.args.get('guild_id'); query = request.args.get('query')
    if not bot_instance or not gid or not query: return jsonify({"status": "error"})
    try:
        gid_int = int(gid); mc = bot_instance.get_cog('Music'); g = bot_instance.get_guild(gid_int)
        if not g or not mc: return jsonify({"status": "error"})
        
        # Hàm phụ trợ tìm kênh text để gửi thông báo (đã có trong code cũ của bạn nhưng tôi viết lại cho chắc)
        def _get_text_channel(g, mc):
            setup_id = None
            if mc and hasattr(mc, 'settings'): setup_id = mc.settings.get(str(g.id), {}).get("music_channel_id")
            if not setup_id: setup_id = get_music_channel_id(g.id)
            if setup_id: 
                try: 
                    c = g.get_channel(int(setup_id))
                    if c: return c
                except: pass
            if g.id in mc.ui_messages: 
                try: return mc.ui_messages[g.id].channel
                except: pass
            if g.voice_client and hasattr(g.voice_client.channel, 'send'): return g.voice_client.channel
            if g.text_channels: return g.text_channels[0]
            return None

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
    if not check_auth(): return jsonify([]), 401
    if not bot_instance: return jsonify([])
    mc = bot_instance.get_cog('Music')
    if not mc: return jsonify([])
    res = []
    # Chỉ trả về playlist của user đang đăng nhập (hoặc tất cả nếu bạn muốn chia sẻ)
    # Ở đây tôi trả về hết như cũ
    for uid, playlists in mc.playlists.items():
        try: user = bot_instance.get_user(int(uid)); user_name = user.name if user else f"User {uid}"
        except: user_name = f"User {uid}"
        for pl_name, tracks in playlists.items():
            res.append({"owner": user_name, "owner_id": uid, "name": pl_name, "count": len(tracks), "tracks": tracks})
    return jsonify(res)

@app.route(f'{PREFIX}/api/playlist/play_all', methods=['POST'])
def play_playlist_all_api():
    if not check_auth(): return jsonify({"status": "unauthorized"}), 401
    gid = request.args.get('guild_id')
    uid = request.args.get('user_id')
    name = request.args.get('name')
    if not bot_instance or not gid or not uid or not name:
        return jsonify({"status": "error"})
    try:
        gid_int = int(gid)
        mc = bot_instance.get_cog('Music')
        g = bot_instance.get_guild(gid_int)
        if not g or not mc:
            return jsonify({"status": "error"})

        songs = None
        if hasattr(mc, 'playlists'):
            playlists_by_user = mc.playlists.get(str(uid)) or mc.playlists.get(uid)
            if playlists_by_user:
                songs = playlists_by_user.get(name)

        if not songs:
            return jsonify({"status": "error"})

        def _get_text_channel(g, mc):
            setup_id = None
            if mc and hasattr(mc, 'settings'):
                setup_id = mc.settings.get(str(g.id), {}).get("music_channel_id")
            if not setup_id:
                setup_id = get_music_channel_id(g.id)
            if setup_id:
                try:
                    c = g.get_channel(int(setup_id))
                    if c:
                        return c
                except:
                    pass
            if g.id in mc.ui_messages:
                try:
                    return mc.ui_messages[g.id].channel
                except:
                    pass
            if g.voice_client and hasattr(g.voice_client.channel, 'send'):
                return g.voice_client.channel
            if g.text_channels:
                return g.text_channels[0]
            return None

        text_channel = _get_text_channel(g, mc)
        if text_channel:
            async def do():
                fake = FakeInteraction(g, text_channel, g.me)
                for song in songs:
                    await mc.process_song_request(fake, song)
            asyncio.run_coroutine_threadsafe(do(), bot_instance.loop)
            return jsonify({"status": "ok"})
        return jsonify({"status": "error"})
    except Exception:
        return jsonify({"status": "error"})