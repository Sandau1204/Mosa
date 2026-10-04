import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import discord

from cogs.roles import Roles


class ReactionRoleCleanupTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.cog = Roles.__new__(Roles)
        self.cog.bot = Mock()
        self.cog.load_data = Mock(return_value={
            "123": {
                "reaction_roles": {
                    "456": {"✅": 789},
                },
            },
        })
        self.payload = SimpleNamespace(
            guild_id=123,
            channel_id=321,
            message_id=456,
            emoji="❌",
            member=SimpleNamespace(bot=False, name="Member", add_roles=AsyncMock()),
        )

    async def test_unconfigured_reaction_is_removed_from_role_panel(self):
        message = Mock()
        message.clear_reaction = AsyncMock()
        channel = Mock()
        channel.fetch_message = AsyncMock(return_value=message)
        self.cog.bot.get_channel.return_value = channel

        await self.cog.on_raw_reaction_add(self.payload)

        channel.fetch_message.assert_awaited_once_with(456)
        message.clear_reaction.assert_awaited_once_with("❌")
        self.payload.member.add_roles.assert_not_awaited()

    async def test_configured_reaction_still_assigns_role(self):
        self.payload.emoji = "✅"
        member = self.payload.member
        role = SimpleNamespace(name="Verified")
        guild = Mock()
        guild.get_role.return_value = role
        self.cog.bot.get_guild.return_value = guild

        with patch("builtins.print"):
            await self.cog.on_raw_reaction_add(self.payload)

        member.add_roles.assert_awaited_once_with(role)
        self.cog.bot.get_channel.assert_not_called()

    async def test_unconfigured_reaction_cleanup_reports_missing_permission(self):
        self.cog.bot.get_channel.return_value = SimpleNamespace(
            fetch_message=AsyncMock(side_effect=discord.Forbidden(Mock(), "missing permission"))
        )

        with patch("builtins.print") as print_mock:
            await self.cog.on_raw_reaction_add(self.payload)

        print_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main()
