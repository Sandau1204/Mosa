// next.config.mjs
const isDevelopment = process.env.NODE_DE_ENV === 'development';

const nextConfig = {
  output: 'export', // Luôn dùng export vì bạn chạy front-end bằng thư mục "out" qua Flask
  // Tùy chọn: Xóa slash cuối URL để tương thích tốt hơn với file path
  trailingSlash: false,
};

export default nextConfig;