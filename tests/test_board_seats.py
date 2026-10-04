import copy
import json
import threading
import unittest
from unittest.mock import Mock
from unittest.mock import patch

import chess
import chess_game

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

    def call(self, action=None, side=None, **extra):
        payload = {'guild_id': '5', 'action': action, 'side': side, **extra}
        with app.test_request_context('/seats?guild_id=5', method='POST' if action else 'GET',
                                      json=payload if action else None):
            return app.make_response(self.cog.room_seats('room'))

    def start_match(self):
        self.call('sit', 'black')
        self.cog._user.return_value = ({'id': '1'}, None)
        self.call('ready')
        self.cog._user.return_value = ({'id': '2'}, None)
        return self.call('ready')

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

    def test_draw_offer_can_be_declined_by_opponent(self):
        self.start_match()
        offer = self.call('draw_offer')
        self.assertEqual(offer.status_code, 200)
        self.assertEqual(offer.json['drawOffer']['playerId'], '2')
        self.assertEqual(offer.json['drawOffer']['side'], 'black')

        self.cog._user.return_value = ({'id': '1'}, None)
        self.assertEqual(self.call().json['drawOffer']['playerId'], '2')
        response = self.call('draw_response', accept=False)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json['drawOffer'])
        self.assertIsNone(response.json['gameResult'])
        self.assertTrue(response.json['matchStarted'])

    def test_accepted_draw_is_shared_with_spectators_and_ends_match(self):
        self.start_match()
        self.call('draw_offer')
        self.cog._user.return_value = ({'id': '1'}, None)
        response = self.call('draw_response', accept=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['gameResult'], {'winner': None, 'reason': 'draw'})
        self.assertFalse(response.json['matchStarted'])

        self.cog._user.return_value = ({'id': '3'}, None)
        spectator_response = self.call()
        self.assertEqual(spectator_response.json['gameResult'], response.json['gameResult'])
        self.assertFalse(spectator_response.json['matchStarted'])

    def test_resigning_and_capturing_king_report_the_winner(self):
        for action, user_id, winner, reason in (
            ('resign', '2', 'red', 'resignation'),
            ('finish', '1', 'red', 'capture'),
        ):
            with self.subTest(action=action):
                self.setUp()
                if action == 'finish':
                    self.room['game_id'] = 'xiangqi'
                self.start_match()
                self.cog._user.return_value = ({'id': user_id}, None)
                response = self.call(action)
                if action == 'finish':
                    self.assertEqual(response.status_code, 409)
                    self.assertIsNone(self.call().json['gameResult'])
                    continue
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json['gameResult'], {'winner': winner, 'reason': reason})
                self.assertFalse(response.json['matchStarted'])

    def test_only_opponent_can_answer_pending_draw_offer(self):
        self.start_match()
        self.call('draw_offer')
        self.assertEqual(self.call('draw_offer').status_code, 409)
        self.assertEqual(self.call('draw_response', accept=True).status_code, 409)

        self.cog._user.return_value = ({'id': '3'}, None)
        self.assertEqual(self.call('draw_offer').status_code, 403)

    def test_readying_after_a_result_starts_a_fresh_match(self):
        self.start_match()
        self.call('resign')
        previous_revision = self.room['matchRevision']
        self.cog._user.return_value = ({'id': '1'}, None)
        first_ready = self.call('ready')
        self.assertIsNone(first_ready.json['gameResult'])
        self.assertFalse(first_ready.json['matchStarted'])
        self.assertEqual(first_ready.json['matchRevision'], previous_revision)

        self.cog._user.return_value = ({'id': '2'}, None)
        second_ready = self.call('ready')
        self.assertTrue(second_ready.json['matchStarted'])
        self.assertEqual(second_ready.json['matchRevision'], previous_revision + 1)

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


