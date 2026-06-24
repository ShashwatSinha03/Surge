import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { acceptInviteSchema } from '@/features/invites/schemas';
import { hashInviteToken } from '@/lib/invites/token';

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { token } = parsed.data;
  const tokenHash = hashInviteToken(token);

  const supabase = createServerClient();

  const { data: invite } = await supabase
    .from('invites')
    .select('*')
    .eq('token_hash', tokenHash)
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite.' }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json(
      { error: 'This invite has already been used.' },
      { status: 410 }
    );
  }

  if (invite.revoked_at) {
    return NextResponse.json(
      { error: 'This invite has been revoked.' },
      { status: 410 }
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'This invite has expired.' },
      { status: 410 }
    );
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  if (!user) {
    return NextResponse.json(
      { error: 'User not found. Please try signing in again.' },
      { status: 404 }
    );
  }

  const { error: memberError } = await supabase.from('quest_members').insert({
    quest_id: invite.quest_id,
    user_id: user.id,
    role: 'member',
  });

  if (memberError) {
    if (memberError.code === '23505') {
      return NextResponse.json(
        { error: 'You are already a member of this quest.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to accept invite.' },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to accept invite.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { quest_id: invite.quest_id, message: 'Invite accepted.' },
    { status: 200 }
  );
}
