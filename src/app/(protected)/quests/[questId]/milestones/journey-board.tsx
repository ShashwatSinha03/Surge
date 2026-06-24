'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Milestone, Action, ActionStatus, MemberRole } from '@/types';

type ActionWithOwner = Action & {
  owner_name: string | null;
  owner_avatar: string | null;
};

type MilestoneWithActions = Milestone & {
  actions: ActionWithOwner[];
};

type Props = {
  questId: string;
  milestones: MilestoneWithActions[];
  currentUserId: string;
  currentUserRole: MemberRole;
  canCreateMilestone: boolean;
  canDeleteMilestone: boolean;
  canDeleteAction: boolean;
  canManageMilestones: boolean;
  stats: { total: number; completed: number; claimed: number; blocked: number };
};

function OwnerAvatar({ name, avatar_url }: { name: string | null; avatar_url: string | null }) {
  if (!name) return null;
  const initial = name.charAt(0).toUpperCase();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" title={name}>
      {avatar_url ? (
        <img src={avatar_url} alt={name} className="w-4 h-4 rounded-full" />
      ) : (
        <span className="w-4 h-4 rounded-full bg-surface-alt flex items-center justify-center text-[10px] font-medium">
          {initial}
        </span>
      )}
      <span className="max-w-[80px] truncate">{name}</span>
    </span>
  );
}