class ChessMatchTests(unittest.TestCase):
    setUp = BoardSeatsTests.setUp
    call = BoardSeatsTests.call
    start_match = BoardSeatsTests.start_match

    def position(self, fen=chess.STARTING_FEN):
        self.start_match()
        self.room['chess'] = chess_game.start()
        self.room['chess']['initialFen'] = fen

    def move(self, uci, user_id=None, **overrides):
        board = chess_game.load_board(self.room['chess'])
        self.cog._user.return_value = ({'id': user_id or ('1' if board.turn else '2')}, None)
        candidate = chess.Move.from_uci(uci)
        payload = dict(fromX=chess.square_file(candidate.from_square),
                       fromY=7 - chess.square_rank(candidate.from_square),
                       toX=chess.square_file(candidate.to_square),
                       toY=7 - chess.square_rank(candidate.to_square),
                       promotion=chess.piece_symbol(candidate.promotion) if candidate.promotion else None,
                       boardRevision=self.room['chess']['revision'],
                       matchRevision=self.room['matchRevision'])
        payload.update(overrides)
        return self.call('move', **payload)

    def legal_uci(self, response):
        return {chess.square_name(chess.square(m['fromX'], 7 - m['fromY']))
                + chess.square_name(chess.square(m['x'], 7 - m['y'])) + (m['promotion'] or '')
                for m in response.json['chess']['legalMoves']}

    def test_moves_shared_with_opponent_spectator_and_after_reload(self):
        self.position()
        response = self.move('e2e4')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['chess']['turn'], 'black')
        self.assertEqual(response.json['chess']['movesLog'], [{'id': 1, 'red': 'e4', 'black': '...'}])
        self.cog._save_data.assert_called()
        # Reload exactly the JSON that is persisted, including special-move history.
        self.cog._data = json.loads(json.dumps(self.cog._data))
        self.room = self.cog._data['rooms']['room']
        for user_id in ('1', '2', '3'):
            self.cog._user.return_value = ({'id': user_id}, None)
            self.assertEqual(self.call().json['chess'], response.json['chess'])
        self.assertEqual(self.move('e7e5').status_code, 200)
        self.assertEqual(self.call().json['chess']['movesLog'][0]['black'], 'e5')

    def test_wrong_turn_spectator_duplicate_and_stale_match_are_rejected(self):
        self.position()
        for user_id in ('2', '3'):
            before = copy.deepcopy(self.room['chess'])
            self.assertIn(self.move('e2e4', user_id).status_code, (403, 409))
            self.assertEqual(self.room['chess'], before)
        self.assertEqual(self.move('e2e4').status_code, 200)
        for payload in ({'boardRevision': 0}, {'matchRevision': 0}):
            self.assertEqual(self.move('e7e5', **payload).status_code, 409)
        self.assertEqual(self.room['chess']['moves'], ['e2e4'])

    def test_invalid_coordinates_promotions_and_king_capture_are_rejected(self):
        self.position()
        for payload in ({'fromX': True}, {'toY': 8}, {'toX': '4'}, {'promotion': 'k'}, {'promotion': []}):
            self.assertEqual(self.move('e2e4', **payload).status_code, 409)
        self.assertEqual(self.move('e2e5').status_code, 409)
        self.cog._user.return_value = ({'id': '1'}, None)
        self.assertEqual(self.call('finish').status_code, 409)
        self.assertIsNone(self.room.get('gameResult'))

    def test_castling_moves_both_pieces_for_both_colors_and_sides(self):
        for uci, turn, king_square, rook_square in (
            ('e1g1', 'w', 'g1', 'f1'), ('e1c1', 'w', 'c1', 'd1'),
            ('e8g8', 'b', 'g8', 'f8'), ('e8c8', 'b', 'c8', 'd8'),
        ):
            with self.subTest(uci=uci):
                self.setUp()
                self.position(f'r3k2r/8/8/8/8/8/8/R3K2R {turn} KQkq - 0 1')
                response = self.move(uci)
                self.assertEqual(response.status_code, 200)
                board = chess_game.load_board(self.room['chess'])
                self.assertEqual(board.piece_at(chess.parse_square(king_square)).piece_type, chess.KING)
                self.assertEqual(board.piece_at(chess.parse_square(rook_square)).piece_type, chess.ROOK)
                self.assertIsNone(board.piece_at(chess.parse_square(uci[:2])))

    def test_castling_blocked_in_check_through_check_or_without_rights(self):
        for fen in (
            '4kr2/8/8/8/8/8/8/4K2R w K - 0 1',
            'k3r3/8/8/8/8/8/8/4K2R w K - 0 1',
            'k5r1/8/8/8/8/8/8/4K2R w K - 0 1',
            '4k3/8/8/8/8/8/8/4K2R w - - 0 1',
            chess.STARTING_FEN,
        ):
            with self.subTest(fen=fen):
                self.setUp()
                self.position(fen)
                self.assertNotIn('e1g1', self.legal_uci(self.call()))
                self.assertEqual(self.move('e1g1').status_code, 409)

    def test_castling_rights_do_not_return_when_rook_returns(self):
        self.position('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
        for uci in ('h1h2', 'h8h7', 'h2h1', 'h7h8'):
            self.assertEqual(self.move(uci).status_code, 200)
        self.assertNotIn('e1g1', self.legal_uci(self.call()))
        self.assertIn('e1c1', self.legal_uci(self.call()))

    def test_en_passant_removes_passed_pawn_and_survives_json_reload(self):
        self.position()
        for uci in ('e2e4', 'a7a6', 'e4e5', 'd7d5'):
            self.assertEqual(self.move(uci).status_code, 200)
        self.room['chess'] = json.loads(json.dumps(self.room['chess']))
        self.assertIn('e5d6', self.legal_uci(self.call()))
        self.assertEqual(self.move('e5d6').status_code, 200)
        board = chess_game.load_board(self.room['chess'])
        self.assertIsNone(board.piece_at(chess.D5))
        self.assertIsNone(board.piece_at(chess.E5))
        self.assertEqual(board.piece_at(chess.D6), chess.Piece(chess.PAWN, chess.WHITE))

    def test_en_passant_expires_and_cannot_expose_king(self):
        self.position('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1')
        self.assertEqual(self.move('e1f1').status_code, 200)
        self.assertEqual(self.move('e8f8').status_code, 200)
        self.assertNotIn('e5d6', self.legal_uci(self.call()))
        self.assertEqual(self.move('e5d6').status_code, 409)
        self.setUp()
        self.position('k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1')
        self.assertNotIn('e5d6', self.legal_uci(self.call()))
        self.assertEqual(self.move('e5d6').status_code, 409)

    def test_all_promotion_choices_for_both_colors_and_capture(self):
        for fen, prefix in (
            ('7k/P7/8/8/8/8/8/7K w - - 0 1', 'a7a8'),
            ('7k/8/8/8/8/8/p7/7K b - - 0 1', 'a2a1'),
            ('1r5k/P7/8/8/8/8/8/7K w - - 0 1', 'a7b8'),
        ):
            for promotion in ('q', 'r', 'b', 'n'):
                with self.subTest(move=prefix + promotion):
                    self.setUp()
                    self.position(fen)
                    legal = self.legal_uci(self.call())
                    self.assertTrue(all(prefix + p in legal for p in ('q', 'r', 'b', 'n')))
                    self.assertEqual(self.move(prefix).status_code, 409)
                    self.assertEqual(self.move(prefix + promotion).status_code, 200)
                    board = chess_game.load_board(self.room['chess'])
                    self.assertEqual(board.piece_at(chess.parse_square(prefix[2:])).symbol().lower(), promotion)

    def test_check_only_allows_escape_capture_or_block(self):
        self.position('k3r3/8/8/8/8/2B5/8/4K2R w - - 0 1')
        response = self.call()
        self.assertEqual(response.json['chess']['checkSide'], 'white')
        legal = self.legal_uci(response)
        self.assertIn('c3e5', legal)  # Block the checking rook.
        self.assertIn('e1f1', legal)  # Escape with the king.
        self.assertNotIn('h1h2', legal)
        self.assertEqual(self.move('h1h2').status_code, 409)
        for uci in legal:
            board = chess_game.load_board(self.room['chess'])
            board.push_uci(uci)
            self.assertFalse(board.is_attacked_by(chess.BLACK, board.king(chess.WHITE)))
        self.assertEqual(self.move('c3e5').status_code, 200)
        self.setUp()
        self.position('k7/8/8/8/8/8/4r3/4K3 w - - 0 1')
        self.assertIn('e1e2', self.legal_uci(self.call()))

    def test_pin_double_check_and_attacked_king_squares(self):
        for fen, illegal in (
            ('k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1', 'e2f2'),
            ('k3r3/8/8/8/1b6/8/8/4K2R w - - 0 1', 'h1h2'),
            ('k7/8/8/8/8/8/4p3/4K3 w - - 0 1', 'e1f1'),
            ('8/8/8/8/8/4k3/8/4K2R w - - 0 1', 'e1e2'),
        ):
            with self.subTest(fen=fen):
                self.setUp()
                self.position(fen)
                self.assertNotIn(illegal, self.legal_uci(self.call()))
                self.assertEqual(self.move(illegal).status_code, 409)

    def test_checkmate_ends_match_for_everyone_and_rejects_further_moves(self):
        self.position()
        for uci in ('f2f3', 'e7e5', 'g2g4', 'd8h4'):
            response = self.move(uci)
            self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['gameResult'], {'winner': 'black', 'reason': 'checkmate'})
        self.assertFalse(response.json['matchStarted'])
        self.assertEqual(response.json['chess']['legalMoves'], [])
        self.assertEqual(response.json['chess']['movesLog'][-1]['black'], 'Qh4#')
        for user_id in ('1', '2', '3'):
            self.cog._user.return_value = ({'id': user_id}, None)
            self.assertEqual(self.call().json['gameResult'], response.json['gameResult'])
        self.assertEqual(self.move('a2a3').status_code, 409)

    def test_stalemate_is_draw_not_checkmate(self):
        self.position('7k/5K2/8/6Q1/8/8/8/8 w - - 0 1')
        response = self.move('g5g6')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['gameResult'], {'winner': None, 'reason': 'stalemate'})
        self.assertFalse(response.json['matchStarted'])

    def test_rematch_and_seat_change_reset_board(self):
        self.position()
        self.move('e2e4')
        self.call('resign')
        old_revision = self.room['matchRevision']
        self.cog._user.return_value = ({'id': '1'}, None)
        self.call('ready')
        self.cog._user.return_value = ({'id': '2'}, None)
        self.call('ready')
        self.assertEqual(self.room['chess']['moves'], [])
        self.assertEqual(self.room['matchRevision'], old_revision + 1)
        self.assertEqual(self.move('e2e4', matchRevision=old_revision).status_code, 409)
        self.assertEqual(self.move('e2e4').status_code, 200)
        self.call('leave_seat')
        self.assertNotIn('chess', self.room)
        self.assertEqual(len(self.call().json['chess']['board']), 32)

    def test_server_clock_increment_timeout_and_finished_clock_freeze(self):
        with patch('chess_game.time.time', return_value=1000):
            self.start_match()
        with patch('chess_game.time.time', return_value=1010):
            response = self.move('e2e4')
            self.assertEqual(response.json['chess']['remaining']['white'], 895)
        with patch('chess_game.time.time', return_value=1911):
            response = self.call()
            self.assertEqual(response.json['gameResult'], {'winner': 'red', 'reason': 'timeout'})
            self.assertEqual(response.json['chess']['legalMoves'], [])
            self.assertEqual(self.move('e7e5').status_code, 409)
        with patch('chess_game.time.time', return_value=2000):
            self.assertEqual(self.call().json['chess']['remaining'], response.json['chess']['remaining'])


