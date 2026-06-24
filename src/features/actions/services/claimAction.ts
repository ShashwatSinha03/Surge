import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { actionRepository } from '../repositories/actionRepository';
import { milestoneRepository } from '@/features/milestones/repositories/milestoneRepository';
import { calculateMilestoneStatus } from '@/lib/execution/state-machine';

export async function claimActionService(input: {
  actionId: string;
  actorId: string;
  questId: string;
  milestoneId: string;
}) {
  return executeDomainMutation({
    mutation: async (query) => {
      const action = await actionRepository.findById(query, input.actionId);
      if (!action) throw new Error('Action not found');
      if (action.owner_id) throw new Error('This action is already claimed.');

      const entity = await actionRepository.update(query, input.actionId, {
        status: 'claimed',
        owner_id: input.actorId,
      });

      return { entity, changes: { fromStatus: action.status, toStatus: 'claimed' } };
    },
    event: {
      questId: input.questId,
      actorId: input.actorId,
      entityType: 'ACTION',
      entityId: input.actionId,
      eventType: 'ACTION_CLAIMED',
    },
    eventKey: makeEventKey('ACTION_CLAIMED', input.actionId),
  });
}
