import json
import os

from dotenv import load_dotenv

load_dotenv()

DATA_FOLDER = os.getenv("DATA_FOLDER", "data")
WELCOME_SETTINGS_FILE = os.path.join(DATA_FOLDER, "welcome_settings.json")


def load_welcome_settings():
    try:
        with open(WELCOME_SETTINGS_FILE, "r", encoding="utf-8") as settings_file:
            settings = json.load(settings_file)
    except FileNotFoundError:
        return {}

    if not isinstance(settings, dict):
        raise ValueError("Welcome settings file must contain a JSON object.")
    return settings


def save_welcome_settings(settings):
    os.makedirs(DATA_FOLDER, exist_ok=True)
    with open(WELCOME_SETTINGS_FILE, "w", encoding="utf-8") as settings_file:
        json.dump(settings, settings_file, ensure_ascii=False, indent=2)
