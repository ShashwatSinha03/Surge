import { z } from 'zod';
import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { milestoneRepository } from '../repositories/milestoneRepository';
import { validate, uuid, entityId, questId } from '@/lib/validation/service-input';

const schema = z.object({
  milestoneId: entityId,
  actorId: uuid,
  questId,
  force: z.boolean().optional(),
});

function serviceError(code: string, message: string): never {
  const err = new Error(message);
  (err as any).code = code;
  throw err;
}

export async function deleteMilestoneService(input: z.infer<typeof schema>) {
  validate(schema, input, 'deleteMilestoneService');
  return executeDomainMutation({
    mutation: async (query) => {
      const milestone = await milestoneRepository.findById(query, input.milestoneId);
      if (!milestone) serviceError('NOT_FOUND', 'Milestone not found');

      const count = await milestoneRepository.countActions(query, input.milestoneId);
      if (count > 0 && !input.force) {
        serviceError('ACTIONS_REMAINING', `Milestone has ${count} action(s). Set force: true to confirm.`);
      }

      const entity = await milestoneRepository.delete(query, input.milestoneId);

      await milestoneRepository.reindex(query, input.questId);

      return { entity, changes: { deleted: true, actionCount: count } };
    },
    event: {
      questId: input.questId,
      actorId: input.actorId,
      entityType: 'MILESTONE',
      entityId: input.milestoneId,
      eventType: 'MILESTONE_DELETED',
    },
    eventKey: makeEventKey('MILESTONE_DELETED', input.milestoneId),
  });
}
