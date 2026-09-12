import os
import asyncio
import logging
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv
import discord
from typing import Optional
import datetime

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'super_secret_key_mosa')

logging.getLogger('werkzeug').setLevel(logging.WARNING)

# Cấu hình Discord OAuth2

CLIENT_ID = os.getenv('DISCORD_CLIENT_ID')
CLIENT_SECRET = os.getenv('DISCORD_CLIENT_SECRET')
REDIRECT_URI = os.getenv('DISCORD_REDIRECT_URI', 'http://localhost:5000/callback')
OWNER_ID = os.getenv('OWNER_ID') # ID tài khoản Discord được phép truy cập panel

bot_instance: Optional[discord.Client] = None  # Báo cho VSCode biết đây là Discord Client hoặc None
bot_loop = None


def get_music_state(guild_id):
    # Dùng setattr và getattr để "bịt mắt" Pylance, tránh báo lỗi thuộc tính ảo
    if not hasattr(bot_instance, 'music_state'):
        setattr(bot_instance, 'music_state', {})

    # Trích xuất state ra một biến tạm để thao tác
    m_state = getattr(bot_instance, 'music_state')

    if guild_id not in m_state:
        m_state[guild_id] = {
            'queue': [], 
            'now_playing': None,
            'volume': 100,
            'is_loop': 0,
            'playlists': [
                {'id': 1, 'name': "Chill Lofi Vibes", 'count': 4, 'icon': "ph-headphones"},
                {'id': 2, 'name': "Coding Focus", 'count': 2, 'icon': "ph-code"}
            ]
        }
    return m_state[guild_id]

def run_web(bot):
    global bot_instance, bot_loop
    bot_instance = bot
    # Lấy event loop của bot để chạy các coro bất đồng bộ từ Flask thread safely
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

def run_coro(coro):
    if bot_instance is None or not hasattr(bot_instance, 'loop') or bot_instance.loop is None:
        raise RuntimeError('Bot is not running yet.')

    future = asyncio.run_coroutine_threadsafe(coro, bot_instance.loop)
    return future.result()

# Bộ nhớ log thời gian thực
realtime_logs = [
    {"time": datetime.datetime.now().strftime("%H:%M:%S"), "msg": "Web Panel đã được khởi động. Đang chờ kết nối với Bot...", "level": "info"}
]

def add_log(message, level="info"):
    time_str = datetime.datetime.now().strftime("%H:%M:%S")
    realtime_logs.append({"time": time_str, "msg": message, "level": level})
    if len(realtime_logs) > 100:
        realtime_logs.pop(0)

@app.route('/')
def index():
    # Chuyển hướng người dùng từ trang chủ (/) sang (/panel)
    return redirect(url_for('panel'))

OWNER_ID = os.getenv('OWNER_ID')

@app.route('/panel')
def panel():
    # 1. Nếu chưa đăng nhập: Cứ trả về trang panel (giao diện sẽ tự động hiện khung bắt đăng nhập)
    if 'user' not in session:
        return render_template('panel.html')
    
    # Lấy OWNER_ID từ file .env
    OWNER_ID = os.getenv('OWNER_ID')
    
    # 2. Nếu ĐÃ đăng nhập nhưng KHÔNG PHẢI là Owner
    if str(session['user']['id']) != str(OWNER_ID):
        # Trả về giao diện báo lỗi kèm nút Đăng Xuất
        unauthorized_html = """
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Không có quyền truy cập</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-900 h-screen flex flex-col items-center justify-center selection:bg-[#5865F2] selection:text-white">
            <div class="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full text-center mx-4">
                <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                <h2 class="text-xl font-bold text-white mb-2">Từ chối truy cập</h2>
                <p class="text-gray-400 mb-6 text-sm">Tài khoản <b>{}</b> không có quyền truy cập vào bảng điều khiển này. Vui lòng đăng xuất và đăng nhập bằng tài khoản chỉ định.</p>
                <a href="/logout" class="block w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-2.5 rounded-lg transition-colors">
                    Đăng Xuất
                </a>
            </div>
        </body>
        </html>
        """.format(session['user']['username'])
        
        return unauthorized_html, 403

    # 3. Nếu ĐÃ đăng nhập và LÀ Owner: Trả về trang panel bình thường
    return render_template('panel.html')

