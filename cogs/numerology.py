import discord
import os
import json
import re
from discord import app_commands
from discord.ext import commands

NUMEROLOGY_FILE = "data/numerologyRulingNumber.json"
NUMEROLOGY_CONFIG_FILE = "data/numerology_config.json"
IMAGE_DIR = "data/images"

class Numerology(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.data = self.load_data()
        self.config = self.load_config()

    def load_data(self):
        if not os.path.exists(NUMEROLOGY_FILE): return {}
        try:
            with open(NUMEROLOGY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except: return {}

    def load_config(self):
        if not os.path.exists(NUMEROLOGY_CONFIG_FILE): return {}
        try:
            with open(NUMEROLOGY_CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except: return {}

    def save_config(self):
        with open(NUMEROLOGY_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(self.config, f, indent=4)

    async def check_channel(self, interaction: discord.Interaction) -> bool:
        guild_id = str(interaction.guild_id)
        if guild_id in self.config:
            allowed_channel_id = self.config[guild_id]
            if interaction.channel_id != allowed_channel_id:
                await interaction.response.send_message(f"🚫 Lệnh Thần số học chỉ được sử dụng trong kênh <#{allowed_channel_id}>.", ephemeral=True)
                return False
        return True

    def calculate_ruling_number(self, dob_string: str) -> str:
        digits = re.sub(r'\D', '', dob_string)
        if not digits: return ""
        total = sum(int(d) for d in digits)
        while total > 11 and total not in [22, 33]:
            total = sum(int(d) for d in str(total))
        return str(total)

    @app_commands.command(name="thanso_setup", description="[Admin] Cài đặt kênh duy nhất nhận lệnh Thần số học")
    @app_commands.describe(channel="Chọn kênh để cho phép dùng lệnh")
    @app_commands.checks.has_permissions(administrator=True)
    async def thanso_setup(self, interaction: discord.Interaction, channel: discord.TextChannel):
        guild_id = str(interaction.guild_id)
        self.config[guild_id] = channel.id
        self.save_config()
        await interaction.response.send_message(f"✅ Đã thiết lập kênh {channel.mention} là nơi duy nhất nhận lệnh Thần số học.", ephemeral=True)

    @app_commands.command(name="thanso", description="Xem thần số học dựa trên ngày sinh")
    @app_commands.describe(dob="Nhập ngày tháng năm sinh (VD: 15/08/1998)")
    async def thanso(self, interaction: discord.Interaction, dob: str):
        if not await self.check_channel(interaction): return
        await interaction.response.defer()

        if not self.data: return await interaction.followup.send("Lỗi: Dữ liệu chưa sẵn sàng.")

        ruling_number = self.calculate_ruling_number(dob)
        if not ruling_number or ruling_number not in self.data:
            return await interaction.followup.send("Định dạng ngày sinh không hợp lệ hoặc không tính được số chủ đạo.")

        info = self.data[ruling_number]
        embed = discord.Embed(title=f"Thần Số Học - Con Số Chủ Đạo: {ruling_number}", color=discord.Color.purple())
        embed.description = info.get("description", "")
        embed.add_field(name="Mục đích sống", value=info.get("lifePurpose", "N/A")[:1024], inline=False)
        embed.add_field(name="Đặc điểm nổi bật", value=info.get("distinctiveTraits", "N/A")[:1024], inline=False)
        embed.add_field(name="Điểm cần khắc phục", value=info.get("negative", "N/A")[:1024], inline=False)
        embed.add_field(name="Gợi ý nghề nghiệp", value=info.get("job", "N/A")[:1024], inline=False)
        embed.set_footer(text=f"Phân tích cho ngày sinh: {dob}")

        # Xử lý hình ảnh cục bộ
        image_filename = f"{ruling_number}.png"
        image_path = os.path.join(IMAGE_DIR, image_filename)
        file_to_send = discord.utils.MISSING

        if os.path.exists(image_path):
            file_to_send = discord.File(image_path, filename=image_filename)
            embed.set_thumbnail(url=f"attachment://{image_filename}")

        if file_to_send is not discord.utils.MISSING:
            await interaction.followup.send(embed=embed, file=file_to_send)
        else:
            await interaction.followup.send(embed=embed)

    @thanso_setup.error
    async def error_handler(self, interaction: discord.Interaction, error):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("❌ Bạn cần quyền Administrator để dùng lệnh này!", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Numerology(bot))