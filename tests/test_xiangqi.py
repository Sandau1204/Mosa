import unittest
import xiangqi_game as game


def piece(t, side, x, y):
    return dict(type=t, side=side, x=x, y=y)


class XiangqiTests(unittest.TestCase):
    def state(self, *pieces):
        state = game.start()
        state['board'] = list(pieces)
        return state

    def test_initial_position(self):
        state = game.start()
        self.assertEqual(len(state['board']), 32)
        self.assertEqual(len(list(game.legal_moves(state))), 44)
        self.assertFalse(game.in_check(state['board'], 'red'))

    def test_check_only_evasions_and_no_unrelated_piece(self):
        state = self.state(piece('K','red',4,9),piece('K','black',3,0),piece('R','black',4,3),piece('R','red',0,8),piece('P','red',8,6))
        self.assertTrue(game.in_check(state['board'],'red'))
        moves = list(game.legal_moves(state))
        self.assertIn(dict(fromX=0,fromY=8,x=4,y=8),moves)
        self.assertFalse(any(m['fromX']==8 for m in moves))
        for m in moves:
            p=next(p for p in state['board'] if (p['x'],p['y'])==(m['fromX'],m['fromY']))
            self.assertFalse(game.in_check(game.after(state['board'],p,m['x'],m['y']),'red'))
        with self.assertRaises(ValueError):
            game.move(state,state,'red',dict(fromX=8,fromY=6,toX=8,toY=5))

    def test_checkmate_and_stalemate_are_losses(self):
        for checking in (True,False):
            state=self.state(piece('K','red',4,9),piece('K','black',3,0),piece('R','black',3,5),piece('R','black',5,5),piece('R','black',0,8), *([piece('R','black',0,9)] if checking else []))
            self.assertEqual(game.result(state),dict(winner='black',reason='checkmate' if checking else 'stalemate'))
            self.assertEqual(game.snapshot(state,state,False)['legalMoves'],[])

    def test_facing_generals_pin(self):
        state=self.state(piece('K','red',4,9),piece('K','black',4,0),piece('R','red',4,5))
        self.assertFalse(any(m['fromY']==5 and m['x']!=4 for m in game.legal_moves(state)))

    def test_piece_constraints(self):
        cases=[('H',(4,5),(4,4),(5,3)),('E',(4,9),(5,8),(6,7)),('C',(4,5),(4,4),(4,3))]
        for kind, origin, blocker, dest in cases:
            p=piece(kind,'red',*origin)
            board=[p,piece('P','red',*blocker)]
            self.assertNotIn(dest,list(game.pseudo(board,p)))
        p=piece('C','red',4,5)
        self.assertIn((4,3),list(game.pseudo([p,piece('P','red',4,4),piece('R','black',4,3)],p)))
        p=piece('P','red',4,6)
        self.assertEqual(list(game.pseudo([p],p)),[(4,5)])
        p=piece('E','red',4,5)
        self.assertNotIn((2,3),list(game.pseudo([p],p)))

    def test_move_changes_turn_revision_and_board(self):
        state=game.start()
        self.assertIsNone(game.move(state,state,'red',dict(fromX=0,fromY=6,toX=0,toY=5)))
        self.assertEqual(state['turn'],'black')
        self.assertEqual(state['revision'],1)
        with self.assertRaises(ValueError):
            game.move(state,state,'red',dict(fromX=2,fromY=6,toX=2,toY=5))
