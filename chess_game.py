"""Server-authoritative chess state; only JSON data is persisted in rooms."""

import time

import chess


def start(timed=False):
    return {
        'initialFen': chess.STARTING_FEN,
        'moves': [],
        'history': [],
        'revision': 0,
        'remaining': {'white': 900.0, 'black': 900.0},
        'turnStartedAt': time.time() if timed else None,
    }


def load_board(state):
    board = chess.Board(state['initialFen'])
    for uci in state['moves']:
        board.push_uci(uci)
    return board


def color_name(color):
    return 'white' if color == chess.WHITE else 'black'


def seat_name(color):
    return 'red' if color == chess.WHITE else 'black'


def result(board):
    outcome = board.outcome()
    if outcome is None:
        return None
    return {
        'winner': None if outcome.winner is None else seat_name(outcome.winner),
        'reason': outcome.termination.name.lower(),
    }


def clocks(state, board, running, now=None):
    remaining = dict(state['remaining'])
    if running and state['turnStartedAt'] is not None:
        side = color_name(board.turn)
        elapsed = max(0, (time.time() if now is None else now) - state['turnStartedAt'])
        remaining[side] = max(0, remaining[side] - elapsed)
    return remaining


def stop_clock(state, board):
    state['remaining'] = clocks(state, board, True)
    state['turnStartedAt'] = None


def expire(state, board):
    if state['turnStartedAt'] is None or clocks(state, board, True)[color_name(board.turn)] > 0:
        return None
    stop_clock(state, board)
    state['revision'] += 1
    winner = not board.turn
    return {'winner': None if board.has_insufficient_material(winner) else seat_name(winner),
            'reason': 'timeout'}


def move(state, board, side, data):
    if side != seat_name(board.turn):
        raise ValueError('Chưa đến lượt của bạn.')
    coords = [data.get(key) for key in ('fromX', 'fromY', 'toX', 'toY')]
    if any(type(value) is not int or not 0 <= value < 8 for value in coords):
        raise ValueError('Tọa độ nước đi không hợp lệ.')
    promotion = data.get('promotion')
    if promotion is not None and promotion not in ('q', 'r', 'b', 'n'):
        raise ValueError('Quân phong cấp không hợp lệ.')
    from_x, from_y, to_x, to_y = coords
    candidate = chess.Move(chess.square(from_x, 7 - from_y), chess.square(to_x, 7 - to_y),
                           promotion=chess.PIECE_SYMBOLS.index(promotion) if promotion else None)
    if candidate not in board.legal_moves:
        raise ValueError('Nước đi không hợp lệ hoặc không cứu được vua.')
    notation = board.san(candidate)
    moving_color = color_name(board.turn)
    now = time.time()
    state['remaining'] = clocks(state, board, True, now)
    if state['turnStartedAt'] is not None:
        state['remaining'][moving_color] += 5
        state['turnStartedAt'] = now
    board.push(candidate)
    state['moves'].append(candidate.uci())
    state['history'].append({'side': side, 'san': notation})
    state['revision'] += 1
    return result(board)


def snapshot(state, board, running):
    history = []
    for entry in state['history']:
        if entry['side'] == 'red' or not history:
            history.append({'id': len(history) + 1, 'red': '', 'black': '...'})
        history[-1][entry['side']] = entry['san']
    return {
        'revision': state['revision'],
        'board': [{'x': chess.square_file(square), 'y': 7 - chess.square_rank(square),
                   'type': piece.symbol().lower(), 'side': color_name(piece.color)}
                  for square, piece in board.piece_map().items()],
        'turn': color_name(board.turn),
        'checkSide': color_name(board.turn) if board.is_check() else None,
        'legalMoves': [{'fromX': chess.square_file(move.from_square),
                        'fromY': 7 - chess.square_rank(move.from_square),
                        'x': chess.square_file(move.to_square),
                        'y': 7 - chess.square_rank(move.to_square),
                        'promotion': chess.piece_symbol(move.promotion) if move.promotion else None}
                       for move in board.legal_moves] if running else [],
        'movesLog': history,
        'remaining': clocks(state, board, running),
    }
