import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'bg-surface border border-border shadow-none rounded-xl w-full',
          headerTitle: 'text-fg font-medium',
          headerSubtitle: 'text-muted',
          formButtonPrimary: 'bg-accent text-accent-fg hover:opacity-90',
          formFieldLabel: 'text-fg',
          formFieldInput: 'bg-bg border-border text-fg',
          footerActionText: 'text-muted',
          footerActionLink: 'text-accent',
          dividerLine: 'bg-border',
          dividerText: 'text-muted',
          socialButtonsBlockButton: 'bg-surface-alt border-border text-fg hover:bg-surface-alt/80',
          identityPreviewText: 'text-fg',
          identityPreviewEditButton: 'text-accent',
        },
      }}
    />
  );
}
