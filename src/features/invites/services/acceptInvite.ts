import { executeDomainMutation } from '@/lib/events/executeDomainMutation';
import { inviteRepository } from '../repositories/inviteRepository';
import { memberRepository } from '@/features/members/repositories/memberRepository';
import { hashInviteToken } from '@/lib/invites/token';
import { createServerClient } from '@/lib/supabase/server';

export async function acceptInviteService(input: {
  token: string;
  actorId: string;
}) {
  const tokenHash = hashInviteToken(input.token);

  const supabase = createServerClient();
  const { data: invite } = await supabase
    .from('invites')
    .select('quest_id')
    .eq('token_hash', tokenHash)
    .single<{ quest_id: string }>();

  if (!invite) {
    const result = await executeDomainMutation({
      mutation: async () => { throw new Error('Invalid or expired invite.'); },
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
      if (!fullInvite) throw new Error('Invalid or expired invite.');
      if (fullInvite.accepted_at) throw new Error('This invite has already been used.');
      if (fullInvite.revoked_at) throw new Error('This invite has been revoked.');
      if (new Date(fullInvite.expires_at) < new Date()) throw new Error('This invite has expired.');

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
