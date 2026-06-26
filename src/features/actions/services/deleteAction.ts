import { z } from 'zod';
import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { actionRepository } from '../repositories/actionRepository';
import { validate, uuid, entityId, questId } from '@/lib/validation/service-input';

const schema = z.object({
  actionId: entityId,
  actorId: uuid,
  questId,
});

export async function deleteActionService(input: z.infer<typeof schema>) {
  validate(schema, input, 'deleteActionService');
  return executeDomainMutation({
    mutation: async (query) => {
      const action = await actionRepository.findById(query, input.actionId);
      if (!action) throw new Error('Action not found');

      const entity = await actionRepository.delete(query, input.actionId);

      return { entity, changes: { deleted: true } };
    },
    event: {
      questId: input.questId,
      actorId: input.actorId,
      entityType: 'ACTION',
      entityId: input.actionId,
      eventType: 'ACTION_DELETED',
    },
    eventKey: makeEventKey('ACTION_DELETED', input.actionId),
  });
}
