import LegacyPage from '../../components/LegacyPage';

export const metadata = {
  title: 'Bot Panel - Quản trị Discord Bot'
};

export default function PanelPage() {
  return (
    <LegacyPage
      filename="panel.html"
      bodyClassName="overscroll-y-none bg-gray-900 text-gray-200 font-sans h-[100dvh] overflow-hidden flex flex-col md:flex-row selection:bg-discord selection:text-white"
    />
  );
}
