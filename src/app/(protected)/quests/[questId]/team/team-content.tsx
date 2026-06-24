'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InviteForm } from '@/features/invites/components/invite-form';
import type { MemberWithUser } from '@/types';

type Props = {
  questId: string;
  members: MemberWithUser[];
  currentUserRole: string;
  canInvite: boolean;
  canChangeRoles: boolean;
  canRemove: boolean;
};

function Avatar({ name, avatar_url }: { name: string; avatar_url: string | null }) {
  const initial = name.charAt(0).toUpperCase();

  if (avatar_url) {
    return (
      <img
        src={avatar_url}
        alt={name}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center text-xs text-muted font-medium">
      {initial}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: 'bg-accent/10 text-accent',
    admin: 'bg-surface-alt text-fg',
    member: 'bg-surface text-muted',
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[role] ?? styles.member}`}
    >
      {role}
    </span>
  );
}

export function TeamContent({
  questId,
  members,
  currentUserRole,
  canInvite,
  canChangeRoles,
  canRemove,
}: Props) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function handleRoleChange(memberId: string, newRole: string) {
    setActionLoading(memberId);
    setError('');

    const res = await fetch(`/api/quests/${questId}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to update role.');
      setActionLoading(null);
      return;
    }

    setActionLoading(null);
    router.refresh();
  }

  async function handleRemove(memberId: string) {
    setActionLoading(memberId);
    setError('');

    const res = await fetch(`/api/quests/${questId}/members/${memberId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to remove member.');
      setActionLoading(null);
      return;
    }

    setActionLoading(null);
    router.refresh();
  }

  async function handleRevoke(inviteId: string) {
    setActionLoading(inviteId);
    setError('');

    const res = await fetch(`/api/invites/${inviteId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to revoke invite.');
      setActionLoading(null);
      return;
    }

    setActionLoading(null);
    router.refresh();
  }

  const grouped = {
    owner: members.filter((m) => m.role === 'owner'),
    admin: members.filter((m) => m.role === 'admin'),
    member: members.filter((m) => m.role === 'member'),
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="text-sm text-red-400 bg-red-400/5 border border-red-400/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {canInvite && (
        <section>
          <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-3">
            Invite Member
          </h2>
          <div className="rounded-xl bg-surface border border-border p-4">
            <InviteForm
              questId={questId}
              onInviteCreated={(token) => {
                setInviteLink(`${window.location.origin}/invite/${token}`);
              }}
            />
            {inviteLink && (
              <div className="mt-3 p-3 rounded-lg bg-surface-alt border border-border">
                <p className="text-xs text-muted mb-1">Share this link:</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-2 py-1.5 rounded text-sm bg-bg text-fg border border-border focus:outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                    }}
                    className="text-xs text-accent hover:underline shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-3">
          Members
        </h2>
        <div className="space-y-4">
          {(['owner', 'admin', 'member'] as const).map((group) => {
            const groupMembers = grouped[group];
            if (groupMembers.length === 0) return null;

            return (
              <div key={group}>
                <h3 className="text-xs text-muted/40 font-secondary tracking-widest uppercase mb-2">
                  {group === 'owner' ? 'Owner' : group === 'admin' ? 'Admins' : 'Members'}
                </h3>
                <div className="space-y-1">
                  {groupMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={member.name}
                          avatar_url={member.avatar_url}
                        />
                        <div>
                          <p className="text-sm text-fg font-medium">
                            {member.name}
                          </p>
                          <p className="text-xs text-muted">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RoleBadge role={member.role} />
                        {canChangeRoles && member.role !== 'owner' && (
                          <div className="flex gap-1">
                            {member.role === 'member' && (
                              <button
                                onClick={() => handleRoleChange(member.id, 'admin')}
                                disabled={actionLoading === member.id}
                                className="text-xs text-muted hover:text-fg transition-colors px-2 py-1 rounded hover:bg-surface-alt"
                              >
                                Promote
                              </button>
                            )}
                            {member.role === 'admin' && (
                              <button
                                onClick={() => handleRoleChange(member.id, 'member')}
                                disabled={actionLoading === member.id}
                                className="text-xs text-muted hover:text-fg transition-colors px-2 py-1 rounded hover:bg-surface-alt"
                              >
                                Demote
                              </button>
                            )}
                          </div>
                        )}
                        {canRemove && member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemove(member.id)}
                            disabled={actionLoading === member.id}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-400/10"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {inviteLink && (
        <section className="rounded-xl bg-surface border border-border p-4">
          <h3 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-2">
            Pending Invites
          </h3>
          <p className="text-xs text-muted">Invite link generated above is active for 7 days.</p>
        </section>
      )}
    </div>
  );
}
