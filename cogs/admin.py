import discord
import os
from pathlib import Path
from discord import app_commands
from discord.ext import commands

class Admin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
    # 1. Hàm tạo danh sách gợi ý (Autocomplete)
    async def banned_users_autocomplete(
        self,
        interaction: discord.Interaction,
        current: str
    ) -> list[app_commands.Choice[str]]:
        if not interaction.guild:
            return []
        try:
            choices = []
            # Duyệt qua danh sách ban của server (giới hạn 200 để tránh bot bị lag nếu server ban quá nhiều)
            async for ban_entry in interaction.guild.bans(limit=200):
                user = ban_entry.user
                # Tìm kiếm dựa trên tên hoặc ID do admin đang nhập
                if current.lower() in user.name.lower() or current in str(user.id):
                    choices.append(app_commands.Choice(name=f"{user.name} ({user.id})", value=str(user.id)))
                # Discord giới hạn tối đa 25 lựa chọn cho autocomplete
                if len(choices) >= 25:
                    break
            return choices
        except discord.Forbidden:
            return []
    @app_commands.command(name="unban", description="[Admin] Gỡ lệnh cấm cho thành viên")
    @app_commands.describe(user_id="Chọn người dùng từ danh sách bị cấm", reason="Lý do gỡ ban")
    @app_commands.autocomplete(user_id=banned_users_autocomplete) # Gắn hàm gợi ý vào biến user_id
    @app_commands.checks.has_permissions(ban_members=True)
    async def unban(self, interaction: discord.Interaction, user_id: str, reason: str = "Không có lý do"):
        await interaction.response.defer(ephemeral=True)
        if interaction.guild is None:
            await interaction.followup.send("❌ Lệnh này chỉ có thể sử dụng trong server!")
            return
        try:
            # Ép kiểu ID từ chuỗi về số nguyên và dùng discord.Object để unban (nhanh hơn việc fetch_user)
            user_obj = discord.Object(id=int(user_id))
            await interaction.guild.unban(user_obj, reason=reason)
            await interaction.followup.send(f"✅ Đã gỡ lệnh cấm cho <@{user_id}>. Lý do: {reason}")
        except ValueError:
            await interaction.followup.send("❌ ID người dùng không hợp lệ.")
        except discord.NotFound:
            await interaction.followup.send("❌ Người dùng này không nằm trong danh sách bị cấm của server.")
        except discord.Forbidden:
            await interaction.followup.send("❌ Bot không đủ quyền để gỡ lệnh cấm.")
        except discord.HTTPException as e:
            await interaction.followup.send(f"❌ Có lỗi kết nối xảy ra: {str(e)}")
        except Exception as e:
            await interaction.followup.send(f"❌ Có lỗi xảy ra: {str(e)}")
    @app_commands.command(name="clear", description="[Admin] Xóa tin nhắn")
    @app_commands.describe(amount="Nhập số lượng cần xóa hoặc 'all' để xóa hết")
    @app_commands.checks.has_permissions(manage_messages=True)
    async def clear(self, interaction: discord.Interaction, amount: str):
        await interaction.response.defer(ephemeral=True)
        channel = interaction.channel
        # Đảm bảo lệnh chạy trong TextChannel
        if not isinstance(channel, discord.TextChannel):
            await interaction.followup.send("❌ Lệnh chỉ có thể chạy trong kênh văn bản (Text Channel).")
            return
        # Kiểm tra giá trị amount
        limit = None
        if amount.lower() != "all":
            try:
                limit = int(amount)
                if limit < 1:
                    await interaction.followup.send("❌ Số lượng phải lớn hơn 0!")
                    return
            except ValueError:
                await interaction.followup.send("❌ Vui lòng nhập một số hợp lệ hoặc chữ 'all'!")
                return
        # Thực hiện xóa tin nhắn (nếu limit=None, nó sẽ xóa hết)
        try:
            deleted = await channel.purge(limit=limit)
            # Phản hồi tùy theo số lượng
            if amount.lower() == "all":
                await interaction.followup.send(f"🧹 Đã xóa toàn bộ kênh (**{len(deleted)}** tin nhắn).")
            else:
                await interaction.followup.send(f"🧹 Đã xóa **{len(deleted)}** tin nhắn.")
        except discord.Forbidden:
            await interaction.followup.send("❌ Bot không đủ quyền để xóa tin nhắn.")
        except discord.HTTPException as e:
            await interaction.followup.send(f"❌ Có lỗi xảy ra khi xóa tin nhắn: {e}")
    @app_commands.command(name="kick", description="[Admin] Kick thành viên")
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
    @app_commands.command(name="ban", description="[Admin] Cấm thành viên")
    @app_commands.checks.has_permissions(ban_members=True)
    async def ban(self, interaction: discord.Interaction, member: discord.Member, reason: str = "Không có lý do"):
        await interaction.response.defer(ephemeral=True)
        try:
            await member.ban(reason=reason)
            await interaction.followup.send(f"⛔ Đã ban {member.name}. Lý do: {reason}")
        except discord.Forbidden:
            await interaction.followup.send("❌ Bot không đủ quyền.")
    @app_commands.command(name="cookies", description="[Admin] Cập nhật file cookies.txt cho Bot")
    @app_commands.describe(file="Chọn file cookies.txt từ máy tính để upload")
    @app_commands.checks.has_permissions(administrator=True)
    async def cookies(self, interaction: discord.Interaction, file: discord.Attachment):
        await interaction.response.defer(ephemeral=True)
        if not file.filename.endswith(".txt"):
            await interaction.followup.send("❌ Vui lòng chỉ upload file có đuôi `.txt` (Ví dụ: `cookies.txt`)")
            return
        save_path = Path("cookies.txt")
        try:
            # Path provides a PathLike object which satisfies the type
            # requirements of discord.Attachment.save
            await file.save(save_path)
            print(f"🔄 [System] Cookies updated by {interaction.user.name}")
            await interaction.followup.send(
                f"✅ **Đã cập nhật `cookies.txt` thành công!**\n"
                f"📁 Tên file gốc: `{file.filename}`\n"
                f"ℹ️ Bot sẽ sử dụng cookies mới này cho các lệnh nhạc (yt-dlp) ngay lập tức."
            )
        except Exception as e:
            await interaction.followup.send(f"❌ Có lỗi khi lưu file: {str(e)}")
    @app_commands.command(name="msg", description="[Admin] Yêu cầu bot gửi tin nhắn đến một kênh cụ thể")
    @app_commands.describe(channel="Kênh bạn muốn bot gửi tin nhắn vào", message="Nội dung tin nhắn")
    @app_commands.checks.has_permissions(administrator=True)
    async def msg(self, interaction: discord.Interaction, channel: discord.TextChannel, message: str):
        await interaction.response.defer(ephemeral=True)
        try:
            await channel.send(message)
            await interaction.followup.send(f"✅ Đã gửi tin nhắn đến {channel.mention} thành công!")
        except discord.Forbidden:
            await interaction.followup.send(f"❌ Bot không có quyền gửi tin nhắn vào kênh {channel.mention}.")
        except Exception as e:
            await interaction.followup.send(f"❌ Có lỗi xảy ra: {str(e)}")
    # --- LỆNH MỚI: REP TIN NHẮN THAY MẶT ADMIN ---
    @app_commands.command(name="rep", description="[Admin] Yêu cầu bot phản hồi một tin nhắn cụ thể")
    @app_commands.describe(
        channel="Kênh chứa tin nhắn cần phản hồi",
        message_id="ID của tin nhắn cần phản hồi",
        reply_text="Nội dung phản hồi"
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def rep(self, interaction: discord.Interaction, channel: discord.TextChannel, message_id: str, reply_text: str):
        await interaction.response.defer(ephemeral=True)
        try:
            # Lấy tin nhắn dựa trên ID
            target_message = await channel.fetch_message(int(message_id))
            # Cho bot reply tin nhắn đó
            await target_message.reply(reply_text)
            await interaction.followup.send(f"✅ Đã phản hồi tin nhắn thành công trong {channel.mention}!")
        except ValueError:
            await interaction.followup.send("❌ ID tin nhắn không hợp lệ. Vui lòng chỉ nhập các chữ số (ID).")
        except discord.NotFound:
            await interaction.followup.send(f"❌ Không tìm thấy tin nhắn có ID `{message_id}` trong kênh {channel.mention}. Vui lòng kiểm tra lại.")
        except discord.Forbidden:
            await interaction.followup.send("❌ Bot không có quyền đọc lịch sử tin nhắn hoặc gửi tin nhắn vào kênh đó.")
        except discord.HTTPException as e:
            await interaction.followup.send(f"❌ Có lỗi kết nối: {str(e)}")
        except Exception as e:
            await interaction.followup.send(f"❌ Có lỗi xảy ra: {str(e)}")
    # Xử lý lỗi quyền hạn
    @clear.error
    @kick.error
    @ban.error
    @unban.error
    @cookies.error
    @msg.error
    @rep.error # Thêm xử lý lỗi cho lệnh rep
    async def error_handler(self, interaction: discord.Interaction, error):
        if not interaction.response.is_done():
            await interaction.response.defer(ephemeral=True)
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.followup.send("🚫 Bạn không có quyền dùng lệnh này!", ephemeral=True)
        else:
            await interaction.followup.send(f"⚠️ Lỗi: {str(error)}", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Admin(bot))