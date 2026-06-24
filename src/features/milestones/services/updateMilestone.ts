import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { milestoneRepository } from '../repositories/milestoneRepository';
import { normalizePositions } from '@/lib/execution/state-machine';

export async function updateMilestoneService(input: {
  milestoneId: string;
  actorId: string;
  questId: string;
  title?: string;
  position?: number;
}) {
  return executeDomainMutation({
    mutation: async (query) => {
      const milestone = await milestoneRepository.findById(query, input.milestoneId);
      if (!milestone) throw new Error('Milestone not found');

      const data: Record<string, unknown> = {};
      if (input.title) data.title = input.title;
      if (input.position !== undefined) data.position = input.position;

      const entity = await milestoneRepository.update(query, input.milestoneId, data);

      if (input.position !== undefined) {
        await milestoneRepository.reindex(query, input.questId);
      }

      return { entity, changes: { ...(input.title ? { title: input.title } : {}), ...(input.position !== undefined ? { position: input.position } : {}) } };
    },
    event: {
      questId: input.questId,
      actorId: input.actorId,
      entityType: 'MILESTONE',
      entityId: input.milestoneId,
      eventType: 'MILESTONE_UPDATED',
    },
    eventKey: makeEventKey('MILESTONE_UPDATED', input.milestoneId),
  });
}
