import unittest
from unittest.mock import MagicMock, patch

from webserver import app


class GamesAvatarTests(unittest.TestCase):
    @patch('requests.get')
    def test_proxy_returns_avatar_bytes_on_web_and_activity(self, get):
        upstream = MagicMock(status_code=200, headers={'Content-Type': 'image/png'})
        upstream.iter_content.return_value = [b'avatar-image']
        get.return_value.__enter__.return_value = upstream
        for prefix in ('', '/.proxy'):
            response = app.test_client().get(f'{prefix}/api/games/avatars/avatars/123/abcdef.png')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data, b'avatar-image')
            self.assertEqual(response.content_type, 'image/png')
            self.assertIn('max-age=', response.headers['Cache-Control'])
        self.assertEqual(get.call_args.args[0], 'https://cdn.discordapp.com/avatars/123/abcdef.png')

    @patch('requests.get')
    def test_proxy_rejects_arbitrary_paths_without_network(self, get):
        response = app.test_client().get('/api/games/avatars/https://example.com/test.png')
        self.assertEqual(response.status_code, 400)
        get.assert_not_called()

    @patch('requests.get')
    def test_proxy_reports_upstream_failure(self, get):
        get.return_value.__enter__.return_value = MagicMock(status_code=404)
        response = app.test_client().get('/api/games/avatars/avatars/123/abcdef.png')
        self.assertEqual(response.status_code, 502)
