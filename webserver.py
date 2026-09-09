import os
import json
import asyncio
import requests
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_url_path='/static')
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.urandom(24))

DATA_FOLDER = os.getenv("DATA_FOLDER", "data")
CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:5000/callback")
API_ENDPOINT = "https://discord.com/api/v10"
SETTINGS_FILE = os.path.join(DATA_FOLDER, "settings.json")

bot_instance = None

def run_web(bot):
    global bot_instance
    bot_instance = bot
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)

def check_auth():
    return "token" in session

@app.route("/api/token", methods=["POST"])
def get_activity_token():
    data = request.json
    code = data.get("code")
    
    if not code:
        return jsonify({"error": "No code provided"}), 400

    # Dùng code đổi lấy access_token từ Discord
    token_data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI # Phải khớp hoàn toàn với redirect uri trong portal (không cần tồn tại thật nếu dùng activity)
    }
    
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    resp = requests.post(f"{API_ENDPOINT}/oauth2/token", data=token_data, headers=headers)
    
    if resp.status_code != 200:
        return jsonify({"error": resp.text}), 400
        
    return jsonify(resp.json()) # Trả access_token về cho Frontend

# --- AUTH ROUTES ---
@app.route("/login")
def login():
    oauth_url = (
        f"{API_ENDPOINT}/oauth2/authorize?client_id={CLIENT_ID}"
        f"&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify%20guilds"
    )
    return redirect(oauth_url)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))

@app.route("/callback")
def callback():
    code = request.args.get("code")
    if not code:
        return "Lỗi: Không tìm thấy authorization code", 400

    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    token_resp = requests.post(f"{API_ENDPOINT}/oauth2/token", data=data, headers=headers)
    if token_resp.status_code != 200:
        return f"Lỗi lấy Token: {token_resp.text}", 400

    token_data = token_resp.json()
    session["token"] = token_data["access_token"]
    
    # Lấy thông tin user
    user_resp = requests.get(
        f"{API_ENDPOINT}/users/@me", 
        headers={"Authorization": f"Bearer {session['token']}"}
    )
    if user_resp.status_code == 200:
        session["user"] = user_resp.json()
    return redirect(url_for("index"))

@app.route("/")
def index():
    # 1. Nếu mở trong Discord Activity (sẽ có frame_id trên URL)
    if request.args.get('frame_id'):
        # Trả thẳng về trang index.html, việc đăng nhập sẽ do JavaScript SDK lo
        return render_template("index.html", is_activity=True)
    
    # 2. Nếu mở bằng trình duyệt Web bình thường
    if not check_auth():
        return render_template("login.html")
    
    return render_template("index.html", user=session.get("user"), is_activity=False)

# --- API ROUTES ---
@app.route("/api/guilds")
def get_guilds():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
    
    headers = {"Authorization": f"Bearer {session['token']}"}
    user_guilds = requests.get(f"{API_ENDPOINT}/users/@me/guilds", headers=headers).json()
    
    # Lọc server mà bot cũng có mặt
    bot_guild_ids = [str(g.id) for g in (bot_instance.guilds if bot_instance else [])]
    common_guilds = [
        g for g in user_guilds 
        if g["id"] in bot_guild_ids and (int(g["permissions"]) & 0x20) == 0x20 # Quyền MANAGE_GUILD
    ]
    return jsonify(common_guilds)

@app.route("/api/status/<guild_id>")
def get_status(guild_id):
    gid = int(guild_id)

    if bot_instance is None:
        return jsonify({"connected": False})

    guild = bot_instance.get_guild(gid)
    if not guild or not guild.voice_client:
        return jsonify({"connected": False})

    music_cog = bot_instance.get_cog("Music")
    # Trả về thông tin phát nhạc từ cog nếu có
    return jsonify({
        "connected": True,
        "channel": guild.voice_client.channel.name,
        "is_playing": guild.voice_client.is_playing(),
        "is_paused": guild.voice_client.is_paused()
    })
    
# --- THÊM VÀO WEBSERVER.PY ---

@app.route("/api/connect", methods=["POST"])
def connect_bot():
    data = request.json
    user_id = int(data.get("user_id"))

    bot = bot_instance
    if bot is None:
        return jsonify({"error": "Bot chưa sẵn sàng"}), 500

    target_voice_channel = None
    # Tự động tìm xem người dùng đang ở kênh thoại nào trong tất cả server bot tham gia
    for guild in bot.guilds:
        member = guild.get_member(user_id)
        if member and member.voice and member.voice.channel:
            target_voice_channel = member.voice.channel
            break

    if not target_voice_channel:
        return jsonify({"error": "Bạn phải tham gia một kênh thoại trên Discord trước khi kết nối bot!"}), 400

    # Khai báo hàm bất đồng bộ để bot vào kênh
    async def join_vc(vc):
        guild = vc.guild
        if guild.voice_client:
            await guild.voice_client.move_to(vc)
        else:
            await vc.connect()

    # Đẩy lệnh vào event loop của Bot
    asyncio.run_coroutine_threadsafe(join_vc(target_voice_channel), bot.loop)

    return jsonify({
        "success": True, 
        "channel_name": target_voice_channel.name,
        "guild_name": target_voice_channel.guild.name
    })

@app.route("/api/disconnect", methods=["POST"])
def disconnect_bot():
    data = request.json
    user_id = int(data.get("user_id"))

    if bot_instance is None:
        return jsonify({"error": "Bot chưa sẵn sàng"}), 500

    target_guild = None
    for guild in bot_instance.guilds:
        member = guild.get_member(user_id)
        if member and member.voice and member.voice.channel:
            target_guild = guild
            break

    if not target_guild or not target_guild.voice_client:
        return jsonify({"error": "Bot không ở trong kênh thoại cùng bạn"}), 400

    async def leave_vc(guild):
        await guild.voice_client.disconnect()

    asyncio.run_coroutine_threadsafe(leave_vc(target_guild), bot_instance.loop)
    return jsonify({"success": True})

@app.route("/api/connection_status", methods=["POST"])
def check_connection_status():
    data = request.json
    user_id = int(data.get("user_id"))
    if bot_instance is None:
        return jsonify({"connected": False})
    
    for guild in bot_instance.guilds:
        member = guild.get_member(user_id)
        if member and member.voice and member.voice.channel:
            vc = guild.voice_client
            if vc and vc.is_connected() and vc.channel.id == member.voice.channel.id:
                # Lấy thông tin bài hát từ Music cog
                music_cog = bot_instance.get_cog("Music")
                # Giả định bot lưu bài hát hiện tại trong dictionary current_songs theo guild.id
                current_song = getattr(music_cog, 'current_songs', {}).get(guild.id)
                
                return jsonify({
                    "connected": True, 
                    "channel_name": vc.channel.name,
                    "is_playing": vc.is_playing(),
                    "title": current_song["title"] if current_song else "Chưa có bài hát",
                    "author": current_song.get("uploader", "Không rõ") if current_song else "",
                    "thumbnail": current_song["thumbnail"] if current_song else ""
                })

    if bot_instance is None:
        return jsonify({"connected": False})

    for guild in bot_instance.guilds:
        member = guild.get_member(user_id)
        if member and member.voice and member.voice.channel:
            vc = guild.voice_client
            # Kiểm tra xem bot có đang ở cùng phòng với user không
            if vc and vc.is_connected() and vc.channel.id == member.voice.channel.id:
                return jsonify({"connected": True, "channel_name": vc.channel.name})

    return jsonify({"connected": False})