function StatusIcon({ status }: { status: ActionStatus }) {
  switch (status) {
    case 'completed':
      return <span className="text-green-400 shrink-0">✓</span>;
    case 'claimed':
      return <span className="text-blue-400 shrink-0">◉</span>;
    case 'blocked':
      return <span className="text-red-400 shrink-0">⊘</span>;
    default:
      return <span className="text-muted/30 shrink-0">□</span>;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-400/10 text-green-400',
    claimed: 'bg-blue-400/10 text-blue-400',
    blocked: 'bg-red-400/10 text-red-400',
    open: 'bg-surface text-muted',
  };

  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full ${styles[status] ?? styles.open}`}>
      {status}
    </span>
  );
}

export function JourneyBoard({
  questId,
  milestones,
  currentUserId,
  currentUserRole,
  canCreateMilestone,
  canDeleteMilestone,
  canDeleteAction,
  canManageMilestones,
  stats,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newActionTitles, setNewActionTitles] = useState<Record<string, string>>({});
  const [actionDescriptions, setActionDescriptions] = useState<Record<string, string>>({});
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [showNewAction, setShowNewAction] = useState<Record<string, boolean>>({});
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState('');
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [editActionTitle, setEditActionTitle] = useState('');
  const [editActionDescription, setEditActionDescription] = useState('');

  async function apiCall(url: string, method: string, body?: unknown) {
    setError('');
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Request failed.');
    }
    return res.json();
  }

  async function createMilestone() {
    if (!newMilestoneTitle.trim()) return;
    setActionLoading('new-milestone');
    try {
      await apiCall('/api/milestones', 'POST', {
        quest_id: questId,
        title: newMilestoneTitle.trim(),
      });
      setNewMilestoneTitle('');
      setShowNewMilestone(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  }

  async function deleteMilestone(milestoneId: string) {
    setActionLoading(`del-milestone-${milestoneId}`);
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          if (!confirm(`${data.actions_remaining} action(s) remain. Delete anyway?`)) {
            setActionLoading(null);
            return;
          }
          await apiCall(`/api/milestones/${milestoneId}`, 'DELETE', { force: true });
        } else {
          throw new Error(data.error ?? 'Failed to delete milestone.');
        }
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  }

  async function startEditMilestone(m: MilestoneWithActions) {
    setEditingMilestone(m.id);
    setEditMilestoneTitle(m.title);
  }

  async function saveMilestone(milestoneId: string) {
    if (!editMilestoneTitle.trim()) return;
    setActionLoading(`edit-milestone-${milestoneId}`);
    try {
      await apiCall(`/api/milestones/${milestoneId}`, 'PATCH', {
        title: editMilestoneTitle.trim(),
      });
      setEditingMilestone(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  }

  async function createAction(milestoneId: string) {
    const title = newActionTitles[milestoneId]?.trim();
    if (!title) return;
    const desc = actionDescriptions[milestoneId]?.trim() || undefined;
    setActionLoading(`new-action-${milestoneId}`);
    try {
      await apiCall('/api/actions', 'POST', {
        quest_id: questId,
        milestone_id: milestoneId,
        title,
        description: desc,
      });
      setNewActionTitles((prev) => ({ ...prev, [milestoneId]: '' }));
      setActionDescriptions((prev) => ({ ...prev, [milestoneId]: '' }));
      setShowNewAction((prev) => ({ ...prev, [milestoneId]: false }));
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  }

  async function claimAction(actionId: string) {
    setActionLoading(`claim-${actionId}`);
    try {
      await apiCall(`/api/actions/${actionId}/claim`, 'POST');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  }

  async function unclaimAction(actionId: string) {
    setActionLoading(`unclaim-${actionId}`);
    try {
      await apiCall(`/api/actions/${actionId}/unclaim`, 'POST');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  }

  async function completeAction(actionId: string) {
    setActionLoading(`complete-${actionId}`);
    try {
      await apiCall(`/api/actions/${actionId}/complete`, 'POST');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  }

  async function blockAction(actionId: string) {
    setActionLoading(`block-${actionId}`);
    try {
      await apiCall(`/api/actions/${actionId}/block`, 'POST');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  }

  async function deleteAction(actionId: string) {
    setActionLoading(`delete-action-${actionId}`);
    try {
      await apiCall(`/api/actions/${actionId}`, 'DELETE');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  }

  async function startEditAction(a: ActionWithOwner) {
    setEditingAction(a.id);
    setEditActionTitle(a.title);
    setEditActionDescription(a.description ?? '');
  }

  async function saveAction(actionId: string) {
    if (!editActionTitle.trim()) return;
    setActionLoading(`edit-action-${actionId}`);
    try {
      await apiCall(`/api/actions/${actionId}`, 'PATCH', {
        title: editActionTitle.trim(),
        description: editActionDescription.trim() || null,
      });
      setEditingAction(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  }

  const isLoading = (key: string) => actionLoading === key;

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-400 bg-red-400/5 border border-red-400/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <section className="flex items-center gap-6">
        <div className="text-sm text-muted">
          <span className="text-fg font-medium">{stats.total}</span> total
        </div>
        {stats.completed > 0 && (
          <div className="text-sm text-green-400">
            <span className="font-medium">{stats.completed}</span> done
          </div>
        )}
        {stats.claimed > 0 && (
          <div className="text-sm text-blue-400">
            <span className="font-medium">{stats.claimed}</span> in progress
          </div>
        )}
        {stats.blocked > 0 && (
          <div className="text-sm text-red-400">
            <span className="font-medium">{stats.blocked}</span> blocked
          </div>
        )}
      </section>

      {canCreateMilestone && (
        <div>
          {showNewMilestone ? (
            <div className="flex gap-2 items-start">
              <input
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder="Milestone title..."
                className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-fg text-sm focus:outline-none focus:border-fg/40"
                onKeyDown={(e) => { if (e.key === 'Enter') createMilestone(); }}
                autoFocus
              />
              <button
                onClick={createMilestone}
                disabled={isLoading('new-milestone')}
                className="px-3 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                {isLoading('new-milestone') ? '...' : 'Create'}
              </button>
              <button
                onClick={() => { setShowNewMilestone(false); setNewMilestoneTitle(''); }}
                className="px-3 py-2 rounded-lg text-sm text-muted hover:text-fg"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewMilestone(true)}
              className="text-sm text-muted hover:text-fg transition-colors"
            >
              + New Milestone
            </button>
          )}
        </div>
      )}

      <div className="space-y-8">
        {milestones.map((milestone) => (
          <section key={milestone.id} className="space-y-2">
            <div className="flex items-center gap-3">
              {editingMilestone === milestone.id ? (
                <div className="flex gap-2 items-center flex-1">
                  <input
                    value={editMilestoneTitle}
                    onChange={(e) => setEditMilestoneTitle(e.target.value)}
                    className="flex-1 px-2 py-1 rounded bg-surface border border-border text-fg text-sm focus:outline-none focus:border-fg/40"
                    onKeyDown={(e) => { if (e.key === 'Enter') saveMilestone(milestone.id); }}
                    autoFocus
                  />
                  <button onClick={() => saveMilestone(milestone.id)} className="text-xs text-accent hover:underline">Save</button>
                  <button onClick={() => setEditingMilestone(null)} className="text-xs text-muted hover:underline">Cancel</button>
                </div>
              ) : (
                <>
                  <h2 className="text-base font-medium text-fg">{milestone.title}</h2>
                  <StatusBadge status={milestone.status} />
                  {canManageMilestones && (
                    <div className="flex gap-1 ml-auto">
                      <button
                        onClick={() => startEditMilestone(milestone)}
                        className="text-[11px] text-muted hover:text-fg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMilestone(milestone.id)}
                        disabled={isLoading(`del-milestone-${milestone.id}`)}
                        className="text-[11px] text-red-400 hover:text-red-300"
                      >
                        {isLoading(`del-milestone-${milestone.id}`) ? '...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-border" />

            <div className="space-y-1 pl-1">
              {milestone.actions.length === 0 && (
                <p className="text-xs text-muted/40 py-2">No actions yet.</p>
              )}

              {milestone.actions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-3 py-1.5 group"
                >
                  <StatusIcon status={action.status} />

                  {editingAction === action.id ? (
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        value={editActionTitle}
                        onChange={(e) => setEditActionTitle(e.target.value)}
                        className="px-2 py-1 rounded bg-surface border border-border text-fg text-sm focus:outline-none"
                        onKeyDown={(e) => { if (e.key === 'Enter') saveAction(action.id); }}
                        autoFocus
                      />
                      <input
                        value={editActionDescription}
                        onChange={(e) => setEditActionDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="px-2 py-1 rounded bg-surface border border-border text-muted text-xs focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => saveAction(action.id)} className="text-xs text-accent hover:underline">Save</button>
                        <button onClick={() => setEditingAction(null)} className="text-xs text-muted hover:underline">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${action.status === 'completed' ? 'text-muted line-through' : 'text-fg'}`}>
                            {action.title}
                          </span>
                          {action.owner_id && (
                            <OwnerAvatar
                              name={action.owner_name}
                              avatar_url={action.owner_avatar}
                            />
                          )}
                        </div>
                        {action.description && (
                          <p className="text-xs text-muted/60 mt-0.5">{action.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {action.status === 'open' && (
                          <button
                            onClick={() => claimAction(action.id)}
                            disabled={isLoading(`claim-${action.id}`)}
                            className="text-xs text-muted hover:text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-400/5"
                          >
                            Claim
                          </button>
                        )}
                        {action.status === 'open' && (
                          <button
                            onClick={() => blockAction(action.id)}
                            disabled={isLoading(`block-${action.id}`)}
                            className="text-xs text-muted hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-400/5"
                          >
                            Block
                          </button>
                        )}
                        {action.status === 'claimed' && action.owner_id === currentUserId && (
                          <button
                            onClick={() => completeAction(action.id)}
                            disabled={isLoading(`complete-${action.id}`)}
                            className="text-xs text-muted hover:text-green-400 px-1.5 py-0.5 rounded hover:bg-green-400/5"
                          >
                            Done
                          </button>
                        )}
                        {(action.status === 'claimed' || action.status === 'blocked') && (
                          <button
                            onClick={() => unclaimAction(action.id)}
                            disabled={isLoading(`unclaim-${action.id}`)}
                            className="text-xs text-muted hover:text-yellow-400 px-1.5 py-0.5 rounded hover:bg-yellow-400/5"
                          >
                            Unclaim
                          </button>
                        )}
                        {action.status === 'blocked' && (
                          <button
                            onClick={() => claimAction(action.id)}
                            disabled={isLoading(`claim-${action.id}`)}
                            className="text-xs text-muted hover:text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-400/5"
                          >
                            Reclaim
                          </button>
                        )}
                        {action.owner_id !== currentUserId && action.status === 'claimed' && (
                          <span className="text-[11px] text-muted/40 px-1.5">Claimed</span>
                        )}
                        <button
                          onClick={() => startEditAction(action)}
                          className="text-xs text-muted/30 hover:text-muted px-1.5 py-0.5"
                        >
                          Edit
                        </button>
                        {canDeleteAction && (
                          <button
                            onClick={() => deleteAction(action.id)}
                            disabled={isLoading(`delete-action-${action.id}`)}
                            className="text-xs text-muted/30 hover:text-red-400 px-1.5 py-0.5"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

              <div className="pt-1">
                {showNewAction[milestone.id] ? (
                  <div className="flex gap-2 items-start pl-6">
                    <input
                      value={newActionTitles[milestone.id] ?? ''}
                      onChange={(e) => setNewActionTitles((prev) => ({ ...prev, [milestone.id]: e.target.value }))}
                      placeholder="Action title..."
                      className="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-fg text-sm focus:outline-none focus:border-fg/40"
                      onKeyDown={(e) => { if (e.key === 'Enter') createAction(milestone.id); }}
                      autoFocus
                    />
                    <button
                      onClick={() => createAction(milestone.id)}
                      disabled={isLoading(`new-action-${milestone.id}`)}
                      className="px-2 py-1.5 rounded bg-accent text-accent-fg text-xs font-medium hover:opacity-90 disabled:opacity-40"
                    >
                      {isLoading(`new-action-${milestone.id}`) ? '...' : 'Add'}
                    </button>
                    <button
                      onClick={() => setShowNewAction((prev) => ({ ...prev, [milestone.id]: false }))}
                      className="text-xs text-muted hover:text-fg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewAction((prev) => ({ ...prev, [milestone.id]: true }))}
                    className="text-xs text-muted/40 hover:text-muted pl-6 transition-colors"
                  >
                    + Add action
                  </button>
                )}
              </div>
            </div>
          </section>
        ))}

        {milestones.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted">No milestones yet. Create your first one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
