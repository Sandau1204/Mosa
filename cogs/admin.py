import discord
import os # Cần thêm thư viện os để xử lý đường dẫn file
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

    # --- LỆNH MỚI: CẬP NHẬT COOKIES ---
    @app_commands.command(name="cookies", description="[Admin] Cập nhật file cookies.txt cho Bot")
    @app_commands.describe(file="Chọn file cookies.txt từ máy tính để upload")
    @app_commands.checks.has_permissions(administrator=True) # Chỉ Administrator mới được dùng
    async def cookies(self, interaction: discord.Interaction, file: discord.Attachment):
        await interaction.response.defer(ephemeral=True)

        # 1. Kiểm tra định dạng file
        if not file.filename.endswith(".txt"):
            await interaction.followup.send("❌ Vui lòng chỉ upload file có đuôi `.txt` (Ví dụ: `cookies.txt`)")
            return

        # 2. Đường dẫn file gốc (nằm cùng cấp với main.py)
        save_path = "cookies.txt"

        try:
            # 3. Lưu file đè lên file cũ
            await file.save(save_path)
            
            # 4. Thông báo thành công
            print(f"🔄 [System] Cookies updated by {interaction.user.name}")
            await interaction.followup.send(
                f"✅ **Đã cập nhật `cookies.txt` thành công!**\n"
                f"📁 Tên file gốc: `{file.filename}`\n"
                f"ℹ️ Bot sẽ sử dụng cookies mới này cho các lệnh nhạc (yt-dlp) ngay lập tức."
            )
        except Exception as e:
            await interaction.followup.send(f"❌ Có lỗi khi lưu file: {str(e)}")

    # Xử lý lỗi quyền hạn
    @clear.error
    @kick.error
    @ban.error
    @cookies.error
    async def error_handler(self, interaction: discord.Interaction, error):
        if not interaction.response.is_done():
            await interaction.response.defer(ephemeral=True)
        
        if isinstance(error, app_commands.MissingPermissions):
             await interaction.followup.send("🚫 Bạn không có quyền dùng lệnh này!", ephemeral=True)
        else:
             await interaction.followup.send(f"⚠️ Lỗi: {str(error)}", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Admin(bot))