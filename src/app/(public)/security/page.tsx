import { PublicPageLayout } from '../layout';

export default function SecurityPage() {
  return (
    <PublicPageLayout>
      <article className="space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-fg">Security</h1>
          <p className="text-muted">How Surge protects your data.</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Authentication</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>Handled entirely by <a href="https://clerk.com" target="_blank" rel="noopener" className="text-fg underline hover:opacity-70">Clerk</a> — industry-standard auth provider.</li>
            <li>No passwords stored by Surge. Supports email/password, OAuth, passkeys, and MFA via Clerk.</li>
            <li>Session management, rotation, and revocation handled by Clerk.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Authorization</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>Role-based access control: Owner, Admin, Member.</li>
            <li>Every mutation checked server-side for membership and role.</li>
            <li>Team-scoped queries — users only see quests they belong to.</li>
            <li>Realtime channels scoped to quest membership.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Transport & Network</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>HTTPS enforced everywhere (Vercel default).</li>
            <li>HSTS header with preload.</li>
            <li>Content Security Policy restricts scripts, styles, fonts, and connections.</li>
            <li>WebSocket (WSS) for realtime via Supabase Realtime.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Database</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>PostgreSQL on Supabase (managed infrastructure).</li>
            <li>Connection via Supabase session pooler (TLS).</li>
            <li>Row Level Security not used — authorization enforced in application layer.</li>
            <li>Service-role key used only for server-side mutations; never exposed to clients.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Audit Trail</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>Every mutation emits an immutable domain event with actor identity and timestamp.</li>
            <li>Activity log visible to quest members.</li>
            <li>Events cannot be modified or deleted.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">Incident Response</h2>
          <p className="text-sm text-muted">
            If a security issue affects your data, we will notify you via the email on your account
            within 72 hours of discovery, with details of impact and remediation steps.
            Report security concerns: <a href="mailto:security@surge.example.com" className="text-fg underline hover:opacity-70">security@surge.example.com</a>
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">What This Is Not</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>No SOC 2, ISO 27001, or FedRAMP certification.</li>
            <li>No penetration test reports published.</li>
            <li>No bug bounty program.</li>
            <li>No dedicated security team — this is a small-team product with standard practices.</li>
          </ul>
        </section>
      </article>
    </PublicPageLayout>
  );
}