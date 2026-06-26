import { z } from 'zod';
import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { memberRepository } from '../repositories/memberRepository';
import { validate, uuid, entityId, questId } from '@/lib/validation/service-input';

const schema = z.object({
  memberId: entityId,
  actorId: uuid,
  questId,
});

export async function removeMemberService(input: z.infer<typeof schema>) {
  validate(schema, input, 'removeMemberService');
  return executeDomainMutation({
    mutation: async (query) => {
      const target = await memberRepository.findById(query, input.memberId);
      if (!target || target.quest_id !== input.questId) {
        throw new Error('Not found');
      }
      if (target.role === 'owner') {
        throw new Error('Cannot remove the owner.');
      }

      const entity = await memberRepository.delete(query, input.memberId);

      return { entity, changes: { removed: true } };
    },
    event: {
      questId: input.questId,
      actorId: input.actorId,
      entityType: 'MEMBER',
      entityId: input.memberId,
      eventType: 'MEMBER_REMOVED',
    },
    eventKey: makeEventKey('MEMBER_REMOVED', input.memberId),
  });
}
