'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ferrofluid } from '@/components/ui/ferrofluid';
import { BlurText } from '@/components/ui/blur-text';

const FEATURES = [
  { label: 'Milestones', description: 'Structured checkpoints keep work visible and teams aligned.' },
  { label: 'Actions', description: 'Own clear tasks with status tracking and accountability.' },
  { label: 'Momentum', description: 'Real-time health metrics show what needs attention.' },
  { label: 'Presence', description: 'See who is online and working right now.' },
];

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/quests');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const el = document.documentElement;
    setTheme((el.dataset.theme as 'dark' | 'light') ?? 'dark');
    const observer = new MutationObserver(() => {
      setTheme((el.dataset.theme as 'dark' | 'light') ?? 'dark');
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Show content immediately during SSR; redirect client-side if authenticated
  if (isLoaded && isSignedIn) return null;

  const ferroColors = theme === 'dark'
    ? ['#ffffff', '#ffffff', '#ffffff']
    : ['#5A4650', '#7A6670', '#5A4650'];

  return (
    <div className="min-h-screen flex flex-col bg-bg relative">
      <div className="absolute inset-0 z-0">
        <Ferrofluid
          colors={ferroColors}
          speed={0.15}
          scale={2.2}
          turbulence={0.8}
          fluidity={0.09}
          rimWidth={0.17}
          sharpness={2.5}
          shimmer={0.6}
          glow={1.3}
          flowDirection="down"
          opacity={theme === 'dark' ? 0.12 : 0.2}
          mouseInteraction
          mouseStrength={1.1}
          mouseRadius={0.35}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between py-5 px-6 max-w-5xl mx-auto w-full">
        <span className="text-lg font-semibold tracking-tight text-fg">Surge</span>
        <Link
          href="/sign-in"
          className="text-sm text-muted hover:text-fg transition-colors"
        >
          Sign in
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-2xl text-center space-y-8">
          <div className="space-y-2">
            <BlurText
              text="Just Busy"
              delay={320}
              animateBy="words"
              direction="top"
              className="text-4xl sm:text-5xl md:text-6xl font-medium leading-tight tracking-tight text-fg flex flex-nowrap justify-center"
            />
            <BlurText
              text="Or Making Progress?"
              delay={320}
              animateBy="words"
              direction="top"
              className="text-4xl sm:text-5xl md:text-6xl font-medium leading-tight tracking-tight text-fg flex flex-nowrap justify-center"
            />
          </div>

          <p className="text-base sm:text-lg text-muted leading-relaxed max-w-lg mx-auto">
            Teams don't struggle with effort, they struggle with direction. Surge keeps everyone aligned on what matters next, who's responsible, and what's slowing the team down.
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <Link
              href="/sign-up"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-accent text-accent-fg font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Create Your First Quest
            </Link>
          </div>
        </div>

        <div className="mt-20 max-w-3xl w-full">
          <div className="grid grid-cols-2 gap-x-12 gap-y-8 text-left">
            {FEATURES.map((f) => (
              <div key={f.label}>
                <h3 className="text-sm font-medium text-fg">{f.label}</h3>
                <p className="text-sm text-muted mt-1 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 max-w-5xl mx-auto w-full">
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
