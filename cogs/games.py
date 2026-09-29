import json
import os
import threading
import time
from copy import deepcopy

import discord
from discord.ext import commands


DATA_FOLDER = os.getenv("DATA_FOLDER", "data")
GAME_DATA_FILE = os.path.join(DATA_FOLDER, "games.json")
INITIAL_CLOCK_MS = 20 * 60 * 1000
MOVE_INCREMENT_MS = 5 * 1000
PRESENCE_TIMEOUT_SECONDS = 20


class Game(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self._rooms_lock = threading.RLock()
        self._rooms = self._load_rooms()
        now = time.time()
        self._last_seen = {
            (room_id, str(user_id)): now
            for room_id, room in self._rooms.items()
            for user_id in self._participant_ids(room)
        }

    @staticmethod
    def _participant_ids(room):
        players = [room.get("redPlayer"), room.get("blackPlayer")]
        observers = room.get("observers", [])
        return [
            person["id"]
            for person in [*players, *observers]
            if isinstance(person, dict) and isinstance(person.get("id"), str)
        ]

    def _load_rooms(self):
        try:
            with open(GAME_DATA_FILE, "r", encoding="utf-8") as data_file:
                rooms = json.load(data_file)
        except FileNotFoundError:
            return {}

        if not isinstance(rooms, dict):
            raise ValueError(f"{GAME_DATA_FILE} must contain a JSON object.")
        for room_id, room in rooms.items():
            if (
                not room_id.isdecimal()
                or not isinstance(room, dict)
                or type(room.get("id")) is not int
                or room["id"] != int(room_id)
            ):
                raise ValueError(f"{GAME_DATA_FILE} contains an invalid room.")
        active_rooms = {
            room_id: room
            for room_id, room in rooms.items()
            if room.get("redPlayer") or room.get("blackPlayer") or room.get("observers")
        }
        if active_rooms != rooms:
            self._rooms = active_rooms
            self._save_rooms()
        return active_rooms

    def _save_rooms(self):
        os.makedirs(os.path.dirname(GAME_DATA_FILE) or ".", exist_ok=True)
        temporary_file = f"{GAME_DATA_FILE}.tmp"
        try:
            with open(temporary_file, "w", encoding="utf-8") as data_file:
                json.dump(self._rooms, data_file, ensure_ascii=False, indent=2)
                data_file.flush()
                os.fsync(data_file.fileno())
            os.replace(temporary_file, GAME_DATA_FILE)
        finally:
            if os.path.exists(temporary_file):
                os.remove(temporary_file)

    def get_rooms(self):
        with self._rooms_lock:
            now = int(time.time() * 1000)
            now_seconds = now / 1000
            changed = False
            previous_rooms = None
            previous_last_seen = None
            for room_id, room in list(self._rooms.items()):
                previous_participants = self._participant_ids(room)
                stale_ids = {
                    user_id
                    for user_id in previous_participants
                    if now_seconds - self._last_seen.get((room_id, user_id), 0)
                    > PRESENCE_TIMEOUT_SECONDS
                }
                if stale_ids:
                    if previous_rooms is None:
                        previous_rooms = deepcopy(self._rooms)
                        previous_last_seen = dict(self._last_seen)
                    stale_player_left = any(
                        player and str(player.get("id")) in stale_ids
                        for player in (room.get("redPlayer"), room.get("blackPlayer"))
                    )
                    for side in ("red", "black"):
                        player = room.get(f"{side}Player")
                        if player and str(player.get("id")) in stale_ids:
                            room[f"{side}Player"] = None
                    room["observers"] = [
                        observer
                        for observer in room.get("observers", [])
                        if str(observer.get("id")) not in stale_ids
                    ]
                    if stale_player_left:
                        room.update({
                            "status": "waiting",
                            "redReady": False,
                            "blackReady": False,
                            "clock": None,
                            "swapRequest": None,
                        })
                    room["slots"] = f"{int(bool(room.get('redPlayer'))) + int(bool(room.get('blackPlayer')))}/2"
                    room["revision"] = room.get("revision", 0) + 1
                    changed = True
                    for user_id in stale_ids:
                        self._last_seen.pop((room_id, user_id), None)
                    if not self._participant_ids(room):
                        del self._rooms[room_id]
                        continue

                clock = room.get("clock")
                if room.get("status") != "playing" or not isinstance(clock, dict):
                    continue
                active_side = clock.get("activeSide")
                started_at = clock.get("turnStartedAt")
                remaining_key = f"{active_side}Ms"
                if active_side not in ("red", "black") or not isinstance(started_at, int):
                    continue
                remaining = max(0, clock.get(remaining_key, 0) - (now - started_at))
                if remaining == 0:
                    if previous_rooms is None:
                        previous_rooms = deepcopy(self._rooms)
                        previous_last_seen = dict(self._last_seen)
                    clock[remaining_key] = 0
                    clock["turnStartedAt"] = None
                    room["status"] = "finished"
                    room["winner"] = "black" if active_side == "red" else "red"
                    room["result"] = f"Hết giờ: Phe {'Đen' if active_side == 'red' else 'Đỏ'} thắng."
                    room["revision"] = room.get("revision", 0) + 1
                    changed = True
            if changed:
                try:
                    self._save_rooms()
                except Exception:
                    self._rooms = previous_rooms
                    self._last_seen = previous_last_seen
                    raise
            return deepcopy(list(reversed(list(self._rooms.values()))))

    def heartbeat(self, room_id, user_id):
        with self._rooms_lock:
            room_key = str(room_id)
            room = self._rooms.get(room_key)
            if room is None or user_id not in {
                str(participant_id) for participant_id in self._participant_ids(room)
            }:
                return False
            self._last_seen[(room_key, user_id)] = time.time()
            return True

    def create_room(self, room):
        room_id = str(room["id"])
        with self._rooms_lock:
            if room_id in self._rooms:
                return False
            room = deepcopy(room)
            room.setdefault("revision", 0)
            room.setdefault("redReady", False)
            room.setdefault("blackReady", False)
            self._rooms[room_id] = room
            for user_id in self._participant_ids(room):
                self._last_seen[(room_id, str(user_id))] = time.time()
            try:
                self._save_rooms()
            except Exception:
                del self._rooms[room_id]
                for user_id in self._participant_ids(room):
                    self._last_seen.pop((room_id, str(user_id)), None)
                raise
            return True

    def update_room(self, room_id, room):
        key = str(room_id)
        with self._rooms_lock:
            if key not in self._rooms:
                return None
            previous_room = self._rooms[key]
            if room.get("revision", 0) != previous_room.get("revision", 0):
                return None
            room = deepcopy(room)
            seats_changed = any(
                (room.get(f"{side}Player") or {}).get("id")
                != (previous_room.get(f"{side}Player") or {}).get("id")
                for side in ("red", "black")
            )
            for field in (
                "ownerId",
                "name",
                "status",
                "clock",
                "winner",
                "result",
                "lastWinner",
            ):
                if field in previous_room:
                    room[field] = previous_room[field]
            if seats_changed:
                room["redReady"] = False
                room["blackReady"] = False
            else:
                room["redReady"] = previous_room.get("redReady", False)
                room["blackReady"] = previous_room.get("blackReady", False)
            room["revision"] = previous_room.get("revision", 0) + 1
            if not (room.get("redPlayer") or room.get("blackPlayer") or room.get("observers")):
                del self._rooms[key]
                try:
                    self._save_rooms()
                except Exception:
                    self._rooms[key] = previous_room
                    raise
                for user_id in self._participant_ids(previous_room):
                    self._last_seen.pop((key, str(user_id)), None)
                return "deleted"
            self._rooms[key] = room
            try:
                self._save_rooms()
            except Exception:
                self._rooms[key] = previous_room
                raise
            updated_participants = {str(user_id) for user_id in self._participant_ids(room)}
            previous_participants = {str(user_id) for user_id in self._participant_ids(previous_room)}
            for user_id in previous_participants - updated_participants:
                self._last_seen.pop((key, user_id), None)
            for user_id in updated_participants - previous_participants:
                self._last_seen[(key, user_id)] = time.time()
            return True

    def set_ready(self, room_id, user_id, ready):
        with self._rooms_lock:
            room = self._rooms.get(str(room_id))
            if room is None or room.get("status") not in ("waiting", "finished"):
                return None
            side = next(
                (
                    player_side
                    for player_side in ("red", "black")
                    if (room.get(f"{player_side}Player") or {}).get("id") == user_id
                ),
                None,
            )
            if side is None:
                return None

            previous_room = deepcopy(room)
            if room.get("status") == "finished":
                room.update({
                    "status": "waiting",
                    "clock": None,
                    "winner": None,
                    "result": None,
                    "lastWinner": None,
                    "redReady": False,
                    "blackReady": False,
                })
            room[f"{side}Ready"] = bool(ready)
            if room.get("redReady") and room.get("blackReady"):
                now = int(time.time() * 1000)
                room.update({
                    "status": "playing",
                    "swapRequest": None,
                    "winner": None,
                    "result": None,
                    "clock": {
                        "redMs": INITIAL_CLOCK_MS,
                        "blackMs": INITIAL_CLOCK_MS,
                        "incrementMs": MOVE_INCREMENT_MS,
                        "activeSide": "red",
                        "turnStartedAt": now,
                    },
                })
            room["revision"] = room.get("revision", 0) + 1
            try:
                self._save_rooms()
            except Exception:
                self._rooms[str(room_id)] = previous_room
                raise
            return room

    def complete_turn(self, room_id, user_id):
        with self._rooms_lock:
            room = self._rooms.get(str(room_id))
            clock = room.get("clock") if room else None
            if room is None or room.get("status") != "playing" or not isinstance(clock, dict):
                return None
            active_side = clock.get("activeSide")
            player = room.get(f"{active_side}Player") if active_side in ("red", "black") else None
            if not player or player.get("id") != user_id:
                return None

            now = int(time.time() * 1000)
            remaining_key = f"{active_side}Ms"
            started_at = clock.get("turnStartedAt")
            if not isinstance(started_at, int):
                return None
            elapsed = max(0, now - started_at)
            remaining = clock[remaining_key] - elapsed
            previous_room = deepcopy(room)
            if remaining <= 0:
                clock[remaining_key] = 0
                clock["turnStartedAt"] = None
                room["status"] = "finished"
                room["winner"] = "black" if active_side == "red" else "red"
                room["result"] = f"Hết giờ: Phe {'Đen' if active_side == 'red' else 'Đỏ'} thắng."
            else:
                next_side = "black" if active_side == "red" else "red"
                clock[remaining_key] = remaining + clock["incrementMs"]
                clock["activeSide"] = next_side
                clock["turnStartedAt"] = now
            room["revision"] = room.get("revision", 0) + 1
            try:
                self._save_rooms()
            except Exception:
                self._rooms[str(room_id)] = previous_room
                raise
            return room

    def surrender(self, room_id, user_id):
        with self._rooms_lock:
            room = self._rooms.get(str(room_id))
            if room is None or room.get("status") != "playing":
                return None
            side = next(
                (
                    player_side
                    for player_side in ("red", "black")
                    if (room.get(f"{player_side}Player") or {}).get("id") == user_id
                ),
                None,
            )
            if side is None:
                return None
            previous_room = deepcopy(room)
            winning_side = "black" if side == "red" else "red"
            room.update({
                "status": "waiting",
                "redReady": False,
                "blackReady": False,
                "clock": None,
                "swapRequest": None,
                "winner": None,
                "result": f"{'Phe Đỏ' if side == 'red' else 'Phe Đen'} đầu hàng. Bàn cờ đã được đặt lại.",
                "revision": room.get("revision", 0) + 1,
            })
            room["lastWinner"] = winning_side
            try:
                self._save_rooms()
            except Exception:
                self._rooms[str(room_id)] = previous_room
                raise
            return room

    def rename_room(self, room_id, user_id, name):
        with self._rooms_lock:
            room = self._rooms.get(str(room_id))
            if room is None or room.get("ownerId") != user_id:
                return None
            previous_room = deepcopy(room)
            room["name"] = name
            room["revision"] = room.get("revision", 0) + 1
            try:
                self._save_rooms()
            except Exception:
                self._rooms[str(room_id)] = previous_room
                raise
            return room

async def setup(bot):
    await bot.add_cog(Game(bot))