import json
from datetime import date
from pathlib import Path

import discord
from discord import app_commands
from discord.ext import commands


def calculate_ruling_number(day: int, month: int, year: int) -> int:
    date(year, month, day)
    digits = f"{day:02d}{month:02d}{year:04d}"
    digit_sum = sum(int(digit) for digit in digits)

    while digit_sum > 11 and digit_sum != 22:
        digit_sum = sum(int(digit) for digit in str(digit_sum))

    return digit_sum


class Numerology(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        data_path = Path(__file__).resolve().parent.parent / "data" / "numerology.json"
        with data_path.open(encoding="utf-8") as data_file:
            self.numerology_data = json.load(data_file)

    @app_commands.command(name="numerology", description="Xem thần số học theo ngày sinh")
    @app_commands.describe(
        day="Ngày sinh",
        month="Tháng sinh",
        year="Năm sinh",
    )
    async def numerology(
        self,
        interaction: discord.Interaction,
        day: app_commands.Range[int, 1, 31],
        month: app_commands.Range[int, 1, 12],
        year: app_commands.Range[int, 1, 9999],
    ):
        try:
            ruling_number = calculate_ruling_number(day, month, year)
        except ValueError:
            await interaction.response.send_message(
                "Ngày sinh không hợp lệ. Vui lòng kiểm tra lại ngày, tháng và năm.",
                ephemeral=True,
            )
            return

        meaning = self.numerology_data.get(str(ruling_number))
        if meaning is None:
            raise KeyError(f"Không tìm thấy dữ liệu cho số chủ đạo {ruling_number}.")

        display_number = "22/4" if ruling_number == 22 else str(ruling_number)
        first_embed = discord.Embed(
            title=f"Số chủ đạo của {interaction.user.display_name}: {display_number}",
            description=meaning["description"],
            color=discord.Color.gold(),
        )
        first_embed.add_field(name="◌ Mục đích sống", value=meaning["lifePurpose"], inline=False)
        first_embed.add_field(name="◌ Điểm mạnh", value=meaning["bestExpression"], inline=False)
        first_embed.add_field(name="◌ Đặc điểm nổi bật", value=meaning["distinctiveTraits"], inline=False)
        if meaning.get("distinctiveTraits1"):
            first_embed.add_field(name="▿", value=meaning["distinctiveTraits1"], inline=False)

        second_embed = discord.Embed(color=discord.Color.gold())
        second_embed.set_footer(text="Chi tiết thần số học")
        second_embed.add_field(name="◌ Điểm cần cải thiện", value=meaning["negative"], inline=False)
        second_embed.add_field(name="◌ Lời khuyên", value=meaning["sol"], inline=False)
        if meaning.get("sol1"):
            second_embed.add_field(name="▿", value=meaning["sol1"], inline=False)
        second_embed.add_field(name="◌ Nghề nghiệp phù hợp", value=meaning["job"], inline=False)
        second_embed.add_field(name="◌ Tổng kết", value=meaning["summary"], inline=False)

        image_path = (
            Path(__file__).resolve().parent.parent
            / "data"
            / "images"
            / "numerology"
            / f"{ruling_number}.png"
        )
        files = []
        if image_path.is_file():
            filename = image_path.name
            files.append(discord.File(image_path, filename=filename))
            first_embed.set_thumbnail(url=f"attachment://{filename}")
        else:
            first_embed.set_footer(text=f"Không tìm thấy hình ảnh số chủ đạo {ruling_number}.")

        await interaction.response.send_message(embeds=[first_embed, second_embed], files=files)


async def setup(bot):
    await bot.add_cog(Numerology(bot))
