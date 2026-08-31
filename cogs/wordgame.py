import discord
import json
import os
import string
from discord import app_commands
from discord.ext import commands

# Import nltk thay cho spellchecker
import nltk
from nltk.corpus import words

# Tự động tải dữ liệu từ vựng NLTK nếu máy chưa có
try:
    nltk.data.find('corpora/words')
except LookupError:
    nltk.download('words', quiet=True)

# Lọc tạo tập hợp (set) từ vựng tiếng Anh để tốc độ tra cứu là tức thì (O(1))
ENGLISH_WORDS = set(word.lower() for word in words.words())

# Danh sách đen (Blacklist): Chặn triệt để các từ lóng/viết tắt mà bạn không muốn bot nhận

from dotenv import load_dotenv
# File lưu dữ liệu trò chơi
load_dotenv()
DATA_FOLDER = os.getenv("DATA_FOLDER", "data")
GAME_DATA_FILE = os.path.join(DATA_FOLDER, "wordgame.json")

def load_valid_short_words():
    file_path = os.path.join(DATA_FOLDER, "short_words.json")
    try: 
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return set(data.get("valid_short_words", []))
    except FileNotFoundError:
        print(f"⚠️ File {file_path} không tồn tại. Không có từ ngắn hợp lệ nào được tải.")
        return set()
    
VALID_SHORT_WORDS = load_valid_short_words()
     
