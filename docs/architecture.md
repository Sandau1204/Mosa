# Cấu trúc dự án

Mosa gồm bot Discord và API Flask viết bằng Python, cùng giao diện Next.js.
Chạy các lệnh bên dưới từ thư mục gốc của dự án.

| Vị trí | Vai trò |
| --- | --- |
| [main.py](../main.py) | Khởi động bot Discord và web server |
| [webserver.py](../webserver.py) | API Flask, xác thực và phục vụ giao diện đã build |
| [cogs/](../cogs/) | Các extension Discord, mỗi module trực tiếp có `async setup(bot)` |
| [cogs/engines/](../cogs/engines/) | Luật và trạng thái cờ vua, cờ tướng, cờ tỷ phú |
| [cogs/services/](../cogs/services/) | Đọc/ghi cấu hình dùng chung cho bot và API |
| [app/](../app/) | Các trang và layout Next.js |
| [components/](../components/) | Thành phần giao diện React |
| [templates/](../templates/) | HTML hiện được dùng bởi LegacyPage khi build |
| [public/](../public/) | Tài nguyên tĩnh của giao diện |
| [shared/](../shared/) | Dữ liệu nguồn dùng chung cho Python và React |
| [data/](../data/) | Dữ liệu nội dung có sẵn; mặc định cũng chứa dữ liệu khi chạy |
| [tests/](../tests/) | Kiểm thử Python |

Bot chỉ tự nạp các file Python trực tiếp trong `cogs/`, bỏ qua tên bắt đầu
bằng `_`. Các thư mục con chứa logic hỗ trợ không được nạp như extension.
Module Discord mới phải có `async setup(bot)`; luật game mới đặt trong
`cogs/engines/` và dịch vụ dùng chung đặt trong `cogs/services/`.

`shared/monopoly-board.json` là nguồn dữ liệu bàn cờ duy nhất cho cả hai phía.
Không đặt dữ liệu dùng chung của backend trong thư mục component giao diện.

## Chạy và kiểm tra

```sh
python -m pip install -r requirements.txt
npm ci
python -m unittest discover -s tests
npm run build
python main.py
```

Bot cần các biến môi trường triển khai, đặc biệt `DISCORD_TOKEN`.
Khi phát triển giao diện, chạy `npm run dev`; API Flask mặc định ở cổng 5000.
Next.js build ra `out/`, sau đó Flask phục vụ thư mục này.

`DATA_FOLDER` chọn nơi lưu dữ liệu khi chạy, mặc định là `data` tương đối với
thư mục làm việc. Giữ nguyên cấu hình này trên máy chủ để tiếp tục dùng dữ liệu
hiện có. Các dữ liệu nội dung đã được theo dõi trong Git vẫn được giữ nguyên.

`node_modules/`, `__pycache__/`, `.venv/`, `.next/` và `out/` là thư viện,
cache hoặc kết quả build; không đưa vào Git. Cài lại thư viện từ
`package-lock.json` và `requirements.txt` khi thiết lập môi trường.
