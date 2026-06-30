import { z } from 'zod';
import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { actionRepository } from '../repositories/actionRepository';
import { milestoneRepository } from '@/features/milestones/repositories/milestoneRepository';
import { calculateMilestoneStatus } from '@/lib/execution/state-machine';
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

      const actions = await actionRepository.findByMilestone(query, action.milestone_id);
      const total = actions.length;
      const completed = actions.filter((a: any) => a.status === 'completed').length;
      const msStatus = calculateMilestoneStatus(total, completed);
      await milestoneRepository.updateStatus(query, action.milestone_id, msStatus);

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
