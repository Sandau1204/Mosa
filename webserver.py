from flask import Flask, render_template, request, jsonify
import threading
import asyncio
import discord
import logging

app = Flask(__name__)
bot_instance = None 
log = logging.getLogger('werkzeug'); log.setLevel(logging.ERROR)

def run_web(bot):
    global bot_instance; bot_instance = bot
    app.run(host='0.0.0.0', port=5000)

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

@app.route('/')
def index(): return render_template('index.html')

@app.route('/api/guilds')
def get_guilds():
    if not bot_instance: return jsonify([])
    return jsonify([{"id": str(g.id), "name": g.name} for g in bot_instance.guilds])

@app.route('/api/channels')
def get_channels():
    gid = request.args.get('guild_id')
    if not bot_instance or not gid: return jsonify([])
    try:
        g = bot_instance.get_guild(int(gid))
        return jsonify([{"id": str(c.id), "name": c.name} for c in g.voice_channels]) if g else jsonify([])
    except: return jsonify([])

@app.route('/api/join', methods=['POST'])
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

@app.route('/api/status')
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
        playing = g.voice_client.is_playing() if g and g.voice_client else False
        c_name = g.voice_client.channel.name if g and g.voice_client else ""
        return jsonify({
            "title": cur.get('title', ''), "thumbnail": cur.get('thumbnail', None),
            "channel": cur.get('channel', ''), "is_playing": playing,
            "loop": mc.loops.get(gid_int, False), "queue": [{"title": s['title']} for s in q],
            "connected_channel": c_name
        })
    except: return jsonify({})

@app.route('/api/control/<action>', methods=['POST'])
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
            await asyncio.sleep(0.1); 
            if g.voice_client: await g.voice_client.disconnect()
        run(lv())
    elif action == "loop": 
        mc.loops[gid_int] = not mc.loops.get(gid_int, False); run(mc.update_ui(gid_int))
    elif action == "vol_up":
        v = min(1.0, mc.volumes.get(gid_int, 0.5) + 0.1); mc.volumes[gid_int] = v
        if vc.source: vc.source.volume = v
        run(mc.update_ui(gid_int))
    elif action == "vol_down":
        v = max(0.0, mc.volumes.get(gid_int, 0.5) - 0.1); mc.volumes[gid_int] = v
        if vc.source: vc.source.volume = v
        run(mc.update_ui(gid_int))
    return jsonify({"status": "ok"})

@app.route('/api/search', methods=['GET'])
def search_api():
    query = request.args.get('query')
    if not bot_instance or not query: return jsonify([])
    mc = bot_instance.get_cog('Music')
    async def do_search(): return await mc.search_youtube(query)
    future = asyncio.run_coroutine_threadsafe(do_search(), bot_instance.loop)
    try:
        results = future.result(timeout=15) 
        clean_results = []
        for r in results:
            url = r.get('webpage_url') or r.get('url')
            if not url and r.get('id'): url = f"https://www.youtube.com/watch?v={r['id']}"
            if url:
                clean_results.append({
                    'title': r.get('title', 'Unknown'), 'url': url,
                    'thumbnail': r.get('thumbnail', ''), 'uploader': r.get('uploader', ''),
                    'duration': r.get('duration_string', '')
                })
        return jsonify(clean_results)
    except: return jsonify([])

@app.route('/api/play', methods=['POST'])
def play_api():
    gid = request.args.get('guild_id'); query = request.args.get('query')
    if not bot_instance or not gid or not query: return jsonify({"status": "error"})
    gid_int = int(gid); mc = bot_instance.get_cog('Music'); g = bot_instance.get_guild(gid_int)
    
    # Logic Ưu tiên kênh Setup
    tch = None
    setup_id = mc.settings.get(str(gid_int), {}).get("music_channel")
    if setup_id: tch = g.get_channel(setup_id)
    
    if not tch and gid_int in mc.ui_messages:
        try: tch = mc.ui_messages[gid_int].channel
        except: pass
    if not tch and g.voice_client and hasattr(g.voice_client.channel, 'send'): tch = g.voice_client.channel
    if not tch and g.text_channels: tch = g.text_channels[0]

    if tch:
        async def do_play():
            if not g.voice_client: return 
            if "http" in query: info = await mc.get_song_info(query)
            else:
                res = await mc.search_youtube(query)
                info = res[0] if res else None
            if info:
                fake = FakeInteraction(g, tch, g.me)
                await mc.process_song_request(fake, info)
        asyncio.run_coroutine_threadsafe(do_play(), bot_instance.loop)
    return jsonify({"status": "ok"})