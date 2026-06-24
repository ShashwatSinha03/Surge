import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { createInviteSchema } from '@/features/invites/schemas';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/token';
import { getCallerMembership, canManageInvites } from '@/lib/permissions/quest';

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { quest_id, email } = parsed.data;

  const supabase = createServerClient();

  const membership = await getCallerMembership(quest_id, clerkUserId);
  if (!membership || !canManageInvites(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const rawToken = generateInviteToken();
  const tokenHash = hashInviteToken(rawToken);

  const { data: invite, error: insertError } = await supabase
    .from('invites')
    .insert({
      quest_id,
      email: email ?? null,
      token_hash: tokenHash,
      invited_by: membership.userId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'An active invite already exists for this email.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create invite.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ...invite,
      token_hash: undefined,
      token: rawToken,
    },
    { status: 201 }
  );
}
