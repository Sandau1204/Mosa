import LegacyPage from '../../components/LegacyPage';

export const metadata = {
  title: 'Discord Music Bot Dashboard'
};

export default function MusicPage() {
  return (
    <LegacyPage
      filename="music.html"
      bodyClassName="overscroll-y-none h-[100dvh] w-screen flex flex-col text-sm antialiased selection:bg-discord-blurple selection:text-white"
    />
  );
}
