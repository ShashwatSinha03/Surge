import { Sidebar } from '@/components/layout/sidebar';
import { CommandPalette } from '@/components/commands/command-palette';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <CommandPalette />
    </div>
  );
}
