import './globals.css';
import Script from 'next/script';
import { Inter, Noto_Sans } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter'
});

const notoSans = Noto_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans'
});

export const metadata = {
  title: 'Mosa',
  description: 'Discord bot management and music dashboard',
  icons: {
    icon: { url: '/favicon.png', type: 'image/png' }
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <Script src="https://unpkg.com/@phosphor-icons/web" strategy="beforeInteractive" />
        <Script
          src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.variable} ${notoSans.variable}`}>{children}</body>
    </html>
  );
}
