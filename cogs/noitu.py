import discord
from discord import app_commands
from discord.ext import commands
import json
import os
from english_words import get_english_words_set
from dotenv import load_dotenv

# --- CẤU HÌNH ---
load_dotenv()
try:
    OWNER_ID = int(os.getenv('OWNER_ID'))
except (TypeError, ValueError):
    print("⚠️ CẢNH BÁO: Chưa cấu hình OWNER_ID trong file .env hoặc ID sai định dạng!")
    OWNER_ID = 0

english_vocab = get_english_words_set(['web2'], lower=True)
DATA_FILE = "data/noitu_data.json"

class Noitu(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.data = self.load_data()

    def load_data(self):
        if not os.path.exists(DATA_FILE):
            return {"channel_id": None, "current_word": None, "used_words": [], "last_user_id": None}
        try:
            with open(DATA_FILE, 'r') as f:
                data = json.load(f)
                if "last_user_id" not in data: data["last_user_id"] = None
                return data
        except:
            return {"channel_id": None, "current_word": None, "used_words": [], "last_user_id": None}

    def save_data(self):
        with open(DATA_FILE, 'w') as f:
            json.dump(self.data, f)

    # --- LỆNH SETUP (CHECK OWNER ID TỪ ENV) ---
    @app_commands.command(name="noitu_setup", description="[Owner] Chọn kênh này làm kênh Nối Từ")
    async def noitu_setup(self, interaction: discord.Interaction):
        if interaction.user.id != OWNER_ID:
            await interaction.response.send_message("🚫 Bạn không phải chủ sở hữu Bot (Owner ID không khớp)!", ephemeral=True)
            return

        self.data["channel_id"] = interaction.channel_id
        self.data["current_word"] = None
        self.data["used_words"] = []
        self.data["last_user_id"] = None
        self.save_data()
        
        await interaction.response.send_message(
            f"✅ **Đã kích hoạt Nối Từ tại kênh {interaction.channel.mention}!**\n"
            f"📜 **Luật:** Tiếng Anh, 1 từ, nối đuôi, không lặp lại.\n"
            f"⛔ **Lượt chơi:** Không được chơi 2 lần liên tiếp.\n"
            f"💬 Chat ngoài lề: Thêm `?` ở đầu."
        )

    @app_commands.command(name="noitu_reset", description="Bắt đầu lại ván mới")
    async def noitu_reset(self, interaction: discord.Interaction):
        if self.data["channel_id"] != interaction.channel_id:
            await interaction.response.send_message("Lệnh này chỉ dùng trong kênh nối từ.", ephemeral=True)
            return

        self.data["current_word"] = None
        self.data["used_words"] = []
        self.data["last_user_id"] = None
        self.save_data()
        await interaction.response.send_message("🔄 **Ván mới bắt đầu!**")

    @commands.Cog.listener()
    async def on_message(self, message):
        if message.author.bot: return
        if self.data["channel_id"] != message.channel.id: return
        content = message.content.strip()
        if content.startswith("?"): return 

        word = content.lower()
        error_msg = None

        if self.data["last_user_id"] == message.author.id:
            error_msg = "🚫 Chờ người khác nối đã!"
        elif " " in word:
            error_msg = "🚫 Chỉ được dùng 1 từ!"
        elif word not in english_vocab:
            error_msg = f"🚫 `{word}` không có trong từ điển!"
        elif word in self.data["used_words"]:
            error_msg = f"🚫 `{word}` đã dùng rồi!"
        elif self.data["current_word"] is not None:
            last_char = self.data["current_word"][-1]
            if word[0] != last_char:
                error_msg = f"🚫 Phải bắt đầu bằng chữ **'{last_char.upper()}'**"

        if error_msg:
            await message.add_reaction("❌")
            await message.reply(error_msg, delete_after=3)
        else:
            self.data["current_word"] = word
            self.data["used_words"].append(word)
            self.data["last_user_id"] = message.author.id
            self.save_data()
            await message.add_reaction("✅")

async def setup(bot):
    await bot.add_cog(Noitu(bot))