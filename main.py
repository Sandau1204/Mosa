import discord
import os
import asyncio
import threading
from typing import Optional
from discord.ext import commands
from dotenv import load_dotenv
from flask import ctx
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
        self.MY_GUILD = discord.Object(id=908946644819669003)
        
    async def setup_hook(self):
        for filename in os.listdir('./cogs'):
            if filename.endswith('.py'):
                await self.load_extension(f'cogs.{filename[:-3]}')
                print(f'✅ Đã nạp module: {filename}')

    async def on_ready(self):
        user = self.user
        user_display = f"{user}" if user else "Unknown"
        user_id = getattr(user, 'id', 'Unknown')
        print(f'🤖 Bot đã online: {user_display} (ID: {user_id})')
        #await self.change_presence(activity=discord.Game(name="/play để nghe nhạc"))

bot = MyBot()

# Lệnh prefix (!sync) dùng để đồng bộ Slash Command thủ công
@bot.command(name="sync")
@commands.is_owner() 
async def sync(ctx, option: Optional[str] = None):
    msg = await ctx.send("🔄 Đang xử lý Slash Commands, vui lòng đợi...")
    try:
        if option == "clean":
            # Xóa sạch các lệnh (Guild commands) bị nhân đôi tại Server Test
            bot.tree.clear_commands(guild=bot.MY_GUILD)
            await bot.tree.sync(guild=bot.MY_GUILD)
            await msg.edit(content="🧹 **Đã dọn dẹp lệnh bị nhân đôi tại Server Test!**\n(Nhấn Ctrl + R trên Discord để tải lại giao diện)")
            return

        # Mặc định chỉ đồng bộ Global để tránh bị nhân đôi ở Server Test
        synced_global = await bot.tree.sync()
        await msg.edit(content=f"✅ **Đồng bộ hoàn tất!**\n🌍 Toàn cầu (Global): Cập nhật `{len(synced_global)}` lệnh.")
        
    except Exception as e:
        await msg.edit(content=f"❌ **Lỗi:** {e}")

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