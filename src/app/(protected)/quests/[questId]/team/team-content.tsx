'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { InviteForm } from '@/features/invites/components/invite-form';
import { useToast } from '@/components/ui/toast';
import type { MemberWithUser } from '@/types';

type PendingInvite = {
  id: string;
  email: string | null;
  expires_at: string;
};

type Props = {
  questId: string;
  members: MemberWithUser[];
  pendingInvites: PendingInvite[];
  currentUserRole: string;
  canInvite: boolean;
  canChangeRoles: boolean;
  canRemove: boolean;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SearchIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function Avatar({ name, avatar_url }: { name: string; avatar_url: string | null }) {
  const initial = name.charAt(0).toUpperCase();

  if (avatar_url) {
    return (
      <img
        src={avatar_url}
        alt={name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center text-xs text-muted font-medium shrink-0">
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
  pendingInvites,
  currentUserRole,
  canInvite,
  canChangeRoles,
  canRemove,
}: Props) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState('all');

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

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  const grouped = {
    owner: filteredMembers.filter((m) => m.role === 'owner'),
    admin: filteredMembers.filter((m) => m.role === 'admin'),
    member: filteredMembers.filter((m) => m.role === 'member'),
  };

  const roleFilters = ['all', 'owner', 'admin', 'member'];
  const hasNoResults = filteredMembers.length === 0 && (searchQuery || roleFilter !== 'all');

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
                      toast({ type: 'success', message: 'Copied to clipboard' });
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase">
            Members
          </h2>
          <span className="text-xs text-muted/40">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative min-w-[180px] flex-1 basis-full sm:basis-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 rounded-lg bg-bg border border-border text-sm text-fg placeholder:text-muted/40 focus:outline-none focus:border-accent/50"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {roleFilters.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${
                  roleFilter === role
                    ? 'bg-surface text-fg border border-border'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {hasNoResults ? (
            <div className="text-sm text-muted/40 text-center py-8">
              No members match your search.
            </div>
          ) : (
            (['owner', 'admin', 'member'] as const).map((group) => {
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
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            name={member.name}
                            avatar_url={member.avatar_url}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-fg font-medium truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-muted truncate">{member.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted/40 whitespace-nowrap">
                                Joined {formatDate(member.joined_at)}
                              </span>
                              <span className="text-xs text-muted/30">·</span>
                              <span className="text-xs text-muted/40 whitespace-nowrap">
                                Last active recently
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
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
            })
          )}
        </div>
      </section>

      {pendingInvites.length > 0 && (
        <section>
          <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-3">
            Pending Invites
          </h2>
          <div className="space-y-1">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border"
              >
                <div className="min-w-0">
                  <p className="text-sm text-fg font-medium truncate">
                    {invite.email ?? 'Invite link'}
                  </p>
                  <p className="text-xs text-muted/40">
                    Expires {formatDate(invite.expires_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(invite.id)}
                  disabled={actionLoading === invite.id}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-400/10 shrink-0 ml-3"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