if __name__ == '__main__':
    unittest.main()


class XiangqiRoomTests(unittest.TestCase):
    call = BoardSeatsTests.call
    start_match = BoardSeatsTests.start_match

    def setUp(self):
        BoardSeatsTests.setUp(self)
        self.room['game_id'] = 'xiangqi'

    def test_shared_moves_stale_requests_and_spectators(self):
        self.start_match()
        self.cog._user.return_value = ({'id': '1'}, None)
        data = dict(fromX=0, fromY=6, toX=0, toY=5, boardRevision=0, matchRevision=1)
        response = self.call('move', **data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['xiangqi']['turn'], 'black')
        self.assertEqual(self.call('move', **data).status_code, 409)
        self.cog._user.return_value = ({'id': '3'}, None)
        self.assertEqual(self.call().json['xiangqi']['board'], response.json['xiangqi']['board'])
        self.assertEqual(self.call('move', **data).status_code, 403)

    def test_mating_move_ends_game_for_everyone(self):
        import xiangqi_game
        self.start_match()
        state = self.room['xiangqi'] = xiangqi_game.start()
        state['turn'] = 'black'
        state['board'] = [dict(type=t, side=side, x=x, y=y) for t,side,x,y in [
            ('K','red',4,9), ('K','black',3,0), ('R','black',3,5),
            ('R','black',5,5), ('R','black',0,8), ('R','black',1,7)]]
        response = self.call('move', fromX=1, fromY=7, toX=1, toY=9, boardRevision=0, matchRevision=1)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['gameResult'], dict(winner='black', reason='checkmate'))
        self.assertFalse(response.json['matchStarted'])
        self.assertEqual(response.json['xiangqi']['legalMoves'], [])
        self.cog._user.return_value = ({'id': '1'}, None)
        self.assertEqual(self.call().json['gameResult'], response.json['gameResult'])
        self.assertEqual(self.call('move', fromX=4, fromY=9, toX=4, toY=8, boardRevision=1, matchRevision=1).status_code, 409)
