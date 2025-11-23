import json

# --- CẤU HÌNH DỮ LIỆU MẪU ---
# Dữ liệu mẫu cho các lá bài (Bạn có thể chỉnh sửa chi tiết text sau)
SUITS_INFO = {
    "Wands": {"name": "Gậy", "element": "Lửa", "desc": "Năng lượng, hành động, đam mê."},
    "Cups": {"name": "Cốc", "element": "Nước", "desc": "Cảm xúc, tình yêu, trực giác."},
    "Swords": {"name": "Kiếm", "element": "Khí", "desc": "Trí tuệ, suy nghĩ, xung đột."},
    "Pents": {"name": "Tiền", "element": "Đất", "desc": "Vật chất, công việc, tài chính."}
}

RANKS = [
    {"id": "01", "name": "Ace", "vi": "Ace (1)"},
    {"id": "02", "name": "Two", "vi": "2"},
    {"id": "03", "name": "Three", "vi": "3"},
    {"id": "04", "name": "Four", "vi": "4"},
    {"id": "05", "name": "Five", "vi": "5"},
    {"id": "06", "name": "Six", "vi": "6"},
    {"id": "07", "name": "Seven", "vi": "7"},
    {"id": "08", "name": "Eight", "vi": "8"},
    {"id": "09", "name": "Nine", "vi": "9"},
    {"id": "10", "name": "Ten", "vi": "10"},
    {"id": "11", "name": "Page", "vi": "Tiểu Đồng"},
    {"id": "12", "name": "Knight", "vi": "Hiệp Sĩ"},
    {"id": "13", "name": "Queen", "vi": "Nữ Hoàng"},
    {"id": "14", "name": "King", "vi": "Vua"},
]

# Link gốc Wikimedia (Chuẩn Rider Waite)
BASE_URL = "https://upload.wikimedia.org/wikipedia/commons"

