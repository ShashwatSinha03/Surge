import { executeDomainMutation } from '@/lib/events/executeDomainMutation';
import { actionRepository } from '../repositories/actionRepository';

export async function createActionService(input: {
  quest_id: string;
  milestone_id: string;
  title: string;
  description: string | null;
  actorId: string;
}) {
  return executeDomainMutation({
    mutation: async (query) => {
      const entity = await actionRepository.insert(query, {
        quest_id: input.quest_id,
        milestone_id: input.milestone_id,
        title: input.title,
        description: input.description,
        created_by: input.actorId,
      });
      return { entity, changes: { title: input.title } };
    },
    event: {
      questId: input.quest_id,
      actorId: input.actorId,
      entityType: 'ACTION',
      entityId: '',
      eventType: 'ACTION_CREATED',
    },
  });
}
