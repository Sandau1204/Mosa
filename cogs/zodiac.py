import json
from datetime import date, timedelta
from pathlib import Path

import discord
from discord import app_commands
from discord.ext import commands


ZODIAC_STARTS = (
    (3, 21),
    (4, 20),
    (5, 21),
    (6, 22),
    (7, 23),
    (8, 23),
    (9, 23),
    (10, 23),
    (11, 23),
    (12, 22),
    (1, 20),
    (2, 19),
)


def get_zodiac_index(day: int, month: int) -> int:
    date(2000, month, day)
    birth_day = (month, day)
    matching_signs = [
        (start, index)
        for index, start in enumerate(ZODIAC_STARTS)
        if start <= birth_day
    ]
    return max(matching_signs)[1] if matching_signs else 9


class Zodiac(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        data_path = Path(__file__).resolve().parent.parent / "data" / "zodiac.json"
        with data_path.open(encoding="utf-8") as data_file:
            self.zodiac_data = json.load(data_file)

    @app_commands.command(name="zodiac", description="Xem cung hoàng đạo theo ngày sinh")
    @app_commands.describe(
        day="Ngày sinh",
        month="Tháng sinh",
    )
    async def zodiac(
        self,
        interaction: discord.Interaction,
        day: app_commands.Range[int, 1, 31],
        month: app_commands.Range[int, 1, 12],
    ):
        try:
            zodiac_index = get_zodiac_index(day, month)
        except ValueError:
            await interaction.response.send_message(
                "Ngày sinh không hợp lệ. Vui lòng kiểm tra lại ngày và tháng.",
                ephemeral=True,
            )
            return

        sign = self.zodiac_data.get(str(zodiac_index))
        if sign is None:
            raise KeyError(f"Không tìm thấy dữ liệu cho cung hoàng đạo thứ {zodiac_index + 1}.")

        start_month, start_day = ZODIAC_STARTS[zodiac_index]
        next_month, next_day = ZODIAC_STARTS[(zodiac_index + 1) % len(ZODIAC_STARTS)]
        next_year = 2001 if (next_month, next_day) <= (start_month, start_day) else 2000
        end_date = date(next_year, next_month, next_day) - timedelta(days=1)

        embed = discord.Embed(
            color=discord.Color.purple(),
        )
        embed.set_author(name=f"⋗ Cung hoàng đạo thứ: {zodiac_index + 1}")
        embed.title = f"{sign['unicode']} {sign['name']}"
        embed.add_field(
            name="Đặc điểm",
            value=(
                f"Khoảng ngày: {start_day:02d}/{start_month:02d} – "
                f"{end_date.day:02d}/{end_date.month:02d}\n"
                f"{zodiac_index * 30}° – {(zodiac_index + 1) * 30}°"
            ),
            inline=False,
        )

        for paragraph_index, paragraph in enumerate(sign["personality"]):
            embed.add_field(
                name="Tính cách" if paragraph_index == 0 else "⋇",
                value=paragraph,
                inline=False,
            )

        image_path = (
            Path(__file__).resolve().parent.parent
            / "data"
            / "images"
            / "zodiac"
            / f"{zodiac_index + 1}.png"
        )
        files = []
        if image_path.is_file():
            filename = image_path.name
            files.append(discord.File(image_path, filename=filename))
            embed.set_thumbnail(url=f"attachment://{filename}")
        else:
            embed.set_footer(text=f"Không tìm thấy hình ảnh cung hoàng đạo thứ {zodiac_index + 1}.")

        await interaction.response.send_message(embed=embed, files=files)


async def setup(bot):
    await bot.add_cog(Zodiac(bot))
