import tempfile
import threading
import unittest
from unittest.mock import patch

import webserver
from cogs.games import Game


class GameHubIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.storage = patch('cogs.games.GAME_DATA_FILE', self.directory.name + '/games.json')
        self.storage.start()
        self.addCleanup(self.storage.stop)
        self.game = Game.__new__(Game)
        self.game._rooms_lock = threading.RLock()
        self.game._rooms = {}
        self.game._room_messages = {}
        self.game._last_seen = {}
        bot = type('Bot', (), {'get_cog': lambda _, name: self.game})()
        self.bot = patch.object(webserver, 'bot_instance', bot)
        self.bot.start()
        self.addCleanup(self.bot.stop)
        webserver.app.config['TESTING'] = True
        self.client = webserver.app.test_client()

    def login(self, user='1'):
        with self.client.session_transaction() as session:
            session['user'] = {'id': user, 'username': 'Player ' + user}

    def create(self, **options):
        return self.client.post('/api/games/rooms', json={
            'id': 123, 'name': 'Test room', 'type': 'xiangqi', **options
        })

    def action(self, action, **data):
        return self.client.post('/api/games/rooms/123/' + action,
                                json={'userId': '1', **data})

    def test_authentication_and_server_owned_identity(self):
        self.assertEqual(self.create().status_code, 401)
        self.login()
        room = self.create(ownerId='attacker', redPlayer={'id': 'attacker'}).get_json()
        self.assertEqual(room['ownerId'], '1')
        self.assertEqual(room['redPlayer']['id'], '1')
        self.assertEqual(self.action('ready', userId='2', ready=True).status_code, 403)
        self.assertEqual(self.client.put('/api/games/rooms/123', json=room).status_code, 405)

    def test_pve_ready_move_and_chat(self):
        self.login()
        response = self.create(botElo=800)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.get_json()['blackReady'])
        self.assertEqual(self.action('ready', ready=True).get_json()['status'], 'playing')
        moved = self.action('move', fromX=0, fromY=6, toX=0, toY=5)
        self.assertEqual(moved.status_code, 200)
        self.assertEqual(moved.get_json()['clock']['activeSide'], 'black')
        self.assertEqual(self.action('bot-move').status_code, 200)
        self.assertEqual(self.action('chat', content='Hello').status_code, 201)
        self.assertEqual(self.client.get('/api/games/rooms/123/chat').status_code, 200)
        self.assertTrue(self.action('presence').get_json()['active'])

    def test_pvp_join_and_seat(self):
        self.login()
        self.assertEqual(self.create().status_code, 201)
        self.login('2')
        joined = self.action('join', userId='2', user={'id': '2', 'name': 'Fake'})
        self.assertEqual(joined.status_code, 200)
        self.assertEqual(joined.get_json()['observers'][0]['name'], 'Player 2')
        seated = self.action('join', userId='2', side='black')
        self.assertEqual(seated.get_json()['blackPlayer']['id'], '2')
        self.assertEqual(self.action('leave', userId='2').status_code, 200)

    def test_validation_and_duplicate_room(self):
        self.login()
        self.assertEqual(self.create(type='chess').status_code, 400)
        self.assertEqual(self.create(botElo=500).status_code, 400)
        self.assertEqual(self.create(name='x' * 61).status_code, 400)
        self.assertEqual(self.create().status_code, 201)
        self.assertEqual(self.create().status_code, 409)


if __name__ == '__main__':
    unittest.main()