@app.route('/login')
def login():
    auth_url = f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify%20guilds"
    return redirect(auth_url)

@app.route('/callback')
def callback():
    code = request.args.get('code')
    if not code:
        return redirect(url_for('panel'))
    
    import requests
    data = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    r = requests.post('https://discord.com/api/oauth2/token', data=data, headers=headers)
    token_data = r.json()
    
    if 'access_token' not in token_data:
        return "Xác thực thất bại!", 400
        
    access_token = token_data['access_token']
    user_resp = requests.get('https://discord.com/api/users/@me', headers={'Authorization': f'Bearer {access_token}'})
    user_data = user_resp.json()
    
    # BỎ KIỂM TRA OWNER_ID Ở ĐÂY ĐỂ AI CŨNG CÓ THỂ ĐĂNG NHẬP!
    
    avatar_hash = user_data.get('avatar')
    if avatar_hash:
        avatar_url = f"https://cdn.discordapp.com/avatars/{user_data.get('id')}/{avatar_hash}.png"
    else:
        # Nếu không có avatar, dùng avatar mặc định màu xám của Discord
        avatar_url = "https://cdn.discordapp.com/embed/avatars/0.png"

    session['user'] = {
        'id': user_data.get('id'),
        'username': user_data.get('username'),
        'discriminator': user_data.get('discriminator', '0'),
        'avatar': avatar_url
    }
    
    # Chuyển hướng về trang mà người dùng vừa truy cập (mặc định là music nếu không có)
    next_url = session.pop('next_url', url_for('music'))
    return redirect(next_url)

@app.route('/logout')
def logout():
    session.pop('user', None)
    # Đăng xuất xong thì chuyển hướng về /panel (nơi sẽ hiện lại nút Login)
    return redirect(url_for('panel'))
@app.route('/api/user')
def api_user():
    if 'user' not in session:
        return jsonify({'authenticated': False}), 401
    return jsonify({'authenticated': True, 'user': session['user']})

# --- API Thống kê Bot ---
@app.route('/api/stats')
def api_stats():
    if not bot_instance or not bot_instance.is_ready():
        return jsonify({'error': 'Bot offline'}), 503
    
    total_guilds = len(bot_instance.guilds)
    total_members = sum(g.member_count for g in bot_instance.guilds if g.member_count)
    ping = round(bot_instance.latency * 1000)
    
    import psutil
    process = psutil.Process(os.getpid())
    ram_usage = round(process.memory_info().rss / 1024 / 1024, 2)
    
    return jsonify({
        'guilds': total_guilds,
        'members': total_members,
        'ping': ping,
        'ram': ram_usage,
        'discord_version': discord.__version__
    })

# --- API Quản lý Server & Thành viên ---
@app.route('/api/servers')
def api_servers():
    if not bot_instance:
        return jsonify([])
    servers = []
    for g in bot_instance.guilds:
        servers.append({
            'id': str(g.id),
            'name': g.name,
            'members': g.member_count,
            'icon': str(g.icon.url) if g.icon else "https://placehold.co/100/5865F2/fff?text=SV"
        })
    return jsonify(servers)

@app.route('/api/servers/<guild_id>/voice_channels')
def api_server_voice_channels(guild_id):
    if not bot_instance:
        return jsonify([])

    guild = bot_instance.get_guild(int(guild_id))
    if not guild:
        return jsonify([])
        
    channels = []
    # Chỉ lấy các kênh thoại (Voice Channels)
    for vc in guild.voice_channels:
        channels.append({
            'id': str(vc.id),
            'name': vc.name
        })
    return jsonify(channels)

@app.route('/api/servers/<guild_id>/members')
def api_server_members(guild_id):
    if not bot_instance:
        return jsonify([])

    guild = bot_instance.get_guild(int(guild_id))
    if not guild:
        return jsonify([]), 404
    members = []
    for m in guild.members[:100]: # Giới hạn lấy 100 thành viên hiển thị
        role_name = m.top_role.name if m.top_role else "Member"
        members.append({
            'id': str(m.id),
            'name': m.display_name,
            'avatar': str(m.display_avatar.url),
            'role': role_name,
            'bot': m.bot
        })
    return jsonify(members)

