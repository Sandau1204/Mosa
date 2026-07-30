import discord
from discord import app_commands
from discord.ext import commands
import random
import json
import os
import math
from io import BytesIO

try:
    from typing import TYPE_CHECKING, Optional, Union

    if TYPE_CHECKING:
        # For type checkers / linters to resolve PIL symbols without importing at runtime
        from PIL import Image, ImageDraw, ImageFont  # type: ignore
except ImportError:
    Image = ImageDraw = ImageFont = None

# Fallbacks if Pillow is not installed: provide minimal dummy objects to avoid
# "NoneType has no attribute 'new'" errors when running in environments without PIL.
class _DummyCanvas:
    def __init__(self, size, mode, color):
        self.size = size
        self.mode = mode
        self.color = color
    def paste(self, *args, **kwargs):
        return None
    def save(self, fp, fmt):
        return None

class _DummyDraw:
    def __init__(self, canvas):
        self.canvas = canvas
    def rectangle(self, *args, **kwargs):
        return None
    def text(self, *args, **kwargs):
        return None

def _create_canvas(size, mode, color):
    if Image is not None:
        return Image.new(mode, size, color)
    return _DummyCanvas(size, mode, color)

def _create_draw(canvas):
    if ImageDraw is not None:
        return ImageDraw.Draw(canvas)
    return _DummyDraw(canvas)

NO_CARDS = 78

tarot_meaning = {
    'vi': {},
    'en': {}
}

def pick_tarot_cards(amount: int, rev: Union[bool, int]):
    pick_list = []
    while len(pick_list) != amount:
        random_card = random.randint(0, NO_CARDS - 1)
        if random_card not in pick_list:
            pick_list.append(random_card)
    
    # Returns [card_id, upright_status] (1 for upright, 0 for reversed)
    return [[c + 1, random.choice([0, 1]) if rev else 1] for c in pick_list]

async def load_tarot_meaning(language: str, read_json_func):
    if not tarot_meaning.get(language):
        # Emulating bot.wheatReadJSON functionality
        tarot_meaning[language] = await read_json_func(f"./assets/content/{language}/tarotMeaning.json")

class TarotSelectView(discord.ui.View):
    def __init__(self, tarot_cards, language, reversed_flag, t_func):
        super().__init__()
        options = []
        for ind, card in enumerate(tarot_cards):
            card_id, c_type = card[0], card[1]
            card_data = tarot_meaning[language].get(str(card_id), {"name": f"Card {card_id}"})
            
            upright_str = t_func('tarot.uprightCard') if c_type else t_func('tarot.reverseCard')
            label_suffix = f" {upright_str}" if reversed_flag else ""
            
            options.append(discord.SelectOption(
                label=f"{ind + 1}. {card_data['name']}{label_suffix}", 
                value=f"{card_id}.{int(reversed_flag)}.{c_type}"
            ))
            
        select = discord.ui.Select(
            placeholder=t_func('tarot.selectCardInSpread'), 
            options=options, 
            custom_id="tarot.selectCardInSpread"
        )
        self.add_item(select)

class TarotMeaningButtonView(discord.ui.View):
    def __init__(self, data_id, t_func):
        super().__init__()
        button = discord.ui.Button(
            label=t_func('tarot.showMeaning'), 
            style=discord.ButtonStyle.primary, 
            custom_id=f"tarot.showMeaning_{data_id}"
        )
        self.add_item(button)

