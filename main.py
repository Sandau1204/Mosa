import discord
import os
import asyncio
import threading
from discord.ext import commands
from dotenv import load_dotenv
from webserver import run_web 

load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

class MyBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix='!', intents=intents, help_command=None)

    async def setup_hook(self):
        for filename in os.listdir('./cogs'):
            if filename.endswith('.py'):
                await self.load_extension(f'cogs.{filename[:-3]}')
                print(f'✅ Đã nạp module: {filename}')
        await self.tree.sync()
        print("🔄 Đã đồng bộ Slash Commands!")

    async def on_ready(self):
        print(f'🤖 Bot đã online: {self.user} (ID: {self.user.id})')
        await self.change_presence(activity=discord.Game(name="/play để nghe nhạc"))

bot = MyBot()

@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: discord.app_commands.AppCommandError):
    if not interaction.response.is_done():
        await interaction.response.send_message(f"⚠️ Lỗi: {str(error)}", ephemeral=True)
    else:
        await interaction.followup.send(f"⚠️ Lỗi: {str(error)}", ephemeral=True)

if __name__ == '__main__':
    # Chạy Web Server
    print("🌐 Đang khởi động Web Dashboard...")
    t = threading.Thread(target=run_web, args=(bot,))
    t.daemon = True
    t.start()
    
    bot.run(TOKEN)