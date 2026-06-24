import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { actionRepository } from '../repositories/actionRepository';

export async function blockActionService(input: {
  actionId: string;
  actorId: string;
  questId: string;
}) {
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
