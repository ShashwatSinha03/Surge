import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { ClerkProvider } from '@clerk/nextjs';
import { ToastProvider } from '@/components/ui/toast';
import { StartupOverlay } from '@/components/shared/startup-overlay';
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
  title: { default: 'Surge', template: '%s — Surge' },
  description:
    'A realtime workspace for execution. Track milestones, own actions, and maintain team momentum without the overhead.',
  icons: { icon: '/icon.svg' },
  openGraph: {
    title: 'Surge',
    description:
      'A realtime workspace for execution. Track milestones, own actions, and maintain team momentum without the overhead.',
    type: 'website',
  },
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
          <StartupOverlay />
          <ToastProvider>
            {children}
          </ToastProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
