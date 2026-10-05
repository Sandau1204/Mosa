import unittest
from urllib.parse import parse_qs, urlparse
from unittest.mock import Mock, patch

from webserver import app


class GamesAuthTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.config = patch.multiple('webserver', CLIENT_ID='123', CLIENT_SECRET='secret',
                                     REDIRECT_URI='https://mosa.test/callback')
        self.config.start()
        self.addCleanup(self.config.stop)

    def login(self):
        response = self.client.get('/login?next=%2Fgames')
        self.assertEqual(response.status_code, 302)
        query = parse_qs(urlparse(response.location).query)
        self.assertEqual(query['redirect_uri'], ['https://mosa.test/callback'])
        return query['state'][0]

    def test_games_logout_clears_session_and_returns_to_games(self):
        with self.client.session_transaction() as session:
            session['user'] = {'id': '7', 'username': 'Player'}
            session['oauth_state'] = 'old-state'
        response = self.client.get('/logout?next=%2Fgames')
        self.assertEqual(response.location, '/games')
        self.assertEqual(self.client.get('/api/games/auth/session').status_code, 401)
        with self.client.session_transaction() as session:
            self.assertNotIn('oauth_state', session)
        self.assertEqual(self.client.get('/logout').location, '/panel')
        self.assertEqual(self.client.get('/logout?next=https://example.com').location, '/panel')

    def test_web_owner_badge_uses_configured_id_not_session_flag(self):
        with self.client.session_transaction() as session:
            session['user'] = {'id': '7', 'username': 'Player', 'isBotOwner': True}
        for owner_id, expected in [('7', True), ('8', False), ('', False)]:
            with self.subTest(owner_id=owner_id), patch.dict('os.environ', {'OWNER_ID': owner_id}):
                user = self.client.get('/api/games/auth/session').json['user']
                self.assertEqual(user['isBotOwner'], expected)
                self.assertNotIn('OWNER_ID', user)

    def test_web_session_normalizes_missing_hash_and_url_avatars(self):
        for avatar, expected in (
            (None, 'https://cdn.discordapp.com/embed/avatars/0.png'),
            ('avatar_hash', 'https://cdn.discordapp.com/avatars/7/avatar_hash.png?size=256'),
            ('a_animated', 'https://cdn.discordapp.com/avatars/7/a_animated.gif?size=256'),
            ('https://cdn.discordapp.com/avatars/7/existing.png',
             'https://cdn.discordapp.com/avatars/7/existing.png'),
        ):
            with self.subTest(avatar=avatar):
                with self.client.session_transaction() as session:
                    session['user'] = {'id': '7', 'username': 'Player', 'avatar': avatar}
                response = self.client.get('/api/games/auth/session')
                self.assertEqual(response.json['user']['avatar'], expected)
                with self.client.session_transaction() as session:
                    self.assertEqual(session['user']['avatar'], expected)
                self.assertEqual(self.client.get('/api/games/auth/session').json['user']['avatar'], expected)

    @patch('requests.get')
    @patch('requests.post')
    def test_web_login_returns_to_games_with_verified_session(self, post, get):
        state = self.login()
        post.return_value = Mock(ok=True, json=lambda: {'access_token': 'token'})
        get.side_effect = [Mock(ok=True, json=lambda: {'id': '7', 'username': 'Player'}),
                           Mock(ok=True, json=lambda: [])]
        response = self.client.get('/callback', query_string={'code': 'code', 'state': state})
        self.assertEqual(response.location, '/games')
        session = self.client.get('/api/games/auth/session').json
        self.assertTrue(session['authenticated'])
        self.assertEqual(session['user']['id'], '7')
        self.assertNotIn('access_token', session)
        self.assertEqual(self.client.get('/callback', query_string={'code': 'code', 'state': state}).status_code, 400)

    @patch('requests.post')
    def test_invalid_state_never_exchanges_code(self, post):
        self.login()
        response = self.client.get('/callback?code=code&state=wrong')
        self.assertEqual(response.status_code, 400)
        post.assert_not_called()
        self.assertEqual(self.client.get('/api/games/auth/session').status_code, 401)

    def test_denied_login_returns_to_games(self):
        state = self.login()
        response = self.client.get('/callback', query_string={'error': 'access_denied', 'state': state})
        self.assertEqual(response.location, '/games')
        self.assertEqual(self.client.get('/api/games/auth/session').status_code, 401)

    @patch('requests.get')
    @patch('requests.post')
    def test_invalid_discord_profile_does_not_create_session(self, post, get):
        state = self.login()
        post.return_value = Mock(ok=True, json=lambda: {'access_token': 'token'})
        get.return_value = Mock(ok=False, json=lambda: {'message': 'Unauthorized'})
        self.assertEqual(self.client.get('/callback', query_string={'code': 'code', 'state': state}).status_code, 502)
        self.assertEqual(self.client.get('/api/games/auth/session').status_code, 401)

    @patch('requests.get')
    @patch('requests.post')
    def test_activity_exchange_still_works_without_web_oauth_state(self, post, get):
        post.return_value = Mock(ok=True, json=lambda: {'access_token': 'token'})
        get.side_effect = [Mock(ok=True, json=lambda: {'id': '7', 'username': 'Player'}),
                           Mock(ok=True, json=lambda: [])]
        response = self.client.post('/.proxy/api/games/auth/token', json={'code': 'sdk-code'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['user']['id'], '7')
        self.assertTrue(response.json['auth_ticket'])
        self.assertNotIn('redirect_uri', post.call_args.kwargs['data'])

    @patch('requests.get')
    @patch('requests.post')
    def test_activity_owner_badge_uses_verified_discord_id(self, post, get):
        for owner_id, expected in [('7', True), ('8', False), ('', False)]:
            with self.subTest(owner_id=owner_id), patch.dict('os.environ', {'OWNER_ID': owner_id}):
                post.return_value = Mock(ok=True, json=lambda: {'access_token': 'token'})
                get.side_effect = [Mock(ok=True, json=lambda: {'id': '7', 'username': 'Player'}),
                                   Mock(ok=True, json=lambda: [])]
                response = self.client.post('/.proxy/api/games/auth/token', json={'code': 'sdk-code', 'isBotOwner': True})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json['user']['isBotOwner'], expected)
