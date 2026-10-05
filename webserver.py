import os
import asyncio
import logging
import re
import secrets
import uuid
from urllib.parse import urlencode
from functools import wraps
from flask import Flask, Response, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from dotenv import load_dotenv
from itsdangerous import BadSignature, URLSafeTimedSerializer
import discord
from typing import Optional
import datetime
from cogs.services.welcome_settings import load_welcome_settings, save_welcome_settings

load_dotenv()

app = Flask(__name__)
secret_key = os.getenv('FLASK_SECRET_KEY')
if not secret_key:
    secret_key = secrets.token_hex(32)
    logging.getLogger(__name__).warning(
        'FLASK_SECRET_KEY is not configured; sessions will be invalidated on restart.'
    )
app.secret_key = secret_key
app.permanent_session_lifetime = datetime.timedelta(days=30)
games_auth_serializer = URLSafeTimedSerializer(secret_key, salt='games-hub-api')

logging.getLogger('werkzeug').setLevel(logging.WARNING)

# Cấu hình Discord OAuth2

CLIENT_ID = os.getenv('DISCORD_CLIENT_ID')
CLIENT_SECRET = os.getenv('DISCORD_CLIENT_SECRET')
REDIRECT_URI = os.getenv('DISCORD_REDIRECT_URI', 'http://localhost:5000/callback')
bot_instance: Optional[discord.Client] = None  # Báo cho VSCode biết đây là Discord Client hoặc None
bot_loop = None
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')


def discord_avatar_url(user_data):
    avatar_hash = user_data.get('avatar')
    user_id = user_data.get('id')
    # Sessions store a full URL; Discord's OAuth profile contains only the hash.
    if isinstance(avatar_hash, str) and avatar_hash.startswith('https://'):
        return avatar_hash
    if avatar_hash and user_id:
        extension = 'gif' if avatar_hash.startswith('a_') else 'png'
        return f"https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.{extension}?size=256"

    try:
        discriminator = user_data.get('discriminator', '0')
        default_avatar = int(discriminator) % 5 if discriminator != '0' else (int(user_id) >> 22) % 6
    except (TypeError, ValueError):
        default_avatar = 0
    return f"https://cdn.discordapp.com/embed/avatars/{default_avatar}.png"


@app.route('/api/games/avatars/<path:avatar_path>')
@app.route('/.proxy/api/games/avatars/<path:avatar_path>')
def games_avatar(avatar_path):
    # Accept only Discord avatar paths, never arbitrary URLs or redirects.
    if not re.fullmatch(
        r'(?:avatars/[0-9]+/(?:a_)?[a-fA-F0-9]+\.(?:png|gif|webp)'
        r'|guilds/[0-9]+/users/[0-9]+/avatars/(?:a_)?[a-fA-F0-9]+\.(?:png|gif|webp)'
        r'|embed/avatars/[0-5]\.png)', avatar_path
    ):
        return jsonify({'error': 'Invalid avatar path.'}), 400
    import requests
    try:
        with requests.get(f'https://cdn.discordapp.com/{avatar_path}', params={'size': 256},
                          timeout=(5, 10), allow_redirects=False, stream=True) as upstream:
            if upstream.status_code != 200:
                return jsonify({'error': 'Discord avatar unavailable.'}), 502
            content_type = upstream.headers.get('Content-Type', '').split(';')[0].strip().lower()
            if content_type not in ('image/png', 'image/gif', 'image/webp'):
                return jsonify({'error': 'Invalid avatar response.'}), 502
            chunks = []
            size = 0
            for chunk in upstream.iter_content(65536):
                size += len(chunk)
                if size > 2 * 1024 * 1024:
                    return jsonify({'error': 'Avatar exceeds size limit.'}), 502
                chunks.append(chunk)
            return Response(b''.join(chunks), content_type=content_type, headers={
                'Cache-Control': 'public, max-age=3600',
                'X-Content-Type-Options': 'nosniff',
            })
    except requests.RequestException:
        app.logger.warning('Discord avatar download failed for %s.', avatar_path)
        return jsonify({'error': 'Avatar temporarily unavailable.'}), 502


def is_bot_owner(user_id):
    owner_id = os.getenv('OWNER_ID', '').strip()
    return bool(owner_id and str(user_id) == owner_id)