@app.route('/api/servers/<guild_id>/members/<member_id>/action', methods=['POST'])
def api_member_action(guild_id, member_id):
    if not bot_instance:
        return jsonify({'success': False, 'error': 'Bot not initialized'}), 503

    data = request.json or {}
    action = data.get('action') # ban, kick, timeout
    reason = data.get('reason', 'Không có lý do')
    
    guild = bot_instance.get_guild(int(guild_id))
    if not guild:
        return jsonify({'success': False, 'error': 'Server not found'}), 404
        
    async def do_action():
        member = guild.get_member(int(member_id))
        if not member:
            member = await guild.fetch_member(int(member_id))
        if action == 'kick':
            await member.kick(reason=reason)
        elif action == 'ban':
            await member.ban(reason=reason)
        elif action == 'timeout':
            duration = int(data.get('duration', 60))
            import datetime
            until = discord.utils.utcnow() + datetime.timedelta(seconds=duration)
            await member.timeout(until, reason=reason)
        return True

    try:
        run_coro(do_action())
        add_log(f"Thực hiện {action} lên thành viên {member_id} tại server {guild.name}", "warn")
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/servers/<guild_id>/invite', methods=['POST'])
def api_create_invite(guild_id):
    if not bot_instance:
        return jsonify({'error': 'Bot not initialized'}), 503

    guild = bot_instance.get_guild(int(guild_id))
    if not guild:
        return jsonify({'error': 'Server not found'}), 404
    async def create_inv():
        for channel in guild.text_channels:
            if channel.permissions_for(guild.me).create_instant_invite:
                inv = await channel.create_invite(max_uses=1, max_age=3600)
                return str(inv.url)
        return None
    try:
        url = run_coro(create_inv())
        if url:
            return jsonify({'invite_url': url})
        return jsonify({'error': 'Không tìm thấy kênh có quyền tạo invite'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/servers/<guild_id>/leave', methods=['POST'])
def api_leave_server(guild_id):
    if not bot_instance:
        return jsonify({'error': 'Bot not initialized'}), 503

    guild = bot_instance.get_guild(int(guild_id))
    if not guild:
        return jsonify({'error': 'Server not found'}), 404
    run_coro(guild.leave())
    return jsonify({'success': True})

# --- API Kênh & Chat ---
@app.route('/api/chat/servers')
def api_chat_servers():
    if not bot_instance:
        return jsonify([])
    result = []
    for g in bot_instance.guilds:
        channels = [{'id': str(c.id), 'name': c.name} for c in g.text_channels]
        result.append({
            'id': str(g.id),
            'name': g.name,
            'channels': channels
        })
    return jsonify(result)

@app.route('/api/channels/<channel_id>/messages', methods=['GET', 'POST'])
def api_channel_messages(channel_id):
    try:
        if bot_instance is None:
            return jsonify({'error': 'Bot is not ready'}), 503

        # 1. Bắt lỗi an toàn nếu Javascript gửi lên chữ 'null' hoặc 'undefined'
        if channel_id in ("null", "undefined", "none", ""):
            return jsonify([]), 400
            
        try:
            channel_id_int = int(channel_id)
        except ValueError:
            return jsonify([]), 400

        channel = bot_instance.get_channel(channel_id_int)
        
        if not channel or not isinstance(channel, discord.abc.Messageable):
            return jsonify([]), 404

        if request.method == 'GET':
            before_id = request.args.get('before')
            
            async def fetch_msgs():
                msgs = []
                try:
                    # 2. Xử lý an toàn ID tin nhắn cũ (tránh lỗi int("null"))
                    if before_id and str(before_id).lower() not in ("null", "undefined", "none", ""):
                        before_msg = discord.Object(id=int(before_id))
                    else:
                        before_msg = None
                    
                    async for m in channel.history(limit=30, before=before_msg):
                        content = str(m.content) if m.content else ""
                        
                        # Xử lý Reply an toàn tuyệt đối
                        reply_info = None
                        if m.reference and hasattr(m.reference, 'resolved') and isinstance(m.reference.resolved, discord.Message):
                            ref = m.reference.resolved
                            ref_raw_content = str(ref.content) if ref.content else ""
                            ref_content = ref_raw_content[:50] + "..." if len(ref_raw_content) > 50 else ref_raw_content
                            
                            if not ref_content:
                                if ref.embeds: ref_content = "[Tin nhắn Embed]"
                                elif ref.attachments: ref_content = "[Đính kèm File/Ảnh]"
                                else: ref_content = "Tin nhắn không có nội dung"
                                
                            reply_info = {
                                'author': str(ref.author.display_name) if hasattr(ref.author, 'display_name') else "Unknown",
                                'content': ref_content
                            }

                        # Xử lý Embeds an toàn tuyệt đối (Chống lỗi JSON)
                        embeds_data = []
                        for emb in m.embeds:
                            title = str(emb.title) if isinstance(emb.title, str) else ""
                            description = str(emb.description) if isinstance(emb.description, str) else ""
                            
                            color = "#2B2D31"
                            if hasattr(emb, 'color') and isinstance(emb.color, discord.Colour):
                                color = f"#{emb.color.value:06x}"
                            
                            image_url = ""
                            if hasattr(emb, 'image') and emb.image and hasattr(emb.image, 'url') and isinstance(emb.image.url, str):
                                image_url = emb.image.url
                            elif hasattr(emb, 'thumbnail') and emb.thumbnail and hasattr(emb.thumbnail, 'url') and isinstance(emb.thumbnail.url, str):
                                image_url = emb.thumbnail.url

                            if not title and not description and not image_url:
                                continue
                                
                            embeds_data.append({
                                'title': title,
                                'description': description,
                                'color': color,
                                'image': image_url
                            })

                        if not content and m.attachments:
                            content = f"[Đính kèm ảnh/file: {m.attachments[0].filename}]"
                            
                        msgs.append({
                            'id': str(m.id),
                            'author': str(m.author.display_name),
                            'avatar': str(m.author.display_avatar.url) if m.author.display_avatar else "https://placehold.co/100/333/fff",
                            'content': content,
                            'bot': bool(m.author.bot),
                            'time': m.created_at.strftime('%H:%M') if m.created_at else "",
                            'reply_info': reply_info,
                            'embeds': embeds_data
                        })
                except discord.errors.Forbidden:
                    if not before_id:
                        msgs.append({
                            'id': 'error',
                            'author': 'Hệ thống',
                            'avatar': 'https://placehold.co/100/ED4245/fff?text=!',
                            'content': 'Bot không có quyền Đọc Lịch Sử Tin Nhắn ở kênh này.',
                            'bot': True,
                            'time': 'Bây giờ'
                        })
                except Exception as e:
                    print(f"Lỗi khi xử lý dữ liệu tin nhắn: {e}")
                    
                return msgs[::-1]
            
            return jsonify(run_coro(fetch_msgs()))
            
        elif request.method == 'POST':
            data = request.json or {}
            content = data.get('content')
            reply_to = data.get('reply_to')
            
            async def send_msg():
                if reply_to:
                    ref_msg = await channel.fetch_message(int(reply_to))
                    return await ref_msg.reply(content)
                else:
                    return await channel.send(content)
            try:
                m = run_coro(send_msg())
                return jsonify({'success': True, 'id': str(m.id)})
            except Exception as e:
                print(f"Lỗi khi gửi tin nhắn: {e}")
                return jsonify({'success': False, 'error': str(e)}), 500
            
        return jsonify({'error': 'Method Not Allowed'}), 405

    except Exception as e:
        import traceback
        # Bắt toàn bộ lỗi sập Flask và ép nó in ra màn hình console (để Panel nhìn thấy)
        print(f"LỖI NGHIÊM TRỌNG (API Messages): {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
        
# --- API Trạng thái Bot ---
@app.route('/api/bot/status', methods=['POST'])
def api_update_status():
    if not bot_instance:
        return jsonify({'success': False, 'error': 'Bot not initialized'}), 503

    data = request.json or {}
    status_type = data.get('status', 'online') # online, idle, dnd, invisible
    activity_type = data.get('activity_type', 'playing') # playing, watching, listening, competing
    activity_name = data.get('activity_name', '')
    
    status_map = {
        'online': discord.Status.online,
        'idle': discord.Status.idle,
        'dnd': discord.Status.dnd,
        'invisible': discord.Status.invisible
    }
    act_map = {
        'playing': discord.ActivityType.playing,
        'watching': discord.ActivityType.watching,
        'listening': discord.ActivityType.listening,
        'competing': discord.ActivityType.competing
    }

    bot = bot_instance
    
    async def change_pres():
        st = status_map.get(status_type, discord.Status.online)
        act = discord.Activity(type=act_map.get(activity_type, discord.ActivityType.playing), name=activity_name)
        await bot.change_presence(status=st, activity=act)
        
    try:
        run_coro(change_pres())
        add_log(f"Đã cập nhật trạng thái bot thành: {status_type} | {activity_type} {activity_name}")
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# --- API Logs thời gian thực ---
@app.route('/api/logs')
def api_logs():
    return jsonify(realtime_logs)

#--- Trang Music Player ---

@app.route('/music')
def music():
    # Lưu lại trang hiện tại để callback chuyển hướng về đúng chỗ
    session['next_url'] = url_for('music') 
    return render_template('music.html')

# ==========================================
# 1. LẤY TRẠNG THÁI VÀ HÀNG CHỜ HIỂN THỊ LÊN WEB
# ==========================================
@app.route('/api/music/state', methods=['GET'])
def api_music_state():
    if not bot_instance or not bot_instance.is_ready():
        return jsonify({'error': 'Bot offline'}), 503
        
    guild_id = request.args.get('guild_id')
    if not guild_id:
        return jsonify({'error': 'Missing guild_id'}), 400

    guild = bot_instance.get_guild(int(guild_id))
    if not guild or not guild.voice_client:
        return jsonify({'connected': False, 'queue': [], 'playlists': [], 'now_playing': None})

    raw_vc = guild.voice_client
    if not isinstance(raw_vc, discord.VoiceClient):
        return jsonify({'connected': False, 'queue': [], 'playlists': [], 'now_playing': None})
    vc = raw_vc
    
    channel_name = getattr(vc.channel, 'name', 'Voice Channel')
    state_data = get_music_state(int(guild_id))
    
    if not vc.is_playing() and not vc.is_paused():
        state_data['now_playing'] = None

    state = {
        'connected': True,
        'channel_name': channel_name,
        'is_playing': vc.is_playing(),
        'is_paused': vc.is_paused(),
        'volume': state_data['volume'],
        'loop_mode': state_data['is_loop'],
        'now_playing': state_data['now_playing'],
        'queue': state_data['queue'],
        'playlists': state_data['playlists']
    }
    return jsonify(state)

# ==========================================
# 2. XỬ LÝ LỆNH PHÁT NHẠC, SKIP, TẠM DỪNG
# ==========================================
@app.route('/api/music/action', methods=['POST'])
def api_music_action():
    if not bot_instance:
        return jsonify({'success': False, 'error': 'Bot offline'})
        
    if 'user' not in session:
        return jsonify({'success': False, 'error': 'Vui lòng đăng nhập lại.'})
        
    user_id = session['user']['id']
    data = request.json or {}
    
    raw_guild_id = data.get('guild_id')
    if not raw_guild_id:
        return jsonify({'success': False, 'error': 'Thiếu ID Server.'})
    guild_id_int = int(raw_guild_id)
    
    action = data.get('action')
    
    guild = bot_instance.get_guild(guild_id_int)
    if not guild:
        return jsonify({'success': False, 'error': 'Không tìm thấy Server.'})

    # Ủy quyền toàn bộ xử lý âm nhạc cho music.py thông qua Event 'web_music_action'
    try:
        bot_instance.loop.call_soon_threadsafe(
            bot_instance.dispatch,
            'web_music_action',
            guild_id_int,
            user_id,
            action,
            data
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})