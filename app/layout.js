import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'Mosa',
  description: 'Discord bot management and music dashboard'
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
      <body>{children}</body>
    </html>
  );
}
