import { z } from 'zod';
import { executeDomainMutation } from '@/lib/events/executeDomainMutation';
import { inviteRepository } from '../repositories/inviteRepository';
import { memberRepository } from '@/features/members/repositories/memberRepository';
import { hashInviteToken } from '@/lib/invites/token';
import { createServerClient } from '@/lib/supabase/server';
import { validate, uuid } from '@/lib/validation/service-input';

const schema = z.object({
  token: z.string().min(1),
  actorId: uuid,
});

function serviceError(code: string, message: string): never {
  const err = new Error(message);
  (err as any).code = code;
  throw err;
}

export async function acceptInviteService(input: z.infer<typeof schema>) {
  validate(schema, input, 'acceptInviteService');
  const tokenHash = hashInviteToken(input.token);

  const supabase = createServerClient();
  const { data: invite } = await supabase
    .from('invites')
    .select('quest_id')
    .eq('token_hash', tokenHash)
    .single<{ quest_id: string }>();

  if (!invite) {
    const result = await executeDomainMutation({
      mutation: async () => { serviceError('INVALID_INVITE', 'Invalid or expired invite.'); },
      event: {
        questId: '',
        actorId: input.actorId,
        entityType: 'MEMBER',
        entityId: '',
        eventType: 'MEMBER_JOINED',
      },
    });
    return result;
  }

  return executeDomainMutation({
    mutation: async (query) => {
      const fullInvite = await inviteRepository.findByTokenHash(query, tokenHash);
      if (!fullInvite) serviceError('INVALID_INVITE', 'Invalid or expired invite.');
      if (fullInvite.accepted_at) serviceError('INVITE_ALREADY_ACCEPTED', 'This invite has already been used.');
      if (fullInvite.revoked_at) serviceError('INVITE_REVOKED', 'This invite has been revoked.');
      if (new Date(fullInvite.expires_at) < new Date()) serviceError('INVITE_EXPIRED', 'This invite has expired.');

      const member = await memberRepository.insert(query, {
        quest_id: fullInvite.quest_id,
        user_id: input.actorId,
        role: 'member',
      });

      await inviteRepository.accept(query, fullInvite.id);

      return { entity: member, changes: { questId: fullInvite.quest_id, joined: true } };
    },
    event: {
      questId: invite.quest_id,
      actorId: input.actorId,
      entityType: 'MEMBER',
      entityId: '',
      eventType: 'MEMBER_JOINED',
    },
  });
}
