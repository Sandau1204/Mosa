import discord
import json
import os
from discord import app_commands
from discord.ext import commands

class Numerology(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.data_path = os.path.join("data", "numerology.json")
        self.numerology_data = self.load_data()

    def load_data(self):
        try:
            with open(self.data_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    @app_commands.command(name="numerology", description="Xem Thần Số Học dựa trên ngày sinh")
    @app_commands.describe(day="Ngày", month="Tháng", year="Năm sinh")
    async def numerology(self, interaction: discord.Interaction, day: int, month: int, year: int):
        await interaction.response.defer()
        
        # Validation cơ bản
        if not (1 <= day <= 31 and 1 <= month <= 12 and year > 0):
            return await interaction.followup.send("Ngày tháng năm không hợp lệ!")

        # Thuật toán tính con số chủ đạo
        date_str = f"{day:02d}{month:02d}{year:04d}"
        sum_digits = sum(int(digit) for digit in date_str)
        
        while sum_digits > 11 and sum_digits != 22:
            sum_digits = sum(int(digit) for digit in str(sum_digits))
            
        ruling_number = "22/4" if sum_digits == 22 else str(sum_digits)
        
        # Lấy dữ liệu từ JSON
        info = self.numerology_data.get(ruling_number)
        if not info:
            return await interaction.followup.send(f"Chưa có dữ liệu cho con số {ruling_number}.")

        # Tạo Embed
        embed = discord.Embed(
            title=f"Thần Số Học của {interaction.user.display_name}: Con số {ruling_number}",
            description=info.get("description", ""),
            color=discord.Color.blue()
        )
        embed.add_field(name="✨ Mục đích sống", value=info.get("lifePurpose", "N/A"), inline=False)
        embed.add_field(name="👍 Điểm mạnh", value=info.get("bestExpression", "N/A"), inline=True)
        embed.add_field(name="👎 Điểm yếu", value=info.get("negative", "N/A"), inline=True)
        
        # Gửi kèm hình ảnh
        image_path = os.path.join("data", "images", "numerology", f"{ruling_number.replace('/', '_')}.png")
        if os.path.exists(image_path):
            file = discord.File(image_path, filename="image.png")
            embed.set_thumbnail(url="attachment://image.png")
            await interaction.followup.send(embed=embed, file=file)
        else:
            await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(Numerology(bot))