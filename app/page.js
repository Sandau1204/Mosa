
import GameHub from './gamehub/page'; // Điều chỉnh lại đường dẫn import cho đúng vị trí

export const metadata = {
  title: 'Game Hub - Discord Activity',
  description: 'Chơi board game cùng bạn bè ngay trong Discord.'
};

export default function HomePage() {
  // Trực tiếp render UI, không sử dụng redirect
  return <GameHub />;
}