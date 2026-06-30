import { z } from 'zod';
import { executeDomainMutation } from '@/lib/events/executeDomainMutation';
import { validate, uuid } from '@/lib/validation/service-input';

const schema = z.object({
  questId: uuid,
  actorId: uuid,
});

export async function deleteQuestService(input: z.infer<typeof schema>) {
  const data = validate(schema, input, 'deleteQuestService');

  return executeDomainMutation({
    mutation: async (query) => {
      const { rows } = await query(
        'UPDATE quests SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
        ['deleted', data.questId]
      );

      if (rows.length === 0) {
        throw new Error('Quest not found');
      }

      return { entity: rows[0], changes: { status: 'deleted' } };
    },
    event: {
      questId: data.questId,
      actorId: data.actorId,
      entityType: 'QUEST',
      entityId: data.questId,
      eventType: 'QUEST_UPDATED',
    },
  });
}
