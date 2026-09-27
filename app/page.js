import { redirect } from 'next/navigation';

export default function HomePage() {
  // Tự động chuyển hướng thẳng sang trang gamehub khi Discord tải iframe
  redirect('/gamehub');
}
