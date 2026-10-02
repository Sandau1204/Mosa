const isDevelopment = process.env.NODE_ENV === 'development';
const flaskApiUrl = process.env.FLASK_API_URL || 'http://127.0.0.1:5000';

const nextConfig = {
  output: 'export', // Luôn dùng export vì bạn chạy front-end bằng thư mục "out" qua Flask
  env: {
    NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || ''
  },
  // Tùy chọn: Xóa slash cuối URL để tương thích tốt hơn với file path
  trailingSlash: false,
  ...(isDevelopment
    ? {
        async rewrites() {
          return [
            {
              source: '/.proxy/api/:path*',
              destination: `${flaskApiUrl}/api/:path*`
            },
            {
              source: '/login',
              destination: `${flaskApiUrl}/login`
            },
            {
              source: '/logout',
              destination: `${flaskApiUrl}/logout`
            },
            {
              source: '/api/:path*',
              destination: `${flaskApiUrl}/api/:path*`
            }
          ];
        }
      }
    : {})
};

export default nextConfig;