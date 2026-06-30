import { z } from 'zod';
import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { inviteRepository } from '../repositories/inviteRepository';
import { hashInviteToken } from '@/lib/invites/token';
import { createServerClient } from '@/lib/supabase/server';
import { validate } from '@/lib/validation/service-input';

const schema = z.object({
  token: z.string().min(1),
});

export async function declineInviteService(input: z.infer<typeof schema>) {
  validate(schema, input, 'declineInviteService');
  const tokenHash = hashInviteToken(input.token);

  const supabase = createServerClient();
  const { data: invite } = await supabase
    .from('invites')
    .select('quest_id, id')
    .eq('token_hash', tokenHash)
    .single<{ quest_id: string; id: string }>();

  if (!invite) {
    return { success: false as const, error: 'Invite not found.', code: 'INVALID_INVITE' };
  }

  return executeDomainMutation({
    mutation: async (query) => {
      const fullInvite = await inviteRepository.findByTokenHash(query, tokenHash);
      if (!fullInvite) throw new Error('Invite not found');
      if (fullInvite.accepted_at) throw new Error('Already accepted');
      if (fullInvite.revoked_at) throw new Error('Already revoked');
      if (fullInvite.declined_at) throw new Error('Already declined');

      const entity = await inviteRepository.decline(query, fullInvite.id);

      return { entity, changes: { declined: true } };
    },
    event: {
      questId: invite.quest_id,
      actorId: '00000000-0000-0000-0000-000000000000',
      entityType: 'INVITE',
      entityId: invite.id,
      eventType: 'INVITE_DECLINED',
    },
    eventKey: makeEventKey('INVITE_DECLINED', invite.id),
  });
}
