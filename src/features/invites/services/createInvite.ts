import { z } from 'zod';
import { executeDomainMutation } from '@/lib/events/executeDomainMutation';
import { inviteRepository } from '../repositories/inviteRepository';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/token';
import { validate, uuid, questId } from '@/lib/validation/service-input';

const schema = z.object({
  quest_id: questId,
  email: z.string().email().nullable(),
  actorId: uuid,
});

export async function createInviteService(input: z.infer<typeof schema>) {
  validate(schema, input, 'createInviteService');
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
  });

  if (result.success) {
    return { ...result, rawToken };
  }
  return result;
}
