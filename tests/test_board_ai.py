import copy
import unittest
from unittest.mock import patch

from cogs.engines import board_ai, chess_game, xiangqi_game
import test_board_seats


class SearchTests(unittest.TestCase):
    def test_all_levels_make_legal_moves_without_mutating_input(self):
        for game, engine in [('chess', chess_game), ('xiangqi', xiangqi_game)]:
            for level in board_ai.LEVELS:
                with self.subTest(game=game, level=level):
                    state = engine.start()
                    original = copy.deepcopy(state)
                    move = board_ai.choose_move(game, state, level)
                    self.assertEqual(state, original)
                    engine.move(state, engine.load_board(state), 'red', move)
                    self.assertEqual(state['revision'], 1)

    def test_medium_and_hard_avoid_poisoned_pawn_in_both_games(self):
        chess = chess_game.start()
        chess['initialFen'] = '3r2k1/8/8/3p4/8/8/8/3Q2K1 w - - 0 1'
        xiangqi = xiangqi_game.start()
        xiangqi['board'] = [dict(x=4, y=9, type='K', side='red'),
                            dict(x=3, y=0, type='K', side='black'),
                            dict(x=0, y=9, type='R', side='red'),
                            dict(x=0, y=0, type='R', side='black'),
                            dict(x=0, y=5, type='P', side='black'),
                            dict(x=4, y=5, type='P', side='red')]
        for game, state, trap in [('chess', chess, (3, 3)), ('xiangqi', xiangqi, (0, 5))]:
            with self.subTest(game=game):
                easy = board_ai.choose_move(game, state, 500)
                if easy is None:
                    self.fail('AI did not choose a move')
                self.assertEqual((easy['toX'], easy['toY']), trap)
                for level in (1200, 2000):
                    move = board_ai.choose_move(game, state, level)
                    if move is None:
                        self.fail(f'AI did not choose a move at level {level}')
                    self.assertNotEqual((move['toX'], move['toY']), trap)


class PveTests(unittest.TestCase):
    setUp = test_board_seats.BoardSeatsTests.setUp
    call = test_board_seats.BoardSeatsTests.call

    def start_pve(self, game='chess'):
        self.room.update(mode='pve', bot_elo=500, game_id=game)
        self.cog._user.return_value = ({'id': '1'}, None)
        return self.call('ready')

    def test_bot_replies_and_rematch_needs_only_human_ready(self):
        for game in ('chess', 'xiangqi'):
            with self.subTest(game=game):
                self.setUp()
                response = self.start_pve(game)
                self.assertTrue(response.json['matchStarted'])
                self.assertTrue(response.json['players'][1]['isBot'])
                move = response.json[game]['legalMoves'][0]
                response = self.call('move', fromX=move['fromX'], fromY=move['fromY'],
                                     toX=move['x'], toY=move['y'], boardRevision=0, matchRevision=1)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json[game]['revision'], 2)
                self.assertEqual(len(self.room[game]['history']), 2)
                self.assertEqual(self.call('resign').status_code, 200)
                self.assertTrue(self.call('ready').json['matchStarted'])

    def test_stale_search_is_discarded_after_reset(self):
        self.start_pve()
        engine = chess_game
        state = self.room['chess']
        engine.move(state, engine.load_board(state), 'red', dict(fromX=4, fromY=6, toX=4, toY=4))
        self.assertEqual(engine.snapshot(state, engine.load_board(state), True)['lastMove'],
                         dict(fromX=4, fromY=6, x=4, y=4))
        def reset(*args):
            self.cog._reset_board_seats(self.room)
            return dict(fromX=4, fromY=1, toX=4, toY=3)
        with patch.object(board_ai, 'choose_move', side_effect=reset):
            response = self.call()
        self.assertFalse(response.json['matchStarted'])
        self.assertNotIn('chess', self.room)

    def test_leaving_last_human_deletes_bot_room(self):
        self.start_pve()
        self.room['spectators'] = []
        from webserver import app
        with app.test_request_context('/leave', method='POST'):
            self.cog.leave_room('room')
        self.assertNotIn('room', self.cog._data['rooms'])

    def test_spectator_cannot_take_bot_seat_or_play(self):
        self.start_pve()
        self.cog._user.return_value = ({'id': '2'}, None)
        self.assertEqual(self.call('sit', 'black').status_code, 409)
        self.assertEqual(self.call('move').status_code, 403)

    def test_bot_draw_offer_does_not_stay_pending(self):
        self.start_pve()
        self.assertEqual(self.call('draw_offer').status_code, 409)
        self.assertIsNone(self.room.get('drawOffer'))

    def test_selected_difficulty_reaches_engine_and_bot_can_start(self):
        for game in ('chess', 'xiangqi'):
            for level in board_ai.LEVELS:
                with self.subTest(game=game, level=level):
                    self.setUp()
                    self.room.update(mode='pve', game_id=game, bot_elo=level)
                    self.room['players'][0]['side'] = 'black'
                    self.cog._user.return_value = ({'id': '1'}, None)
                    engine = chess_game if game == 'chess' else xiangqi_game
                    move = board_ai.choose_move(game, engine.start(), 500)
                    with patch.object(board_ai, 'choose_move', return_value=move) as choose:
                        response = self.call('ready')
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(choose.call_args.args[2], level)
                    self.assertEqual(response.json[game]['turn'], 'black')
                    self.assertEqual(response.json[game]['revision'], 1)

    def test_timeout_during_search_prevents_bot_move(self):
        self.start_pve()
        state = self.room['chess']
        chess_game.move(state, chess_game.load_board(state), 'red', dict(fromX=4, fromY=6, toX=4, toY=4))
        def expire(*args):
            state['remaining']['black'] = 0
            return dict(fromX=4, fromY=1, toX=4, toY=3)
        with patch.object(board_ai, 'choose_move', side_effect=expire):
            response = self.call()
        self.assertEqual(response.json['gameResult'], dict(winner='red', reason='timeout'))
        self.assertEqual(len(state['moves']), 1)
