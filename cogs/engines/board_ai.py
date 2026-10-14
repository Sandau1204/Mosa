"""Bounded iterative-deepening negamax for both board games (not rated Elo)."""
import time
from typing import cast
import chess
from cogs.engines import chess_game, xiangqi_game as xq

LEVELS = {500: (1, 0.2), 1200: (2, 0.8), 2000: (4, 2.5)}
VALUES = {  'p': 100, 'n': 320, 'b': 335, 'r': 500, 'q': 900, 'k': 0,
            'P': 100, 'H': 400, 'E': 200, 'A': 200, 'R': 900, 'C': 450, 'K': 0}
MATE = 100000


def choose_move(game, state, level):
    depth_limit, seconds = LEVELS[level]
    deadline = time.monotonic() + seconds
    western = game == 'chess'
    root = chess_game.load_board(state) if western else {'board': state['board'], 'turn': state['turn']}

    def evaluate(pos):
        score = 0
        pieces = [(chess.square_file(s), chess.square_rank(s), p.symbol().lower(), p.color)
                    for s, p in pos.piece_map().items()] if western else [
                        (p['x'], 9-p['y'], p['type'], p['side']) for p in pos['board']]
        turn = pos.turn if western else pos['turn']
        for x, y, kind, side in pieces:
            forward = y if side in (True, 'red') else (7 if western else 9)-y
            center = (3.5 if western else 4) - abs(x-(3.5 if western else 4))
            bonus = forward * 8 if kind in ('p', 'P') else center * 5 if kind not in ('k', 'K') else 0
            score += (VALUES[kind] + bonus) * (1 if side == turn else -1)
        return score

    def moves(pos):
        if western:
            return sorted(pos.legal_moves, key=lambda m: (
                VALUES.get(pos.piece_at(m.to_square).symbol().lower(), 0) if pos.piece_at(m.to_square) else 0
            ) * 10 + (VALUES[chess.piece_symbol(m.promotion)] if m.promotion else 0), reverse=True)
        occupied = {(p['x'], p['y']): p for p in pos['board']}
        return sorted(xq.legal_moves(pos), key=lambda m: VALUES[occupied[(m['x'], m['y'])]['type']]
                        if (m['x'], m['y']) in occupied else 0, reverse=True)

    def child(pos, move):
        if western:
            new = pos.copy()
            new.push(move)
            return new
        piece = next(p for p in pos['board'] if (p['x'], p['y']) == (move['fromX'], move['fromY']))
        return {'board': xq.after(pos['board'], piece, move['x'], move['y']), 'turn': xq.other(pos['turn'])}

    def search(pos, depth, alpha, beta, ply):
        if time.monotonic() >= deadline:
            raise TimeoutError
        if western:
            outcome = pos.outcome()
            if outcome:
                return 0 if outcome.winner is None else -MATE + ply
        if depth == 0:
            if not western and next(xq.legal_moves(pos), None) is None:
                return -MATE + ply
            return evaluate(pos)
        options = moves(pos)
        if not options:
            return -MATE + ply
        best = -float('inf')
        for candidate in options:
            score = -search(child(pos, candidate), depth-1, -beta, -alpha, ply+1)
            best = max(best, score)
            alpha = max(alpha, score)
            if alpha >= beta:
                break
        return best

    options = moves(root)
    if not options:
        return None
    best = options[0]
    for depth in range(1, depth_limit+1):
        iteration_best, score_best = best, -float('inf')
        try:
            for candidate in options:
                score = -search(child(root, candidate), depth-1, -float('inf'), -score_best, 1)
                if score > score_best:
                    iteration_best, score_best = candidate, score
        except TimeoutError:
            break
        best = iteration_best
        options.remove(best)
        options.insert(0, best)
    if western:
        move = cast(chess.Move, best)
        return dict(fromX=chess.square_file(move.from_square), fromY=7-chess.square_rank(move.from_square),
                    toX=chess.square_file(move.to_square), toY=7-chess.square_rank(move.to_square),
                    promotion=chess.piece_symbol(move.promotion) if move.promotion else None)
    return dict(fromX=best['fromX'], fromY=best['fromY'], toX=best['x'], toY=best['y'])
