import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/quests');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-bg">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium leading-tight tracking-tight text-fg">
          Stop managing projects.
          <br />
          <span className="text-muted">Start shipping them.</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted leading-relaxed max-w-lg mx-auto">
          A realtime workspace built to maintain momentum, ownership, and execution.
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-accent text-accent-fg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Create Your First Quest
          </Link>

          <Link
            href="/sign-in"
            className="inline-flex items-center px-6 py-3 rounded-lg border border-border text-fg text-sm hover:bg-surface transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
