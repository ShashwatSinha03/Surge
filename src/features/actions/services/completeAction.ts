import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { actionRepository } from '../repositories/actionRepository';
import { milestoneRepository } from '@/features/milestones/repositories/milestoneRepository';
import { calculateMilestoneStatus } from '@/lib/execution/state-machine';

export async function completeActionService(input: {
  actionId: string;
  actorId: string;
  questId: string;
  milestoneId: string;
}) {
  return executeDomainMutation({
    mutation: async (query) => {
      const action = await actionRepository.findById(query, input.actionId);
      if (!action) throw new Error('Action not found');
      if (action.owner_id !== input.actorId) {
        throw new Error('You can only complete your own claimed action.');
      }

      const entity = await actionRepository.update(query, input.actionId, {
        status: 'completed',
      });

      const actions = await actionRepository.findByMilestone(query, input.milestoneId);
      const total = actions.length;
      const completed = actions.filter((a: any) => a.status === 'completed').length;
      const msStatus = calculateMilestoneStatus(total, completed);
      await milestoneRepository.updateStatus(query, input.milestoneId, msStatus);

      return { entity, changes: { fromStatus: action.status, toStatus: 'completed' } };
    },
    event: {
      questId: input.questId,
      actorId: input.actorId,
      entityType: 'ACTION',
      entityId: input.actionId,
      eventType: 'ACTION_COMPLETED',
    },
    eventKey: makeEventKey('ACTION_COMPLETED', input.actionId),
  });
}
