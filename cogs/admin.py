import discord
from discord import app_commands
from discord.ext import commands

class Admin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="clear", description="Xóa tin nhắn")
    @app_commands.describe(amount="Số lượng cần xóa")
    @app_commands.checks.has_permissions(manage_messages=True)
    async def clear(self, interaction: discord.Interaction, amount: int):
        # Defer ẩn (chỉ mình người dùng thấy đang xử lý)
        await interaction.response.defer(ephemeral=True) 
        
        if amount < 1:
            await interaction.followup.send("Số lượng phải lớn hơn 0!")
            return
        
        deleted = await interaction.channel.purge(limit=amount)
        await interaction.followup.send(f"🧹 Đã xóa **{len(deleted)}** tin nhắn.")

    @app_commands.command(name="kick", description="Kick thành viên")
    @app_commands.checks.has_permissions(kick_members=True)
    async def kick(self, interaction: discord.Interaction, member: discord.Member, reason: str = "Không có lý do"):
        await interaction.response.defer(ephemeral=True)
        
        if member.id == interaction.user.id:
            await interaction.followup.send("Không thể kick chính mình!")
            return

        try:
            await member.kick(reason=reason)
            await interaction.followup.send(f"🔨 Đã kick {member.mention}. Lý do: {reason}")
        except discord.Forbidden:
            await interaction.followup.send("❌ Bot không đủ quyền (Role thấp hơn).")

    @app_commands.command(name="ban", description="Cấm thành viên")
    @app_commands.checks.has_permissions(ban_members=True)
    async def ban(self, interaction: discord.Interaction, member: discord.Member, reason: str = "Không có lý do"):
        await interaction.response.defer(ephemeral=True)
        try:
            await member.ban(reason=reason)
            await interaction.followup.send(f"⛔ Đã ban {member.name}. Lý do: {reason}")
        except discord.Forbidden:
             await interaction.followup.send("❌ Bot không đủ quyền.")

    # Xử lý lỗi quyền hạn
    @clear.error
    @kick.error
    @ban.error
    async def error_handler(self, interaction: discord.Interaction, error):
        if not interaction.response.is_done():
            await interaction.response.defer(ephemeral=True)
        await interaction.followup.send("🚫 Bạn không có quyền dùng lệnh này!")

async def setup(bot):
    await bot.add_cog(Admin(bot))