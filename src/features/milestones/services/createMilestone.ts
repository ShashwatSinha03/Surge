import { executeDomainMutation } from '@/lib/events/executeDomainMutation';
import { milestoneRepository } from '../repositories/milestoneRepository';

export async function createMilestoneService(input: {
  quest_id: string;
  title: string;
  actorId: string;
}) {
  return executeDomainMutation({
    mutation: async (query) => {
      const maxPos = await milestoneRepository.findMaxPosition(query, input.quest_id);
      const entity = await milestoneRepository.insert(query, {
        quest_id: input.quest_id,
        title: input.title,
        position: maxPos + 1,
        created_by: input.actorId,
      });
      return { entity, changes: { title: input.title } };
    },
    event: {
      questId: input.quest_id,
      actorId: input.actorId,
      entityType: 'MILESTONE',
      entityId: '',
      eventType: 'MILESTONE_CREATED',
    },
  });
}
