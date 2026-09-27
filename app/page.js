export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold text-white">Mosa Dashboard</h1>
      <nav className="flex gap-4">
        <a className="rounded-lg bg-discord px-5 py-3 font-medium text-white" href="/panel">
          Mở quản trị bot
        </a>
        <a className="rounded-lg bg-discord-panel px-5 py-3 font-medium text-white" href="/music">
          Mở trình phát nhạc
        </a>
      </nav>
    </main>
  );
}
