import json
import os
import threading
import time
from copy import deepcopy
from typing import Any

import discord
from discord.ext import commands


DATA_FOLDER = os.getenv("DATA_FOLDER", "data")
GAME_DATA_FILE = os.path.join(DATA_FOLDER, "games.json")
INITIAL_CLOCK_MS = 20 * 60 * 1000
MOVE_INCREMENT_MS = 5 * 1000
PRESENCE_TIMEOUT_SECONDS = 20


def initial_board():
    pieces = []
    back_rank = ["R", "H", "E", "A", "K", "A", "E", "H", "R"]
    for x, piece_type in enumerate(back_rank):
        pieces.append({"x": x, "y": 0, "type": piece_type, "side": "black"})
        pieces.append({"x": x, "y": 9, "type": piece_type, "side": "red"})
    for x in (1, 7):
        pieces.append({"x": x, "y": 2, "type": "C", "side": "black"})
        pieces.append({"x": x, "y": 7, "type": "C", "side": "red"})
    for x in (0, 2, 4, 6, 8):
        pieces.append({"x": x, "y": 3, "type": "P", "side": "black"})
        pieces.append({"x": x, "y": 6, "type": "P", "side": "red"})
    return pieces


class Game(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self._rooms_lock = threading.RLock()
        self._rooms: dict[str, dict[str, Any]] = self._load_rooms()
        now = time.time()
        self._last_seen: dict[tuple[str, str], float] = {
            (room_id, str(user_id)): now
            for room_id, room in self._rooms.items()
            for user_id in self._participant_ids(room)
        }

    @staticmethod
    def _participant_ids(room: dict[str, Any]) -> list[str]:
        players = [room.get("redPlayer"), room.get("blackPlayer")]
        observers = room.get("observers", [])
        return [
            person["id"]
            for person in [*players, *observers]
            if isinstance(person, dict) and isinstance(person.get("id"), str)
        ]

    @staticmethod
    def _piece_at(board: list[dict[str, Any]], x: int, y: int) -> dict[str, Any] | None:
        return next((piece for piece in board if piece["x"] == x and piece["y"] == y), None)

    @staticmethod
    def _inside_board(x: int, y: int) -> bool:
        return 0 <= x < 9 and 0 <= y < 10

    @staticmethod
    def _inside_palace(side: str, x: int, y: int) -> bool:
        return 3 <= x <= 5 and (7 <= y <= 9 if side == "red" else 0 <= y <= 2)

    def _pseudo_moves(
        self,
        board: list[dict[str, Any]],
        piece: dict[str, Any],
    ) -> list[dict[str, int]]:
        x, y, side, piece_type = piece["x"], piece["y"], piece["side"], piece["type"]
        moves = []

        def add(target_x, target_y):
            if not self._inside_board(target_x, target_y):
                return False
            target = self._piece_at(board, target_x, target_y)
            if target and target["side"] == side:
                return False
            moves.append({"x": target_x, "y": target_y})
            return target is not None

        if piece_type in ("R", "C"):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                target_x, target_y = x + dx, y + dy
                screen_seen = False
                while self._inside_board(target_x, target_y):
                    target = self._piece_at(board, target_x, target_y)
                    if piece_type == "R":
                        if target:
                            if target["side"] != side:
                                moves.append({"x": target_x, "y": target_y})
                            break
                        moves.append({"x": target_x, "y": target_y})
                    elif target:
                        if screen_seen:
                            if target["side"] != side:
                                moves.append({"x": target_x, "y": target_y})
                            break
                        screen_seen = True
                    elif not screen_seen:
                        moves.append({"x": target_x, "y": target_y})
                    target_x += dx
                    target_y += dy
        elif piece_type == "H":
            for dx, dy, leg_x, leg_y in (
                (1, 2, 0, 1), (-1, 2, 0, 1), (1, -2, 0, -1), (-1, -2, 0, -1),
                (2, 1, 1, 0), (2, -1, 1, 0), (-2, 1, -1, 0), (-2, -1, -1, 0),
            ):
                if self._piece_at(board, x + leg_x, y + leg_y) is None:
                    add(x + dx, y + dy)
        elif piece_type == "E":
            for dx, dy in ((2, 2), (2, -2), (-2, 2), (-2, -2)):
                target_x, target_y = x + dx, y + dy
                eye_x, eye_y = x + dx // 2, y + dy // 2
                on_own_side = target_y >= 5 if side == "red" else target_y <= 4
                if on_own_side and self._inside_board(target_x, target_y) and self._piece_at(board, eye_x, eye_y) is None:
                    add(target_x, target_y)
        elif piece_type == "A":
            for dx, dy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
                target_x, target_y = x + dx, y + dy
                if self._inside_palace(side, target_x, target_y):
                    add(target_x, target_y)
        elif piece_type == "K":
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                target_x, target_y = x + dx, y + dy
                if self._inside_palace(side, target_x, target_y):
                    add(target_x, target_y)
            for dy in (-1, 1):
                target_y = y + dy
                while 0 <= target_y < 10:
                    target = self._piece_at(board, x, target_y)
                    if target:
                        if target["type"] == "K" and target["side"] != side:
                            moves.append({"x": x, "y": target_y})
                        break
                    target_y += dy
        elif piece_type == "P":
            forward = -1 if side == "red" else 1
            add(x, y + forward)
            crossed_river = y <= 4 if side == "red" else y >= 5
            if crossed_river:
                add(x - 1, y)
                add(x + 1, y)
        return moves

    def _is_in_check(self, board: list[dict[str, Any]], side: str) -> bool:
        king = next(
            (piece for piece in board if piece["type"] == "K" and piece["side"] == side),
            None,
        )
        if king is None:
            return True
        for piece in board:
            if piece["side"] != side and any(
                move["x"] == king["x"] and move["y"] == king["y"]
                for move in self._pseudo_moves(board, piece)
            ):
                return True
        return False

    def _legal_moves(
        self,
        board: list[dict[str, Any]],
        piece: dict[str, Any],
    ) -> list[dict[str, int]]:
        legal_moves = []
        for move in self._pseudo_moves(board, piece):
            destination = self._piece_at(board, move["x"], move["y"])
            if destination and destination["type"] == "K":
                continue
            simulated = [
                candidate
                for candidate in board
                if not (
                    candidate["x"] == piece["x"] and candidate["y"] == piece["y"]
                )
                and not (candidate["x"] == move["x"] and candidate["y"] == move["y"])
            ]
            simulated.append({**piece, "x": move["x"], "y": move["y"]})
            if not self._is_in_check(simulated, piece["side"]):
                legal_moves.append(move)
        return legal_moves

    def _all_legal_moves(
        self,
        board: list[dict[str, Any]],
        side: str,
    ) -> list[tuple[dict[str, Any], dict[str, int]]]:
        return [
            (piece, move)
            for piece in board
            if piece["side"] == side
            for move in self._legal_moves(board, piece)
        ]

    def _selectable_pieces(
        self,
        board: list[dict[str, Any]],
        side: str,
    ) -> list[dict[str, int]]:
        return [
            {"x": piece["x"], "y": piece["y"]}
            for piece in board
            if piece["side"] == side and self._legal_moves(board, piece)
        ]

    def _room_state(self, room: dict[str, Any]) -> dict[str, Any]:
        state = deepcopy(room)
        clock = state.get("clock")
        board = state.get("board")
        active_side = clock.get("activeSide") if isinstance(clock, dict) else None
        if (
            state.get("status") == "playing"
            and isinstance(board, list)
            and isinstance(active_side, str)
        ):
            state["selectablePieces"] = self._selectable_pieces(board, active_side)
        else:
            state["selectablePieces"] = []
        return state

    def _load_rooms(self) -> dict[str, dict[str, Any]]:
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
        for room in active_rooms.values():
            room.setdefault("board", initial_board())
            room.setdefault("checkSide", None)
        if active_rooms != rooms:
            self._rooms = active_rooms
            self._save_rooms()
        return active_rooms

    def _save_rooms(self) -> None:
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

    def get_rooms(self) -> list[dict[str, Any]]:
        with self._rooms_lock:
            now = int(time.time() * 1000)
            now_seconds = now / 1000
            changed = False
            previous_rooms = deepcopy(self._rooms)
            previous_last_seen = dict(self._last_seen)
            for room_id, room in list(self._rooms.items()):
                previous_participants = self._participant_ids(room)
                stale_ids = {
                    user_id
                    for user_id in previous_participants
                    if now_seconds - self._last_seen.get((room_id, user_id), 0) > PRESENCE_TIMEOUT_SECONDS
                }
                if stale_ids:
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
                        self._rooms.pop(room_id, None)
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
            return [self._room_state(room) for room in reversed(list(self._rooms.values()))]

    def heartbeat(self, room_id: int, user_id: str) -> bool:
        with self._rooms_lock:
            room_key = str(room_id)
            room = self._rooms.get(room_key)
            if room is None or user_id not in {
                str(participant_id) for participant_id in self._participant_ids(room)
            }:
                return False
            self._last_seen[(room_key, user_id)] = time.time()
            return True

    def create_room(self, room: dict[str, Any]) -> bool:
        room_id = str(room["id"])
        with self._rooms_lock:
            if room_id in self._rooms:
                return False
            room = deepcopy(room)
            room.setdefault("revision", 0)
            room["status"] = "waiting"
            room["redReady"] = False
            room["blackReady"] = False
            room["board"] = initial_board()
            room["checkSide"] = None
            room["clock"] = None
            room["selectablePieces"] = []
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

    def update_room(self, room_id: int, room: dict[str, Any]) -> bool | str | None:
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
            if seats_changed and previous_room.get("status") == "playing":
                return None
            for field in (
                "ownerId",
                "name",
                "status",
                "clock",
                "board",
                "checkSide",
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

    def set_ready(self, room_id: int, user_id: str, ready: bool) -> dict[str, Any] | None:
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
                    "board": initial_board(),
                    "checkSide": None,
                    "selectablePieces": [],
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
                room["selectablePieces"] = self._selectable_pieces(room["board"], "red")
            room["revision"] = room.get("revision", 0) + 1
            try:
                self._save_rooms()
            except Exception:
                self._rooms[str(room_id)] = previous_room
                raise
            return self._room_state(room)

    def get_piece_moves(
        self,
        room_id: int,
        user_id: str,
        x: int,
        y: int,
    ) -> dict[str, Any] | None:
        with self._rooms_lock:
            room = self._rooms.get(str(room_id))
            if room is None or room.get("status") != "playing":
                return None
            clock = room.get("clock")
            board = room.get("board")
            if not isinstance(clock, dict) or not isinstance(board, list):
                return None
            side = clock.get("activeSide")
            player = room.get(f"{side}Player") if side in ("red", "black") else None
            if not player or player.get("id") != user_id:
                return None
            piece = self._piece_at(board, x, y)
            if not piece or piece["side"] != side:
                return None
            return {
                "moves": self._legal_moves(board, piece),
                "checkSide": room.get("checkSide"),
            }

    def move_piece(
        self,
        room_id: int,
        user_id: str,
        from_x: int,
        from_y: int,
        to_x: int,
        to_y: int,
    ) -> dict[str, Any] | None:
        with self._rooms_lock:
            room = self._rooms.get(str(room_id))
            if room is None or room.get("status") != "playing":
                return None
            clock = room.get("clock")
            board = room.get("board")
            if not isinstance(clock, dict) or not isinstance(board, list):
                return None
            active_side = clock.get("activeSide")
            player = room.get(f"{active_side}Player") if active_side in ("red", "black") else None
            if not player or player.get("id") != user_id:
                return None
            piece = self._piece_at(board, from_x, from_y)
            if not piece or piece["side"] != active_side:
                return None
            if not any(
                move["x"] == to_x and move["y"] == to_y
                for move in self._legal_moves(board, piece)
            ):
                return None

            now = int(time.time() * 1000)
            remaining_key = f"{active_side}Ms"
            started_at = clock.get("turnStartedAt")
            if not isinstance(started_at, int):
                return None
            remaining = clock[remaining_key] - max(0, now - started_at)
            previous_room = deepcopy(room)
            if remaining <= 0:
                clock[remaining_key] = 0
                clock["turnStartedAt"] = None
                room["status"] = "finished"
                room["winner"] = "black" if active_side == "red" else "red"
                room["result"] = f"Hết giờ: Phe {'Đen' if active_side == 'red' else 'Đỏ'} thắng."
            else:
                next_side = "black" if active_side == "red" else "red"
                updated_board = [
                    candidate
                    for candidate in board
                    if not (
                        (candidate["x"] == from_x and candidate["y"] == from_y)
                        or (candidate["x"] == to_x and candidate["y"] == to_y)
                    )
                ]
                updated_board.append({**piece, "x": to_x, "y": to_y})
                clock[remaining_key] = remaining + clock["incrementMs"]
                clock["activeSide"] = next_side
                clock["turnStartedAt"] = now
                room["board"] = updated_board
                in_check = self._is_in_check(updated_board, next_side)
                room["checkSide"] = next_side if in_check else None
                opponent_moves = self._all_legal_moves(updated_board, next_side)
                room["selectablePieces"] = self._selectable_pieces(updated_board, next_side)
                if not opponent_moves:
                    room["status"] = "finished"
                    room["winner"] = active_side
                    room["clock"]["turnStartedAt"] = None
                    room["selectablePieces"] = []
                    room["result"] = (
                        f"Chiếu bí! Phe {'Đỏ' if active_side == 'red' else 'Đen'} thắng."
                        if in_check
                        else f"Hết nước đi! Phe {'Đỏ' if active_side == 'red' else 'Đen'} thắng."
                    )

            room["revision"] = room.get("revision", 0) + 1
            try:
                self._save_rooms()
            except Exception:
                self._rooms[str(room_id)] = previous_room
                raise
            return self._room_state(room)

    def surrender(self, room_id: int, user_id: str) -> dict[str, Any] | None:
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
                "board": initial_board(),
                "checkSide": None,
                "selectablePieces": [],
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
            return self._room_state(room)

    def rename_room(self, room_id: int, user_id: str, name: str) -> dict[str, Any] | None:
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
            return self._room_state(room)

async def setup(bot):
    await bot.add_cog(Game(bot))