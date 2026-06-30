import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function PublicPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col px-6 bg-bg">
      <header className="flex items-center justify-between py-5 max-w-5xl mx-auto w-full">
        <Link href="/" className="text-lg font-semibold tracking-tight text-fg">
          Surge
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-muted hover:text-fg transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-accent-fg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full py-12">
        {children}
      </main>

      <footer className="py-6 max-w-5xl mx-auto w-full">
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted/60 mb-4">
          <Link href="/privacy" className="hover:text-fg transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-fg transition-colors">Terms</Link>
          <Link href="/security" className="hover:text-fg transition-colors">Security</Link>
          <Link href="/data-ownership" className="hover:text-fg transition-colors">Data Ownership</Link>
        </nav>
        <p className="text-xs text-muted/40 text-center">
          Built with Next.js, Clerk, Supabase &middot; &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}