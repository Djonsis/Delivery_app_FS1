import { LogViewer } from './_components/log-viewer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Управление логами',
  description: 'Страница для просмотра и управления системными логами.',
};

export default function LogsPage() {
  return (
    <div className="container mx-auto p-4 h-full">
      <LogViewer />
    </div>
  );
}
