import { EVENT_TYPES } from '@/lib/events/types';

function extractSnapshot(entity: Record<string, unknown>): Record<string, unknown> {
  const keys = ['title', 'description', 'name', 'email', 'status', 'role', 'template_type'];
  const snapshot: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in entity) {
      snapshot[key] = entity[key];
    }
  }
  return snapshot;
}

export function makeEventKey(eventType: string, entityId: string): string {
  return `${eventType}:${entityId}`;
}

export type DomainMutationInput = {
  mutation: (
    query: import('@/lib/db/transaction').QueryExecutor
  ) => Promise<{
    entity: Record<string, unknown>;
    changes: Record<string, unknown>;
  }>;
  event: {
    questId: string;
    actorId: string;
    entityType: string;
    entityId: string;
    eventType: string;
    metadata?: Record<string, unknown>;
  };
  eventKey?: string;
};

export type DomainResultSuccess = {
  success: true;
  entity: Record<string, unknown>;
  event: Record<string, unknown>;
};

export type DomainResultFailure = {
  success: false;
  error: string;
};

export type DomainResult = DomainResultSuccess | DomainResultFailure;

export async function executeDomainMutation(
  input: DomainMutationInput
): Promise<DomainResult> {
  try {
    return await import('@/lib/db/transaction').then(async ({ withTransaction }) =>
      withTransaction(async (query) => {
        if (input.eventKey) {
          const { rows: existing } = await query(
            'SELECT id FROM events WHERE event_key = $1',
            [input.eventKey]
          );
          if (existing.length > 0) {
            return {
              success: true as const,
              entity: {} as Record<string, unknown>,
              event: existing[0],
            };
          }
        }

        const { entity, changes } = await input.mutation(query);

        const snapshot = extractSnapshot(entity);

        const metadata = JSON.stringify({
          version: 1,
          entitySnapshot: snapshot,
          changes,
          ...(input.event.metadata ?? {}),
        });

        const { rows: eventRows } = await query(
          `INSERT INTO events (quest_id, actor_id, entity_type, entity_id, event_type, metadata, event_key)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::text)
           RETURNING *`,
          [
            input.event.questId,
            input.event.actorId,
            input.event.entityType,
            input.event.entityId,
            input.event.eventType,
            metadata,
            input.eventKey ?? null,
          ]
        );

        return { success: true as const, entity, event: eventRows[0] };
      })
    );
  } catch (error: any) {
    if (
      error?.code === '23505' &&
      error?.constraint?.includes('events_event_key')
    ) {
      return { success: true as const, entity: {}, event: {} };
    }
    return { success: false, error: error?.message ?? 'Domain mutation failed.' };
  }
}
