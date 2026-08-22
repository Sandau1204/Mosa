import discord
import os
import asyncio
import threading
from discord.ext import commands
from dotenv import load_dotenv
from webserver import run_web 

load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
if not TOKEN:
    raise ValueError("DISCORD_TOKEN environment variable is not set")

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

class MyBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix='!', intents=intents, help_command=None)
        self.MY_GUILD = discord.Object(id=1114556955843899516)
        
    async def setup_hook(self):
        for filename in os.listdir('./cogs'):
            if filename.endswith('.py'):
                await self.load_extension(f'cogs.{filename[:-3]}')
                print(f'✅ Đã nạp module: {filename}')
        try:
            self.tree.copy_global_to(guild=self.MY_GUILD)
            synced = await self.tree.sync(guild=self.MY_GUILD)
            print(f"Đã đồng bộ {len(synced)} Slash Commands cho server test!")
        except Exception as e:
            print(f"Lỗi khi đồng bộ lệnh: {e}")

    async def on_ready(self):
        user = self.user
        user_display = f"{user}" if user else "Unknown"
        user_id = getattr(user, 'id', 'Unknown')
        print(f'🤖 Bot đã online: {user_display} (ID: {user_id})')
        #await self.change_presence(activity=discord.Game(name="/play để nghe nhạc"))

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