def create_games_auth_ticket(user, guild_ids):
    return games_auth_serializer.dumps({
        'user': user,
        'guild_ids': [str(guild_id) for guild_id in guild_ids]
    })


def load_games_auth_ticket(ticket):
    try:
        payload = games_auth_serializer.loads(ticket, max_age=30 * 24 * 60 * 60)
    except BadSignature:
        return None
    if not isinstance(payload, dict) or not isinstance(payload.get('user'), dict):
        return None
    user = payload['user']
    if not user.get('id'):
        return None
    guild_ids = payload.get('guild_ids')
    user['guild_ids'] = [str(guild_id) for guild_id in guild_ids] if isinstance(guild_ids, list) else []
    return user


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


def owner_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = session.get('user')
        if not user:
            return jsonify({'error': 'Vui lòng đăng nhập.'}), 401
        owner_id = os.getenv('OWNER_ID')
        if not owner_id or str(user.get('id')) != str(owner_id):
            return jsonify({'error': 'Bạn không có quyền quản trị panel.'}), 403
        return view(*args, **kwargs)
    return wrapped


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
    if 'frame_id' in request.args and 'instance_id' in request.args:
        query = request.query_string.decode('utf-8', errors='replace')
        return redirect(url_for('games') + '?' + query)
    return redirect(url_for('panel'))

@app.route('/panel')
def panel():
    session['next_url'] = url_for('panel')
    return send_from_directory(FRONTEND_DIR, 'panel.html')

@app.route('/login')
def login():
    next_url = request.args.get('next', '')
    if next_url.startswith('/') and not next_url.startswith('//') and '\\' not in next_url:
        session['next_url'] = next_url
    if not CLIENT_ID or not CLIENT_SECRET:
        return jsonify({'error': 'Discord authentication is not configured.'}), 503
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    auth_url = 'https://discord.com/api/oauth2/authorize?' + urlencode({
        'client_id': CLIENT_ID, 'redirect_uri': REDIRECT_URI,
        'response_type': 'code', 'scope': 'identify guilds', 'state': state
    })
    return redirect(auth_url)

