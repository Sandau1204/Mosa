import discord
import os
import json
from discord import app_commands
from discord.ext import commands

# Đường dẫn lưu trữ dữ liệu Role
ROLE_DATA_FILE = "data/role_settings.json"

class Roles(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.init_data_file()

    def init_data_file(self):
        """Khởi tạo file JSON nếu chưa tồn tại"""
        if not os.path.exists("data"):
            os.makedirs("data")
        if not os.path.exists(ROLE_DATA_FILE):
            with open(ROLE_DATA_FILE, "w", encoding="utf-8") as f:
                json.dump({}, f)

    def load_data(self):
        with open(ROLE_DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_data(self, data):
        with open(ROLE_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
    
    # ==========================================
    # 1. TÍNH NĂNG AUTO-ROLE (CẤP ROLE TỰ ĐỘNG)
    # ==========================================
    @commands.Cog.listener()
    async def on_member_join(self, member):
        """Sự kiện tự động gán role khi có người mới vào server"""
        data = self.load_data()
        guild_id = str(member.guild.id)
        
        if guild_id in data and "auto_role" in data[guild_id]:
            role_id = data[guild_id]["auto_role"]
            role = member.guild.get_role(role_id)
            if role:
                try:
                    await member.add_roles(role, reason="Tự động cấp role cho thành viên mới")
                except discord.Forbidden:
                    print(f"Lỗi: Bot không đủ quyền để cấp role {role.name} trong server {member.guild.name}")

    @app_commands.command(name="set_autorole", description="[Admin] Cài đặt role tự động cho thành viên mới")
    @app_commands.describe(role="Chọn role muốn cấp tự động")
    @app_commands.checks.has_permissions(manage_roles=True)
    async def set_autorole(self, interaction: discord.Interaction, role: discord.Role):
        await interaction.response.defer(ephemeral=True)
        
        data = self.load_data()
        guild_id = str(interaction.guild_id)
        
        if guild_id not in data:
            data[guild_id] = {}
            
        data[guild_id]["auto_role"] = role.id
        self.save_data(data)
        
        await interaction.followup.send(f"✅ Đã thiết lập tự động cấp role {role.mention} cho thành viên mới.")

    # ==========================================
    # 2. TÍNH NĂNG REACTION ROLES (TƯƠNG TÁC ICON NHẬN ROLE)
    # ==========================================
    @app_commands.command(name="create_role_panel", description="[Admin] Tạo một tin nhắn để người dùng tương tác nhận role")
    @app_commands.describe(channel="Kênh sẽ gửi tin nhắn", text="Nội dung tin nhắn (Ví dụ: Nhấn vào icon để nhận role)")
    @app_commands.checks.has_permissions(manage_roles=True)
    async def create_role_panel(self, interaction: discord.Interaction, channel: discord.TextChannel, text: str):
        await interaction.response.defer(ephemeral=True)
        
        # Gửi đúng nội dung văn bản người dùng nhập vào, không thêm thắt định dạng
        msg = await channel.send(content=text)
        
        await interaction.followup.send(
            f"✅ Đã tạo tin nhắn nhận role tại {channel.mention}. ID Tin nhắn: `{msg.id}`\n"
            f"Tiếp theo, hãy dùng lệnh `/add_reaction_role` để gắn icon và role vào tin nhắn này."
        )

    @app_commands.command(name="add_reaction_role", description="[Admin] Thêm icon và role vào tin nhắn Reaction Role")
    @app_commands.describe(message_id="ID của tin nhắn (Tạo từ lệnh create_role_panel)", emoji="Icon (Ví dụ: 🍎)", role="Role sẽ nhận được")
    @app_commands.checks.has_permissions(manage_roles=True)
    async def add_reaction_role(self, interaction: discord.Interaction, message_id: str, emoji: str, role: discord.Role):
        await interaction.response.defer(ephemeral=True)
        
        try:
            channel = interaction.channel
            # Thử tìm tin nhắn trong kênh hiện tại
            msg = await channel.fetch_message(int(message_id))
            
            # Thả reaction vào tin nhắn để người dùng thấy
            await msg.add_reaction(emoji)
            
            # Lưu dữ liệu vào JSON
            data = self.load_data()
            guild_id = str(interaction.guild_id)
            
            if guild_id not in data:
                data[guild_id] = {}
            if "reaction_roles" not in data[guild_id]:
                data[guild_id]["reaction_roles"] = {}
                
            # Cấu trúc: data -> guild_id -> reaction_roles -> message_id -> emoji -> role_id
            if message_id not in data[guild_id]["reaction_roles"]:
                data[guild_id]["reaction_roles"][message_id] = {}
                
            data[guild_id]["reaction_roles"][message_id][emoji] = role.id
            self.save_data(data)
            
            await interaction.followup.send(f"✅ Đã gắn thành công {emoji} với role {role.mention} vào tin nhắn `{message_id}`.")
            
        except discord.NotFound:
            await interaction.followup.send("❌ Không tìm thấy tin nhắn! Hãy chắc chắn bạn đang dùng lệnh này ở cùng kênh chứa tin nhắn bảng role.")
        except discord.HTTPException:
            await interaction.followup.send("❌ Icon (Emoji) không hợp lệ. Vui lòng thử lại với emoji mặc định của Discord.")

    @commands.Cog.listener()
    async def on_raw_reaction_add(self, payload: discord.RawReactionActionEvent):
        """Sự kiện kích hoạt khi ai đó thả icon vào tin nhắn"""
        # Bỏ qua nếu là bot hoặc không xác định được member
        if getattr(payload, "member", None) is None or payload.member.bot: 
            return 
        
        data = self.load_data()
        guild_id = str(payload.guild_id)
        message_id = str(payload.message_id)
        emoji_str = str(payload.emoji)

        # Kiểm tra xem tin nhắn này có phải là bảng Reaction Role không
        if guild_id in data and "reaction_roles" in data[guild_id] and message_id in data[guild_id]["reaction_roles"]:
            
            # Nếu icon người dùng thả đúng là icon cài đặt role
            if emoji_str in data[guild_id]["reaction_roles"][message_id]:
                role_id = data[guild_id]["reaction_roles"][message_id][emoji_str]
                guild = self.bot.get_guild(payload.guild_id)
                role = guild.get_role(role_id)
                
                if role:
                    try:
                        await payload.member.add_roles(role)
                        print(f"✅ Đã cấp role {role.name} cho {payload.member.name}")
                    except discord.Forbidden:
                        print(f"❌ Lỗi Forbidden: Bot không có quyền cấp role {role.name}. Hãy kiểm tra lại Role Hierarchy và quyền Manage Roles!")
                    except Exception as e:
                        print(f"❌ Lỗi không xác định khi cấp role: {e}")
    @commands.Cog.listener()
    async def on_raw_reaction_remove(self, payload: discord.RawReactionActionEvent):
        """Sự kiện kích hoạt khi ai đó gỡ icon khỏi tin nhắn"""
        # Bỏ qua nếu là bot tự gỡ
        if payload.user_id == self.bot.user.id:
            return
            
        data = self.load_data()
        guild_id = str(payload.guild_id)
        message_id = str(payload.message_id)
        emoji_str = str(payload.emoji)

        # Kiểm tra xem tin nhắn này có phải là bảng Reaction Role không
        if guild_id in data and "reaction_roles" in data[guild_id] and message_id in data[guild_id]["reaction_roles"]:
            
            # Nếu icon người dùng gỡ đúng là icon cài đặt role
            if emoji_str in data[guild_id]["reaction_roles"][message_id]:
                role_id = data[guild_id]["reaction_roles"][message_id][emoji_str]
                
                # Lấy object Server (Guild)
                guild = self.bot.get_guild(payload.guild_id)
                if guild is None:
                    return
                    
                role = guild.get_role(role_id)
                
                # Trong sự kiện remove, payload.member thường là None nên phải tìm/fetch member thủ công
                member = guild.get_member(payload.user_id)
                if member is None:
                    try:
                        member = await guild.fetch_member(payload.user_id)
                    except discord.NotFound:
                        return # Bỏ qua nếu người dùng đã rời server
                
                if role and member:
                    try:
                        await member.remove_roles(role)
                        print(f"✅ Đã thu hồi role {role.name} từ {member.name}")
                    except discord.Forbidden:
                        print(f"❌ Lỗi Forbidden: Bot không có quyền thu hồi role {role.name}.")
                    except Exception as e:
                        print(f"❌ Lỗi không xác định khi thu hồi role: {e}")
    # ==========================================
    # 3. CẤP ROLE CHO TẤT CẢ NGƯỜI DÙNG
    # ==========================================
    @app_commands.command(name="give_role_all", description="[Admin] Cấp một role cho tất cả thành viên (Ngoại trừ Bot)")
    @app_commands.describe(role="Chọn role muốn cấp")
    @app_commands.checks.has_permissions(administrator=True)
    async def give_role_all(self, interaction: discord.Interaction, role: discord.Role):
        # Báo cho Discord biết lệnh đang được xử lý (tránh lỗi timeout)
        await interaction.response.defer(ephemeral=False) 
        
        guild = interaction.guild
        
        # Kiểm tra xem bot có quyền cấp role này không (Vị trí role của bot phải cao hơn role muốn cấp)
        if role.position >= guild.me.top_role.position:
            await interaction.followup.send(f"❌ Lỗi: Bot không thể cấp {role.mention} vì role này có vị trí cao hơn hoặc bằng quyền cao nhất của Bot trong Server Settings.")
            return

        success_count = 0
        skip_count = 0
        error_count = 0

        # Duyệt qua tất cả thành viên trong server
        for member in guild.members:
            if member.bot:
                continue # Bỏ qua nếu là bot
            
            if role in member.roles:
                skip_count += 1 # Bỏ qua nếu người này đã có role rồi
                continue
                
            try:
                await member.add_roles(role, reason=f"Lệnh cấp role hàng loạt từ {interaction.user.name}")
                success_count += 1
            except discord.Forbidden:
                error_count += 1
            except Exception as e:
                print(f"Lỗi khi cấp role cho {member.name}: {e}")
                error_count += 1

        # Gửi báo cáo tổng kết
        embed = discord.Embed(title="📊 Tổng kết cấp Role", color=discord.Color.green())
        embed.add_field(name="Role được cấp", value=role.mention, inline=False)
        embed.add_field(name="✅ Thành công", value=f"{success_count} người", inline=True)
        embed.add_field(name="⏭️ Bỏ qua (Đã có sẵn)", value=f"{skip_count} người", inline=True)
        embed.add_field(name="❌ Thất bại (Lỗi quyền)", value=f"{error_count} người", inline=True)

        await interaction.followup.send(embed=embed)

    # Xử lý lỗi quyền hạn
    @set_autorole.error
    @create_role_panel.error
    @add_reaction_role.error
    async def error_handler(self, interaction: discord.Interaction, error):
        if not interaction.response.is_done():
            await interaction.response.defer(ephemeral=True)
        
        if isinstance(error, app_commands.MissingPermissions):
             await interaction.followup.send("🚫 Bạn không có quyền (Quản lý Role) để dùng lệnh này!", ephemeral=True)
        else:
             await interaction.followup.send(f"⚠️ Lỗi: {str(error)}", ephemeral=True)
    
async def setup(bot):
    await bot.add_cog(Roles(bot))
