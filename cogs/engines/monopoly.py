"""Server-authoritative rules for the compact Saigon board (amounts in 100k VND)."""
import json
import secrets
from pathlib import Path

BOARD = json.loads((Path(__file__).resolve().parents[2] / 'shared/monopoly-board.json').read_text(encoding='utf-8'))
CELLS = {cell['id']: cell for edge in BOARD.values() for cell in edge}
# Follow adjacent cells clockwise, starting at PHÁT.
TRACK = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 7, 6, 5, 4, 3, 2, 1, 8, 9, 10, 11, 12]


def price(cell):
    return round(float(cell['price'].split()[0].replace(',', '.')) * 10)


def log(state, message):
    state['log'] = (state['log'] + [message])[-60:]


def start(players):
    return {'players': [dict(p, position=13, money=200, bankrupt=False) for p in players],
            'turn': players[0]['id'], 'phase': 'roll', 'dice': [1, 1], 'owners': {},
            'log': ['Trận đấu bắt đầu! Mỗi người nhận 20 TR.'], 'winner': None}


def eliminate(state, player):
    player['bankrupt'] = True
    player['money'] = 0
    state['owners'] = {key: owner for key, owner in state['owners'].items() if owner != player['id']}
    log(state, f"{player['name']} đã phá sản.")


def advance(state):
    alive = [p for p in state['players'] if not p['bankrupt']]
    if len(alive) <= 1:
        state['winner'] = alive[0]['id'] if alive else None
        state['phase'] = 'finished'
        return
    index = next(i for i, p in enumerate(state['players']) if p['id'] == state['turn'])
    for step in range(1, len(state['players']) + 1):
        player = state['players'][(index + step) % len(state['players'])]
        if not player['bankrupt']:
            state['turn'] = player['id']
            state['phase'] = 'roll'
            return


def act(state, user_id, action):
    if state['phase'] == 'finished' or state['turn'] != user_id:
        raise ValueError('Chưa đến lượt của bạn hoặc trận đấu đã kết thúc.')
    player = next(p for p in state['players'] if p['id'] == user_id)
    cell = CELLS[player['position']]
    if action == 'buy' and state['phase'] == 'buy':
        cost = price(cell)
        if player['money'] < cost:
            raise ValueError('Bạn không đủ tiền mua ô đất này.')
        player['money'] -= cost
        state['owners'][str(cell['id'])] = user_id
        log(state, f"{player['name']} mua {cell['name']}.")
        advance(state)
    elif action == 'skip' and state['phase'] == 'buy':
        log(state, f"{player['name']} bỏ qua mua đất.")
        advance(state)
    elif action == 'roll' and state['phase'] == 'roll':
        state['dice'] = [secrets.randbelow(6) + 1 for _ in range(2)]
        index = TRACK.index(player['position']) + sum(state['dice'])
        if index >= len(TRACK):
            player['money'] += 20
            log(state, f"{player['name']} qua PHÁT, nhận 2 TR.")
        player['position'] = TRACK[index % len(TRACK)]
        cell = CELLS[player['position']]
        log(state, f"{player['name']} đổ {sum(state['dice'])}, đến {cell['name']}.")
        owner = state['owners'].get(str(cell['id']))
        if 'price' in cell and not owner:
            state['phase'] = 'buy'
            return
        if owner and owner != user_id:
            rent = price(cell) / 5
            recipient = next(p for p in state['players'] if p['id'] == owner)
            recipient['money'] += min(player['money'], rent)
            player['money'] -= rent
            log(state, f"Trả tiền thuê {rent / 10:g} TR cho {recipient['name']}.")
        elif cell['type'] == 'tax':
            player['money'] -= 15
            log(state, 'Nộp thuế 1,5 TR.')
        elif cell['type'] in ('chance', 'chest'):
            amount = secrets.choice([-10, -5, 5, 10, 20])
            player['money'] += amount
            log(state, f"{cell['name']}: {'nhận' if amount > 0 else 'trả'} {abs(amount) / 10:g} TR.")
        elif cell['id'] == 1:
            player['money'] -= 10
            player['position'] = 19
            log(state, 'Vượt đèn đỏ: nộp phạt 1 TR, đến bót cảnh sát.')
        if player['money'] < 0:
            eliminate(state, player)
        advance(state)
    else:
        raise ValueError('Thao tác không hợp lệ trong lượt hiện tại.')
