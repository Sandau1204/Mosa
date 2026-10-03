import threading
import unittest
from unittest.mock import Mock

import discord

from cogs.games import Games
from webserver import app


class GamesLobbyTests(unittest.TestCase):
    def setUp(self):
        self.channel = Mock(spec_set=discord.VoiceChannel)
        self.channel.id = 30
        self.channel.name = 'My voice'
        self.channel.members = []
        self.guilds = []
        for guild_id in (1, 2):
            guild = Mock(spec_set=discord.Guild)
            guild.id = guild_id
            guild.name = f'Server {guild_id}'
            guild.icon = None
            guild.owner_id = 99
            guild.voice_channels = []
            member = Mock(spec_set=discord.Member)
            member.voice = None
            self.guilds.append((guild, member))
        self.guilds[1][0].voice_channels = [self.channel]
        self.guilds[1][1].voice = Mock(spec_set=discord.VoiceState)
        self.guilds[1][1].voice.channel = self.channel
        self.cog = object.__new__(Games)
        self.cog.bot = Mock()
        self.cog.bot.is_ready.return_value = True
        self.cog.bot.latency = 0.02
        self.cog._user = Mock(return_value=({'id': '7'}, None))
        self.cog._accessible_guilds = Mock(return_value=self.guilds)
        self.cog._lock = threading.RLock()
        self.cog._data = {'rooms': {}, 'tournaments': {}, 'leaderboards': {}}

    def lobby(self, query=''):
        with app.test_request_context('/api/games/lobby' + query):
            return app.make_response(self.cog.lobby())

    def test_detects_voice_server_and_channel(self):
        response = self.lobby()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['guild']['id'], '2')
        self.assertEqual(response.json['currentVoiceChannel']['id'], '30')

    def test_activity_guild_takes_priority(self):
        response = self.lobby('?guild_id=1')
        self.assertEqual(response.json['guild']['id'], '1')
        self.assertIsNone(response.json['currentVoiceChannel'])

    def test_dm_detects_voice_server(self):
        response = self.lobby('?context=dm')
        self.assertEqual(response.json['guild']['id'], '2')
        self.assertEqual(response.json['currentVoiceChannel']['id'], '30')

    def test_dm_without_voice_connection(self):
        self.guilds[1][1].voice = None
        response = self.lobby('?context=dm')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['guild']['id'], '1')
        self.assertIsNone(response.json['currentVoiceChannel'])

    def test_missing_cached_member(self):
        self.guilds[:] = [(guild, None) for guild, _ in self.guilds]
        response = self.lobby()
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json['currentVoiceChannel'])

    def test_rejects_inaccessible_guild(self):
        self.assertEqual(self.lobby('?guild_id=999').status_code, 403)


if __name__ == '__main__':
    unittest.main()
