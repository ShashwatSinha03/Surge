type Props = {
  params: Promise<{ questId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function QuestSettingsPage({ params }: Props) {
  return (
    <section className="rounded-xl border border-border p-8 text-center bg-surface">
      <p className="text-muted text-sm">Settings will arrive in a future sprint.</p>
    </section>
  );
}
