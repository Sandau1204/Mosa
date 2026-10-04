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
        self.cog._global_presence = {}
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

    def test_global_tournament_requires_bot_owner_and_is_separate_from_server(self):
        self.cog._get_guild_member = Mock(side_effect=AssertionError('Global needs no guild'))
        self.cog._data['tournaments']['2'] = {'title': 'Server Cup'}
        payload = {'guild_id': 'global', 'title': 'Global Cup', 'game_id': 'chess', 'isBotOwner': True}
        for owner_id in ('8', ''):
            with patch.dict('os.environ', {'OWNER_ID': owner_id}):
                self.assertEqual(self.room_request('create_tournament', payload=payload).status_code, 403)
        with patch.dict('os.environ', {'OWNER_ID': '7'}):
            self.assertEqual(self.room_request('create_tournament', payload=payload).status_code, 201)
            self.assertEqual(self.lobby('?context=global').json['tournament']['title'], 'Global Cup')
            self.assertEqual(self.lobby('?guild_id=2').json['tournament']['title'], 'Server Cup')
            global_lobby = self.lobby('?context=global').json
            self.assertEqual(global_lobby['globalTournament']['title'], 'Global Cup')
            self.assertIsNone(global_lobby['serverTournament'])
            server_lobby = self.lobby('?guild_id=2').json
            self.assertEqual(server_lobby['globalTournament']['title'], 'Global Cup')
            self.assertEqual(server_lobby['serverTournament']['title'], 'Server Cup')
            other_server = self.lobby('?guild_id=1').json
            self.assertEqual(other_server['globalTournament']['title'], 'Global Cup')
            self.assertIsNone(other_server['serverTournament'])
            self.cog._accessible_guilds.return_value = []
            self.assertEqual(self.lobby('?context=global').json['tournament']['title'], 'Global Cup')
            self.assertIsNone(self.lobby('?context=global').json['serverTournament'])
        with patch.dict('os.environ', {'OWNER_ID': '8'}):
            self.assertEqual(self.room_request('delete_tournament', 'global').status_code, 403)
        with patch.dict('os.environ', {'OWNER_ID': '7'}):
            self.assertEqual(self.room_request('delete_tournament', 'global').status_code, 200)
            self.assertNotIn('global', self.cog._data['tournaments'])
            self.assertIn('2', self.cog._data['tournaments'])

    def test_admin_badge_matches_management_permissions(self):
        member = self.guilds[1][1]
        for permissions, expected in ((discord.Permissions.none(), False),
                                      (discord.Permissions(manage_guild=True), True),
                                      (discord.Permissions(administrator=True), True),
                                      (discord.Permissions(manage_messages=True), False)):
            member.guild_permissions = permissions
            self.assertEqual(self.lobby().json['guild']['isAdmin'], expected)

    def test_tournament_creation_checks_actual_guild_permissions(self):
        guild, member = self.guilds[0]
        self.cog._get_guild_member = Mock(return_value=(guild, member, None))
        for user_id, permissions, expected in (
            (7, discord.Permissions(manage_guild=True), 201),
            (7, discord.Permissions(administrator=True), 201),
            (7, discord.Permissions.none(), 403),
            (7, discord.Permissions(manage_messages=True), 403),
            (99, discord.Permissions.none(), 201),
        ):
            member.id = user_id
            member.guild_permissions = permissions
            with self.subTest(user_id=user_id, permissions=permissions.value):
                response = self.room_request('create_tournament', payload={
                    'guild_id': '1', 'title': 'Cup', 'game_id': 'chess', 'isAdmin': True,
                })
                self.assertEqual(response.status_code, expected)

    def test_global_members_include_web_dm_and_other_servers_once(self):
        with patch('cogs.games.time.monotonic', return_value=100):
            self.lobby('?guild_id=1')
            self.cog._user.return_value = ({'id': '8', 'username': 'Other server'}, None)
            self.lobby('?guild_id=2')
            self.cog._accessible_guilds.return_value = []
            self.cog._user.return_value = ({'id': '9', 'username': 'DM user'}, None)
            self.lobby('?context=dm')
            self.cog._user.return_value = ({'id': '10', 'username': 'Web user'}, None)
            response = self.lobby()
            members = response.json['members']
            self.assertEqual({m['id'] for m in members}, {'7', '8', '9', '10'})
            self.assertTrue(all(m['status'] == 'ready' for m in members))
            self.assertEqual(response.json['voiceMembers'], [])
            self.cog._user.return_value = ({'id': '7', 'username': 'Another tab'}, None)
            self.assertEqual(len(self.lobby().json['members']), 4)

        with patch('cogs.games.time.monotonic', return_value=161):
            members = self.lobby().json['members']
            self.assertEqual([m['id'] for m in members], ['7'])

    def test_global_members_show_room_membership_without_exposing_server_details(self):
        self.create_global_room()
        response = self.lobby()
        member = response.json['members'][0]
        self.assertEqual(member['id'], '7')
        self.assertEqual(member['status'], 'in-game')
        self.assertNotIn('seen_at', member)
        self.assertNotIn('channel', member)
        self.assertNotIn('guild_id', member)
        self.assertEqual(response.json['guild']['id'], '2')

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

    def test_unknown_guild_does_not_block_global_lobby(self):
        self.assertEqual(self.lobby('?guild_id=999').status_code, 200)

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

    def room_request(self, method, room_id=None, payload=None, http_method='POST'):
        with app.test_request_context('/rooms', method=http_method, json=payload):
            result = getattr(self.cog, method)(room_id) if room_id else getattr(self.cog, method)()
            return app.make_response(result)

    def create_global_room(self, game='chess', **extra):
        return self.room_request('create_room', payload={'game_id': game, 'name': 'Global', **extra})

    def test_global_rooms_visible_without_common_guild_and_across_servers(self):
        created = self.create_global_room()
        self.assertEqual(created.status_code, 201)
        room_id = created.json['room']['id']
        self.cog._data['rooms'][room_id]['guild_id'] = '999'  # Existing server room.
        for guilds in (self.guilds, []):
            self.cog._accessible_guilds.return_value = guilds
            for query in ('', '?context=dm', '?guild_id=1'):
                self.assertEqual([r['id'] for r in self.lobby(query).json['rooms']], [room_id])

    def test_room_lifecycle_without_guild_membership(self):
        self.cog._get_guild_member = Mock(side_effect=AssertionError('No guild lookup allowed'))
        for game in ('chess', 'xiangqi', 'monopoly'):
            room_id = self.create_global_room(game).json['room']['id']
            self.cog._user.return_value = ({'id': '8', 'username': 'Visitor'}, None)
            joined = self.room_request('join_room', room_id, {})
            self.assertEqual(joined.status_code, 200)
            endpoint = 'monopoly_room' if game == 'monopoly' else 'room_seats'
            self.assertEqual(self.room_request(endpoint, room_id, http_method='GET').status_code, 200)
            self.assertEqual(self.room_request('leave_room', room_id, {}).status_code, 200)
            self.assertEqual(self.room_request(endpoint, room_id, http_method='GET').status_code, 403)
            self.cog._user.return_value = ({'id': '7'}, None)

    def test_global_locked_room_still_requires_password(self):
        room_id = self.create_global_room(is_locked=True, password='secret').json['room']['id']
        self.cog._user.return_value = ({'id': '8'}, None)
        self.assertEqual(self.room_request('join_room', room_id, {}).status_code, 403)
        self.assertEqual(self.room_request('join_room', room_id, {'password': 'secret'}).status_code, 200)
        self.assertNotIn('password_hash', self.lobby().json['rooms'][0])

    def test_dm_reconnect_cancels_close_for_existing_server_room(self):
        room_id = self.create_global_room().json['room']['id']
        self.cog._data['rooms'][room_id]['guild_id'] = '999'
        self.cog._closed_activity[('999', '7')] = 0
        self.cog._accessible_guilds.return_value = []
        self.assertTrue(self.lobby('?context=dm').json['rooms'][0]['isJoined'])
        self.assertEqual(self.cog._closed_activity, {})

    def test_offline_bot_does_not_block_rooms(self):
        self.create_global_room()
        self.cog.bot.is_ready.return_value = False
        self.cog.bot.latency = float('nan')
        response = self.lobby()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json['rooms']), 1)
        self.assertIsNone(response.json['ping'])


if __name__ == '__main__':
    unittest.main()
