import discord
from discord.ext import commands
from discord import app_commands
from discord.app_commands import Choice
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

    @app_commands.command(name="tarot", description="Rút ngẫu nhiên lá bài Tarot để xem bói")
    @app_commands.describe(
        allow_reversed="Cho phép rút lá bài ngược không? (Mặc định: Không - Chỉ lá xuôi)",
        spread="Chọn cách trải bài (Mặc định: 1 lá)"
    )
    @app_commands.choices(spread=[
        Choice(name="1 Lá (Hàng ngày/Câu hỏi đơn)", value=1),
        Choice(name="3 Lá (Quá khứ - Hiện tại - Tương lai)", value=3)
    ])
    async def tarot(self, interaction: discord.Interaction, allow_reversed: bool = False, spread: Choice[int] | None = None):
        # Trì hoãn phản hồi để bot có thời gian xử lý nhiều file ảnh cùng lúc
        await interaction.response.defer()

        if not self.tarot_data:
            await interaction.followup.send("Lỗi: Dữ liệu Tarot hiện không khả dụng. Vui lòng kiểm tra lại file data/tarot.json.")
            return

        # Xác định số lượng lá bài cần rút
        spread_count = spread.value if spread else 1
        
        # Bốc ngẫu nhiên các lá bài không trùng lặp
        drawn_cards = random.sample(list(self.tarot_data.keys()), spread_count)
        
        embeds = []
        files = []
        
        # Tiêu đề cho từng lá bài theo spread
        spread_labels = ["🔮 Quẻ bói của bạn"] if spread_count == 1 else ["🕰️ Quá khứ", "⚡ Hiện tại", "🚀 Tương lai"]

        for idx, card_id in enumerate(drawn_cards):
            card_info = self.tarot_data[card_id]

            # Xử lý chiều của lá bài: Chỉ random nếu allow_reversed = True, ngược lại luôn False (Xuôi)
            is_reversed = random.choice([True, False]) if allow_reversed else False
            orientation_folder = 'r' if is_reversed else 'u'
            orientation_text = "Ngược" if is_reversed else "Xuôi"

            # Lấy thông tin
            name = card_info.get("name", "Unknown Card")
            keywords = card_info.get("reKeywords" if is_reversed else "keywords", "Không có từ khóa")
            
            raw_description = card_info.get("description", [])
            raw_meaning = card_info.get("reMeaning" if is_reversed else "meaning", [])
            
            description = "\n\n".join(raw_description) if isinstance(raw_description, list) else raw_description
            meaning = "\n\n".join(raw_meaning) if isinstance(raw_meaning, list) else raw_meaning

            # Cắt ngắn text để tuân thủ giới hạn 1024 ký tự của field trong Discord Embed
            description = (description[:1020] + '...') if len(description) > 1024 else description
            meaning = (meaning[:1020] + '...') if len(meaning) > 1024 else meaning

            # Thiết lập ảnh
            image_filename = card_info.get("image", f"{card_id}.png")
            unique_filename = f"card_{idx}_{image_filename}" # Tránh trùng lặp tên file khi gửi
            image_path = os.path.join("data", "images", "tarot", orientation_folder, image_filename)

            # Khởi tạo Embed
            embed = discord.Embed(
                title=f"{spread_labels[idx]}: {name} ({orientation_text})",
                color=discord.Color.purple() if not is_reversed else discord.Color.dark_theme()
            )
            
            embed.add_field(name="🔑 Từ khóa", value=f"*{keywords}*", inline=False)
            
            if description:
                embed.add_field(name="📜 Mô tả lá bài", value=description, inline=False)
            if meaning:
                embed.add_field(name="💡 Ý nghĩa", value=meaning, inline=False)

            # Xử lý đính kèm ảnh
            if os.path.exists(image_path):
                file = discord.File(image_path, filename=unique_filename)
                files.append(file)
                # Sử dụng set_thumbnail nếu là trải 3 lá để tiết kiệm không gian hiển thị, set_image cho 1 lá
                if spread_count == 3:
                    embed.set_thumbnail(url=f"attachment://{unique_filename}")
                else:
                    embed.set_image(url=f"attachment://{unique_filename}")
            else:
                embed.set_footer(text=f"Không tìm thấy hình ảnh tại: {image_path}")
            
            embeds.append(embed)

        # Gửi kết quả
        await interaction.followup.send(files=files, embeds=embeds)

async def setup(bot):
    await bot.add_cog(Tarot(bot))