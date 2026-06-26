import { z } from 'zod';
import { executeDomainMutation } from '@/lib/events/executeDomainMutation';
import { actionRepository } from '../repositories/actionRepository';
import { validate, uuid, entityId } from '@/lib/validation/service-input';

const schema = z.object({
  quest_id: uuid,
  milestone_id: entityId,
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  actorId: uuid,
});

export async function createActionService(input: z.infer<typeof schema>) {
  validate(schema, input, 'createActionService');
  return executeDomainMutation({
    mutation: async (query) => {
      const entity = await actionRepository.insert(query, {
        quest_id: input.quest_id,
        milestone_id: input.milestone_id,
        title: input.title,
        description: input.description,
        created_by: input.actorId,
      });
      return { entity, changes: { title: input.title } };
    },
    event: {
      questId: input.quest_id,
      actorId: input.actorId,
      entityType: 'ACTION',
      entityId: '',
      eventType: 'ACTION_CREATED',
    },
  });
}
