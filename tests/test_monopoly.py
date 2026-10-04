import copy
import threading
import unittest
from unittest.mock import Mock, patch

from cogs.engines import monopoly
from cogs.games import Games
from webserver import app


class MonopolyRulesTests(unittest.TestCase):
    def setUp(self):
        self.state = monopoly.start([{'id': '1', 'name': 'A'}, {'id': '2', 'name': 'B'}])

    def test_track_visits_every_cell_once(self):
        self.assertEqual(len(set(monopoly.TRACK)), 24)
        self.assertEqual(set(monopoly.TRACK), set(monopoly.CELLS))

    def test_wrong_turn_cannot_mutate_state(self):
        before = copy.deepcopy(self.state)
        with self.assertRaises(ValueError):
            monopoly.act(self.state, '2', 'roll')
        self.assertEqual(before, self.state)

    @patch('cogs.engines.monopoly.secrets.randbelow', side_effect=[0, 1])
    def test_buy_and_advance(self, _):
        monopoly.act(self.state, '1', 'roll')
        self.assertEqual(self.state['players'][0]['position'], 16)
        self.assertEqual(self.state['phase'], 'buy')
        monopoly.act(self.state, '1', 'buy')
        self.assertEqual(self.state['owners']['16'], '1')
        self.assertEqual(self.state['players'][0]['money'], 188)
        self.assertEqual(self.state['turn'], '2')

    @patch('cogs.engines.monopoly.secrets.randbelow', side_effect=[0, 1])
    def test_rent_bankruptcy_and_winner(self, _):
        self.state['owners']['16'] = '2'
        self.state['players'][0]['money'] = 1
        monopoly.act(self.state, '1', 'roll')
        self.assertTrue(self.state['players'][0]['bankrupt'])
        self.assertEqual(self.state['players'][1]['money'], 201)
        self.assertEqual(self.state['winner'], '2')

    @patch('cogs.engines.monopoly.secrets.randbelow', side_effect=[0, 0])
    def test_pass_start_uses_visual_track(self, _):
        self.state['players'][0]['position'] = 12
        monopoly.act(self.state, '1', 'roll')
        self.assertEqual(self.state['players'][0]['position'], 14)
        self.assertEqual(self.state['players'][0]['money'], 220)

    def test_cannot_buy_twice_or_without_money(self):
        self.state['players'][0].update(position=12, money=1)
        self.state['phase'] = 'buy'
        with self.assertRaises(ValueError):
            monopoly.act(self.state, '1', 'buy')
        monopoly.act(self.state, '1', 'skip')
        with self.assertRaises(ValueError):
            monopoly.act(self.state, '1', 'buy')


