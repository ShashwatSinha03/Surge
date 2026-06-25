'use client';

import { useState } from 'react';
import type { MemberRole } from '@/types';
import type { MilestoneWithSync, ActionWithSync } from '@/features/realtime/realtimeTypes';
import { useMilestoneMutations } from '@/hooks/useMilestoneMutations';
import { presenceManager } from '@/features/realtime/presence';

type Props = {
  questId: string;
  initialMilestones: MilestoneWithSync[];
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
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" title={name}>
      {avatar_url ? (
        <img src={avatar_url} alt={name} className="w-4 h-4 rounded-full" />
      ) : (
        <span className="w-4 h-4 rounded-full bg-surface-alt flex items-center justify-center text-[10px] font-medium">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="max-w-[80px] truncate">{name}</span>
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
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

function SyncingIndicator() {
  return (
    <span className="w-3 h-3 rounded-full border border-blue-400 border-t-transparent animate-spin" />
  );
}

export function JourneyBoard({
  questId,
  initialMilestones,
  currentUserId,
  currentUserRole,
  canCreateMilestone,
  canDeleteMilestone,
  canDeleteAction,
  canManageMilestones,
  stats,
}: Props) {
  const {
    milestones,
    error,
    setError,
    actionLoading,
    setActionLoading,
    createMilestone,
    deleteMilestone,
    updateMilestone,
    createAction,
    updateAction,
    claimAction,
    unclaimAction,
    completeAction,
    blockAction,
    deleteAction,
  } = useMilestoneMutations(initialMilestones, questId, currentUserId);

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

  const computedStats = {
    total: milestones.reduce((s, ms) => s + ms.actions.length, 0),
    completed: milestones.reduce((s, ms) => s + ms.actions.filter((a) => a.status === 'completed').length, 0),
    claimed: milestones.reduce((s, ms) => s + ms.actions.filter((a) => a.status === 'claimed').length, 0),
    blocked: milestones.reduce((s, ms) => s + ms.actions.filter((a) => a.status === 'blocked').length, 0),
  };

  const displayStats = stats.total > 0 || computedStats.total > 0 ? computedStats : stats;

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
          <span className="text-fg font-medium">{displayStats.total}</span> total
        </div>
        {displayStats.completed > 0 && (
          <div className="text-sm text-green-400">
            <span className="font-medium">{displayStats.completed}</span> done
          </div>
        )}
        {displayStats.claimed > 0 && (
          <div className="text-sm text-blue-400">
            <span className="font-medium">{displayStats.claimed}</span> in progress
          </div>
        )}
        {displayStats.blocked > 0 && (
          <div className="text-sm text-red-400">
            <span className="font-medium">{displayStats.blocked}</span> blocked
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
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newMilestoneTitle.trim()) {
                    await createMilestone(newMilestoneTitle.trim());
                    setNewMilestoneTitle('');
                    setShowNewMilestone(false);
                  }
                }}
                autoFocus
              />
              <button
                onClick={async () => {
                  if (!newMilestoneTitle.trim()) return;
                  await createMilestone(newMilestoneTitle.trim());
                  setNewMilestoneTitle('');
                  setShowNewMilestone(false);
                }}
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
              onClick={() => { setShowNewMilestone(true); presenceManager.updateContext('milestones', 'Creating milestone'); }}
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
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && editMilestoneTitle.trim()) {
                        await updateMilestone(milestone.id, editMilestoneTitle.trim());
                        setEditingMilestone(null);
                      }
                    }}
                    autoFocus
                  />
                  <button onClick={async () => {
                    if (editMilestoneTitle.trim()) {
                      await updateMilestone(milestone.id, editMilestoneTitle.trim());
                      setEditingMilestone(null);
                    }
                  }} className="text-xs text-accent hover:underline">Save</button>
                  <button onClick={() => setEditingMilestone(null)} className="text-xs text-muted hover:underline">Cancel</button>
                </div>
              ) : (
                <>
                  <h2 className="text-base font-medium text-fg">{milestone.title}</h2>
                  <StatusBadge status={milestone.status} />
                  {milestone._syncing && <SyncingIndicator />}
                  {canManageMilestones && (
                    <div className="flex gap-1 ml-auto">
                      <button
                        onClick={() => { setEditingMilestone(milestone.id); setEditMilestoneTitle(milestone.title); presenceManager.updateContext('milestones', `Editing ${milestone.title}`); }}
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
                  className={`flex items-center gap-3 py-1.5 group ${action._syncing ? 'opacity-60' : ''}`}
                >
                  <StatusIcon status={action.status} />

                  {editingAction === action.id ? (
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        value={editActionTitle}
                        onChange={(e) => setEditActionTitle(e.target.value)}
                        className="px-2 py-1 rounded bg-surface border border-border text-fg text-sm focus:outline-none"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && editActionTitle.trim()) {
                            await updateAction(action.id, editActionTitle.trim(), editActionDescription.trim() || null);
                            setEditingAction(null);
                          }
                        }}
                        autoFocus
                      />
                      <input
                        value={editActionDescription}
                        onChange={(e) => setEditActionDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="px-2 py-1 rounded bg-surface border border-border text-muted text-xs focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          if (editActionTitle.trim()) {
                            await updateAction(action.id, editActionTitle.trim(), editActionDescription.trim() || null);
                            setEditingAction(null);
                          }
                        }} className="text-xs text-accent hover:underline">Save</button>
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
                          {action._syncing && <SyncingIndicator />}
                          {action.owner_id && action.owner_name && (
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
                            onClick={() => { claimAction(action.id, currentUserId); presenceManager.updateContext('milestones', `Claiming ${action.title}`); }}
                            disabled={isLoading(`claim-${action.id}`)}
                            className="text-xs text-muted hover:text-blue-400 px-1.5 py-0.5 rounded hover:bg-blue-400/5"
                          >
                            Claim
                          </button>
                        )}
                        {action.status === 'open' && (
                          <button
                            onClick={() => { blockAction(action.id); presenceManager.updateContext('milestones', `Blocking ${action.title}`); }}
                            disabled={isLoading(`block-${action.id}`)}
                            className="text-xs text-muted hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-400/5"
                          >
                            Block
                          </button>
                        )}
                        {action.status === 'claimed' && action.owner_id === currentUserId && (
                          <button
                            onClick={() => { completeAction(action.id); presenceManager.updateContext('milestones', `Completing ${action.title}`); }}
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
                            onClick={() => claimAction(action.id, currentUserId)}
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
                          onClick={() => { setEditingAction(action.id); setEditActionTitle(action.title); setEditActionDescription(action.description ?? ''); presenceManager.updateContext('milestones', `Editing ${action.title}`); }}
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
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && (newActionTitles[milestone.id] ?? '').trim()) {
                          await createAction(milestone.id, (newActionTitles[milestone.id] ?? '').trim(), actionDescriptions[milestone.id]?.trim());
                          setNewActionTitles((prev) => ({ ...prev, [milestone.id]: '' }));
                          setActionDescriptions((prev) => ({ ...prev, [milestone.id]: '' }));
                          setShowNewAction((prev) => ({ ...prev, [milestone.id]: false }));
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        const title = (newActionTitles[milestone.id] ?? '').trim();
                        if (!title) return;
                        await createAction(milestone.id, title, actionDescriptions[milestone.id]?.trim());
                        setNewActionTitles((prev) => ({ ...prev, [milestone.id]: '' }));
                        setActionDescriptions((prev) => ({ ...prev, [milestone.id]: '' }));
                        setShowNewAction((prev) => ({ ...prev, [milestone.id]: false }));
                      }}
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
                    onClick={() => { setShowNewAction((prev) => ({ ...prev, [milestone.id]: true })); presenceManager.updateContext('milestones', 'Creating action'); }}
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
