import threading
import unittest
from unittest.mock import Mock, patch

import discord

from cogs.games import Games
from webserver import app


class GamesLobbyTests(unittest.TestCase):
    def setUp(self):
        self.channel = Mock(spec_set=discord.VoiceChannel)
        self.channel.id = 30
        self.channel.name = 'My voice'
        self.channel.members = []
        self.guilds = []
        for guild_id in (1, 2):
            guild = Mock(spec_set=discord.Guild)
            guild.id = guild_id
            guild.name = f'Server {guild_id}'
            guild.icon = None
            guild.owner_id = 99
            guild.voice_channels = []
            member = Mock(spec_set=discord.Member)
            member.voice = None
            self.guilds.append((guild, member))
        self.guilds[1][0].voice_channels = [self.channel]
        self.guilds[1][1].voice = Mock(spec_set=discord.VoiceState)
        self.guilds[1][1].voice.channel = self.channel
        self.cog = object.__new__(Games)
        self.cog.bot = Mock()
        self.cog.bot.is_ready.return_value = True
        self.cog.bot.latency = 0.02
        self.cog._user = Mock(return_value=({'id': '7'}, None))
        self.cog._accessible_guilds = Mock(return_value=self.guilds)
        self.cog._lock = threading.RLock()
        self.cog._activity_presence = {}
        self.cog._closed_activity = {}
        self.cog._save_data = Mock()
        self.cog._data = {'rooms': {}, 'tournaments': {}, 'leaderboards': {}}

    def lobby(self, query=''):
        with app.test_request_context('/api/games/lobby' + query):
            return app.make_response(self.cog.lobby())

    def test_detects_voice_server_and_channel(self):
        response = self.lobby()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['guild']['id'], '2')
        self.assertEqual(response.json['currentVoiceChannel']['id'], '30')

    def test_activity_guild_takes_priority(self):
        response = self.lobby('?guild_id=1')
        self.assertEqual(response.json['guild']['id'], '1')
        self.assertIsNone(response.json['currentVoiceChannel'])

    def test_dm_detects_voice_server(self):
        response = self.lobby('?context=dm')
        self.assertEqual(response.json['guild']['id'], '2')
        self.assertEqual(response.json['currentVoiceChannel']['id'], '30')

    def test_dm_without_voice_connection(self):
        self.guilds[1][1].voice = None
        response = self.lobby('?context=dm')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['guild']['id'], '1')
        self.assertIsNone(response.json['currentVoiceChannel'])

    def test_missing_cached_member(self):
        self.guilds[:] = [(guild, None) for guild, _ in self.guilds]
        response = self.lobby()
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json['currentVoiceChannel'])

    def test_rejects_inaccessible_guild(self):
        self.assertEqual(self.lobby('?guild_id=999').status_code, 403)

    def test_voice_member_activity_status(self):
        for user_id in (7, 8, 9, 10, 11):
            member = Mock(spec_set=discord.Member)
            member.id = user_id
            member.display_name = str(user_id)
            member.display_avatar = Mock(url='https://example.com/avatar.png')
            member.top_role = Mock()
            member.top_role.name = 'Member'
            member.voice = Mock(channel=self.channel)
            self.channel.members.append(member)
        self.cog._activity_presence = {( '2', '8'): 100, ('1', '11'): 100}
        self.cog._data['rooms']['room'] = {
            'guild_id': '2', 'status': 'waiting',
            'game_id': 'chess', 'host': {'id': '9'},
            'players': [{'id': '9'}], 'spectators': [{'id': '10'}],
        }
        self.cog._clean_expired_rooms = Mock(return_value=False)
        self.cog._public_room = Mock(return_value={})
        with patch('cogs.games.time.monotonic', return_value=100):
            statuses = {m['id']: m['status'] for m in self.lobby().json['voiceMembers']}
        self.assertEqual(statuses, {
            '7': 'ready', '8': 'ready', '9': 'in-game',
            '10': 'in-game', '11': 'not-joined',
        })
        with patch('cogs.games.time.monotonic', return_value=161):
            statuses = {m['id']: m['status'] for m in self.lobby().json['voiceMembers']}
        self.assertEqual(statuses['8'], 'not-joined')
        self.assertEqual(statuses['7'], 'ready')
        self.cog._data['rooms'].clear()
        self.assertEqual(self.lobby().json['voiceMembers'][2]['status'], 'not-joined')

    def test_closed_activity_host_leaves_and_transfers_ownership(self):
        room = {
            'guild_id': '2', 'game_id': 'chess', 'status': 'waiting',
            'host': {'id': '7'},
            'players': [{'id': '7', 'isReady': True}, {'id': '8', 'isReady': True}],
            'spectators': [],
        }
        self.cog._data['rooms']['room'] = room
        self.cog._activity_presence = {('2', '7'): 0, ('2', '8'): 90}
        self.cog._closed_activity = {('2', '7'): 0}
        with patch('cogs.games.time.monotonic', return_value=100):
            self.assertTrue(self.cog._remove_inactive_room_members())
        self.assertEqual(room['host']['id'], '8')
        self.assertEqual(room['players'], [{'id': '8', 'isReady': False}])
        self.cog._closed_activity[('2', '8')] = 100
        with patch('cogs.games.time.monotonic', return_value=151):
            self.assertTrue(self.cog._remove_inactive_room_members())
        self.assertEqual(self.cog._data['rooms'], {})

    def test_closed_activity_removes_players_during_match(self):
        for game in ('chess', 'xiangqi', 'monopoly'):
            with self.subTest(game=game):
                room = {
                    'guild_id': '2', 'game_id': game, 'status': 'in-game',
                    'host': {'id': '7'}, 'players': [{'id': '7'}, {'id': '8'}],
                    'spectators': [{'id': '9'}],
                }
                if game == 'monopoly':
                    room['monopoly'] = {'phase': 'roll'}
                self.cog._data['rooms'] = {'room': room}
                self.cog._activity_presence = {('2', str(uid)): 0 for uid in (7, 8, 9)}
                self.cog._closed_activity = {('2', str(uid)): 0 for uid in (7, 8, 9)}
                with patch('cogs.games.time.monotonic', return_value=100):
                    self.assertTrue(self.cog._remove_inactive_room_members())
                    self.assertEqual(room['players'], [])
                    self.assertEqual(room['spectators'], [])
                    self.assertFalse(self.cog._remove_inactive_room_members())
                self.assertEqual(self.cog._data['rooms'], {})

    def test_closed_player_updates_running_game_for_remaining_player(self):
        from cogs.engines import monopoly

        for game in ('chess', 'xiangqi', 'monopoly', 'uno'):
            with self.subTest(game=game):
                room = {
                    'guild_id': '2', 'game_id': game, 'status': 'in-game',
                    'host': {'id': '7'},
                    'players': [{'id': '7', 'name': 'A', 'isReady': True},
                                {'id': '8', 'name': 'B', 'isReady': True}],
                }
                if game == 'monopoly':
                    room['monopoly'] = monopoly.start(room['players'])
                    room['monopoly']['revision'] = 0
                self.cog._data['rooms'] = {'room': room}
                self.cog._closed_activity = {('2', '7'): 0}
                with patch('cogs.games.time.monotonic', return_value=100):
                    self.assertTrue(self.cog._remove_inactive_room_members())
                self.assertEqual([p['id'] for p in room['players']], ['8'])
                self.assertEqual(room['host']['id'], '8')
                if game == 'monopoly':
                    self.assertTrue(room['monopoly']['players'][0]['bankrupt'])
                    self.assertEqual(room['monopoly']['phase'], 'finished')
                else:
                    self.assertEqual(room['status'], 'waiting')
                    if game in ('chess', 'xiangqi'):
                        self.assertFalse(room['players'][0]['isReady'])

    def test_missing_heartbeat_never_removes_waiting_player(self):
        self.cog._data['rooms']['room'] = {
            'guild_id': '2', 'game_id': 'chess', 'status': 'waiting',
            'host': {'id': '7'}, 'players': [{'id': '7'}],
        }
        with patch('cogs.games.time.monotonic', return_value=100):
            self.assertFalse(self.cog._remove_inactive_room_members())
        self.cog._activity_presence[('2', '7')] = 150
        with patch('cogs.games.time.monotonic', return_value=161):
            self.assertFalse(self.cog._remove_inactive_room_members())
        with patch('cogs.games.time.monotonic', return_value=10000):
            self.assertFalse(self.cog._remove_inactive_room_members())
        self.assertEqual(len(self.cog._data['rooms']['room']['players']), 1)

    def test_close_activity_only_marks_authenticated_member(self):
        self.cog._data['rooms']['room'] = {
            'guild_id': '2', 'players': [{'id': '7'}, {'id': '8'}],
        }
        with app.test_request_context('/close', method='POST', json={'user_id': '8'}):
            response = self.cog.close_activity('room')
        self.assertTrue(response.json['success'])
        self.assertEqual(set(self.cog._closed_activity), {('2', '7')})

    def test_reconnect_cancels_pending_close(self):
        self.cog._closed_activity[('2', '7')] = 0
        self.lobby()
        self.assertNotIn(('2', '7'), self.cog._closed_activity)


if __name__ == '__main__':
    unittest.main()
