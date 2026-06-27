import { currentUser } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { ThemeSection, AccountSection } from './settings-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const clerkUser = await currentUser();
  const supabase = createServerClient();

  let dbUser: { id: string; name: string; email: string; avatar_url: string | null } | null = null;

  if (clerkUser) {
    const { data } = await supabase
      .from('users')
      .select('id, name, email, avatar_url')
      .eq('clerk_user_id', clerkUser.id)
      .single<{ id: string; name: string; email: string; avatar_url: string | null }>();

    dbUser = data;
  }

  const displayName =
    dbUser?.name ?? clerkUser?.firstName ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? 'User';
  const displayEmail = dbUser?.email ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? '';
  const avatarUrl = dbUser?.avatar_url ?? clerkUser?.imageUrl ?? null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-medium text-fg">Settings</h1>
        <p className="text-muted text-sm mt-1">Manage your account and preferences.</p>
      </header>

      <section>
        <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-3">
          Profile
        </h2>
        <div className="rounded-xl border border-surface bg-surface p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center text-sm text-muted font-medium overflow-hidden shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg truncate">{displayName}</p>
              <p className="text-sm text-muted truncate">{displayEmail}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-3">
          Appearance
        </h2>
        <div className="rounded-xl border border-surface bg-surface p-5">
          <ThemeSection />
        </div>
      </section>

      <section>
        <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-3">
          Account
        </h2>
        <div className="rounded-xl border border-surface bg-surface p-5">
          <AccountSection />
        </div>
      </section>

      <section>
        <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-3">
          Security
        </h2>
        <div className="rounded-xl border border-surface bg-surface p-5 space-y-4">
          <p className="text-sm text-muted leading-relaxed">
            Password and authentication are managed by Clerk.
          </p>
          <div className="text-xs text-muted/60">
            Sessions are handled securely through Clerk&apos;s infrastructure. Visit the
            Account section to manage your authentication methods.
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-3">
          Notification Preferences
        </h2>
        <div className="rounded-xl border border-surface bg-surface p-5 divide-y divide-border/50">
          <p className="text-sm text-muted/60 pb-4">
            Notification preferences will be available in a future update.
          </p>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-fg">Email notifications</span>
            <span className="text-xs text-muted/40 px-3 py-1 rounded-full border border-border bg-surface">
              Disabled
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-fg">In-app notifications</span>
            <span className="text-xs text-muted/40 px-3 py-1 rounded-full border border-border bg-surface">
              Disabled
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
