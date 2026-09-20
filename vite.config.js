import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Đặt thư mục templates làm root cho Vite để dễ quản lý đường dẫn
  root: 'templates', 
  build: {
    outDir: '../dist', // Build ra thư mục dist ở gốc dự án
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'templates/panel.html'),
        music: resolve(__dirname, 'templates/music.html')
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      // Chuyển hướng các API và luồng đăng nhập Discord[cite: 1] về Flask
      '/api': 'http://127.0.0.1:5000',
      '/login': 'http://127.0.0.1:5000',
      '/callback': 'http://127.0.0.1:5000',
      '/logout': 'http://127.0.0.1:5000'
    }
  }
});