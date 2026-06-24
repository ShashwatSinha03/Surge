'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  questId: string;
  onInviteCreated: (token: string) => void;
};

export function InviteForm({ questId, onInviteCreated }: Props) {
  const [email, setEmail] = useState('');
  const [inviteType, setInviteType] = useState<'email' | 'link'>('email');
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
        email: inviteType === 'email' ? email.trim() : null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Failed to create invite.');
      setSubmitting(false);
      return;
    }

    onInviteCreated(data.token);
    setEmail('');
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted">
        <button
          type="button"
          onClick={() => setInviteType('email')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            inviteType === 'email'
              ? 'bg-surface text-fg'
              : 'hover:text-fg'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setInviteType('link')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            inviteType === 'link'
              ? 'bg-surface text-fg'
              : 'hover:text-fg'
          }`}
        >
          Invite Link
        </button>
      </div>

      {inviteType === 'email' && (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
            className="flex-1 px-3.5 py-2.5 rounded-lg bg-surface border border-border text-fg text-sm placeholder:text-muted/50 focus:outline-none focus:border-fg/40 transition-colors"
          />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Invite'}
          </Button>
        </div>
      )}

      {inviteType === 'link' && (
        <Button type="submit" variant="secondary" disabled={submitting}>
          {submitting ? 'Generating...' : 'Generate Invite Link'}
        </Button>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
