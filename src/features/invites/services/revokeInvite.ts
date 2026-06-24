import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { inviteRepository } from '../repositories/inviteRepository';

export async function revokeInviteService(input: {
  inviteId: string;
  actorId: string;
  questId: string;
}) {
  return executeDomainMutation({
    mutation: async (query) => {
      const invite = await inviteRepository.findById(query, input.inviteId);
      if (!invite) throw new Error('Invite not found');
      if (invite.quest_id !== input.questId) throw new Error('Not found');

      const entity = await inviteRepository.revoke(query, input.inviteId);

      return { entity, changes: { revoked: true } };
    },
    event: {
      questId: input.questId,
      actorId: input.actorId,
      entityType: 'INVITE',
      entityId: input.inviteId,
      eventType: 'MEMBER_INVITED',
    },
    eventKey: makeEventKey('MEMBER_INVITED', input.inviteId),
  });
}
