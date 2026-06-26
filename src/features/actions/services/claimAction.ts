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
  milestoneId: entityId,
});

export async function claimActionService(input: z.infer<typeof schema>) {
  validate(schema, input, 'claimActionService');
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
