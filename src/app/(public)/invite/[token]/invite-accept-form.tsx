'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignInButton } from '@clerk/nextjs';

type Props = {
  token: string;
  signedIn: boolean;
};

export function InviteAcceptForm({ token, signedIn }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    setSubmitting(true);
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
      setSubmitting(false);
      return;
    }

    if (!res.ok) {
      setError(data.error ?? 'Failed to accept invite.');
      setSubmitting(false);
      return;
    }

    router.push(`/quests/${data.quest_id}`);
    router.refresh();
  }

  if (!signedIn) {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm text-muted">
          Sign in to accept this invite.
        </p>
        <SignInButton mode="modal">
          <button className="w-full px-4 py-2.5 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity">
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleAccept}
        disabled={submitting}
        className="w-full px-4 py-2.5 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {submitting ? 'Accepting...' : 'Accept Invite'}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
