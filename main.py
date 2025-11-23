import discord
import os
import asyncio
from discord.ext import commands
from dotenv import load_dotenv

# Load biến môi trường
load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

class MyBot(commands.Bot):
    def __init__(self):
        super().__init__(
            command_prefix='!',
            intents=intents,
            help_command=None
        )

    async def setup_hook(self):
        # Nạp các module
        for filename in os.listdir('./cogs'):
            if filename.endswith('.py'):
                await self.load_extension(f'cogs.{filename[:-3]}')
                print(f'✅ Đã nạp module: {filename}')
        
        # Đồng bộ lệnh
        await self.tree.sync()
        print("🔄 Đã đồng bộ Slash Commands!")

    async def on_ready(self):
        print(f'🤖 Đã đăng nhập: {self.user} (ID: {self.user.id})')
        await self.change_presence(activity=discord.Game(name="/help để xem lệnh"))

bot = MyBot()

# --- XỬ LÝ LỖI TOÀN CỤC (Khi mạng lag quá timeout) ---
@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: discord.app_commands.AppCommandError):
    # Nếu lệnh đã được phản hồi (defer) nhưng bị lỗi sau đó
    if interaction.response.is_done():
        # Gửi tin nhắn nối tiếp (followup) báo lỗi
        await interaction.followup.send(f"⚠️ Mạng bị lag hoặc có lỗi: {str(error)}", ephemeral=True)
    else:
        # Nếu chưa kịp phản hồi gì cả
        try:
            await interaction.response.send_message(f"⚠️ Bot không phản hồi kịp (Timeout): {str(error)}", ephemeral=True)
        except:
            pass # Bỏ qua nếu mất kết nối hoàn toàn

if __name__ == '__main__':
    bot.run(TOKEN)