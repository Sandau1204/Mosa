import discord
from discord.ext import commands
from discord import app_commands
import json
import random
import os

class Tarot(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.tarot_data = self.load_tarot_data()

    def load_tarot_data(self):
        """Đọc dữ liệu từ file data/tarot.json"""
        try:
            with open('data/tarot.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Lỗi tải data tarot: {e}")
            return {}

    @app_commands.command(name="tarot", description="Rút ngẫu nhiên một lá bài Tarot để xem bói")
    async def tarot(self, interaction: discord.Interaction):
        if not self.tarot_data:
            await interaction.response.send_message("Lỗi: Dữ liệu Tarot hiện không khả dụng. Vui lòng kiểm tra lại file data/tarot.json.", ephemeral=True)
            return

        # Chọn ngẫu nhiên 1 lá bài từ file JSON
        card_id = random.choice(list(self.tarot_data.keys()))
        card_info = self.tarot_data[card_id]

        # Chọn ngẫu nhiên chiều xuôi (upright - u) hoặc ngược (reversed - r)
        is_reversed = random.choice([True, False])
        orientation_folder = 'r' if is_reversed else 'u'
        orientation_text = "Ngược" if is_reversed else "Xuôi"

        # Lấy thông tin tương ứng dựa trên chiều của lá bài
        name = card_info.get("name", "Unknown Card")
        keywords = card_info.get("reKeywords" if is_reversed else "keywords", "Không có từ khóa")
        
        # Xử lý description và meaning (Do dữ liệu trong JSON là dạng Array/List)
        raw_description = card_info.get("description", [])
        raw_meaning = card_info.get("reMeaning" if is_reversed else "meaning", [])
        
        description = "\n\n".join(raw_description) if isinstance(raw_description, list) else raw_description
        meaning = "\n\n".join(raw_meaning) if isinstance(raw_meaning, list) else raw_meaning

        # Giới hạn độ dài text để không vượt quá giới hạn 1024 ký tự của Discord Embed Field
        description = (description[:1021] + '...') if len(description) > 1024 else description
        meaning = (meaning[:1021] + '...') if len(meaning) > 1024 else meaning

        # Xác định đường dẫn hình ảnh[cite: 1]
        image_filename = card_info.get("image", f"{card_id}.png")
        image_path = os.path.join("data", "images", "tarot", orientation_folder, image_filename)

        # Xây dựng giao diện Embed mang phong cách hiện đại và huyền bí
        embed = discord.Embed(
            title=f"🔮 Quẻ bói Tarot: {name} ({orientation_text})",
            color=discord.Color.purple()
        )
        
        embed.add_field(name="🔑 Từ khóa", value=f"*{keywords}*", inline=False)
        
        if description:
            embed.add_field(name="📜 Mô tả lá bài", value=description, inline=False)
            
        if meaning:
            embed.add_field(name="💡 Ý nghĩa", value=meaning, inline=False)

        # Xử lý đính kèm hình ảnh vào Embed
        if os.path.exists(image_path):
            file = discord.File(image_path, filename=image_filename)
            embed.set_image(url=f"attachment://{image_filename}")
            await interaction.response.send_message(file=file, embed=embed)
        else:
            embed.set_footer(text=f"Không tìm thấy hình ảnh tại: {image_path}")
            await interaction.response.send_message(embed=embed)

async def setup(bot):
    await bot.add_cog(Tarot(bot))