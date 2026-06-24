import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { hashInviteToken } from '@/lib/invites/token';
import { InviteAcceptForm } from './invite-accept-form';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ token: string }>;
};

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const tokenHash = hashInviteToken(token);

  const supabase = createServerClient();

  const { data: invite } = await supabase
    .from('invites')
    .select('id, quest_id, expires_at, accepted_at, revoked_at')
    .eq('token_hash', tokenHash)
    .single();

  if (!invite) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-medium text-fg mb-2">Invite Not Found</h1>
          <p className="text-sm text-muted">
            This invite link is invalid or may have been removed.
          </p>
        </div>
      </div>
    );
  }

  if (invite.accepted_at) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-medium text-fg mb-2">Already Used</h1>
          <p className="text-sm text-muted">
            This invite has already been accepted.
          </p>
        </div>
      </div>
    );
  }

  if (invite.revoked_at) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-medium text-fg mb-2">Invite Revoked</h1>
          <p className="text-sm text-muted">
            This invite has been revoked by the quest owner.
          </p>
        </div>
      </div>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-medium text-fg mb-2">Invite Expired</h1>
          <p className="text-sm text-muted">
            This invite link has expired. Ask the quest owner for a new one.
          </p>
        </div>
      </div>
    );
  }

  const { data: quest } = await supabase
    .from('quests')
    .select('title, template_type')
    .eq('id', invite.quest_id)
    .single<{ title: string; template_type: string }>();

  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="rounded-xl bg-surface border border-border p-8 text-center">
          <h1 className="text-xl font-medium text-fg mb-1">You're Invited</h1>
          {quest && (
            <p className="text-sm text-muted mb-2">
              Join <span className="text-fg font-medium">{quest.title}</span>
            </p>
          )}

          <InviteAcceptForm
            token={token}
            signedIn={!!userId}
          />
        </div>
      </div>
    </div>
  );
}
