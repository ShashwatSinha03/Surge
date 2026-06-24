import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { milestoneRepository } from '../repositories/milestoneRepository';

export async function deleteMilestoneService(input: {
  milestoneId: string;
  actorId: string;
  questId: string;
  force?: boolean;
}) {
  return executeDomainMutation({
    mutation: async (query) => {
      const milestone = await milestoneRepository.findById(query, input.milestoneId);
      if (!milestone) throw new Error('Milestone not found');

      const count = await milestoneRepository.countActions(query, input.milestoneId);
      if (count > 0 && !input.force) {
        throw new Error(`Milestone has ${count} action(s). Set force: true to confirm.`);
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
