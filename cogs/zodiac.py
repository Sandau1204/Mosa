import discord
from typing import Optional
import os
import json
from discord import app_commands
from discord.ext import commands

ZODIAC_FILE = "data/zodiac_meaning.json"
ZODIAC_CONFIG_FILE = "data/zodiac_config.json"
IMAGE_DIR = "data/images"

class Zodiac(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.data = self.load_data()
        self.config = self.load_config()

    def load_data(self):
        if not os.path.exists(ZODIAC_FILE): return {}
        try:
            with open(ZODIAC_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except: return {}

    def load_config(self):
        if not os.path.exists(ZODIAC_CONFIG_FILE): return {}
        try:
            with open(ZODIAC_CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except: return {}

    def save_config(self):
        with open(ZODIAC_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(self.config, f, indent=4)

    async def check_channel(self, interaction: discord.Interaction) -> bool:
        guild_id = str(interaction.guild_id)
        if guild_id in self.config:
            allowed_channel_id = self.config[guild_id]
            if interaction.channel_id != allowed_channel_id:
                await interaction.response.send_message(f"🚫 Lệnh Cung hoàng đạo chỉ được sử dụng trong kênh <#{allowed_channel_id}>.", ephemeral=True)
                return False
        return True

    def get_zodiac_key(self, day: int, month: int) -> Optional[str]:
        if (month == 3 and day >= 21) or (month == 4 and day <= 19): return "Aries"
        elif (month == 4 and day >= 20) or (month == 5 and day <= 20): return "Taurus"
        elif (month == 5 and day >= 21) or (month == 6 and day <= 21): return "Gemini"
        elif (month == 6 and day >= 22) or (month == 7 and day <= 22): return "Cancer"
        elif (month == 7 and day >= 23) or (month == 8 and day <= 22): return "Leo"
        elif (month == 8 and day >= 23) or (month == 9 and day <= 22): return "Virgo"
        elif (month == 9 and day >= 23) or (month == 10 and day <= 23): return "Libra"
        elif (month == 10 and day >= 24) or (month == 11 and day <= 21): return "Scorpio"
        elif (month == 11 and day >= 22) or (month == 12 and day <= 21): return "Sagittarius"
        elif (month == 12 and day >= 22) or (month == 1 and day <= 19): return "Capricorn"
        elif (month == 1 and day >= 20) or (month == 2 and day <= 18): return "Aquarius"
        elif (month == 2 and day >= 19) or (month == 3 and day <= 20): return "Pisces"
        return None

    @app_commands.command(name="zodiac_setup", description="[Admin] Cài đặt kênh duy nhất nhận lệnh Cung hoàng đạo")
    @app_commands.describe(channel="Chọn kênh để cho phép dùng lệnh")
    @app_commands.checks.has_permissions(administrator=True)
    async def zodiac_setup(self, interaction: discord.Interaction, channel: discord.TextChannel):
        guild_id = str(interaction.guild_id)
        self.config[guild_id] = channel.id
        self.save_config()
        await interaction.response.send_message(f"✅ Đã thiết lập kênh {channel.mention} là nơi duy nhất nhận lệnh Cung hoàng đạo.", ephemeral=True)

    @app_commands.command(name="cunghoangdao", description="Xem thông tin chi tiết về Cung hoàng đạo của bạn")
    @app_commands.describe(day="Ngày sinh (1-31)", month="Tháng sinh (1-12)")
    async def cunghoangdao(self, interaction: discord.Interaction, day: int, month: int):
        if not await self.check_channel(interaction): return
        await interaction.response.defer()

        if not (1 <= month <= 12) or not (1 <= day <= 31):
            return await interaction.followup.send("Ngày hoặc tháng sinh không hợp lệ.")

        sign_key = self.get_zodiac_key(day, month)
        if not sign_key:
            return await interaction.followup.send(f"Không thể xác định cung hoàng đạo cho ngày {day}/{month}.")

        info = next((v for k, v in self.data.items() if sign_key.lower() in [str(k).lower(), v.get("name", "").lower()]), None)
        if not info:
            try:
                names = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
                info = self.data.get(str(names.index(sign_key) + 1))
            except Exception: pass

        if not info: return await interaction.followup.send("Chưa có thông tin cho cung hoàng đạo này.")

        embed = discord.Embed(title=f"Khám phá Cung {info.get('name', sign_key)}", color=discord.Color.gold())
        if "description" in info:
            embed.description = "".join(info["description"]) if isinstance(info["description"], list) else str(info["description"])
        if "element" in info: embed.add_field(name="Nguyên tố", value=info["element"], inline=True)
        if "planet" in info: embed.add_field(name="Hành tinh", value=info["planet"], inline=True)
        traits = info.get("traits", info.get("keywords", ""))
        if traits: embed.add_field(name="Đặc điểm nổi bật", value=str(traits), inline=False)
        if "love" in info:
            embed.add_field(name="Tình cảm", value=("".join(info["love"]) if isinstance(info["love"], list) else str(info["love"]))[:1024], inline=False)
        if "career" in info or "job" in info:
            career = info.get("career", info.get("job", ""))
            embed.add_field(name="Sự nghiệp", value=("".join(career) if isinstance(career, list) else str(career))[:1024], inline=False)
        embed.set_footer(text=f"Thông tin dành cho ngày sinh: {day}/{month}")

        # Xử lý hình ảnh cục bộ
        image_filename = info.get("image", f"{sign_key}.png")
        image_path = os.path.join(IMAGE_DIR, image_filename)
        file_to_send = discord.utils.MISSING

        if os.path.exists(image_path):
            file_to_send = discord.File(image_path, filename=image_filename)
            embed.set_thumbnail(url=f"attachment://{image_filename}")

        if file_to_send is not discord.utils.MISSING:
            await interaction.followup.send(embed=embed, file=file_to_send)
        else:
            await interaction.followup.send(embed=embed)

    @zodiac_setup.error
    async def error_handler(self, interaction: discord.Interaction, error):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("❌ Bạn cần quyền Administrator để dùng lệnh này!", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Zodiac(bot))