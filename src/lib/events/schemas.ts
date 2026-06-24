import { z } from 'zod';

export const eventMetadataSchema = z.object({
  version: z.literal(1),
  entitySnapshot: z.record(z.string(), z.unknown()).optional().default({}),
  changes: z.record(z.string(), z.unknown()).optional().default({}),
});

export const domainEventSchema = z.object({
  questId: z.string().uuid(),
  actorId: z.string().uuid(),
  entityType: z.enum(['QUEST', 'MILESTONE', 'ACTION', 'MEMBER', 'INVITE']),
  entityId: z.string().uuid(),
  eventType: z.enum([
    'QUEST_CREATED', 'QUEST_UPDATED', 'QUEST_ARCHIVED',
    'MEMBER_INVITED', 'MEMBER_JOINED', 'MEMBER_REMOVED', 'ROLE_CHANGED',
    'MILESTONE_CREATED', 'MILESTONE_UPDATED', 'MILESTONE_COMPLETED', 'MILESTONE_DELETED',
    'ACTION_CREATED', 'ACTION_UPDATED', 'ACTION_CLAIMED', 'ACTION_UNCLAIMED',
    'ACTION_BLOCKED', 'ACTION_COMPLETED', 'ACTION_DELETED',
  ]),
  metadata: eventMetadataSchema.optional().default({
    version: 1,
    entitySnapshot: {},
    changes: {},
  }),
  eventKey: z.string().nullable().optional(),
});
