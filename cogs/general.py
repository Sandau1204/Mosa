import discord
from discord import app_commands
from discord.ext import commands

class General(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="ping", description="Kiểm tra độ trễ của bot")
    async def ping(self, interaction: discord.Interaction):
        # B1: Defer ngay lập tức
        await interaction.response.defer() 
        
        # B2: Xử lý logic (dù có lag cũng không sao)
        latency = round(self.bot.latency * 1000)
        
        # B3: Dùng followup để trả lời
        await interaction.followup.send(f"🏓 Pong! Độ trễ: **{latency}ms**")

    @app_commands.command(name="hello", description="Bot sẽ chào bạn")
    async def hello(self, interaction: discord.Interaction):
        await interaction.response.defer()
        await interaction.followup.send(f"👋 Xin chào {interaction.user.mention}!")

    @app_commands.command(name="avatar", description="Xem ảnh đại diện")
    @app_commands.describe(member="Chọn thành viên")
    async def avatar(self, interaction: discord.Interaction, member: discord.Member | None = None):
        await interaction.response.defer()
        target = member or interaction.user
        embed = discord.Embed(title=f"Avatar của {target.name}", color=discord.Color.blue())
        if target.avatar:
            embed.set_image(url=target.avatar.url)
        await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(General(bot))