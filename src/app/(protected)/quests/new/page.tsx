import { QuestForm } from '@/features/quests/components/quest-form';

export default function NewQuestPage() {
  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-medium text-fg">New Quest</h1>
        <p className="text-muted text-sm mt-1">Choose a template and start building.</p>
      </header>
      <QuestForm />
    </div>
  );
}
