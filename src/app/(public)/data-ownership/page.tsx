import { PublicPageLayout } from '../layout';

export default function DataOwnershipPage() {
  return (
    <PublicPageLayout>
      <article className="space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-fg">Data Ownership</h1>
          <p className="text-muted">Your work. Your data. Your control.</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">What You Own</h2>
          <p className="text-sm text-muted">
            Every piece of content you create in Surge belongs to you:
          </p>
          <ul className="space-y-2 text-sm text-muted list-disc list-inside">
            <li><span className="font-medium text-fg">Quests</span> — projects, templates, descriptions, status</li>
            <li><span className="font-medium text-fg">Milestones</span> — checkpoints, positions, completion state</li>
            <li><span className="font-medium text-fg">Actions</span> — tasks, assignments, status, blockers</li>
            <li><span className="font-medium text-fg">Workspace information</span> — team memberships, roles, settings</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">What Surge Does</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>Stores your data so the application functions.</li>
            <li>Processes it to calculate progress, momentum, and activity.</li>
            <li>Displays it to you and your authorized team members.</li>
            <li>Never claims ownership, never sells, never uses it for advertising.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">What Surge Does Not Do</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>Does not train models on your data.</li>
            <li>Does not share your content with third parties.</li>
            <li>Does not scan content for advertising or profiling.</li>
            <li>Does not assert any IP rights over your work.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Deletion</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>Delete a quest — removes quest, milestones, actions, and activity log.</li>
            <li>Delete your account (via Clerk) — removes profile and memberships.</li>
            <li>Data is removed from primary storage within 30 days; backups expire on their cycle.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Export</h2>
          <p className="text-sm text-muted">
            You can request a full export of your data at any time by contacting
            <a href="mailto:data@surge.example.com" className="text-fg underline hover:opacity-70">data@surge.example.com</a>.
          </p>
        </section>
      </article>
    </PublicPageLayout>
  );
}