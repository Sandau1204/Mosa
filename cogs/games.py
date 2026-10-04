import hashlib
import hmac
import json
import logging
import math
import os
import secrets
import tempfile
import threading
import time
import uuid

import discord
from discord.ext import commands, tasks
from flask import jsonify, request, session

from webserver import app, is_bot_owner, load_games_auth_ticket, run_coro
from cogs.engines import monopoly
from cogs.engines import chess_game
from cogs.engines import xiangqi_game


logger = logging.getLogger(__name__)
DATA_FOLDER = os.getenv("DATA_FOLDER", "data")
GAMES_FILE = os.path.join(DATA_FOLDER, "games.json")
ROOM_TTL_SECONDS = 24 * 60 * 60
ACTIVITY_PRESENCE_TTL_SECONDS = 60
_routes_registered = False
GAME_PLAYER_LIMITS = {
    "xiangqi": 2,
    "chess": 2,
    "monopoly": 6,
    "uno": 8,
    "ludo": 4,
    "caro": 2,
    "werewolf": 16,
}


def _dispatch_games_api(method, *args):
    cog = app.extensions.get("games_cog")
    if not cog:
        return jsonify({"error": "Game Hub backend chưa sẵn sàng."}), 503
    return getattr(cog, method)(*args)


def _lobby_route():
    return _dispatch_games_api("lobby")


def _create_room_route():
    return _dispatch_games_api("create_room")


def _join_room_route(room_id):
    return _dispatch_games_api("join_room", room_id)


def _leave_room_route(room_id):
    return _dispatch_games_api("leave_room", room_id)


def _close_activity_route(room_id):
    return _dispatch_games_api("close_activity", room_id)


def _monopoly_route(room_id):
    return _dispatch_games_api("monopoly_room", room_id)


def _seats_route(room_id):
    return _dispatch_games_api("room_seats", room_id)


def _create_tournament_route():
    return _dispatch_games_api("create_tournament")


def _delete_tournament_route(guild_id):
    return _dispatch_games_api("delete_tournament", guild_id)


def _create_invite_route():
    return _dispatch_games_api("create_invite")


def _tournament_visibility_route(guild_id):
    return _dispatch_games_api('set_tournament_visibility', guild_id)


def register_games_routes():
    global _routes_registered
    if _routes_registered:
        return
    routes = (
        ("/api/games/lobby", "games_lobby", _lobby_route, ["GET"]),
        ("/api/games/rooms", "games_create_room", _create_room_route, ["POST"]),
        ("/api/games/rooms/<room_id>/join", "games_join_room", _join_room_route, ["POST"]),
        ("/api/games/rooms/<room_id>/leave", "games_leave_room", _leave_room_route, ["POST"]),
        ("/api/games/rooms/<room_id>/activity-close", "games_close_activity", _close_activity_route, ["POST"]),
        ("/api/games/rooms/<room_id>/monopoly", "games_monopoly", _monopoly_route, ["GET", "POST"]),
        ("/api/games/rooms/<room_id>/seats", "games_seats", _seats_route, ["GET", "POST"]),
        ("/api/games/tournaments", "games_create_tournament", _create_tournament_route, ["POST"]),
        ("/api/games/tournaments/<guild_id>", "games_delete_tournament", _delete_tournament_route, ["DELETE"]),
        ("/api/games/tournaments/<guild_id>/visibility", "games_tournament_visibility", _tournament_visibility_route, ["PUT"]),
        ("/api/games/invite", "games_create_invite", _create_invite_route, ["POST"]),
    )
    for rule, endpoint, view, methods in routes:
        app.add_url_rule(rule, endpoint, view, methods=methods)
        app.add_url_rule(f"/.proxy{rule}", f"{endpoint}_proxy", view, methods=methods)
    _routes_registered = True


