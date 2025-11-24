import discord
import os
import json
from discord import app_commands
from discord.ext import commands
from gtts import gTTS

# CẤU HÌNH DATA
DATA_FOLDER = "data"
NAME_FILE = os.path.join(DATA_FOLDER, "name.json")

class Voice(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.welcome_channels = {}
        
        # Tạo thư mục nếu chưa có
        if not os.path.exists(DATA_FOLDER):
            os.makedirs(DATA_FOLDER)
            
        self.custom_names = self.load_custom_names()

    def load_custom_names(self):
        if not os.path.exists(NAME_FILE): return {}
        try:
            with open(NAME_FILE, "r", encoding="utf-8") as f: return json.load(f)
        except: return {}

    def save_custom_names(self):
        if not os.path.exists(DATA_FOLDER): os.makedirs(DATA_FOLDER)
        with open(NAME_FILE, "w", encoding="utf-8") as f:
            json.dump(self.custom_names, f, ensure_ascii=False, indent=4)

    async def join_channel(self, interaction):
        if interaction.user.voice is None:
            await interaction.followup.send("❌ Bạn chưa vào Voice!", ephemeral=True)
            return None
        channel = interaction.user.voice.channel
        voice_client = interaction.guild.voice_client
        if voice_client and voice_client.is_connected():
            if voice_client.channel != channel: await voice_client.move_to(channel)
        else: voice_client = await channel.connect()
        return voice_client

    async def speak_text(self, voice_client, text, lang='vi'):
        if voice_client.is_playing(): return False 
        try:
            tts = gTTS(text=text, lang=lang)
            file_path = f"tts_{voice_client.guild.id}.mp3"
            tts.save(file_path)
            voice_client.play(discord.FFmpegPCMAudio(file_path), after=lambda e: os.remove(file_path) if os.path.exists(file_path) else None)
            return True
        except: return False

    @commands.Cog.listener()
    async def on_voice_state_update(self, member, before, after):
        if member.bot: return
        guild_id = member.guild.id
        if guild_id not in self.welcome_channels: return
        watched_channel_id = self.welcome_channels[guild_id]
        is_joining = (before.channel != after.channel) and (after.channel is not None and after.channel.id == watched_channel_id)

        if is_joining:
            voice_client = member.guild.voice_client
            if voice_client and voice_client.is_connected() and voice_client.channel.id == watched_channel_id:
                if voice_client.is_playing(): return 
                user_id = str(member.id)
                target_name = self.custom_names.get(user_id, member.display_name)
                await self.speak_text(voice_client, f"Xin chào {target_name}")

    # --- CÁC LỆNH SLASH ---

    @app_commands.command(name="name", description="Xem tên bot gọi bạn")
    async def name(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        user_id = str(interaction.user.id)
        name = self.custom_names.get(user_id, interaction.user.display_name)
        await interaction.followup.send(f"Tên hiện tại: **{name}**")

    @app_commands.command(name="setname", description="Đặt biệt danh")
    async def setname(self, interaction: discord.Interaction, new_name: str):
        await interaction.response.defer(ephemeral=True)
        self.custom_names[str(interaction.user.id)] = new_name
        self.save_custom_names()
        await interaction.followup.send(f"✅ Đã nhớ tên: **{new_name}**")

    @app_commands.command(name="welcome", description="Bật/Tắt chào")
    async def welcome(self, interaction: discord.Interaction):
        await interaction.response.defer()
        
        if interaction.user.voice is None:
            await interaction.followup.send("❌ Vào voice trước đã!")
            return

        voice_client = await self.join_channel(interaction)
        if not voice_client: return

        channel = interaction.user.voice.channel
        guild_id = interaction.guild_id

        if guild_id in self.welcome_channels and self.welcome_channels[guild_id] == channel.id:
            del self.welcome_channels[guild_id]
            await interaction.followup.send(f"🔕 Đã TẮT chào tại **{channel.name}**.")
        else:
            self.welcome_channels[guild_id] = channel.id
            await interaction.followup.send(f"👋 Đã BẬT chào tại **{channel.name}**.")
            await self.speak_text(voice_client, "Kích hoạt chào.")

    @app_commands.command(name="join", description="Mời bot vào")
    async def join(self, interaction: discord.Interaction):
        await interaction.response.defer()
        voice_client = await self.join_channel(interaction)
        if voice_client:
            await interaction.followup.send(f"✅ Đã vào kênh: **{voice_client.channel.name}**")

    @app_commands.command(name="leave", description="Mời bot ra")
    async def leave(self, interaction: discord.Interaction):
        await interaction.response.defer()
        voice_client = interaction.guild.voice_client
        if voice_client and voice_client.is_connected():
            if interaction.guild_id in self.welcome_channels:
                del self.welcome_channels[interaction.guild_id]
            await voice_client.disconnect()
            await interaction.followup.send("👋 Bye bye!")
        else:
            await interaction.followup.send("❌ Bot không ở trong kênh nào.")

    @app_commands.command(name="say", description="Chuyển văn bản thành giọng nói")
    async def say(self, interaction: discord.Interaction, text: str, lang: str = "vi"):
        await interaction.response.defer()
        voice_client = interaction.guild.voice_client
        if not voice_client:
            voice_client = await self.join_channel(interaction)
            if not voice_client: return

        success = await self.speak_text(voice_client, text, lang)
        if success:
            await interaction.followup.send(f"🗣️ **Nói:** {text}")
        else:
            await interaction.followup.send("❌ Bot đang bận.")

async def setup(bot):
    await bot.add_cog(Voice(bot))