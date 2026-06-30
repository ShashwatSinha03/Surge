import { PublicPageLayout } from '../layout';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <PublicPageLayout>
      <article className="space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-fg">Privacy Policy</h1>
          <p className="text-muted">Effective date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">What We Collect</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-fg">Account information</dt>
              <dd className="text-muted mt-1">Name and email address, provided by Clerk during authentication.</dd>
            </div>
            <div>
              <dt className="font-medium text-fg">Authentication data</dt>
              <dd className="text-muted mt-1">Clerk manages sign-in, sessions, and user identifiers. Surge receives a Clerk user ID to link your account to your data.</dd>
            </div>
            <div>
              <dt className="font-medium text-fg">Profile</dt>
              <dd className="text-muted mt-1">Display name and email stored in our database for team collaboration features.</dd>
            </div>
            <div>
              <dt className="font-medium text-fg">Quests and work data</dt>
              <dd className="text-muted mt-1">Quests, milestones, actions, and their metadata (titles, descriptions, status, assignments, timestamps).</dd>
            </div>
            <div>
              <dt className="font-medium text-fg">Team memberships</dt>
              <dd className="text-muted mt-1">Which quests you belong to, your role (owner, admin, member), and join dates.</dd>
            </div>
            <div>
              <dt className="font-medium text-fg">Activity history</dt>
              <dd className="text-muted mt-1">An immutable log of changes — who did what, when — for audit and collaboration.</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Why We Collect It</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>Authentication data — to identify you and protect your account.</li>
            <li>Profile — to display your name in shared workspaces.</li>
            <li>Quests, milestones, actions — so the application functions: tracking progress, assigning work, calculating momentum.</li>
            <li>Team memberships — to enforce role-based permissions and show who's on the team.</li>
            <li>Activity history — to provide an audit trail and real-time updates for collaborators.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Where Data Is Stored</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li><span className="font-medium text-fg">Authentication:</span> Handled entirely by Clerk. We do not store passwords or credentials.</li>
            <li><span className="font-medium text-fg">Application data:</span> Stored in Supabase (PostgreSQL) on Supabase-managed infrastructure.</li>
            <li><span className="font-medium text-fg">Realtime:</span> WebSocket connections via Supabase Realtime for live presence and updates.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Data Ownership</h2>
          <p className="text-sm text-muted">
            You retain full ownership of all content you create in Surge — quests, milestones, actions, and workspace information.
            Surge only stores and processes this data so the application can function. We never claim ownership of your content.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">No Sale of Data</h2>
          <p className="text-sm text-muted">
            Surge does not sell your personal data or work content to third parties.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Data Retention & Deletion</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>Account data is retained while your account is active.</li>
            <li>Deleting a quest removes it and its associated milestones, actions, and activity.</li>
            <li>Deleting your account (via Clerk) removes your profile and memberships.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Contact</h2>
          <p className="text-sm text-muted">
            Questions about this policy: <a href="mailto:privacy@surge.example.com" className="text-fg underline hover:opacity-70">privacy@surge.example.com</a>
          </p>
        </section>
      </article>
    </PublicPageLayout>
  );
}