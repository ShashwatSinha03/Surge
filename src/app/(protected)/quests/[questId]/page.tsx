import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Quest } from '@/types';

type Props = {
  params: Promise<{ questId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function QuestOverviewPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) return null;

  const { questId } = await params;

  const supabase = createServerClient();

  const { data: quest } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .neq('status', 'deleted')
    .single<Quest>();

  if (!quest) {
    notFound();
  }

  return (
    <>
      {quest.description && (
        <section className="mb-8">
          <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-2">
            Description
          </h2>
          <p className="text-sm text-fg leading-relaxed">{quest.description}</p>
        </section>
      )}

      <section className="rounded-xl bg-surface border border-border p-8 text-center">
        <p className="text-muted text-sm">Milestones arrive in Sprint 3.</p>
      </section>
    </>
  );
}