@app.route('/callback')
def callback():
    expected_state = session.pop('oauth_state', None)
    state = request.args.get('state', '')
    if not expected_state or not secrets.compare_digest(expected_state, state):
        return jsonify({'error': 'Invalid or expired Discord login. Please sign in again.'}), 400
    next_url = session.pop('next_url', url_for('music'))
    if request.args.get('error'):
        return redirect(next_url)
    code = request.args.get('code')
    if not code:
        return jsonify({'error': 'Discord did not return an authorization code.'}), 400
    import requests
    try:
        response = requests.post('https://discord.com/api/oauth2/token', data={
            'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET,
            'grant_type': 'authorization_code', 'code': code, 'redirect_uri': REDIRECT_URI
        }, headers={'Content-Type': 'application/x-www-form-urlencoded'}, timeout=10)
        token_data = response.json()
        if not response.ok or not isinstance(token_data, dict) or not token_data.get('access_token'):
            return jsonify({'error': 'Discord rejected the login. Please try again.'}), 400
        access_token = token_data['access_token']
        user_resp = requests.get('https://discord.com/api/users/@me',
                                 headers={'Authorization': f'Bearer {access_token}'}, timeout=10)
        user_data = user_resp.json()
        if (not user_resp.ok or not isinstance(user_data, dict)
                or not user_data.get('id') or not user_data.get('username')):
            return jsonify({'error': 'Could not verify the Discord account.'}), 502
    except (requests.RequestException, ValueError):
        app.logger.exception('Discord web authentication failed.')
        return jsonify({'error': 'Discord authentication is temporarily unavailable. Please try again.'}), 502
    avatar_url = discord_avatar_url(user_data)
    guild_ids = None
    try:
        guilds_resp = requests.get(
            'https://discord.com/api/users/@me/guilds',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        if guilds_resp.ok:
            guilds_data = guilds_resp.json()
            if isinstance(guilds_data, list):
                guild_ids = [guild['id'] for guild in guilds_data if isinstance(guild, dict) and guild.get('id')]
        else:
            app.logger.warning('Discord guild lookup failed during OAuth login with status %s.', guilds_resp.status_code)
    except requests.RequestException:
        app.logger.exception('Discord guild lookup failed during OAuth login.')
    except ValueError:
        app.logger.exception('Discord returned an invalid guild list during OAuth login.')
    session['user'] = {
        'id': user_data.get('id'),
        'username': user_data.get('username'),
        'discriminator': user_data.get('discriminator', '0'),
        'avatar': avatar_url,
        'guild_ids': [str(guild_id) for guild_id in guild_ids] if guild_ids is not None else None
    }
    session.permanent = True
    # Chuyển hướng về trang mà người dùng vừa truy cập (mặc định là music nếu không có)
    return redirect(next_url)


@app.route('/.proxy/api/games/auth/token', methods=['POST'])
@app.route('/api/games/auth/token', methods=['POST'])
def games_auth_token():
    if not CLIENT_ID or not CLIENT_SECRET:
        app.logger.error('Discord Games authentication is missing CLIENT_ID or CLIENT_SECRET.')
        return jsonify({'error': 'Discord authentication is not configured on the server.'}), 503

    data = request.get_json(silent=True)
    code = data.get('code') if isinstance(data, dict) else None
    if not isinstance(code, str) or not code.strip() or len(code) > 4096:
        return jsonify({'error': 'A valid Discord authorization code is required.'}), 400

    import requests

    try:
        token_response = requests.post(
            'https://discord.com/api/oauth2/token',
            data={
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
                'grant_type': 'authorization_code',
                'code': code
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            timeout=10
        )
        if not token_response.ok:
            app.logger.warning(
                'Discord rejected an Embedded App authorization code with status %s.',
                token_response.status_code
            )
            return jsonify({'error': 'Discord rejected the authorization code. Please try again.'}), 401

        token_data = token_response.json()
        access_token = token_data.get('access_token') if isinstance(token_data, dict) else None
        if not access_token:
            app.logger.error('Discord token response did not include an access token.')
            return jsonify({'error': 'Discord did not return an access token.'}), 502

        user_response = requests.get(
            'https://discord.com/api/users/@me',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        if not user_response.ok:
            app.logger.error(
                'Discord user lookup failed after Embedded App token exchange with status %s.',
                user_response.status_code
            )
            return jsonify({'error': 'Could not verify the Discord account.'}), 502

        user_data = user_response.json()

        guilds_response = requests.get(
            'https://discord.com/api/users/@me/guilds',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10
        )
        if not guilds_response.ok:
            app.logger.error(
                'Discord guild lookup failed after Embedded App token exchange with status %s.',
                guilds_response.status_code
            )
            return jsonify({'error': 'Could not load the Discord servers for this account.'}), 502
        guilds_data = guilds_response.json()
        if not isinstance(guilds_data, list):
            app.logger.error('Discord returned an invalid guild list during Embedded App authentication.')
            return jsonify({'error': 'Discord returned an invalid server list.'}), 502
    except requests.RequestException:
        app.logger.exception('Discord Embedded App authentication request failed.')
        return jsonify({'error': 'Discord authentication is temporarily unavailable.'}), 502
    except ValueError:
        app.logger.exception('Discord returned an invalid response during Embedded App authentication.')
        return jsonify({'error': 'Discord returned an invalid authentication response.'}), 502

    if not isinstance(user_data, dict) or not user_data.get('id') or not user_data.get('username'):
        app.logger.error('Discord user response is missing the required user identity fields.')
        return jsonify({'error': 'Discord did not return a valid user profile.'}), 502

    user = {
        'id': str(user_data['id']),
        'username': user_data.get('global_name') or user_data['username'],
        'isBotOwner': is_bot_owner(user_data['id']),
        'avatar': discord_avatar_url(user_data)
    }
    guild_ids = [guild['id'] for guild in guilds_data if isinstance(guild, dict) and guild.get('id')]
    session['user'] = {
        **user,
        'discriminator': user_data.get('discriminator', '0'),
        'guild_ids': [str(guild_id) for guild_id in guild_ids]
    }
    session.permanent = True
    return jsonify({
        'access_token': access_token,
        'auth_ticket': create_games_auth_ticket(user, guild_ids),
        'user': user
    })


@app.route('/.proxy/api/games/auth/session')
@app.route('/api/games/auth/session')
def games_auth_session():
    user = session.get('user')
    if not isinstance(user, dict) or not user.get('id'):
        return jsonify({'authenticated': False}), 401
    user = {**user, 'avatar': discord_avatar_url(user)}
    session['user'] = user
    return jsonify({
        'authenticated': True,
        'user': {
            'id': str(user.get('id')),
            'username': user.get('username'),
            'isBotOwner': is_bot_owner(user['id']),
            'avatar': user.get('avatar')
        }
    })


@app.route('/logout')
def logout():
    session.pop('user', None)
    if request.args.get('next') == '/games':
        session.pop('oauth_state', None)
        session.pop('next_url', None)
        return redirect(url_for('games'))
    # Đăng xuất xong thì chuyển hướng về /panel (nơi sẽ hiện lại nút Login)
    return redirect(url_for('panel'))
@app.route('/api/user')
def api_user():
    if 'user' not in session:
        return jsonify({'authenticated': False}), 401
    owner_id = os.getenv('OWNER_ID')
    if not owner_id or str(session['user'].get('id')) != str(owner_id):
        return jsonify({
            'authenticated': False,
            'error': 'Tài khoản Discord này không có quyền quản trị panel.'
        }), 403
    return jsonify({'authenticated': True, 'user': session['user']})

# --- API Thống kê Bot ---
@app.route('/api/stats')
@owner_required
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
@owner_required
def api_servers():
    if not bot_instance:
        return jsonify([])
    # Lấy ID của người dùng đang đăng nhập từ session
    user_id = None
    if 'user' in session:
        user_id = int(session['user']['id'])
    # Kiểm tra xem người dùng có phải là Owner không (Owner thì cho thấy hết)
    owner_id = os.getenv('OWNER_ID')
    is_owner = str(user_id) == str(owner_id)
    servers = []
    for g in bot_instance.guilds:
        # Nếu không phải là Owner, tiến hành lọc
        if user_id and not is_owner:
            # Dùng cache của bot để xem người dùng này có nằm trong server không
            # Nếu get_member trả về None nghĩa là người dùng không ở trong server này -> Bỏ qua
            if not g.get_member(user_id):
                continue
        servers.append({
            'id': str(g.id),
            'name': g.name,
            'members': g.member_count,
            'icon': str(g.icon.url) if g.icon else "https://placehold.co/100/5865F2/fff?text=SV"
        })
    return jsonify(servers)

@app.route('/api/servers/<guild_id>/voice_channels')
@owner_required
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
@owner_required
def api_server_members(guild_id):
    bot = bot_instance
    if not bot:
        return jsonify({'error': 'Bot chưa được khởi tạo.'}), 503
    guild = bot.get_guild(int(guild_id))
    if not guild:
        return jsonify({'error': 'Không tìm thấy server.'}), 404
    async def get_bot_inviter_id():
        bot_member = guild.me
        bot_user = bot.user
        if not bot_member or not bot_member.joined_at or not bot_user:
            return None
        bot_joined_at = bot_member.joined_at
        try:
            entries = [
                entry async for entry in guild.audit_logs(
                    limit=100,
                    action=discord.AuditLogAction.bot_add
                )
            ]
        except discord.Forbidden:
            app.logger.warning(
                'Cannot identify the bot inviter in guild %s: missing View Audit Log permission.',
                guild_id
            )
            return None
        except discord.HTTPException:
            app.logger.exception('Could not load audit logs for guild %s.', guild_id)
            return None

        matching_entries = [
            entry for entry in entries
            if getattr(entry.target, 'id', None) == bot_user.id
            and entry.user
            and abs((entry.created_at - bot_joined_at).total_seconds()) <= 600
        ]
        if not matching_entries:
            return None
        closest_entry = min(
            matching_entries,
            key=lambda entry: abs((entry.created_at - bot_joined_at).total_seconds())
        )
        return str(closest_entry.user.id) if closest_entry.user else None

    inviter_id = run_coro(get_bot_inviter_id())
    members = []
    for m in guild.members[:100]: # Giới hạn lấy 100 thành viên hiển thị
        role_name = m.top_role.name if m.top_role else "Member"
        members.append({
            'id': str(m.id),
            'name': m.display_name,
            'avatar': str(m.display_avatar.url),
            'role': role_name,
            'bot': m.bot,
            'joined_at': m.joined_at.isoformat() if m.joined_at else None,
            'invited_bot': str(m.id) == inviter_id
        })
    return jsonify(members)

@app.route('/api/servers/<guild_id>/members/<member_id>/action', methods=['POST'])
@owner_required
def api_member_action(guild_id, member_id):
    if not bot_instance:
        return jsonify({'success': False, 'error': 'Bot not initialized'}), 503
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'success': False, 'error': 'Dữ liệu yêu cầu không hợp lệ.'}), 400
    action = data.get('action')
    if action not in {'kick', 'ban', 'timeout'}:
        return jsonify({'success': False, 'error': 'Thao tác thành viên không hợp lệ.'}), 400
    reason = data.get('reason', 'Không có lý do')
    if not isinstance(reason, str):
        return jsonify({'success': False, 'error': 'Lý do phải là văn bản.'}), 400
    reason = reason.strip()[:512] or 'Không có lý do'
    duration = 60
    if action == 'timeout':
        try:
            duration = int(data.get('duration', 60))
        except (TypeError, ValueError):
            return jsonify({'success': False, 'error': 'Thời hạn hạn chế không hợp lệ.'}), 400
        if not 1 <= duration <= 28 * 24 * 60 * 60:
            return jsonify({'success': False, 'error': 'Thời hạn hạn chế phải từ 1 giây đến 28 ngày.'}), 400
    guild = bot_instance.get_guild(int(guild_id))
    if not guild:
        return jsonify({'success': False, 'error': 'Không tìm thấy server.'}), 404
    async def do_action():
        member = guild.get_member(int(member_id))
        if not member:
            member = await guild.fetch_member(int(member_id))
        if action == 'kick':
            await member.kick(reason=reason)
        elif action == 'ban':
            await member.ban(reason=reason)
        elif action == 'timeout':
            until = discord.utils.utcnow() + datetime.timedelta(seconds=duration)
            await member.timeout(until, reason=reason)
    try:
        run_coro(do_action())
        add_log(f"Thực hiện {action} lên thành viên {member_id} tại server {guild.name}", "warn")
        return jsonify({'success': True})
    except discord.NotFound:
        return jsonify({'success': False, 'error': 'Không tìm thấy thành viên trong server.'}), 404
    except discord.Forbidden:
        app.logger.exception('Bot lacks permission to perform %s for member %s in guild %s.', action, member_id, guild_id)
        return jsonify({
            'success': False,
            'error': 'Bot thiếu quyền hoặc vai trò của bot thấp hơn thành viên cần thao tác.'
        }), 403
    except discord.HTTPException:
        app.logger.exception('Discord rejected %s for member %s in guild %s.', action, member_id, guild_id)
        return jsonify({'success': False, 'error': 'Discord không thể thực hiện thao tác này. Vui lòng thử lại.'}), 502
    except Exception as e:
        app.logger.exception('Failed to perform %s for member %s in guild %s.', action, member_id, guild_id)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/servers/<guild_id>/invite', methods=['POST'])
@owner_required
def api_create_invite(guild_id):
    if not bot_instance:
        return jsonify({'error': 'Bot not initialized'}), 503
    guild = bot_instance.get_guild(int(guild_id))
    if not guild:
        return jsonify({'error': 'Server not found'}), 404
    async def create_inv():
        if guild.me is None:
            raise RuntimeError('Bot is not a member of this server')
        for channel in guild.text_channels:
            if channel.permissions_for(guild.me).create_instant_invite:
                inv = await channel.create_invite(max_uses=0, max_age=0)
                return str(inv.url)
        return None
    try:
        url = run_coro(create_inv())
        if url:
            add_log(f"Đã tạo link mời cho server {guild.name}")
            return jsonify({'invite_url': url})
        return jsonify({'error': 'Bot không có quyền tạo link mời ở bất kỳ kênh văn bản nào.'}), 403
    except discord.Forbidden:
        app.logger.exception('Bot lacks permission to create an invite for guild %s.', guild_id)
        return jsonify({'error': 'Bot thiếu quyền tạo link mời trong server này.'}), 403
    except discord.HTTPException:
        app.logger.exception('Discord rejected invite creation for guild %s.', guild_id)
        return jsonify({'error': 'Discord không thể tạo link mời. Vui lòng thử lại.'}), 502
    except Exception as e:
        app.logger.exception('Failed to create an invite for guild %s.', guild_id)
        return jsonify({'error': str(e)}), 500

@app.route('/api/servers/<guild_id>/leave', methods=['POST'])
@owner_required
def api_leave_server(guild_id):
    if not bot_instance:
        return jsonify({'error': 'Bot not initialized'}), 503
    guild = bot_instance.get_guild(int(guild_id))
    if not guild:
        return jsonify({'error': 'Server not found'}), 404
    try:
        run_coro(guild.leave())
        add_log(f"Bot đã rời server {guild.name}", "warn")
        return jsonify({'success': True})
    except discord.HTTPException:
        app.logger.exception('Discord rejected leaving guild %s.', guild_id)
        return jsonify({'success': False, 'error': 'Discord không thể rời server. Vui lòng thử lại.'}), 502
    except Exception as e:
        app.logger.exception('Failed to leave guild %s.', guild_id)
        return jsonify({'success': False, 'error': str(e)}), 500

# --- API Kênh & Chat ---
@app.route('/api/chat/servers')
@owner_required
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
@owner_required
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
                        # SỬA Ở ĐÂY: Dùng clean_content thay vì content để tự động đổi ID thành Tên (Mentions)
                        content = str(m.clean_content) if m.clean_content else ""
                        # Xử lý Reply an toàn tuyệt đối
                        reply_info = None
                        if m.reference and hasattr(m.reference, 'resolved') and isinstance(m.reference.resolved, discord.Message):
                            ref = m.reference.resolved
                            # Dùng clean_content cho cả tin nhắn reply
                            ref_raw_content = str(ref.clean_content) if ref.clean_content else ""
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
                        # SỬA Ở ĐÂY: Lấy danh sách file đính kèm (ảnh, gif, video, tài liệu...)
                        attachments_data = []
                        for att in m.attachments:
                            is_image = False
                            if att.content_type and att.content_type.startswith(('image/', 'video/')):
                                is_image = True # Đánh dấu là ảnh hoặc gif để frontend hiển thị
                            attachments_data.append({
                                'filename': att.filename,
                                'url': att.url,
                                'is_image': is_image
                            })
                        msgs.append({
                            'id': str(m.id),
                            'author': str(m.author.display_name),
                            'avatar': str(m.author.display_avatar.url) if m.author.display_avatar else "https://placehold.co/100/333/fff",
                            'content': content,
                            'bot': bool(m.author.bot),
                            'time': m.created_at.strftime('%H:%M') if m.created_at else "",
                            'reply_info': reply_info,
                            'embeds': embeds_data,
                            'attachments': attachments_data # <-- Truyền thêm cục này xuống UI
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
@owner_required
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
@app.route('/api/logs', methods=['GET', 'DELETE'])
@owner_required
def api_logs():
    if request.method == 'DELETE':
        realtime_logs.clear()
        return jsonify({'success': True})
    return jsonify(realtime_logs)

@app.route('/api/servers/<guild_id>/text_channels')
@owner_required
def api_server_text_channels(guild_id):
    if not bot_instance:
        return jsonify({'error': 'Bot is not ready.'}), 503
    try:
        guild = bot_instance.get_guild(int(guild_id))
    except ValueError:
        return jsonify({'error': 'Server ID không hợp lệ.'}), 400
    if not guild:
        return jsonify({'error': 'Không tìm thấy server.'}), 404
    return jsonify([
        {'id': str(channel.id), 'name': channel.name}
        for channel in guild.text_channels
    ])

@app.route('/api/welcome/<guild_id>', methods=['GET', 'PUT'])
@owner_required
def api_welcome_settings(guild_id):
    try:
        guild_id_int = int(guild_id)
    except ValueError:
        return jsonify({'error': 'Server ID không hợp lệ.'}), 400
    if bot_instance is None or bot_instance.get_guild(guild_id_int) is None:
        return jsonify({'error': 'Không tìm thấy server.'}), 404

    try:
        settings = load_welcome_settings()
    except (OSError, ValueError):
        app.logger.exception('Could not load welcome settings.')
        return jsonify({'error': 'Không thể đọc cấu hình Welcome.'}), 500

    guild_key = str(guild_id_int)
    if request.method == 'GET':
        return jsonify(settings.get(guild_key, {}))

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'Dữ liệu cấu hình không hợp lệ.'}), 400

    title = data.get('title')
    description = data.get('description')
    color = data.get('color')
    image = data.get('image', '')
    channel_id = data.get('channel_id')
    if not isinstance(title, str) or len(title) > 256:
        return jsonify({'error': 'Tiêu đề tối đa 256 ký tự.'}), 400
    if not isinstance(description, str) or len(description) > 4096:
        return jsonify({'error': 'Mô tả tối đa 4096 ký tự.'}), 400
    if not isinstance(color, str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', color):
        return jsonify({'error': 'Mã màu phải có định dạng #RRGGBB.'}), 400
    if not isinstance(image, str) or (
        image and (len(image) > 2000 or not image.startswith(('https://', 'http://')))
    ):
        return jsonify({'error': 'URL hình ảnh phải bắt đầu bằng http:// hoặc https://.'}), 400
    if not isinstance(channel_id, str) or not channel_id.isdecimal():
        return jsonify({'error': 'Vui lòng chọn kênh gửi tin nhắn chào mừng.'}), 400

    channel = bot_instance.get_channel(int(channel_id))
    if not isinstance(channel, discord.TextChannel) or channel.guild.id != guild_id_int:
        return jsonify({'error': 'Kênh không thuộc server đã chọn.'}), 400

    settings[guild_key] = {
        'channel_id': channel_id,
        'title': title,
        'description': description,
        'color': color,
        'image': image
    }
    try:
        save_welcome_settings(settings)
    except OSError:
        app.logger.exception('Could not save welcome settings.')
        return jsonify({'error': 'Không thể lưu cấu hình Welcome.'}), 500
    add_log(f'Đã lưu cấu hình Welcome cho server {guild_key}.')
    return jsonify({'success': True})

@app.route('/api/welcome/<guild_id>/banner', methods=['POST'])
@owner_required
def api_upload_welcome_banner(guild_id):
    try:
        guild_id_int = int(guild_id)
    except ValueError:
        return jsonify({'error': 'Server ID không hợp lệ.'}), 400
    if bot_instance is None or bot_instance.get_guild(guild_id_int) is None:
        return jsonify({'error': 'Không tìm thấy server.'}), 404

    image = request.files.get('image')
    if image is None or not image.filename:
        return jsonify({'error': 'Vui lòng chọn ảnh banner.'}), 400

    image_data = image.stream.read(8 * 1024 * 1024 + 1)
    if len(image_data) > 8 * 1024 * 1024:
        return jsonify({'error': 'Ảnh phải nhỏ hơn hoặc bằng 8 MB.'}), 413

    image_types = (
        (b'\x89PNG\r\n\x1a\n', '.png'),
        (b'\xff\xd8\xff', '.jpg'),
        (b'GIF87a', '.gif'),
        (b'GIF89a', '.gif'),
        (b'RIFF', '.webp'),
    )
    extension = next(
        (
            extension for signature, extension in image_types
            if image_data.startswith(signature)
            and (extension != '.webp' or image_data[8:12] == b'WEBP')
        ),
        None
    )
    if extension is None:
        return jsonify({'error': 'Định dạng ảnh không được hỗ trợ. Hãy dùng PNG, JPG, GIF hoặc WEBP.'}), 400

    banner_folder = os.path.join(os.getenv('DATA_FOLDER', 'data'), 'welcome_banners')
    filename = f'{uuid.uuid4().hex}{extension}'
    try:
        os.makedirs(banner_folder, exist_ok=True)
        with open(os.path.join(banner_folder, filename), 'wb') as banner_file:
            banner_file.write(image_data)
    except OSError:
        app.logger.exception('Could not save uploaded welcome banner.')
        return jsonify({'error': 'Không thể lưu ảnh banner.'}), 500

    image_url = url_for('welcome_banner', filename=filename, _external=True)
    return jsonify({'success': True, 'image_url': image_url})

@app.route('/welcome-banners/<filename>')
def welcome_banner(filename):
    if not re.fullmatch(r'[0-9a-f]{32}\.(?:png|jpg|gif|webp)', filename):
        return jsonify({'error': 'Không tìm thấy ảnh banner.'}), 404
    banner_folder = os.path.join(os.getenv('DATA_FOLDER', 'data'), 'welcome_banners')
    return send_from_directory(banner_folder, filename, max_age=31536000)

@app.route('/games')
def games():
    session['next_url'] = url_for('games')
    return send_from_directory(FRONTEND_DIR, 'games.html')


@app.route('/music')
def music():
    session['next_url'] = url_for('music')
    return send_from_directory(FRONTEND_DIR, 'music.html')

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

@app.route('/<path:filename>')
def serve_frontend_file(filename):
    return send_from_directory(FRONTEND_DIR, filename)
