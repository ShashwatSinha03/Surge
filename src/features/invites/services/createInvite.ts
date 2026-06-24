import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { inviteRepository } from '../repositories/inviteRepository';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/token';

export async function createInviteService(input: {
  quest_id: string;
  email: string | null;
  actorId: string;
}) {
  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const result = await executeDomainMutation({
    mutation: async (query) => {
      const entity = await inviteRepository.insert(query, {
        quest_id: input.quest_id,
        email: input.email,
        token_hash: tokenHash,
        invited_by: input.actorId,
        expires_at: expiresAt,
      });
      return { entity, changes: { email: input.email } };
    },
    event: {
      questId: input.quest_id,
      actorId: input.actorId,
      entityType: 'INVITE',
      entityId: '',
      eventType: 'MEMBER_INVITED',
    },
    eventKey: makeEventKey('MEMBER_INVITED', input.quest_id),
  });

  if (result.success) {
    return { ...result, rawToken };
  }
  return result;
}
