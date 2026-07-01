import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { CommandPalette } from '@/components/commands/command-palette';
import { ShortcutsOverlay } from '@/components/ui/shortcuts-overlay';
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  let recentQuests: { id: string; title: string }[] = [];

  if (userId) {
    const supabase = createServerClient();
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single<{ id: string }>();

    if (dbUser) {
      const { data: memberRows } = await supabase
        .from('quest_members')
        .select('quest_id')
        .eq('user_id', dbUser.id);

      if (memberRows && memberRows.length > 0) {
        const questIds = memberRows.map((r) => r.quest_id);
        const { data: quests } = await supabase
          .from('quests')
          .select('id, title')
          .in('id', questIds)
          .neq('status', 'deleted')
          .order('updated_at', { ascending: false })
          .limit(5);

        if (quests) recentQuests = quests;
      }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar recentQuests={recentQuests} />
      <div className="flex flex-col flex-1 min-w-0">
        <MobileHeader recentQuests={recentQuests} />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0" id="main-content">
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <ShortcutsOverlay />
    </div>
  );
}
