import { z } from 'zod';
import { executeDomainMutation } from '@/lib/events/executeDomainMutation';
import { milestoneRepository } from '../repositories/milestoneRepository';
import { validate, uuid, questId } from '@/lib/validation/service-input';

const schema = z.object({
  quest_id: questId,
  title: z.string().min(1).max(200),
  actorId: uuid,
});

export async function createMilestoneService(input: z.infer<typeof schema>) {
  validate(schema, input, 'createMilestoneService');
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
