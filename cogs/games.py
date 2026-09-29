import json
import os
import threading

import discord
from discord.ext import commands


DATA_FOLDER = os.getenv("DATA_FOLDER", "data")
GAME_DATA_FILE = os.path.join(DATA_FOLDER, "games.json")


class Game(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self._rooms_lock = threading.RLock()
        self._rooms = self._load_rooms()

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
        return rooms

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
            return list(reversed(list(self._rooms.values())))

    def create_room(self, room):
        room_id = str(room["id"])
        with self._rooms_lock:
            if room_id in self._rooms:
                return False
            self._rooms[room_id] = room
            try:
                self._save_rooms()
            except Exception:
                del self._rooms[room_id]
                raise
            return True

    def update_room(self, room_id, room):
        key = str(room_id)
        with self._rooms_lock:
            if key not in self._rooms:
                return False
            previous_room = self._rooms[key]
            self._rooms[key] = room
            try:
                self._save_rooms()
            except Exception:
                self._rooms[key] = previous_room
                raise
            return True

async def setup(bot):
    await bot.add_cog(Game(bot))