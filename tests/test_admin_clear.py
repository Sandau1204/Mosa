import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import discord

from cogs.admin import Admin


class AdminClearTests(unittest.IsolatedAsyncioTestCase):
    async def test_clear_purges_messages_in_voice_channel_chat(self):
        channel = Mock(spec=discord.VoiceChannel)
        channel.purge = AsyncMock(return_value=[Mock(), Mock()])
        interaction = SimpleNamespace(
            channel=channel,
            response=SimpleNamespace(defer=AsyncMock()),
            followup=SimpleNamespace(send=AsyncMock()),
        )

        await Admin.clear.callback(Admin(Mock()), interaction, "5")

        channel.purge.assert_awaited_once_with(limit=5)
        interaction.followup.send.assert_awaited_once_with("🧹 Đã xóa **2** tin nhắn.")


if __name__ == "__main__":
    unittest.main()
