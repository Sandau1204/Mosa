import discord
import os
import json
import random
from discord import app_commands
from discord.ext import commands

TAROT_FILE = "data/tarot_meaning.json"
TAROT_CONFIG_FILE = "data/tarot_config.json"
IMAGE_DIR = "data/images"

class Tarot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.tarot_data = self.load_data()
        self.config = self.load_config()

    def load_data(self):
        if not os.path.exists(TAROT_FILE): return {}
        try:
            with open(TAROT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except: return {}

    def load_config(self):
        if not os.path.exists(TAROT_CONFIG_FILE): return {}
        try:
            with open(TAROT_CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except: return {}

    def save_config(self):
        with open(TAROT_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(self.config, f, indent=4)

    async def check_channel(self, interaction: discord.Interaction) -> bool:
        guild_id = str(interaction.guild_id)
        if guild_id in self.config:
            allowed_channel_id = self.config[guild_id]
            if interaction.channel_id != allowed_channel_id:
                await interaction.response.send_message(f"🚫 Lệnh Tarot chỉ được sử dụng trong kênh <#{allowed_channel_id}>.", ephemeral=True)
                return False
        return True

    @app_commands.command(name="tarot_setup", description="[Admin] Cài đặt kênh duy nhất nhận lệnh Tarot")
    @app_commands.describe(channel="Chọn kênh để cho phép người dùng bốc bài")
    @app_commands.checks.has_permissions(administrator=True)
    async def tarot_setup(self, interaction: discord.Interaction, channel: discord.TextChannel):
        guild_id = str(interaction.guild_id)
        self.config[guild_id] = channel.id
        self.save_config()
        await interaction.response.send_message(f"✅ Đã thiết lập kênh {channel.mention} là nơi duy nhất nhận lệnh Tarot cho server này.", ephemeral=True)

    @app_commands.command(name="tarot", description="Bốc một lá bài Tarot ngẫu nhiên")
    async def tarot(self, interaction: discord.Interaction):
        if not await self.check_channel(interaction): return
        await interaction.response.defer()

        if not self.tarot_data:
            return await interaction.followup.send("Lỗi: Không tìm thấy dữ liệu Tarot.")

        card_keys = list(self.tarot_data.keys())
        card = self.tarot_data[random.choice(card_keys)]
        is_upright = random.choice([True, False])
        
        description = "\n".join(card.get("description", []))
        
        if is_upright:
            title_suffix, keywords, meaning, color = "(Xuôi)", card.get("keywords", ""), "\n".join(card.get("meaning", [])), discord.Color.green()
        else:
            title_suffix, keywords, meaning, color = "(Ngược)", card.get("reKeywords", ""), "\n".join(card.get("reMeaning", [])), discord.Color.red()

        embed = discord.Embed(title=f"Lá bài của bạn: {card['name']} {title_suffix}", color=color)
        embed.add_field(name="Từ khóa", value=keywords, inline=False)
        embed.add_field(name="Mô tả", value=description[:1024], inline=False)
        embed.add_field(name="Ý nghĩa", value=meaning[:1024], inline=False)
        embed.set_footer(text="Mosa Tarot Reader")

        # Xử lý hình ảnh từ thư mục cục bộ
        image_filename = card.get('image', '')
        image_path = os.path.join(IMAGE_DIR, image_filename)
        file_to_send = discord.utils.MISSING

        if image_filename and os.path.exists(image_path):
            file_to_send = discord.File(image_path, filename=image_filename)
            embed.set_thumbnail(url=f"attachment://{image_filename}")

        if file_to_send is not discord.utils.MISSING:
            await interaction.followup.send(content=f"{interaction.user.mention}, đây là thông điệp dành cho bạn:", embed=embed, file=file_to_send)
        else:
            await interaction.followup.send(content=f"{interaction.user.mention}, đây là thông điệp dành cho bạn:", embed=embed)

    @tarot_setup.error
    async def error_handler(self, interaction: discord.Interaction, error):
        if isinstance(error, app_commands.MissingPermissions):
            await interaction.response.send_message("❌ Bạn cần quyền Administrator để dùng lệnh này!", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Tarot(bot))