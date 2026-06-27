'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { MilestoneWithSync, ActionWithSync } from '@/features/realtime/realtimeTypes';
import type { RawEventRow } from '@/features/activity/activityTypes';
import { realtimeManager } from '@/features/realtime/realtimeManager';
import { realtimeBus } from '@/features/realtime/realtimeBus';
import { connectionState } from '@/features/realtime/connection';
import { reconcileMilestones, sortEvents } from '@/features/realtime/reconciliation';

export function useMilestoneMutations(
  initialMilestones: MilestoneWithSync[],
  questId: string,
  actorId: string
) {
  const [milestones, setMilestones] = useState<MilestoneWithSync[]>(initialMilestones);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const snapshotsRef = useRef<Map<string, MilestoneWithSync[]>>(new Map());
  const router = useRouter();

  useEffect(() => {
    setMilestones(initialMilestones);
  }, [initialMilestones]);

  useEffect(() => {
    const cleanup = realtimeManager.subscribeToQuest(questId);

    const unsubBus = realtimeBus.subscribe(`quest:${questId}`, (realtimeEvent) => {
      const event = realtimeEvent.event;
      if (event.actor_id === actorId) return;

      setMilestones((prev) => {
        const updated = reconcileMilestones(prev, event);
        return [...updated];
      });
    });

    return () => {
      cleanup();
      unsubBus();
    };
  }, [questId, actorId]);

  const snapshot = useCallback((key?: string) => {
    const k = key ?? 'default';
    snapshotsRef.current.set(k, [...milestones]);
    return [...milestones];
  }, [milestones]);

  const rollbackToSnapshot = useCallback((key?: string) => {
    const k = key ?? 'default';
    const saved = snapshotsRef.current.get(k);
    if (saved) setMilestones(saved);
  }, []);

  const apiCall = useCallback(async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error('Unexpected server response.');
    }
    if (!res.ok) {
      throw new Error(data.error ?? 'Request failed.');
    }
    return data;
  }, []);

  const createMilestone = useCallback(async (title: string) => {
    const saved = snapshot('createMilestone');
    const tempId = `temp-ms-${Date.now()}`;
    const optimistic: MilestoneWithSync = {
      id: tempId,
      quest_id: questId,
      title,
      status: 'open',
      position: milestones.length + 1,
      created_by: actorId,
      created_at: new Date().toISOString(),
      actions: [],
      _syncing: true,
      _tempId: tempId,
    };
    setMilestones((prev) => [...prev, optimistic]);
    connectionState.beginSync();

    try {
      const result = await apiCall('/api/milestones', 'POST', { quest_id: questId, title });
      setMilestones((prev) =>
        prev.map((ms) =>
          ms.id === tempId
            ? { ...result, actions: ms.actions, _syncing: false, _tempId: undefined }
            : ms
        )
      );
      router.refresh();
    } catch (e: any) {
      setMilestones(saved);
      setError(e.message);
    }
    connectionState.endSync();
  }, [questId, actorId, milestones, snapshot, apiCall, router]);

  const deleteMilestone = useCallback(async (milestoneId: string) => {
    const key = `deleteMilestone:${milestoneId}`;
    const saved = snapshot(key);
    setMilestones((prev) => prev.map((ms) =>
      ms.id === milestoneId ? { ...ms, _syncing: true } : ms
    ));
    connectionState.beginSync();

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
            rollbackToSnapshot(key);
            connectionState.endSync();
            return;
          }
          await apiCall(`/api/milestones/${milestoneId}`, 'DELETE', { force: true });
        } else {
          throw new Error(data.error ?? 'Failed to delete milestone.');
        }
      }
      setMilestones((prev) => prev.filter((ms) => ms.id !== milestoneId));
      router.refresh();
    } catch (e: any) {
      setMilestones(saved);
      setError(e.message);
    }
    connectionState.endSync();
  }, [snapshot, apiCall, router, rollbackToSnapshot]);

  const updateMilestone = useCallback(async (milestoneId: string, title: string) => {
    const saved = snapshot(`updateMilestone:${milestoneId}`);
    setMilestones((prev) => prev.map((ms) =>
      ms.id === milestoneId ? { ...ms, title, _syncing: true } : ms
    ));
    connectionState.beginSync();

    try {
      await apiCall(`/api/milestones/${milestoneId}`, 'PATCH', { title });
      setMilestones((prev) => prev.map((ms) =>
        ms.id === milestoneId ? { ...ms, _syncing: false } : ms
      ));
      router.refresh();
    } catch (e: any) {
      setMilestones(saved);
      setError(e.message);
    }
    connectionState.endSync();
  }, [snapshot, apiCall, router]);

  const createAction = useCallback(async (milestoneId: string, title: string, description?: string) => {
    const saved = snapshot(`createAction:${milestoneId}`);
    const tempId = `temp-action-${Date.now()}`;
    const optimistic: ActionWithSync = {
      id: tempId,
      quest_id: questId,
      milestone_id: milestoneId,
      title,
      description: description ?? null,
      status: 'open',
      owner_id: null,
      created_by: actorId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_name: null,
      owner_avatar: null,
      _syncing: true,
      _tempId: tempId,
    };

    setMilestones((prev) =>
      prev.map((ms) =>
        ms.id === milestoneId ? { ...ms, actions: [...ms.actions, optimistic] } : ms
      )
    );
    connectionState.beginSync();

    try {
      const result = await apiCall('/api/actions', 'POST', {
        quest_id: questId,
        milestone_id: milestoneId,
        title,
        description,
      });
      setMilestones((prev) =>
        prev.map((ms) =>
          ms.id === milestoneId
            ? {
                ...ms,
                actions: ms.actions.map((a) =>
                  a.id === tempId
                    ? { ...result, _syncing: false, _tempId: undefined, owner_name: null, owner_avatar: null }
                    : a
                ),
              }
            : ms
        )
      );
      router.refresh();
    } catch (e: any) {
      setMilestones(saved);
      setError(e.message);
    }
    connectionState.endSync();
  }, [questId, actorId, snapshot, apiCall, router]);

  const updateAction = useCallback(async (actionId: string, title: string, description: string | null) => {
    const saved = snapshot(`updateAction:${actionId}`);
    setMilestones((prev) =>
      prev.map((ms) => ({
        ...ms,
        actions: ms.actions.map((a) =>
          a.id === actionId ? { ...a, title, description, _syncing: true } : a
        ),
      }))
    );
    connectionState.beginSync();

    try {
      await apiCall(`/api/actions/${actionId}`, 'PATCH', {
        title,
        description: description || null,
      });
      setMilestones((prev) =>
        prev.map((ms) => ({
          ...ms,
          actions: ms.actions.map((a) =>
            a.id === actionId ? { ...a, _syncing: false } : a
          ),
        }))
      );
      router.refresh();
    } catch (e: any) {
      setMilestones(saved);
      setError(e.message);
    }
    connectionState.endSync();
  }, [snapshot, apiCall, router]);

  const claimAction = useCallback(async (actionId: string, userId: string) => {
    const saved = snapshot(`claimAction:${actionId}`);
    setMilestones((prev) =>
      prev.map((ms) => ({
        ...ms,
        actions: ms.actions.map((a) =>
          a.id === actionId
            ? { ...a, status: 'claimed' as const, owner_id: userId, _syncing: true }
            : a
        ),
      }))
    );
    connectionState.beginSync();

    try {
      await apiCall(`/api/actions/${actionId}/claim`, 'POST');
      setMilestones((prev) =>
        prev.map((ms) => ({
          ...ms,
          actions: ms.actions.map((a) =>
            a.id === actionId ? { ...a, _syncing: false } : a
          ),
        }))
      );
      router.refresh();
    } catch (e: any) {
      setMilestones(saved);
      setError(e.message || 'This action was already claimed.');
    }
    connectionState.endSync();
  }, [snapshot, apiCall, router]);

  const unclaimAction = useCallback(async (actionId: string) => {
    const saved = snapshot(`unclaimAction:${actionId}`);
    setMilestones((prev) =>
      prev.map((ms) => ({
        ...ms,
        actions: ms.actions.map((a) =>
          a.id === actionId ? { ...a, status: 'open' as const, owner_id: null, _syncing: true } : a
        ),
      }))
    );
    connectionState.beginSync();

    try {
      await apiCall(`/api/actions/${actionId}/unclaim`, 'POST');
      setMilestones((prev) =>
        prev.map((ms) => ({
          ...ms,
          actions: ms.actions.map((a) =>
            a.id === actionId ? { ...a, _syncing: false } : a
          ),
        }))
      );
      router.refresh();
    } catch (e: any) {
      setMilestones(saved);
      setError(e.message);
    }
    connectionState.endSync();
  }, [snapshot, apiCall, router]);

  const completeAction = useCallback(async (actionId: string) => {
    const saved = snapshot(`completeAction:${actionId}`);
    setMilestones((prev) =>
      prev.map((ms) => ({
        ...ms,
        actions: ms.actions.map((a) =>
          a.id === actionId ? { ...a, status: 'completed' as const, _syncing: true } : a
        ),
      }))
    );
    connectionState.beginSync();

    try {
      await apiCall(`/api/actions/${actionId}/complete`, 'POST');
      setMilestones((prev) =>
        prev.map((ms) => ({
          ...ms,
          actions: ms.actions.map((a) =>
            a.id === actionId ? { ...a, _syncing: false } : a
          ),
        }))
      );
      router.refresh();
    } catch (e: any) {
      setMilestones(saved);
      setError(e.message);
    }
    connectionState.endSync();
  }, [snapshot, apiCall, router]);

  const blockAction = useCallback(async (actionId: string) => {
    const saved = snapshot(`blockAction:${actionId}`);
    setMilestones((prev) =>
      prev.map((ms) => ({
        ...ms,
        actions: ms.actions.map((a) =>
          a.id === actionId ? { ...a, status: 'blocked' as const, _syncing: true } : a
        ),
      }))
    );
    connectionState.beginSync();

    try {
      await apiCall(`/api/actions/${actionId}/block`, 'POST');
      setMilestones((prev) =>
        prev.map((ms) => ({
          ...ms,
          actions: ms.actions.map((a) =>
            a.id === actionId ? { ...a, _syncing: false } : a
          ),
        }))
      );
      router.refresh();
    } catch (e: any) {
      setMilestones(saved);
      setError(e.message);
    }
    connectionState.endSync();
  }, [snapshot, apiCall, router]);

  const deleteAction = useCallback(async (actionId: string) => {
    const saved = snapshot(`deleteAction:${actionId}`);
    setMilestones((prev) =>
      prev.map((ms) => ({
        ...ms,
        actions: ms.actions.map((a) =>
          a.id === actionId ? { ...a, _syncing: true } : a
        ),
      }))
    );
    connectionState.beginSync();

    try {
      await apiCall(`/api/actions/${actionId}`, 'DELETE');
      setMilestones((prev) =>
        prev.map((ms) => ({
          ...ms,
          actions: ms.actions.filter((a) => a.id !== actionId),
        }))
      );
      router.refresh();
    } catch (e: any) {
      setMilestones(saved);
      setError(e.message);
    }
    connectionState.endSync();
  }, [snapshot, apiCall, router]);

  return {
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
  };
}
