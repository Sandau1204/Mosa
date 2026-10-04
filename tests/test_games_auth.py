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
