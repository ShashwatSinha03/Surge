'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SignInButton } from '@clerk/nextjs';

type Props = {
  token: string;
  signedIn: boolean;
};

export function InviteAcceptForm({ token, signedIn }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    setAccepting(true);
    setError('');

    const res = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      setError('Unexpected server response. Please try again.');
      setAccepting(false);
      return;
    }

    if (!res.ok) {
      setError(data.error ?? 'Failed to accept invite.');
      setAccepting(false);
      return;
    }

    router.push(`/quests/${data.quest_id}`);
    router.refresh();
  }

  async function handleDecline() {
    setDeclining(true);
    setError('');

    const res = await fetch('/api/invites/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      setError('Failed to decline invite.');
      setDeclining(false);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-6">
        <p className="text-sm text-muted">You declined this invite.</p>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm text-muted">
          Sign in to accept this invite.
        </p>
        <SignInButton mode="modal" fallbackRedirectUrl={pathname}>
          <button className="w-full px-4 py-2.5 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity">
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <button
        onClick={handleAccept}
        disabled={accepting}
        className="w-full px-4 py-2.5 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {accepting ? 'Accepting...' : 'Accept Invite'}
      </button>

      <button
        onClick={handleDecline}
        disabled={declining}
        className="w-full px-4 py-2.5 rounded-lg border border-border text-sm text-muted font-medium hover:text-fg hover:border-fg/30 disabled:opacity-40 transition-all"
      >
        {declining ? 'Declining...' : 'Decline'}
      </button>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
