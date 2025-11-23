import discord
from discord import app_commands
from discord.ext import commands
import random
import json
import os
from dotenv import load_dotenv

# --- CẤU HÌNH ---
load_dotenv() # Load file .env
try:
    # Lấy ID từ .env và chuyển sang số nguyên (int)
    OWNER_ID = int(os.getenv('OWNER_ID'))
except (TypeError, ValueError):
    print("⚠️ CẢNH BÁO: Chưa cấu hình OWNER_ID trong file .env hoặc ID sai định dạng!")
    OWNER_ID = 0

DATA_FILE = 'data/tarot_data.json'
CONFIG_FILE = 'data/tarot_config.json'

class Tarot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.deck = self.load_tarot_data()
        self.config = self.load_config()

    def load_tarot_data(self):
        if not os.path.exists(DATA_FILE):
            return []
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)

    def load_config(self):
        if not os.path.exists(CONFIG_FILE):
            return {"channel_id": None}
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except:
            return {"channel_id": None}

    def save_config(self):
        with open(CONFIG_FILE, 'w') as f:
            json.dump(self.config, f)

    def create_tarot_embed(self, user, card):
        embed = discord.Embed(title=f"✅ {card['name']} !", color=0xFFD700)
        embed.add_field(name="Bộ ẩn", value=card['suit'], inline=False)
        embed.add_field(name="Từ khóa", value=card['keywords'], inline=False)
        embed.add_field(name="Mô tả bài", value=card['description'], inline=False)
        embed.add_field(name="Ý nghĩa", value=card['meaning'], inline=False)
        embed.set_image(url=card['image'])
        embed.set_footer(text="Tarot Reader Bot")
        return embed

    async def check_channel_and_permissions(self, interaction: discord.Interaction):
        allowed_channel_id = self.config.get("channel_id")
        if allowed_channel_id is None:
            await interaction.response.send_message("🚫 Bot chưa được thiết lập kênh Tarot. Vui lòng nhờ Admin dùng lệnh `/tarot_setup`.", ephemeral=True)
            return False
        if interaction.channel_id != allowed_channel_id:
            target_channel = self.bot.get_channel(allowed_channel_id)
            mention = target_channel.mention if target_channel else "kênh Tarot riêng"
            await interaction.response.send_message(f"🚫 Lệnh này chỉ hoạt động tại {mention}!", ephemeral=True)
            return False
        return True

    # --- LỆNH SETUP (CHECK OWNER ID TỪ ENV) ---
    @app_commands.command(name="tarot_setup", description="[Owner] Đặt kênh này làm kênh Tarot duy nhất")
    async def tarot_setup(self, interaction: discord.Interaction):
        if interaction.user.id != OWNER_ID:
            await interaction.response.send_message("🚫 Bạn không phải chủ sở hữu Bot (Owner ID không khớp)!", ephemeral=True)
            return

        self.config["channel_id"] = interaction.channel_id
        self.save_config()
        await interaction.response.send_message(f"✅ Đã thiết lập **{interaction.channel.mention}** là kênh Tarot duy nhất.")

    @app_commands.command(name="tarot_one", description="Bốc 1 lá bài Tarot")
    async def tarot_one(self, interaction: discord.Interaction):
        if not await self.check_channel_and_permissions(interaction): return
        await interaction.response.defer()
        if not self.deck:
            await interaction.followup.send("Lỗi: Chưa tải dữ liệu bài.")
            return
        card = random.choice(self.deck)
        greeting = f"**{interaction.user.display_name}, lá bài của bạn là...**"
        embed = self.create_tarot_embed(interaction.user, card)
        await interaction.followup.send(content=greeting, embed=embed)

    @app_commands.command(name="tarot_three", description="Trải bài 3 lá")
    async def tarot_three(self, interaction: discord.Interaction):
        if not await self.check_channel_and_permissions(interaction): return
        await interaction.response.defer()
        if not self.deck: return
        cards_data = random.sample(self.deck, 3)
        positions = ["Quá Khứ", "Hiện Tại", "Tương Lai"]
        await interaction.followup.send(f"🔮 **Trải bài cho {interaction.user.mention}**")
        for i, card in enumerate(cards_data):
            embed = self.create_tarot_embed(interaction.user, card)
            embed.set_author(name=f"Vị trí: {positions[i]}")
            await interaction.channel.send(embed=embed)

    @app_commands.command(name="tarot_search", description="Tra cứu lá bài")
    async def tarot_search(self, interaction: discord.Interaction, name: str):
        if not await self.check_channel_and_permissions(interaction): return
        await interaction.response.defer()
        found = [c for c in self.deck if name.lower() in c['name'].lower()]
        if not found:
            await interaction.followup.send(f"Không tìm thấy lá bài nào tên: {name}")
            return
        embed = self.create_tarot_embed(interaction.user, found[0])
        await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(Tarot(bot))