class TarotCommand(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="tarot", description="Draw tarot cards")
    @app_commands.describe(reversed_opt="use reversed card? (cho phép bốc bài ngược?)", spread="which tarot spread do you want? (trải bài mà bạn muốn?)")
    @app_commands.choices(spread=[
        app_commands.Choice(name="Trải 1 lá (One card spread)", value="1"),
        app_commands.Choice(name="Trải 3 lá (Three cards spread)", value="3"),
        app_commands.Choice(name="Trải 5 lá (Five cards spread)", value="5"),
        app_commands.Choice(name="Trải Celtic Cross (Celtic Cross spread)", value="c")
    ])
    async def tarot(self, interaction: discord.Interaction, reversed_opt: Optional[bool] = None, spread: str = "1"):
        # Emulating the request object properties
        member_id = interaction.user.id
        language = 'en' # Assuming a mechanism fetches the user's language
        
        # Helper localization func (Mocked)
        def t(key, **kwargs):
            return key # Fallback mock

        await load_tarot_meaning(language, getattr(self.bot, 'read_json', lambda x: {}))

        reversed_flag = 0
        hide_meaning = 0

        # MOCK DB Manager call
        # find = await databaseManager.getMember(member_id)
        # if find:
        #    if find.tarot: reversed_flag = 1
        #    if find.hideTarotMeaning: hide_meaning = 1

        if reversed_opt is not None:
            reversed_flag = 1 if reversed_opt else 0

        embed = discord.Embed(color=discord.Color.random())
        footer_text = "To show/hide meaning by default when drawing cards, use the /mysettings command.\n**Note: This English version of Tarot Meaning is in experimental stage and may contain inaccuracies due to automatic translation by GenAI. We are working on enhancing the quality of the translation. **" if language == 'en' else "Để mặc định ẩn/hiện ý nghĩa khi bốc bài, sử dụng lệnh /mysettings."
        embed.set_footer(text=footer_text)

        if spread == "1":
            picked = pick_tarot_cards(1, reversed_flag)
            card_id, c_type = picked[0]
            
            # Using mock dictionary get if JSON is absent
            tarot_card = tarot_meaning[language].get(str(card_id), {
                "name": f"Card {card_id}", "type": "1", 
                "keywords": "...", "reKeywords": "...",
                "description": ["..."], "meaning": ["..."], "reMeaning": ["..."],
                "image": "default.png"
            })

            embed.set_author(name=t('tarot.yourTarotCardIs', user=interaction.user.display_name))
            
            upright_str = t('tarot.uprightCard') if c_type else t('tarot.reverseCard')
            title_prefix = "<a:t_v4:1140505547221766195>" if language == 'vi' else ""
            embed.title = f"{title_prefix} ** {tarot_card['name']} {upright_str if reversed_flag else ''}!**"
            embed.description = t('tarot.majorArcana') if tarot_card.get('type') == '1' else t('tarot.minorArcana')

            view = discord.ui.View()
            if not hide_meaning:
                embed.add_field(name=t('tarot.keywords'), value=tarot_card.get('keywords') if c_type else tarot_card.get('reKeywords'), inline=False)
                
                for i, desc in enumerate(tarot_card.get('description', [])):
                    embed.add_field(name=(t('tarot.cardDescription') if i == 0 else '▿'), value=desc, inline=False)
                
                meanings = tarot_card.get('meaning', []) if c_type else tarot_card.get('reMeaning', [])
                for i, meaning_text in enumerate(meanings):
                    embed.add_field(name=(t('tarot.meaning') if i == 0 else '▿'), value=meaning_text, inline=False)
            else:
                # Mock Database setup for dataId
                data_id = "mock_data_id" 
                view = TarotMeaningButtonView(data_id, t)

            # Note: You would attach a real image file here in production
            # file = discord.File(f"./assets/image/tarotImage/{'u' if c_type else 'r'}/{tarot_card['image']}", filename=tarot_card['image'])
            # embed.set_image(url=f"attachment://{tarot_card['image']}")

            await interaction.response.send_message(embed=embed, view=view) # add files=[file]

        elif spread in ["3", "5"]:
            num_cards = int(spread)
            tarot_cards = pick_tarot_cards(num_cards, reversed_flag)

            gap = 50
            canvas_width = 293 * num_cards + gap * (num_cards - 1)
            canvas = _create_canvas((canvas_width, 512), 'RGBA', (0, 0, 0, 0))

            # Simulate image drawing logic
            # for i, card in enumerate(tarot_cards):
            #     card_img = Image.open(f"../../assets/image/tarotImage/{'u' if card[1] else 'r'}/{card[0]}.png")
            #     canvas.paste(card_img, ((293 + gap) * i, 0))

            embed.title = t('tarot.35cards', user=interaction.user.display_name, num=num_cards)
            
            card_desc = []
            for ind, card in enumerate(tarot_cards):
                card_name = tarot_meaning[language].get(str(card[0]), {}).get("name", f"Card {card[0]}")
                upright_str = t('tarot.uprightCard') if card[1] else t('tarot.reverseCard')
                card_desc.append(f"{ind + 1}. **{card_name}** {upright_str if reversed_flag else ''}")
                
            embed.add_field(name=t('tarot.lefttoright'), value="\n".join(card_desc), inline=False)

            # with BytesIO() as image_binary:
            #     canvas.save(image_binary, 'PNG')
            #     image_binary.seek(0)
            #     file = discord.File(fp=image_binary, filename='spreads.png')
            # embed.set_image(url=f"attachment://spreads.png")

            view = TarotSelectView(tarot_cards, language, reversed_flag, t)
            await interaction.response.send_message(embed=embed, view=view) # add files=[file]

        elif spread == "c":
            tarot_cards = pick_tarot_cards(10, reversed_flag)
            canvas = _create_canvas((1742, 2198), 'RGBA', (0, 0, 0, 0))
            draw = _create_draw(canvas)

            # Mock PIL Font usage
            # font = ImageFont.truetype("arial.ttf", 60)
            
            coord_of_cards = [(453, 746), (-1451, 343), (0, 746), (906, 746), (453, 184), (453, 1501), (1449, 0), (1449, 562), (1449, 1124), (1449, 1686)]

            # Logic emulation for rotation and pasting
            # for i in range(1, 11):
            #     card_img = Image.open(...)
            #     if i == 2:
            #         card_img = card_img.rotate(90, expand=True) # Pillow reverse rotates compared to context API
            #     canvas.paste(card_img, coord_of_cards[i-1])
            #     draw.rectangle(..., fill='#fff')
            #     draw.text(..., str(i), fill='#edc809', font=font)

            embed.title = t('tarot.celtic', user=interaction.user.display_name)
            
            card_desc = []
            for ind, card in enumerate(tarot_cards):
                card_name = tarot_meaning[language].get(str(card[0]), {}).get("name", f"Card {card[0]}")
                upright_str = t('tarot.uprightCard') if card[1] else t('tarot.reverseCard')
                card_desc.append(f"{ind + 1}. **{card_name}** {upright_str if reversed_flag else ''}")
                
            embed.add_field(name=t('tarot.celticList'), value="\n".join(card_desc), inline=False)

            view = TarotSelectView(tarot_cards, language, reversed_flag, t)
            await interaction.response.send_message(embed=embed, view=view) # add files=[file]

async def setup(bot):
    await bot.add_cog(TarotCommand(bot))