def generate_deck():
    deck = []

    # 1. ẨN CHÍNH (MAJOR ARCANA) - Mapping thủ công vì tên file không theo quy luật số
    majors = [
        {"n": "00_Fool", "name": "The Fool (Gã Khờ)", "url": "/9/90/RWS_Tarot_00_Fool.jpg"},
        {"n": "01_Magician", "name": "The Magician (Pháp Sư)", "url": "/d/de/RWS_Tarot_01_Magician.jpg"},
        {"n": "02_High_Priestess", "name": "The High Priestess (Nữ Tư Tế)", "url": "/8/88/RWS_Tarot_02_High_Priestess.jpg"},
        {"n": "03_Empress", "name": "The Empress (Nữ Hoàng)", "url": "/d/d2/RWS_Tarot_03_Empress.jpg"},
        {"n": "04_Emperor", "name": "The Emperor (Hoàng Đế)", "url": "/c/c3/RWS_Tarot_04_Emperor.jpg"},
        {"n": "05_Hierophant", "name": "The Hierophant (Giáo Hoàng)", "url": "/8/8d/RWS_Tarot_05_Hierophant.jpg"},
        {"n": "06_Lovers", "name": "The Lovers (Tình Nhân)", "url": "/3/3a/TheLovers.jpg"},
        {"n": "07_Chariot", "name": "The Chariot (Cỗ Xe)", "url": "/9/9b/RWS_Tarot_07_Chariot.jpg"},
        {"n": "08_Strength", "name": "Strength (Sức Mạnh)", "url": "/f/f5/RWS_Tarot_08_Strength.jpg"},
        {"n": "09_Hermit", "name": "The Hermit (Ẩn Sĩ)", "url": "/4/4d/RWS_Tarot_09_Hermit.jpg"},
        {"n": "10_Wheel", "name": "Wheel of Fortune (Bánh Xe Số Phận)", "url": "/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg"},
        {"n": "11_Justice", "name": "Justice (Công Lý)", "url": "/e/e0/RWS_Tarot_11_Justice.jpg"},
        {"n": "12_Hanged_Man", "name": "The Hanged Man (Người Treo Ngược)", "url": "/2/2b/RWS_Tarot_12_Hanged_Man.jpg"},
        {"n": "13_Death", "name": "Death (Cái Chết)", "url": "/d/d7/RWS_Tarot_13_Death.jpg"},
        {"n": "14_Temperance", "name": "Temperance (Cân Bằng)", "url": "/f/f8/RWS_Tarot_14_Temperance.jpg"},
        {"n": "15_Devil", "name": "The Devil (Ác Quỷ)", "url": "/5/55/RWS_Tarot_15_Devil.jpg"},
        {"n": "16_Tower", "name": "The Tower (Tòa Tháp)", "url": "/5/53/RWS_Tarot_16_Tower.jpg"},
        {"n": "17_Star", "name": "The Star (Ngôi Sao)", "url": "/d/db/RWS_Tarot_17_Star.jpg"},
        {"n": "18_Moon", "name": "The Moon (Mặt Trăng)", "url": "/7/7f/RWS_Tarot_18_Moon.jpg"},
        {"n": "19_Sun", "name": "The Sun (Mặt Trời)", "url": "/1/17/RWS_Tarot_19_Sun.jpg"},
        {"n": "20_Judgement", "name": "Judgement (Phán Xét)", "url": "/d/dd/RWS_Tarot_20_Judgement.jpg"},
        {"n": "21_World", "name": "The World (Thế Giới)", "url": "/f/ff/RWS_Tarot_21_World.jpg"}
    ]

    for m in majors:
        deck.append({
            "id": f"major_{m['n']}",
            "name": m['name'],
            "suit": "Bộ ẩn chính (Major Arcana)",
            "keywords": "Thông điệp quan trọng; Bài học lớn; Số phận",
            "description": "Lá bài thuộc bộ Ẩn chính, đại diện cho những bài học nghiệp quả và tinh thần lớn trong cuộc đời.",
            "meaning": "Đây là lá bài mang năng lượng mạnh mẽ, báo hiệu một sự kiện hoặc thay đổi lớn về nhận thức.",
            "image": f"{BASE_URL}{m['url']}"
        })

    # 2. ẨN PHỤ (MINOR ARCANA) - Tự động sinh link theo quy tắc Wikimedia
    # Quy tắc link wiki: https://upload.wikimedia.org/wikipedia/commons/hash/hash/[Suit][Number].jpg
    # Tuy nhiên để đơn giản và chính xác, ta dùng link trực tiếp đã được verify
    
    # Dictionary chứa hash của Wiki cho các file Ẩn phụ (để link ảnh hiện ra 100%)
    wiki_hashes = {
        "Wands": ["1/11", "0/0f", "f/ff", "a/a4", "9/9d", "3/3b", "e/e4", "6/6b", "e/e7", "0/0b", "6/6a", "1/16", "0/0d", "c/ce"],
        "Cups": ["3/36", "f/f8", "7/7a", "3/35", "d/d7", "1/17", "a/ae", "6/60", "2/24", "f/f3", "a/a2", "f/fa", "6/68", "f/f0"],
        "Swords": ["1/1a", "9/92", "0/00", "b/bf", "2/23", "2/29", "3/34", "a/a7", "2/2f", "d/d4", "4/4c", "2/24", "d/d4", "3/33"],
        "Pents": ["f/fd", "9/9f", "4/42", "3/35", "9/96", "a/a6", "6/6a", "6/6b", "f/f0", "4/42", "6/68", "d/d5", "8/88", "1/1c"]
    }
    # Lưu ý: Pents08 (Lá bài bạn gửi) có hash là 6/6b -> Link: .../6/6b/Pents08.jpg

    for suit_code, suit_data in SUITS_INFO.items():
        for i, rank in enumerate(RANKS):
            # Tạo tên file theo chuẩn Wiki: Wands01.jpg, Pents08.jpg
            file_name = f"{suit_code}{rank['id']}.jpg"
            
            # Fix lỗi đặc biệt của Wiki (Đôi khi Ace viết là Ace, đôi khi là 01)
            # Nhưng bộ RWS 1909 scan chuẩn thường dùng số 01-14
            
            # Ghép link
            try:
                hash_prefix = wiki_hashes[suit_code][i]
                img_url = f"{BASE_URL}/{hash_prefix}/{file_name}"
            except:
                img_url = "" # Fallback nếu lỗi

            # Xử lý đặc biệt cho lá Page of Wands (giữ nguyên nội dung bạn thích)
            if suit_code == "Wands" and rank['name'] == "Page":
                desc = "Lá Page of Wands miêu tả một chàng trai trẻ đầy nhiệt huyết và đam mê đang đứng giữa cánh đồng hoang vu..."
                meaning = "Với Page of Wands, bạn là một người luôn tràn đầy nhiệt huyết và đam mê..."
                keywords = "Cảm hứng; Khám phá; Tiềm năng vô hạn; Tinh thần tự do"
            else:
                desc = f"Lá bài {rank['vi']} thuộc bộ {suit_data['name']}. Hình ảnh mang phong cách cổ điển RWS 1909."
                meaning = f"Ý nghĩa của lá bài tập trung vào khía cạnh {suit_data['desc']} ở mức độ {rank['vi']}."
                keywords = f"{suit_data['name']}; {suit_data['element']}; {rank['name']}"

            deck.append({
                "id": f"{suit_code}_{rank['id']}",
                "name": f"{rank['vi']} of {suit_data['name']} ({rank['name']})",
                "suit": f"Bộ ẩn phụ ({suit_data['name']})",
                "keywords": keywords,
                "description": desc,
                "meaning": meaning,
                "image": img_url
            })

    return deck

if __name__ == "__main__":
    data = generate_deck()
    with open('tarot_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Đã tạo file tarot_data.json thành công với {len(data)} lá bài!")