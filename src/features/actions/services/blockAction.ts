import { z } from 'zod';
import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { actionRepository } from '../repositories/actionRepository';
import { validate, uuid, entityId, questId } from '@/lib/validation/service-input';

const schema = z.object({
  actionId: entityId,
  actorId: uuid,
  questId,
});

export async function blockActionService(input: z.infer<typeof schema>) {
  validate(schema, input, 'blockActionService');
  return executeDomainMutation({
    mutation: async (query) => {
      const action = await actionRepository.findById(query, input.actionId);
      if (!action) throw new Error('Action not found');

      const entity = await actionRepository.update(query, input.actionId, {
        status: 'blocked',
      });

      return { entity, changes: { fromStatus: action.status, toStatus: 'blocked' } };
    },
    event: {
      questId: input.questId,
      actorId: input.actorId,
      entityType: 'ACTION',
      entityId: input.actionId,
      eventType: 'ACTION_BLOCKED',
    },
    eventKey: makeEventKey('ACTION_BLOCKED', input.actionId),
  });
}
