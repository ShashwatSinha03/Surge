import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { actionRepository } from '../repositories/actionRepository';

export async function deleteActionService(input: {
  actionId: string;
  actorId: string;
  questId: string;
}) {
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