class MonopolyApiTests(unittest.TestCase):
    def setUp(self):
        self.cog = object.__new__(Games)
        self.cog._lock = threading.RLock()
        self.cog._save_data = Mock()
        self.cog._user = Mock(return_value=({'id': '1'}, None))
        self.cog._get_guild_member = Mock(return_value=(Mock(id=5), Mock(), None))
        self.room = {'guild_id': '5', 'game_id': 'monopoly', 'host': {'id': '1'},
                     'players': [{'id': '1', 'name': 'A'}, {'id': '2', 'name': 'B'}]}
        self.cog._data = {'rooms': {'room': self.room}}

    def call(self, data=None):
        with app.test_request_context('/api/games/rooms/room/monopoly?guild_id=5', method='POST' if data else 'GET', json=data):
            return app.make_response(self.cog.monopoly_room('room'))

    def test_only_host_can_start(self):
        self.cog._user.return_value = ({'id': '2'}, None)
        self.assertEqual(self.call({'guild_id': '5', 'action': 'start'}).status_code, 409)
        self.assertNotIn('monopoly', self.room)

    def test_non_member_cannot_read(self):
        self.cog._user.return_value = ({'id': '9'}, None)
        self.assertEqual(self.call().status_code, 403)

    def test_start_requires_two_players(self):
        self.room['players'].pop()
        self.assertEqual(self.call({'guild_id': '5', 'action': 'start'}).status_code, 409)

    def test_reject_stale_action_and_restart(self):
        self.assertEqual(self.call({'guild_id': '5', 'action': 'start'}).status_code, 200)
        self.assertEqual(self.room['status'], 'in-game')
        before = copy.deepcopy(self.room['monopoly'])
        self.assertEqual(self.call({'guild_id': '5', 'action': 'roll', 'revision': 0}).status_code, 409)
        self.assertEqual(self.call({'guild_id': '5', 'action': 'start'}).status_code, 409)
        self.assertEqual(before, self.room['monopoly'])

    def test_spectator_takes_seat_and_host_leaves_without_closing_room(self):
        self.room['spectators'] = [{'id': '3', 'name': 'C'}]
        self.cog._user.return_value = ({'id': '3'}, None)
        self.assertEqual(self.call().json['spectators'][0]['id'], '3')
        self.assertEqual(self.call({'action': 'join_seat'}).status_code, 200)
        self.assertEqual(len(self.room['players']), 3)
        self.assertEqual(self.room['spectators'], [])
        self.assertEqual(self.call({'action': 'join_seat'}).status_code, 409)
        self.cog._user.return_value = ({'id': '1'}, None)
        self.assertEqual(self.call({'action': 'leave_seat'}).status_code, 200)
        self.assertEqual(self.room['host']['id'], '1')
        self.assertIn(self.room, self.cog._data['rooms'].values())
        self.assertEqual(self.room['spectators'][0]['id'], '1')

    def test_full_table_rejects_spectator(self):
        self.room['max_players'] = 2
        self.room['spectators'] = [{'id': '3', 'name': 'C'}]
        self.cog._user.return_value = ({'id': '3'}, None)
        self.assertEqual(self.call({'action': 'join_seat'}).status_code, 409)
        self.assertEqual(len(self.room['players']), 2)
        self.assertEqual(len(self.room['spectators']), 1)

    def test_leave_finishes_game_and_new_seat_plays_next_round(self):
        self.call({'action': 'start'})
        self.room['spectators'] = [{'id': '3', 'name': 'C'}]
        self.cog._user.return_value = ({'id': '3'}, None)
        self.call({'action': 'join_seat'})
        self.assertEqual(len(self.room['monopoly']['players']), 2)
        self.cog._user.return_value = ({'id': '1'}, None)
        self.call({'action': 'leave_seat'})
        self.assertEqual(self.room['monopoly']['winner'], '2')
        self.assertEqual(self.call({'action': 'roll', 'revision': 2}).status_code, 403)
        self.assertEqual(self.call({'action': 'start'}).status_code, 200)
        self.assertEqual([p['id'] for p in self.room['monopoly']['players']], ['2', '3'])

    def test_spectator_can_enter_full_running_room_and_exit(self):
        self.room.update(id='room', name='Room', max_players=2, status='waiting',
                         is_timer_enabled=False, allow_spectators=True, mode='pvp', created_at=0)
        self.room['host']['name'] = 'A'
        self.call({'action': 'start'})
        self.cog._user.return_value = ({'id': '3'}, None)
        member = Mock(id=3, display_name='C')
        self.cog._get_guild_member.return_value = (Mock(id=5), member, None)
        self.cog._avatar = Mock(return_value='avatar')
        with app.test_request_context('/join', method='POST', json={'guild_id': '5'}):
            response = app.make_response(self.cog.join_room('room'))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['room']['isJoined'])
        before = copy.deepcopy(self.room['monopoly'])
        with app.test_request_context('/leave', method='POST', json={'guild_id': '5'}):
            response = app.make_response(self.cog.leave_room('room'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(before, self.room['monopoly'])
        self.assertEqual(self.room['spectators'], [])


if __name__ == '__main__':
    unittest.main()
