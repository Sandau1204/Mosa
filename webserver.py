import os
import json
import asyncio
import requests
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_url_path='/static')
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.urandom(24))

CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:5000/callback")
API_ENDPOINT = "https://discord.com/api/v10"
SETTINGS_FILE = "data/server_settings.json"

bot_instance = None

def run_web(bot):
    global bot_instance
    bot_instance = bot
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)

def check_auth():
    return "token" in session

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
    if not check_auth():
        return render_template("login.html")
    return render_template("index.html", user=session.get("user"))

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