import discord
import os
import asyncio
import threading
import requests
import sys
import logging
from typing import Optional
from discord.ext import commands
from dotenv import load_dotenv
from flask import ctx
from webserver import run_web 
from webserver import run_web, add_log

load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
if not TOKEN:
    raise ValueError("DISCORD_TOKEN environment variable is not set")

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

class PanelPrintRedirector:
    def __init__(self):
        self.terminal = sys.stdout

    def write(self, message):
        self.terminal.write(message) # Vẫn in ra console bình thường
        msg_clean = message.strip()
        if msg_clean:
            add_log(msg_clean, "info")

    def flush(self):
        self.terminal.flush()

sys.stdout = PanelPrintRedirector()

# 2. Hứng cảnh báo/lỗi từ chính thư viện discord.py
class PanelLogHandler(logging.Handler):
    def emit(self, record):
        msg = self.format(record)
        level = "info"
        if record.levelno >= logging.ERROR:
            level = "error"
        elif record.levelno >= logging.WARNING:
            level = "warn"
        add_log(msg, level)

discord_logger = logging.getLogger('discord')
discord_logger.setLevel(logging.INFO)
panel_handler = PanelLogHandler()
panel_handler.setFormatter(logging.Formatter('[%(levelname)s] %(message)s'))
discord_logger.addHandler(panel_handler)
# ====================================================================

load_dotenv()
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
        
        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.listening, 
                name="/play để nghe nhạc"
            ),
            status=discord.Status.online
        )

bot = MyBot()

# Lệnh prefix (!sync) dùng để đồng bộ Slash Command thủ công
@bot.command(name="sync")
@commands.is_owner()
async def sync(ctx, option: Optional[str] = None):
    msg = await ctx.send("Đang xử lý Slash Commands, vui lòng đợi...")
    try:
        if option == "clean":
            bot.tree.clear_commands(guild=bot.MY_GUILD)
            await bot.tree.sync(guild=bot.MY_GUILD)
            await msg.edit(content="Đã dọn sạch lệnh ở Server Test!**\n(Nhấn Ctrl + R trên Discord để làm mới giao diện)")
            return
        
        # --- BẮT ĐẦU CÁCH 2: CUSTOM BULK SYNC ---
        # Lấy Application ID (nếu bot đã ready thì thuộc tính application có sẵn)
        app_id = getattr(bot.application, "id", None) or getattr(bot.user, "id", None)
        if app_id is None:
            raise RuntimeError("Bot application ID is unavailable")
        
        # 1. Thu thập các lệnh hiện có trong code của bot.tree
        payload = []
        commands_to_sync = bot.tree.get_commands() # Lấy danh sách lệnh Global
        
        for cmd in commands_to_sync:
            # Hàm to_dict() giúp chuyển lệnh về định dạng API của Discord
            payload.append(cmd.to_dict(bot.tree)) 
            
        headers = {
            "Authorization": f"Bot {TOKEN}",
            "Content-Type": "application/json"
        }
        url = f"https://discord.com/api/v10/applications/{app_id}/commands"
        
        # 2. Lấy danh sách lệnh đang có trên Discord bằng API
        resp = requests.get(url, headers=headers)
        if resp.status_code == 200:
            existing_commands = resp.json()
            
            # 3. Tìm lệnh Entry Point (Loại 4 là Primary Entry Point)
            entry_point_cmd = next((c for c in existing_commands if c.get("type") == 4), None)
            
            # 4. Nếu tìm thấy trên Discord có lệnh này, chúng ta gộp nó vào payload
            if entry_point_cmd:
                payload.append({
                    "name": entry_point_cmd["name"],
                    "type": 4,
                    "description": "", # Lệnh loại 4 không được có description
                    "handler": entry_point_cmd.get("handler", 2),
                    "integration_types": entry_point_cmd.get("integration_types", [0, 1]),
                    "contexts": entry_point_cmd.get("contexts", [0, 1, 2])
                })
        
        # 5. Gửi request đồng bộ đè lên Discord
        sync_resp = requests.put(url, headers=headers, json=payload)
        
        if sync_resp.status_code == 200:
             # Tính toán số lượng lệnh đã đồng bộ thành công (trừ đi Entry Point nếu có)
             synced_count = len(sync_resp.json())
             has_entry = " (Đã giữ lại Entry Point App Launcher)" if entry_point_cmd else ""
             
             await msg.edit(content=f"Đồng bộ tất cả hoàn tất!**\nToàn cầu (Global): Cập nhật `{synced_count}` lệnh.{has_entry}")
        else:
             await msg.edit(content=f"**Lỗi API:** {sync_resp.status_code} - {sync_resp.text}")
        
    except Exception as e:
        await msg.edit(content=f"**Lỗi Code:** {e}")

@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: discord.app_commands.AppCommandError):
    if not interaction.response.is_done():
        await interaction.response.send_message(f"⚠️ Lỗi: {str(error)}", ephemeral=True)
    else:
        await interaction.followup.send(f"⚠️ Lỗi: {str(error)}", ephemeral=True)

if __name__ == '__main__':
    print("🚀 Đang khởi động Web Dashboard...")
    t = threading.Thread(target=run_web, args=(bot,))
    t.daemon = True
    t.start()
    
    bot.run(TOKEN)