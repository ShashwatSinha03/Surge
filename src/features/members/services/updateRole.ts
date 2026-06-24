import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { memberRepository } from '../repositories/memberRepository';

export async function updateMemberRoleService(input: {
  memberId: string;
  actorId: string;
  questId: string;
  newRole: string;
}) {
  return executeDomainMutation({
    mutation: async (query) => {
      const target = await memberRepository.findById(query, input.memberId);
      if (!target || target.quest_id !== input.questId) {
        throw new Error('Not found');
      }
      if (target.role === 'owner') {
        throw new Error('Cannot change the owner role.');
      }

      const entity = await memberRepository.updateRole(query, input.memberId, input.newRole as any);

      return { entity, changes: { fromRole: target.role, toRole: input.newRole } };
    },
    event: {
      questId: input.questId,
      actorId: input.actorId,
      entityType: 'MEMBER',
      entityId: input.memberId,
      eventType: 'ROLE_CHANGED',
    },
    eventKey: makeEventKey('ROLE_CHANGED', input.memberId),
  });
}
