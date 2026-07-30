import discord
import json
import os
from discord import app_commands
from discord.ext import commands

class Zodiac(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.data_path = os.path.join("data", "zodiac.json")
        self.zodiac_data = self.load_data()

    def load_data(self):
        try:
            with open(self.data_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def get_zodiac_sign(self, day, month):
        signs = [
            ("Capricorn", 1, 20), ("Aquarius", 2, 19), ("Pisces", 3, 20), ("Aries", 4, 20),
            ("Taurus", 5, 20), ("Gemini", 6, 21), ("Cancer", 7, 22), ("Leo", 8, 22),
            ("Virgo", 9, 22), ("Libra", 10, 23), ("Scorpio", 11, 22), ("Sagittarius", 12, 21),
            ("Capricorn", 12, 31)
        ]
        for sign, m, d in signs:
            if month == m and day <= d:
                return sign
            elif month == m - 1 and day > signs[m-2][2]:
                return sign
        return "Aquarius" # Default fallback

    @app_commands.command(name="zodiac", description="Xem Cung Hoàng Đạo")
    async def zodiac(self, interaction: discord.Interaction, day: int, month: int):
        await interaction.response.defer()
        
        sign_key = self.get_zodiac_sign(day, month)
        info = self.zodiac_data.get(sign_key.lower())
        
        if not info:
            return await interaction.followup.send("Dữ liệu đang được cập nhật!")

        embed = discord.Embed(
            title=f"Cung Hoàng Đạo: {info.get('name_vi', sign_key)}",
            description=info.get("overview", ""),
            color=discord.Color.purple()
        )
        embed.add_field(name="Tính cách", value=info.get("traits", ""), inline=False)
        await interaction.followup.send(embed=embed)

async def setup(bot):
    await bot.add_cog(Zodiac(bot))