class WordGame(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.data = self.load_data()

    # --- XỬ LÝ DỮ LIỆU ---
    def load_data(self):
        if not os.path.exists(GAME_DATA_FILE):
            return {}
        try:
            with open(GAME_DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return {}

    def save_data(self):
        # Đảm bảo thư mục data tồn tại
        if not os.path.exists("data"):
            os.makedirs("data")
        with open(GAME_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=4)

    # --- CÁC LỆNH SLASH ---

    @app_commands.command(name="setup_noitu", description="[Admin] Thiết lập kênh này làm kênh nối từ")
    @app_commands.checks.has_permissions(manage_channels=True)
    async def setup_noitu(self, interaction: discord.Interaction):
        guild_id = str(interaction.guild_id)
        channel_id = interaction.channel_id

        # Khởi tạo dữ liệu cho server này
        self.data[guild_id] = {
            "channel_id": channel_id,
            "current_word": "",
            "last_user": 0,
            "score": 0,
            "used_words": [] # Thêm mảng lưu các từ đã dùng
        }
        self.save_data()
        
        await interaction.response.send_message(f"✅ Đã thiết lập kênh <#{channel_id}> làm sân chơi nối từ!\nNgười chơi hãy bắt đầu bằng một từ Tiếng Anh bất kỳ.", ephemeral=False)

    @app_commands.command(name="reset_noitu", description="[Admin] Reset lại trò chơi về điểm bắt đầu")
    @app_commands.checks.has_permissions(manage_channels=True)
    async def reset_noitu(self, interaction: discord.Interaction):
        guild_id = str(interaction.guild_id)
        
        if guild_id in self.data:
            self.data[guild_id]["current_word"] = ""
            self.data[guild_id]["last_user"] = 0
            self.data[guild_id]["score"] = 0
            self.data[guild_id]["used_words"] = [] # Reset lại mảng từ đã dùng
            self.save_data()
            await interaction.response.send_message("🔄 Đã reset trò chơi! Hãy bắt đầu lại bằng một từ mới.", ephemeral=False)
        else:
            await interaction.response.send_message("❌ Server này chưa thiết lập game nối từ. Dùng `/setup_noitu` trước.", ephemeral=True)

    # --- SỰ KIỆN NHẬN TIN NHẮN (LOGIC CHÍNH) ---
    @commands.Cog.listener()
    async def on_message(self, message):
        # 1. Bỏ qua bot và tin nhắn hệ thống
        if message.author.bot: return
        # 2. Bỏ qua tin nhắn bắt đầu bằng |
        if message.content.strip().startswith("|"): return 
        # 3. Bỏ qua tin nhắn trả lời (reply) để tránh spam
        if message.reference is not None: return

        guild_id = str(message.guild.id)
        
        # 4. Kiểm tra xem có phải kênh nối từ không
        if guild_id not in self.data: return
        if message.channel.id != self.data[guild_id]["channel_id"]: return

        content = message.content.strip().lower()
        game_info = self.data[guild_id]

        # Khởi tạo used_words nếu data cũ chưa có (để tránh lỗi)
        if "used_words" not in game_info:
            game_info["used_words"] = []

        # --- Xử lý dấu hỏi chấm (?) ---
        if content == "?":
            last_word = game_info["current_word"]
            if last_word:
                msg = f"ℹ️ Từ hiện tại là: **{last_word.upper()}**\nBạn cần tìm từ bắt đầu bằng chữ: **{last_word[-1].upper()}**"
            else:
                msg = "ℹ️ Chưa có từ nào. Hãy bắt đầu bằng bất kỳ từ Tiếng Anh nào!"
            
            await message.reply(msg, delete_after=10)
            await message.delete(delay=10) # Xóa dấu ? cho sạch kênh
            return

        # --- Luật 1: Chỉ được 1 từ (không có dấu cách) ---
        if " " in content:
            await message.add_reaction("❌") # Sai quy định
            return # Không phản hồi gì thêm để tránh spam

        # --- Luật 2: Không được nối từ của chính mình ---
        if message.author.id == game_info["last_user"]:
            await message.reply("❌ Bạn không được nối tiếp từ của chính mình! Chờ người khác nhé.", delete_after=5)
            await message.delete(delay=5)
            return

        # --- Luật 3: Kiểm tra từ có hợp lệ không (Từ ngắn & Từ điển) ---
        if len(content) <= 3:
            # Kiểm tra trong file JSON nếu từ có 3 chữ cái trở xuống
            if content not in VALID_SHORT_WORDS:
                await message.add_reaction("❌")
                await message.reply(f"❌ Từ `{content}` không hợp lệ hoặc vô nghĩa. Vui lòng nhập từ khác!", delete_after=5)
                await message.delete(delay=5)
                return
        else:
            # Kiểm tra trong từ điển tiếng Anh (NLTK) nếu từ dài hơn 3 chữ cái
            if content not in ENGLISH_WORDS:
                await message.add_reaction("❌")
                await message.reply(f"❌ Từ `{content}` không có trong từ điển tiếng Anh! Hãy thử từ khác.", delete_after=5)
                await message.delete(delay=5)
                return

        # --- Luật 4: Chữ cuối từ trước = Chữ đầu từ sau ---
        current_word = game_info["current_word"]
        if current_word:
            required_char = current_word[-1]
            if content[0] != required_char:
                await message.add_reaction("❌")
                await message.reply(f"❌ Sai rồi! Từ phải bắt đầu bằng chữ **{required_char.upper()}**", delete_after=5)
                await message.delete(delay=5)
                return

        # --- Luật 5: Không được lặp lại từ đã dùng ---
        if content in game_info["used_words"]:
            await message.add_reaction("❌")
            await message.reply(f"❌ Từ **{content.upper()}** đã được sử dụng trước đó! Hãy chọn từ khác.", delete_after=5)
            await message.delete(delay=5)
            return

        # --- THÀNH CÔNG ---
        # Cập nhật dữ liệu
        self.data[guild_id]["current_word"] = content
        self.data[guild_id]["last_user"] = message.author.id
        self.data[guild_id]["score"] += 1
        self.data[guild_id]["used_words"].append(content) # Thêm từ vào danh sách đã dùng
        self.save_data()

        await message.add_reaction("✅")
        
        # Thỉnh thoảng khen ngợi (mỗi 10 từ)
        if self.data[guild_id]["score"] % 10 == 0:
            await message.channel.send(f"🔥 Chuỗi đã đạt **{self.data[guild_id]['score']}** từ! Tiếp tục nào!")

async def setup(bot):
    await bot.add_cog(WordGame(bot))