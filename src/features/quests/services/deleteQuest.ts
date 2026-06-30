import { z } from 'zod';
import { withTransaction } from '@/lib/db/transaction';
import { validate, uuid } from '@/lib/validation/service-input';

const schema = z.object({
  questId: uuid,
  actorId: uuid,
});

export async function deleteQuestService(input: z.infer<typeof schema>) {
  const data = validate(schema, input, 'deleteQuestService');

  return withTransaction(async (query) => {
    const { rows } = await query(
      'DELETE FROM quests WHERE id = $1 RETURNING *',
      [data.questId]
    );

    if (rows.length === 0) {
      return { success: false as const, error: 'Quest not found' };
    }

    return { success: true as const, entity: rows[0] };
  });
}
