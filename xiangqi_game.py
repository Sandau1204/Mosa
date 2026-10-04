"""Authoritative Xiangqi rules and JSON room state (coordinates: black at top)."""
import time


def other(side):
    return 'black' if side == 'red' else 'red'


def start(timed=False):
    board = []
    for side, back, cannon, pawn in [('black', 0, 2, 3), ('red', 9, 7, 6)]:
        board += [dict(x=x, y=back, type=t, side=side) for x, t in enumerate('RHEAKAEHR')]
        board += [dict(x=x, y=cannon, type='C', side=side) for x in (1, 7)]
        board += [dict(x=x, y=pawn, type='P', side=side) for x in range(0, 9, 2)]
    return dict(board=board, turn='red', revision=0, history=[],
                remaining={'red': 900.0, 'black': 900.0}, turnStartedAt=time.time() if timed else None)


def load_board(state):
    return state


def pseudo(board, p):
    occupied = {(q['x'], q['y']): q for q in board}
    x, y, side, kind = p['x'], p['y'], p['side'], p['type']
    def palace(tx, ty):
        return 3 <= tx <= 5 and (7 <= ty <= 9 if side == 'red' else 0 <= ty <= 2)
    for tx in range(9):
        for ty in range(10):
            dx, dy = tx - x, ty - y
            target = occupied.get((tx, ty))
            if (dx == 0 and dy == 0) or (target and target['side'] == side):
                continue
            valid = False
            if kind in ('R', 'C') and (dx == 0 or dy == 0):
                step_x, step_y = (0 if dx == 0 else (1 if dx > 0 else -1)), (0 if dy == 0 else (1 if dy > 0 else -1))
                count = sum((x + step_x * i, y + step_y * i) in occupied for i in range(1, max(abs(dx), abs(dy))))
                valid = count == (1 if kind == 'C' and target else 0)
            elif kind == 'H' and sorted((abs(dx), abs(dy))) == [1, 2]:
                leg = (x + (dx // 2 if abs(dx) == 2 else 0), y + (dy // 2 if abs(dy) == 2 else 0))
                valid = leg not in occupied
            elif kind == 'E':
                valid = abs(dx) == abs(dy) == 2 and (ty >= 5 if side == 'red' else ty <= 4) and (x + dx // 2, y + dy // 2) not in occupied
            elif kind == 'A':
                valid = abs(dx) == abs(dy) == 1 and palace(tx, ty)
            elif kind == 'K':
                valid = abs(dx) + abs(dy) == 1 and palace(tx, ty)
            elif kind == 'P':
                valid = (dx == 0 and dy == (-1 if side == 'red' else 1)) or (dy == 0 and abs(dx) == 1 and (y <= 4 if side == 'red' else y >= 5))
            if valid:
                yield (tx, ty)


def in_check(board, side):
    king = next((p for p in board if p['type'] == 'K' and p['side'] == side), None)
    if king is None:
        return True
    for enemy in board:
        if enemy['side'] == side:
            continue
        if enemy['type'] == 'K' and enemy['x'] == king['x'] and not any(
                p['x'] == king['x'] and min(king['y'], enemy['y']) < p['y'] < max(king['y'], enemy['y']) for p in board):
            return True
        if (king['x'], king['y']) in pseudo(board, enemy):
            return True
    return False


def after(board, p, x, y):
    return [dict(q, x=x, y=y) if q == p else q for q in board if (q['x'], q['y']) != (x, y)]


def legal_moves(state):
    board, side = state['board'], state['turn']
    for p in board:
        if p['side'] != side:
            continue
        for x, y in pseudo(board, p):
            if any(q['x'] == x and q['y'] == y and q['type'] == 'K' for q in board):
                continue
            if not in_check(after(board, p, x, y), side):
                yield dict(fromX=p['x'], fromY=p['y'], x=x, y=y)


def result(state):
    if next(legal_moves(state), None) is None:
        return dict(winner=other(state['turn']), reason='checkmate' if in_check(state['board'], state['turn']) else 'stalemate')
    return None


def clocks(state, running, now=None):
    remaining = dict(state['remaining'])
    if running and state['turnStartedAt'] is not None:
        remaining[state['turn']] = max(0, remaining[state['turn']] - max(0, (time.time() if now is None else now) - state['turnStartedAt']))
    return remaining


def stop_clock(state, board):
    state['remaining'] = clocks(state, True)
    state['turnStartedAt'] = None


def expire(state, board):
    if state['turnStartedAt'] is not None and clocks(state, True)[state['turn']] <= 0:
        stop_clock(state, board)
        state['revision'] += 1
        return dict(winner=other(state['turn']), reason='timeout')
    return None


def move(state, board, side, data):
    if side != state['turn']:
        raise ValueError('Chưa đến lượt của bạn.')
    values = [data.get(k) for k in ('fromX', 'fromY', 'toX', 'toY')]
    if any(type(v) is not int for v in values):
        raise ValueError('Tọa độ không hợp lệ.')
    fx, fy, x, y = values
    if dict(fromX=fx, fromY=fy, x=x, y=y) not in legal_moves(state):
        raise ValueError('Nước đi không hợp lệ hoặc không cứu được tướng.')
    p = next(p for p in state['board'] if (p['x'], p['y']) == (fx, fy))
    now = time.time()
    state['remaining'] = clocks(state, True, now)
    if state['turnStartedAt'] is not None:
        state['remaining'][side] += 5
        state['turnStartedAt'] = now
    state['board'] = after(state['board'], p, x, y)
    state['history'].append(dict(side=side, san=f"{p['type']} ({fx+1},{fy+1}) → ({x+1},{y+1})"))
    state['turn'] = other(side)
    state['revision'] += 1
    return result(state)


def snapshot(state, board, running):
    history = []
    for entry in state['history']:
        if entry['side'] == 'red' or not history:
            history.append(dict(id=len(history) + 1, red='', black='...'))
        history[-1][entry['side']] = entry['san']
    remaining = clocks(state, running)
    return dict(revision=state['revision'], board=state['board'], turn=state['turn'],
                checkSide=state['turn'] if in_check(state['board'], state['turn']) else None,
                legalMoves=list(legal_moves(state)) if running else [], movesLog=history,
                remaining=dict(white=remaining['red'], black=remaining['black']))
