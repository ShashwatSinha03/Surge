import { z } from 'zod';
import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { inviteRepository } from '../repositories/inviteRepository';
import { validate, uuid, entityId, questId } from '@/lib/validation/service-input';

const schema = z.object({
  inviteId: entityId,
  actorId: uuid,
  questId,
});

export async function revokeInviteService(input: z.infer<typeof schema>) {
  validate(schema, input, 'revokeInviteService');
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
      eventType: 'INVITE_REVOKED',
    },
    eventKey: makeEventKey('INVITE_REVOKED', input.inviteId),
  });
}
