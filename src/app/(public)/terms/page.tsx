import { PublicPageLayout } from '../layout';

export default function TermsPage() {
  return (
    <PublicPageLayout>
      <article className="space-y-10">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-fg">Terms of Service</h1>
          <p className="text-muted">Effective date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">1. Acceptance</h2>
          <p className="text-sm text-muted">
            By creating an account or using Surge, you agree to these terms. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">2. Accounts</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>You must provide accurate information and keep credentials secure.</li>
            <li>You are responsible for all activity under your account.</li>
            <li>Notify us immediately if you suspect unauthorized access.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">3. Acceptable Use</h2>
          <p className="text-sm text-muted">
            You agree not to:
          </p>
          <ul className="space-y-2 text-sm text-muted list-disc list-inside">
            <li>Use Surge for illegal activities or to violate any laws.</li>
            <li>Attempt to gain unauthorized access to other accounts or data.</li>
            <li>Interfere with the service, its infrastructure, or other users.</li>
            <li>Upload malicious code or content that harms the service.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">4. Your Content</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>You retain ownership of all content you create (quests, milestones, actions, workspace data).</li>
            <li>You grant Surge a limited license to store, process, and display your content solely to provide the service.</li>
            <li>You are responsible for ensuring your content does not violate these terms or applicable law.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">5. Service Availability</h2>
          <p className="text-sm text-muted">
            Surge is provided "as is" without warranties. We strive for uptime but do not guarantee uninterrupted access.
            Maintenance, updates, or unforeseen issues may cause temporary downtime.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">6. Limitation of Liability</h2>
          <p className="text-sm text-muted">
            To the fullest extent permitted by law, Surge and its operators are not liable for any indirect, incidental,
            special, consequential, or punitive damages, or loss of data, profits, or goodwill arising from your use
            or inability to use the service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">7. Termination</h2>
          <p className="text-sm text-muted">
            You may delete your account at any time via Clerk. We may suspend or terminate access for violations of these terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">8. Changes</h2>
          <p className="text-sm text-muted">
            We may update these terms. Material changes will be communicated via the email on your account.
            Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-fg">9. Contact</h2>
          <p className="text-sm text-muted">
            Questions: <a href="mailto:legal@surge.example.com" className="text-fg underline hover:opacity-70">legal@surge.example.com</a>
          </p>
        </section>
      </article>
    </PublicPageLayout>
  );
}