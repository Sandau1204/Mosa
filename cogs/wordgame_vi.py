import discord
import json
import os
import requests
from discord import app_commands
from discord.ext import commands

# Cấu hình file lưu trữ
DATA_FOLDER = "data"
GAME_FILE = os.path.join(DATA_FOLDER, "wordgame_vi.json")
DICT_FILE = os.path.join(DATA_FOLDER, "vietnamese_dictionary.txt")

# Link danh sách từ tiếng Việt chuẩn (Nguồn mở từ GitHub)
DICT_URL = "https://raw.githubusercontent.com/duync/vietnamese-wordlist/master/Viet74K.txt"

class WordGameVI(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        # Tạo thư mục data nếu chưa có
        if not os.path.exists(DATA_FOLDER):
            os.makedirs(DATA_FOLDER)
            
        self.valid_words = self.load_dictionary() # Tải từ điển trước
        self.data = self.load_data()

    # --- HÀM XỬ LÝ DATA GAME ---
    def load_data(self):
        if not os.path.exists(GAME_FILE): return {}
        try:
            with open(GAME_FILE, "r", encoding="utf-8") as f: return json.load(f)
        except: return {}

    def save_data(self):
        with open(GAME_FILE, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=4)

    # --- HÀM TẢI TỪ ĐIỂN TỰ ĐỘNG ---
    def load_dictionary(self):
        # 1. Nếu chưa có file, tự động tải về
        if not os.path.exists(DICT_FILE):
            print("⏳ [Tiếng Việt] Đang tải từ điển online (lần đầu khởi chạy)...")
            try:
                response = requests.get(DICT_URL)
                if response.status_code == 200:
                    with open(DICT_FILE, "w", encoding="utf-8") as f:
                        f.write(response.text)
                    print("✅ Đã tải xong từ điển tiếng Việt!")
                else:
                    print("❌ Không tải được từ điển. Bot sẽ chạy chế độ không kiểm tra nghĩa.")
                    return set()
            except Exception as e:
                print(f"❌ Lỗi tải từ điển: {e}")
                return set()

        # 2. Đọc file vào bộ nhớ
        words = set()
        try:
            with open(DICT_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    # Lưu từ thường để so sánh
                    words.add(line.strip().lower())
            print(f"✅ [Tiếng Việt] Đã nạp {len(words)} từ vựng.")
        except Exception as e:
            print(f"⚠️ Lỗi đọc file từ điển: {e}")
        
        return words

    # --- CÁC LỆNH SLASH ---

    @app_commands.command(name="setup_noitu_vi", description="[Admin] Thiết lập kênh nối từ Tiếng Việt")
    @app_commands.checks.has_permissions(manage_channels=True)
    async def setup_noitu_vi(self, interaction: discord.Interaction):
        guild_id = str(interaction.guild_id)
        self.data[guild_id] = {
            "channel_id": interaction.channel_id,
            "current_word": "",
            "last_user": 0,
            "score": 0
        }
        self.save_data()
        await interaction.response.send_message(
            f"🇻🇳 **Kích hoạt nối từ Tiếng Việt!**\n"
            f"Kênh: <#{interaction.channel_id}>\n"
            f"Luật: Từ ghép 2 tiếng có nghĩa (VD: *Trời xanh* -> *Xanh lá*).", 
            ephemeral=False
        )

    @app_commands.command(name="reset_noitu_vi", description="[Admin] Reset game Tiếng Việt về đầu")
    @app_commands.checks.has_permissions(manage_channels=True)
    async def reset_noitu_vi(self, interaction: discord.Interaction):
        guild_id = str(interaction.guild_id)
        if guild_id in self.data:
            self.data[guild_id]["current_word"] = ""
            self.data[guild_id]["last_user"] = 0
            self.data[guild_id]["score"] = 0
            self.save_data()
            await interaction.response.send_message("🔄 Đã reset game! Mời bắt đầu từ đầu.", ephemeral=False)
        else:
            await interaction.response.send_message("❌ Kênh này chưa thiết lập game.", ephemeral=True)

    # --- LOGIC GAME ---
    @commands.Cog.listener()
    async def on_message(self, message):
        if message.author.bot: return
        guild_id = str(message.guild.id)
        
        if guild_id not in self.data: return
        if message.channel.id != self.data[guild_id]["channel_id"]: return

        content = message.content.strip().lower()
        content = " ".join(content.split()) 
        
        game_info = self.data[guild_id]

        if content == "?":
            last_word = game_info["current_word"]
            if last_word:
                last_syllable = last_word.split()[-1]
                await message.reply(f"ℹ️ Từ trước: **{last_word.upper()}**\nTìm từ bắt đầu bằng: **{last_syllable.upper()} ...**", delete_after=10)
            else:
                await message.reply("ℹ️ Chưa có từ nào.", delete_after=10)
            await message.delete(delay=10)
            return

        # 1. Check số từ (2 tiếng)
        syllables = content.split()
        if len(syllables) != 2:
            # Chỉ nhắc nếu người dùng gõ 1 hoặc 3 từ (có ý định chơi nhưng sai)
            # Nếu gõ câu dài > 3 từ thì bỏ qua (coi như chat chit)
            if len(syllables) == 1 or len(syllables) == 3:
                await message.add_reaction("❌") 
                await message.reply("⚠️ Chỉ được dùng từ ghép **2 tiếng**.", delete_after=5)
            return

        # 2. Check người chơi
        if message.author.id == game_info["last_user"]:
            await message.reply("❌ Không được tự nối chính mình!", delete_after=3)
            await message.delete(delay=3)
            return

        # 3. Check nối đuôi
        previous_phrase = game_info["current_word"]
        if previous_phrase:
            prev_tail = previous_phrase.split()[-1]
            curr_head = syllables[0]
            
            if prev_tail != curr_head:
                await message.add_reaction("❌")
                await message.reply(f"❌ Phải bắt đầu bằng chữ **{prev_tail.upper()}**", delete_after=5)
                return

        # 4. Check từ điển (Quan trọng)
        # Chỉ check nếu danh sách từ điển đã được tải thành công
        if self.valid_words and content not in self.valid_words:
            await message.add_reaction("❓")
            await message.reply(f"🤔 Từ **{content}** không có trong từ điển hoặc vô nghĩa.", delete_after=5)
            return

        # --- OK ---
        self.data[guild_id]["current_word"] = content
        self.data[guild_id]["last_user"] = message.author.id
        self.data[guild_id]["score"] += 1
        self.save_data()

        await message.add_reaction("✅")
        
        if self.data[guild_id]["score"] % 20 == 0:
            await message.channel.send(f"🔥 Chuỗi đã đạt **{self.data[guild_id]['score']}** từ!")

async def setup(bot):
    await bot.add_cog(WordGameVI(bot))