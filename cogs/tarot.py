import discord
import json
import random
import os
from discord import app_commands
from discord.ext import commands

class Tarot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.data_path = os.path.join("data", "tarot_data.json")
        self.tarot_data = self.load_data()

    def load_data(self):
        try:
            with open(self.data_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def pick_cards(self, amount, allow_reversed):
        cards = random.sample(self.tarot_data, amount)
        results = []
        for card in cards:
            is_reversed = random.choice([True, False]) if allow_reversed else False
            results.append((card, is_reversed))
        return results

    @app_commands.command(name="tarot", description="Trải bài Tarot")
    @app_commands.choices(spread=[
        app_commands.Choice(name="Trải 1 lá", value=1),
        app_commands.Choice(name="Trải 3 lá (Quá khứ - Hiện tại - Tương lai)", value=3)
    ])
    async def tarot(self, interaction: discord.Interaction, spread: app_commands.Choice[int], reversed: bool = False):
        await interaction.response.defer()
        
        amount = spread.value
        picked = self.pick_cards(amount, reversed)
        
        embeds = []
        files = []
        
        for idx, (card, is_rev) in enumerate(picked):
            state = "Ngược" if is_rev else "Xuôi"
            embed = discord.Embed(
                title=f"Lá bài {idx + 1}: {card['name']} ({state})",
                description=card['description'],
                color=discord.Color.dark_theme()
            )
            
            meaning = card.get('reMeaning' if is_rev else 'meaning', "Đang cập nhật...")
            embed.add_field(name="Ý nghĩa", value=meaning, inline=False)
            
            # Xử lý hình ảnh từ thư mục cục bộ (nếu tải sẵn) hoặc dùng URL Wiki
            if "image" in card and card["image"].startswith("http"):
                embed.set_image(url=card["image"])
                
            embeds.append(embed)

        # Discord giới hạn số lượng embed/files mỗi tin nhắn, 
        # nên với 3 lá, ta có thể gửi kèm tất cả trong 1 lượt.
        await interaction.followup.send(embeds=embeds)

async def setup(bot):
    await bot.add_cog(Tarot(bot))