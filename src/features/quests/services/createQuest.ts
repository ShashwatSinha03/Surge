import { z } from 'zod';
import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { questRepository } from '../repositories/questRepository';
import { memberRepository } from '@/features/members/repositories/memberRepository';
import { validate, uuid } from '@/lib/validation/service-input';

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  template_type: z.string().min(1),
  actorId: uuid,
});

export async function createQuestService(input: z.infer<typeof schema>) {
  validate(schema, input, 'createQuestService');
  return executeDomainMutation({
    mutation: async (query) => {
      const entity = await questRepository.insert(query, {
        title: input.title,
        description: input.description,
        template_type: input.template_type,
        owner_id: input.actorId,
        status: 'draft',
      });

      await memberRepository.insert(query, {
        quest_id: entity.id,
        user_id: input.actorId,
        role: 'owner',
      });

      return { entity, changes: { title: input.title, template_type: input.template_type } };
    },
    event: {
      questId: '',
      actorId: input.actorId,
      entityType: 'QUEST',
      entityId: '',
      eventType: 'QUEST_CREATED',
    },
  });
}
