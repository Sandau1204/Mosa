# Sử dụng Python bản slim để tối ưu dung lượng
FROM python:3.11-slim

# Cài đặt FFmpeg VÀ tini
RUN apt-get update && \
    apt-get install -y ffmpeg tini && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Copy file requirements.txt vào trước để tận dụng Docker cache
COPY requirements.txt .

# Cài đặt các thư viện Python
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn vào thư mục /app
COPY . .

# Mở port 5000 cho Web Dashboard
EXPOSE 5000

# Sử dụng tini làm tiến trình khởi động (PID 1)
ENTRYPOINT ["/usr/bin/tini", "--"]

# Lệnh khởi chạy bot (Sẽ do tini quản lý)
CMD ["python", "main.py"]