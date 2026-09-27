import discord
from discord.ext import commands

class GameHub(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    # Các lệnh (commands) hoặc sự kiện (events) của bạn sẽ nằm ở đây
    # ...

# BẮT BUỘC: Hàm setup ở cuối file để bot có thể load extension này
async def setup(bot):
    await bot.add_cog(GameHub(bot))