class Games(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self._lock = threading.RLock()
        self._activity_presence = {}
        self._global_presence = {}
        self._closed_activity = {}
        self._data = self._load_data()
        app.extensions["games_cog"] = self
        self.cleanup_activity_rooms.start()

    def cog_unload(self):
        self.cleanup_activity_rooms.cancel()

    @tasks.loop(seconds=15)
    async def cleanup_activity_rooms(self):
        with self._lock:
            if self._remove_inactive_room_members():
                self._save_data()

    def _remove_inactive_room_members(self):
        now = time.monotonic()
        changed = False
        retained_keys = set()
        for room_id, room in list(self._data['rooms'].items()):
            seated_ids = {p['id'] for p in room['players']}
            departed_ids = set()
            for player in room['players'] + room.get('spectators', []):
                key = (room['guild_id'], player['id'])
                closed_at = self._closed_activity.get(key)
                # A short grace period lets a reload reconnect without losing its seat.
                if closed_at is not None and now - closed_at >= 15:
                    departed_ids.add(player['id'])
                else:
                    retained_keys.add(key)
            if not departed_ids:
                continue
            changed = True
            room['players'] = [p for p in room['players'] if p['id'] not in departed_ids]
            room['spectators'] = [p for p in room.get('spectators', []) if p['id'] not in departed_ids]
            remaining = room['players'] + room['spectators']
            if not remaining:
                del self._data['rooms'][room_id]
                continue
            if room['host']['id'] in departed_ids:
                room['host'] = {k: remaining[0][k] for k in ('id', 'name', 'avatar') if k in remaining[0]}
            if departed_ids & seated_ids and room['game_id'] in ('chess', 'xiangqi'):
                self._reset_board_seats(room)
            if room.get('monopoly'):
                for user_id in sorted(departed_ids & seated_ids):
                    self._leave_monopoly_seat(room['monopoly'], user_id)
            elif departed_ids & seated_ids:
                room['status'] = 'waiting'
            room['updated_at'] = time.time()
        self._activity_presence = {
            key: seen_at for key, seen_at in self._activity_presence.items()
            if key in retained_keys or now - seen_at < ACTIVITY_PRESENCE_TTL_SECONDS
        }
        self._closed_activity = {key: closed_at for key, closed_at in self._closed_activity.items() if key in retained_keys}
        return changed

    def close_activity(self, room_id):
        user, error = self._user()
        if user is None:
            return error
        with self._lock:
            room = self._data['rooms'].get(room_id)
            if room and any(p['id'] == str(user['id']) for p in room['players'] + room.get('spectators', [])):
                self._closed_activity[(room['guild_id'], str(user['id']))] = time.monotonic()
        return jsonify({'success': True})

    def _load_data(self):
        try:
            with open(GAMES_FILE, "r", encoding="utf-8") as data_file:
                data = json.load(data_file)
        except FileNotFoundError:
            return {"rooms": {}, "tournaments": {}, "leaderboards": {}}
        except (OSError, json.JSONDecodeError):
            logger.exception("Could not read game lobby data from %s.", GAMES_FILE)
            raise

        if not isinstance(data, dict):
            raise ValueError(f"Invalid game lobby data in {GAMES_FILE}.")
        data.setdefault("rooms", {})
        data.setdefault("tournaments", {})
        data.setdefault("leaderboards", {})
        return data

    def _save_data(self):
        os.makedirs(DATA_FOLDER, exist_ok=True)
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                "w",
                encoding="utf-8",
                dir=DATA_FOLDER,
                delete=False,
            ) as data_file:
                temp_path = data_file.name
                json.dump(self._data, data_file, ensure_ascii=False, indent=2)
                data_file.flush()
                os.fsync(data_file.fileno())
            os.replace(temp_path, GAMES_FILE)
        except OSError:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
            logger.exception("Could not persist game lobby data to %s.", GAMES_FILE)
            raise

    def _user(self):
        authorization = request.headers.get("Authorization", "")
        scheme, _, ticket = authorization.partition(" ")
        if scheme.lower() == "bearer":
            user = load_games_auth_ticket(ticket) if ticket else None
            if user:
                return user, None
            return None, (jsonify({"error": "Phiên xác thực Game Hub không hợp lệ hoặc đã hết hạn."}), 401)

        user = session.get("user")
        if isinstance(user, dict) and user.get("id"):
            return user, None
        return None, (jsonify({"error": "Vui lòng đăng nhập Discord để sử dụng Game Hub."}), 401)

    async def _member_in_guild(self, guild, user_id):
        member = guild.get_member(int(user_id))
        if member:
            return member
        try:
            return await guild.fetch_member(int(user_id))
        except discord.NotFound:
            return None

    def _accessible_guilds(self, user):
        user_id = user["id"]
        oauth_guild_ids = user.get("guild_ids")

        async def find_guilds():
            accessible = []
            for guild in self.bot.guilds:
                if isinstance(oauth_guild_ids, list):
                    if str(guild.id) in oauth_guild_ids:
                        accessible.append((guild, guild.get_member(int(user_id))))
                    continue
                try:
                    member = await self._member_in_guild(guild, user_id)
                except discord.Forbidden:
                    logger.warning(
                        "Cannot verify Discord user %s in guild %s.",
                        user_id,
                        guild.id,
                    )
                    continue
                if member:
                    accessible.append((guild, member))
            return accessible

        return run_coro(find_guilds())

    def _get_guild_member(self, guild_id, user_id):
        try:
            guild_id_int = int(guild_id)
        except (TypeError, ValueError):
            return None, None, (jsonify({"error": "Guild ID không hợp lệ."}), 400)

        if not self.bot.is_ready():
            return None, None, (jsonify({"error": "Discord bot hiện không khả dụng."}), 503)
        guild = self.bot.get_guild(guild_id_int)
        if not guild:
            return None, None, (jsonify({"error": "Không tìm thấy server."}), 404)
        try:
            member = run_coro(self._member_in_guild(guild, user_id))
        except discord.Forbidden:
            logger.warning("Cannot verify Discord user %s in guild %s.", user_id, guild_id)
            return None, None, (jsonify({"error": "Bot không thể xác minh thành viên server này."}), 503)
        except discord.HTTPException:
            logger.exception("Discord member lookup failed for user %s in guild %s.", user_id, guild_id)
            return None, None, (jsonify({"error": "Không thể kiểm tra quyền truy cập server lúc này."}), 503)
        if not member:
            return None, None, (jsonify({"error": "Bạn không phải thành viên của server này."}), 403)
        return guild, member, None

    @staticmethod
    def _avatar(member):
        return member.display_avatar.url

    @staticmethod
    def _room_is_locked(room):
        return bool(room.get("password_hash"))

    def _public_room(self, room, user_id=None):
        return {
            "id": room["id"],
            "guildId": room["guild_id"],
            "gameId": room["game_id"],
            "name": room["name"],
            "host": room["host"]["name"],
            "players": len(room["players"]),
            "maxPlayers": room["max_players"],
            "isLocked": self._room_is_locked(room),
            "status": room["status"],
            "isTimerEnabled": room["is_timer_enabled"],
            "allowSpectators": room["allow_spectators"],
            "mode": room["mode"],
            "botElo": room.get("bot_elo"),
            "createdAt": room["created_at"],
            "isJoined": any(player["id"] == str(user_id) for player in room["players"] + room.get("spectators", [])),
        }

    def _clean_expired_rooms(self):
        now = time.time()
        expired = [
            room_id
            for room_id, room in self._data["rooms"].items()
            if now - room.get("updated_at", room.get("created_at", 0)) > ROOM_TTL_SECONDS
            or not (room.get('players') or room.get('spectators'))
        ]
        for room_id in expired:
            del self._data["rooms"][room_id]
        return bool(expired)

    @staticmethod
    def _is_guild_admin(member):
        if member is None:
            return False
        permissions = member.guild_permissions
        return permissions.administrator is True or permissions.manage_guild is True

    def lobby(self):
        user, error = self._user()
        if user is None:
            return error

        try:
            accessible_guilds = self._accessible_guilds(user) if self.bot.is_ready() else []
        except Exception:
            logger.exception("Could not load Game Hub servers for Discord user %s.", user["id"])
            accessible_guilds = []

        guilds = [
            {
                "id": str(guild.id),
                "name": guild.name,
                "icon": guild.icon.url if guild.icon else None,
                "isOwner": guild.owner_id == int(user["id"]),
            }
            for guild, _ in accessible_guilds
        ]
        requested_guild_id = request.args.get("guild_id")
        selected = next(
            (
                item
                for item in accessible_guilds
                if str(item[0].id) == str(requested_guild_id)
            ),
            None,
        )
        if not selected:
            selected = next(
                (item for item in accessible_guilds
                 if item[1] and item[1].voice and item[1].voice.channel),
                None,
            )
        if not selected and accessible_guilds:
            selected = accessible_guilds[0]

        # Rooms and reconnects do not depend on the current Discord server.
        with self._lock:
            now = time.monotonic()
            self._global_presence[str(user['id'])] = {
                'id': str(user['id']),
                'name': user.get('global_name') or user.get('username') or str(user['id']),
                'avatar': user.get('avatar'),
                'seen_at': now,
            }
            self._global_presence = {
                uid: profile for uid, profile in self._global_presence.items()
                if now - profile['seen_at'] < ACTIVITY_PRESENCE_TTL_SECONDS
            }
            for key in list(self._closed_activity):
                if key[1] == str(user["id"]):
                    self._closed_activity.pop(key, None)
            changed = self._clean_expired_rooms()
            changed = self._remove_inactive_room_members() or changed
            rooms = [self._public_room(room, user["id"]) for room in self._data["rooms"].values()]
            joined_ids = {
                player['id'] for room in self._data['rooms'].values()
                for player in room['players'] + room.get('spectators', [])
            }
            members = [
                {key: profile[key] for key in ('id', 'name', 'avatar')}
                | {'status': 'in-game' if profile['id'] in joined_ids else 'ready'}
                for profile in self._global_presence.values()
            ]
            global_tournament = self._data["tournaments"].get("global")
            if changed:
                self._save_data()

        if not selected:
            return jsonify({
                "guilds": guilds,
                "guild": None,
                "voiceMembers": [],
                "members": members,
                "voiceChannels": [],
                "currentVoiceChannel": None,
                "rooms": rooms,
                "tournament": global_tournament,
                "globalTournament": global_tournament,
                "serverTournament": None,
                "leaderboard": [],
                "ping": round(self.bot.latency * 1000) if math.isfinite(self.bot.latency) else None,
            })

        guild, member = selected
        voice_state = member.voice if member else None
        current_voice_channel = voice_state.channel if voice_state else None
        guild_id = str(guild.id)
        with self._lock:
            now = time.monotonic()
            self._activity_presence[(guild_id, str(user["id"]))] = now
            self._closed_activity.pop((guild_id, str(user["id"])), None)
            activity_user_ids = {
                user_id for (presence_guild_id, user_id), seen_at in self._activity_presence.items()
                if presence_guild_id == guild_id and now - seen_at < ACTIVITY_PRESENCE_TTL_SECONDS
            }
            tournament = global_tournament if request.args.get("context") == "global" else self._data["tournaments"].get(guild_id)
            server_tournament = None if request.args.get('context') == 'global' else self._data['tournaments'].get(guild_id)
            global_visible = self._data.get('tournament_visibility', {}).get(guild_id, True)
            if request.args.get('context') != 'global' and not global_visible:
                global_tournament = None
            leaderboard = self._data["leaderboards"].get(guild_id, [])
            active_player_ids = {
                player["id"]
                for room in self._data["rooms"].values()
                for player in room["players"] + room.get("spectators", [])
            }

        voice_channels = [
            {
                "id": str(channel.id),
                "name": channel.name,
                "memberCount": len(channel.members),
            }
            for channel in guild.voice_channels
        ]
        voice_members = [
            {
                "id": str(member.id),
                "name": member.display_name,
                "avatar": self._avatar(member),
                "role": member.top_role.name if member.top_role else "Member",
                "channel": member.voice.channel.name,
                "status": (
                    "in-game" if str(member.id) in active_player_ids
                    else "ready" if str(member.id) in activity_user_ids
                    else "not-joined"
                ),
                "isOwner": member.id == guild.owner_id,
            }
            for channel in guild.voice_channels
            for member in channel.members
        ]
        return jsonify({
            "guilds": guilds,
            "guild": {
                "id": guild_id,
                "name": guild.name,
                "isOwner": guild.owner_id == int(user["id"]),
                "isAdmin": self._is_guild_admin(member),
            },
            "voiceMembers": voice_members,
            "members": members,
            "voiceChannels": voice_channels,
            "currentVoiceChannel": {
                "id": str(current_voice_channel.id),
                "name": current_voice_channel.name,
                "memberCount": len(current_voice_channel.members),
            } if current_voice_channel else None,
            "rooms": rooms,
            "tournament": tournament,
            "globalTournament": global_tournament,
            "serverTournament": server_tournament,
            "globalTournamentVisible": global_visible,
            "leaderboard": leaderboard,
            "ping": round(self.bot.latency * 1000) if math.isfinite(self.bot.latency) else None,
        })

    def create_room(self):
        user, error = self._user()
        if user is None:
            return error
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Dữ liệu tạo phòng không hợp lệ."}), 400

        game_id = data.get("game_id")
        if not isinstance(game_id, str) or game_id not in GAME_PLAYER_LIMITS:
            return jsonify({"error": "Trò chơi không hợp lệ."}), 400
        name = data.get("name")
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 80:
            return jsonify({"error": "Tên phòng phải có từ 1 đến 80 ký tự."}), 400
        submitted_password = data.get("password", "")
        if not isinstance(submitted_password, str) or len(submitted_password) > 128:
            return jsonify({"error": "Mật khẩu phòng không hợp lệ."}), 400
        if not isinstance(data.get("is_locked", False), bool):
            return jsonify({"error": "Cấu hình khóa phòng không hợp lệ."}), 400
        password = submitted_password if data.get("is_locked") else ""
        if data.get("is_locked") and not password:
            return jsonify({"error": "Hãy nhập mật khẩu cho phòng được khóa."}), 400
        mode = data.get("mode", "pvp")
        if mode not in ("pvp", "pve"):
            return jsonify({"error": "Chế độ chơi không hợp lệ."}), 400
        if game_id == "monopoly" and mode != "pvp":
            return jsonify({"error": "Cờ tỷ phú hỗ trợ 2–6 người chơi PvP."}), 400
        if data.get("bot_elo", 1200) not in (500, 1200, 2000):
            return jsonify({"error": "Độ khó bot không hợp lệ."}), 400
        if not isinstance(data.get("is_timer_enabled", True), bool):
            return jsonify({"error": "Cấu hình giờ đấu không hợp lệ."}), 400
        if not isinstance(data.get("allow_spectators", True), bool):
            return jsonify({"error": "Cấu hình khán giả không hợp lệ."}), 400

        salt = secrets.token_bytes(16) if password else None
        room = {
            "id": uuid.uuid4().hex,
            "guild_id": None,
            "game_id": game_id,
            "name": name.strip(),
            "host": {
                "id": str(user["id"]),
                "name": (user.get("global_name") or user.get("username") or str(user["id"])),
                "avatar": user.get("avatar"),
            },
            "players": [{
                "id": str(user["id"]),
                "name": (user.get("global_name") or user.get("username") or str(user["id"])),
                "avatar": user.get("avatar"),
            }],
            "max_players": GAME_PLAYER_LIMITS[game_id],
            "password_salt": salt.hex() if salt else None,
            "password_hash": hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1).hex() if salt else None,
            "status": "waiting",
            "is_timer_enabled": bool(data.get("is_timer_enabled", True)),
            "allow_spectators": bool(data.get("allow_spectators", True)),
            "mode": mode,
            "bot_elo": data.get("bot_elo", 1200) if mode == "pve" else None,
            "created_at": time.time(),
            "updated_at": time.time(),
        }
        with self._lock:
            self._clean_expired_rooms()
            self._data["rooms"][room["id"]] = room
            self._save_data()
        return jsonify({"room": self._public_room(room, user["id"])}), 201

    def join_room(self, room_id):
        user, error = self._user()
        if user is None:
            return error
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Dữ liệu tham gia phòng không hợp lệ."}), 400

        with self._lock:
            room = self._data["rooms"].get(room_id)
            if not room:
                return jsonify({"error": "Không tìm thấy phòng chơi."}), 404
            if room["status"] == "in-game" and room["game_id"] not in ("monopoly", "chess", "xiangqi"):
                return jsonify({"error": "Trận đấu trong phòng này đã bắt đầu."}), 409
            if self._room_is_locked(room):
                password = data.get("password")
                if not isinstance(password, str):
                    return jsonify({"error": "Mật khẩu phòng không chính xác."}), 403
                submitted = hashlib.scrypt(
                    password.encode("utf-8"),
                    salt=bytes.fromhex(room["password_salt"]),
                    n=2**14,
                    r=8,
                    p=1,
                ).hex()
                if not hmac.compare_digest(submitted, room["password_hash"]):
                    return jsonify({"error": "Mật khẩu phòng không chính xác."}), 403
            if room["game_id"] in ("monopoly", "chess", "xiangqi"):
                spectators = room.setdefault("spectators", [])
                if not any(p['id'] == str(user["id"]) for p in room['players'] + spectators):
                    if room['game_id'] != 'monopoly' and not room.get('allow_spectators', True):
                        self._ensure_board_seats(room)
                        side = next((s for s in ('red', 'black') if not any(p['side'] == s for p in room['players'])), None)
                        if side is None:
                            return jsonify({'error': 'Phòng đã đủ người và không cho phép khán giả.'}), 409
                        room['players'].append({'id': str(user["id"]), 'name': (user.get("global_name") or user.get("username") or str(user["id"])),
                                                'avatar': user.get("avatar"), 'side': side, 'isReady': False})
                        self._reset_board_seats(room)
                    else:
                        spectators.append({'id': str(user["id"]), 'name': (user.get("global_name") or user.get("username") or str(user["id"])), 'avatar': user.get("avatar")})
            elif not any(player["id"] == str(user["id"]) for player in room["players"]):
                if len(room["players"]) >= room["max_players"]:
                    return jsonify({"error": "Phòng đã đủ người chơi."}), 409
                room["players"].append({
                    "id": str(user["id"]),
                    "name": (user.get("global_name") or user.get("username") or str(user["id"])),
                    "avatar": user.get("avatar"),
                })
            if len(room["players"]) >= room["max_players"] and room["game_id"] not in ("monopoly", "chess", "xiangqi"):
                room["status"] = "in-game"
            room["updated_at"] = time.time()
            self._save_data()
            public_room = self._public_room(room, user["id"])
        return jsonify({"room": public_room})

    def leave_room(self, room_id):
        user, error = self._user()
        if user is None:
            return error
        with self._lock:
            room = self._data["rooms"].get(room_id)
            if not room:
                return jsonify({"error": "Không tìm thấy phòng chơi."}), 404
            if not any(player["id"] == str(user["id"]) for player in room["players"] + room.get('spectators', [])):
                return jsonify({"error": "Bạn chưa tham gia phòng này."}), 403
            room['spectators'] = [p for p in room.get('spectators', []) if p['id'] != str(user['id'])]
            was_seated = any(p['id'] == str(user['id']) for p in room['players'])
            room["players"] = [
                player for player in room["players"] if player["id"] != str(user["id"])
            ]
            if not (room["players"] or room['spectators']):
                del self._data["rooms"][room_id]
            else:
                if room['host']['id'] == str(user['id']):
                    successor = (room['players'] or room['spectators'])[0]
                    room['host'] = {key: successor[key] for key in ('id', 'name', 'avatar') if key in successor}
                if was_seated and room['game_id'] in ('chess', 'xiangqi'):
                    self._reset_board_seats(room)
                if room.get("monopoly") and room["monopoly"]["phase"] != "finished":
                    state = room["monopoly"]
                    self._leave_monopoly_seat(state, str(user['id']))
                elif not room.get("monopoly") and (was_seated or room['game_id'] not in ('chess', 'xiangqi')):
                    room["status"] = "waiting"
                room["updated_at"] = time.time()
            self._save_data()
        return jsonify({"success": True})

    @staticmethod
    def _ensure_board_seats(room):
        used = {p.get('side') for p in room['players']}
        for player in room['players']:
            if player.get('side') not in ('red', 'black'):
                player['side'] = next(side for side in ('red', 'black') if side not in used)
                used.add(player['side'])
            player.setdefault('isReady', False)

    @staticmethod
    def _reset_board_seats(room):
        for player in room['players']:
            player['isReady'] = False
        room['status'] = 'waiting'
        room['seatRevision'] = room.get('seatRevision', 0) + 1
        room.pop('drawOffer', None)
        room.pop('gameResult', None)
        room.pop('chess', None)
        room.pop('xiangqi', None)

    def room_seats(self, room_id):
        user, error = self._user()
        if user is None:
            return error
        data = request.get_json(silent=True) if request.method == 'POST' else request.args
        if data is None or not hasattr(data, 'get'):
            return jsonify({'error': 'Dữ liệu không hợp lệ.'}), 400
        with self._lock:
            room = self._data['rooms'].get(room_id)
            if not room or room['game_id'] not in ('chess', 'xiangqi'):
                return jsonify({'error': 'Không tìm thấy phòng cờ.'}), 404
            user_id = str(user['id'])
            spectators = room.setdefault('spectators', [])
            if not any(p['id'] == user_id for p in room['players'] + spectators):
                return jsonify({'error': 'Bạn chưa tham gia phòng.'}), 403
            self._ensure_board_seats(room)
            game_key = room['game_id']
            engine = chess_game if game_key == 'chess' else xiangqi_game
            if game_key in ('chess', 'xiangqi') and room['status'] == 'in-game' and not room.get('gameResult'):
                # Older rooms had no server board. Start their shared state once.
                if not room.get(game_key):
                    room[game_key] = engine.start(room.get('is_timer_enabled', False))
                    self._save_data()
                board = engine.load_board(room[game_key])
                terminal = engine.result(board) or engine.expire(room[game_key], board)
                if terminal:
                    room['gameResult'] = terminal
                    room['drawOffer'] = None
                    engine.stop_clock(room[game_key], board)
                    self._save_data()
            if request.method == 'POST':
                action = data.get('action')
                player = next((p for p in room['players'] if p['id'] == user_id), None)
                if action == 'sit':
                    side = data.get('side')
                    if side not in ('red', 'black'):
                        return jsonify({'error': 'Chỗ ngồi không hợp lệ.'}), 400
                    if any(p['side'] == side for p in room['players']) or room['status'] == 'in-game':
                        return jsonify({'error': 'Chỗ ngồi đã có người hoặc trận đã bắt đầu.'}), 409
                    if player:
                        player['side'] = side
                    else:
                        player = next(p for p in spectators if p['id'] == user_id)
                        spectators.remove(player)
                        room['players'].append(dict(player, side=side, isReady=False))
                    self._reset_board_seats(room)
                elif action == 'leave_seat':
                    if not player:
                        return jsonify({'error': 'Bạn đang là khán giả.'}), 409
                    room['players'].remove(player)
                    spectators.append({k: v for k, v in player.items() if k not in ('side', 'isReady')})
                    self._reset_board_seats(room)
                elif action == 'ready':
                    if not player:
                        return jsonify({'error': 'Bạn không thể sẵn sàng lúc này.'}), 409
                    if room.get('gameResult'):
                        room['status'] = 'waiting'
                        room['drawOffer'] = None
                        room['gameResult'] = None
                        room.pop(game_key, None)
                        for seated_player in room['players']:
                            seated_player['isReady'] = False
                    elif room['status'] == 'in-game':
                        return jsonify({'error': 'Bạn không thể sẵn sàng lúc này.'}), 409
                    player['isReady'] = not player['isReady']
                    if len(room['players']) == 2 and all(p['isReady'] for p in room['players']):
                        room['status'] = 'in-game'
                        room['drawOffer'] = None
                        room['gameResult'] = None
                        room['matchRevision'] = room.get('matchRevision', 0) + 1
                        if game_key in ('chess', 'xiangqi'):
                            room[game_key] = engine.start(room.get('is_timer_enabled', False))
                elif action == 'move' and game_key in ('chess', 'xiangqi'):
                    if not player:
                        return jsonify({'error': 'Khán giả không thể đi cờ.'}), 403
                    if (room['status'] != 'in-game' or len(room['players']) != 2
                            or not all(p['isReady'] for p in room['players']) or room.get('gameResult')):
                        return jsonify({'error': 'Trận đấu không còn diễn ra.'}), 409
                    state = room[game_key]
                    if (type(data.get('matchRevision')) is not int
                            or data['matchRevision'] != room.get('matchRevision', 0)
                            or type(data.get('boardRevision')) is not int
                            or data['boardRevision'] != state['revision']):
                        return jsonify({'error': 'Bàn cờ đã thay đổi. Hãy thử lại.'}), 409
                    board = engine.load_board(state)
                    try:
                        room['gameResult'] = engine.move(state, board, player['side'], data)
                    except ValueError as exc:
                        return jsonify({'error': str(exc)}), 409
                    if room.get('gameResult'):
                        room['drawOffer'] = None
                        engine.stop_clock(state, board)
                elif action in ('draw_offer', 'draw_response', 'resign', 'finish'):
                    if not player:
                        return jsonify({'error': 'Khán giả không thể thực hiện thao tác trận đấu.'}), 403
                    if action == 'finish' and game_key in ('chess', 'xiangqi'):
                        return jsonify({'error': 'Kết quả cờ vua do máy chủ xác định.'}), 409
                    if (room['status'] != 'in-game' or len(room['players']) != 2
                            or not all(p['isReady'] for p in room['players']) or room.get('gameResult')):
                        return jsonify({'error': 'Trận đấu không còn diễn ra.'}), 409
                    if action == 'draw_offer':
                        if room.get('drawOffer'):
                            return jsonify({'error': 'Đã có yêu cầu hòa đang chờ phản hồi.'}), 409
                        room['drawOffer'] = {
                            'playerId': user_id,
                            'side': player['side'],
                            'name': player.get('name', ''),
                        }
                    elif action == 'draw_response':
                        offer = room.get('drawOffer')
                        accepted = data.get('accept')
                        if not isinstance(accepted, bool):
                            return jsonify({'error': 'Phản hồi yêu cầu hòa không hợp lệ.'}), 400
                        if not offer or offer['playerId'] == user_id:
                            return jsonify({'error': 'Không có yêu cầu hòa từ đối thủ.'}), 409
                        room['drawOffer'] = None
                        if accepted:
                            room['gameResult'] = {'winner': None, 'reason': 'draw'}
                    else:
                        winner = player['side'] if action == 'finish' else next(
                            p['side'] for p in room['players'] if p['id'] != user_id
                        )
                        reason = 'capture' if action == 'finish' else 'resignation'
                        room['drawOffer'] = None
                        room['gameResult'] = {'winner': winner, 'reason': reason}
                else:
                    return jsonify({'error': 'Thao tác không hợp lệ.'}), 400
                if room.get(game_key) and room.get('gameResult'):
                    engine.stop_clock(room[game_key], engine.load_board(room[game_key]))
                room['updated_at'] = time.time()
                self._save_data()
            match_started = (room['status'] == 'in-game' and len(room['players']) == 2
                             and all(p['isReady'] for p in room['players']) and not room.get('gameResult'))
            chess_snapshot = None
            if game_key in ('chess', 'xiangqi'):
                state = room.get(game_key) or engine.start()
                chess_snapshot = engine.snapshot(state, engine.load_board(state), match_started)
            response = jsonify({'players': room['players'], 'spectators': spectators,
                            'revision': room.get('seatRevision', 0), 'hostId': room['host']['id'],
                            'matchRevision': room.get('matchRevision', 0),
                            'drawOffer': room.get('drawOffer'),
                            'gameResult': room.get('gameResult'),
                            game_key: chess_snapshot,
                            'matchStarted': match_started})
            response.headers['Cache-Control'] = 'no-store'
            return response

    @staticmethod
    def _leave_monopoly_seat(state, user_id):
        player = next((p for p in state['players'] if p['id'] == user_id), None)
        if state['phase'] != 'finished' and player and not player['bankrupt']:
            monopoly.eliminate(state, player)
            if state['turn'] == user_id or sum(not p['bankrupt'] for p in state['players']) <= 1:
                monopoly.advance(state)
            state['revision'] += 1

    def monopoly_room(self, room_id):
        user, error = self._user()
        if user is None:
            return error
        data = request.get_json(silent=True) if request.method == 'POST' else request.args
        if data is None or not hasattr(data, 'get'):
            return jsonify({'error': 'Dữ liệu không hợp lệ.'}), 400
        with self._lock:
            room = self._data['rooms'].get(room_id)
            if not room or room['game_id'] != 'monopoly':
                return jsonify({'error': 'Không tìm thấy phòng Cờ tỷ phú.'}), 404
            spectators = room.setdefault('spectators', [])
            user_id = str(user['id'])
            if not any(p['id'] == user_id for p in room['players'] + spectators):
                return jsonify({'error': 'Bạn chưa tham gia phòng.'}), 403
            state = room.get('monopoly')
            if request.method == 'POST':
                action = data.get('action')
                if action in ('join_seat', 'leave_seat'):
                    source, target = (spectators, room['players']) if action == 'join_seat' else (room['players'], spectators)
                    player = next((p for p in source if p['id'] == user_id), None)
                    if player is None:
                        return jsonify({'error': 'Vai trò của bạn đã thay đổi. Hãy thử lại.'}), 409
                    if action == 'join_seat' and len(target) >= room.get('max_players', 6):
                        return jsonify({'error': 'Bàn đã đủ người chơi.'}), 409
                    if action == 'leave_seat' and state:
                        self._leave_monopoly_seat(state, user_id)
                    source.remove(player)
                    target.append(player)
                elif action == 'start':
                    if room['host']['id'] != user_id or (state and state['phase'] != 'finished') or len(room['players']) < 2:
                        return jsonify({'error': 'Chủ phòng cần ít nhất 2 người để bắt đầu.'}), 409
                    state = room['monopoly'] = monopoly.start(room['players'])
                    state['revision'] = 0
                    room['status'] = 'in-game'
                else:
                    if not any(p['id'] == user_id for p in room['players']):
                        return jsonify({'error': 'Khán giả không thể thực hiện lượt chơi.'}), 403
                    if not state or data.get('revision') != state['revision']:
                        return jsonify({'error': 'Trạng thái đã thay đổi. Hãy thử lại.'}), 409
                    try:
                        monopoly.act(state, str(user['id']), action)
                    except ValueError as exc:
                        return jsonify({'error': str(exc)}), 409
                if state and action not in ('join_seat', 'leave_seat'):
                    state['revision'] += 1
                room['updated_at'] = time.time()
                self._save_data()
            return jsonify({'state': state, 'players': room['players'], 'spectators': spectators,
                            'maxPlayers': room.get('max_players', 6), 'hostId': room['host']['id']})

    def create_tournament(self):
        user, error = self._user()
        if user is None:
            return error
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({"error": "Dữ liệu giải đấu không hợp lệ."}), 400
        tournament_key = data.get('guild_id')
        if tournament_key == 'global':
            if not is_bot_owner(user['id']):
                return jsonify({'error': 'Only the bot owner can create global tournaments.'}), 403
        else:
            guild, member, error = self._get_guild_member(data.get("guild_id"), user["id"])
            if error:
                return error
            if guild is None or member is None:
                return jsonify({"error": "Không thể xác minh thành viên server."}), 503
            if member.id != guild.owner_id and not self._is_guild_admin(member):
                return jsonify({"error": "Chỉ chủ server hoặc Admin có quyền quản lý server mới có thể tạo giải đấu."}), 403
            tournament_key = str(guild.id)
        title = data.get("title")
        game_id = data.get("game_id")
        if not isinstance(title, str) or not title.strip() or len(title.strip()) > 100:
            return jsonify({"error": "Tên giải đấu phải có từ 1 đến 100 ký tự."}), 400
        if not isinstance(game_id, str) or game_id not in GAME_PLAYER_LIMITS:
            return jsonify({"error": "Trò chơi giải đấu không hợp lệ."}), 400
        description = data.get("description", "")
        prize = data.get("prize", "")
        if not isinstance(description, str) or not isinstance(prize, str):
            return jsonify({"error": "Mô tả và phần thưởng phải là văn bản."}), 400
        tournament = {
            "id": uuid.uuid4().hex,
            "title": title.strip(),
            "desc": description.strip()[:500],
            "prize": prize.strip()[:120],
            "gameId": game_id,
            "createdBy": str(user["id"]),
            "createdAt": time.time(),
        }
        with self._lock:
            self._data["tournaments"][tournament_key] = tournament
            self._save_data()
        return jsonify({"tournament": tournament}), 201

    def delete_tournament(self, guild_id):
        user, error = self._user()
        if user is None:
            return error
        if guild_id == 'global':
            if not is_bot_owner(user['id']):
                return jsonify({'error': 'Only the bot owner can delete global tournaments.'}), 403
        else:
            guild, member, error = self._get_guild_member(guild_id, user["id"])
            if error:
                return error
            if guild is None or member is None:
                return jsonify({"error": "Không thể xác minh thành viên server."}), 503
            if member.id != guild.owner_id and not self._is_guild_admin(member):
                return jsonify({"error": "Chỉ chủ server hoặc Admin mới có thể hủy giải đấu server."}), 403
        with self._lock:
            self._data["tournaments"].pop(str(guild_id), None)
            self._save_data()
        return jsonify({"success": True})

    def set_tournament_visibility(self, guild_id):
        user, error = self._user()
        if user is None:
            return error
        guild, member, error = self._get_guild_member(guild_id, user['id'])
        if error:
            return error
        if guild is None or member is None:
            return jsonify({'error': 'Không thể xác minh thành viên server.'}), 503
        if member.id != guild.owner_id and not self._is_guild_admin(member):
            return jsonify({'error': 'Chỉ chủ server hoặc Admin mới có thể đổi hiển thị giải Global.'}), 403
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or type(data.get('visible')) is not bool:
            return jsonify({'error': 'Cấu hình hiển thị không hợp lệ.'}), 400
        with self._lock:
            self._data.setdefault('tournament_visibility', {})[str(guild.id)] = data['visible']
            self._save_data()
        return jsonify({'globalTournamentVisible': data['visible']})

    def create_invite(self):
        user, error = self._user()
        if user is None:
            return error
        data = request.get_json(silent=True)
        guild, member, error = self._get_guild_member(
            data.get("guild_id") if isinstance(data, dict) else None,
            user["id"],
        )
        if error:
            return error
        if guild is None or member is None:
            return jsonify({"error": "Không thể xác minh thành viên server."}), 503
        channels = guild.voice_channels
        if member.voice and member.voice.channel:
            channels = [member.voice.channel]
        bot_member = guild.me
        if bot_member is None:
            return jsonify({"error": "Bot chưa sẵn sàng tạo lời mời Discord."}), 503
        if not channels:
            return jsonify({"error": "Server chưa có kênh thoại để tạo lời mời."}), 404
        channel = next(
            (
                candidate
                for candidate in channels
                if candidate.permissions_for(member).create_instant_invite
                and candidate.permissions_for(bot_member).create_instant_invite
            ),
            None,
        )
        if not channel:
            return jsonify({"error": "Bot không có quyền tạo lời mời trong kênh thoại của server."}), 403
        try:
            invite = run_coro(channel.create_invite(
                max_age=3600,
                max_uses=0,
                unique=True,
                reason=f"Game Hub invite requested by {member} ({member.id})",
            ))
        except discord.Forbidden:
            logger.warning("Bot cannot create a Game Hub invite in guild %s.", guild.id)
            return jsonify({"error": "Bot không có quyền tạo lời mời trong kênh thoại này."}), 403
        except discord.HTTPException:
            logger.exception("Discord invite creation failed for guild %s.", guild.id)
            return jsonify({"error": "Không thể tạo lời mời Discord lúc này."}), 503
        return jsonify({"url": invite.url})


async def setup(bot):
    await bot.add_cog(Games(bot))
