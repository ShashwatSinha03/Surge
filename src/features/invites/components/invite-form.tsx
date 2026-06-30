'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  questId: string;
  onInviteCreated: (token: string) => void;
};

export function InviteForm({ questId, onInviteCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quest_id: questId,
        email: null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Failed to create invite.');
      setSubmitting(false);
      return;
    }

    onInviteCreated(data.token);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Button type="submit" variant="secondary" disabled={submitting}>
        {submitting ? 'Generating...' : 'Generate Invite Link'}
      </Button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
