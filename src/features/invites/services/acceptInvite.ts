import { executeDomainMutation, makeEventKey } from '@/lib/events/executeDomainMutation';
import { inviteRepository } from '../repositories/inviteRepository';
import { memberRepository } from '@/features/members/repositories/memberRepository';
import { hashInviteToken } from '@/lib/invites/token';

export async function acceptInviteService(input: {
  token: string;
  actorId: string;
}) {
  const tokenHash = hashInviteToken(input.token);

  return executeDomainMutation({
    mutation: async (query) => {
      const invite = await inviteRepository.findByTokenHash(query, tokenHash);
      if (!invite) throw new Error('Invalid or expired invite.');
      if (invite.accepted_at) throw new Error('This invite has already been used.');
      if (invite.revoked_at) throw new Error('This invite has been revoked.');
      if (new Date(invite.expires_at) < new Date()) throw new Error('This invite has expired.');

      const member = await memberRepository.insert(query, {
        quest_id: invite.quest_id,
        user_id: input.actorId,
        role: 'member',
      });

      await inviteRepository.accept(query, invite.id);

      return { entity: member, changes: { questId: invite.quest_id } };
    },
    event: {
      questId: '',
      actorId: input.actorId,
      entityType: 'MEMBER',
      entityId: '',
      eventType: 'MEMBER_JOINED',
    },
    eventKey: makeEventKey('MEMBER_JOINED', input.actorId),
  });
}
