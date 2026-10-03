import copy
import threading
import unittest
from unittest.mock import Mock

from cogs.games import Games
from webserver import app


class BoardSeatsTests(unittest.TestCase):
    def setUp(self):
        self.cog = object.__new__(Games)
        self.cog._lock = threading.RLock()
        self.cog._save_data = Mock()
        self.cog._user = Mock(return_value=({'id': '2'}, None))
        self.cog._get_guild_member = Mock(return_value=(Mock(id=5), Mock(id=2, display_name='B'), None))
        self.cog._avatar = Mock(return_value='avatar')
        self.room = dict(id='room', guild_id='5', game_id='chess', name='Room',
                         host={'id': '1', 'name': 'A'}, players=[{'id': '1', 'name': 'A'}],
                         spectators=[{'id': '2', 'name': 'B'}, {'id': '3', 'name': 'C'}],
                         max_players=2, status='waiting', allow_spectators=True,
                         is_timer_enabled=True, mode='pvp', created_at=0)
        self.cog._data = {'rooms': {'room': self.room}}

    def call(self, action=None, side=None):
        with app.test_request_context('/seats?guild_id=5', method='POST' if action else 'GET',
                                      json={'guild_id': '5', 'action': action, 'side': side} if action else None):
            return app.make_response(self.cog.room_seats('room'))

    def test_spectator_takes_empty_seat_in_both_games(self):
        for game in ('chess', 'xiangqi'):
            with self.subTest(game=game):
                self.setUp()
                self.room['game_id'] = game
                response = self.call('sit', 'black')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json['players'][1]['id'], '2')
                self.assertEqual(response.json['players'][1]['side'], 'black')
                self.assertEqual([p['id'] for p in response.json['spectators']], ['3'])

    def test_occupied_seat_cannot_be_taken(self):
        self.call('sit', 'black')
        before = copy.deepcopy(self.room)
        self.cog._user.return_value = ({'id': '3'}, None)
        self.assertEqual(self.call('sit', 'black').status_code, 409)
        self.assertEqual(self.room, before)

    def test_leave_running_game_resets_ready_and_keeps_host_in_room(self):
        self.call('sit', 'black')
        self.call('ready')
        self.cog._user.return_value = ({'id': '1'}, None)
        self.assertTrue(self.call('ready').json['matchStarted'])
        response = self.call('leave_seat')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json['matchStarted'])
        self.assertEqual(response.json['players'][0]['id'], '2')
        self.assertFalse(response.json['players'][0]['isReady'])
        self.assertIn('1', [p['id'] for p in response.json['spectators']])
        self.assertIn('room', self.cog._data['rooms'])
        self.cog._user.return_value = ({'id': '3'}, None)
        self.assertEqual(self.call('sit', 'red').status_code, 200)

    def test_spectator_cannot_ready_or_leave_someone_elses_seat(self):
        self.assertEqual(self.call('ready').status_code, 409)
        self.assertEqual(self.call('leave_seat').status_code, 409)
        self.assertEqual(self.call('sit', 'invalid').status_code, 400)

    def test_non_member_cannot_read_or_change_seats(self):
        self.cog._user.return_value = ({'id': '9'}, None)
        self.assertEqual(self.call().status_code, 403)
        self.assertEqual(self.call('sit', 'black').status_code, 403)

    def test_player_switches_empty_side_without_duplicate_membership(self):
        self.cog._user.return_value = ({'id': '1'}, None)
        self.assertEqual(self.call('sit', 'black').status_code, 200)
        self.assertEqual(len(self.room['players']), 1)
        self.assertEqual(self.room['players'][0]['side'], 'black')

    def test_join_full_room_as_spectator_then_exit(self):
        self.call('sit', 'black')
        self.room['spectators'] = []
        self.room['status'] = 'in-game'
        self.cog._user.return_value = ({'id': '3'}, None)
        self.cog._get_guild_member.return_value = (Mock(id=5), Mock(id=3, display_name='C'), None)
        with app.test_request_context('/join', method='POST', json={'guild_id': '5'}):
            response = app.make_response(self.cog.join_room('room'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual([p['id'] for p in self.room['spectators']], ['3'])
        with app.test_request_context('/leave', method='POST', json={'guild_id': '5'}):
            self.assertEqual(app.make_response(self.cog.leave_room('room')).status_code, 200)
        self.assertEqual(self.room['spectators'], [])
        self.assertEqual(self.room['status'], 'in-game')

    def test_spectator_setting_and_password_are_enforced(self):
        self.room['spectators'] = []
        self.room['allow_spectators'] = False
        with app.test_request_context('/join', method='POST', json={'guild_id': '5'}):
            self.assertEqual(app.make_response(self.cog.join_room('room')).status_code, 200)
        self.cog._user.return_value = ({'id': '3'}, None)
        self.cog._get_guild_member.return_value = (Mock(id=5), Mock(id=3, display_name='C'), None)
        with app.test_request_context('/join', method='POST', json={'guild_id': '5'}):
            self.assertEqual(app.make_response(self.cog.join_room('room')).status_code, 409)
        self.room['allow_spectators'] = True
        self.room['password_hash'] = 'locked'
        with app.test_request_context('/join', method='POST', json={'guild_id': '5'}):
            self.assertEqual(app.make_response(self.cog.join_room('room')).status_code, 403)

    def test_host_leaving_keeps_spectators_and_transfers_ownership(self):
        self.cog._user.return_value = ({'id': '1'}, None)
        with app.test_request_context('/leave', method='POST', json={'guild_id': '5'}):
            self.assertEqual(app.make_response(self.cog.leave_room('room')).status_code, 200)
        self.assertEqual(self.room['players'], [])
        self.assertEqual(self.room['host']['id'], '2')
        self.assertIn('room', self.cog._data['rooms'])
        for user_id in ('2', '3'):
            self.cog._user.return_value = ({'id': user_id}, None)
            with app.test_request_context('/leave', method='POST', json={'guild_id': '5'}):
                self.assertEqual(app.make_response(self.cog.leave_room('room')).status_code, 200)
            self.assertEqual('room' in self.cog._data['rooms'], user_id == '2')

    def test_host_transfers_to_remaining_player(self):
        self.call('sit', 'black')
        self.cog._user.return_value = ({'id': '1'}, None)
        with app.test_request_context('/leave', method='POST', json={'guild_id': '5'}):
            self.assertEqual(app.make_response(self.cog.leave_room('room')).status_code, 200)
        self.assertEqual(self.room['host']['id'], '2')

    def test_cleanup_removes_empty_room_but_keeps_spectator_only_room(self):
        import time
        self.room.update(players=[], updated_at=time.time())
        self.assertFalse(self.cog._clean_expired_rooms())
        self.room['spectators'] = []
        self.assertTrue(self.cog._clean_expired_rooms())
        self.assertNotIn('room', self.cog._data['rooms'])


if __name__ == '__main__':
    unittest.main()
