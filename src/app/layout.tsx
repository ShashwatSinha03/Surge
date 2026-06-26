import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const ranade = localFont({
  src: [
    { path: '../fonts/ranade/Ranade-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/ranade/Ranade-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/ranade/Ranade-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/ranade/Ranade-Light.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/ranade/Ranade-Thin.woff2', weight: '100', style: 'normal' },
  ],
  variable: '--font-ranade',
  display: 'swap',
});

const chillax = localFont({
  src: [
    { path: '../fonts/chillax/Chillax-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/chillax/Chillax-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/chillax/Chillax-Semibold.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/chillax/Chillax-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../fonts/chillax/Chillax-Light.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/chillax/Chillax-Extralight.woff2', weight: '200', style: 'normal' },
  ],
  variable: '--font-chillax',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Surge',
  description:
    'A realtime workspace built to maintain momentum, ownership, and execution.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${ranade.variable} ${chillax.variable} h-full`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <ClerkProvider
          signInFallbackRedirectUrl="/quests"
          signUpFallbackRedirectUrl="/quests"
        >
          <header className="fixed top-0 right-0 z-50 p-4 flex items-center gap-3">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="px-4 py-2 rounded-lg border border-border text-sm text-fg hover:bg-surface transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity">
                  Sign Up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                  },
                }}
              />
            </Show>
          </header>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
